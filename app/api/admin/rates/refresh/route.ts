import { requireAdminApi } from '@/lib/auth';
import { refreshRates } from '@/lib/rates';
import { jsonError, jsonOk } from '../../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const result = await refreshRates();
    return jsonOk({ rates: result.rates, updatedAt: result.updatedAt, source: result.source });
  } catch {
    return jsonError('Could not refresh. The previous rates are still in use.', 500);
  }
}
