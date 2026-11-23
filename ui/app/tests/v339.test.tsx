import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { InventoryTile } from '../components/spectrum/InventoryTile';
import { StudioProvider } from '../config/StudioContext';
import { FLOW_GEOMETRY, layoutFlow } from '../models/flowMap';
import { observed } from '../models/provenance';

/**
 * 3.3.9 — the owner's review of 3.3.8: the Overview inventory on one line, the flow maps (RCA trail
 * on the Executive summary and AIOps, the frontend flow, the call map) compact like the stack map,
 * and the AIOps explanation, logs, mix and time to close as four cockpit tiles.
 */

const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );
const evidence = { queryId: 'cov.inventory', source: 'coverage', timeframe: 'last 24 hours' };

describe('the compact inventory tile', () => {
  it('keeps the evidence badge and drops the per-tile "window · query" line (the panel states it once)', () => {
    // 3.5.1: the tile is the compact StratoKpi (the platform's SingleValue with the icon) and its evidence badge;
    // the window and the query are said once under the row, never per tile.
    const { container } = wrap(<InventoryTile label="Hosts" icon={<span />} fact={observed(62, evidence)} display="62" compact />);
    const tile = container.querySelector('.pvs-inv-tile--compact[data-pvs-chart="kpi"]') as HTMLElement;
    expect(tile).not.toBeNull();
    expect(tile.querySelector('button[aria-label^="Evidence class"]')).not.toBeNull();
    expect(container.textContent).not.toContain('cov.inventory');
    expect(tile.querySelector('[data-testid="single-value-chart-value"]')?.textContent).toBe('62');
  });

  it('is used on the Overview in balanced rows (3.5.3: four and three on a desktop), with the source line under the row', () => {
    const page = readFileSync(join(process.cwd(), 'ui/app/pages/CommandCenter.tsx'), 'utf8');
    // 3.4.18: the tiles are the compact StratoKpi (`size="sm"`) in a row of narrow columns.
    expect(page).toContain('<StratoKpiRow min={160} valueCap={28} testId="cc-inventory">');
    expect(page).toContain('size="sm"');
    expect(page).toContain("t('cockpit.inv.source'");
  });
});

describe('the compact flow map', () => {
  it('draws 48 px nodes in tight rows — the RCA trail with five affected entities is ~30 % shorter', () => {
    expect(FLOW_GEOMETRY.nodeHeight).toBe(48);
    expect(FLOW_GEOMETRY.rowGap).toBeLessThanOrEqual(10);
    // Five rows: 3.3.8 drew 5 × 64 + 4 × 16 = 384 px of nodes; now 5 × 48 + 4 × 10 = 280.
    expect(5 * FLOW_GEOMETRY.nodeHeight + 4 * FLOW_GEOMETRY.rowGap).toBeLessThanOrEqual(280);
    expect(typeof layoutFlow).toBe('function');
  });

  it('never draws larger than its own size on a wide screen', () => {
    const source = readFileSync(join(process.cwd(), 'ui/app/components/spectrum/FlowMap.tsx'), 'utf8');
    expect(source).toContain('maxWidth: layout.width');
    expect(source).toContain('data-variant="compact"');
  });
});

describe('the AIOps cockpit grid', () => {
  it('puts the explanation, the logs, the mix and the time to close in one two-column grid, the explanation trimmed', () => {
    const page = readFileSync(join(process.cwd(), 'ui/app/pages/ProblemsRca.tsx'), 'utf8');
    const grid = page.slice(page.indexOf('className="pvs-cockpit-grid"'), page.indexOf('{/* User impact (RUM)'));
    for (const panel of ["t('p.rca.analysis.title')", "t('p.rca.logs.title')", "t('p.rca.mix.title')", "t('p.rca.mttr.title')"]) expect(grid, panel).toContain(panel);
    expect(page).toContain('const RCA_STORY_OPENING = 6;');
    expect(page).toContain('aria-expanded={fullStory}');
  });
});
