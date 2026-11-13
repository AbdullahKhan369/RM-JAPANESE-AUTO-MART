'use client';

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import {
  AUCTION_GRADES,
  BODY_TYPES,
  COLORS,
  DELIVER_TO_OPTIONS,
  DRIVE_TYPES,
  FUEL_TYPES,
  STEERING_OPTIONS,
  TRANSMISSIONS,
} from '@/lib/constants';
import {
  EMPTY_FILTERS,
  countActiveFilters,
  paramsFromValues,
  valuesFromParams,
  type FilterValues,
} from '@/lib/filter-url';
import type { CatalogOptions } from '@/lib/cars-query';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCurrency } from '@/components/providers/CurrencyProvider';

type Change = (patch: Partial<FilterValues>, delay: number) => void;

function Section({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-b border-border py-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg py-1 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-2.5 pt-3">{children}</div>
    </details>
  );
}

function Range({
  idBase,
  label,
  a,
  b,
  onA,
  onB,
  placeholderA,
  placeholderB,
}: {
  idBase: string;
  label: string;
  a: string;
  b: string;
  onA: (v: string) => void;
  onB: (v: string) => void;
  placeholderA: string;
  placeholderB: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input id={`${idBase}-a`} aria-label={`${label} from`} type="number" min={0} inputMode="numeric" placeholder={placeholderA} value={a} onChange={(e) => onA(e.target.value)} className="h-10" />
      <Input id={`${idBase}-b`} aria-label={`${label} to`} type="number" min={0} inputMode="numeric" placeholder={placeholderB} value={b} onChange={(e) => onB(e.target.value)} className="h-10" />
    </div>
  );
}

