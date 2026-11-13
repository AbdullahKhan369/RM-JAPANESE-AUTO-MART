'use client';

import Link from 'next/link';
import { Calendar, Camera, Car as CarIcon, Cog, Fuel, Gauge, Settings2 } from 'lucide-react';
import {
  DELIVER_SHORT_LABELS,
  FUEL_TYPES,
  TRANSMISSIONS,
} from '@/lib/constants';
import { formatCc, formatKm, optionLabel, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CarCardData } from '@/lib/cars-query';
import { PriceTag } from '@/components/cars/PriceTag';

function coverThumb(images: CarCardData['images']): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return (images.find((i) => i.is_cover) ?? sorted[0])?.thumb_url ?? null;
}

function Ribbons({ car }: { car: CarCardData }) {
  return (
    <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
      {car.status === 'sold' ? (
        <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-background shadow">
          Sold
        </span>
      ) : null}
      {car.is_featured && car.status !== 'sold' ? (
        <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow">
          Featured
        </span>
      ) : null}
    </div>
  );
}

function SpecChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className="text-foreground/60">
        {icon}
      </span>
      {children}
    </li>
  );
}

export function CarCard({ car, view = 'grid' }: { car: CarCardData; view?: 'grid' | 'list' }) {
  const thumb = coverThumb(car.images);
  const imageCount = car.images?.length ?? 0;
  const isList = view === 'list';
  const when = car.published_at ?? car.created_at;

  return (
    <Link
      href={`/cars/${car.id}`}
      className={cn(
        'group block overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isList && 'flex flex-col sm:flex-row',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-muted',
          isList ? 'aspect-[4/3] w-full sm:aspect-auto sm:w-72 md:w-80' : 'aspect-[4/3] w-full',
        )}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={car.title}
            loading="lazy"
            width={480}
            height={360}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-[10rem] w-full items-center justify-center text-muted-foreground">
            <CarIcon className="h-12 w-12 opacity-50" aria-hidden="true" />
            <span className="sr-only">No photo available</span>
          </div>
        )}
        <Ribbons car={car} />
        {imageCount > 0 ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-hero/80 px-2 py-1 text-[11px] font-semibold text-hero-foreground backdrop-blur">
            <Camera className="h-3 w-3" aria-hidden="true" />
            {imageCount}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {car.title}
          </h3>
          <PriceTag priceEur={car.price_eur} style="short" className="block text-xl font-extrabold tracking-tight text-primary" />
        </div>

        <ul className="flex flex-wrap gap-1.5" aria-label="Key details">
          <SpecChip icon={<Calendar className="h-3.5 w-3.5" />}>{car.year}</SpecChip>
          <SpecChip icon={<Gauge className="h-3.5 w-3.5" />}>{formatKm(car.mileage_km)}</SpecChip>
          <SpecChip icon={<Fuel className="h-3.5 w-3.5" />}>{optionLabel(FUEL_TYPES, car.fuel_type)}</SpecChip>
          <SpecChip icon={<Cog className="h-3.5 w-3.5" />}>{optionLabel(TRANSMISSIONS, car.transmission)}</SpecChip>
          {car.engine_cc ? <SpecChip icon={<Settings2 className="h-3.5 w-3.5" />}>{formatCc(car.engine_cc)}</SpecChip> : null}
        </ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <ul className="flex flex-wrap gap-1" aria-label="Delivery countries">
            {(car.deliver_to ?? []).map((country) => (
              <li
                key={country}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {DELIVER_SHORT_LABELS[country] ?? country}
              </li>
            ))}
          </ul>
          <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
            {timeAgo(when)}
          </span>
        </div>
      </div>
    </Link>
  );
}
