export const LOCALES = ['en', 'th'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Locale tags for Intl (month names). Thai forces the Gregorian calendar to match DD/MM/YYYY dates elsewhere. */
export const INTL_LOCALES: Record<Locale, string> = { en: 'en-GB', th: 'th-TH-u-ca-gregory' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
