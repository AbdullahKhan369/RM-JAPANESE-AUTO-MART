'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, X } from 'lucide-react';
import {
  BODY_TYPES,
  COLORS,
  DELIVER_TO_OPTIONS,
  DRIVE_TYPES,
  FUEL_TYPES,
  SORT_OPTIONS,
  STEERING_OPTIONS,
  TRANSMISSIONS,
} from '@/lib/constants';
import { optionLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CatalogOptions } from '@/lib/cars-query';
import { Select } from '@/components/ui/Select';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import { MobileFilters } from '@/components/cars/CarFilters';

export function ResultsToolbar({
  from,
  to,
  total,
  options,
}: {
  from: number;
  to: number;
  total: number;
  options: CatalogOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get('sort') ?? 'newest';
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid';

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {total === 0 ? (
            'No cars found'
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {from} to {to}
              </span>{' '}
              of <span className="font-semibold text-foreground">{total.toLocaleString('en-US')}</span> cars
            </>
          )}
        </p>
        <div className="lg:hidden">
          <MobileFilters options={options} />
        </div>
        <Select
          aria-label="Sort by"
          value={SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'newest'}
          onChange={(e) => update('sort', e.target.value === 'newest' ? null : e.target.value)}
          className="h-11 w-auto min-w-44"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <div className="inline-flex rounded-xl border border-border bg-card p-1" role="group" aria-label="Layout">
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update('view', mode === 'grid' ? null : mode)}
              aria-pressed={view === mode}
              aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                view === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {mode === 'grid' ? <LayoutGrid className="h-4 w-4" aria-hidden="true" /> : <List className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
      <ActiveFilters options={options} />
    </div>
  );
}

function ActiveFilters({ options }: { options: CatalogOptions }) {
  const searchParams = useSearchParams();
  const { format } = useCurrency();
  const chips: { key: string; label: string; remove: string[] }[] = [];
  const get = (k: string) => searchParams.get(k) ?? '';

  if (get('q')) chips.push({ key: 'q', label: `“${get('q')}”`, remove: ['q'] });
  const makeSlug = get('make');
  if (makeSlug) {
    const make = options.makes.find((m) => m.slug === makeSlug);
    if (make) chips.push({ key: 'make', label: make.name, remove: ['make', 'model'] });
    const model = options.modelsByMake[makeSlug]?.find((m) => m.slug === get('model'));
    if (make && model) chips.push({ key: 'model', label: model.name, remove: ['model'] });
  }
  const minEur = Number(get('min_eur'));
  const maxEur = Number(get('max_eur'));
  if (get('min_eur') || get('max_eur')) {
    const lo = get('min_eur') && Number.isFinite(minEur) ? format(minEur, { style: 'short' }) : '';
    const hi = get('max_eur') && Number.isFinite(maxEur) ? format(maxEur, { style: 'short' }) : '';
    chips.push({ key: 'price', label: lo && hi ? `${lo} – ${hi}` : lo ? `From ${lo}` : `Up to ${hi}`, remove: ['min_eur', 'max_eur'] });
  }
  if (get('year_min') || get('year_max')) {
    const a = get('year_min');
    const b = get('year_max');
    chips.push({ key: 'year', label: a && b ? `Year ${a}–${b}` : a ? `Year from ${a}` : `Year up to ${b}`, remove: ['year_min', 'year_max'] });
  }
  if (get('km_max') && Number.isFinite(Number(get('km_max')))) {
    chips.push({ key: 'km', label: `Up to ${Number(get('km_max')).toLocaleString('en-US')} km`, remove: ['km_max'] });
  }
  if (get('cc_min') || get('cc_max')) {
    const a = get('cc_min');
    const b = get('cc_max');
    chips.push({ key: 'cc', label: a && b ? `${a}–${b} cc` : a ? `From ${a} cc` : `Up to ${b} cc`, remove: ['cc_min', 'cc_max'] });
  }
  const simple: [string, { value: string; label: string }[]][] = [
    ['fuel', FUEL_TYPES],
    ['transmission', TRANSMISSIONS],
    ['body', BODY_TYPES],
    ['color', COLORS],
    ['drive', DRIVE_TYPES],
    ['steering', STEERING_OPTIONS],
  ];
  simple.forEach(([key, opts]) => {
    if (get(key)) chips.push({ key, label: optionLabel(opts, get(key)), remove: [key] });
  });
  if (get('grade')) chips.push({ key: 'grade', label: `Grade ${get('grade')}`, remove: ['grade'] });
  if (get('deliver_to')) chips.push({ key: 'deliver_to', label: `Deliver to ${optionLabel(DELIVER_TO_OPTIONS, get('deliver_to'))}`, remove: ['deliver_to'] });
  if (get('include_sold') === '1') chips.push({ key: 'sold', label: 'Including sold', remove: ['include_sold'] });

  if (chips.length === 0) return null;

  const hrefWithout = (keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    params.delete('page');
    const qs = params.toString();
    return qs ? `/cars?${qs}` : '/cars';
  };
  const clearAll = new URLSearchParams();
  if (get('sort')) clearAll.set('sort', get('sort'));
  if (get('view')) clearAll.set('view', get('view'));
  const clearQs = clearAll.toString();

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={hrefWithout(chip.remove)}
            scroll={false}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {chip.label}
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={clearQs ? `/cars?${clearQs}` : '/cars'}
          scroll={false}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear all
        </Link>
      </li>
    </ul>
  );
}
