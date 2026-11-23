import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { WHATS_NEW } from '../components/HelpPanels';
import { StudioProvider } from '../config/StudioContext';
import { allocateTicks, goalScale, goalTone, StratoGoal } from '../engine/strato';
import { consoleLines, CONSOLE_ROWS } from '../features/cockpit/ProblemConsole';
import { entryFor } from '../i18n/strings';

/**
 * 3.6.0 — the visual proposal v6, wave 3, and the goal bar of wave 2 (the owner's question of 2026-11-21: "somente o
 * 'closed problems' está com novo formato"): the recent problems as console lines, the heat calendar in neutral tones,
 * values against their review lines as goal bars.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const wrap = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <StudioProvider>{node}</StudioProvider>
    </AppRoot>,
  );

describe('the goal bar', () => {
  it('tones a value against its lines and scales above the larger of value and line', () => {
    expect(goalTone(0.95, 1, 5)).toBe('good');
    expect(goalTone(3, 1, 5)).toBe('warning');
    expect(goalTone(7, 1, 5)).toBe('critical');
    expect(goalTone(12, 10)).toBe('warning');
    expect(goalScale(0.95, 1, 5)).toBeCloseTo(5.5);
    expect(goalScale(30, 10)).toBeCloseTo(33);
  });

  it('draws the fill, the line and its label, and nothing for a value not measured', () => {
    const { container } = wrap(<StratoGoal value={0.95} line={1} attention={5} name="Front-end error rate" lineLabel="Review line: 1 % (the app’s convention)" />);
    expect(container.querySelector('.pvs-sgoal')?.getAttribute('data-tone')).toBe('good');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Front-end error rate: Review line: 1 % (the app’s convention)');
    expect(wrap(<StratoGoal value={null} line={1} name="x" lineLabel="x" />).container.querySelector('.pvs-sgoal')).toBeNull();
  });

  it('sits on the projected visit in App consumption, its line from the registry', () => {
    expect(read('ui/app/features/consumption/ConsumptionPanel.tsx')).toContain("line={assumed('consumption.preflight.visitLine')}");
    expect(entryFor('v6.limit.visitLine')['pt-BR']).toContain('convenção do app');
  });
});

describe('mini bars on every number card (owner: "repassado aos demais com as cores diferenciando os dados")', () => {
  it('gives every part its share of the ticks, at least one for any part above zero', () => {
    expect(allocateTicks([412, 138, 70, 62, 13], 24)).toEqual([14, 5, 2, 2, 1]);
    expect(allocateTicks([7652, 41], 24)).toEqual([23, 1]);
    expect(allocateTicks([0, 5], 24)).toEqual([0, 24]);
    expect(allocateTicks([1, 1, 1], 24).reduce((sum, count) => sum + count, 0)).toBe(24);
  });

  it('draws closed against still-open problems and the front-end errors by application as mini bars', () => {
    const overview = read('ui/app/pages/CommandCenter.tsx');
    expect(overview).toContain("{ label: t('v6.split.open'), value: activeProblems, color: Colors.Charts.Status.Neutral.Default }");
    expect(overview).toContain("<StratoSplit parts={frontendMeter} ariaLabel={t('cc.meter.frontend')} />");
    expect(overview).not.toContain('<StratoTicks');
    expect(read('ui/app/engine/strato/StratoGauge.tsx')).not.toContain('MultiMeterBarChart.Segment');
  });
});

describe('the console of recent problems', () => {
  it('lists the most recent first, at most twelve, open or closed', () => {
    const records = Array.from({ length: 20 }, (_, index) => ({
      displayId: `P-${index}`,
      name: 'Response time degradation',
      category: 'SLOWDOWN',
      status: index === 3 ? 'ACTIVE' : 'CLOSED',
      start: new Date(Date.UTC(2026, 8, 1, index)).toISOString(),
      durationNs: 3_600_000_000_000,
      affected: ['svc-a', 'svc-b'],
    }));
    const lines = consoleLines(records);
    expect(lines).toHaveLength(CONSOLE_ROWS);
    expect(lines[0]?.id).toBe('P-19');
    expect(lines.find((line) => line.id === 'P-3')).toBeUndefined();
    expect(consoleLines(records, 20).find((line) => line.id === 'P-3')?.open).toBe(true);
  });

  it('is on the first tab of Dynatrace Intelligence, from the existing prob.list, and says it is a list', () => {
    expect(read('ui/app/pages/AiInsightsCenter.tsx')).toContain('<ProblemConsole />');
    expect(read('ui/app/features/cockpit/ProblemConsole.tsx')).toContain("useCatalogQuery('prob.list', scope)");
    expect(entryFor('v6.console.caption').en).toContain('a list, not a count');
  });

  it('draws the heat calendar in neutral tones with the busiest slot in the menu’s turquoise', () => {
    const css = read('ui/app/engine/v6.css');
    expect(css).toMatch(/\.pvs-heatcal__cell \{\n {2}background: color-mix\(in srgb, var\(--dt-colors-text-neutral-default\)/);
    expect(css).toContain('box-shadow: inset 0 0 0 2px var(--pvs-v6-edge);');
  });
});

describe('What’s new', () => {
  it('keeps 3.6.0 in the key list once it leaves the ten releases', () => {
    // 3.7.0: the ten releases shown start at 3.6.1 now, under "Novidades da 3.7"; 3.6.0's text stays in the strings.
    expect(WHATS_NEW.some((entry) => entry.key === 'help.whatsNew.i102')).toBe(false);
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i102').en.startsWith('3.6.0 — ')).toBe(true);
    expect(entryFor('help.whatsNew.title')['pt-BR']).toBe('Novidades da 3.7');
  });
});
