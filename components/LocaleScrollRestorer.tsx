'use client';

import { useEffect, useLayoutEffect } from 'react';

import { restoreScrollAfterLocaleSwitch } from '@/lib/i18n/locale-switch';

// useLayoutEffect is meaningless during server rendering; fall back there to avoid the warning.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Restores the scroll position saved by the language switcher. Runs before the first paint
 * of the new language, after the booking form has already rendered its restored state.
 */
export default function LocaleScrollRestorer() {
  useBrowserLayoutEffect(() => restoreScrollAfterLocaleSwitch(), []);
  return null;
}
