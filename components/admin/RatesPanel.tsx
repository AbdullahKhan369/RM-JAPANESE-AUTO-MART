'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/format';
import type { Rates } from '@/types/database';
import { adminFetch } from './api';

interface RateState {
  gbp: number;
  pkr: number;
  updatedAt: string;
  source: string;
}

export function RatesPanel({ initial }: { initial: RateState }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<RateState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await adminFetch<{ rates: Rates; updatedAt: string; source: string }>('/api/admin/rates/refresh', { method: 'POST' });
      setState({ gbp: result.rates.GBP, pkr: result.rates.PKR, updatedAt: result.updatedAt, source: result.source });
      toast({ title: 'Exchange rates updated', variant: 'success' });
      router.refresh();
    } catch {
      const message = 'Could not refresh. The previous rates are still in use.';
      setError(message);
      toast({ title: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const isSeed = state.source === 'seed';
  const when = new Date(state.updatedAt);

  return (
    <>
      <PageHeader
        title="Exchange rates"
        description="Prices are stored in EUR and converted for buyers with these rates. They refresh automatically every 6 hours when the site is visited."
        actions={
          <Button type="button" onClick={() => void refresh()} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh now
          </Button>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="1 EUR in GBP" value={`£${state.gbp.toFixed(4)}`} hint={`1 GBP = €${(1 / state.gbp).toFixed(4)}`} />
        <StatCard label="1 EUR in PKR" value={`Rs ${state.pkr.toFixed(2)}`} hint={`1 PKR = €${(1 / state.pkr).toFixed(6)}`} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last updated</dt>
              <dd className="mt-1" suppressHydrationWarning>
                {isSeed ? 'Never refreshed' : `${when.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} (${timeAgo(state.updatedAt)})`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</dt>
              <dd className="mt-1">{isSeed ? 'Built-in default rates' : state.source}</dd>
            </div>
          </dl>
          {isSeed && <p className="mt-4 text-sm text-muted-foreground">These are the default starting rates. Press Refresh now to load live rates.</p>}
        </CardContent>
      </Card>
    </>
  );
}
