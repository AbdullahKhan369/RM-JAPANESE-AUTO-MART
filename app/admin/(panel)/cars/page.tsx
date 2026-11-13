import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Car, Plus } from 'lucide-react';
import { AdminCarsTable } from '@/components/admin/AdminCarsTable';
import { CarFilters } from '@/components/admin/CarFilters';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import { ADMIN_PAGE_SIZE, firstParam, parsePage, UUID_RE, type SearchParams } from '@/components/admin/params';
import type { AdminCarRow } from '@/components/admin/types';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { CAR_STATUSES, SORT_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import type { CarStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cars' };

interface Row {
  id: string;
  title: string;
  year: number;
  price_eur: number | string;
  status: CarStatus;
  is_featured: boolean;
  lister: { full_name: string; email: string } | null;
  images: { thumb_url: string; position: number; is_cover: boolean }[] | null;
}

export default async function AdminCarsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const q = (firstParam(searchParams.q) ?? '').trim().slice(0, 100);
  const listerRaw = firstParam(searchParams.lister) ?? '';
  const lister = UUID_RE.test(listerRaw) ? listerRaw : '';
  const statusRaw = firstParam(searchParams.status) ?? '';
  const status = CAR_STATUSES.some((s) => s.value === statusRaw) ? statusRaw : '';
  const makeRaw = firstParam(searchParams.make) ?? '';
  const make = UUID_RE.test(makeRaw) ? makeRaw : '';
  const featured = firstParam(searchParams.featured) === '1';
  const sortRaw = firstParam(searchParams.sort) ?? 'newest';
  const sort = SORT_OPTIONS.some((s) => s.value === sortRaw) ? sortRaw : 'newest';
  const page = parsePage(searchParams.page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;

  let query = supabase
    .from('cars')
    .select(
      'id, title, year, price_eur, status, is_featured, lister:profiles!lister_id(full_name, email), images:car_images(thumb_url, position, is_cover)',
      { count: 'exact' },
    );
  if (q) query = query.ilike('title', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  if (lister) query = query.eq('lister_id', lister);
  if (status) query = query.eq('status', status);
  if (make) query = query.eq('make_id', make);
  if (featured) query = query.eq('is_featured', true);

  if (sort === 'price_asc') query = query.order('price_eur', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price_eur', { ascending: false });
  else if (sort === 'year_desc') query = query.order('year', { ascending: false });
  else if (sort === 'mileage_asc') query = query.order('mileage_km', { ascending: true, nullsFirst: false });
  else query = query.order('created_at', { ascending: false });
  query = query.order('id', { ascending: true });

  const [result, listersRes, makesRes] = await Promise.all([
    query.range(from, from + ADMIN_PAGE_SIZE - 1),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'lister').order('full_name', { ascending: true }),
    supabase.from('makes').select('id, name').order('name', { ascending: true }),
  ]);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set('q', q);
  if (lister) baseParams.set('lister', lister);
  if (status) baseParams.set('status', status);
  if (make) baseParams.set('make', make);
  if (featured) baseParams.set('featured', '1');
  if (sort !== 'newest') baseParams.set('sort', sort);
  const hrefFor = (p: number) => {
    const sp = new URLSearchParams(baseParams);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return s ? `/admin/cars?${s}` : '/admin/cars';
  };

  if (result.error?.code === 'PGRST103') redirect(hrefFor(1));

  const total = result.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const rows: AdminCarRow[] = ((result.data ?? []) as unknown as Row[]).map((r) => {
    const imgs = [...(r.images ?? [])].sort((a, b) => a.position - b.position);
    const cover = imgs.find((i) => i.is_cover) ?? imgs[0];
    return {
      id: r.id,
      title: r.title,
      year: r.year,
      price_eur: Number(r.price_eur),
      status: r.status,
      is_featured: r.is_featured,
      lister_name: r.lister?.full_name || r.lister?.email || 'Unknown',
      thumb_url: cover?.thumb_url ?? null,
    };
  });
  const hasFilters = Boolean(q || lister || status || make || featured);

  return (
    <>
      <PageHeader
        title="Cars"
        description="Every car from every lister."
        actions={
          <Link href="/admin/cars/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />Add car
          </Link>
        }
      />
      <CarFilters
        listers={(listersRes.data ?? []) as { id: string; full_name: string; email: string }[]}
        makes={(makesRes.data ?? []) as { id: string; name: string }[]}
        current={{ q, lister, status, make, featured, sort }}
      />
      {result.error ? (
        <ErrorNotice />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Car className="h-6 w-6" aria-hidden="true" />}
          title={hasFilters ? 'No cars match these filters' : 'No cars yet'}
          description={hasFilters ? 'Try removing a filter.' : 'Add the first car to see it here.'}
          action={
            hasFilters ? (
              <Link href="/admin/cars" className={buttonVariants({ variant: 'outline' })}>Reset filters</Link>
            ) : (
              <Link href="/admin/cars/new" className={buttonVariants({ variant: 'primary' })}>Add car</Link>
            )
          }
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{total} {total === 1 ? 'car' : 'cars'}</p>
          <AdminCarsTable rows={rows} />
          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination page={page} pageCount={pageCount} buildHref={hrefFor} />
            </div>
          )}
        </>
      )}
    </>
  );
}
