// Calendar event helpers for a confirmed booking. Pure functions, safe on client and server.
//
// Bookings are stored as Bangkok wall-clock time (date + HH:MM, no zone).
// Calendars need an exact instant, so every time is converted to UTC here,
// in one place. Thailand has no daylight saving: Bangkok is always UTC+07:00.
// Texts (title, description, location) are passed in already translated.

import { SHOP } from './data';
import { BANGKOK_OFFSET_MS } from './validation';

export type BookingEventInput = {
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD, Bangkok
  time: string; // HH:MM, Bangkok
  durationMin: number;
};

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
};

/** Bangkok wall-clock date and time to the exact instant. 2026-09-20 12:30 becomes 05:30Z. */
export function bangkokToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  // Date.UTC treats the wall-clock values as if they were UTC; subtract the offset to get real UTC.
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - BANGKOK_OFFSET_MS);
}

/** Basic ISO 8601 UTC stamp used by Google Calendar and iCalendar: 20260920T053000Z */
export function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildBookingEvent(input: BookingEventInput): CalendarEvent {
  const start = bangkokToUtc(input.date, input.time);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  return { title: input.title, start, end, location: input.location, description: input.description };
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    // UTC instants ("Z"), so the event lands at the right moment in any zone.
    dates: `${toUtcStamp(event.start)}/${toUtcStamp(event.end)}`,
    // Display zone for the event editor: shows Bangkok time, not the viewer's local time.
    ctz: SHOP.timeZone,
    location: event.location,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
