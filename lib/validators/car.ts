import { z } from 'zod';
import {
  AUCTION_GRADES,
  BODY_TYPES,
  DRIVE_TYPES,
  FUEL_TYPES,
  MAX_IMAGES,
  MIN_YEAR,
  STEERING_OPTIONS,
  TRANSMISSIONS,
  maxYear,
} from '@/lib/constants';
import type {
  BodyType,
  CarStatus,
  CarWithRelations,
  DeliverTo,
  DriveType,
  FuelType,
  Steering,
  Transmission,
} from '@/types/database';

/* -------------------------------------------------------------------------- */
/* Form value model (all inputs are strings so that partial input is allowed)  */
/* -------------------------------------------------------------------------- */

export interface CarFormValues {
  owner_id: string;
  make_id: string;
  model_id: string;
  version: string;
  year: string;
  title: string;
  price_eur: string;
  mileage_km: string;
  fuel_type: FuelType | '';
  transmission: Transmission | '';
  engine_cc: string;
  body_type: BodyType | '';
  color: string;
  drive_type: DriveType | '';
  steering: Steering;
  auction_grade: string;
  doors: string;
  seats: string;
  description: string;
  features: string[];
  deliver_to: DeliverTo[];
  status: CarStatus;
}

export type CarFieldName = keyof CarFormValues;
export type FieldErrors = Partial<Record<CarFieldName | 'images', string>>;

export const ALL_DELIVER_TO: DeliverTo[] = ['ireland', 'uk', 'pakistan'];

export const CAR_FORM_STEPS = [
  { id: 'basics', title: 'Basics', description: 'Make, model, year and price' },
  { id: 'specs', title: 'Specs', description: 'Mileage, fuel, transmission and body' },
  { id: 'photos', title: 'Photos', description: 'Add up to 12 photos of the car' },
  { id: 'details', title: 'Details', description: 'Description, features and delivery' },
  { id: 'review', title: 'Review', description: 'Check everything and save' },
] as const;

export const STEP_BASICS = 0;
export const STEP_SPECS = 1;
export const STEP_PHOTOS = 2;
export const STEP_DETAILS = 3;
export const STEP_REVIEW = 4;

/** Which wizard step shows which field (used to jump to the first error). */
export const FIELD_STEP: Record<CarFieldName | 'images', number> = {
  owner_id: STEP_BASICS,
  make_id: STEP_BASICS,
  model_id: STEP_BASICS,
  version: STEP_BASICS,
  year: STEP_BASICS,
  title: STEP_BASICS,
  price_eur: STEP_BASICS,
  mileage_km: STEP_SPECS,
  fuel_type: STEP_SPECS,
  transmission: STEP_SPECS,
  engine_cc: STEP_SPECS,
  body_type: STEP_SPECS,
  color: STEP_SPECS,
  drive_type: STEP_SPECS,
  steering: STEP_SPECS,
  auction_grade: STEP_SPECS,
  doors: STEP_SPECS,
  seats: STEP_SPECS,
  images: STEP_PHOTOS,
  description: STEP_DETAILS,
  features: STEP_DETAILS,
  deliver_to: STEP_DETAILS,
  status: STEP_DETAILS,
};

export function emptyCarFormValues(): CarFormValues {
  return {
    owner_id: '',
    make_id: '',
    model_id: '',
    version: '',
    year: '',
    title: '',
    price_eur: '',
    mileage_km: '',
    fuel_type: '',
    transmission: '',
    engine_cc: '',
    body_type: '',
    color: '',
    drive_type: '',
    steering: 'right',
    auction_grade: '',
    doors: '',
    seats: '',
    description: '',
    features: [],
    deliver_to: [...ALL_DELIVER_TO],
    status: 'published',
  };
}

export function valuesFromCar(car: CarWithRelations): CarFormValues {
  return {
    owner_id: car.lister_id,
    make_id: car.make_id,
    model_id: car.model_id,
    version: car.version ?? '',
    year: String(car.year),
    title: car.title,
    price_eur: String(Number(car.price_eur)),
    mileage_km: car.mileage_km === null ? '' : String(car.mileage_km),
    fuel_type: car.fuel_type,
    transmission: car.transmission,
    engine_cc: car.engine_cc === null ? '' : String(car.engine_cc),
    body_type: car.body_type,
    color: car.color ?? '',
    drive_type: car.drive_type ?? '',
    steering: car.steering,
    auction_grade: car.auction_grade ?? '',
    doors: car.doors === null ? '' : String(car.doors),
    seats: car.seats === null ? '' : String(car.seats),
    description: car.description ?? '',
    features: [...(car.features ?? [])],
    deliver_to: car.deliver_to?.length ? [...car.deliver_to] : [...ALL_DELIVER_TO],
    status: car.status,
  };
}

