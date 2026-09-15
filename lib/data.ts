// Business data: ids, prices, durations, hours and contacts. Safe on client and server.
//
// Visitor-facing text lives in /dictionaries. The English names below are read from
// dictionaries/en.json: they are the canonical names stored in the database and sent
// to the owner, whose Telegram notifications are always in English.

import en from '../dictionaries/en.json';

/**
 * Messenger contacts. Fictional placeholders: replace with the real ones.
 * - whatsappNumber: digits only, country code first, no "+" or spaces (wa.me format).
 * - lineId: LINE Official Account ID, including "@".
 */
export const MESSENGERS = {
  whatsappNumber: '6620000000',
  lineId: '@sharpbarberbkk',
} as const;

export const SHOP = {
  name: en.shop.name,
  // Fictional contact details: replace before using for a real business. Not translated.
  phoneDisplay: '+66 2 000 0000',
  phoneHref: 'tel:+6620000000',
  // "Add friend" link for the LINE Official Account. "@" must be encoded as %40.
  lineUrl: `https://line.me/R/ti/p/${encodeURIComponent(MESSENGERS.lineId)}`,
  mapQuery: 'Sukhumvit Soi 11, Bangkok',
  timeZone: 'Asia/Bangkok',
} as const;

export type Service = {
  id: string;
  /** Canonical English name (database, Telegram). Use the dictionary for display. */
  name: string;
  priceThb: number;
  durationMin: number;
  image: string;
};

const englishServiceNames = en.services.items as Record<string, { name: string }>;

export const SERVICES: Service[] = [
  { id: 'haircut', priceThb: 550, durationMin: 45, image: '/images/haircut.jpg' },
  { id: 'beard', priceThb: 350, durationMin: 30, image: '/images/beard trim.jpg' },
  { id: 'shave', priceThb: 450, durationMin: 40, image: '/images/straight razor shave1.jpg' },
  { id: 'cut-beard', priceThb: 800, durationMin: 75, image: '/images/straight razor shave2.jpg' },
  { id: 'royal', priceThb: 950, durationMin: 90, image: '/images/straight razor shave3.jpg' },
  { id: 'kids', priceThb: 350, durationMin: 30, image: '/images/kids haircut.jpg' },
].map((service) => ({ ...service, name: englishServiceNames[service.id].name }));

export type Barber = {
  id: string;
  /** Canonical English name (database, Telegram). Use the dictionary for display. */
  name: string;
  image: string;
};

const englishBarberNames = en.barbers.items as Record<string, { name: string }>;

export const BARBERS: Barber[] = [
  { id: 'krit', image: '/images/barber portrait2.jpg' },
  { id: 'mateo', image: '/images/barber portrait1.jpg' },
  { id: 'ton', image: '/images/barber portrait3.jpg' },
].map((barber) => ({ ...barber, name: englishBarberNames[barber.id].name }));

export const ANY_BARBER_ID = 'any';
export const ANY_BARBER_NAME = en.booking.form.anyBarber;

// Opening hours per weekday (index 0 = Sunday), minutes from midnight. Day names come from the dictionary.
export type DayHours = { open: number; close: number };

export const OPENING_HOURS: DayHours[] = [
  { open: 11 * 60, close: 18 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 20 * 60 },
  { open: 10 * 60, close: 22 * 60 },
  { open: 10 * 60, close: 22 * 60 },
];

/** Weekday indexes starting from Monday, for display. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Consecutive days with equal hours, e.g. { from: 1, to: 4, hours: "10:00–20:00" } for Mon–Thu. */
export function getHoursSummary(): { from: number; to: number; hours: string }[] {
  const groups: { from: number; to: number; hours: string }[] = [];
  for (const day of WEEK_ORDER) {
    const { open, close } = OPENING_HOURS[day];
    const hours = `${formatMinutes(open)}–${formatMinutes(close)}`;
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) last.to = day;
    else groups.push({ from: day, to: day, hours });
  }
  return groups;
}

export const SLOT_STEP_MIN = 30;
export const MAX_DAYS_AHEAD = 90;

// Platform names are proper nouns and stay the same in every language.
// Homepages only: this is a fictional business with no real accounts.
export const SOCIALS = [
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/' },
  { id: 'line', label: 'LINE', href: SHOP.lineUrl },
] as const;

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "฿1,500" in every locale. */
export function formatPrice(thb: number): string {
  return `฿${thb.toLocaleString('en-US')}`;
}

/** English duration for server-side texts (Telegram). The UI uses lib/i18n/text.ts. */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
