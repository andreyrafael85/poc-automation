import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { buildCaptureTargets, measurePins } from '../features/wrapup/captures';
import { targetsOf } from '../features/wrapup/prints/capture/readScreen';
import { LAYOUTS } from '../features/wrapup/prints/plan/pinTemplates';
import { PRINT_BUDGET } from '../features/wrapup/prints/deck/budget';
import type { PrintRecord } from '../features/wrapup/prints/types';
import { entryFor, translate } from '../i18n/strings';

/**
 * 3.5.7 — the owner's validation of 3.5.6 (2026-11-21): on the Tech Wrapup, slide 5's pins 1 and 2 wrong (the
 * calendar), slide 6's pins 3 and 4 saying the same (the RCA trail), slide 20's pins over the icons (the value chain);
 * on the Real proofs, the problem screen with only two pins and a screen without pins.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const t = ((key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params)) as Parameters<typeof buildCaptureTargets>[0];
const fmt = { compact: (value: number) => String(value) } as unknown as Parameters<typeof buildCaptureTargets>[1];
const target = (id: string) => buildCaptureTargets(t, fmt).find((entry) => entry.captureId === id);

function boxed<E extends Element>(element: E, rect: { left: number; top: number; width: number; height: number }): E {
  element.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect });
  return element;
}

describe('Tech Wrapup — the pins of slides 5, 6 and 20', () => {
  it('pins the busiest day on its total and the busiest slot inside its own cell, with the window’s sentence', () => {
    const pins = target('problems.calendar')?.pins ?? [];
    expect(pins).toHaveLength(4);
    expect(pins.map((pin) => pin.at)).toEqual(['right', 'inside-left', 'right', 'right']);
    const source = read('ui/app/features/wrapup/captures.tsx');
    expect(source).toContain("find: busiest('.pvs-heatcal__sum')");
  });

  it('places an inside-left pin in its cell, clear of the figure the cell centres', () => {
    const panel = boxed(document.createElement('div'), { left: 0, top: 0, width: 1000, height: 400 });
    const cell = boxed(document.createElement('td'), { left: 500, top: 100, width: 140, height: 36 });
    cell.textContent = '92';
    panel.append(cell);
    const [pin] = measurePins(panel, [{ find: (root) => root.querySelector('td'), label: () => 'Busiest slot', at: 'inside-left' }]);
    expect(pin?.x).toBeGreaterThan(0.5);
    expect(pin?.x).toBeLessThan(0.54);
    expect(pin?.y).toBeCloseTo(118 / 400, 2);
  });

  it('reads the RCA trail without repeating itself: the affected with the count, who calls the root, where it ran', () => {
    const pins = target('rca.trail')?.pins ?? [];
    expect(pins).toHaveLength(5);
    expect(pins.map((pin) => pin.capability)).toEqual([
      t('cap.c.detection'),
      t('cap.c.rootCause'),
      t('cap.c.smartscape'),
      t('cap.c.tracing'),
      t('cap.c.k8s'),
    ]);
  });

  it('reads the Kubernetes context as separate words', () => {
    const pin = (target('rca.trail')?.pins ?? [])[4];
    const el = (tag: string, className: string | null, ...children: (Node | string)[]) => {
      const node = document.createElement(tag);
      if (className !== null) node.className = className;
      node.append(...children);
      return node;
    };
    const root = el(
      'div',
      null,
      el('span', 'pvs-label', 'Kubernetes context'),
      el(
        'ul',
        null,
        el('li', 'pvs-tech-chip', el('span', 'pvs-glyph', document.createElementNS('http://www.w3.org/2000/svg', 'svg')), el('span', null, 'k8s-cluster-a'), el('span', 'pvs-tech-chip__count', 'cluster')),
        el('li', 'pvs-tech-chip', el('span', null, 'checkout'), el('span', 'pvs-tech-chip__count', 'namespace')),
      ),
    );
    const found = pin?.find(root) ?? null;
    expect(found?.textContent).toBe('Kubernetes context');
    expect(found === null ? null : pin?.label(found)).toBe('Where it ran: k8s-cluster-a cluster · checkout namespace');
  });

  it('pins each step of the value chain after its name, never over its icon', () => {
    const pins = target('roi.chain')?.pins ?? [];
    expect(pins).toHaveLength(5);
    expect(pins.every((pin) => pin.at === 'right')).toBe(true);
  });
});

describe('Real proofs — richer problem screens, and a deck that waits for the reading', () => {
  it('offers the problem screen two more pins the reading finds on any screen', () => {
    const layout = LAYOUTS['problems.detail'];
    expect(layout.pins.map((pin) => pin.anchor?.key)).toEqual(['identity', 'users', 'frontend', 'rootCause', 'signals', 'path', 'events', 'automation']);
    const record = { layout: 'problems.detail', entity: { name: 'x' }, incident: { displayId: 'P-26114811', rootCauseName: 'TradeManagement' }, subject: { kind: 'incident' } } as unknown as PrintRecord;
    const keys = targetsOf(record).map((item) => item.key);
    expect(keys).toEqual(expect.arrayContaining(['events', 'automation', 'rootCause', 'path', 'users', 'identity']));
    expect(PRINT_BUDGET.pins).toBe(6);
  });

  it('counts a queued screen as being read, and the deck waits until every screen is read', () => {
    const store = read('ui/app/features/wrapup/prints/store/usePrintStore.ts');
    expect(store).toContain('setReading((current) => new Set([...current, ...ids]))');
    const panel = read('ui/app/features/wrapup/prints/ui/PrintDeckPanel.tsx');
    expect(panel).toContain('model.baking || readingScreens > 0 ? null');
    expect(read('ui/app/features/wrapup/prints/ui/PrintDeckTab.tsx')).toContain('readingScreens={store.reading.size}');
  });

  it('says when a screen was cut to fit as it was added, with the way to read it whole', () => {
    expect(read('ui/app/features/wrapup/prints/ui/PrintGallery.tsx')).toContain("record.image.normalization === 'cropped'");
    expect(entryFor('prt.read.cropped')['pt-BR']).toContain('Substituir');
  });
});

describe('What’s new', () => {
  it('keeps 3.5.7 among the ten releases', () => {
    // 3.5.8: newer releases come first.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i99')).toBe(false); // 3.6.7 pushed 3.5.7 out of the ten
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i99').en.startsWith('3.5.7 — ')).toBe(true);
  });
});
