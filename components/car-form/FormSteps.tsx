'use client';

import {
  AUCTION_GRADES,
  BODY_TYPES,
  CAR_STATUSES,
  COLORS,
  DELIVER_TO_OPTIONS,
  DRIVE_TYPES,
  FUEL_TYPES,
  MIN_YEAR,
  STEERING_OPTIONS,
  TRANSMISSIONS,
  maxYear,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { DeliverTo } from '@/types/database';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FeaturesPicker } from './FeaturesPicker';
import { MakeModelPicker } from './MakeModelPicker';
import { PricePreview } from './PricePreview';
import type { MakeOption, ModelOption, StepProps } from './types';

/* -------------------------------- helpers --------------------------------- */

const digitsOnly = (v: string) => v.replace(/\D/g, '');
function priceOnly(v: string): string {
  const cleaned = v.replace(/,/g, '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/* --------------------------------- Basics --------------------------------- */

interface BasicsProps extends StepProps {
  needsOwner: boolean;
  listers: { id: string; full_name: string; email: string }[];
  ownerLocked: boolean;
  titleTouched: boolean;
  onTitleEdit: (title: string) => void;
  onTitleReset: () => void;
  onMakeChange: (make: MakeOption | null) => void;
  onModelChange: (model: ModelOption | null) => void;
}

export function StepBasics({
  values,
  errors,
  set,
  disabled,
  needsOwner,
  listers,
  ownerLocked,
  titleTouched,
  onTitleEdit,
  onTitleReset,
  onMakeChange,
  onModelChange,
}: BasicsProps) {
  const top = maxYear();
  const years: number[] = [];
  for (let y = top; y >= MIN_YEAR; y -= 1) years.push(y);
  const currentYear = Number(values.year);
  if (currentYear && !years.includes(currentYear)) years.push(currentYear);

  return (
    <div className="space-y-5">
      {needsOwner && (
        <Field
          label="Owner (lister)"
          htmlFor="car-owner"
          required
          error={errors.owner_id}
          hint={ownerLocked ? 'The owner cannot change once photos are added.' : 'The seller whose contact details buyers will see.'}
        >
          <Select
            id="car-owner"
            value={values.owner_id}
            invalid={Boolean(errors.owner_id)}
            aria-invalid={Boolean(errors.owner_id)}
            disabled={disabled || ownerLocked}
            onChange={(e) => set('owner_id', e.target.value)}
          >
            <option value="">Select a lister</option>
            {listers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name || l.email} ({l.email})
              </option>
            ))}
          </Select>
        </Field>
      )}

      <MakeModelPicker
        makeId={values.make_id}
        modelId={values.model_id}
        onMakeChange={onMakeChange}
        onModelChange={onModelChange}
        makeError={errors.make_id}
        modelError={errors.model_id}
        disabled={disabled}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Version / trim" htmlFor="car-version" error={errors.version} hint="Optional, for example RS or Hybrid G">
          <Input
            id="car-version"
            value={values.version}
            maxLength={80}
            disabled={disabled}
            invalid={Boolean(errors.version)}
            aria-invalid={Boolean(errors.version)}
            placeholder="e.g. RS"
            onChange={(e) => set('version', e.target.value)}
          />
        </Field>
        <Field label="Year" htmlFor="car-year" required error={errors.year}>
          <Select
            id="car-year"
            value={values.year}
            invalid={Boolean(errors.year)}
            aria-invalid={Boolean(errors.year)}
            disabled={disabled}
            onChange={(e) => set('year', e.target.value)}
          >
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Listing title"
        htmlFor="car-title"
        required
        error={errors.title}
        hint={titleTouched ? undefined : 'Created automatically from year, make, model and version. You can edit it.'}
      >
        <Input
          id="car-title"
          value={values.title}
          maxLength={160}
          disabled={disabled}
          invalid={Boolean(errors.title)}
          aria-invalid={Boolean(errors.title)}
          placeholder="e.g. 2018 Toyota Vitz RS"
          onChange={(e) => onTitleEdit(e.target.value)}
        />
      </Field>
      {titleTouched && (
        <button
          type="button"
          onClick={onTitleReset}
          disabled={disabled}
          className="-mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring rounded"
        >
          Generate the title automatically again
        </button>
      )}

      <div>
        <Field label="Price (EUR)" htmlFor="car-price" required error={errors.price_eur}>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
              aria-hidden="true"
            >
              €
            </span>
            <Input
              id="car-price"
              inputMode="decimal"
              value={values.price_eur}
              disabled={disabled}
              invalid={Boolean(errors.price_eur)}
              aria-invalid={Boolean(errors.price_eur)}
              className="pl-8"
              placeholder="12450"
              onChange={(e) => set('price_eur', priceOnly(e.target.value))}
            />
          </div>
        </Field>
        <div className="mt-1.5">
          <PricePreview value={values.price_eur} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Specs --------------------------------- */

export function StepSpecs({ values, errors, set, disabled }: StepProps) {
  const colorKnown = !values.color || COLORS.some((c) => c.value === values.color);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Mileage (km)" htmlFor="car-mileage" required error={errors.mileage_km}>
        <Input
          id="car-mileage"
          inputMode="numeric"
          value={values.mileage_km}
          disabled={disabled}
          invalid={Boolean(errors.mileage_km)}
          aria-invalid={Boolean(errors.mileage_km)}
          placeholder="e.g. 110000"
          onChange={(e) => set('mileage_km', digitsOnly(e.target.value))}
        />
      </Field>

      <Field label="Fuel type" htmlFor="car-fuel" required error={errors.fuel_type}>
        <Select
          id="car-fuel"
          value={values.fuel_type}
          invalid={Boolean(errors.fuel_type)}
          aria-invalid={Boolean(errors.fuel_type)}
          disabled={disabled}
          onChange={(e) => set('fuel_type', e.target.value as typeof values.fuel_type)}
        >
          <option value="">Select fuel type</option>
          {FUEL_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Transmission" htmlFor="car-transmission" required error={errors.transmission}>
        <Select
          id="car-transmission"
          value={values.transmission}
          invalid={Boolean(errors.transmission)}
          aria-invalid={Boolean(errors.transmission)}
          disabled={disabled}
          onChange={(e) => set('transmission', e.target.value as typeof values.transmission)}
        >
          <option value="">Select transmission</option>
          {TRANSMISSIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Engine size (cc)"
        htmlFor="car-cc"
        error={errors.engine_cc}
        hint={values.fuel_type === 'electric' ? 'Not needed for electric cars.' : 'Leave empty for electric cars.'}
      >
        <Input
          id="car-cc"
          inputMode="numeric"
          value={values.engine_cc}
          disabled={disabled}
          invalid={Boolean(errors.engine_cc)}
          aria-invalid={Boolean(errors.engine_cc)}
          placeholder="e.g. 1500"
          onChange={(e) => set('engine_cc', digitsOnly(e.target.value))}
        />
      </Field>

      <Field label="Body type" htmlFor="car-body" required error={errors.body_type}>
        <Select
          id="car-body"
          value={values.body_type}
          invalid={Boolean(errors.body_type)}
          aria-invalid={Boolean(errors.body_type)}
          disabled={disabled}
          onChange={(e) => set('body_type', e.target.value as typeof values.body_type)}
        >
          <option value="">Select body type</option>
          {BODY_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Colour" htmlFor="car-color" error={errors.color}>
        <Select
          id="car-color"
          value={values.color}
          invalid={Boolean(errors.color)}
          aria-invalid={Boolean(errors.color)}
          disabled={disabled}
          onChange={(e) => set('color', e.target.value)}
        >
          <option value="">Not specified</option>
          {!colorKnown && <option value={values.color}>{values.color}</option>}
          {COLORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Drive" htmlFor="car-drive" error={errors.drive_type}>
        <Select
          id="car-drive"
          value={values.drive_type}
          invalid={Boolean(errors.drive_type)}
          aria-invalid={Boolean(errors.drive_type)}
          disabled={disabled}
          onChange={(e) => set('drive_type', e.target.value as typeof values.drive_type)}
        >
          <option value="">Not specified</option>
          {DRIVE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Steering" htmlFor="car-steering" required error={errors.steering}>
        <Select
          id="car-steering"
          value={values.steering}
          invalid={Boolean(errors.steering)}
          aria-invalid={Boolean(errors.steering)}
          disabled={disabled}
          onChange={(e) => set('steering', e.target.value as typeof values.steering)}
        >
          {STEERING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Auction grade" htmlFor="car-grade" error={errors.auction_grade} hint="Japanese auction sheet grade, if known.">
        <Select
          id="car-grade"
          value={values.auction_grade}
          invalid={Boolean(errors.auction_grade)}
          aria-invalid={Boolean(errors.auction_grade)}
          disabled={disabled}
          onChange={(e) => set('auction_grade', e.target.value)}
        >
          <option value="">Not graded</option>
          {AUCTION_GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Doors" htmlFor="car-doors" error={errors.doors}>
          <Input
            id="car-doors"
            inputMode="numeric"
            value={values.doors}
            maxLength={1}
            disabled={disabled}
            invalid={Boolean(errors.doors)}
            aria-invalid={Boolean(errors.doors)}
            placeholder="4"
            onChange={(e) => set('doors', digitsOnly(e.target.value))}
          />
        </Field>
        <Field label="Seats" htmlFor="car-seats" error={errors.seats}>
          <Input
            id="car-seats"
            inputMode="numeric"
            value={values.seats}
            maxLength={2}
            disabled={disabled}
            invalid={Boolean(errors.seats)}
            aria-invalid={Boolean(errors.seats)}
            placeholder="5"
            onChange={(e) => set('seats', digitsOnly(e.target.value))}
          />
        </Field>
      </div>
    </div>
  );
}

/* --------------------------------- Details -------------------------------- */

interface DetailsProps extends StepProps {
  mode: 'create' | 'edit';
}

export function StepDetails({ values, errors, set, disabled, mode }: DetailsProps) {
  function toggleDelivery(code: DeliverTo, checked: boolean) {
    const next = checked ? [...values.deliver_to, code] : values.deliver_to.filter((c) => c !== code);
    set('deliver_to', DELIVER_TO_OPTIONS.map((o) => o.value).filter((v) => next.includes(v)));
  }

  const statusOptions = CAR_STATUSES.filter((s) => (mode === 'edit' ? true : s.value !== 'sold'));
  const statusHelp: Record<string, string> = {
    draft: 'Hidden from buyers. Only you and the admin can see it.',
    published: 'Visible to buyers on the website.',
    sold: 'Still visible, with a SOLD badge.',
  };

  return (
    <div className="space-y-7">
      <Field
        label="Description"
        htmlFor="car-description"
        error={errors.description}
        hint={`${values.description.length} / 5000`}
      >
        <Textarea
          id="car-description"
          rows={7}
          value={values.description}
          maxLength={5000}
          disabled={disabled}
          invalid={Boolean(errors.description)}
          aria-invalid={Boolean(errors.description)}
          placeholder="Condition, service history, auction notes, anything buyers should know."
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Features</p>
        <FeaturesPicker
          value={values.features}
          onChange={(next) => set('features', next)}
          disabled={disabled}
          error={errors.features}
        />
      </div>

      <fieldset aria-describedby={errors.deliver_to ? 'deliver-error' : undefined}>
        <legend className="mb-2 text-sm font-medium text-foreground">
          Deliver to <span className="text-danger">*</span>
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {DELIVER_TO_OPTIONS.map((o) => (
            <Checkbox
              key={o.value}
              id={`deliver-${o.value}`}
              label={o.label}
              checked={values.deliver_to.includes(o.value)}
              disabled={disabled}
              onChange={(checked) => toggleDelivery(o.value, checked)}
            />
          ))}
        </div>
        {errors.deliver_to && (
          <p id="deliver-error" className="mt-1.5 text-sm text-danger" role="alert">
            {errors.deliver_to}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-foreground">Listing status</legend>
        <p className="mb-3 text-xs text-muted-foreground">
          Your choice decides which button is highlighted on the Review step. You can still use any button there.
        </p>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Listing status">
          {statusOptions.map((o) => {
            const selected = values.status === o.value;
            return (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors',
                  'focus-within:ring-2 ring-ring',
                  selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="radio"
                    name="car-status"
                    value={o.value}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => set('status', o.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {o.label}
                </span>
                <span className="text-xs text-muted-foreground">{statusHelp[o.value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
