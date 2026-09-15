// Static site content and business rules. Safe to import on client and server.

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
  name: 'Sharp Barber Bangkok',
  slogan: 'Clean fades. Hot towels. No rush.',
  // Fictional contact details: replace before using for a real business.
  phoneDisplay: '+66 2 000 0000',
  phoneHref: 'tel:+6620000000',
  // "Add friend" link for the LINE Official Account. "@" must be encoded as %40.
  lineUrl: `https://line.me/R/ti/p/${encodeURIComponent(MESSENGERS.lineId)}`,
  address: {
    line1: '88 Sukhumvit Soi 11',
    line2: 'Khlong Toei Nuea, Watthana',
    city: 'Bangkok 10110, Thailand',
  },
  mapQuery: 'Sukhumvit Soi 11, Bangkok',
  timeZone: 'Asia/Bangkok',
} as const;

export type Service = {
  id: string;
  name: string;
  description: string;
  priceThb: number;
  durationMin: number;
  image: string;
  alt: string;
};

export const SERVICES: Service[] = [
  {
    id: 'haircut',
    name: 'Signature Haircut',
    description: 'Consultation, precision cut, wash and styling.',
    priceThb: 550,
    durationMin: 45,
    image: '/images/haircut.jpg',
    alt: 'Barber cutting a client’s hair with scissors and a comb above a skin fade',
  },
  {
    id: 'beard',
    name: 'Beard Trim & Shape',
    description: 'Clipper shaping, sharp line-up and beard oil.',
    priceThb: 350,
    durationMin: 30,
    image: '/images/beard trim.jpg',
    alt: 'Barber shaping a client’s full beard with a red cordless trimmer',
  },
  {
    id: 'shave',
    name: 'Hot Towel Razor Shave',
    description: 'Hot towels, rich lather and a straight razor finish.',
    priceThb: 450,
    durationMin: 40,
    image: '/images/straight razor shave1.jpg',
    alt: 'Client with a moustache reclining while shaving cream is applied before a razor shave',
  },
  {
    id: 'cut-beard',
    name: 'Cut & Beard Combo',
    description: 'Signature haircut plus beard trim, with a razor-clean neckline.',
    priceThb: 800,
    durationMin: 75,
    image: '/images/straight razor shave2.jpg',
    alt: 'Barber cleaning up a client’s neckline with a straight razor',
  },
  {
    id: 'royal',
    name: 'The Royal Treatment',
    description: 'Haircut and full hot towel shave. Our most relaxing hour and a half.',
    priceThb: 950,
    durationMin: 90,
    image: '/images/straight razor shave3.jpg',
    alt: 'Client under a warm towel receiving a straight razor shave',
  },
  {
    id: 'kids',
    name: 'Kids Haircut',
    description: 'For ages 12 and under. Patient barbers, no tears.',
    priceThb: 350,
    durationMin: 30,
    image: '/images/kids haircut.jpg',
    alt: 'Barber trimming a young boy’s hair with clippers and a comb',
  },
];

export type Barber = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  image: string;
  alt: string;
};

export const BARBERS: Barber[] = [
  {
    id: 'krit',
    name: 'Krit “Kay” Wongsa',
    role: 'Head Barber',
    specialty: 'Textured crops, mullets and modern scissor work',
    image: '/images/barber portrait2.jpg',
    alt: 'Portrait of barber Krit in a black polo and denim apron, standing next to a barber chair',
  },
  {
    id: 'mateo',
    name: 'Mateo Rivera',
    role: 'Senior Barber',
    specialty: 'Classic pompadours, beard sculpting and hot towel shaves',
    image: '/images/barber portrait1.jpg',
    alt: 'Portrait of barber Mateo with a goatee and tattooed forearms, seated in a leather barber chair',
  },
  {
    id: 'ton',
    name: 'Ton Saelim',
    role: 'Fade Specialist',
    specialty: 'Skin fades, tapers and sharp line-ups',
    image: '/images/barber portrait3.jpg',
    alt: 'Barber Ton in a bucket hat and glasses fading a client’s hair with clippers',
  },
];

export const ANY_BARBER_ID = 'any';
export const ANY_BARBER_NAME = 'Any available barber';

// Opening hours per weekday (0 = Sunday). Minutes from midnight.
export type DayHours = { day: string; open: number; close: number };

export const OPENING_HOURS: DayHours[] = [
  { day: 'Sunday', open: 11 * 60, close: 18 * 60 },
  { day: 'Monday', open: 10 * 60, close: 20 * 60 },
  { day: 'Tuesday', open: 10 * 60, close: 20 * 60 },
  { day: 'Wednesday', open: 10 * 60, close: 20 * 60 },
  { day: 'Thursday', open: 10 * 60, close: 20 * 60 },
  { day: 'Friday', open: 10 * 60, close: 22 * 60 },
  { day: 'Saturday', open: 10 * 60, close: 22 * 60 },
];

/** Weekday indexes starting from Monday, for display. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Groups consecutive days with equal hours, e.g. "Mon–Thu 10:00–20:00". */
export function getHoursSummary(): { days: string; hours: string }[] {
  const groups: { start: string; end: string; hours: string }[] = [];
  for (const i of WEEK_ORDER) {
    const { day, open, close } = OPENING_HOURS[i];
    const hours = `${formatMinutes(open)}–${formatMinutes(close)}`;
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) last.end = day;
    else groups.push({ start: day, end: day, hours });
  }
  return groups.map((g) => ({
    days: g.start === g.end ? g.start.slice(0, 3) : `${g.start.slice(0, 3)}–${g.end.slice(0, 3)}`,
    hours: g.hours,
  }));
}

export const SLOT_STEP_MIN = 30;
export const MAX_DAYS_AHEAD = 90;

export const REVIEWS = [
  {
    name: 'James T.',
    text: 'Best skin fade I’ve had in Bangkok, and I’ve tried a lot. Ton took his time, and the hot towel at the end was a nice touch.',
  },
  {
    name: 'Nattapong S.',
    text: 'Booked online in a minute and got a confirmation on LINE right away. The Royal Treatment is worth every baht.',
  },
  {
    name: 'Lukas M.',
    text: 'Brought my son for his first proper haircut. Kay was patient and made it fun. We’re both regulars now.',
  },
];

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatPrice(thb: number): string {
  return `฿${thb.toLocaleString('en-US')}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
