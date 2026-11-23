import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { DENSE_FROM, PageSummary, type SummaryItem } from '../components/PageSummary';
import { StudioProvider } from '../config/StudioContext';
import { problemCategoryLabel } from '../features/problems/categoryLabel';
import { observed } from '../models/provenance';

/**
 * 3.3.11 — the Discoveries stage on the chart engine (lot 2): Dynatrace Intelligence, Security and
 * Competitor overlap open on cockpit rows; a summary band with six or more figures keeps to one
 * line (the Logs band had its sixth figure alone on a second line). No query, scope or figure is
 * added or removed.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const evidence = { queryId: 'log.quality', source: 'logs', timeframe: 'last 30 minutes' };
const item = (key: string): SummaryItem => ({ key, label: key, fact: observed(1, evidence), display: '1' });

describe('the summary band', () => {
  it('tightens its columns from six figures, so a desktop band stays on one line', () => {
    expect(DENSE_FROM).toBe(6);
    const wrap = (count: number) =>
      render(
        <AppRoot>
          <StudioProvider>
            <PageSummary items={Array.from({ length: count }, (_, index) => item(`k${index}`))} />
          </StudioProvider>
        </AppRoot>,
      ).container;
    // 3.5.0: the band is a row of StratoKpi cards; from six figures its columns are narrower (150 px, values capped
    // at 28 px) so a desktop band stays on one line.
    const dense = wrap(6);
    expect(dense.querySelector('.pvs-summary-band')?.getAttribute('data-dense')).toBe('true');
    expect((dense.querySelector('.pvs-summary') as HTMLElement).style.getPropertyValue('--pvs-skpi-min')).toBe('150px');
    expect(wrap(5).querySelector('.pvs-summary-band')?.getAttribute('data-dense')).toBeNull();
  });
});

describe('the Discoveries pages on the engine', () => {
  it('put the Assist and the main visual in cockpit rows', () => {
    const ai = read('ui/app/pages/AiInsightsCenter.tsx');
    expect(ai).toContain('<CockpitRow data-testid="ai-cockpit-1">');
    // 3.5.3: the row stretches its tiles to one height (the posture gauges centred in theirs) — no hole beside the donut.
    expect(ai).toContain('<CockpitRow data-testid="ai-cockpit-2">');
    expect(ai).toMatch(/assistSentences\.length > 0 && \(/);
    const sec = read('ui/app/pages/SecurityAndRuntimeRisk.tsx');
    expect(sec).toContain('<CockpitRow data-testid="sec-cockpit">');
    expect(sec).toMatch(/assistSentences\.length > 0 && \(/);
    expect(read('ui/app/pages/CompetitorIntelligence.tsx')).toContain('<CockpitRow data-testid="comp-cockpit">');
  });

  it('draws the problem mix from the aggregate and the arrivals with a derived mean, never a sum of a capped list', () => {
    const ai = read('ui/app/pages/AiInsightsCenter.tsx');
    expect(ai).toContain('<ProblemArrivals />');
    // 3.4.18: the derived mean is a neutral threshold on the platform's TimeseriesChart, named in text above it.
    expect(read('ui/app/features/cockpit/panels.tsx')).toContain('reference={{ value: mean, label: meanText }}');
    // 3.3.15: the mix moved to features/cockpit/panels.tsx (shared with the deck capture).
    expect(ai).toContain('<ProblemMix />');
    const panels = read('ui/app/features/cockpit/panels.tsx');
    expect(panels).toContain("useCatalogQuery('prob.summary', scope)");
    expect(panels).toContain('centerValue={formatNumber(total)}');
  });

  it('names problem categories the same way on AIOps and Dynatrace Intelligence', () => {
    const t = ((key: string) => `t:${key}`) as Parameters<typeof problemCategoryLabel>[1];
    expect(problemCategoryLabel('SLOWDOWN', t)).toBe('t:p.rca.cat.slowdown');
    expect(problemCategoryLabel('MONITORING_UNAVAILABLE', t)).toBe('MONITORING_UNAVAILABLE');
    expect(read('ui/app/pages/ProblemsRca.tsx')).toContain('problemCategoryLabel(category, t)');
  });
});
