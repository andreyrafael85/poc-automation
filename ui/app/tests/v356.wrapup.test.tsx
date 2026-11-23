import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import { RankedBars } from '../engine/chart/RankedBars';
import { StratoModeProvider } from '../engine/strato';
import { buildCaptureTargets, measurePins, PIN_RADIUS, PIN_TARGET_MAX_SHARE, type PinSpec } from '../features/wrapup/captures';
import { BUDGET, pinLegendText } from '../features/wrapup/spec';
import { WHATS_NEW } from '../components/HelpPanels';
import { entryFor, translate } from '../i18n/strings';

/**
 * 3.5.6 — the owner's validation of 3.5.5 (2026-11-21): the Tech Wrapup's pins fell on the panels' corners and read
 * one to three short lines; he asked for "4 a 5 pins por captura com informações ricas". The v5 proposal's answer,
 * approved with its golden re-pin: every pin on a text the app wrote, a "How to read" legend with the label, the
 * figure, a technical reading and the capability shown, and the legend before the number tiles in the right column.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const t = ((key: Parameters<typeof translate>[0], params?: Record<string, string | number>) => translate(key, 'en', params)) as Parameters<typeof buildCaptureTargets>[0];
const fmt = { compact: (value: number) => String(value) } as unknown as Parameters<typeof buildCaptureTargets>[1];

/** Gives an element a layout box (jsdom has none). */
function boxed<E extends Element>(element: E, rect: { left: number; top: number; width: number; height: number }): E {
  element.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect });
  return element;
}

describe('every capture reads itself in three to five pins, each with its reading', () => {
  it('declares 3–5 pins per capture, each with a technical reading and a capability', () => {
    const targets = buildCaptureTargets(t, fmt);
    expect(targets.length).toBeGreaterThanOrEqual(20);
    for (const target of targets) {
      expect(target.pins.length, target.captureId).toBeGreaterThanOrEqual(3);
      expect(target.pins.length, target.captureId).toBeLessThanOrEqual(BUDGET.pins);
      for (const pin of target.pins) {
        expect(pin.detail ?? '', target.captureId).toMatch(/\w{3,}/);
        expect(pin.capability ?? '', target.captureId).not.toBe('');
        // A reading is a fixed sentence: it never carries a figure of its own (rule 8).
        expect(pin.detail ?? '', target.captureId).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('has every reading and chip in English and Portuguese', () => {
    const fragment = read('ui/app/i18n/v356.ts');
    const keys = [...fragment.matchAll(/'(cap\.[cd]\.[\w.]+)'/g)].map((match) => match[1] ?? '');
    expect(keys.length).toBeGreaterThan(80);
    for (const key of keys) {
      const entry = entryFor(key as Parameters<typeof entryFor>[0]);
      expect(entry.en, key).not.toBe('');
      expect(entry['pt-BR'], key).not.toBe('');
    }
  });

  it('calls the legend "How to read" / "Como ler"', () => {
    expect(entryFor('deck.capture.pins')).toMatchObject({ en: 'How to read', 'pt-BR': 'Como ler' });
  });
});

describe('a pin sits on a text, never on a container', () => {
  const root = () => boxed(document.createElement('div'), { left: 0, top: 0, width: 1000, height: 500 });

  it('drops a pin whose target covers more than a quarter of the panel (the corner pins of 3.5.5)', () => {
    const panel = root();
    const block = boxed(document.createElement('div'), { left: 20, top: 20, width: 900, height: 400 });
    block.className = 'block';
    const word = boxed(document.createElement('span'), { left: 300, top: 200, width: 80, height: 18 });
    word.className = 'word';
    word.textContent = 'host-eu-01';
    panel.append(block, word);
    const specs: PinSpec[] = [
      { find: (r) => r.querySelector('.block'), label: () => 'a container', at: 'top-left' },
      { find: (r) => r.querySelector('.word'), label: (element) => element.textContent, at: 'left', detail: 'The tightest host.', capability: 'Saturation detection' },
    ];
    const pins = measurePins(panel, specs);
    expect(PIN_TARGET_MAX_SHARE).toBe(0.25);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ n: 1, label: 'host-eu-01', detail: 'The tightest host.', capability: 'Saturation detection' });
    // 'left': just before the word, on its line.
    expect(pins[0]?.x).toBeCloseTo((300 - PIN_RADIUS - 8) / 1000, 2);
    expect(pins[0]?.y).toBeCloseTo(209 / 500, 2);
  });

  it('writes the legend line as label, reading and capability', () => {
    expect(pinLegendText({ n: 1, x: 0, y: 0, label: 'host-eu-01: 96%', detail: 'The tightest host.', capability: 'Saturation detection' })).toBe(
      'host-eu-01: 96% The tightest host. · Saturation detection',
    );
    expect(pinLegendText({ n: 2, x: 0, y: 0, label: 'Only a label' })).toBe('Only a label');
  });
});

describe('ranked bars are photographed as rows with their names', () => {
  it('draws the rows as text in a capture, the platform chart on screen', () => {
    const items = [
      { key: 'a', label: 'svc-search-04', value: 533, display: '533 ms', status: 'warning' as const },
      { key: 'b', label: 'svc-checkout-02', value: 494, display: '494 ms', status: 'good' as const },
    ];
    const capture = render(
      <AppRoot>
        <StudioProvider>
          <StratoModeProvider mode="capture">
            <RankedBars items={items} ariaLabel="Slowest" line={{ value: 1000, label: '1.0 s review line' }} />
          </StratoModeProvider>
        </StudioProvider>
      </AppRoot>,
    );
    const rows = capture.container.querySelectorAll('.pvs-ranked[data-mode="capture"] .pvs-ranked__row');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector('.pvs-ranked__label')?.textContent).toBe('svc-search-04');
    expect(capture.container.querySelector('.pvs-ranked__list.pvs-sr-only')).toBeNull();
  });
});

describe('the slide gives the pins room before the number tiles', () => {
  it('fits the legend by giving up tiles first, and draws the reading in both writers', () => {
    const spec = read('ui/app/features/wrapup/spec.ts');
    expect(spec).toContain('const kpiSteps = [kpis.length, 3, 2, 0]');
    expect(BUDGET.pins).toBe(5);
    expect(read('ui/app/features/wrapup/pptxTemplate.ts')).toContain('run(` · ${pin.capability}`');
    expect(read('ui/app/features/wrapup/DeckPreview.tsx')).toContain('data-deck-pin={pin.n}');
    // The harness reads the pins of every capture slide and flags one with fewer than three.
    expect(read('scripts/visual/capture.mjs')).toContain('reads ${slide.pins} pins (3 or more expected)');
  });
});

describe('What’s new', () => {
  it('keeps 3.5.6 among the ten releases', () => {
    // 3.5.7: newer releases come first.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i98')).toBe(false); // 3.6.6 pushed 3.5.6 out of the ten
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i98').en.startsWith('3.5.6 — ')).toBe(true);
    expect(entryFor('help.whatsNew.i98')['pt-BR']).toContain('Como ler');
  });
});
