import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/types/database';
import { ADMIN_PAGE_SIZE, firstParam, parsePage, type SearchParams } from './params';
import type { UserRow } from './types';

export interface UsersPageData {
  users: UserRow[];
  total: number;
  page: number;
  pageCount: number;
  q: string;
  loadError: string | null;
}

export async function loadUsersPage(role: Role, searchParams: SearchParams): Promise<UsersPageData> {
  const supabase = createClient();
  const q = (firstParam(searchParams.q) ?? '').trim().slice(0, 80);
  const page = parsePage(searchParams.page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, city, is_active, created_at', { count: 'exact' })
    .eq('role', role);

  const safe = q.replace(/[,()"\\%*]/g, ' ').replace(/\s+/g, ' ').trim();
  if (safe) {
    query = query.or(`full_name.ilike.*${safe}*,email.ilike.*${safe}*,phone.ilike.*${safe}*,city.ilike.*${safe}*`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (error?.code === 'PGRST103') {
    const base = role === 'lister' ? '/admin/listers' : '/admin/admins';
    redirect(q ? `${base}?q=${encodeURIComponent(q)}` : base);
  }
  if (error) {
    return { users: [], total: 0, page, pageCount: 1, q, loadError: error.message };
  }

  const rows = (data ?? []) as Omit<UserRow, 'car_count'>[];
  let counts: (number | null)[] = rows.map(() => null);
  if (role === 'lister' && rows.length > 0) {
    counts = await Promise.all(
      rows.map(async (row) => {
        const res = await supabase.from('cars').select('id', { count: 'exact', head: true }).eq('lister_id', row.id);
        return res.error ? null : res.count ?? 0;
      }),
    );
  }

  const total = count ?? rows.length;
  return {
    users: rows.map((row, i) => ({ ...row, car_count: counts[i] ?? null })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    q,
    loadError: null,
  };
}
