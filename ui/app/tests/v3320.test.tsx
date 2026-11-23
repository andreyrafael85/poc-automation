import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HorizonStrip } from '../engine/chart/HorizonStrip';
import { ImpactEffortMatrix } from '../engine/chart/ImpactEffortMatrix';

/**
 * 3.3.20 — the owner's order "pode antecipar a 3.3.20 e 3.3.21": Value & ROI, Opportunities and
 * Roadmap on the chart engine. The matrix and the horizons draw the qualitative judgements the
 * rules already state; no number is new.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const LABELS = { impact: 'Impact', effort: 'Effort', level: { high: 'high', medium: 'medium', low: 'low' }, quickWins: 'Quick wins' };

describe('the impact × effort matrix', () => {
  it('puts each item in the cell of its impact and effort, marks the quick wins and reads as a table', () => {
    render(
      <ImpactEffortMatrix
        caption="Where to act first"
        labels={LABELS}
        items={[
          { key: 'a', rank: 1, title: 'Fix svc-catalog-01', impact: 'high', effort: 'low' },
          { key: 'b', rank: 2, title: 'Resolve read access', impact: 'high', effort: 'medium' },
          { key: 'c', rank: 3, title: 'Tune log retention', impact: 'low', effort: 'high' },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Where to act first' });
    const quick = table.querySelector('[data-quick="true"]') as HTMLElement;
    expect(within(quick).getByText('Quick wins')).toBeTruthy();
    expect(within(quick).getByText('Fix svc-catalog-01')).toBeTruthy();
    expect(table.querySelectorAll('.pvs-matrix__item')).toHaveLength(3);
  });

  it('draws nothing without items', () => {
    const { container } = render(<ImpactEffortMatrix caption="x" labels={LABELS} items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('the roadmap at a glance', () => {
  it('lists the three horizons in order with their items', () => {
    render(
      <HorizonStrip
        label="The roadmap at a glance"
        columns={[
          { key: 'h1', title: 'Now', intent: '0–30 days', countLabel: '1 item', items: [{ key: 'a', title: 'Fix svc-catalog-01' }] },
          { key: 'h2', title: 'Next', intent: '30–60 days', countLabel: '0 items', items: [] },
          { key: 'h3', title: 'Later', intent: '60–90 days', countLabel: '1 item', items: [{ key: 'c', title: 'Tune log retention' }] },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'The roadmap at a glance' });
    expect(list.querySelectorAll('.pvs-horizons__column')).toHaveLength(3);
    expect(screen.getByText('Fix svc-catalog-01')).toBeTruthy();
  });
});

describe('the pages', () => {
  it('Opportunities numbers the table rows as the matrix does', () => {
    const page = read('ui/app/pages/ImprovementOpportunities.tsx');
    expect(page).toContain('<ImpactEffortMatrix');
    expect(page).toContain("{ id: 'rank', header: '#', accessor: 'rank'");
  });
  it('the 30-60-90 action plan (the Roadmap until 3.7.8) opens on the horizon strip, Value & ROI on its cockpit row', () => {
    expect(read('ui/app/features/opportunities/ActionPlan.tsx')).toContain('<HorizonStrip');
    expect(read('ui/app/pages/ValueRoiEngine.tsx')).toContain('<CockpitRow data-testid="roi-cockpit" split="even" align="start">');
  });
});
