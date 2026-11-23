import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { StudioProvider } from '../config/StudioContext';
import { StratoDonut, StratoGauge, StratoKpi, StratoKpiRow } from '../engine/strato';
import { appStillLoading } from '../features/wrapup/captures';
import { observed, unavailable, type EvidenceRef } from '../models/provenance';

/**
 * 3.4.18 — the Strato-native line begins (`docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md`, waves 0 and 1): the foundation
 * `engine/strato/` and the Overview and Dynatrace Intelligence on the platform's own charts. The app's rules hold
 * inside the wrappers: a missing figure is a dash with its reason, never a zero (rule 8); a split shows every part.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const evidence: EvidenceRef = { queryId: 'prob.summary', source: 'dt.davis.problems', timeframe: 'last 7 days', collectedAt: '2026-11-20T12:00:00Z' };
const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('StratoKpi — one KPI anatomy on the platform’s SingleValue', () => {
  it('writes the number in the viewer’s format and its unit itself (the platform would abbreviate 7,652 h to “7.7Kh”)', () => {
    wrap(
      <StratoKpiRow>
        <StratoKpi testId="k" label="Mean time" fact={observed(7652, evidence)} value={7652} formatter={(value) => value.toLocaleString('en-US')} unit="h" />
      </StratoKpiRow>,
    );
    const card = screen.getByTestId('k');
    expect(card.dataset.pvsChart).toBe('kpi');
    expect(card.querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('7,652 h');
    expect(card.querySelector('button[aria-label^="Evidence class"]')).not.toBeNull();
  });

  it('draws a dash and the reason for an unavailable fact, and no SingleValue at all', () => {
    wrap(<StratoKpi testId="k" label="Active problems" fact={unavailable('failed', undefined, evidence)} value={null} />);
    const card = screen.getByTestId('k');
    expect(card.dataset.pvsState).toBe('unavailable');
    expect(card.querySelector('.pvs-skpi__dash')?.textContent).toBe('—');
    expect(card.querySelector('[data-dt-component="SingleValue"]')).toBeNull();
    expect(card.textContent).not.toMatch(/\b0\b/);
  });

  it('caps the row at one value size, as the platform’s SingleValueGrid does', () => {
    const { container } = wrap(
      <StratoKpiRow valueCap={36}>
        <span />
      </StratoKpiRow>,
    );
    expect((container.querySelector('.pvs-skpi-row') as HTMLElement).style.getPropertyValue('--dt-charts-single-value-global-value-font-size')).toBe('36');
  });
});

describe('StratoGauge and StratoDonut', () => {
  it('draws no dial for a ratio that was not measured', () => {
    wrap(<StratoGauge testId="g" label="Problems closed" value={null} fact={unavailable('no-telemetry', undefined, evidence)} />);
    const gauge = screen.getByTestId('g');
    expect(gauge.querySelector('.pvs-sarc')).toBeNull();
    expect(gauge.querySelector('[role="img"]')?.getAttribute('aria-label')).toMatch(/^Problems closed: /);
  });

  it('carries the value it drew for the capture pins', () => {
    wrap(<StratoGauge testId="g" label="Problems closed" value={99.4} fact={observed(99, evidence)} />);
    expect(screen.getByTestId('g').dataset.value).toBe('99 %');
  });

  it('shows every slice — no automatic “Other” — with the app’s own legend: name, count and share', () => {
    const { container } = wrap(
      <StratoDonut
        ariaLabel="The estate by layer"
        centerValue="1,000"
        centerLabel="entities"
        slices={[
          { label: 'Processes', value: 991 },
          { label: 'Synthetic monitors', value: 9 },
        ]}
      />,
    );
    const rows = container.querySelectorAll('.pvs-sdonut__row');
    expect(rows).toHaveLength(2);
    expect(rows[1]?.textContent).toContain('Synthetic monitors');
    expect(rows[1]?.querySelector('.pvs-sdonut__share')?.textContent).toBe('0.9 %');
    expect(container.querySelector('.pvs-sdonut__total')?.textContent).toBe('1,000');
  });
});

describe('the Tech Wrapup capture stage and the platform’s charts', () => {
  it('waits on an app loader, not on the live region every Strato legend carries', () => {
    const slot = document.createElement('div');
    const chart = document.createElement('div');
    chart.dataset.pvsChart = 'donut';
    const legendRegion = document.createElement('div');
    legendRegion.setAttribute('role', 'status');
    chart.append(legendRegion);
    slot.append(chart);
    expect(appStillLoading(slot)).toBe(false);
    const loader = document.createElement('div');
    loader.setAttribute('role', 'status');
    slot.append(loader);
    expect(appStillLoading(slot)).toBe(true);
  });

  it('photographs the charts still, and reads the pins from the text the app wrote', () => {
    const captures = read('ui/app/features/wrapup/captures.tsx');
    expect(captures).toContain('<StratoModeProvider mode="capture">');
    expect(captures).toContain(".pvs-arrivals__peak");
    expect(captures).toContain('.pvs-sdonut__row');
    expect(read('ui/app/engine/strato/StratoTimeseries.tsx')).toContain('{still && <TimeseriesChart.Toolbar hidden />}');
  });
});

describe('Dynatrace Intelligence on the platform’s charts', () => {
  it('names the posture gauges as what they are — ratios, derived, with their arithmetic', () => {
    const panels = read('ui/app/features/cockpit/aiPanels.tsx');
    for (const ring of ['reliability', 'recurrence', 'active']) expect(panels).toContain(`calculation: t('ai.ring.${ring}.calc')`);
    expect(panels).not.toContain('<GaugeRing');
    expect(read('ui/app/pages/AiInsightsCenter.tsx')).toContain('<StratoKpiRow min={220} testId="ai-lenses">');
  });
});

describe('the Overview on the platform’s charts', () => {
  it('draws its header gauges, KPIs and cockpit with the Strato wrappers and no longer with the 3.2 skin', () => {
    const page = read('ui/app/pages/CommandCenter.tsx');
    for (const gone of ['<HeroBanner', '<GaugeRing', '<KpiHero', '<InventoryTile']) expect(page).not.toContain(gone);
    const cockpit = read('ui/app/features/cockpit/OverviewCockpit.tsx');
    expect(cockpit).toContain('<ProblemArrivals />');
    expect(cockpit).toContain('<StratoDonut');
    expect(cockpit).toContain('<StratoBars');
    expect(cockpit).not.toMatch(/<SpectrumArea|<DonutBreakdown|<RankedBars/);
    // Pages reach the platform's charts only through engine/strato (plan §4).
    for (const file of ['ui/app/pages/CommandCenter.tsx', 'ui/app/features/cockpit/OverviewCockpit.tsx', 'ui/app/features/cockpit/panels.tsx', 'ui/app/features/cockpit/aiPanels.tsx']) {
      expect(read(file), file).not.toContain("from '@dynatrace/strato-components/charts'");
    }
  });
});
