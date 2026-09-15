import 'server-only';

import en from '../../dictionaries/en.json';
import th from '../../dictionaries/th.json';

import type { Locale } from './config';
import type { Dictionary } from './types';

// Typed assignment: the build fails if th.json misses a key that en.json has.
const thDictionary: Dictionary = th;

const dictionaries: Record<Locale, Dictionary> = { en, th: thDictionary };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
