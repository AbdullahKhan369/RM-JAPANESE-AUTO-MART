'use client';

import { CURRENCIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { useCurrency } from '@/components/providers/CurrencyProvider';

const EXAMPLE_EUR = 12000;

/** Shown on the first visit. Cannot be closed without choosing a currency. */
export function CurrencyModal() {
  const { hasChosen, setCurrency, format } = useCurrency();

  return (
    <Modal
      open={!hasChosen}
      onClose={() => undefined}
      dismissible={false}
      size="md"
      title="Select your currency"
      description="Prices are shown in the currency you choose. You can change it any time from the header."
    >
      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Currencies">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCurrency(c.code)}
            className={cn(
              'group flex flex-col items-center gap-1 rounded-2xl border border-border bg-background p-5 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="text-4xl font-bold text-primary">{c.symbol}</span>
            <span className="mt-1 text-lg font-semibold text-foreground">{c.code}</span>
            <span className="text-xs text-muted-foreground">{c.name}</span>
            <span className="mt-2 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              e.g. {format(EXAMPLE_EUR, { style: 'short' })}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
