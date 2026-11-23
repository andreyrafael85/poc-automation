import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { KpiHero } from '../components/spectrum/KpiHero';
import { StudioProvider } from '../config/StudioContext';
import { layoutStack, STACK_GEOMETRY } from '../models/stackMap';
import { observed } from '../models/provenance';

/**
 * 3.3.8 — the owner's review of 3.3.7 and the lighthouse pages on the chart engine:
 * every Overview headline carries a measured graphic (never an invented trend), the stack map is
 * compact, and the Executive summary, Root cause and Value & ROI read their figures against the
 * PoC's own criteria.
 */

const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );
const evidence = { queryId: 'svc.ranking.total', source: 'services', timeframe: 'last 24 hours' };

describe('a KPI without a time series shows a measured split, never a trend', () => {
  it('draws one segment per measured count, spoken as a list', () => {
    const { container } = wrap(
      <KpiHero
        eyebrow="Services traced"
        value="70"
        fact={observed(70, evidence)}
        meter={{
          label: 'Services by failure band',
          segments: [
            { key: 'above', label: 'Above the 1 % line', value: 5, tone: 'critical' },
            { key: 'failing', label: 'With failures, under 1 %', value: 18, tone: 'warning' },
            { key: 'clean', label: 'Without failures', value: 47, tone: 'good' },
          ],
        }}
        trend="5 above 1 % · 18 with failures · 47 without"
      />,
    );
    const meter = screen.getByRole('img', { name: /Services by failure band/ });
    expect(meter.getAttribute('aria-label')).toContain('Above the 1 % line 5');
    // 3.6.0 (owner: the mini bars on every card): the split is a row of ticks, each part its share in its own colour.
    expect(container.querySelectorAll('.pvs-ssplit .pvs-sticks__tick')).toHaveLength(24);
  });

  it('keeps the sparkline where a series exists, and draws nothing for an empty split', () => {
    const { container } = wrap(
      <KpiHero
        eyebrow="Active problems"
        value="41"
        fact={observed(41, evidence)}
        spark={{ points: [1, 4, 2, 6], label: 'per 6 h' }}
        meter={{ label: 'x', segments: [{ key: 'a', label: 'a', value: 3 }] }}
      />,
    );
    expect(container.querySelector('.pvs-kpi__meter')).toBeNull();
    const empty = wrap(<KpiHero eyebrow="E" value="0" fact={observed(0, evidence)} meter={{ label: 'x', segments: [{ key: 'a', label: 'a', value: 0 }] }} />);
    expect(empty.container.querySelector('.pvs-kpi__meter')).toBeNull();
  });

  it('is wired on the five headlines, from queries the Overview already reads', () => {
    // 3.4.18: on the platform's meters (StratoSplit / StratoMeter) under the SingleValue; the active problems are split by
    // category from prob.summary — the arrivals line of prob.timeline measured something else (DN-4) and left the tile.
    const page = readFileSync(join(process.cwd(), 'ui/app/pages/CommandCenter.tsx'), 'utf8');
    expect((page.match(/mark=\{/g) ?? []).length).toBe(5);
    expect(page).not.toContain('spark={');
    expect(page).toContain('<StratoSplit parts={activeSplit}');
  });
});

describe('the compact stack map (owner: "the tiles take a large part of the page")', () => {
  it('draws one-line pills, ~30 % shorter than 3.3.7 and never enlarged', () => {
    expect(STACK_GEOMETRY.nodeHeight).toBeLessThanOrEqual(44);
    expect(STACK_GEOMETRY.rowGap).toBeLessThanOrEqual(10);
    const layout = layoutStack([
      { id: 'web', count: 4 },
      { id: 'synthetic', count: 73 },
      { id: 'services', count: 74 },
      { id: 'workloads', count: 257 },
      { id: 'processes', count: 514 },
      { id: 'hosts', count: 73 },
      { id: 'clusters', count: 6 },
      { id: 'cloud-AWS', count: 14 },
      { id: 'cloud-GCP', count: 3 },
      { id: 'cloud-Azure', count: 2 },
      { id: 'unattributed', count: 54 },
    ]);
    // Four cloud rows: 3.3.7 drew 30 + 4 × 64 + 3 × 18 + 12 = 352 px of height; now 246, and never upscaled.
    expect(layout?.height).toBeLessThanOrEqual(250);
  });
});

describe('the lighthouse pages read against the PoC criteria', () => {
  it('opens the Executive summary on the objectives × measured, through the same evaluation as the Timeline', () => {
    const exec = readFileSync(join(process.cwd(), 'ui/app/pages/ExecutiveSummary.tsx'), 'utf8');
    expect(exec).toContain('<ObjectivesTable />');
    const table = readFileSync(join(process.cwd(), 'ui/app/features/cockpit/ObjectivesTable.tsx'), 'utf8');
    expect(table).toContain('useCriteriaResults(pocPlan.criteria)');
  });

  it('draws a criterion line only when the plan states one (Root cause, Value & ROI)', () => {
    for (const file of ['ui/app/pages/ProblemsRca.tsx', 'ui/app/pages/ValueRoiEngine.tsx']) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).toMatch(/criterion\.metric === 'problems\.mttr' && criterion\.operator === '<=' && criterion\.target !== null/);
    }
  });
});
