'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type I18n = { locale: Locale; dict: Dictionary };

const I18nContext = createContext<I18n | null>(null);

/** Gives client components the current locale and its dictionary (only that one is sent to the browser). */
export function I18nProvider({ locale, dict, children }: I18n & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
