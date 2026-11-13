import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { CarsList } from '@/components/lister/CarsList';
import type { StatusFilter } from '@/components/lister/CarsList';
import { ErrorNotice } from '@/components/lister/ErrorNotice';
import { LIST_CAR_SELECT } from '@/components/lister/types';
import type { ListCar } from '@/components/lister/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My Cars', robots: { index: false, follow: false } };

const PAGE_SIZE = 20;
const STATUSES: StatusFilter[] = ['all', 'published', 'draft', 'sold'];

interface PageProps {
  searchParams: { q?: string | string[]; status?: string | string[]; page?: string | string[] };
}

const one = (v: string | string[] | undefined): string => (typeof v === 'string' ? v : '');

export default async function MyCarsPage({ searchParams }: PageProps) {
  const { user } = await requireRole('lister');
  const q = one(searchParams.q).trim().slice(0, 80);
  const statusParam = one(searchParams.status) as StatusFilter;
  const status: StatusFilter = STATUSES.includes(statusParam) ? statusParam : 'all';
  const page = Math.max(1, Number.parseInt(one(searchParams.page), 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createClient();
  let query = supabase
    .from('cars')
    .select(LIST_CAR_SELECT, { count: 'exact' })
    .eq('lister_id', user.id)
    .order('updated_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status !== 'all') query = query.eq('status', status);
  if (q) query = query.ilike('title', `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);

  const { data, count, error } = await query;
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Cars"
        description="Everything you have listed, drafts included."
        actions={
          <Link href="/lister/cars/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add a car
          </Link>
        }
      />
      {error ? (
        <ErrorNotice message="We could not load your cars. Check your connection and try again." retryHref="/lister/cars" />
      ) : (
        <CarsList
          cars={(data ?? []) as unknown as ListCar[]}
          total={total}
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          q={q}
          status={status}
        />
      )}
    </div>
  );
}
