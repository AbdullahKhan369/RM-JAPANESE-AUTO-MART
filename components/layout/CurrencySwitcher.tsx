'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CURRENCIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[2];

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${active.name}. Change currency`}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="text-muted-foreground">
          {active.symbol}
        </span>
        {active.code}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Select currency"
          className="absolute right-0 z-50 mt-2 w-56 animate-fade-in overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lift"
        >
          {CURRENCIES.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === currency}>
              <button
                type="button"
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  c.code === currency && 'bg-muted',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {c.symbol}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-foreground">{c.code}</span>
                  <span className="block text-xs text-muted-foreground">{c.name}</span>
                </span>
                {c.code === currency ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
