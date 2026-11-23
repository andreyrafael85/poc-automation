import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { approvalBlockers } from '../features/wrapup/prints/capture/approval';
import { bestMatch, LOCATE_GLOBAL_MIN_SCORE, LOCATE_MIN_SCORE, locateLabels, type Gray } from '../features/wrapup/prints/capture/locate';
import { manualCrop } from '../features/wrapup/prints/capture/normalize';
import { SCREEN_READ, targetsOf } from '../features/wrapup/prints/capture/readScreen';
import type { PrintRecord } from '../features/wrapup/prints/types';
import { entryFor } from '../i18n/strings';

/**
 * 3.5.5 — the first release of the visual proposal v5, after the owner's review of a generated Real-proofs deck
 * (2026-11-21: pins on empty space and on the wrong column, three screens without pins, screens cut at the left) and
 * his direction that partners must not depend on placing pins by hand: an automatic reading of each screen.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

/** A noisy dark picture with a bright "word" (a striped block) stamped at (x, y). */
function picture(width: number, height: number, stamps: { x: number; y: number }[], seed = 7): Gray {
  const data = new Uint8ClampedArray(width * height);
  let s = seed;
  for (let i = 0; i < data.length; i += 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = 20 + (s % 18);
  }
  for (const { x, y } of stamps) {
    for (let j = 0; j < WORD.height; j += 1) for (let i = 0; i < WORD.width; i += 1) data[(y + j) * width + x + i] = 255 - (WORD.data[j * WORD.width + i] ?? 0);
  }
  return { data, width, height };
}

/** A dark-on-light template of a "word": vertical strokes of different widths, like letters. */
const WORD: Gray = (() => {
  const width = 40;
  const height = 12;
  const data = new Uint8ClampedArray(width * height).fill(255);
  for (let i = 0; i < width; i += 1) {
    const ink = [2, 3, 7, 8, 9, 14, 18, 19, 25, 26, 27, 28, 33, 36].includes(i);
    for (let j = 2; j < height - 2; j += 1) if (ink || (j === 6 && i > 10 && i < 16)) data[j * width + i] = 0;
  }
  return { data, width, height };
})();

