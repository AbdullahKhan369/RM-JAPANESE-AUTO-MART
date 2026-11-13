import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FALLBACK_RATES } from '@/lib/constants';
import type { Rates } from '@/types/database';

type RatesResult = { rates: Rates; updatedAt: string; source: string };

const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;
const API_URL = 'https://open.er-api.com/v6/latest/EUR';

// Avoids hammering the API (and slowing every page) while it is failing.
let lastFailedAttempt = 0;

function isSane(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Forces a refresh from the API and stores it in exchange_rates (row 1). Throws on failure. */
export async function refreshRates(): Promise<RatesResult> {
  const response = await fetch(API_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Exchange rate API returned ${response.status}.`);

  const json = (await response.json()) as {
    result?: string;
    rates?: Record<string, unknown>;
  };
  const gbp = json.rates?.GBP;
  const pkr = json.rates?.PKR;
  if (json.result !== 'success' || !isSane(gbp, 0.3, 2) || !isSane(pkr, 100, 1000)) {
    throw new Error('Exchange rate API returned unexpected data.');
  }

  const updatedAt = new Date().toISOString();
  const source = 'open.er-api.com';
  const admin = createAdminClient();
  const { error } = await admin
    .from('exchange_rates')
    .upsert({ id: 1, base: 'EUR', gbp, pkr, source, updated_at: updatedAt });
  if (error) throw new Error(`Could not save exchange rates: ${error.message}`);

  return { rates: { EUR: 1, GBP: gbp, PKR: pkr }, updatedAt, source };
}

/** Reads the stored rates and refreshes them at most once every 6 hours. Never throws. */
export async function getRates(): Promise<RatesResult> {
  let stored: RatesResult | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('exchange_rates')
      .select('gbp,pkr,source,updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      const gbp = Number(data.gbp);
      const pkr = Number(data.pkr);
      if (Number.isFinite(gbp) && gbp > 0 && Number.isFinite(pkr) && pkr > 0) {
        stored = {
          rates: { EUR: 1, GBP: gbp, PKR: pkr },
          updatedAt: String(data.updated_at),
          source: String(data.source ?? ''),
        };
      }
    }
  } catch {
    stored = null;
  }

  const age = stored ? Date.now() - new Date(stored.updatedAt).getTime() : Number.POSITIVE_INFINITY;
  const stale = !Number.isFinite(age) || age > REFRESH_AFTER_MS;

  if (stale && Date.now() - lastFailedAttempt > RETRY_AFTER_FAILURE_MS) {
    try {
      return await refreshRates();
    } catch {
      lastFailedAttempt = Date.now();
    }
  }

  return (
    stored ?? {
      rates: FALLBACK_RATES,
      updatedAt: new Date(0).toISOString(),
      source: 'fallback',
    }
  );
}
