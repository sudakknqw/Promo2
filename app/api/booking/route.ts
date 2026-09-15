import type { NextRequest } from 'next/server';

import { isSlotAvailable } from '@/lib/availability';
import { DatabaseError, getActiveBookings } from '@/lib/server/bookings';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getClientIp, jsonNoStore } from '@/lib/server/request';
import { getSupabaseAdmin } from '@/lib/server/supabase';
import { notifyTelegram } from '@/lib/server/telegram';
import { HONEYPOT_FIELD, validateBooking, type BookingData } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 10_000;

const MESSAGES = {
  generic: 'Something went wrong on our side. Please try again in a moment or call us.',
  invalid: 'Invalid request.',
  fields: 'Please fix the highlighted fields.',
  rateLimited: 'Too many booking attempts. Please try again in a few minutes.',
  slotTaken: 'This time was just booked, please pick another',
} as const;

const reply = jsonNoStore;

function slotTaken() {
  return reply(
    { ok: false, code: 'slot_taken', error: MESSAGES.slotTaken, fieldErrors: { time: MESSAGES.slotTaken } },
    409,
  );
}

function slotOf(b: BookingData) {
  return { date: b.date, time: b.time, barber: b.barberId, durationMin: b.totalDurationMin };
}

/**
 * Total order of bookings by creation: created_at (fraction padded to microseconds,
 * since Postgres trims trailing zeros), then id as a tie-breaker.
 */
function creationKey(b: { createdAt: string; id: string }): string {
  const normalized = b.createdAt.replace(
    /(\d{2}:\d{2}:\d{2})(?:\.(\d+))?/,
    (_, hms: string, fraction: string = '') => `${hms}.${fraction.padEnd(6, '0')}`,
  );
  return `${normalized}|${b.id}`;
}

/** Browsers always send Origin on POST; reject if it points at another site. */
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 1. Rate limit by IP (counts every attempt, including invalid ones).
  const limit = checkRateLimit(`booking:${getClientIp(req)}`);
  if (!limit.allowed) {
    return reply({ ok: false, error: MESSAGES.rateLimited }, 429, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  // 2. Basic request hygiene.
  if (!isAllowedOrigin(req)) {
    return reply({ ok: false, error: MESSAGES.invalid }, 403);
  }
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return reply({ ok: false, error: MESSAGES.invalid }, 415);
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return reply({ ok: false, error: MESSAGES.invalid }, 413);
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return reply({ ok: false, error: MESSAGES.invalid }, 413);
    }
    body = JSON.parse(text);
  } catch {
    return reply({ ok: false, error: MESSAGES.invalid }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply({ ok: false, error: MESSAGES.invalid }, 400);
  }

  // 3. Honeypot: humans never see this field. Pretend success so bots move on.
  const honeypot = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return reply({ ok: true }, 200);
  }

  // 4. Server-side validation (the source of truth).
  const result = validateBooking(body);
  if (!result.ok) {
    return reply({ ok: false, error: MESSAGES.fields, fieldErrors: result.errors }, 400);
  }
  const booking = result.data;
  const slot = slotOf(booking);
  let bookingId = '';

  try {
    const supabase = getSupabaseAdmin();

    // 5. Re-check the slot right before saving: it may have been taken since the form loaded.
    const existing = await getActiveBookings(booking.date, booking.date);
    if (!isSlotAvailable(slot, existing)) {
      return slotTaken();
    }

    // 6. Save. Database details stay in server logs, never in the response.
    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert({
        name: booking.name,
        phone: booking.phone,
        service: booking.serviceSummary,
        // Everything below was calculated on the server from the price list (lib/data.ts),
        // using only the service ids sent by the form.
        services: booking.services.map((s) => ({ id: s.id, name: s.name, price: s.priceThb, duration: s.durationMin })),
        total_price: booking.totalPriceThb,
        total_duration: booking.totalDurationMin,
        barber: booking.barberName,
        booking_date: booking.date,
        booking_time: booking.time,
        comment: booking.comment,
      })
      .select('id, created_at')
      .single();

    if (error || !inserted) {
      console.error(`[booking] insert failed (code: ${error?.code ?? 'n/a'})`, error?.message);
      if (error?.code === 'PGRST205' || error?.code === '42P01') {
        console.error(
          "[booking] Table 'public.bookings' is not visible to the API. Run supabase/schema.sql in this project, " +
            "or reload the schema cache with: notify pgrst, 'reload schema';",
        );
      }
      if (error?.code === 'PGRST204' || error?.code === '42703') {
        console.error('[booking] Column missing: run part A of supabase/migrations/002_multiple_services.sql');
      }
      return reply({ ok: false, error: MESSAGES.generic }, 500);
    }

    // 7. Race guard. Two requests can both pass step 5 at the same moment and both insert.
    //    Re-read the day: only bookings created before ours count. If one of them now
    //    conflicts, ours was second, so remove it and report the slot as taken.
    //    The earlier booking never sees the later one, so exactly one of them survives.
    const mine = { id: inserted.id as string, createdAt: inserted.created_at as string };
    bookingId = mine.id;
    try {
      const after = await getActiveBookings(booking.date, booking.date);
      const earlier = after.filter((b) => b.id !== mine.id && creationKey(b) < creationKey(mine));

      if (!isSlotAvailable(slot, earlier)) {
        const { error: deleteError } = await supabase.from('bookings').delete().eq('id', mine.id);
        if (deleteError) {
          console.error(`[booking] could not remove double booking ${mine.id} (code: ${deleteError.code})`);
        }
        return slotTaken();
      }
    } catch {
      // The booking passed step 5 and is saved; don't fail it because the re-check query failed.
      console.warn(`[booking] race re-check skipped for ${mine.id}`);
    }
  } catch (err) {
    if (!(err instanceof DatabaseError)) {
      console.error('[booking] unexpected error', err instanceof Error ? err.message : err);
    }
    return reply({ ok: false, error: MESSAGES.generic }, 500);
  }

  // 8. Notify. Failures are logged inside and never reach the client.
  await notifyTelegram(booking, bookingId);

  return reply(
    {
      ok: true,
      booking: {
        name: booking.name,
        phone: booking.phone,
        services: booking.services,
        totalPriceThb: booking.totalPriceThb,
        totalDurationMin: booking.totalDurationMin,
        barberName: booking.barberName,
        date: booking.date,
        time: booking.time,
        comment: booking.comment,
      },
    },
    200,
  );
}
