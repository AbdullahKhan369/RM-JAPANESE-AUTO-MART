import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUCTION_GRADES,
  BODY_TYPES,
  COLORS,
  DELIVER_TO_OPTIONS,
  DRIVE_TYPES,
  FUEL_TYPES,
  MIN_YEAR,
  PAGE_SIZE,
  SORT_OPTIONS,
  STEERING_OPTIONS,
  TRANSMISSIONS,
  maxYear,
} from '@/lib/constants';
import type { DeliverTo } from '@/types/database';

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface CarFilters {
  q?: string;
  make?: string;
  model?: string;
  min_eur?: number;
  max_eur?: number;
  year_min?: number;
  year_max?: number;
  km_max?: number;
  cc_min?: number;
  cc_max?: number;
  fuel?: string;
  transmission?: string;
  body?: string;
  color?: string;
  drive?: string;
  steering?: string;
  grade?: string;
  deliver_to?: DeliverTo;
  include_sold: boolean;
  sort: string;
  view: 'grid' | 'list';
  page: number;
}

/** Only the columns a car card needs. */
export const LIST_SELECT =
  'id,title,year,price_eur,mileage_km,fuel_type,transmission,engine_cc,deliver_to,status,is_featured,published_at,created_at,make:makes(name,slug),model:models(name,slug),images:car_images(id,thumb_url,position,is_cover)';

export interface CarCardData {
  id: string;
  title: string;
  year: number;
  price_eur: number;
  mileage_km: number | null;
  fuel_type: string;
  transmission: string;
  engine_cc: number | null;
  deliver_to: DeliverTo[];
  status: 'published' | 'sold' | 'draft';
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  make: { name: string; slug: string } | null;
  model: { name: string; slug: string } | null;
  images: { id: string; thumb_url: string; position: number; is_cover: boolean }[];
}

