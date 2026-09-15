// Keeps scroll position and the booking form when switching EN <-> TH.
// The switcher saves both to sessionStorage right before navigating; the new
// page reads them once. Browser-only helpers.

export const LOCALE_SWITCH_EVENT = 'sharp:before-locale-switch';

const SCROLL_KEY = 'sharp:locale-switch:scroll';
const DRAFT_KEY = 'sharp:locale-switch:draft';
const MAX_AGE_MS = 30_000;

type Stored<T> = { savedAt: number; value: T };

/** Position as "this far into that section", because Thai text makes sections taller. */
type ScrollAnchor = { id: string | null; ratio: number; y: number };

function write<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies Stored<T>));
  } catch {
    // Storage unavailable (private mode, blocked): the switch still works, just without restoring.
  }
}

function take<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const stored = JSON.parse(raw) as Stored<T>;
    return Date.now() - stored.savedAt < MAX_AGE_MS ? stored.value : null;
  } catch {
    return null;
  }
}

/** Call right before navigating to the other locale. */
export function prepareLocaleSwitch() {
  const y = window.scrollY;
  let anchor: ScrollAnchor = { id: null, ratio: 0, y };

  for (const el of document.querySelectorAll<HTMLElement>('[data-scroll-anchor]')) {
    const top = el.getBoundingClientRect().top + y;
    if (top <= y + 1 && el.dataset.scrollAnchor) {
      anchor = { id: el.dataset.scrollAnchor, ratio: el.offsetHeight ? (y - top) / el.offsetHeight : 0, y };
    }
  }

  write(SCROLL_KEY, anchor);
  // Lets the booking form store its current values synchronously.
  window.dispatchEvent(new Event(LOCALE_SWITCH_EVENT));
}

/** Call once after the new locale has mounted. */
export function restoreScrollAfterLocaleSwitch() {
  const anchor = take<ScrollAnchor>(SCROLL_KEY);
  if (!anchor) return;

  const apply = () => {
    const el = anchor.id ? document.querySelector<HTMLElement>(`[data-scroll-anchor="${anchor.id}"]`) : null;
    const top = el ? el.getBoundingClientRect().top + window.scrollY + anchor.ratio * el.offsetHeight : anchor.y;
    window.scrollTo({ top: Math.round(top), behavior: 'instant' });
  };

  // Re-apply as fonts and late content (e.g. the nearest-slot label) change the layout.
  apply();
  requestAnimationFrame(apply);
  void document.fonts?.ready.then(apply);
  setTimeout(apply, 500);
}

export function saveBookingDraft<T>(draft: T) {
  write(DRAFT_KEY, draft);
}

export function takeBookingDraft<T>(): T | null {
  return take<T>(DRAFT_KEY);
}
