'use client';

import type { ReactNode } from 'react';
import { Car as CarIcon, Pencil } from 'lucide-react';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import {
  BODY_TYPES,
  DELIVER_TO_OPTIONS,
  DRIVE_TYPES,
  FUEL_TYPES,
  STEERING_OPTIONS,
  TRANSMISSIONS,
  COLORS,
  CAR_STATUSES,
} from '@/lib/constants';
import { formatCc, formatKm, optionLabel } from '@/lib/format';
import { formatEur } from '@/lib/currency';
import type { CarFormValues, FieldErrors } from '@/lib/validators/car';
import { STEP_BASICS, STEP_DETAILS, STEP_PHOTOS, STEP_SPECS } from '@/lib/validators/car';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import type { FormImage } from './types';

interface ReviewStepProps {
  values: CarFormValues;
  makeName: string;
  modelName: string;
  ownerLabel?: string;
  images: FormImage[];
  coverId: string | null;
  errors: FieldErrors;
  onEdit: (step: number) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value || '–'}</dd>
    </div>
  );
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
        </button>
      </div>
      {children}
    </section>
  );
}

export function ReviewStep({ values, makeName, modelName, ownerLabel, images, coverId, errors, onEdit }: ReviewStepProps) {
  const { format } = useCurrency();
  const done = images.filter((i) => i.status === 'done');
  const cover = done.find((i) => i.tempId === coverId) ?? done[0] ?? null;
  const eur = Number(values.price_eur);
  const priceOk = Number.isFinite(eur) && eur > 0;
  const errorKeys = Object.keys(errors);
  const deliverLabels = DELIVER_TO_OPTIONS.filter((o) => values.deliver_to.includes(o.value)).map((o) => o.label);

  return (
    <div className="space-y-6">
      {errorKeys.length > 0 && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground" role="alert">
          Some details are missing or invalid. Use the Edit links below to fix them.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="space-y-4">
          <Section title="Basics" step={STEP_BASICS} onEdit={onEdit}>
            <dl className="divide-y divide-border">
              {ownerLabel && <Row label="Owner" value={ownerLabel} />}
              <Row label="Make" value={makeName} />
              <Row label="Model" value={modelName} />
              <Row label="Version" value={values.version} />
              <Row label="Year" value={values.year} />
              <Row label="Title" value={values.title} />
              <Row label="Price" value={priceOk ? formatEur(eur) : ''} />
            </dl>
          </Section>

          <Section title="Specs" step={STEP_SPECS} onEdit={onEdit}>
            <dl className="divide-y divide-border">
              <Row label="Mileage" value={values.mileage_km ? formatKm(Number(values.mileage_km)) : ''} />
              <Row label="Fuel" value={optionLabel(FUEL_TYPES, values.fuel_type || null)} />
              <Row label="Transmission" value={optionLabel(TRANSMISSIONS, values.transmission || null)} />
              <Row label="Engine" value={values.engine_cc ? formatCc(Number(values.engine_cc)) : ''} />
              <Row label="Body type" value={optionLabel(BODY_TYPES, values.body_type || null)} />
              <Row label="Colour" value={COLORS.find((c) => c.value === values.color)?.label ?? values.color} />
              <Row label="Drive" value={optionLabel(DRIVE_TYPES, values.drive_type || null)} />
              <Row label="Steering" value={optionLabel(STEERING_OPTIONS, values.steering)} />
              <Row label="Auction grade" value={values.auction_grade || 'Not graded'} />
              <Row label="Doors" value={values.doors} />
              <Row label="Seats" value={values.seats} />
            </dl>
          </Section>

          <Section title="Photos" step={STEP_PHOTOS} onEdit={onEdit}>
            {done.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {done.map((img, i) => (
                  <li key={img.tempId} className="overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumb_url}
                      alt={`Car photo ${i + 1}`}
                      width={120}
                      height={90}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Details and delivery" step={STEP_DETAILS} onEdit={onEdit}>
            <dl className="divide-y divide-border">
              <Row label="Deliver to" value={deliverLabels.join(', ')} />
              <Row label="Status" value={optionLabel(CAR_STATUSES, values.status)} />
              <Row label="Features" value={values.features.length ? `${values.features.length} selected` : ''} />
            </dl>
            {values.description.trim() && (
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                {values.description}
              </p>
            )}
          </Section>
        </div>

        <aside aria-label="Card preview" className="space-y-2">
          <p className="text-sm font-semibold text-foreground">How the card will look</p>
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.thumb_url}
                  alt="Cover photo preview"
                  width={480}
                  height={360}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <CarIcon className="h-10 w-10" aria-hidden="true" />
                </div>
              )}
              {done.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground">
                  {done.length} photos
                </span>
              )}
              {values.status === 'sold' && (
                <span className="absolute left-2 top-2">
                  <Badge variant="danger">SOLD</Badge>
                </span>
              )}
            </div>
            <CardContent>
              <p className="line-clamp-2 font-semibold text-foreground">{values.title || 'Your listing title'}</p>
              <p className="mt-1 text-lg font-bold text-primary">{priceOk ? format(eur, { style: 'short' }) : '–'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  values.year,
                  values.mileage_km ? formatKm(Number(values.mileage_km)) : '',
                  optionLabel(FUEL_TYPES, values.fuel_type || null),
                  optionLabel(TRANSMISSIONS, values.transmission || null),
                  values.engine_cc ? formatCc(Number(values.engine_cc)) : '',
                ]
                  .filter((p) => p && p !== '–')
                  .join(' · ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {deliverLabels.map((l) => (
                  <Badge key={l} variant="muted">
                    {l}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Buyers see the price in the currency they chose.</p>
        </aside>
      </div>
    </div>
  );
}
