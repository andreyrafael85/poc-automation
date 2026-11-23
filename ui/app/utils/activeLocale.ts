/**
 * The active display locale, for code that cannot call a hook.
 *
 * React components get their formatters from `useTranslation()`. Pure utilities —
 * `formatNanos`, `formatBytes`, the insight sentence builders — have no hook, yet they
 * produce text a customer reads ("6.9 h", "1.23%"). Without a locale they printed an
 * English decimal point on a Portuguese screen. `StudioProvider` sets the tag while it
 * renders, so every child that renders afterwards in the same pass reads the new one.
 *
 * Module state is the usual compromise for this (i18n libraries keep a global language);
 * the tag is a plain string and the setter is idempotent.
 */

let activeTag = 'en-GB';

export function setActiveLocaleTag(tag: string): void {
  activeTag = tag;
}

export function activeLocaleTag(): string {
  return activeTag;
}

/** A fixed number of decimals in the active locale: `decimal(1.5, 2)` → "1.50" / "1,50". */
export function decimal(value: number, digits: number): string {
  return value.toLocaleString(activeTag, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
