'use client';

import { useEffect } from 'react';

import { restoreScrollAfterLocaleSwitch } from '@/lib/i18n/locale-switch';

/** Restores the scroll position saved by the language switcher. Renders nothing. */
export default function LocaleScrollRestorer() {
  useEffect(() => restoreScrollAfterLocaleSwitch(), []);
  return null;
}
