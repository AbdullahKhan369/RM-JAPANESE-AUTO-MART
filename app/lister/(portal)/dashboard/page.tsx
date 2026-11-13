import Link from 'next/link';
import type { Metadata } from 'next';
import { Car as CarIcon, CheckCircle2, FileText, Lightbulb, Pencil, Plus, Tag } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatEur } from '@/lib/currency';
import { timeAgo } from '@/lib/format';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { CarThumb } from '@/components/lister/CarThumb';
import { ErrorNotice } from '@/components/lister/ErrorNotice';
import { StatusBadge } from '@/components/lister/StatusBadge';
import { LIST_CAR_SELECT } from '@/components/lister/types';
import type { ListCar } from '@/components/lister/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard', robots: { index: false, follow: false } };

export default async function ListerDashboardPage() {
  const { user, profile } = await requireRole('lister');
  const supabase = createClient();

  const count = (status?: string) => {
    let q = supabase.from('cars').select('id', { count: 'exact', head: true }).eq('lister_id', user.id);
    if (status) q = q.eq('status', status);
    return q;
  };

  const [total, published, drafts, sold, recent] = await Promise.all([
    count(),
    count('published'),
    count('draft'),
    count('sold'),
    supabase
      .from('cars')
      .select(LIST_CAR_SELECT)
      .eq('lister_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const failed = total.error ?? published.error ?? drafts.error ?? sold.error ?? recent.error;
  const firstName = (profile.full_name || '').trim().split(/\s+/)[0] || 'there';
  const cars = (recent.data ?? []) as unknown as ListCar[];
  const totalCount = total.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is a quick look at your listings."
        actions={
          <Link href="/lister/cars/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add a new car
          </Link>
        }
      />

      {failed ? (
        <ErrorNotice
          message="We could not load your dashboard. Check your connection and try again."
          retryHref="/lister/dashboard"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total cars" value={totalCount} icon={<CarIcon className="h-5 w-5" aria-hidden="true" />} />
            <StatCard
              label="Published"
              value={published.count ?? 0}
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
            />
            <StatCard label="Drafts" value={drafts.count ?? 0} icon={<FileText className="h-5 w-5" aria-hidden="true" />} />
            <StatCard label="Sold" value={sold.count ?? 0} icon={<Tag className="h-5 w-5" aria-hidden="true" />} />
          </div>

          {totalCount === 0 ? (
            <div className="flex gap-3 rounded-2xl border border-info/40 bg-info/10 p-5">
              <Lightbulb className="h-6 w-6 shrink-0 text-info" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground">Add your first car</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with the make, model, year and price. You can save a draft any time and add photos and details
                  later. Good photos from several angles help buyers the most.
                </p>
                <Link href="/lister/cars/new" className={`${buttonVariants({ variant: 'primary', size: 'sm' })} mt-3`}>
                  Add a car
                </Link>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Recent cars</CardTitle>
                  <Link
                    href="/lister/cars"
                    className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring"
                  >
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {cars.map((car) => (
                    <li key={car.id} className="flex items-center gap-3 py-3">
                      <CarThumb images={car.images} alt="" className="w-20 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-medium text-foreground">{car.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatEur(Number(car.price_eur))} · {timeAgo(car.updated_at)}
                        </p>
                      </div>
                      <StatusBadge status={car.status} />
                      <Link
                        href={`/lister/cars/${car.id}/edit`}
                        aria-label={`Edit ${car.title}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Pencil className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
