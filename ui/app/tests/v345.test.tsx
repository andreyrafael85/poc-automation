import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImpactHeatmap, zoneOf } from '../engine/chart/ImpactHeatmap';
import type { AssessmentSignals } from '../features/assessment/findings';
import { maturity } from '../features/assessment/maturity';
import { MaturityJourney } from '../features/assessment/MaturityJourney';
import { EN_TEXT } from '../features/insights/deriveInsights';

/**
 * 3.4.5 — the owner's review of 3.4.4: the summary in one grid, the maturity journey as a staircase after
 * Dynatrace's model (steps take time: the page must not look like every point is checked), the heat map redrawn.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const LAB: AssessmentSignals = {
  hostModes: { fullStack: 28, infra: 6, other: 0, unknown: 28 },
  servicesInModel: 70,
  servicesWithTraffic: 70,
  servicesAboveOnePct: 2,
  clusters: 3,
  clustersWithMetrics: 3,
  webApps: 4,
  frontendsWithRealUsers: 3,
  syntheticMonitors: 6,
  publicDomainServices: 0,
  bizEvents: 100,
  saturatedHosts: 4,
  resolved: { problems: 6842, meanHours: 6.9 },
  logRecords: 1_000_000,
  logRecordsWithContext: 7_000,
  topology: null,
  vulnerabilities: { total: 120, actNow: 2, critical: 6 },
  ownedServices: 10,
  thirdPartyTools: ['Datadog'],
  vitals: null,
  workflows: { workflows: 11, executions: 1000, succeeded: 981 },
  cloudProviders: [{ provider: 'AWS', hosts: 10 }],
};

describe('the maturity journey, after Dynatrace’s model', () => {
  it('asks four pillars at every step since 3.4.7 (it spread 3, 5, 4 and 3 in 3.4.5)', () => {
    const reading = maturity(LAB);
    expect(reading.perLevel.map((entry) => entry.total)).toEqual([0, 4, 4, 4, 4]);
  });

  it('keeps the steps ahead honest: open criteria show as open, never as checked', () => {
    const reading = maturity(LAB, 80);
    expect(reading.level).toBe(2);
    const open = reading.criteria.filter((criterion) => criterion.state === 'open').map((criterion) => criterion.id);
    expect(open).toEqual(expect.arrayContaining(['context3', 'context4', 'context5', 'operations5']));
    render(<MaturityJourney reading={reading} t={EN_TEXT.t} formatNumber={EN_TEXT.formatNumber} />);
    const journey = screen.getByTestId('asm-maturity');
    expect(journey.querySelectorAll('.pvs-mat__criterion[data-state="open"]').length).toBe(open.length);
    expect(journey.querySelectorAll('.pvs-mat__step[data-position="ahead"]').length).toBe(3);
    expect(journey.textContent).toContain('Next steps with Dynatrace to reach Proficient');
  });
});

describe('the heat map', () => {
  it('names each zone, says what to do, and lists the first actions by title', () => {
    render(
      <ImpactHeatmap
        caption="Risks and opportunities"
        items={[1, 2, 3, 4].map((rank) => ({ key: `a${rank}`, rank, title: `Action ${rank}`, impact: 'high' as const, effort: 'low' as const }))}
        labels={{
          impact: 'Impact',
          effort: 'Effort',
          level: { high: 'high', medium: 'medium', low: 'low' },
          zone: { quickWins: 'Quick wins', strategic: 'Strategic', fillIns: 'Fill-ins', reconsider: 'Reconsider', plan: 'Plan' },
          hint: { quickWins: 'Do first', strategic: 'Project', fillIns: 'Later', reconsider: 'Rethink', plan: 'Schedule' },
          count: (count) => `Actions in this cell: ${count}`,
          more: (count) => `+${count} more`,
          legend: 'Legend',
        }}
      />,
    );
    const quick = screen.getByRole('table', { name: 'Risks and opportunities' }).querySelector('[data-zone="quickWins"]') as HTMLElement;
    expect(quick.textContent).toContain('Do first');
    expect(quick.textContent).toContain('Action 1');
    expect(quick.textContent).toContain('+1 more');
    expect(zoneOf('low', 'high')).toBe('reconsider');
  });
});

describe('the summary', () => {
  it('is one grid, without the list that repeated the radar labels', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain('className="pvs-asm-glance"');
    expect(page).not.toContain("t('asm.radar.bands')");
  });
});

describe('3.4.5 print and the steps ahead', () => {
  it('keeps the staircase and the heat-map actions on the printed page', () => {
    const asm = readFileSync(join(process.cwd(), 'ui/app/features/assessment/assessment.css'), 'utf8');
    const chart = readFileSync(join(process.cwd(), 'ui/app/engine/chart/chart.css'), 'utf8');
    expect(asm).toContain('@media screen and (max-width: 900px)');
    expect(chart).toContain('@media screen and (max-width: 760px)');
  });

  it('says a step ahead with every criterion met counts only once the steps before it are reached', () => {
    const journey = readFileSync(join(process.cwd(), 'ui/app/features/assessment/MaturityJourney.tsx'), 'utf8');
    expect(journey).toContain("t('asm.mat.aheadMet')");
  });
});
