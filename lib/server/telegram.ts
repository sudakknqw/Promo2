import 'server-only';

import { formatDuration, formatPrice } from '@/lib/data';
import { formatDateLong, type BookingData } from '@/lib/validation';

const TELEGRAM_TIMEOUT_MS = 5000;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMessage(b: BookingData): string {
  const lines = [
    '✂️ <b>New booking: Sharp Barber Bangkok</b>',
    '',
    `<b>Service:</b> ${escapeHtml(b.serviceName)} (${formatPrice(b.priceThb)}, ${formatDuration(b.durationMin)})`,
    `<b>Barber:</b> ${escapeHtml(b.barberName)}`,
    `<b>Date &amp; time:</b> ${escapeHtml(formatDateLong(b.date))} at ${escapeHtml(b.time)}`,
    `<b>Name:</b> ${escapeHtml(b.name)}`,
    `<b>Phone:</b> ${escapeHtml(b.phone)}`,
    `<b>Comment:</b> ${b.comment ? escapeHtml(b.comment) : '—'}`,
  ];
  return lines.join('\n');
}

/**
 * Sends a booking notification. Never throws: a Telegram outage must not
 * affect a booking that is already saved.
 */
export async function notifyTelegram(booking: BookingData): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set; skipping notification');
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(booking),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[telegram] sendMessage failed with status ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    // Log only the error type: the request URL contains the bot token.
    console.error(`[telegram] request failed: ${err instanceof Error ? err.name : 'unknown error'}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
