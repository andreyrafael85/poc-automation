import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APP_VERSION } from '../config/appInfo';
import { mergeRun, parseSnapshot, thisVersion, EMPTY_SNAPSHOT } from '../features/wrapup/captureStore';

/**
 * 3.3.19 — the owner's 3.3.18 review: the Tech Wrapup's slide 5 kept "This read has no data for its
 * panel" although the page draws the chart. A "no data" mark blocked the section for the read (no
 * button, left out of "Capture what is missing"), and a mark or picture of an older version — when
 * Problems' arrivals was another panel under the same id — still counted. Now a "no data" panel is
 * tried again, and only this version's pictures and marks count.
 */

const READ = { windowEnd: '2026-11-17T19:04:00.000Z', locale: 'pt-BR' };
const CAPTURE = { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 900, height: 400, pins: [] };
const sectionOf = (id: string) => (id === 'problems.arrivals' ? 'problems' : undefined);

describe('captures and marks carry the app version', () => {
  it('stamps this version on what a run records, and reads it back', () => {
    const after = mergeRun(EMPTY_SNAPSHOT, { captures: { 'problems.arrivals': CAPTURE }, noData: [] }, sectionOf, READ);
    expect(after.captures[0]?.version).toBe(APP_VERSION);
    expect(thisVersion(after.captures[0]!)).toBe(true);
    const marked = mergeRun(EMPTY_SNAPSHOT, { captures: {}, noData: ['problems.arrivals'] }, sectionOf, READ);
    expect(marked.noData[0]?.version).toBe(APP_VERSION);
    expect(parseSnapshot(JSON.parse(JSON.stringify(marked))).noData[0]?.version).toBe(APP_VERSION);
  });

  it('does not count a mark of an older version (or of none)', () => {
    const old = parseSnapshot({ captures: [], noData: [{ captureId: 'problems.arrivals', sectionId: 'problems', at: '2026-11-17T18:00:00.000Z', ...READ }] });
    expect(old.noData).toHaveLength(1);
    expect(thisVersion(old.noData[0]!)).toBe(false);
    expect(thisVersion({ version: '3.3.15' })).toBe(false);
  });
});

describe('the readiness strip tries a "no data" panel again', () => {
  const page = readFileSync(join(process.cwd(), 'ui/app/pages/TechWrapup.tsx'), 'utf8');
  it('includes it in what to capture and offers "Try again"', () => {
    expect(page).toContain("states[index] === 'noData'");
    expect(page).toContain("t('deck.ready.retry')");
    expect(page).toContain('thisVersion(stored)');
    expect(page).toContain('thisVersion(mark)');
  });
});
