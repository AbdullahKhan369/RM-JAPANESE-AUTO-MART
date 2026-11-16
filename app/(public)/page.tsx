import Link from 'next/link';
import { ArrowRight, Globe2, MessageCircle, Search, ShieldCheck, Ship, Truck, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSiteContent, t } from '@/lib/site-content';
import { LIST_SELECT, loadCatalog, type CarCardData } from '@/lib/cars-query';
import { buttonVariants } from '@/components/ui/Button';
import { CarCard } from '@/components/cars/CarCard';
import { SearchCard } from '@/components/cars/SearchCard';
import { ListYourCarButton } from '@/components/list-request/ListRequestModal';
import { Reveal } from '@/components/home/Reveal';
import { CountUp } from '@/components/home/CountUp';
import { Marquee } from '@/components/home/Marquee';

export const dynamic = 'force-dynamic';

const DELIVERY = [
  { flag: '🇮🇪', label: 'Ireland' },
  { flag: '🇬🇧', label: 'United Kingdom' },
  { flag: '🇵🇰', label: 'Pakistan' },
];

export default async function HomePage() {
  const supabase = createClient();
  const [content, catalog, featuredResult, makeCountResult, carCountResult] = await Promise.all([
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
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'published'),
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

  const stats = [
    { value: carCountResult.count ?? 0, label: 'Cars listed' },
    { value: makesWithCars.length, label: 'Brands available' },
    { value: DELIVERY.length, label: 'Delivery countries' },
  ].filter((x) => x.value > 0);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-hero text-hero-foreground">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          width={1536}
          height={1024}
          className="absolute inset-0 -z-20 h-full w-full animate-kenburns object-cover object-[50%_72%] opacity-80 motion-reduce:animate-none"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-hero via-hero/50 to-hero" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_100%,rgb(var(--primary)/0.28),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/4 animate-sweep bg-gradient-to-r from-transparent via-primary/25 to-transparent blur-xl motion-reduce:hidden" />
        </div>
        <div className="mx-auto flex min-h-[560px] max-w-7xl flex-col items-center px-4 pb-44 pt-16 text-center sm:min-h-[640px] sm:px-6 sm:pt-24 lg:min-h-[720px] lg:px-8 lg:pb-52 lg:pt-28">
          <p className="mb-5 inline-flex animate-rise items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-hero-foreground/90 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            {DELIVERY.map((d) => d.flag).join(' ')} {t(content, 'home_delivery_title')}
          </p>
          <h1
            style={{ animationDelay: '120ms' }}
            className="max-w-4xl animate-rise bg-gradient-to-r from-hero-foreground via-hero-foreground to-primary bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-7xl"
          >
            {t(content, 'home_hero_title')}
          </h1>
          <p style={{ animationDelay: '260ms' }} className="mt-5 max-w-2xl animate-rise text-base text-hero-foreground/80 sm:text-lg">
            {t(content, 'home_hero_subtitle')}
          </p>
          <div style={{ animationDelay: '400ms' }} className="mt-8 flex animate-rise flex-wrap items-center justify-center gap-3">
            <Link href="/cars" className={buttonVariants({ size: 'lg' })}>
              Browse cars <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-hero-foreground/30 bg-hero-foreground/10 px-6 text-sm font-semibold text-hero-foreground backdrop-blur transition-colors hover:bg-hero-foreground/20"
            >
              {t(content, 'home_how_title')}
            </Link>
          </div>
        </div>
      </section>

      <div className="relative isolate">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--primary)/0.12),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_70%)] bg-[radial-gradient(rgb(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

        {/* Search card overlapping the hero */}
        <section className="relative z-10 mx-auto -mt-32 max-w-7xl px-4 sm:px-6 lg:-mt-36 lg:px-8">
          <Reveal>
            <div className="rounded-3xl bg-gradient-to-r from-primary/60 via-primary/10 to-primary/60 p-[1.5px] shadow-lift">
              <SearchCard options={{ makes: catalog.makes, modelsByMake: catalog.modelsByMake }} buttonLabel={t(content, 'home_search_button')} />
            </div>
          </Reveal>
          {stats.length > 0 ? (
            <Reveal delay={120} className="mt-6">
              <dl className="grid divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                {stats.map((x) => (
                  <div key={x.label} className="flex flex-col px-3 py-5 text-center sm:py-6">
                    <dt className="order-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">{x.label}</dt>
                    <dd className="text-3xl font-extrabold text-primary sm:text-4xl">
                      <CountUp value={x.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ) : null}
        </section>

        {/* Delivery ticker */}
        <section aria-label={t(content, 'home_delivery_title')} className="mt-10 border-y border-border bg-muted/40 py-4">
          <Marquee
            items={DELIVERY.map((d) => (
              <span key={d.label} className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground shadow-soft">
                <span aria-hidden="true" className="text-lg">{d.flag}</span>
                {t(content, 'home_delivery_title')} {d.label}
              </span>
            ))}
          />
        </section>

        {/* Featured */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'home_featured_title')}</h2>
              <p className="mt-1 text-muted-foreground">{t(content, 'home_featured_subtitle')}</p>
            </div>
            <Link href="/cars" className={buttonVariants({ variant: 'outline' })}>
              View all cars <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
          {featured.length > 0 ? (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
              {featured.map((car, i) => (
                <Reveal key={car.id} delay={(i % 4) * 90} className="min-w-[80%] snap-start sm:min-w-0">
                  <div className="h-full rounded-2xl transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgb(var(--primary)/0.55),0_18px_44px_-10px_rgb(var(--primary)/0.4)]">
                    <CarCard car={car} />
                  </div>
                </Reveal>
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
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'home_makes_title')}</h2>
            </Reveal>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {makesWithCars.map((make, i) => (
                <li key={make.id}>
                  <Reveal delay={(i % 5) * 70}>
                    <Link
                      href={`/cars?make=${make.slug}`}
                      className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <span className="relative font-semibold text-foreground">{make.name}</span>
                      <span className="relative rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">{make.count}</span>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* How it works: timeline */}
        <section id="how-it-works" className="scroll-mt-20 bg-muted/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'home_how_title')}</h2>
              <p className="mt-2 text-muted-foreground">{t(content, 'home_how_subtitle')}</p>
            </Reveal>
            <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent lg:block" />
              {steps.map((step, i) => {
                const Icon = stepIcons[i];
                return (
                  <li key={i}>
                    <Reveal delay={i * 140} className="relative flex flex-col items-center text-center">
                      <span className="relative mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_28px_rgb(var(--primary)/0.5)]">
                        <Icon className="h-7 w-7" aria-hidden="true" />
                        <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-extrabold text-foreground">
                          {i + 1}
                        </span>
                      </span>
                      <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{step.text}</p>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Why us */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'home_why_title')}</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {why.map((item, i) => {
              const Icon = whyIcons[i];
              return (
                <Reveal key={i} delay={i * 120}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lift">
                    <span aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-primary/20" />
                    <span className="relative mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_rgb(var(--primary)/0.6)] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <h3 className="relative text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="relative mt-1.5 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="animate-shimmer rounded-3xl bg-[linear-gradient(110deg,rgb(var(--border))_20%,rgb(var(--primary))_50%,rgb(var(--border))_80%)] bg-[length:200%_100%] p-[1.5px] motion-reduce:animate-none">
              <div className="relative isolate overflow-hidden rounded-[calc(1.5rem-1px)] bg-hero px-6 py-14 text-center text-hero-foreground sm:px-12">
                <img src="/logo.png" alt="" aria-hidden="true" width={1536} height={1024} className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_72%] opacity-35" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-hero via-hero/70 to-hero/90" />
                <div aria-hidden="true" className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-primary/35 blur-3xl" />
                <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t(content, 'home_cta_title')}</h2>
                <p className="mx-auto mt-3 max-w-xl text-hero-foreground/80">{t(content, 'home_cta_text')}</p>
                <div className="mt-7 flex justify-center">
                  <div className="animate-glow-pulse rounded-xl motion-reduce:animate-none">
                    <ListYourCarButton label={t(content, 'nav_list_button')} content={listContent} size="lg" />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}
