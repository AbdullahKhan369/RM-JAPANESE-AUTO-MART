'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CAR_STATUSES, SORT_OPTIONS } from '@/lib/constants';

export interface CarFilterValues {
  q: string;
  lister: string;
  status: string;
  make: string;
  featured: boolean;
  sort: string;
}

export function CarFilters({
  listers,
  makes,
  current,
}: {
  listers: { id: string; full_name: string; email: string }[];
  makes: { id: string; name: string }[];
  current: CarFilterValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(current.q);

  function go(next: Partial<CarFilterValues>) {
    const merged = { ...current, q, ...next };
    const sp = new URLSearchParams();
    if (merged.q.trim()) sp.set('q', merged.q.trim());
    if (merged.lister) sp.set('lister', merged.lister);
    if (merged.status) sp.set('status', merged.status);
    if (merged.make) sp.set('make', merged.make);
    if (merged.featured) sp.set('featured', '1');
    if (merged.sort && merged.sort !== 'newest') sp.set('sort', merged.sort);
    const s = sp.toString();
    startTransition(() => router.push(s ? `/admin/cars?${s}` : '/admin/cars'));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({});
  }

  const hasFilters = Boolean(current.q || current.lister || current.status || current.make || current.featured || (current.sort && current.sort !== 'newest'));

  return (
    <form onSubmit={onSubmit} role="search" className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4" aria-busy={pending}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title" aria-label="Search cars by title" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary" loading={pending}>Search</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={current.lister} onChange={(e) => go({ lister: e.target.value })} aria-label="Filter by lister">
          <option value="">All listers</option>
          {listers.map((l) => (
            <option key={l.id} value={l.id}>{l.full_name || l.email}</option>
          ))}
        </Select>
        <Select value={current.status} onChange={(e) => go({ status: e.target.value })} aria-label="Filter by status">
          <option value="">All statuses</option>
          {CAR_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <Select value={current.make} onChange={(e) => go({ make: e.target.value })} aria-label="Filter by make">
          <option value="">All makes</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
        <Select value={current.sort} onChange={(e) => go({ sort: e.target.value })} aria-label="Sort cars">
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox checked={current.featured} onChange={(checked) => go({ featured: checked })} label="Featured only" />
        {hasFilters && (
          <Link href="/admin/cars" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Reset filters</Link>
        )}
      </div>
    </form>
  );
}
