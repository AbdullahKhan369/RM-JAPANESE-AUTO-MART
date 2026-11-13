'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { CatalogOptions } from '@/lib/cars-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export function SearchCard({ options, buttonLabel }: { options: CatalogOptions; buttonLabel: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const models = make ? options.modelsByMake[make] ?? [] : [];

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (make) params.set('make', make);
    if (make && model) params.set('model', model);
    const qs = params.toString();
    router.push(qs ? `/cars?${qs}` : '/cars');
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search cars"
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-lift sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end"
    >
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keyword</span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Toyota Vitz, hybrid…" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Make</span>
        <Select
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel('');
          }}
        >
          <option value="">Any make</option>
          {options.makes.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</span>
        <Select value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
          <option value="">{make ? 'Any model' : 'Choose a make first'}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" size="lg" className="w-full sm:col-span-2 lg:col-span-1">
        <Search className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </form>
  );
}
