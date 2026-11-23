import { describe, expect, it } from 'vitest';

import { ALL_KEYS, entryFor, translate } from '../i18n/strings';
import { ALL_QUERIES } from '../queries/catalog';
import { localizedPurpose, purposeKey } from '../queries/purpose';

/**
 * The one-sentence `purpose` of each catalog entry is printed above every table and chart
 * and in the "queries behind this section" disclosure. The catalog is English-only, so the
 * Portuguese screens printed an English sentence above each table until every purpose was
 * mirrored in the dictionary. This keeps the two from drifting apart.
 */

const PREFIX = 'catalog.purpose.';

describe('catalog purposes are translated', () => {
  it('has a dictionary entry for every catalog query', () => {
    const keys = new Set<string>(ALL_KEYS);
    const missing = ALL_QUERIES.filter((entry) => !keys.has(purposeKey(entry.id))).map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('keeps the English text identical to the catalog purpose', () => {
    for (const entry of ALL_QUERIES) {
      expect(entryFor(purposeKey(entry.id)).en, entry.id).toBe(entry.purpose);
    }
  });

  it('gives a real Portuguese translation, not a copy of the English', () => {
    for (const entry of ALL_QUERIES) {
      const pt = entryFor(purposeKey(entry.id))['pt-BR'];
      expect(pt.trim().length, entry.id).toBeGreaterThan(0);
      expect(pt, entry.id).not.toBe(entry.purpose);
    }
  });

  it('leaves no curly braces for translate() to mis-substitute', () => {
    for (const entry of ALL_QUERIES) {
      const { en, 'pt-BR': pt } = entryFor(purposeKey(entry.id));
      expect(en, entry.id).not.toMatch(/[{}]/);
      expect(pt, entry.id).not.toMatch(/[{}]/);
    }
  });

  it('has no purpose key without a catalog entry', () => {
    const ids = new Set(ALL_QUERIES.map((entry) => entry.id));
    const orphans = ALL_KEYS.filter((key) => key.startsWith(PREFIX) && !ids.has(key.slice(PREFIX.length)));
    expect(orphans).toEqual([]);
  });

  it('resolves per locale and falls back to the entry text for an unknown id', () => {
    const entry = ALL_QUERIES[0]!;
    expect(localizedPurpose(entry, (key) => translate(key, 'en'))).toBe(entry.purpose);
    expect(localizedPurpose(entry, (key) => translate(key, 'pt-BR'))).not.toBe(entry.purpose);

    const adHoc = { id: 'not.in.the.catalog', purpose: 'Ad-hoc purpose.' };
    expect(localizedPurpose(adHoc, (key) => translate(key, 'pt-BR'))).toBe('Ad-hoc purpose.');
  });
});
