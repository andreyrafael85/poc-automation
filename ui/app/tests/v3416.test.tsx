import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHART_PALETTE, FAILURE_BAND_COLOR } from '../design/palette';
import { EVIDENCE } from '../engine/evidence';
import { entryFor } from '../i18n/strings';
import type { Provenance } from '../models/provenance';

/**
 * 3.4.16 — AI presence, Categorical Vivid, "Status and health", neutral provenance and the platform's type (design
 * proposal D-21, D-01, D-10, D-24, D-31, D-32, D-04), from the owner's order of 2026-11-19 to follow the
 * recommendations: "encantador e magnífico sem perder a essência e dados". Look only — no reading changed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const APP = join(process.cwd(), 'ui/app');
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'tests' || name === 'node_modules' ? [] : cssFiles(path);
    return name.endsWith('.css') ? [path] : [];
  });

describe('AI presence (D-21)', () => {
  it('labels the app’s own advice "Recommendation", and keeps the deck’s label until the owner orders it', () => {
    for (const key of ['assist.eyebrow', 'assist.tech.eyebrow', 'p.dx2.assist.eyebrow', 'p.sec.assist.eyebrow', 'cockpit.assist.title'] as const) {
      expect(entryFor(key), key).toEqual({ en: 'Recommendation', 'pt-BR': 'Recomendação' });
    }
    expect(entryFor('tw.assist.label').en).toBe('Dynatrace Assist');
    expect(entryFor('p.rca.analysis.subtitle').en).not.toContain('Dynatrace Assist');
    expect(read('ui/app/engine/chart/AssistCard.tsx')).not.toContain('✦');
  });

  it('marks only what Dynatrace Intelligence produced: its problem explanation and its categories', () => {
    expect(read('ui/app/pages/ProblemsRca.tsx')).toContain("subtitle={t('p.rca.analysis.subtitle')} ai>");
    expect(read('ui/app/features/cockpit/panels.tsx')).toContain('trailing={<IntelligenceMark />}');
    expect(read('ui/app/components/IntelligenceMark.tsx')).toContain('<AiIcon />');
  });
});

describe('colour (D-01, D-10, D-24, D-04)', () => {
  it('draws categories in Categorical Vivid, in its own order', () => {
    expect(CHART_PALETTE.category).toHaveLength(6);
    CHART_PALETTE.category.forEach((colour, index) => expect(colour).toContain(`categorical-vivid-color-0${index + 1}`));
  });

  it('reads failure bands on the platform’s Status and health scale', () => {
    expect(FAILURE_BAND_COLOR.under).toContain('status-good');
    // 3.4.18: the Overview's services split takes the band colours themselves (Ideal for no failure).
    expect(read('ui/app/pages/CommandCenter.tsx')).toContain('color: FAILURE_BAND_COLOR.none');
  });

  it('never paints provenance with a health colour', () => {
    const tones = (Object.keys(EVIDENCE) as Provenance[]).map((provenance) => EVIDENCE[provenance].tone);
    expect(tones.filter((tone) => tone === 'success' || tone === 'warning' || tone === 'critical')).toEqual([]);
  });

  it('sets numerals in neutral ink, the family colour on the marks', () => {
    const css = read('ui/app/engine/spectrum.css');
    const rule = css.slice(css.indexOf(".pvs-figure[data-ink='spectrum'] .pvs-figure__value {"), css.indexOf('}', css.indexOf(".pvs-figure[data-ink='spectrum'] .pvs-figure__value {")));
    expect(rule).toContain('color: var(--dt-colors-text-neutral-default)');
    expect(rule).not.toContain('background-clip');
  });
});

describe('type (D-31, D-32)', () => {
  it('asks only for the DT Flow weights the platform loads, and never for text under 12 px', () => {
    const offenders: string[] = [];
    for (const file of cssFiles(APP)) {
      // Screen text only: paper (rules inside `@media print`, in points) follows print typography (3.4.17).
      const css = readFileSync(file, 'utf8').replace(/@media print \{[\s\S]*?\n\}/g, '');
      if (/font-weight:\s*(700|800|bold)\b/.test(css)) offenders.push(`${file}: weight`);
      if (/font-size:\s*(?:[0-9]|1[01])(?:\.\d+)?px/.test(css)) offenders.push(`${file}: size`);
    }
    expect(offenders).toEqual([]);
  });

  it('sets a figure that stands alone in proportional numerals ("6.9 h", not "6 .9 h")', () => {
    expect(read('ui/app/engine/engine.css')).toMatch(/\.pvs-figure \{[^}]*font-variant-numeric: proportional-nums;/);
  });
});
