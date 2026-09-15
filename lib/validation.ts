// Booking validation shared by the form (for instant feedback) and the API
// route (the source of truth). Pure functions only: no secrets, no I/O.

import {
  ANY_BARBER_ID,
  ANY_BARBER_NAME,
  BARBERS,
  MAX_DAYS_AHEAD,
  OPENING_HOURS,
  SERVICES,
  SLOT_STEP_MIN,
  formatMinutes,
} from './data';
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n/config';
import { joinServiceNames, quoteServices, type ServiceLine } from './pricing';

export const LIMITS = {
  nameMin: 2,
  nameMax: 60,
  commentMax: 500,
  // Earliest same-day booking, in minutes from now.
  leadTimeMin: 30,
} as const;

/** Hidden anti-spam field. Real users leave it empty. */
export const HONEYPOT_FIELD = 'website';

export const FIELD_ORDER = ['name', 'phone', 'services', 'barber', 'date', 'time', 'comment'] as const;
export type FieldName = (typeof FIELD_ORDER)[number];
export type BookingFields = {
  name: string;
  phone: string;
  services: string[]; // service ids only: prices are never taken from the client
  barber: string;
  date: string;
  time: string;
  comment: string;
};
/**
 * A validation problem as a code (see "validation" in the dictionaries) plus values for
 * the message. The same codes come from the server, so every language shows its own text.
 */
export type FieldError = { code: string; params?: Record<string, string | number> };
export type FieldErrors = Partial<Record<FieldName, FieldError>>;

export type BookingData = {
  name: string;
  phone: string;
  /** Selected services, priced from the server-side price list. */
  services: ServiceLine[];
  /** "Signature Haircut + Beard Trim & Shape" */
  serviceSummary: string;
  totalPriceThb: number;
  totalDurationMin: number;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comment: string | null;
  /** Site version the booking came from. */
  locale: Locale;
};

export type ValidationResult =
  | { ok: true; data: BookingData }
  | { ok: false; errors: FieldErrors };

