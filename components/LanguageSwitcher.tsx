'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LOCALES, type Locale } from '@/lib/i18n/config';
import { loadLocaleFonts, prepareLocaleSwitch } from '@/lib/i18n/locale-switch';
import type { Dictionary } from '@/lib/i18n/types';

/**
 * EN / TH toggle. Real links (work without JS, crawlable, Ctrl/Cmd-click opens a new tab).
 * A plain click keeps the form and scroll position and switches without any visible jump:
 * the state is saved, the other language's fonts are loaded, then the page is swapped.
 */
export default function LanguageSwitcher({ locale, labels }: { locale: Locale; labels: Dictionary['language'] }) {
  const router = useRouter();

  return (
    <div role="group" aria-label={labels.label} className="flex h-11 items-center rounded-full border border-beige-300/25 p-1">
      {LOCALES.map((target) => {
        const active = target === locale;
        const href = `/${target}`;
        // Start loading the other language's fonts as soon as the visitor aims at the button.
        const warmUp = active ? undefined : () => void loadLocaleFonts(target);

        return (
          <Link
            key={target}
            href={href}
            scroll={false}
            hrefLang={target}
            lang={target}
            aria-label={labels.names[target]}
            aria-current={active ? 'true' : undefined}
            onPointerEnter={warmUp}
            onFocus={warmUp}
            onTouchStart={warmUp}
            onClick={async (event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              if (active) return;
              prepareLocaleSwitch();
              await loadLocaleFonts(target);
              router.push(href, { scroll: false });
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