/* -------------------------------------------------------------------------- */
/* Field rules                                                                 */
/* -------------------------------------------------------------------------- */

function addError(ctx: z.RefinementCtx, message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message });
}

const wholeNumber = (label: string, min: number, max: number, required: boolean) =>
  z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === '') {
        if (required) addError(ctx, `${label} is required`);
        return;
      }
      if (!/^\d+$/.test(v)) {
        addError(ctx, `${label} must be a whole number`);
        return;
      }
      const n = Number(v);
      if (n < min || n > max) addError(ctx, `${label} must be between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}`);
    });

const oneOf = (label: string, allowed: readonly string[], required: boolean) =>
  z.string().superRefine((v, ctx) => {
    if (v === '') {
      if (required) addError(ctx, `${label} is required`);
      return;
    }
    if (!allowed.includes(v)) addError(ctx, `Choose a valid option for ${label.toLowerCase()}`);
  });

const yearField = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (v === '') {
      addError(ctx, 'Year is required');
      return;
    }
    if (!/^\d{4}$/.test(v)) {
      addError(ctx, 'Enter a 4-digit year');
      return;
    }
    const n = Number(v);
    if (n < MIN_YEAR || n > maxYear()) addError(ctx, `Year must be between ${MIN_YEAR} and ${maxYear()}`);
  });

const priceField = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (v === '') {
      addError(ctx, 'Price in EUR is required');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(v)) {
      addError(ctx, 'Enter a valid price in EUR, for example 12450');
      return;
    }
    const n = Number(v);
    if (n <= 0) addError(ctx, 'Price must be more than 0');
    else if (n >= 100_000_000) addError(ctx, 'Price is too high');
  });

const basicsShape = {
  make_id: z.string().min(1, 'Choose a make'),
  model_id: z.string().min(1, 'Choose a model'),
  version: z.string().trim().max(80, 'Version is too long (max 80 characters)'),
  year: yearField,
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(160, 'Title is too long (max 160 characters)'),
  price_eur: priceField,
};

const specsShape = (strict: boolean) => ({
  mileage_km: wholeNumber('Mileage', 0, 2_000_000, strict),
  fuel_type: oneOf('Fuel type', FUEL_TYPES.map((o) => o.value), strict),
  transmission: oneOf('Transmission', TRANSMISSIONS.map((o) => o.value), strict),
  engine_cc: wholeNumber('Engine size', 0, 20_000, false),
  body_type: oneOf('Body type', BODY_TYPES.map((o) => o.value), strict),
  color: z.string().trim().max(40, 'Colour is too long'),
  drive_type: oneOf('Drive type', DRIVE_TYPES.map((o) => o.value), false),
  steering: oneOf('Steering', STEERING_OPTIONS.map((o) => o.value), true),
  auction_grade: z
    .string()
    .refine((v) => v === '' || AUCTION_GRADES.includes(v), 'Choose a valid auction grade'),
  doors: wholeNumber('Doors', 1, 7, false),
  seats: wholeNumber('Seats', 1, 20, false),
});

const detailsShape = (strict: boolean) => ({
  description: z.string().max(5000, 'Description is too long (max 5000 characters)'),
  features: z
    .array(z.string().trim().min(1).max(60, 'Each feature must be 60 characters or fewer'))
    .max(60, 'Too many features (max 60)'),
  deliver_to: strict
    ? z.array(z.enum(['ireland', 'uk', 'pakistan'])).min(1, 'Choose at least one delivery country')
    : z.array(z.enum(['ireland', 'uk', 'pakistan'])),
  status: z.enum(['draft', 'published', 'sold']),
});

/** Step 1 (strict). */
export const basicsSchema = z.object(basicsShape);
/** Step 2 (strict: everything needed to publish). */
export const specsSchema = z.object(specsShape(true));
/** Step 4 (strict). */
export const detailsSchema = z.object(detailsShape(true));
/** Step 3: photos. */
export const photosSchema = z.object({
  imageCount: z
    .number()
    .min(1, 'Add at least one photo before publishing')
    .max(MAX_IMAGES, `You can add up to ${MAX_IMAGES} photos`),
});
/** Full publish rules. */
export const publishSchema = z.object({
  ...basicsShape,
  ...specsShape(true),
  ...detailsShape(true),
});
/** Draft rules: only make, model, year, price and title are mandatory, everything else is format-checked. */
export const draftSchema = z.object({
  ...basicsShape,
  ...specsShape(false),
  ...detailsShape(false),
});

