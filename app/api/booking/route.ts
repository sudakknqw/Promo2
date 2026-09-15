import { NextResponse, type NextRequest } from 'next/server';

import { checkRateLimit } from '@/lib/server/rate-limit';
import { getSupabaseAdmin } from '@/lib/server/supabase';
import { notifyTelegram } from '@/lib/server/telegram';
import { HONEYPOT_FIELD, validateBooking } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 10_000;

const MESSAGES = {
  generic: 'Something went wrong on our side. Please try again in a moment or call us.',
  invalid: 'Invalid request.',
  fields: 'Please fix the highlighted fields.',
  rateLimited: 'Too many booking attempts. Please try again in a few minutes.',
} as const;

function reply(body: object, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.ip ?? forwarded ?? req.headers.get('x-real-ip') ?? 'unknown';
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
  const limit = checkRateLimit(getClientIp(req));
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

  // 5. Save. Database details stay in server logs, never in the response.
  try {
    const { error } = await getSupabaseAdmin().from('bookings').insert({
      name: booking.name,
      phone: booking.phone,
      service: booking.serviceName,
      barber: booking.barberName,
      booking_date: booking.date,
      booking_time: booking.time,
      comment: booking.comment,
    });

    if (error) {
      console.error(`[booking] insert failed (code: ${error.code ?? 'n/a'})`, error.message);
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.error(
          "[booking] Table 'public.bookings' is not visible to the API. Run supabase/schema.sql in this project, " +
            "or reload the schema cache with: notify pgrst, 'reload schema';",
        );
      }
      return reply({ ok: false, error: MESSAGES.generic }, 500);
    }
  } catch (err) {
    console.error('[booking] unexpected error', err instanceof Error ? err.message : err);
    return reply({ ok: false, error: MESSAGES.generic }, 500);
  }

  // 6. Notify. Failures are logged inside and never reach the client.
  await notifyTelegram(booking);

  return reply(
    {
      ok: true,
      booking: {
        name: booking.name,
        phone: booking.phone,
        serviceName: booking.serviceName,
        priceThb: booking.priceThb,
        durationMin: booking.durationMin,
        barberName: booking.barberName,
        date: booking.date,
        time: booking.time,
        comment: booking.comment,
      },
    },
    200,
  );
}
