// Keeps the view steady when switching EN <-> TH.
//
// Right before navigating, the switcher stores (1) which element sits at the top of the
// visible area and how far into it the page is scrolled, and (2) the booking form's state.
// The new page renders the form from that state on its very first render and restores the
// scroll position in a layout effect, before the browser paints, so nothing visibly moves.
// Browser-only helpers.

export const LOCALE_SWITCH_EVENT = 'sharp:before-locale-switch';

const SCROLL_KEY = 'sharp:locale-switch:scroll';
const DRAFT_KEY = 'sharp:locale-switch:draft';
const MAX_AGE_MS = 30_000;

type Stored<T> = { savedAt: number; value: T };

/**
 * Both language versions render the same DOM inside each section, so the element at the top
 * of the screen can be found again by its child-index path from its section
 * ([data-scroll-anchor]). The path starts at the section, not at <body>: a server-rendered
 * page has extra framework nodes in <body> that a client-rendered one doesn't.
 * The position within the section is kept as a fallback.
 */
type ScrollAnchor = {
  section: string | null;
  path: number[];
  tag: string;
  ratio: number;
  sectionRatio: number;
  y: number;
};

function write<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies Stored<T>));
  } catch {
    // Storage unavailable (private mode, blocked): the switch still works, just without restoring.
  }
}

function read<T>(key: string, remove: boolean): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    if (remove) sessionStorage.removeItem(key);
    const stored = JSON.parse(raw) as Stored<T>;
    return Date.now() - stored.savedAt < MAX_AGE_MS ? stored.value : null;
  } catch {
    return null;
  }
}

/** First pixel row below the sticky header. */
function visibleTop(): number {
  return (document.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 1;
}

function pathFrom(root: Element, el: Element): number[] {
  const path: number[] = [];
  let node: Element = el;
  while (node !== root && node.parentElement) {
    path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    node = node.parentElement;
  }
  return path;
}

function elementAtPath(root: Element, path: number[]): Element | null {
  let el: Element = root;
  for (const index of path) {
    const next = el.children[index];
    if (!next) return null;
    el = next;
  }
  return el;
}

// Web fonts each locale needs (CSS variables set by next/font on <html>). Thai pages use
// Noto Sans Thai for text; English pages use Inter. Oswald is used by headings in both.
const LOCALE_FONTS: Record<string, { variable: string; weights: string[]; sample: string }[]> = {
  en: [
    { variable: '--font-body', weights: ['400', '600', '700'], sample: 'Aa' },
    { variable: '--font-display', weights: ['500', '600', '700'], sample: 'Aa' },
  ],
  th: [
    { variable: '--font-thai', weights: ['400', '500', '600', '700'], sample: 'กขAa' },
    { variable: '--font-display', weights: ['600', '700'], sample: 'Aa' },
  ],
};
const FONT_LOAD_TIMEOUT_MS = 800;

/**
 * Loads the target locale's fonts before switching, so the new page lays out with its final
 * fonts and doesn't re-flow a moment later. Never waits longer than FONT_LOAD_TIMEOUT_MS.
 */
export function loadLocaleFonts(locale: string): Promise<void> {
  const fonts = LOCALE_FONTS[locale];
  if (!fonts || !document.fonts) return Promise.resolve();

  const rootStyle = getComputedStyle(document.documentElement);
  const loads = fonts.flatMap(({ variable, weights, sample }) => {
    const family = rootStyle.getPropertyValue(variable).trim();
    return family ? weights.map((weight) => document.fonts.load(`${weight} 16px ${family}`, sample).catch(() => [])) : [];
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS));
  return Promise.race([Promise.all(loads), timeout]).then(() => undefined);
}

/** Call right before navigating to the other locale. */
export function prepareLocaleSwitch() {
  const top = visibleTop();
  const anchor: ScrollAnchor = { section: null, path: [], tag: '', ratio: 0, sectionRatio: 0, y: window.scrollY };

  const section = [...document.querySelectorAll<HTMLElement>('[data-scroll-anchor]')]
    .filter((el) => el.getBoundingClientRect().top <= top)
    .pop();
  if (!section) {
    write(SCROLL_KEY, anchor);
    window.dispatchEvent(new Event(LOCALE_SWITCH_EVENT));
    return;
  }

  const sectionRect = section.getBoundingClientRect();
  anchor.section = section.dataset.scrollAnchor ?? null;
  anchor.sectionRatio = sectionRect.height ? (top - sectionRect.top) / sectionRect.height : 0;

  const hit = document.elementFromPoint(window.innerWidth / 2, top);
  if (hit && section.contains(hit)) {
    const rect = hit.getBoundingClientRect();
    anchor.path = pathFrom(section, hit);
    anchor.tag = hit.tagName;
    anchor.ratio = rect.height ? (top - rect.top) / rect.height : 0;
  }

  write(SCROLL_KEY, anchor);
  // Lets the booking form store its current state synchronously.
  window.dispatchEvent(new Event(LOCALE_SWITCH_EVENT));
}

/** Call from a layout effect on the new page: the DOM is ready and nothing has been painted yet. */
export function restoreScrollAfterLocaleSwitch() {
  const anchor = read<ScrollAnchor>(SCROLL_KEY, true);
  if (!anchor) return;

  const targetY = () => {
    const top = visibleTop();
    const section = anchor.section ? document.querySelector<HTMLElement>(`[data-scroll-anchor="${anchor.section}"]`) : null;
    const el = section && anchor.tag ? elementAtPath(section, anchor.path) : null;
    if (el && el.tagName === anchor.tag && el.getBoundingClientRect().height > 0) {
      const rect = el.getBoundingClientRect();
      return window.scrollY + rect.top + anchor.ratio * rect.height - top;
    }
    if (section) {
      const rect = section.getBoundingClientRect();
      return window.scrollY + rect.top + anchor.sectionRatio * rect.height - top;
    }
    return anchor.y;
  };

  const apply = () => {
    const y = Math.max(0, Math.round(targetY()));
    window.scrollTo({ top: y, behavior: 'instant' });
    return y;
  };

  const appliedY = apply();

  // Safety net: fonts are loaded before switching, but if one still finishes right after,
  // re-align once, and never if the visitor has scrolled in the meantime.
  if (document.fonts) {
    const realign = () => {
      if (Math.abs(window.scrollY - appliedY) < 2) apply();
    };
    document.fonts.addEventListener('loadingdone', realign, { once: true });
    setTimeout(() => document.fonts.removeEventListener('loadingdone', realign), 1500);
  }
}

export function saveBookingDraft<T>(draft: T) {
  write(DRAFT_KEY, draft);
}

/** Reads without removing, so it is safe inside React state initializers (they may run twice in development). */
export function peekBookingDraft<T>(): T | null {
  return read<T>(DRAFT_KEY, false);
}

export function clearBookingDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
