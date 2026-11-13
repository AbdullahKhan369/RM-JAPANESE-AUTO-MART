import type { Metadata } from 'next';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import { RatesPanel } from '@/components/admin/RatesPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Exchange rates' };

export default async function AdminRatesPage() {
  const supabase = createClient();
  const { data, error } = await supabase.from('exchange_rates').select('gbp, pkr, source, updated_at').eq('id', 1).maybeSingle();

  if (error || !data) {
    return (
      <>
        <PageHeader title="Exchange rates" />
        <ErrorNotice title="Could not load the exchange rates" message="The exchange_rates row is missing or unreadable. Check that the schema was run completely." />
      </>
    );
  }
  const row = data as { gbp: number | string; pkr: number | string; source: string; updated_at: string };
  return <RatesPanel initial={{ gbp: Number(row.gbp), pkr: Number(row.pkr), source: row.source, updatedAt: row.updated_at }} />;
}
