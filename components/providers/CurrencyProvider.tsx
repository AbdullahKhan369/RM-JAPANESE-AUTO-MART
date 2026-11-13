'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CURRENCY_COOKIE } from '@/lib/constants';
import { convertFromEur, convertToEur, formatMoney } from '@/lib/currency';
import type { Currency, Rates } from '@/types/database';

interface CurrencyContextValue {
  currency: Currency;
  hasChosen: boolean;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  convert: (eur: number) => number;
  toEur: (amount: number) => number;
  format: (eur: number, opts?: { style?: 'full' | 'short' }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  rates,
  children,
}: {
  initialCurrency: Currency | null;
  rates: Rates;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency ?? 'EUR');
  const [hasChosen, setHasChosen] = useState<boolean>(initialCurrency !== null);

  const setCurrency = useCallback((next: Currency) => {
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrencyState(next);
    setHasChosen(true);
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      hasChosen,
      setCurrency,
      rates,
      convert: (eur: number) => convertFromEur(eur, currency, rates),
      toEur: (amount: number) => convertToEur(amount, currency, rates),
      format: (eur: number, opts?: { style?: 'full' | 'short' }) =>
        formatMoney(convertFromEur(eur, currency, rates), currency, opts),
    }),
    [currency, hasChosen, rates, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used inside <CurrencyProvider>.');
  return context;
}
