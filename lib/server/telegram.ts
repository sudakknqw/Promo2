import 'server-only';

import { formatDuration, formatPrice } from '@/lib/data';
import { formatDateLong, type BookingData } from '@/lib/validation';

const TELEGRAM_TIMEOUT_MS = 5000;

/** Formatting entity as returned by Telegram with a message. */
export type MessageEntity = { type: string; offset: number; length: number; [key: string]: unknown };

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMessage(b: BookingData): string {
  const lines = [
    '✂️ <b>New booking: Sharp Barber Bangkok</b>',
    // Always English for the owner; this line only says which site version was used.
    `🌐 <b>Site version:</b> ${b.locale === 'th' ? 'Thai (/th)' : 'English (/en)'}`,
    '',
    '<b>Services:</b>',
    ...b.services.map((s) => `• ${escapeHtml(s.name)}: ${formatPrice(s.priceThb)}, ${formatDuration(s.durationMin)}`),
    `<b>Total:</b> ${formatPrice(b.totalPriceThb)} · ${formatDuration(b.totalDurationMin)}`,
    '',
    `<b>Barber:</b> ${escapeHtml(b.barberName)}`,
    `<b>Date &amp; time:</b> ${escapeHtml(formatDateLong(b.date))} at ${escapeHtml(b.time)}`,
    `<b>Name:</b> ${escapeHtml(b.name)}`,
    `<b>Phone:</b> ${escapeHtml(b.phone)}`,
    `<b>Comment:</b> ${b.comment ? escapeHtml(b.comment) : '—'}`,
  ];
  return lines.join('\n');
}

/**
 * Calls a Bot API method. Never throws: returns false on any failure.
 * Logs never include the request URL, because it contains the bot token.
 */
async function callTelegram(method: string, payload: Record<string, unknown>): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(`[telegram] TELEGRAM_BOT_TOKEN is not set; skipping ${method}`);
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { description?: string } | null;
      console.error(`[telegram] ${method} failed with status ${res.status}${body?.description ? `: ${body.description}` : ''}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[telegram] ${method} request failed: ${err instanceof Error ? err.name : 'unknown error'}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends a booking notification. Never throws: a Telegram outage must not
 * affect a booking that is already saved.
 */
export async function notifyTelegram(booking: BookingData, bookingId: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn('[telegram] TELEGRAM_CHAT_ID is not set; skipping notification');
    return false;
  }

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: buildMessage(booking),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    // Handled by /api/telegram/webhook. callback_data max is 64 bytes: "confirm:" + uuid = 44.
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Confirm', callback_data: `confirm:${bookingId}` },
          { text: 'Cancel', callback_data: `cancel:${bookingId}` },
        ],
      ],
    },
  });
}

/** Stops the loading spinner on the pressed button and shows a short toast (or alert). */
export function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false): Promise<boolean> {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Appends a result line to a notification and removes its buttons. The original
 * formatting entities are passed back unchanged: appending text at the end does
 * not shift their offsets.
 */
export function finalizeBookingMessage(
  chatId: number | string,
  messageId: number,
  originalText: string,
  entities: MessageEntity[] | undefined,
  resultLine: string,
): Promise<boolean> {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: `${originalText}\n\n${resultLine}`,
    entities,
    reply_markup: { inline_keyboard: [] },
  });
}
