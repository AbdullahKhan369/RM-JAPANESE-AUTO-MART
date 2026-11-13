'use client';

import { useCurrency } from '@/components/providers/CurrencyProvider';
import { convertFromEur, formatMoney } from '@/lib/currency';

interface PricePreviewProps {
  /** price in EUR as typed by the user */
  value: string;
}

export function PricePreview({ value }: PricePreviewProps) {
  const { rates } = useCurrency();
  const eur = Number(value);
  if (!value.trim() || !Number.isFinite(eur) || eur <= 0) {
    return <p className="text-xs text-muted-foreground">Prices are entered in EUR. We show the GBP and PKR value here.</p>;
  }
  const gbp = formatMoney(convertFromEur(eur, 'GBP', rates), 'GBP');
  const pkr = formatMoney(convertFromEur(eur, 'PKR', rates), 'PKR', { style: 'full' });
  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      About <span className="font-medium text-foreground">{gbp}</span> /{' '}
      <span className="font-medium text-foreground">{pkr}</span> at today&apos;s rates. Buyers see the price in
      the currency they choose.
    </p>
  );
}