// ---------------------------------------------------------------------------
// Bangkok time. Thailand has no daylight saving, so a fixed offset is exact.
// ---------------------------------------------------------------------------
export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function bangkokNow(now: Date = new Date()): { date: string; minutes: number } {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

export function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  if (!d) return date;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getBookingWindow(now: Date = new Date()): { min: string; max: string } {
  const today = bangkokNow(now).date;
  return { min: today, max: addDays(today, MAX_DAYS_AHEAD) };
}

export function formatDateLong(date: string): string {
  const d = parseDate(date);
  if (!d) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/**
 * Start times that fit fully inside opening hours for the given day and duration.
 * Today, times earlier than now + leadTimeMin (Bangkok time) are skipped.
 */
export function getTimeSlots(
  date: string,
  durationMin: number,
  now: Date = new Date(),
  leadTimeMin: number = LIMITS.leadTimeMin,
): string[] {
  const d = parseDate(date);
  if (!d) return [];
  const { open, close } = OPENING_HOURS[d.getUTCDay()];
  const bkk = bangkokNow(now);
  const earliest = date === bkk.date ? bkk.minutes + leadTimeMin : 0;

  const slots: string[] = [];
  for (let t = open; t + durationMin <= close; t += SLOT_STEP_MIN) {
    if (t >= earliest) slots.push(formatMinutes(t));
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Phone mask
//   Thai local:     0XX XXX XXXX (mobile) or 02 XXX XXXX (Bangkok landline)
//   International:  +<country code><number>, 8–15 digits total (E.164)
// ---------------------------------------------------------------------------
/** Formats raw input as the user types. Used by the form's input mask. */
export function maskPhone(input: string): string {
  const trimmed = input.trimStart();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits.slice(0, 15)}`;
  }

  const local = digits.slice(0, 10);
  if (local.startsWith('02')) {
    // 02 XXX XXXX
    return [local.slice(0, 2), local.slice(2, 5), local.slice(5, 9)].filter(Boolean).join(' ');
  }
  // 0XX XXX XXXX
  return [local.slice(0, 3), local.slice(3, 6), local.slice(6, 10)].filter(Boolean).join(' ');
}

/** Returns a normalized phone string, or null if it doesn't match the mask. */
export function normalizePhone(input: string): string | null {
  const value = input.trim();
  if (value.length > 20 || !/^\+?[\d\s\-().]+$/.test(value)) return null;

  const digits = value.replace(/\D/g, '');

  if (value.startsWith('+')) {
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (/^02\d{7}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  if (/^0[1-9]\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]*$/u;
// Control characters except tab and newline.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function validateBooking(raw: unknown, now: Date = new Date()): ValidationResult {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  // Name
  const name = asString(input.name).replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  // Letters from any script count (\p{L}), including Thai vowel and tone marks (\p{M}).
  if (!name) {
    errors.name = { code: 'required' };
  } else if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    errors.name = { code: 'length', params: { min: LIMITS.nameMin, max: LIMITS.nameMax } };
  } else if (!NAME_PATTERN.test(name)) {
    errors.name = { code: 'pattern' };
  }

  // Phone
  const phoneRaw = asString(input.phone);
  const phone = normalizePhone(phoneRaw);
  if (!phoneRaw.trim()) {
    errors.phone = { code: 'required' };
  } else if (!phone) {
    errors.phone = { code: 'invalid' };
  }

  // Services: ids only. Prices and durations always come from the price list,
  // so anything else in the request (prices, totals) is ignored.
  // A single "service" string is still accepted from pages cached before multi-service booking.
  const rawServices: unknown[] = Array.isArray(input.services)
    ? input.services
    : typeof input.service === 'string'
      ? [input.service]
      : [];
  const serviceIds = rawServices.filter((id): id is string => typeof id === 'string');
  const quote = quoteServices(serviceIds);
  if (rawServices.length === 0) {
    errors.services = { code: 'required' };
  } else if (
    rawServices.length > SERVICES.length ||
    serviceIds.length !== rawServices.length ||
    quote.services.length !== new Set(serviceIds).size
  ) {
    errors.services = { code: 'invalid' };
  }

  // Barber
  const barberId = asString(input.barber);
  const barber = BARBERS.find((b) => b.id === barberId);
  if (!barber && barberId !== ANY_BARBER_ID) errors.barber = { code: 'required' };

  // Date
  const date = asString(input.date).trim();
  const window = getBookingWindow(now);
  const parsedDate = parseDate(date);
  if (!date) {
    errors.date = { code: 'required' };
  } else if (!parsedDate) {
    errors.date = { code: 'invalid' };
  } else if (date < window.min) {
    errors.date = { code: 'past' };
  } else if (date > window.max) {
    errors.date = { code: 'tooFar', params: { days: MAX_DAYS_AHEAD } };
  }

  // Time
  const time = asString(input.time).trim();
  const minutes = parseTime(time);
  if (!time) {
    errors.time = { code: 'required' };
  } else if (minutes === null) {
    errors.time = { code: 'invalid' };
  } else if (parsedDate && !errors.date) {
    const { open, close } = OPENING_HOURS[parsedDate.getUTCDay()];
    // The whole visit (all services together) must fit before closing.
    const duration = errors.services ? SLOT_STEP_MIN : quote.totalDurationMin;
    const bkk = bangkokNow(now);

    if (minutes < open || minutes + duration > close) {
      const code = errors.services ? 'closed' : quote.services.length === 1 ? 'closedOneService' : 'closedServices';
      errors.time = { code, params: { open: formatMinutes(open), close: formatMinutes(close) } };
    } else if (minutes % SLOT_STEP_MIN !== 0) {
      errors.time = { code: 'notInList' };
    } else if (date === bkk.date && minutes < bkk.minutes + LIMITS.leadTimeMin) {
      errors.time = { code: 'past' };
    }
  }

  // Comment (optional)
  const commentValue = asString(input.comment).replace(CONTROL_CHARS, '').trim();
  if (commentValue.length > LIMITS.commentMax) {
    errors.comment = { code: 'tooLong', params: { max: LIMITS.commentMax } };
  }

  if (Object.keys(errors).length > 0 || quote.services.length === 0 || !phone) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      phone,
      services: quote.services,
      serviceSummary: joinServiceNames(quote.services),
      totalPriceThb: quote.totalPriceThb,
      totalDurationMin: quote.totalDurationMin,
      barberId: barber ? barber.id : ANY_BARBER_ID,
      barberName: barber ? barber.name : ANY_BARBER_NAME,
      date,
      time,
      comment: commentValue || null,
      locale: isLocale(input.locale) ? input.locale : DEFAULT_LOCALE,
    },
  };
}
