import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ADMIN_PAGE_SIZE, firstParam, parsePage, type SearchParams } from '@/components/admin/params';
import { RequestsManager } from '@/components/admin/RequestsManager';
import type { RequestRow } from '@/components/admin/types';
import { createClient } from '@/lib/supabase/server';
import type { RequestStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Requests' };

const STATUSES: RequestStatus[] = ['pending', 'approved', 'rejected'];

export default async function AdminRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const raw = firstParam(searchParams.status) ?? 'pending';
  const status: RequestStatus = (STATUSES as string[]).includes(raw) ? (raw as RequestStatus) : 'pending';
  const page = parsePage(searchParams.page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const head = { count: 'exact' as const, head: true };

  const [list, pending, approved, rejected] = await Promise.all([
    supabase
      .from('lister_requests')
      .select('*, lister:profiles!lister_id(id, full_name, email)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + ADMIN_PAGE_SIZE - 1),
    supabase.from('lister_requests').select('id', head).eq('status', 'pending'),
    supabase.from('lister_requests').select('id', head).eq('status', 'approved'),
    supabase.from('lister_requests').select('id', head).eq('status', 'rejected'),
  ]);

  if (list.error?.code === 'PGRST103') redirect(`/admin/requests?status=${status}`);

  const total = list.count ?? 0;
  return (
    <RequestsManager
      requests={(list.data ?? []) as unknown as RequestRow[]}
      counts={{ pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 }}
      status={status}
      page={page}
      pageCount={Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))}
      loadError={list.error ? list.error.message : null}
    />
  );
}
