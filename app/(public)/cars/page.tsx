import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { PAGE_SIZE } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { getSiteContent, t } from '@/lib/site-content';
import { buildCarsHref, loadCatalog, parseFilters, queryCars, type RawSearchParams } from '@/lib/cars-query';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CarCard } from '@/components/cars/CarCard';
import { FilterSidebar } from '@/components/cars/CarFilters';
import { ResultsToolbar } from '@/components/cars/ResultsToolbar';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: t(content, 'cars_title'), description: t(content, 'cars_subtitle') };
}

export default async function CarsListingPage({ searchParams }: { searchParams: RawSearchParams }) {
  const supabase = createClient();
  const filters = parseFilters(searchParams);
  const [content, catalog] = await Promise.all([getSiteContent(), loadCatalog(supabase)]);
  const result = await queryCars(supabase, filters, catalog);

  if (result.outOfRange) redirect(buildCarsHref(searchParams, { page: undefined }));

  const options = { makes: catalog.makes, modelsByMake: catalog.modelsByMake };
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const from = result.total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(filters.page * PAGE_SIZE, result.total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'cars_title')}</h1>
        <p className="mt-1 text-muted-foreground">{t(content, 'cars_subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside aria-label="Filters" className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-2xl scrollbar-thin">
          <FilterSidebar options={options} />
        </aside>

        <section id="results" className="min-w-0 scroll-mt-24 space-y-5 transition-opacity data-[pending=true]:opacity-60" data-pending="false">
          <ResultsToolbar from={from} to={to} total={result.total} options={options} />

          {result.error ? (
            <EmptyState
              icon={<SearchX className="h-7 w-7" aria-hidden="true" />}
              title="We could not load the cars"
              description="Something went wrong while searching. Please try again in a moment."
              action={
                <Link href="/cars" className={buttonVariants({ variant: 'primary' })}>
                  Reload
                </Link>
              }
            />
          ) : result.cars.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-7 w-7" aria-hidden="true" />}
              title={t(content, 'cars_empty_title')}
              description={t(content, 'cars_empty_text')}
              action={
                <Link href="/cars" className={buttonVariants({ variant: 'primary' })}>
                  Clear all filters
                </Link>
              }
            />
          ) : (
            <div className={cn(filters.view === 'list' ? 'flex flex-col gap-4' : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3')}>
              {result.cars.map((car) => (
                <CarCard key={car.id} car={car} view={filters.view} />
              ))}
            </div>
          )}

          <Pagination
            page={filters.page}
            pageCount={pageCount}
            buildHref={(page) => buildCarsHref(searchParams, { page: page > 1 ? String(page) : undefined })}
          />
        </section>
      </div>
    </div>
  );
}
