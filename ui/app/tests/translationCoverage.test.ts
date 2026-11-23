import { describe, expect, it } from 'vitest';

import { ALL_KEYS, LOCALES, entryFor } from '../i18n/strings';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- plain ESM script, no declaration file
import { scanApp } from '../../../scripts/scan-untranslated.mjs';

/**
 * The guard behind the translation work.
 *
 * Two rounds of "o conteúdo da página não está traduzido" came from replacing
 * strings by hand and believing the job was finished. Eyeballing 35 files does
 * not scale and does not survive the next edit, so this walks the TypeScript AST
 * of every page, feature and component and fails when prose reaches the screen
 * without going through the dictionary.
 *
 * If this test fails, the fix is to add a key to `i18n/pages.ts` (with both
 * locales, which the type already enforces) and call `t()` — not to widen the
 * scanner's allow list.
 */

interface Finding {
  line: number;
  text: string;
  kind: string;
}

interface FileResult {
  file: string;
  findings: Finding[];
}

describe('translation coverage', () => {
  it('leaves no user-facing English literal outside the dictionary', () => {
    const results = scanApp() as FileResult[];

    const report = results
      .map(({ file, findings }) =>
        findings.map((finding) => `${file}:${finding.line} [${finding.kind}] ${finding.text}`).join('\n'),
      )
      .join('\n');

    expect(report).toBe('');
    // It scans every source file: it took 5.4 s under the full suite (default limit 5 s) and about 4 s alone.
  }, 30_000);
});

describe('dictionary', () => {
  it('has a non-empty translation for every key in every locale', () => {
    const incomplete: string[] = [];
    for (const key of ALL_KEYS) {
      const entry = entryFor(key);
      for (const locale of LOCALES) {
        if (entry[locale] === undefined || entry[locale].trim() === '') {
          incomplete.push(`${key} (${locale})`);
        }
      }
    }
    expect(incomplete).toEqual([]);
  });

  it('never leaves a Portuguese entry identical to English for a full sentence', () => {
    // Short labels legitimately match — "Kubernetes", "Status", "Cluster". A
    // long identical string is almost always a forgotten translation.
    const suspicious = ALL_KEYS.filter((key) => {
      const entry = entryFor(key);
      return entry.en.length > 45 && entry.en === entry['pt-BR'];
    });
    expect(suspicious).toEqual([]);
  });

  it('keeps placeholders consistent across locales', () => {
    const mismatched: string[] = [];
    for (const key of ALL_KEYS) {
      const entry = entryFor(key);
      const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      const en = placeholders(entry.en).join(',');
      const pt = placeholders(entry['pt-BR']).join(',');
      // A missing placeholder in one locale renders a literal `{count}` on
      // screen, which is the kind of defect a customer notices immediately.
      if (en !== pt) mismatched.push(`${key}: en[${en}] vs pt-BR[${pt}]`);
    }
    expect(mismatched).toEqual([]);
  });
});
