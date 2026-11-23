import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { WHATS_NEW, WHATS_NEW_SHOWN } from '../components/HelpPanels';
import { StudioProvider } from '../config/StudioContext';
import { EnvironmentFlow } from '../components/spectrum';
import { StratoModeProvider } from '../engine/strato';
import { balancedColumns } from '../engine/strato/StratoKpi';
import { entryFor } from '../i18n/strings';
import { layoutFlow } from '../models/environmentFlow';
import type { StackNodeInput } from '../models/stackMap';

/**
 * 3.5.3 — the first release of the visual proposal v4: the Overview's environment flow, tabs at the top of the long
 * pages, What's new trimmed to the last ten releases with their dates.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const ESTATE: StackNodeInput[] = [
  { id: 'web', count: 4 },
  { id: 'mobile', count: 0 },
  { id: 'synthetic', count: null },
  { id: 'services', count: 70 },
  { id: 'processes', count: 369 },
  { id: 'hosts', count: 62 },
  { id: 'cloud-AWS', count: 10 },
];

const draw = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

describe('the environment flow', () => {
  it('keeps the stack map’s presence rules: a measured zero leaves, a layer not read stays with a dash, nothing measured draws nothing', () => {
    const layout = layoutFlow(ESTATE);
    expect(layout).not.toBeNull();
    expect(layout?.nodes.map((node) => node.id)).toEqual(['web', 'synthetic', 'services', 'processes', 'hosts', 'cloud-AWS']);
    expect(layout?.columns.map((column) => column.id)).toEqual(['experience', 'services', 'processes', 'infrastructure', 'cloud']);
    expect(layoutFlow([{ id: 'hosts', count: 0 }, { id: 'services', count: null }])).toBeNull();
    // Every disc and its labels stay inside the drawing.
    for (const node of layout?.nodes ?? []) expect(node.cx + 24 + 190).toBeLessThanOrEqual((layout?.width ?? 0) + 24);
  });

  it('writes every count and every hot reason as text, and pulses only a layer with a measured reason', () => {
    const { container } = draw(<EnvironmentFlow nodes={ESTATE} hot={{ services: '3 above the 1% failure line' }} />);
    const flow = container.querySelector('[data-pvs-chart="environment-flow"]');
    expect(flow).not.toBeNull();
    expect(container.querySelector('[data-node="synthetic"] .pvs-eflow__count')?.textContent).toBe('—');
    expect(container.querySelector('[data-node="services"] .pvs-eflow__count')?.textContent).toBe('70');
    expect(container.querySelectorAll('[data-hot="true"]').length).toBe(1);
    expect(container.querySelector('[data-node="services"]')?.getAttribute('aria-label')).toContain('3 above the 1% failure line');
    expect(container.querySelectorAll('.pvs-eflow__pulse').length).toBe(1);
    expect(container.querySelectorAll('.pvs-eflow__particle').length).toBeGreaterThan(0);
  });

  it('stays still in a capture or a print: no particle, the pulse frozen by the stylesheet', () => {
    const { container } = draw(
      <StratoModeProvider mode="print">
        <EnvironmentFlow nodes={ESTATE} hot={{ hosts: '2 at their capacity peak' }} />
      </StratoModeProvider>,
    );
    expect(container.querySelectorAll('.pvs-eflow__particle').length).toBe(0);
    const css = read('ui/app/engine/spectrum.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.pvs-eflow__particle \{\s*display: none;/);
    expect(css).toMatch(/@media print \{\s*\.pvs-eflow__particle \{\s*display: none;/);
  });

  it('replaces the stack map on the Overview, with hot layers from what the page already reads', () => {
    const page = read('ui/app/pages/CommandCenter.tsx');
    expect(page).toContain('<EnvironmentFlow nodes={stack.nodes} hot={flowHot} />');
    expect(page).not.toContain('<StackMap');
    expect(page).toContain("useCatalogQuery('infra.capacity.summary', scope)");
  });
});

describe('tabs at the top of the long pages', () => {
  it.each([
    ['ui/app/pages/ServicesAndTracing.tsx', ['p.svc.tab.health', 'p.svc.tab.trend', 'p.svc.tab.ranking']],
    ['ui/app/pages/InfrastructureAndCloud.tsx', ['p.infra.tab.overview', 'p.infra.tab.capacity', 'p.infra.tab.trend', 'p.infra.tab.inventory']],
    ['ui/app/pages/AiInsightsCenter.tsx', ['ai.tab.overview', 'ai.tab.when', 'ai.tab.impact']],
  ])('%s keeps every panel mounted in its tab', (file, keys) => {
    const page = read(file);
    expect(page).toContain("import { Tab, Tabs } from '@dynatrace/strato-components/navigation';");
    for (const key of keys) expect(page).toContain(`<Tab title={t('${key}')} keepMounted>`);
    for (const key of keys) expect(entryFor(key as never)?.['pt-BR']).toBeTruthy();
  });

  it('draws a time series or bar chart only once its tab gives it a width', () => {
    expect(read('ui/app/engine/strato/StratoTimeseries.tsx')).toContain('<WhenSized minHeight=');
    expect(read('ui/app/engine/strato/StratoBars.tsx')).toContain('<WhenSized minHeight=');
  });
});

describe('What’s new', () => {
  it('lists the last ten releases, newest first, each with the day it was published', () => {
    expect(WHATS_NEW_SHOWN).toBe(10);
    expect(WHATS_NEW.length).toBe(10);
    // 3.5.4: newer releases come first; 3.5.3's own entry stayed in the ten while it was recent (3.6.3 dropped it).
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i95')).toBe(false);
    for (const { key, published } of WHATS_NEW) {
      expect(published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entryFor(key)?.en).toMatch(/^\d+\.\d+\.\d+ — /);
    }
    const days = WHATS_NEW.map((entry) => entry.published);
    expect([...days].sort().reverse()).toEqual(days);
  });
});

describe('components that fit their rows (the owner’s request, 2026-11-20)', () => {
  it('balances a row of number cards: six read 3 + 3, five 3 + 2, seven 4 + 3, never an orphan beside holes', () => {
    // 1,000 px at 220 px a card (16 px gaps) holds four columns.
    expect(balancedColumns(6, 1000, 220, 16)).toBe(3);
    expect(balancedColumns(5, 1000, 220, 16)).toBe(3);
    expect(balancedColumns(7, 1000, 220, 16)).toBe(4);
    expect(balancedColumns(8, 1000, 220, 16)).toBe(4);
    expect(balancedColumns(4, 1000, 220, 16)).toBe(4);
    expect(balancedColumns(3, 400, 220, 16)).toBe(1);
    // On paper the row keeps its auto-fit columns: the balanced count is a screen rule.
    expect(read('ui/app/engine/strato/strato.css')).toMatch(/@media screen \{\s*\.pvs-skpi-row\[data-cols\]/);
  });

  it('stretches the tiles of a row to one height where a short note or a gauge tile sat beside a tall chart', () => {
    for (const [file, row] of [
      ['ui/app/pages/BusinessObservability.tsx', 'biz-cockpit'],
      ['ui/app/pages/ConsumptionAndLicensing.tsx', 'cons-cockpit'],
      ['ui/app/pages/AiInsightsCenter.tsx', 'ai-cockpit-2'],
    ] as const) {
      expect(read(file)).toContain(`<CockpitRow data-testid="${row}">`);
    }
    const css = read('ui/app/engine/chart/chart.css');
    expect(css).toContain(".pvs-cockpit-row:not([data-align='start']) > .pvs-callout {\n  height: 100%;");
    expect(read('ui/app/features/assessment/assessment.css')).toMatch(/\.pvs-adopt-row \{[^}]*align-items: stretch;/);
    expect(read('ui/app/pages/CloudObservability.tsx')).toContain('className="pvs-cloud-providers"');
  });

  it('measures the fit of every route in the harness, as a warning for review', () => {
    const checks = read('scripts/visual/checks.mjs');
    expect(checks).toContain('const fit = { unbalanced');
    expect(read('scripts/visual/capture.mjs')).toContain("c.fit = verdict(false, d.fit.unbalancedCount > 0 || d.fit.hollowCount > 0)");
  });
});
