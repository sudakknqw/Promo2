// Pre-filled booking messages for WhatsApp and LINE, in the visitor's language.
// These links only open a chat: nothing is saved and no booking is created.

import { BARBERS, MESSENGERS } from './data';
import type { Locale } from './i18n/config';
import { barberText, formatShortDate, interpolate, serviceText } from './i18n/text';
import type { Dictionary } from './i18n/types';
import { quoteServices } from './pricing';
import { isValidDate } from './validation';

export type MessageDraft = {
  name?: string;
  services: readonly string[];
  barber: string;
  date: string;
  time: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAME_MAX = 60;

/**
 * en: "Hi! I'd like to book: Signature Haircut + Beard Trim & Shape, with Ton Saelim, Wed 16 Sept 18:30. My name is ___"
 * Only what is filled in is mentioned. With nothing selected, a generic greeting.
 */
export function buildBookingMessage(draft: MessageDraft, locale: Locale, dict: Dictionary): string {
  const t = dict.booking.messenger;
  const details: string[] = [];

  const { services } = quoteServices(draft.services);
  if (services.length > 0) details.push(services.map((s) => serviceText(dict, s.id).name).join(' + '));

  const barber = BARBERS.find((b) => b.id === draft.barber);
  if (barber) details.push(interpolate(t.withBarber, { barber: barberText(dict, barber.id).name }));

  if (isValidDate(draft.date)) {
    const day = formatShortDate(draft.date, locale, dict);
    details.push(TIME_PATTERN.test(draft.time) ? `${day} ${draft.time}` : day);
  }

  const name = (draft.name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

  if (details.length === 0) {
    return name ? interpolate(t.genericWithName, { name }) : t.generic;
  }
  const joined = details.join(t.detailsSeparator);
  return name ? interpolate(t.withDetailsAndName, { details: joined, name }) : interpolate(t.withDetails, { details: joined });
}

/** wa.me link with the message pre-filled. encodeURIComponent keeps spaces, "&", "+", "#" and Thai text from breaking the URL. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${MESSENGERS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
