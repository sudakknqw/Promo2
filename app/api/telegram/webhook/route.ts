import { timingSafeEqual } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { DatabaseError, applyBookingAction, type BookingAction, type BookingActionResult } from '@/lib/server/bookings';
import { jsonNoStore } from '@/lib/server/request';
import { answerCallbackQuery, finalizeBookingMessage, type MessageEntity } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 100_000;
const CALLBACK_DATA = /^(confirm|cancel):(.+)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_LINE: Record<string, string> = {
  confirmed: '✅ Confirmed',
  cancelled: '❌ Cancelled',
  completed: '☑️ Completed',
  no_show: '🚫 No-show',
};

type CallbackQuery = {
  id: string;
  data?: string;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    entities?: MessageEntity[];
  };
};

type TelegramUpdate = { update_id?: number; callback_query?: CallbackQuery };

/** Telegram only needs a 2xx; anything else makes it redeliver the same update. */
const acknowledge = () => jsonNoStore({ ok: true }, 200);

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function describe(result: BookingActionResult, action: BookingAction): { answer: string; line: string } {
  switch (result.outcome) {
    case 'updated':
      return { answer: action === 'confirm' ? 'Booking confirmed' : 'Booking cancelled', line: STATUS_LINE[result.status] };
    case 'already':
      return {
        answer: `Already ${result.status.replace('_', '-')}`,
        line: STATUS_LINE[result.status] ?? `Status: ${result.status}`,
      };
    case 'not_found':
      return { answer: 'Booking not found', line: '⚠️ Booking not found' };
  }
}

/**
 * POST /api/telegram/webhook
 * Receives button presses (callback_query) from the booking notifications.
 */
export async function POST(req: NextRequest) {
  // 1. Only Telegram knows the secret set via setWebhook.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[telegram-webhook] TELEGRAM_WEBHOOK_SECRET is not set; rejecting all updates');
    return jsonNoStore({ ok: false }, 401);
  }
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'), expectedSecret)) {
    return jsonNoStore({ ok: false }, 401);
  }

  // 2. Parse the update.
  let update: TelegramUpdate;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return jsonNoStore({ ok: false }, 413);
    update = JSON.parse(text) as TelegramUpdate;
  } catch {
    return jsonNoStore({ ok: false }, 400);
  }

  const query = update?.callback_query;
  if (!query || typeof query.id !== 'string') {
    return acknowledge(); // Not a button press: nothing to do.
  }

  // 3. The button must be pressed in our admin chat.
  const message = query.message;
  const allowedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!message || !allowedChatId || String(message.chat?.id) !== allowedChatId) {
    console.warn(`[telegram-webhook] rejected callback from chat ${message?.chat?.id ?? 'unknown'}`);
    await answerCallbackQuery(query.id, 'Not allowed.', true);
    return acknowledge();
  }

  // 4. "confirm:<uuid>" or "cancel:<uuid>".
  const match = CALLBACK_DATA.exec(query.data ?? '');
  if (!match || !UUID.test(match[2])) {
    console.warn('[telegram-webhook] rejected callback with invalid data');
    await answerCallbackQuery(query.id, 'Invalid action.', true);
    return acknowledge();
  }
  const action = match[1] as BookingAction;
  const bookingId = match[2].toLowerCase();

  // 5. Change the status once.
  let result: BookingActionResult;
  try {
    result = await applyBookingAction(bookingId, action);
  } catch (err) {
    if (!(err instanceof DatabaseError)) {
      console.error('[telegram-webhook] unexpected error', err instanceof Error ? err.message : err);
    }
    await answerCallbackQuery(query.id, 'Something went wrong. Please try again.', true);
    return acknowledge();
  }

  // 6. Tell the admin and update the message (buttons removed, result appended).
  const { answer, line } = describe(result, action);
  await Promise.all([
    answerCallbackQuery(query.id, answer, result.outcome !== 'updated'),
    message.text
      ? finalizeBookingMessage(message.chat.id, message.message_id, message.text, message.entities, line)
      : Promise.resolve(false),
  ]);

  console.info(`[telegram-webhook] ${action} ${bookingId}: ${result.outcome}`);
  return acknowledge();
}
