import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, ChevronRight, Cog, Fuel, Gauge, Settings2, Car as CarIcon } from 'lucide-react';
import {
  CAR_SELECT,
  DELIVER_TO_OPTIONS,
  FUEL_TYPES,
  TRANSMISSIONS,
  BODY_TYPES,
} from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { cacheRequest } from '@/lib/server-cache';
import { getSiteContent, t } from '@/lib/site-content';
import { coverImage, formatCc, formatKm, optionLabel, sortedImages } from '@/lib/format';
import { formatEur } from '@/lib/currency';
import { LIST_SELECT, type CarCardData } from '@/lib/cars-query';
import { CarCard } from '@/components/cars/CarCard';
import { ContactBox } from '@/components/cars/ContactBox';
import { Gallery } from '@/components/cars/Gallery';
import { DetailPrice } from '@/components/cars/PriceTag';
import { SpecsTable } from '@/components/cars/SpecsTable';
import type { CarWithRelations, PublicLister } from '@/types/database';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCar = cacheRequest(async (id: string): Promise<CarWithRelations | null> => {
  if (!UUID.test(id)) return null;
  const supabase = createClient();
  // RLS only returns published/sold cars of active listers, so drafts come back empty.
  const { data, error } = await supabase.from('cars').select(CAR_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const car = data as unknown as CarWithRelations;
  if (car.status === 'draft') return null;
  return car;
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const car = await getCar(params.id);
  if (!car) return { title: 'Car not found' };
  const cover = coverImage(car.images);
  const description = `${car.title}: ${formatKm(car.mileage_km)}, ${optionLabel(FUEL_TYPES, car.fuel_type)}, ${optionLabel(
    TRANSMISSIONS,
    car.transmission,
  )}. Listed at ${formatEur(Number(car.price_eur))}. Delivered to Ireland, the UK and Pakistan.`;
  return {
    title: car.title,
    description,
    alternates: { canonical: `/cars/${car.id}` },
    openGraph: {
      type: 'website',
      title: car.title,
      description,
      url: `/cars/${car.id}`,
      images: cover ? [{ url: cover.url, alt: car.title }] : undefined,
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title: car.title, description },
  };
}

export default async function CarDetailPage({ params }: { params: { id: string } }) {
  const car = await getCar(params.id);
  if (!car) notFound();

  const supabase = createClient();
  const [content, listerResult, similarResult] = await Promise.all([
    getSiteContent(),
    supabase.from('public_listers').select('id,full_name,email,phone,city').eq('id', car.lister_id).maybeSingle(),
    supabase
      .from('cars')
      .select(LIST_SELECT)
      .eq('status', 'published')
      .eq('make_id', car.make_id)
      .neq('id', car.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(4),
  ]);

  const lister = (listerResult.data ?? null) as PublicLister | null;
  const similar = (similarResult.data ?? []) as unknown as CarCardData[];
  const images = sortedImages(car.images);
  const cover = coverImage(car.images);
  const ordered = cover ? [cover, ...images.filter((i) => i.id !== cover.id)] : images;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pageUrl = `${siteUrl}/cars/${car.id}`;
  const sold = car.status === 'sold';
  const price = Number(car.price_eur);

  // Site-wide contact is the fallback when the lister's own details are missing.
  const fallbackPhone = t(content, 'contact_whatsapp').trim() || t(content, 'contact_phone').trim();
  const fallbackEmail = t(content, 'contact_email').trim();
  const person = lister
    ? { name: lister.full_name, city: lister.city, phone: lister.phone, email: lister.email }
    : fallbackPhone || fallbackEmail
      ? { name: t(content, 'site_name'), city: '', phone: fallbackPhone, email: fallbackEmail }
      : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Car'],
    name: car.title,
    description: car.description || car.title,
    image: ordered.map((i) => i.url),
    url: pageUrl,
    brand: { '@type': 'Brand', name: car.make?.name },
    model: car.model?.name,
    vehicleModelDate: String(car.year),
    mileageFromOdometer: car.mileage_km === null ? undefined : { '@type': 'QuantitativeValue', value: car.mileage_km, unitCode: 'KMT' },
    fuelType: optionLabel(FUEL_TYPES, car.fuel_type),
    vehicleTransmission: optionLabel(TRANSMISSIONS, car.transmission),
    bodyType: optionLabel(BODY_TYPES, car.body_type),
    color: car.color || undefined,
    vehicleEngine: car.engine_cc ? { '@type': 'EngineSpecification', engineDisplacement: { '@type': 'QuantitativeValue', value: car.engine_cc, unitCode: 'CMQ' } } : undefined,
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'EUR',
      availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: pageUrl,
    },
  };

  const facts = [
    { icon: Calendar, label: 'Year', value: String(car.year) },
    { icon: Gauge, label: 'Mileage', value: formatKm(car.mileage_km) },
    { icon: Fuel, label: 'Fuel', value: optionLabel(FUEL_TYPES, car.fuel_type) },
    { icon: Cog, label: 'Transmission', value: optionLabel(TRANSMISSIONS, car.transmission) },
    { icon: Settings2, label: 'Engine', value: formatCc(car.engine_cc) },
    { icon: CarIcon, label: 'Body', value: optionLabel(BODY_TYPES, car.body_type) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">Home</Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li>
            <Link href="/cars" className="hover:text-primary">Cars</Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li>
            <Link href={`/cars?make=${car.make?.slug}`} className="hover:text-primary">{car.make?.name}</Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">{car.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-8">
          <Gallery
            images={ordered.map((i) => ({ id: i.id, url: i.url, thumb_url: i.thumb_url }))}
            title={car.title}
            badge={
              sold || car.is_featured ? (
                <span
                  className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow ${
                    sold ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {sold ? 'Sold' : 'Featured'}
                </span>
              ) : null
            }
          />

          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{car.title}</h1>
            <DetailPrice priceEur={price} />
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Key facts">
            {facts.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{value}</p>
                </div>
              </li>
            ))}
          </ul>

          <section aria-labelledby="specs-heading" className="space-y-3">
            <h2 id="specs-heading" className="text-xl font-semibold text-foreground">Specifications</h2>
            <SpecsTable car={car} />
          </section>

          {car.features && car.features.length > 0 ? (
            <section aria-labelledby="features-heading" className="space-y-3">
              <h2 id="features-heading" className="text-xl font-semibold text-foreground">Features</h2>
              <ul className="flex flex-wrap gap-2">
                {car.features.map((feature) => (
                  <li key={feature} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {car.description ? (
            <section aria-labelledby="desc-heading" className="space-y-3">
              <h2 id="desc-heading" className="text-xl font-semibold text-foreground">Description</h2>
              <p className="whitespace-pre-line leading-relaxed text-foreground/90">{car.description}</p>
            </section>
          ) : null}

          <section aria-labelledby="deliver-heading" className="space-y-3">
            <h2 id="deliver-heading" className="text-xl font-semibold text-foreground">Deliver to</h2>
            <ul className="flex flex-wrap gap-2">
              {(car.deliver_to ?? []).map((country) => (
                <li key={country} className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  {optionLabel(DELIVER_TO_OPTIONS, country)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <ContactBox
          title={t(content, 'detail_contact_title')}
          person={person}
          carTitle={car.title}
          pageUrl={pageUrl}
          disclaimer={t(content, 'detail_disclaimer')}
        />
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="mt-14 space-y-5">
          <h2 id="similar-heading" className="text-2xl font-bold tracking-tight text-foreground">
            More {car.make?.name} cars
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => (
              <CarCard key={s.id} car={s} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