function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-10">
      <option value="">Any {label.toLowerCase()}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function FilterForm({
  values,
  onChange,
  options,
  idBase,
  currencyCode,
}: {
  values: FilterValues;
  onChange: Change;
  options: CatalogOptions;
  idBase: string;
  currencyCode: string;
}) {
  const models = values.make ? options.modelsByMake[values.make] ?? [] : [];
  const open = (...v: (string | boolean)[]) => v.some(Boolean);

  return (
    <div>
      <Section title="Keyword" open>
        <Input id={`${idBase}-q`} aria-label="Keyword" placeholder="e.g. Toyota Vitz" value={values.q} onChange={(e) => onChange({ q: e.target.value }, 450)} className="h-10" />
      </Section>
      <Section title="Make & model" open>
        <Select id={`${idBase}-make`} aria-label="Make" value={values.make} onChange={(e) => onChange({ make: e.target.value, model: '' }, 0)} className="h-10">
          <option value="">Any make</option>
          {options.makes.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select id={`${idBase}-model`} aria-label="Model" value={values.model} disabled={!values.make} onChange={(e) => onChange({ model: e.target.value }, 0)} className="h-10">
          <option value="">{values.make ? 'Any model' : 'Choose a make first'}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
      </Section>
      <Section title={`Price (${currencyCode})`} open>
        <Range idBase={`${idBase}-price`} label="Price" a={values.min} b={values.max} onA={(v) => onChange({ min: v }, 600)} onB={(v) => onChange({ max: v }, 600)} placeholderA="Min" placeholderB="Max" />
      </Section>
      <Section title="Year" open>
        <Range idBase={`${idBase}-year`} label="Year" a={values.year_min} b={values.year_max} onA={(v) => onChange({ year_min: v }, 600)} onB={(v) => onChange({ year_max: v }, 600)} placeholderA="From" placeholderB="To" />
      </Section>
      <Section title="Mileage (max km)" open={open(values.km_max)}>
        <Input id={`${idBase}-km`} aria-label="Maximum mileage" type="number" min={0} inputMode="numeric" placeholder="e.g. 100000" value={values.km_max} onChange={(e) => onChange({ km_max: e.target.value }, 600)} className="h-10" />
      </Section>
      <Section title="Engine capacity (cc)" open={open(values.cc_min, values.cc_max)}>
        <Range idBase={`${idBase}-cc`} label="Engine capacity" a={values.cc_min} b={values.cc_max} onA={(v) => onChange({ cc_min: v }, 600)} onB={(v) => onChange({ cc_max: v }, 600)} placeholderA="Min cc" placeholderB="Max cc" />
      </Section>
      <Section title="Fuel" open={open(values.fuel)}>
        <OptionSelect id={`${idBase}-fuel`} label="Fuel" value={values.fuel} options={FUEL_TYPES} onChange={(v) => onChange({ fuel: v }, 0)} />
      </Section>
      <Section title="Transmission" open={open(values.transmission)}>
        <OptionSelect id={`${idBase}-trans`} label="Transmission" value={values.transmission} options={TRANSMISSIONS} onChange={(v) => onChange({ transmission: v }, 0)} />
      </Section>
      <Section title="Body type" open={open(values.body)}>
        <OptionSelect id={`${idBase}-body`} label="Body type" value={values.body} options={BODY_TYPES} onChange={(v) => onChange({ body: v }, 0)} />
      </Section>
      <Section title="Colour" open={open(values.color)}>
        <OptionSelect id={`${idBase}-color`} label="Colour" value={values.color} options={COLORS} onChange={(v) => onChange({ color: v }, 0)} />
      </Section>
      <Section title="Drive" open={open(values.drive)}>
        <OptionSelect id={`${idBase}-drive`} label="Drive" value={values.drive} options={DRIVE_TYPES} onChange={(v) => onChange({ drive: v }, 0)} />
      </Section>
      <Section title="Steering" open={open(values.steering)}>
        <OptionSelect id={`${idBase}-steering`} label="Steering" value={values.steering} options={STEERING_OPTIONS} onChange={(v) => onChange({ steering: v }, 0)} />
      </Section>
      <Section title="Auction grade" open={open(values.grade)}>
        <OptionSelect id={`${idBase}-grade`} label="Grade" value={values.grade} options={AUCTION_GRADES.map((g) => ({ value: g, label: `Grade ${g}` }))} onChange={(v) => onChange({ grade: v }, 0)} />
      </Section>
      <Section title="Deliver to" open={open(values.deliver_to)}>
        <OptionSelect id={`${idBase}-deliver`} label="Country" value={values.deliver_to} options={DELIVER_TO_OPTIONS} onChange={(v) => onChange({ deliver_to: v }, 0)} />
      </Section>
      <div className="pt-3">
        <Checkbox id={`${idBase}-sold`} checked={values.include_sold} onChange={(c) => onChange({ include_sold: c }, 0)} label="Include sold cars" />
      </div>
    </div>
  );
}

function scrollToResults() {
  const el = document.getElementById('results');
  if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Desktop sidebar: every change updates the URL (text and number fields with a small debounce). */
export function FilterSidebar({ options }: { options: CatalogOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency, convert, toEur } = useCurrency();
  const idBase = useId();
  const urlString = searchParams.toString();

  const [values, setValues] = useState<FilterValues>(() => valuesFromParams(searchParams, convert, currency));
  const valuesRef = useRef(values);
  const lastPushed = useRef(urlString);
  const paramsRef = useRef(searchParams);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();
  const currencyRef = useRef(currency);

  paramsRef.current = searchParams;

  // URL changed from outside (chips, "Clear all", back button): follow it.
  useEffect(() => {
    if (urlString !== lastPushed.current) {
      lastPushed.current = urlString;
      const next = valuesFromParams(paramsRef.current, convert, currency);
      valuesRef.current = next;
      setValues(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlString]);

  // Currency changed: show the price fields in the new currency.
  useEffect(() => {
    if (currencyRef.current === currency) return;
    currencyRef.current = currency;
    const fresh = valuesFromParams(paramsRef.current, convert, currency);
    const next = { ...valuesRef.current, min: fresh.min, max: fresh.max };
    valuesRef.current = next;
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  useEffect(() => {
    const el = document.getElementById('results');
    if (el) el.dataset.pending = isPending ? 'true' : 'false';
  }, [isPending]);

  function apply(next: FilterValues) {
    const params = paramsFromValues(next, new URLSearchParams(paramsRef.current.toString()), toEur);
    const qs = params.toString();
    lastPushed.current = qs;
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
    scrollToResults();
  }

  const onChange: Change = (patch, delay) => {
    const next = { ...valuesRef.current, ...patch };
    valuesRef.current = next;
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    if (delay === 0) apply(next);
    else timer.current = setTimeout(() => apply(valuesRef.current), delay);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const active = countActiveFilters(searchParams);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
        </h2>
        {active > 0 ? (
          <button
            type="button"
            onClick={() => {
              valuesRef.current = EMPTY_FILTERS;
              setValues(EMPTY_FILTERS);
              apply(EMPTY_FILTERS);
            }}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear all
          </button>
        ) : null}
      </div>
      <FilterForm values={values} onChange={onChange} options={options} idBase={idBase} currencyCode={currency} />
    </div>
  );
}

/** Mobile: a "Filters" button with an active-count badge that opens a bottom drawer with an Apply button. */
export function MobileFilters({ options }: { options: CatalogOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency, convert, toEur } = useCurrency();
  const idBase = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(EMPTY_FILTERS);
  const active = countActiveFilters(searchParams);

  function openDrawer() {
    setDraft(valuesFromParams(searchParams, convert, currency));
    setOpen(true);
  }

  function push(values: FilterValues) {
    const params = paramsFromValues(values, new URLSearchParams(searchParams.toString()), toEur);
    const qs = params.toString();
    setOpen(false);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <Button variant="outline" size="md" onClick={openDrawer} className="relative" aria-label={`Filters${active ? `, ${active} active` : ''}`}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
        {active > 0 ? (
          <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            {active}
          </span>
        ) : null}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(EMPTY_FILTERS)}>
              Reset
            </Button>
            <Button onClick={() => push(draft)}>Apply</Button>
          </>
        }
      >
        <FilterForm
          values={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          options={options}
          idBase={idBase}
          currencyCode={currency}
        />
      </Modal>
    </>
  );
}
