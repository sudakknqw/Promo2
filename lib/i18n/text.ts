// Locale-aware text helpers shared by server and client components.
// No dictionaries are imported here, so client bundles only get the one passed in.

import type { Quote } from '../pricing';
import type { FieldError, FieldName } from '../validation';
import type { Locale } from './config';
import type { BarberText, Dictionary, ServiceText } from './types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Replaces {placeholders}. Values are inserted as-is and never re-scanned. */
export function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export function serviceText(dict: Dictionary, id: string): ServiceText {
  return (dict.services.items as Record<string, ServiceText>)[id];
}

export function barberText(dict: Dictionary, id: string): BarberText {
  return (dict.barbers.items as Record<string, BarberText>)[id];
}

/** en: "45 min", "1 h 15 min" · th: "45 นาที", "1 ชม. 15 นาที" */
export function formatDuration(minutes: number, dict: Dictionary): string {
  if (minutes < 60) return interpolate(dict.time.minutes, { m: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? interpolate(dict.time.hoursMinutes, { h, m }) : interpolate(dict.time.hours, { h });
}

/** en: "Wed, 16 Sept 2026" · th: "วันพุธ 16/09/2026" (DD/MM/YYYY, Gregorian year) */
export function formatDate(date: string, locale: Locale, dict: Dictionary): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (locale === 'th') return `${dict.time.daysLong[weekday]} ${match[3]}/${match[2]}/${match[1]}`;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** en: "Wed 16 Sept" · th: "พ. 16/09/2026". No comma, so it fits inside lists. */
export function formatShortDate(date: string, locale: Locale, dict: Dictionary): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (locale === 'th') return `${dict.time.daysShort[weekday]} ${match[3]}/${match[2]}/${match[1]}`;
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** "today 15:30", "tomorrow 10:00", otherwise short date + time. `today` comes from the server clock. */
export function formatSlotLabel(
  slot: { date: string; time: string },
  today: string,
  tomorrow: string,
  locale: Locale,
  dict: Dictionary,
): string {
  if (slot.date === today) return `${dict.time.today} ${slot.time}`;
  if (slot.date === tomorrow) return `${dict.time.tomorrow} ${slot.time}`;
  return `${formatShortDate(slot.date, locale, dict)} ${slot.time}`;
}

export function formatServiceCount(count: number, dict: Dictionary): string {
  const quote = dict.booking.form.quote;
  return interpolate(count === 1 ? quote.countOne : quote.countOther, { count });
}

/** en: "2 services · 75 min · ฿850" · th: "2 บริการ · 75 นาที · ฿850" */
export function formatQuoteSummary(quote: Quote, dict: Dictionary, formatPrice: (thb: number) => string): string {
  return [
    formatServiceCount(quote.services.length, dict),
    interpolate(dict.time.minutes, { m: quote.totalDurationMin }),
    formatPrice(quote.totalPriceThb),
  ].join(' · ');
}

/** Turns a validation code from the server or the shared validator into a sentence. */
export function translateFieldError(field: FieldName, error: FieldError | undefined, dict: Dictionary): string | undefined {
  if (!error) return undefined;
  const group = dict.validation[field] as Record<string, string>;
  const template = group[error.code] ?? dict.booking.errors.unknown;
  return interpolate(template, { hint: dict.booking.form.phoneHint, ...error.params });
}
