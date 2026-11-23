/**
 * Locale primitives, split out so the dictionary can live in more than one file
 * without an import cycle.
 *
 * `strings.ts` re-exports everything here, so callers keep importing from
 * `i18n/strings`.
 */

export const LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português',
};

/** Maps the app locale onto a BCP-47 tag for number and date formatting. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: 'en-GB',
  'pt-BR': 'pt-BR',
};

/**
 * One dictionary entry.
 *
 * `Record<Locale, string>` is the whole enforcement mechanism: adding a key
 * without a Portuguese translation is a compile error, not a string that
 * silently falls back to English in front of a customer.
 */
export type Entry = Record<Locale, string>;
