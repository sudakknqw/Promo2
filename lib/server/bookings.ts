import 'server-only';

import type { BusyInterval } from '@/lib/availability';
import { ANY_BARBER_ID, BARBERS, SERVICES } from '@/lib/data';

import { getSupabaseAdmin } from './supabase';

/** Bookings with these statuses no longer occupy a slot. */
const INACTIVE_STATUSES = ['cancelled', 'no_show'] as const;

/** Used if a stored service name no longer matches lib/data.ts (e.g. after a rename). */
const FALLBACK_DURATION_MIN = 60;

export type ActiveBooking = BusyInterval & { id: string; createdAt: string };

type BookingDbRow = {
  id: string;
  created_at: string;
  booking_date: string;
  booking_time: string;
  service: string;
  barber: string;
  total_duration: number | null;
};

export class DatabaseError extends Error {
  constructor(readonly code: string | undefined) {
    super(`Database query failed (code: ${code ?? 'n/a'})`);
  }
}

// The table stores the barber's display name, so map it back to an id.
// Duration is the total of all booked services (total_duration); rows without it
// (created before migration 002) fall back to the single service name.
function toActiveBooking(row: BookingDbRow): ActiveBooking {
  const barber = BARBERS.find((b) => b.name === row.barber);
  const legacyService = SERVICES.find((s) => s.name === row.service);
  return {
    id: row.id,
    createdAt: row.created_at,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    barber: barber?.id ?? ANY_BARBER_ID,
    durationMin: row.total_duration ?? legacyService?.durationMin ?? FALLBACK_DURATION_MIN,
  };
}

/** Bookings that still occupy a slot, for dates in [from, to]. */
export async function getActiveBookings(from: string, to: string): Promise<ActiveBooking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('id, created_at, booking_date, booking_time, service, barber, total_duration')
    .gte('booking_date', from)
    .lte('booking_date', to)
    .not('status', 'in', `(${INACTIVE_STATUSES.join(',')})`)
    .order('booking_date')
    .order('booking_time');

  if (error) {
    console.error(`[bookings] select failed (code: ${error.code ?? 'n/a'})`, error.message);
    if (error.code === '42703') {
      console.error('[bookings] Column missing: run part A of supabase/migrations/002_multiple_services.sql');
    }
    throw new DatabaseError(error.code);
  }
  return (data as BookingDbRow[]).map(toActiveBooking);
}

export type BookingAction = 'confirm' | 'cancel';

const ACTION_STATUS: Record<BookingAction, string> = { confirm: 'confirmed', cancel: 'cancelled' };

export type BookingActionResult =
  | { outcome: 'updated'; status: string }
  | { outcome: 'already'; status: string }
  | { outcome: 'not_found' };

/**
 * Moves a booking out of 'new'. Filtering on status = 'new' in the UPDATE itself
 * makes this atomic: a double tap or two people pressing at once change it only once.
 */
export async function applyBookingAction(id: string, action: BookingAction): Promise<BookingActionResult> {
  const supabase = getSupabaseAdmin();
  const target = ACTION_STATUS[action];

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: target })
    .eq('id', id)
    .eq('status', 'new')
    .select('status');

  if (error) {
    console.error(`[bookings] status update failed (code: ${error.code ?? 'n/a'})`, error.message);
    throw new DatabaseError(error.code);
  }
  if (updated && updated.length > 0) return { outcome: 'updated', status: target };

  const { data: row, error: readError } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (readError) {
    console.error(`[bookings] status read failed (code: ${readError.code ?? 'n/a'})`, readError.message);
    throw new DatabaseError(readError.code);
  }
  if (!row) return { outcome: 'not_found' };
  return { outcome: 'already', status: String(row.status) };
}

/** Only the fields that are safe to expose publicly. */
export function toPublicInterval({ date, time, barber, durationMin }: BusyInterval): BusyInterval {
  return { date, time, barber, durationMin };
}
