import type { Currency, Rates } from '@/types/database';

type Style = 'full' | 'short';

function group(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function trimmed(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

export function convertFromEur(amountEur: number, currency: Currency, rates: Rates): number {
  return amountEur * rates[currency];
}

export function convertToEur(amount: number, currency: Currency, rates: Rates): number {
  const rate = rates[currency];
  return rate > 0 ? amount / rate : 0;
}

export function formatMoney(
  amount: number,
  currency: Currency,
  opts?: { style?: Style },
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  if (currency === 'EUR') return `€${group(value)}`;
  if (currency === 'GBP') return `£${group(value)}`;

  // PKR: rounded to the nearest 1,000
  const rounded = Math.round(value / 1000) * 1000;
  if ((opts?.style ?? 'full') === 'full') return `PKR ${group(rounded)}`;

  if (rounded < 100_000) return `PKR ${group(rounded)}`;
  const lacs = Number((rounded / 100_000).toFixed(1));
  if (lacs < 100) return `PKR ${trimmed(rounded / 100_000, 1)} lacs`;
  return `PKR ${trimmed(rounded / 10_000_000, 2)} crore`;
}

export function formatEur(amountEur: number): string {
  return formatMoney(amountEur, 'EUR');
}

export function convertAndFormat(
  amountEur: number,
  currency: Currency,
  rates: Rates,
  opts?: { style?: Style },
): string {
  return formatMoney(convertFromEur(amountEur, currency, rates), currency, opts);
}
