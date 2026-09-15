// Slot availability shared by the booking form and the API routes.
// Pure functions only: callers pass in the busy intervals.
//
// Model: every barber is one chair.
//  - A booking for a specific barber blocks that barber for its whole duration.
//  - A booking for "any barber" takes one chair, but not a particular one.
//  - A barber is free for a new appointment if they have no overlapping booking
//    AND at every moment of it at least one chair is still left.
//  - "Any barber" is free if at least one barber is free for the whole appointment.

import { ANY_BARBER_ID, BARBERS } from './data';
import { addDays, getTimeSlots } from './validation';

/** A booked interval as exposed by /api/availability. No personal data. */
export type BusyInterval = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  barber: string; // barber id or "any"
  durationMin: number;
};

export type SlotState = { time: string; booked: boolean };

type Interval = { start: number; end: number; barber: string };

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Half-open intervals: 14:00–14:45 and 14:45–15:30 do not overlap. */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function intervalsForDate(busy: BusyInterval[], date: string): Interval[] {
  return busy
    .filter((b) => b.date === date)
    .map((b) => {
      const start = timeToMinutes(b.time);
      return { start, end: start + b.durationMin, barber: b.barber };
    });
}

function isBarberFree(barberId: string, start: number, end: number, intervals: Interval[]): boolean {
  const overlapping = intervals.filter((i) => overlaps(start, end, i.start, i.end));
  if (overlapping.some((i) => i.barber === barberId)) return false;

  // Concurrency can only rise where an appointment starts, so checking those points is enough.
  const checkpoints = [start, ...overlapping.map((i) => i.start).filter((t) => t > start)];
  return checkpoints.every(
    (t) => overlapping.filter((i) => i.start <= t && t < i.end).length < BARBERS.length,
  );
}

function isFree(barberChoice: string, start: number, durationMin: number, intervals: Interval[]): boolean {
  const end = start + durationMin;
  if (barberChoice === ANY_BARBER_ID) {
    return BARBERS.some((b) => isBarberFree(b.id, start, end, intervals));
  }
  return isBarberFree(barberChoice, start, end, intervals);
}

/** Is this exact appointment still possible given the existing bookings? */
export function isSlotAvailable(
  slot: { date: string; time: string; barber: string; durationMin: number },
  busy: BusyInterval[],
): boolean {
  return isFree(slot.barber, timeToMinutes(slot.time), slot.durationMin, intervalsForDate(busy, slot.date));
}

/** All start times within opening hours (past times today excluded), each marked booked or free. */
export function getSlotStates(
  date: string,
  durationMin: number,
  barberChoice: string,
  busy: BusyInterval[],
  now: Date = new Date(),
): SlotState[] {
  const intervals = intervalsForDate(busy, date);
  return getTimeSlots(date, durationMin, now).map((time) => ({
    time,
    booked: !isFree(barberChoice, timeToMinutes(time), durationMin, intervals),
  }));
}

/** First date in [from, until] with at least one free slot, or null. */
export function findNextAvailableDate(
  from: string,
  until: string,
  durationMin: number,
  barberChoice: string,
  busy: BusyInterval[],
  now: Date = new Date(),
): string | null {
  for (let date = from; date <= until; date = addDays(date, 1)) {
    if (getSlotStates(date, durationMin, barberChoice, busy, now).some((s) => !s.booked)) return date;
  }
  return null;
}
