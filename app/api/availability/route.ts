import type { NextRequest } from 'next/server';

import { MAX_DAYS_AHEAD } from '@/lib/data';
import { DatabaseError, getActiveBookings, toPublicInterval } from '@/lib/server/bookings';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getClientIp, jsonNoStore } from '@/lib/server/request';
import { addDays, getBookingWindow, isValidDate } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 31;

/**
 * GET /api/availability?date=YYYY-MM-DD[&days=N]
 * Returns busy intervals only (date, time, barber id, duration). No names,
 * phones or comments: this endpoint is public.
 * `days` (1–31, default 1) lets the form look ahead for the next free date.
 */
export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`availability:${getClientIp(req)}`, 60);
  if (!limit.allowed) {
    return jsonNoStore({ ok: false, error: 'Too many requests. Please try again in a few minutes.' }, 429, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const params = req.nextUrl.searchParams;
  const date = params.get('date') ?? '';
  const daysParam = params.get('days');
  const bookingWindow = getBookingWindow();

  if (!isValidDate(date)) {
    return jsonNoStore({ ok: false, error: 'Invalid date. Use the YYYY-MM-DD format.' }, 400);
  }
  if (date < bookingWindow.min) {
    return jsonNoStore({ ok: false, error: 'This date is in the past.' }, 400);
  }
  if (date > bookingWindow.max) {
    return jsonNoStore({ ok: false, error: `Bookings are open up to ${MAX_DAYS_AHEAD} days ahead.` }, 400);
  }

  let days = 1;
  if (daysParam !== null) {
    days = /^\d{1,2}$/.test(daysParam) ? Number(daysParam) : NaN;
    if (!(days >= 1 && days <= MAX_RANGE_DAYS)) {
      return jsonNoStore({ ok: false, error: `days must be a number from 1 to ${MAX_RANGE_DAYS}.` }, 400);
    }
  }

  const rangeEnd = addDays(date, days - 1);
  const until = rangeEnd < bookingWindow.max ? rangeEnd : bookingWindow.max;

  try {
    const bookings = await getActiveBookings(date, until);
    return jsonNoStore({ ok: true, date, until, busy: bookings.map(toPublicInterval) }, 200);
  } catch (err) {
    // DatabaseError is already logged with its code inside getActiveBookings.
    if (!(err instanceof DatabaseError)) {
      console.error('[availability] unexpected error', err instanceof Error ? err.message : err);
    }
    return jsonNoStore({ ok: false, error: 'Could not load available times. Please try again.' }, 500);
  }
}
