import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { BarList } from '../components/viz/BarList';
import { DonutBreakdown } from '../components/viz/DonutBreakdown';
import { InventoryTile } from '../components/spectrum/InventoryTile';
import { observed } from '../models/provenance';
import { StudioProvider } from '../config/StudioContext';

/**
 * 3.5.1 — the Strato-native line, wave 3 (owner: "ir direto pra 3.5.1"): the ranked lists, the donuts, the inventory
 * tiles and the daily lines on the platform's charts, through the shared pieces, so every page that uses them changes.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('wave 3 — the shared pieces on the platform’s charts', () => {
  it('draws a ranked list’s bars with the MeterBarChart, keeping name, value and rank as text', () => {
    const { container } = wrap(
      <BarList
        ariaLabel="Technologies"
        items={[
          { key: 'a', label: 'JAVA', value: 87, display: '87' },
          { key: 'b', label: 'NODE_JS', value: 12, display: '12' },
        ]}
      />,
    );
    const rows = container.querySelectorAll('.pvs-bars__row');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector('.pvs-bars__name')?.textContent).toBe('JAVA');
    expect(rows[0]?.querySelector('.pvs-bars__value')?.textContent).toBe('87');
    expect(rows[0]?.querySelector('[data-dt-component="SingleMeterBarChart"]')).not.toBeNull();
    expect(container.querySelector('.pvs-bars__fill')).toBeNull();
  });

  it('keeps the app’s own donut wherever a page is printed (the platform’s DonutChart printed its centre without its arcs)', () => {
    const { container } = wrap(
      <DonutBreakdown
        ariaLabel="Hosts by cloud"
        centerDisplay="19"
        centerLabel="hosts"
        segments={[
          { key: 'aws', label: 'AWS', value: 14, display: '14' },
          { key: 'gcp', label: 'GCP', value: 3, display: '3' },
        ]}
      />,
    );
    expect(container.querySelectorAll('svg circle.pvs-donut__arc')).toHaveLength(2);
    expect(read('ui/app/components/viz/DonutBreakdown.tsx')).not.toContain('StratoDonut');
    // On paper the slices are drawn at once (their fade-in printed an empty grey ring on the Coverage PDF).
    expect(read('ui/app/engine/spectrum.css')).toMatch(/@media print \{[^}]*\.pvs-donut__arc,[^}]*animation: none;/);
  });

  it('shows a measured tile’s own value when no formatted display is given — never a dash', () => {
    const evidence = { queryId: 'rum.scorecard', source: 'user sessions', timeframe: 'last 24 hours' };
    const { container } = wrap(<InventoryTile label="Front-end error rate" icon={<span />} fact={observed('0.95%', evidence)} />);
    expect(container.querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('0.95%');
    expect(container.querySelector('.pvs-skpi__dash')).toBeNull();
  });

  it('draws the inventory tiles and the daily lines with engine/strato', () => {
    expect(read('ui/app/components/spectrum/InventoryTile.tsx')).toContain('<StratoKpi');
    expect(read('ui/app/engine/chart/DailyLine.tsx')).toContain('<StratoTimeseries');
    // A Strato chart in a hidden tab waits for its block to have a width (no invalid "-12" size).
    expect(read('ui/app/engine/strato/StratoDonut.tsx')).toContain('<WhenSized');
  });
});
