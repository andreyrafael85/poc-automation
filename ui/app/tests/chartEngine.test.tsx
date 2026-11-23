import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { SpectrumArea } from '../components/spectrum/SpectrumArea';
import { StudioProvider } from '../config/StudioContext';
import { ActionTable } from '../engine/chart/ActionTable';
import { AssistCard } from '../engine/chart/AssistCard';
import { RankedBars } from '../engine/chart/RankedBars';
import { STATUS_RANK, statusAgainst } from '../engine/chart/status';
import { COCKPIT_FAILURE_LINE_PCT } from '../features/cockpit/OverviewCockpit';

/**
 * The chart engine's first marks (3.3.7) and the Overview cockpit they draw. They keep the rules
 * of the Spectrum skin: a status is a reading against a stated line and always has its word, a
 * reference line is dashed and never data, a capped list is never summed, and no money appears
 * outside Licensing.
 */

const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('a status against a review line', () => {
  it('is critical above the line, a warning from half of it, good below', () => {
    expect(statusAgainst(1.2, 1)).toBe('critical');
    expect(statusAgainst(1, 1)).toBe('warning');
    expect(statusAgainst(0.5, 1)).toBe('warning');
    expect(statusAgainst(0.49, 1)).toBe('good');
    expect(statusAgainst(5, 0)).toBe('good');
    expect(STATUS_RANK.critical).toBeLessThan(STATUS_RANK.warning);
    expect(COCKPIT_FAILURE_LINE_PCT).toBe(1);
  });
});

describe('RankedBars', () => {
  it('ranks, draws the line across every track, and says each status in words', () => {
    const { container } = wrap(
      <RankedBars
        ariaLabel="Failure rate"
        line={{ value: 1, label: '1 % review line' }}
        items={[
          { key: 'a', label: 'svc-catalog-01', value: 11.4, display: '11.4 %', status: 'critical' },
          { key: 'b', label: 'svc-search', value: 0.6, display: '0.6 %', status: 'warning' },
          { key: 'c', label: 'svc-auth', value: 0.2, display: '0.2 %', status: 'good' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Failure rate' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('Above the line');
    expect(rows[1]?.textContent).toContain('Close to the line');
    expect(rows[2]?.textContent).toContain('Within the line');
    // 3.5.0: the bars are the platform's CategoricalBarChart (the line a threshold); the rows stay as text.
    expect(container.querySelector('.pvs-ranked [data-pvs-chart="bars"]')).not.toBeNull();
    expect(container.querySelector('.pvs-ranked__legend')?.textContent).toContain('1 % review line');
  });

  it('draws nothing for an empty list', () => {
    const { container } = wrap(<RankedBars ariaLabel="x" items={[]} />);
    expect(container.querySelector('.pvs-ranked')).toBeNull();
  });
});

describe('ActionTable', () => {
  it('is a real table, worst first as given, with the status in words', () => {
    wrap(
      <ActionTable
        caption="Where to act first"
        headers={{ entity: 'Entity', signal: 'Signal', measured: 'Measured', versus: 'vs. the line', status: 'Status' }}
        rows={[
          { key: '1', entity: 'svc-catalog-01', signal: 'Failure rate', share: 1, measured: '11.4 %', versus: '+10.4 pp', status: 'critical' },
          { key: '2', entity: 'host-ap-10', signal: 'Peak memory', share: 0.8, measured: '86 %', versus: '−4 pp', status: 'warning' },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Where to act first' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Entity', 'Signal', 'Measured', 'vs. the line', 'Status']);
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['svc-catalog-01', 'host-ap-10']);
    expect(within(table).getByText('Close to the line')).toBeTruthy();
  });
});

describe('AssistCard', () => {
  it('shows the measured fact with its evidence class, never a currency', () => {
    const { container } = wrap(
      <AssistCard
        title="Dynatrace Assist"
        body="Start with the hosts at the ceiling."
        fact={{ label: 'Memory never used', value: '199 GB', provenance: 'derived' }}
        footnote="No monetary value here."
      />,
    );
    expect(screen.getByRole('region', { name: 'Dynatrace Assist' })).toBeTruthy();
    expect(screen.getByText('199 GB')).toBeTruthy();
    expect(container.textContent).not.toMatch(/R\$|US\$|\$\s?\d|€|USD|BRL/);
  });
});

describe('SpectrumArea reference lines', () => {
  it('draws a dashed reference over the series, says it to assistive technology, and scales to include it', () => {
    const points = Array.from({ length: 8 }, (_, index) => ({ t: Date.UTC(2026, 8, 8, index * 6), v: 10 + index }));
    const { container } = wrap(
      <SpectrumArea
        points={points}
        label="Problems every 6 hours"
        format={(value) => String(Math.round(value))}
        formatTime={(ms) => new Date(ms).toISOString()}
        references={[{ value: 40, label: 'Criterion: 40', kind: 'goal' }]}
      />,
    );
    const ref = container.querySelector('.pvs-area__ref');
    expect(ref?.getAttribute('data-kind')).toBe('goal');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Criterion: 40');
    // The axis reaches the reference even though every point is below it.
    const ticks = [...container.querySelectorAll('.pvs-area__ytick')].map((tick) => Number(tick.textContent));
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(40);
  });
});

describe('the Overview cockpit', () => {
  it('reads only catalog queries, draws no money and keeps the old figures below it', () => {
    const source = readFileSync(join(process.cwd(), 'ui/app/features/cockpit/OverviewCockpit.tsx'), 'utf8');
    const queries = [...source.matchAll(/useCatalogQuery\('([^']+)'/g)].map((match) => match[1]);
    expect(queries.sort()).toEqual(['cov.inventory', 'infra.capacity', 'infra.capacity.summary', 'prob.timeline', 'svc.ranking', 'svc.ranking.total']);
    expect(source).not.toMatch(/useDql|lic\.|cons\.|currency|price/);
    const page = readFileSync(join(process.cwd(), 'ui/app/pages/CommandCenter.tsx'), 'utf8');
    // Every section the Overview had before 3.3.7 is still on it (moving is free, vanishing is not; 3.5.3: the stack map became the environment flow). 3.4.18: the header,
    // the headline KPIs and the inventory are drawn by the Strato wrappers (OverviewHeader + StratoGauge, StratoKpi).
    for (const section of ['<OverviewHeader', '<StratoGauge', '<StratoKpi', 'testId="cc-inventory"', '<EnvironmentFlow', '<KeyDiscoveries', '<PillarSummary', '<Scorecard', '<OverviewCockpit']) {
      expect(page, section).toContain(section);
    }
  });
});
