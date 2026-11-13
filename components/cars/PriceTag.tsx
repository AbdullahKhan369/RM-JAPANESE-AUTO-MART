'use client';

import { useCurrency } from '@/components/providers/CurrencyProvider';
import { formatEur } from '@/lib/currency';
import { cn } from '@/lib/utils';

/** Price in the buyer's currency. `short` is the PakWheels style (lacs / crore) used on cards. */
export function PriceTag({
  priceEur,
  style = 'short',
  className,
}: {
  priceEur: number;
  style?: 'full' | 'short';
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(priceEur, { style })}</span>;
}

/** Big price on the detail page with the original EUR price underneath. */
export function DetailPrice({ priceEur, className }: { priceEur: number; className?: string }) {
  const { format, currency } = useCurrency();
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{format(priceEur, { style: 'full' })}</p>
      {currency !== 'EUR' ? <p className="text-sm text-muted-foreground">Listed price {formatEur(priceEur)}</p> : null}
    </div>
  );
}
