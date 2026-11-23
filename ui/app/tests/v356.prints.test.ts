import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { choose, LOCATE_TIE, LOCATE_WEIGHTS, locateLabels, startsWord, type Candidate, type Gray } from '../features/wrapup/prints/capture/locate';
import { SCREEN_FONT_STACK, SCREEN_READ, SCREEN_READ_V1, targetsOf } from '../features/wrapup/prints/capture/readScreen';
import type { PrintRecord } from '../features/wrapup/prints/types';

/**
 * 3.5.6 — the owner's validation of 3.5.5 (2026-11-21): Real-proofs slides 8, 10 and 12 without pins. The reading
 * drew its templates in a fallback face (it asked for "DT Flow"; the platform loads `DynatraceFlow`), the zones of
 * three layouts held only the reference screen, and a repeated word (a chip, a column header, "Analyze response
 * time") could take a panel title's pin. Checked on the owner's seven screens: 31 labels found (15 in 3.5.5), none on
 * a wrong spot.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

/** A flat dark picture with bright vertical strokes ("ink") in the given boxes. */
function canvas(width: number, height: number, inks: { x: number; y: number; w: number; h: number }[]): Gray {
  const data = new Uint8ClampedArray(width * height).fill(24);
  for (const ink of inks) {
    for (let y = ink.y; y < ink.y + ink.h; y += 1) for (let x = ink.x; x < ink.x + ink.w; x += 1) if (x % 3 === 0) data[y * width + x] = 230;
  }
  return { data, width, height };
}

const candidate = (x: number, y: number, h: number, score: number): Candidate => ({ hit: 0, rect: { x, y, w: 60, h }, score, runnerUp: 0, px: h });

describe('the reading draws the platform’s own typeface', () => {
  it('asks for DynatraceFlow (the family Strato’s AppRoot loads), never "DT Flow"', () => {
    expect(SCREEN_FONT_STACK.startsWith('DynatraceFlow')).toBe(true);
    const source = read('ui/app/features/wrapup/prints/capture/readScreen.ts');
    expect(source).not.toMatch(/fonts\.load\([^)]*DT Flow/);
    expect(SCREEN_FONT_STACK).not.toContain('DT Flow');
    expect(source).toContain('fonts.load(`${weight} 14px ${SCREEN_FONT_FAMILY}`)');
    expect(read('node_modules/@dynatrace/strato-components/styles/textStyle.css')).toContain('DynatraceFlow');
  });

  it('searches regular, medium and semibold labels', () => {
    expect([...LOCATE_WEIGHTS]).toEqual([400, 500, 600]);
  });

  it('reads a print read by 3.5.5 again, once, and replaces what that reading found', () => {
    expect(SCREEN_READ).toBe('screen-read:v2');
    expect(SCREEN_READ_V1).toBe('screen-read');
    const store = read('ui/app/features/wrapup/prints/store/usePrintStore.ts');
    expect(store).toContain('const reread = record.warnings.includes(SCREEN_READ_V1);');
    expect(store).toContain('warnings: [...record.warnings.filter((warning) => warning !== SCREEN_READ_V1), SCREEN_READ]');
    // Every label at every size: the 3.5.5 narrowing around the first label found is gone.
    expect(read('ui/app/features/wrapup/prints/capture/locate.ts')).not.toContain('size >= px * 0.65');
  });
});

describe('a repeated word keeps its pin on the panel’s title', () => {
  it('knows a word that starts a label from one inside a sentence', () => {
    // "Analyze response time": ink right before "response"; the title "Response time" has none.
    const image = canvas(400, 60, [{ x: 20, y: 10, w: 70, h: 14 }]);
    expect(startsWord(image, { x: 96, y: 10, w: 80, h: 14 })).toBe(false);
    expect(startsWord(image, { x: 220, y: 10, w: 80, h: 14 })).toBe(true);
  });

  it('prefers, among near ties, the spot that starts a word, then the larger text', () => {
    const image = canvas(600, 200, [{ x: 20, y: 10, w: 70, h: 14 }]);
    const inside = candidate(96, 10, 14, 0.8);
    const title = candidate(300, 10, 14, 0.8 - LOCATE_TIE / 2);
    expect(choose(image, [inside, title], 0.72)).toBe(title);
    // "Endpoints" (the panel's title, larger) over the table's "Endpoint" column header.
    const header = candidate(300, 150, 14, 0.783);
    const heading = candidate(300, 90, 18, 0.781);
    expect(choose(image, [header, heading], 0.72)).toBe(heading);
    // A clear winner stays the winner, and nothing under the floor is kept.
    expect(choose(image, [candidate(300, 150, 14, 0.9), candidate(300, 90, 18, 0.75)], 0.72)?.score).toBe(0.9);
    expect(choose(image, [candidate(300, 150, 14, 0.6)], 0.72)).toBeNull();
  });

  it('lets the identity of a screen share its spot with a pin’s label when no pin points at the identity', () => {
    const vulns = { layout: 'vulns.list', entity: { name: 'x' }, incident: null, subject: { kind: 'security' } } as unknown as PrintRecord;
    expect(targetsOf(vulns).find((target) => target.key === 'identity')?.shares).toBe(true);
    const service = { layout: 'services.details', entity: { name: 'loan-checker' }, incident: null, subject: { kind: 'service' } } as unknown as PrintRecord;
    expect(targetsOf(service).find((target) => target.key === 'identity')?.shares).toBeUndefined();
  });

  it('keeps both a shared identity and the pin label it overlaps', async () => {
    const image = canvas(200, 60, [{ x: 30, y: 20, w: 60, h: 12 }]);
    const template: Gray = (() => {
      const data = new Uint8ClampedArray(66 * 16).fill(255);
      for (let y = 2; y < 14; y += 1) for (let x = 2; x < 64; x += 1) if ((x + 1) % 3 === 0) data[y * 66 + x] = 0;
      return { data, width: 66, height: 16 };
    })();
    const zone = { x0: 0, y0: 0, x1: 1, y1: 1 };
    const hits = await locateLabels(image, [
      { key: 'runtime', texts: ['word'], zone },
      { key: 'identity', texts: ['word'], zone, shares: true },
    ], () => template, { sizes: [12], weights: [400], global: false });
    expect(hits.map((hit) => hit.key).sort()).toEqual(['identity', 'runtime']);
  });
});

describe('the zones hold the owner’s screens as well as the reference ones', () => {
  it('covers the service details with and without the service list, and the cluster details full width', () => {
    const pins = read('ui/app/features/wrapup/prints/plan/pinTemplates.ts');
    expect(pins).toContain("{ key: 'responseTime', match: ['Response time'], zone: zone(0, 0.21, 0.5, 0.33)");
    expect(pins).toContain("{ key: 'failureRate', match: ['Failure rate'], zone: zone(0, 0.4, 0.5, 0.57)");
    expect(pins).toContain("{ key: 'memory', match: ['Memory'], zone: zone(0.2, 0.24, 1, 0.43)");
    expect(pins).toContain("identity: { match: 'clusterName', zone: zone(0, 0, 1, 0.2) }");
  });
});
