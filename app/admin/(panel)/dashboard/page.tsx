import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Car, CheckCircle2, FileText, Inbox, Plus, Tag, UserPlus, Users, Globe, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import { CAR_STATUSES } from '@/lib/constants';
import { formatEur } from '@/lib/currency';
import { timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { CarStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

interface ImageBit { thumb_url: string; position: number; is_cover: boolean }
interface RecentCar {
  id: string;
  title: string;
  price_eur: number;
  status: CarStatus;
  created_at: string;
  lister: { full_name: string; email: string } | null;
  images: ImageBit[] | null;
}
interface RecentRequest { id: string; full_name: string; email: string; city: string; country: string; status: string; created_at: string }

const statusVariant: Record<CarStatus, 'muted' | 'success' | 'info'> = { draft: 'muted', published: 'success', sold: 'info' };

function thumbOf(images: ImageBit[] | null): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return (sorted.find((i) => i.is_cover) ?? sorted[0]).thumb_url;
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const staleBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const head = { count: 'exact' as const, head: true };

  const [total, published, drafts, sold, listers, pending, stale, recentCars, recentRequests, pendingList, rates] = await Promise.all([
    supabase.from('cars').select('id', head),
    supabase.from('cars').select('id', head).eq('status', 'published'),
    supabase.from('cars').select('id', head).eq('status', 'draft'),
    supabase.from('cars').select('id', head).eq('status', 'sold'),
    supabase.from('profiles').select('id', head).eq('role', 'lister').eq('is_active', true),
    supabase.from('lister_requests').select('id', head).eq('status', 'pending'),
    supabase.from('cars').select('id', head).eq('status', 'draft').lt('created_at', staleBefore),
    supabase
      .from('cars')
      .select('id, title, price_eur, status, created_at, lister:profiles!lister_id(full_name, email), images:car_images(thumb_url, position, is_cover)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('lister_requests').select('id, full_name, email, city, country, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('lister_requests').select('id, full_name, email, city, country, status, created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(5),
    supabase.from('exchange_rates').select('gbp, pkr, source, updated_at').eq('id', 1).maybeSingle(),
  ]);

  const failed = [total, published, drafts, sold, listers, pending].some((r) => r.error);
  const cars = (recentCars.data ?? []) as unknown as RecentCar[];
  const reqs = (recentRequests.data ?? []) as RecentRequest[];
  const pendingRows = (pendingList.data ?? []) as RecentRequest[];
  const pendingCount = pending.count ?? 0;
  const staleCount = stale.count ?? 0;
  const rateRow = rates.data as { gbp: number; pkr: number; source: string; updated_at: string } | null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick overview of your marketplace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/cars/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />Add car
            </Link>
            <Link href="/admin/listers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />Create lister
            </Link>
            <Link href="/admin/requests" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />Review requests
            </Link>
          </div>
        }
      />

      {failed && <div className="mb-6"><ErrorNotice /></div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total cars" value={total.count ?? 0} icon={<Car className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Published" value={published.count ?? 0} icon={<Globe className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Drafts" value={drafts.count ?? 0} icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Sold" value={sold.count ?? 0} icon={<Tag className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Active listers" value={listers.count ?? 0} icon={<Users className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Pending requests" value={pendingCount} icon={<Inbox className="h-5 w-5" aria-hidden="true" />} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
        <CardContent>
          {pendingCount === 0 && staleCount === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              All caught up. Nothing needs your attention.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingCount > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}</p>
                    <Link href="/admin/requests" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Review <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {pendingRows.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate font-medium">{r.full_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {staleCount > 0 && (
                <p className="text-sm">
                  <Link href="/admin/cars?status=draft&sort=newest" className="font-medium text-primary hover:underline">
                    {staleCount} {staleCount === 1 ? 'draft is' : 'drafts are'}
                  </Link>{' '}
                  older than 14 days.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent cars</CardTitle></CardHeader>
          <CardContent>
            {recentCars.error ? (
              <ErrorNotice />
            ) : cars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cars yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {cars.map((car) => {
                  const thumb = thumbOf(car.images);
                  return (
                    <li key={car.id}>
                      <Link href={`/admin/cars/${car.id}/edit`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                        {thumb ? (
                          <img src={thumb} alt="" width={56} height={42} loading="lazy" className="h-[42px] w-14 shrink-0 rounded-lg bg-muted object-cover" />
                        ) : (
                          <div className="flex h-[42px] w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true"><Car className="h-4 w-4" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{car.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatEur(Number(car.price_eur))} · {car.lister?.full_name || car.lister?.email || 'Unknown'} · {timeAgo(car.created_at)}</p>
                        </div>
                        <Badge variant={statusVariant[car.status]}>{CAR_STATUSES.find((s) => s.value === car.status)?.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent requests</CardTitle></CardHeader>
          <CardContent>
            {recentRequests.error ? (
              <ErrorNotice />
            ) : reqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {reqs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{[r.city, r.country].filter(Boolean).join(', ') || r.email} · {timeAgo(r.created_at)}</p>
                    </div>
                    <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}>
                      {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Exchange rates</CardTitle></CardHeader>
        <CardContent>
          {!rateRow ? (
            <ErrorNotice title="Exchange rates not found" message="Run the database schema again or press Refresh now on the rates page." />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">1 EUR in GBP</dt><dd className="font-medium">£{Number(rateRow.gbp).toFixed(4)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">1 EUR in PKR</dt><dd className="font-medium">Rs {Number(rateRow.pkr).toFixed(2)}</dd></div>
                <div>
                  <dt className="text-xs text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{rateRow.source === 'seed' ? 'Never (default rates)' : `${timeAgo(rateRow.updated_at)} · ${rateRow.source}`}</dd>
                </div>
              </dl>
              <Link href="/admin/rates" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Manage rates</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