export interface MakeOption {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogOptions {
  makes: MakeOption[];
  modelsByMake: Record<string, { name: string; slug: string }[]>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function numberParam(value: string | string[] | undefined, min: number, max: number): number | undefined {
  const raw = first(value).trim();
  if (raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

function oneOf(value: string | string[] | undefined, allowed: string[]): string | undefined {
  const raw = first(value).trim();
  return raw !== '' && allowed.includes(raw) ? raw : undefined;
}

function slugParam(value: string | string[] | undefined): string | undefined {
  const raw = first(value).trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(raw) ? raw : undefined;
}

/** Keeps letters, numbers, spaces and a few safe characters so the keyword cannot break the filter syntax. */
export function cleanKeyword(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s.\-/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/** Reads and validates the URL query. Unknown or invalid values are ignored. */
export function parseFilters(sp: RawSearchParams): CarFilters {
  const q = cleanKeyword(first(sp.q));
  let min = numberParam(sp.min_eur, 0, 99_999_999);
  let max = numberParam(sp.max_eur, 0, 99_999_999);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  let yearMin = numberParam(sp.year_min, MIN_YEAR, maxYear());
  let yearMax = numberParam(sp.year_max, MIN_YEAR, maxYear());
  if (yearMin !== undefined && yearMax !== undefined && yearMin > yearMax) [yearMin, yearMax] = [yearMax, yearMin];
  let ccMin = numberParam(sp.cc_min, 0, 20_000);
  let ccMax = numberParam(sp.cc_max, 0, 20_000);
  if (ccMin !== undefined && ccMax !== undefined && ccMin > ccMax) [ccMin, ccMax] = [ccMax, ccMin];
  const page = numberParam(sp.page, 1, 100_000);

  return {
    q: q || undefined,
    make: slugParam(sp.make),
    model: slugParam(sp.model),
    min_eur: min,
    max_eur: max,
    year_min: yearMin,
    year_max: yearMax,
    km_max: numberParam(sp.km_max, 0, 2_000_000),
    cc_min: ccMin,
    cc_max: ccMax,
    fuel: oneOf(sp.fuel, FUEL_TYPES.map((o) => o.value)),
    transmission: oneOf(sp.transmission, TRANSMISSIONS.map((o) => o.value)),
    body: oneOf(sp.body, BODY_TYPES.map((o) => o.value)),
    color: oneOf(sp.color, COLORS.map((o) => o.value)),
    drive: oneOf(sp.drive, DRIVE_TYPES.map((o) => o.value)),
    steering: oneOf(sp.steering, STEERING_OPTIONS.map((o) => o.value)),
    grade: oneOf(sp.grade, AUCTION_GRADES),
    deliver_to: oneOf(sp.deliver_to, DELIVER_TO_OPTIONS.map((o) => o.value)) as DeliverTo | undefined,
    include_sold: first(sp.include_sold) === '1',
    sort: oneOf(sp.sort, SORT_OPTIONS.map((o) => o.value)) ?? 'newest',
    view: first(sp.view) === 'list' ? 'list' : 'grid',
    page: page ? Math.floor(page) : 1,
  };
}

/** Builds a /cars URL from the raw query, changing only what is passed in `overrides`. */
export function buildCarsHref(sp: RawSearchParams, overrides: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    const v = first(value);
    if (v !== '') params.set(key, v);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `/cars?${qs}` : '/cars';
}

/** Loads all makes and their models (about 10 + 130 rows) for the filter dropdowns. */
export async function loadCatalog(supabase: SupabaseClient): Promise<CatalogOptions & { allModels: { id: string; make_id: string; name: string; slug: string }[] }> {
  const [makesResult, modelsResult] = await Promise.all([
    supabase.from('makes').select('id,name,slug').order('name'),
    supabase.from('models').select('id,make_id,name,slug').order('name'),
  ]);
  const makes = ((makesResult.data ?? []) as MakeOption[]).slice();
  const allModels = (modelsResult.data ?? []) as { id: string; make_id: string; name: string; slug: string }[];
  const slugById = new Map(makes.map((m) => [m.id, m.slug]));
  const modelsByMake: Record<string, { name: string; slug: string }[]> = {};
  for (const model of allModels) {
    const makeSlug = slugById.get(model.make_id);
    if (!makeSlug) continue;
    (modelsByMake[makeSlug] ??= []).push({ name: model.name, slug: model.slug });
  }
  return { makes, modelsByMake, allModels };
}

export interface CarsPage {
  cars: CarCardData[];
  total: number;
  /** True when the requested page is past the last page. */
  outOfRange: boolean;
  error: boolean;
}

/** Runs the paginated listing query for the public /cars page. */
export async function queryCars(
  supabase: SupabaseClient,
  filters: CarFilters,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): Promise<CarsPage> {
  const make = filters.make ? catalog.makes.find((m) => m.slug === filters.make) : undefined;
  const model =
    make && filters.model
      ? catalog.allModels.find((m) => m.make_id === make.id && m.slug === filters.model)
      : undefined;

  let query = supabase
    .from('cars')
    .select(LIST_SELECT, { count: 'exact' })
    .in('status', filters.include_sold ? ['published', 'sold'] : ['published']);

  if (make) query = query.eq('make_id', make.id);
  if (model) query = query.eq('model_id', model.id);
  if (filters.q) {
    const term = filters.q;
    query = query.or(`title.ilike.%${term}%,version.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (filters.min_eur !== undefined) query = query.gte('price_eur', filters.min_eur);
  if (filters.max_eur !== undefined) query = query.lte('price_eur', filters.max_eur);
  if (filters.year_min !== undefined) query = query.gte('year', filters.year_min);
  if (filters.year_max !== undefined) query = query.lte('year', filters.year_max);
  if (filters.km_max !== undefined) query = query.lte('mileage_km', filters.km_max);
  if (filters.cc_min !== undefined) query = query.gte('engine_cc', filters.cc_min);
  if (filters.cc_max !== undefined) query = query.lte('engine_cc', filters.cc_max);
  if (filters.fuel) query = query.eq('fuel_type', filters.fuel);
  if (filters.transmission) query = query.eq('transmission', filters.transmission);
  if (filters.body) query = query.eq('body_type', filters.body);
  if (filters.color) query = query.eq('color', filters.color);
  if (filters.drive) query = query.eq('drive_type', filters.drive);
  if (filters.steering) query = query.eq('steering', filters.steering);
  if (filters.grade) query = query.eq('auction_grade', filters.grade);
  if (filters.deliver_to) query = query.contains('deliver_to', [filters.deliver_to]);

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price_eur', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price_eur', { ascending: false });
      break;
    case 'year_desc':
      query = query.order('year', { ascending: false }).order('published_at', { ascending: false, nullsFirst: false });
      break;
    case 'mileage_asc':
      query = query.order('mileage_km', { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  }
  query = query.order('id', { ascending: true });

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  if (error) {
    // PGRST103: the requested range starts after the last row.
    return { cars: [], total: 0, outOfRange: error.code === 'PGRST103' && filters.page > 1, error: error.code !== 'PGRST103' };
  }
  return { cars: (data ?? []) as unknown as CarCardData[], total: count ?? 0, outOfRange: false, error: false };
}
