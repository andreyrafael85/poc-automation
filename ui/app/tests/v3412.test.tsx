import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NAVIGATION, STORY_STAGES } from '../config/navigation';
import { measurePins } from '../features/wrapup/captures';
import { storyKpiWidth } from '../features/wrapup/geometry';
import { deckBoldEm, kpiFitSize, KPI_MIN_PT } from '../features/wrapup/spec';
import { ALL_KEYS, entryFor } from '../i18n/strings';

/**
 * 3.4.12 — from the owner's validation of 3.4.11 (2026-11-19): one Coverage page (the Assessment and the old
 * Coverage page merged), "Dynatrace Intelligence" for what was "Davis", the Tech Wrapup's numbers fitted to their
 * tiles and the busiest-day pin on the busiest day's row. No new query, no new scope, no money.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('one Coverage page', () => {
  it('lives at /coverage, opens the Coverage stage, and /assessment only redirects there', () => {
    expect(NAVIGATION.some((section) => section.route === '/assessment')).toBe(false);
    expect(NAVIGATION.filter((section) => section.route === '/coverage')).toHaveLength(1);
    expect(STORY_STAGES.find((stage) => stage.id === 'coverage')?.routes[0]).toBe('/coverage');
    const app = read('ui/app/App.tsx');
    expect(app).toContain('<Route path="/coverage" element={<Assessment />} />');
    expect(app).toContain('<Route path="/assessment" element={<ToCoverage />} />');
    expect(app).toContain("<Navigate to={{ pathname: '/coverage', search, hash }} replace />");
    expect(app).not.toContain('EnvironmentCoverage');
  });

  it('carries what the old Coverage page showed in its "What is mapped" tab', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain("<Tab title={t('asm.tab.mapped')} keepMounted>");
    expect(page).toContain('<CoverageInventory />');
    const inventory = read('ui/app/features/assessment/CoverageInventory.tsx');
    for (const id of ['cov.inventory', 'cov.buckets', 'cov.hosts.breakdown']) expect(inventory).toContain(id);
    expect(inventory).toContain('<CockpitRow data-testid="cov-cockpit"');
    expect(entryFor('asm.tab.mapped')).toEqual({ en: 'What is mapped', 'pt-BR': 'O que está mapeado' });
  });

  it('no longer says "Assessment" anywhere the user reads', () => {
    // What's new for 3.4.12 names the old word once, to say it changed.
    const said = ALL_KEYS.filter((key) => key !== 'help.whatsNew.i85').filter((key) => {
      const entry = entryFor(key);
      return /Assessment/.test(entry.en) || /Assessment/.test(entry['pt-BR']);
    });
    expect(said).toEqual([]);
    expect(entryFor('nav.coverage')).toEqual({ en: 'Coverage', 'pt-BR': 'Cobertura' });
    expect(entryFor('p.asm.title')).toEqual({ en: 'Coverage', 'pt-BR': 'Cobertura' });
    expect(entryFor('tw.asm.title')).toEqual({ en: 'Environment coverage', 'pt-BR': 'Cobertura do ambiente' });
  });

  it('points the cross-links of the Roadmap and Opportunities at /coverage', () => {
    for (const file of ['ui/app/pages/Roadmap.tsx', 'ui/app/pages/ImprovementOpportunities.tsx']) {
      expect(read(file), file).toContain('to="/coverage"');
      expect(read(file), file).not.toContain('to="/assessment"');
    }
  });
});

describe('Dynatrace Intelligence, never "Davis", in what the user reads', () => {
  it('has no "Davis" left in any text of either locale', () => {
    const said = ALL_KEYS.filter((key) => key !== 'help.whatsNew.i85').filter((key) => {
      const entry = entryFor(key);
      return /\bDavis\b/.test(entry.en) || /\bDavis\b/.test(entry['pt-BR']);
    });
    expect(said).toEqual([]);
  });
});

describe('the feminine "a Dynatrace Intelligence" stays in Portuguese', () => {
  it('never leaks a Portuguese article into an English text (3.4.13: "Na Dynatrace Intelligence use…")', () => {
    const leaked = ALL_KEYS.filter((key) => /\b(Na|Da|Pela|À|na|da|pela|à) Dynatrace Intelligence/.test(entryFor(key).en));
    expect(leaked).toEqual([]);
  });
});

describe('the Tech Wrapup numbers fit their tiles', () => {
  const EMU_PER_PT = 12700;
  const INSET_PT = 7.2;
  const fits = (value: string, size: number, width: number) => deckBoldEm(value) * size * 1.12 <= width / EMU_PER_PT - 2 * INSET_PT + 1e-9;

  it('sets the owner’s incident id and every short value so it ends inside its tile, with room to spare', () => {
    for (const count of [3, 4, 5, 6]) {
      const width = storyKpiWidth(count);
      for (const value of ['P-26114811', '7.1 h', 'TradeManagement', '2/5 · Foundational', '80/100', '216,431']) {
        const size = kpiFitSize(value, 26, width);
        expect(size).toBeGreaterThanOrEqual(KPI_MIN_PT);
        if (size > KPI_MIN_PT) expect(fits(value, size, width), `${value} in ${count}`).toBe(true);
      }
    }
    // The case the owner showed: 26 pt left it 2 % from the edge; it now steps down.
    expect(kpiFitSize('P-26114811', 26, storyKpiWidth(4))).toBeLessThan(26);
    expect(kpiFitSize('7', 26, storyKpiWidth(4))).toBe(26);
  });

  it('is applied to every number tile by both writers', () => {
    expect(read('ui/app/features/wrapup/pptxTemplate.ts')).toContain('sz: kpiFitSize(kpi.value, size(kpi.value, kpis.length), rect.w)');
    expect(read('ui/app/features/wrapup/DeckPreview.tsx')).toContain('fontSize: pt(kpiFitSize(kpi.value, size(kpi.value, kpis.length), (rects[index] as Rect).w))');
  });
});

function place(element: Element, rect: { left: number; top: number; width: number; height: number }) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect }),
  });
}

describe('the busiest-day pin of the heat calendar', () => {
  it('sits beside the busiest day’s total, on that day’s row, not on the row above (3.5.7: right after the number itself)', () => {
    const root = document.createElement('div');
    const rows = [
      ['Tue', '71', 100],
      ['Wed', '319', 130],
      ['Thu', '286', 160],
    ] as const;
    for (const [day, total, top] of rows) {
      const label = document.createElement('span');
      label.textContent = day;
      const cell = document.createElement('span');
      cell.className = 'pvs-heatcal__total';
      cell.textContent = total;
      root.append(label, cell);
      place(label, { left: 10, top, width: 40, height: 24 });
      place(cell, { left: 600, top, width: 60, height: 24 });
    }
    place(root, { left: 0, top: 0, width: 700, height: 300 });
    const busiest = (r: HTMLElement) => [...r.querySelectorAll('.pvs-heatcal__total')].sort((a, b) => Number(b.textContent) - Number(a.textContent))[0] ?? null;
    const [pin] = measurePins(root, [{ find: busiest, label: (el) => `Busiest day: ${el.textContent}`, at: 'right' }]);
    expect(pin?.label).toBe('Busiest day: 319');
    // The Wednesday row spans 130–154 px of 300: the pin's centre is on it.
    expect((pin?.y ?? 0) * 300).toBeGreaterThanOrEqual(130);
    expect((pin?.y ?? 0) * 300).toBeLessThanOrEqual(154);
    expect((pin?.x ?? 0) * 700).toBeGreaterThan(660);
    expect(read('ui/app/features/wrapup/captures.tsx')).toMatch(/cap\.pin2\.busiestDay[\s\S]{0,200}at: 'right'/);
  });
});
