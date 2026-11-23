import type { StringKey } from '../i18n/strings';
import type { CatalogEntry } from './types';

/**
 * Localised `purpose` of a catalog entry.
 *
 * The catalog is the English source of truth; each entry's sentence is mirrored in the
 * dictionary (`i18n/v31f.ts`) under `catalog.purpose.<id>`, so a Portuguese screen no
 * longer prints an English sentence above every table and chart.
 */

/** Dictionary key for a catalog entry's purpose sentence. */
export function purposeKey(id: string): StringKey {
  return `catalog.purpose.${id}` as StringKey;
}

/**
 * The purpose in the active language. An id that has no dictionary entry (an ad-hoc entry
 * built outside the catalog) falls back to the entry's own text rather than printing the
 * raw key: `translate` returns the key itself when it does not resolve.
 */
export function localizedPurpose(
  entry: Pick<CatalogEntry, 'id' | 'purpose'>,
  translate: (key: StringKey) => string,
): string {
  const key = purposeKey(entry.id);
  const text = translate(key);
  return text === key ? entry.purpose : text;
}
