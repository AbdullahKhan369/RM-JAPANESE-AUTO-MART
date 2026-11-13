import Link from 'next/link';
import { ArrowRight, Globe2, MessageCircle, Search, ShieldCheck, Ship, Truck, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSiteContent, t } from '@/lib/site-content';
import { LIST_SELECT, loadCatalog, type CarCardData } from '@/lib/cars-query';
import { buttonVariants } from '@/components/ui/Button';
import { CarCard } from '@/components/cars/CarCard';
import { SearchCard } from '@/components/cars/SearchCard';
import { ListYourCarButton } from '@/components/list-request/ListRequestModal';

export const dynamic = 'force-dynamic';

const DELIVERY = [
  { flag: '🇮🇪', label: 'Ireland' },
  { flag: '🇬🇧', label: 'United Kingdom' },
  { flag: '🇵🇰', label: 'Pakistan' },
];

export default async function HomePage() {
  const supabase = createClient();
  const [content, catalog, featuredResult, makeCountResult] = await Promise.all([
    getSiteContent(),
    loadCatalog(supabase),
    supabase
      .from('cars')
      .select(LIST_SELECT)
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase.from('makes').select('id,name,slug,cars(count)').eq('cars.status', 'published'),
  ]);

  const featured = (featuredResult.data ?? []) as unknown as CarCardData[];
  const makesWithCars = ((makeCountResult.data ?? []) as unknown as { id: string; name: string; slug: string; cars: { count: number }[] | null }[])
    .map((m) => ({ id: m.id, name: m.name, slug: m.slug, count: m.cars?.[0]?.count ?? 0 }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const listContent = {
    title: t(content, 'list_form_title'),
    text: t(content, 'list_form_text'),
    successTitle: t(content, 'list_success_title'),
    successText: t(content, 'list_success_text'),
  };

  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(content, `home_step${n}_title`),
    text: t(content, `home_step${n}_text`),
  }));
  const stepIcons = [Search, MessageCircle, Ship, Truck];
  const why = [1, 2, 3].map((n) => ({
    title: t(content, `home_why${n}_title`),
    text: t(content, `home_why${n}_text`),
  }));
  const whyIcons = [Globe2, Users, ShieldCheck];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-hero text-hero-foreground">
        <div aria-hidden="true" className="absolute -left-24 top-0 -z-10 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-0 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{t(content, 'home_hero_title')}</h1>
              <p className="max-w-xl text-lg text-hero-foreground/75">{t(content, 'home_hero_subtitle')}</p>
            </div>
            <SearchCard options={{ makes: catalog.makes, modelsByMake: catalog.modelsByMake }} buttonLabel={t(content, 'home_search_button')} />
          </div>
          <div className="hidden lg:block">
            <div className="overflow-hidden rounded-3xl bg-logo shadow-lift ring-1 ring-hero-foreground/10">
              <img src="/logo.png" alt={t(content, 'site_name')} width={1536} height={1024} className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Delivery strip */}
      <section aria-label={t(content, 'home_delivery_title')} className="border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-foreground">{t(content, 'home_delivery_title')}</p>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {DELIVERY.map((d) => (
              <li key={d.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground">
                <span aria-hidden="true">{d.flag}</span>
                {d.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t(content, 'home_featured_title')}</h2>
            <p className="mt-1 text-muted-foreground">{t(content, 'home_featured_subtitle')}</p>
          </div>
          <Link href="/cars" className={buttonVariants({ variant: 'outline' })}>
            View all cars <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-muted-foreground">
            New cars are being added. Please check back soon.
          </p>
        )}
      </section>

      {/* Browse by make */}
      {makesWithCars.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t(content, 'home_makes_title')}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {makesWithCars.map((make) => (
              <li key={make.id}>
                <Link
                  href={`/cars?make=${make.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-semibold text-foreground">{make.name}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{make.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* How it works */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t(content, 'home_how_title')}</h2>
            <p className="mt-2 text-muted-foreground">{t(content, 'home_how_subtitle')}</p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={i} className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <span className="absolute right-5 top-4 text-4xl font-extrabold text-muted-foreground/20" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t(content, 'home_why_title')}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {why.map((item, i) => {
            const Icon = whyIcons[i];
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-hero px-6 py-12 text-center text-hero-foreground sm:px-12">
          <div aria-hidden="true" className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(content, 'home_cta_title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-hero-foreground/75">{t(content, 'home_cta_text')}</p>
          <div className="mt-6 flex justify-center">
            <ListYourCarButton label={t(content, 'nav_list_button')} content={listContent} size="lg" />
          </div>
        </div>
      </section>
    </>
  );
}