/* -------------------------------------------------------------------------- */
/* Validation helpers                                                          */
/* -------------------------------------------------------------------------- */

export interface ValidationContext {
  imageCount: number;
  /** true when an admin creates a car and must choose the owner */
  needsOwner: boolean;
}

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '') as CarFieldName;
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

function ownerErrors(values: CarFormValues, ctx: ValidationContext): FieldErrors {
  if (ctx.needsOwner && !values.owner_id) return { owner_id: 'Choose who owns this car' };
  return {};
}

function photoErrors(ctx: ValidationContext, strict: boolean): FieldErrors {
  if (ctx.imageCount > MAX_IMAGES) return { images: `You can add up to ${MAX_IMAGES} photos` };
  if (strict) {
    const r = photosSchema.safeParse({ imageCount: ctx.imageCount });
    if (!r.success) return { images: r.error.issues[0]?.message ?? 'Add at least one photo' };
  }
  return {};
}

/** Validates one wizard step with the strict (publish level) rules. */
export function validateStep(step: number, values: CarFormValues, ctx: ValidationContext): FieldErrors {
  switch (step) {
    case STEP_BASICS: {
      const r = basicsSchema.safeParse(values);
      return { ...(r.success ? {} : issuesToErrors(r.error.issues)), ...ownerErrors(values, ctx) };
    }
    case STEP_SPECS: {
      const r = specsSchema.safeParse(values);
      return r.success ? {} : issuesToErrors(r.error.issues);
    }
    case STEP_PHOTOS:
      return photoErrors(ctx, true);
    case STEP_DETAILS: {
      const r = detailsSchema.safeParse(values);
      return r.success ? {} : issuesToErrors(r.error.issues);
    }
    default:
      return {};
  }
}

export type SaveMode = 'draft' | 'publish';

/** Validates the whole form. `draft` = minimum rules, `publish` = full rules (also used for "sold"). */
export function validateAll(
  values: CarFormValues,
  ctx: ValidationContext,
  mode: SaveMode,
): { errors: FieldErrors; firstStep: number | null } {
  const parsed = (mode === 'publish' ? publishSchema : draftSchema).safeParse(values);
  const errors: FieldErrors = {
    ...(parsed.success ? {} : issuesToErrors(parsed.error.issues)),
    ...ownerErrors(values, ctx),
    ...photoErrors(ctx, mode === 'publish'),
  };
  const keys = Object.keys(errors) as (CarFieldName | 'images')[];
  if (keys.length === 0) return { errors, firstStep: null };
  const firstStep = Math.min(...keys.map((k) => FIELD_STEP[k]));
  return { errors, firstStep };
}

/* -------------------------------------------------------------------------- */
/* Payload                                                                     */
/* -------------------------------------------------------------------------- */

export interface CarWritePayload {
  title: string;
  make_id: string;
  model_id: string;
  version: string;
  year: number;
  price_eur: number;
  mileage_km: number | null;
  fuel_type: FuelType;
  transmission: Transmission;
  engine_cc: number | null;
  body_type: BodyType;
  color: string;
  drive_type: DriveType | null;
  steering: Steering;
  auction_grade: string;
  doors: number | null;
  seats: number | null;
  deliver_to: DeliverTo[];
  features: string[];
  description: string;
  status: CarStatus;
}

const toIntOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

export function cleanFeatures(features: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of features) {
    const f = raw.trim().replace(/\s+/g, ' ');
    const key = f.toLowerCase();
    if (!f || seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

/**
 * Builds the row written to `cars`. A draft may miss fuel / transmission / body type, but those columns are
 * NOT NULL in the database, so neutral placeholders are stored until the lister completes them (publishing
 * always requires real values).
 */
export function toCarPayload(values: CarFormValues, status: CarStatus): CarWritePayload {
  const deliver = values.deliver_to.length ? values.deliver_to : [...ALL_DELIVER_TO];
  return {
    title: values.title.trim(),
    make_id: values.make_id,
    model_id: values.model_id,
    version: values.version.trim(),
    year: Number(values.year),
    price_eur: Number(values.price_eur),
    mileage_km: toIntOrNull(values.mileage_km),
    fuel_type: values.fuel_type || 'petrol',
    transmission: values.transmission || 'automatic',
    engine_cc: toIntOrNull(values.engine_cc),
    body_type: values.body_type || 'sedan',
    color: values.color.trim(),
    drive_type: values.drive_type || null,
    steering: values.steering,
    auction_grade: values.auction_grade,
    doors: toIntOrNull(values.doors),
    seats: toIntOrNull(values.seats),
    deliver_to: deliver,
    features: cleanFeatures(values.features),
    description: values.description.trim(),
    status,
  };
}
