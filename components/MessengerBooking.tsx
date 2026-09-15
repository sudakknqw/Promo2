'use client';

import { useEffect, useRef, useState } from 'react';

import { SHOP } from '@/lib/data';
import { buildBookingMessage, whatsappUrl, type MessageDraft } from '@/lib/messenger';

import { useI18n } from './I18nProvider';
import { LineIcon, WhatsAppIcon } from './icons';

const buttonClass =
  'inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-full border border-graphite-600 bg-graphite-900 px-5 text-sm font-semibold text-beige-100 transition hover:border-beige-300/40 hover:text-beige-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400';

/**
 * Alternative to the form: open WhatsApp or LINE with a ready-made message.
 * These are plain links. They create no booking and show no success state.
 */
export default function MessengerBooking({ draft }: { draft: MessageDraft }) {
  const { locale, dict } = useI18n();
  const t = dict.booking.messenger;
  const message = buildBookingMessage(draft, locale, dict);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the message stays visible and can be selected manually.
    }
  }

  return (
    <section aria-labelledby="messenger-booking-title" className="mt-8">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px flex-1 bg-graphite-600" />
        <h3
          id="messenger-booking-title"
          className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-beige-400"
        >
          {t.divider}
        </h3>
        <span aria-hidden className="h-px flex-1 bg-graphite-600" />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <WhatsAppIcon className="h-5 w-5 text-brand-whatsapp" />
          WhatsApp
          <span className="sr-only">{t.whatsappHint}</span>
        </a>
        <a href={SHOP.lineUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <LineIcon className="h-5 w-5 text-brand-line" />
          LINE
          <span className="sr-only">{t.lineHint}</span>
        </a>
      </div>

      <div className="mt-4 rounded-xl border border-graphite-600 bg-graphite-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-beige-400">{t.yourMessage}</p>
          <button
            type="button"
            onClick={copyMessage}
            className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-ochre-300 underline underline-offset-4 transition hover:text-ochre-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre-400"
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
        <p className="break-words text-sm leading-relaxed text-beige-100">{message}</p>
        <p className="mt-3 text-xs text-beige-400">{t.note}</p>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? t.copiedAnnouncement : ''}
      </span>
    </section>
  );
}
