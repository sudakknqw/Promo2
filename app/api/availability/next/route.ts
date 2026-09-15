import type { NextRequest } from 'next/server';

import { findNextAvailableSlot } from '@/lib/availability';
import { ANY_BARBER_ID, BARBERS, SERVICES, SLOT_STEP_MIN } from '@/lib/data';
import { quoteServices } from '@/lib/pricing';
import { DatabaseError, getActiveBookings } from '@/lib/server/bookings';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getClientIp, jsonNoStore } from '@/lib/server/request';
import { addDays, bangkokNow } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Days searched, today included. */
const SEARCH_DAYS = 14;
/** Never suggest a slot that starts sooner than this: the client needs time to get here. */
const TRAVEL_BUFFER_MIN = 60;

/**
 * GET /api/availability/next[?services=haircut,beard][&barber=any]
 * Earliest free slot from now (server clock, Bangkok time), within 14 days.
 * Duration comes from the service ids and the price list; with no services, one 30-min slot.
 * Response: { ok, today, searchedUntil, durationMin, slot: { date, time } | null }
 */
export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`availability-next:${getClientIp(req)}`, 60);
  if (!limit.allowed) {
    return jsonNoStore({ ok: false, error: 'Too many requests. Please try again in a few minutes.' }, 429, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const params = req.nextUrl.searchParams;

  const servicesParam = params.get('services')?.trim() ?? '';
  const serviceIds = servicesParam ? servicesParam.split(',') : [];
  if (serviceIds.length > SERVICES.length) {
    return jsonNoStore({ ok: false, error: 'Too many services.' }, 400);
  }
  if (serviceIds.some((id) => !SERVICES.some((s) => s.id === id))) {
    return jsonNoStore({ ok: false, error: 'Unknown service.' }, 400);
  }

  const barber = params.get('barber') ?? ANY_BARBER_ID;
  if (barber !== ANY_BARBER_ID && !BARBERS.some((b) => b.id === barber)) {
    return jsonNoStore({ ok: false, error: 'Unknown barber.' }, 400);
  }

  const durationMin = serviceIds.length > 0 ? quoteServices(serviceIds).totalDurationMin : SLOT_STEP_MIN;
  const now = new Date(); // Server clock: the browser's clock and time zone are not trusted.
  const today = bangkokNow(now).date;
  const searchedUntil = addDays(today, SEARCH_DAYS - 1);

  try {
    const busy = await getActiveBookings(today, searchedUntil);
    const slot = findNextAvailableSlot(today, searchedUntil, durationMin, barber, busy, now, TRAVEL_BUFFER_MIN);
    return jsonNoStore({ ok: true, today, searchedUntil, durationMin, slot }, 200);
  } catch (err) {
    if (!(err instanceof DatabaseError)) {
      console.error('[availability-next] unexpected error', err instanceof Error ? err.message : err);
    }
    return jsonNoStore({ ok: false, error: 'Could not find the nearest time. Please pick one manually.' }, 500);
  }
}
