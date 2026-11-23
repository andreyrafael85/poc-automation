import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FIREWALL_STEPS, PREREQ_SECTIONS } from '../features/prerequisites/content';
import { splitLabel } from '../features/prerequisites/PrerequisitesGuide';
import { entryFor, type StringKey } from '../i18n/strings';

/**
 * 3.5.0 — from the owner's validation of 3.4.18 (2026-11-20): Settings → Prerequisites is shared with the customer, so
 * it speaks to the customer's own teams; the connectivity drawing is larger on the PDF and no label leaves its box.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('the connectivity drawing keeps every label inside its box', () => {
  it('splits a long label at the word break that keeps the longer line shortest', () => {
    expect(splitLabel('Your hosts', 20)).toEqual(['Your hosts']);
    expect(splitLabel('Navegadores dos seus usuários', 20)).toEqual(['Navegadores dos', 'seus usuários']);
    expect(splitLabel('opcional · um único ponto de saída', 26)).toEqual(['opcional · um único', 'ponto de saída']);
  });

  it('fits each label of the drawing in both languages (the box widths are set for these limits)', () => {
    const limits: [StringKey, number][] = [
      ['prq.diagram.hosts', 20],
      ['prq.diagram.oneagent', 26],
      ['prq.diagram.activegate', 22],
      ['prq.diagram.optional', 26],
      ['prq.diagram.browsers', 20],
      ['prq.diagram.cluster', 20],
      ['prq.diagram.clusterSub', 24],
    ];
    for (const [key, max] of limits) {
      for (const locale of ['en', 'pt-BR'] as const) {
        const lines = splitLabel(entryFor(key)[locale], max);
        expect(lines.length, `${key} ${locale}`).toBeLessThanOrEqual(2);
        for (const line of lines) expect(line.length, `${key} ${locale}: ${line}`).toBeLessThanOrEqual(max);
      }
    }
    // The drawing is larger on the PDF than in 3.4.17 (165 mm).
    expect(read('ui/app/features/prerequisites/prerequisites.css')).toContain('max-width: 235mm;');
  });
});

describe('a guide written for the customer', () => {
  it('opens the PDF with its own introduction for the customer’s teams', () => {
    const guide = read('ui/app/features/prerequisites/PrerequisitesGuide.tsx');
    const pdf = guide.slice(guide.indexOf('const PrintDocument'), guide.indexOf('export const PrerequisitesGuide'));
    expect(pdf).toContain("t('prq.pdf.intro')");
    expect(pdf).not.toContain("t('prq.intro')");
    expect(entryFor('prq.pdf.intro')['pt-BR']).toContain('os seus times');
  });

  it('never speaks of the SE, the partner or “the customer” in what the customer reads', () => {
    const keys: StringKey[] = [
      'prq.pdf.intro',
      'prq.pdf.when',
      'prq.pdf.footer',
      'prq.diagram.title',
      'prq.diagram.caption',
      'prq.ips.title',
      'prq.ips.caption',
      ...PREREQ_SECTIONS.flatMap((section) => [section.titleKey, section.whoKey, ...section.items.map((item) => item.key)]),
      ...FIREWALL_STEPS.map((step) => step.key),
    ];
    for (const key of keys) {
      const entry = entryFor(key);
      for (const text of [entry.en, entry['pt-BR']]) expect(text, key).not.toMatch(/\bSE\b/);
      expect(entry.en, key).not.toMatch(/partner|the customer/i);
      expect(entry['pt-BR'], key).not.toMatch(/parceiro|do cliente|o cliente\b/i);
    }
  });
});

describe('wave 2 — the shared pieces on the platform’s charts', () => {
  it('draws the summary band, every ring, the trends and the ranked bars with engine/strato', () => {
    expect(read('ui/app/components/PageSummary.tsx')).toContain('<StratoKpi');
    expect(read('ui/app/components/spectrum/GaugeRing.tsx')).toContain('<StratoDial value={pct} />');
    expect(read('ui/app/components/TrendChart.tsx')).toContain('<StratoTimeseries');
    expect(read('ui/app/engine/chart/RankedBars.tsx')).toContain('<StratoBars');
    // No spectrum edge on the trend and ring-and-ranking panels any more.
    expect(read('ui/app/components/TrendChart.tsx')).not.toContain('pvs-spec-band__edge');
    expect(read('ui/app/engine/chart/RingRankPanel.tsx')).not.toContain('pvs-spec-band__edge');
  });

  it('prints every number as the app’s text (the SingleValue and the dial centre lose their screen measure on paper)', () => {
    const kpi = read('ui/app/engine/strato/StratoKpi.tsx');
    expect(kpi).toContain('className="pvs-skpi__print"');
    const css = read('ui/app/engine/strato/strato.css');
    expect(css).toMatch(/@media print \{[\s\S]*\.pvs-skpi__screen \{\s*display: none;/);
    expect(read('ui/app/components/spectrum/GaugeRing.tsx')).toContain('className="pvs-gauge__reading"');
    // The SE Report is a printed document: every platform chart in it at a fixed width, still.
    expect(read('ui/app/pages/ValueReport.tsx')).toContain('<StratoModeProvider mode="print">');
  });
});
