// Pre-filled booking messages for WhatsApp and LINE. Pure functions, no I/O.
// These links only open a chat: nothing is saved and no booking is created.

import { BARBERS, MESSENGERS } from './data';
import { joinServiceNames, quoteServices } from './pricing';
import { isValidDate } from './validation';

export type MessageDraft = {
  name?: string;
  services: readonly string[];
  barber: string;
  date: string;
  time: string;
};

export const GENERIC_BOOKING_MESSAGE = "Hi! I'd like to book an appointment.";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAME_MAX = 60;

/** "Wed 16 Sept". No comma, so it reads well inside a comma-separated list. */
function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/**
 * "Hi! I'd like to book: Signature Haircut + Beard Trim & Shape, with Ton Saelim, Wed 16 Sept 18:30. My name is ___"
 * Only what is filled in is mentioned. With nothing selected, a generic greeting.
 */
export function buildBookingMessage(draft: MessageDraft): string {
  const details: string[] = [];

  const { services } = quoteServices(draft.services);
  if (services.length > 0) details.push(joinServiceNames(services));

  const barber = BARBERS.find((b) => b.id === draft.barber);
  if (barber) details.push(`with ${barber.name}`);

  if (isValidDate(draft.date)) {
    const day = formatDay(draft.date);
    details.push(TIME_PATTERN.test(draft.time) ? `${day} ${draft.time}` : day);
  }

  const name = (draft.name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

  if (details.length === 0) {
    return name ? `${GENERIC_BOOKING_MESSAGE} My name is ${name}.` : GENERIC_BOOKING_MESSAGE;
  }
  return `Hi! I'd like to book: ${details.join(', ')}. My name is ${name ? `${name}.` : '___'}`;
}

/** wa.me link with the message pre-filled. encodeURIComponent keeps spaces, "&", "+" and "#" from breaking the URL. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${MESSENGERS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