describe('the automatic reading of a screen finds the platform’s labels', () => {
  it('scores the exact spot of a word at 1, light text on a dark theme included, and refuses a flat template', () => {
    const image = picture(200, 80, [{ x: 120, y: 30 }]);
    const hit = bestMatch(image, WORD, { x: 0, y: 0, w: 200, h: 80 });
    expect(hit).toMatchObject({ x: 120, y: 30 });
    expect(hit?.score).toBeGreaterThan(0.99);
    expect(bestMatch(image, { data: new Uint8ClampedArray(40 * 12).fill(255), width: 40, height: 12 }, { x: 0, y: 0, w: 200, h: 80 })).toBeNull();
  });

  it('keeps a label in its region above the calibrated line, and outside it only when it stands alone', async () => {
    expect(LOCATE_MIN_SCORE).toBe(0.72);
    expect(LOCATE_GLOBAL_MIN_SCORE).toBe(0.82);
    const render = (text: string) => (text === 'Root cause' ? WORD : null);
    const zone = { x0: 0.5, y0: 0, x1: 1, y1: 0.5 };
    const inZone = await locateLabels(picture(320, 200, [{ x: 220, y: 30 }]), [{ key: 'rootCause', texts: ['Root cause'], zone }], render, { sizes: [14], weights: [600] });
    expect(inZone).toEqual([expect.objectContaining({ key: 'rootCause', hit: 0, rect: { x: 220, y: 30, w: 40, h: 12 } })]);
    // The layout moved: found once elsewhere on the screen → kept; found twice → too ambiguous, no pin.
    const moved = await locateLabels(picture(320, 200, [{ x: 20, y: 150 }]), [{ key: 'rootCause', texts: ['Root cause'], zone }], render, { sizes: [14], weights: [600] });
    expect(moved.map((hit) => hit.rect)).toEqual([{ x: 20, y: 150, w: 40, h: 12 }]);
    const twice = await locateLabels(picture(320, 200, [{ x: 20, y: 150 }, { x: 120, y: 150 }]), [{ key: 'rootCause', texts: ['Root cause'], zone }], render, { sizes: [14], weights: [600] });
    expect(twice).toEqual([]);
  });

  it('looks for each pin’s own text, the entity’s and the problem’s names resolved from the print', () => {
    const record = {
      layout: 'problems.detail',
      entity: { id: null, name: null },
      subject: { kind: 'incident' },
      incident: { displayId: 'P-26114811', rootCauseName: 'TradeManagement' },
    } as unknown as PrintRecord;
    const targets = targetsOf(record);
    expect(targets.find((target) => target.key === 'identity')?.texts).toContain('P-26114811');
    expect(targets.find((target) => target.key === 'rootCause')?.texts).toEqual(['Root cause']);
    expect(targets.find((target) => target.key === 'path')?.texts).toEqual(['Visual resolution path']);
  });

  it('runs in the background after a screen is added, and once for a screen added before', () => {
    const store = read('ui/app/features/wrapup/prints/store/usePrintStore.ts');
    expect(store).toContain('queueReads([asset.record.id]);');
    expect(store).toContain('!asset.record.warnings.includes(SCREEN_READ)');
    // 3.5.6: the marker moved to `screen-read:v2` (prints read by 3.5.5 are read again).
    expect(SCREEN_READ.startsWith('screen-read')).toBe(true);
    // No external library, no WebAssembly: the AppEngine CSP allows neither.
    const locate = read('ui/app/features/wrapup/prints/capture/locate.ts');
    expect(locate).not.toMatch(/WebAssembly\.|from 'tesseract|import\(/);
  });
});

describe('a pin is drawn only on a label found, or where the SE put it', () => {
  it('turns a pin left at its estimated spot into an unnumbered line under the legend', () => {
    const pins = read('ui/app/features/wrapup/prints/analysis/pins.ts');
    expect(pins).toContain("const drawn = source.filter((pin) => pin.origin !== 'template');");
    expect(pins).toContain("const notes = source.filter((pin) => pin.origin === 'template').map((pin) => pin.legend);");
    expect(read('ui/app/features/wrapup/prints/deck/PrintSlideViews.tsx')).toContain('data-print-note=""');
    expect(read('ui/app/features/wrapup/prints/deck/pptxPrintSlides.ts')).toContain('layout.legend.slice(slide.pins.length)');
  });

  it('never blocks an approval on pins (a partner need not place them)', () => {
    const record = { pins: [], maskSuggestions: [], identity: 'se-confirmed', source: 'manual', landing: 'unknown' } as unknown as PrintRecord;
    expect(approvalBlockers(record, true)).toEqual([]);
  });

  it('keeps the editor’s guided placement for the SE who wants to add or move a pin', () => {
    expect(read('ui/app/features/wrapup/prints/ui/editor/EditorPanels.tsx')).toContain('data-prt-place={pin.n}');
    expect(read('ui/app/features/wrapup/prints/ui/PrintEditor.tsx')).toContain('return placeAt(placing, at);');
  });
});

describe('a manual snip is not cut at its left edge', () => {
  it('opens the crop on the whole image', () => {
    expect(manualCrop(1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(read('ui/app/features/wrapup/prints/capture/normalize.ts')).toContain('crop: manualCrop(image.width, image.height) };');
  });
});

describe('the technical appendix is an option', () => {
  it('is off by default in the tab and offered as a checkbox', () => {
    expect(read('ui/app/features/wrapup/prints/ui/PrintDeckTab.tsx')).toContain('useState(false);');
    expect(read('ui/app/features/wrapup/prints/ui/PrintDeckPanel.tsx')).toContain('data-testid="prt-include-appendix"');
  });
});

describe('What’s new', () => {
  it('kept 3.5.5 among the ten releases until 3.6.5 pushed it out', () => {
    // 3.5.6: newer releases come first; 3.5.5's entry stayed in the ten until 3.6.5.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i97')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i97').en.startsWith('3.5.5 — ')).toBe(true);
    expect(entryFor('prt.read.found')['pt-BR']).toContain('automaticamente');
  });
});
