'use client';

import Link from 'next/link';

import { LOCALES, type Locale } from '@/lib/i18n/config';
import { prepareLocaleSwitch } from '@/lib/i18n/locale-switch';
import type { Dictionary } from '@/lib/i18n/types';

/** EN / TH toggle. Real links (work without JS, crawlable); scroll and form are kept on switch. */
export default function LanguageSwitcher({ locale, labels }: { locale: Locale; labels: Dictionary['language'] }) {
  return (
    <div role="group" aria-label={labels.label} className="flex h-11 items-center rounded-full border border-beige-300/25 p-1">
      {LOCALES.map((target) => {
        const active = target === locale;
        return (
          <Link
            key={target}
            href={`/${target}`}
            scroll={false}
            hrefLang={target}
            lang={target}
            aria-label={labels.names[target]}
            aria-current={active ? 'true' : undefined}
            onClick={(event) => {
              if (active) event.preventDefault();
              else prepareLocaleSwitch();
            }}
            className={[
              'flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-bold transition',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400',
              active ? 'bg-beige-100 text-graphite-950' : 'text-beige-300 hover:text-ochre-300',
            ].join(' ')}
          >
            {labels.codes[target]}
          </Link>
        );
      })}
    </div>
  );
}
