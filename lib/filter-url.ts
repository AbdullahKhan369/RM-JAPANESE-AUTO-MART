import type { Currency } from '@/types/database';

/** Pure helpers shared by the filter UI (client) and nothing else. Prices in the URL are always EUR. */

export interface FilterValues {
  q: string;
  make: string;
  model: string;
  /** In the buyer's currency */
  min: string;
  max: string;
  year_min: string;
  year_max: string;
  km_max: string;
  cc_min: string;
  cc_max: string;
  fuel: string;
  transmission: string;
  body: string;
  color: string;
  drive: string;
  steering: string;
  grade: string;
  deliver_to: string;
  include_sold: boolean;
}

export const EMPTY_FILTERS: FilterValues = {
  q: '',
  make: '',
  model: '',
  min: '',
  max: '',
  year_min: '',
  year_max: '',
  km_max: '',
  cc_min: '',
  cc_max: '',
  fuel: '',
  transmission: '',
  body: '',
  color: '',
  drive: '',
  steering: '',
  grade: '',
  deliver_to: '',
  include_sold: false,
};

/** URL keys that count as "filters" (sort, view and page are not). */
export const FILTER_URL_KEYS = [
  'q',
  'make',
  'model',
  'min_eur',
  'max_eur',
  'year_min',
  'year_max',
  'km_max',
  'cc_min',
  'cc_max',
  'fuel',
  'transmission',
  'body',
  'color',
  'drive',
  'steering',
  'grade',
  'deliver_to',
  'include_sold',
] as const;

type ParamsLike = { get(name: string): string | null };

/** Rounds a converted price to something a person would type. */
export function displayPrice(eur: number, currency: Currency, convert: (eur: number) => number): string {
  const value = convert(eur);
  if (!Number.isFinite(value)) return '';
  const step = currency === 'PKR' ? 1000 : 10;
  return String(Math.max(0, Math.round(value / step) * step));
}

export function valuesFromParams(
  params: ParamsLike,
  convert: (eur: number) => number,
  currency: Currency,
): FilterValues {
  const price = (key: string): string => {
    const raw = Number(params.get(key));
    return params.get(key) && Number.isFinite(raw) && raw >= 0 ? displayPrice(raw, currency, convert) : '';
  };
  const str = (key: string): string => params.get(key) ?? '';
  return {
    q: str('q'),
    make: str('make'),
    model: str('model'),
    min: price('min_eur'),
    max: price('max_eur'),
    year_min: str('year_min'),
    year_max: str('year_max'),
    km_max: str('km_max'),
    cc_min: str('cc_min'),
    cc_max: str('cc_max'),
    fuel: str('fuel'),
    transmission: str('transmission'),
    body: str('body'),
    color: str('color'),
    drive: str('drive'),
    steering: str('steering'),
    grade: str('grade'),
    deliver_to: str('deliver_to'),
    include_sold: params.get('include_sold') === '1',
  };
}

function positive(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Builds URL params from the form values. Keeps sort/view from `base`, drops `page`. */
export function paramsFromValues(
  values: FilterValues,
  base: URLSearchParams,
  toEur: (amount: number) => number,
): URLSearchParams {
  const params = new URLSearchParams(base.toString());
  FILTER_URL_KEYS.forEach((key) => params.delete(key));
  params.delete('page');

  const set = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  };
  const setNumber = (key: string, value: string) => {
    const n = positive(value);
    if (n !== null) params.set(key, String(Math.round(n)));
  };

  set('q', values.q);
  set('make', values.make);
  if (values.make) set('model', values.model);

  const min = positive(values.min);
  const max = positive(values.max);
  if (min !== null) params.set('min_eur', String(Math.floor(toEur(min))));
  if (max !== null) params.set('max_eur', String(Math.ceil(toEur(max))));

  setNumber('year_min', values.year_min);
  setNumber('year_max', values.year_max);
  setNumber('km_max', values.km_max);
  setNumber('cc_min', values.cc_min);
  setNumber('cc_max', values.cc_max);
  set('fuel', values.fuel);
  set('transmission', values.transmission);
  set('body', values.body);
  set('color', values.color);
  set('drive', values.drive);
  set('steering', values.steering);
  set('grade', values.grade);
  set('deliver_to', values.deliver_to);
  if (values.include_sold) params.set('include_sold', '1');
  return params;
}

/** Number of active filters (min/max price, year and engine ranges each count once). */
export function countActiveFilters(params: ParamsLike): number {
  const has = (key: string) => Boolean(params.get(key));
  let count = 0;
  const singles = [
    'q', 'make', 'model', 'km_max', 'fuel', 'transmission', 'body', 'color', 'drive', 'steering', 'grade', 'deliver_to',
  ];
  singles.forEach((key) => {
    if (has(key)) count += 1;
  });
  if (has('min_eur') || has('max_eur')) count += 1;
  if (has('year_min') || has('year_max')) count += 1;
  if (has('cc_min') || has('cc_max')) count += 1;
  if (params.get('include_sold') === '1') count += 1;
  return count;
}
