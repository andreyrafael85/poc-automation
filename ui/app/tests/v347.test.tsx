import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoot } from '@dynatrace/strato-components/core';

import { assumed } from '../config/assumptions';
import { DailyLine } from '../engine/chart/DailyLine';
import { HourHeatmap } from '../engine/chart/HourHeatmap';
import type { AssessmentSignals } from '../features/assessment/findings';
import { allOf, maturity, PILLARS } from '../features/assessment/maturity';
import { MaturityJourney } from '../features/assessment/MaturityJourney';
import { EN_TEXT } from '../features/insights/deriveInsights';
import { areaOf, byArea, gridPeak, summariseTrend, toDailySeries, toHourGrid, workingHoursShare } from '../features/platformAdoption/trend';
import { getQuery } from '../queries/catalog';
import { entryFor } from '../i18n/strings';

/**
 * 3.4.7 — the owner's review of 3.4.6: the maturity journey in positive words, on four pillars that advance
 * together (Visionary is not two tags away), with rings and a spectrum; Platform adoption over time.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const BASE: AssessmentSignals = {
  hostModes: { fullStack: 28, infra: 6, other: 0, unknown: 0 },
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

/** Everything a Visionary environment shows. */
const VISIONARY: AssessmentSignals = {
  ...BASE,
  hostModes: { fullStack: 95, infra: 5, other: 0, unknown: 0 },
  webApps: 10,
  frontendsWithRealUsers: 10,
  resolved: { problems: 40, meanHours: 2 },
  logRecordsWithContext: 900_000,
  ownedServices: 63,
  thirdPartyTools: [],
  vulnerabilities: { total: 12, actNow: 0, critical: 0 },
};

describe('the maturity model on four pillars', () => {
  it('asks every pillar at every step, so each step has four criteria', () => {
    const reading = maturity(BASE, 80);
    for (const level of [2, 3, 4, 5]) {
      const pillars = reading.criteria.filter((criterion) => criterion.level === level).map((criterion) => criterion.pillar);
      expect(pillars).toEqual([...PILLARS]);
    }
  });

  it('reaches Visionary only when the whole environment is there — not with two tags and a workflow', () => {
    expect(maturity(VISIONARY, 85).level).toBe(5);
    // The 3.4.6 shortcut the owner pointed at: business events, owner tags and fast resolution alone.
    const shortcut = { ...BASE, ownedServices: 70, resolved: { problems: 40, meanHours: 2 } };
    expect(maturity(shortcut, 85).level).toBeLessThan(5);
    // Visionary falls back as soon as one pillar slips: an index under the excellent line.
    expect(maturity(VISIONARY, 70).level).toBe(4);
    // …or one vulnerability in the act-now queue.
    expect(maturity({ ...VISIONARY, vulnerabilities: { total: 12, actNow: 1, critical: 1 } }, 85).level).toBe(4);
  });

  it('raises the lines step by step, from the assumptions register', () => {
    expect(assumed('maturity.fullStack.proficient')).toBeLessThan(assumed('maturity.fullStack.strategic'));
    expect(assumed('maturity.fullStack.strategic')).toBeLessThan(assumed('maturity.fullStack.visionary'));
    expect(assumed('maturity.logContext.strategic')).toBeLessThan(assumed('maturity.logContext.visionary'));
    expect(assumed('maturity.rum.strategic')).toBeLessThan(assumed('maturity.rum.visionary'));
  });

  it('never counts a check not read against a criterion', () => {
    expect(allOf(true, null)).toBe('unread');
    expect(allOf(false, null)).toBe('open');
    expect(allOf(true, true)).toBe('met');
    expect(maturity(BASE).criteria.find((criterion) => criterion.id === 'visibility3')?.state).toBe('unread');
  });

  it('reads each pillar on its own, for the rings', () => {
    const reading = maturity(BASE, 80);
    expect(reading.pillars.map((entry) => entry.pillar)).toEqual([...PILLARS]);
    expect(reading.pillars.find((entry) => entry.pillar === 'context')?.level).toBe(2);
  });
});

describe('the journey on the page speaks positively', () => {
  it('says where the environment is, what is in place and the next steps with Dynatrace', () => {
    render(<MaturityJourney reading={maturity(BASE, 80)} t={EN_TEXT.t} formatNumber={EN_TEXT.formatNumber} />);
    const journey = screen.getByTestId('asm-maturity');
    expect(journey.textContent).toContain('The environment is already at step 2, Foundational');
    expect(journey.textContent).toContain('Already in place with Dynatrace');
    expect(journey.textContent).toContain('Next steps with Dynatrace to reach Proficient');
    expect(journey.querySelectorAll('.pvs-mat-rings__ring')).toHaveLength(4);
    expect(journey.querySelector('.pvs-mat-spectrum__step[data-position="current"]')?.textContent).toContain('You are here');
  });

  it('drops the wording that read as a limitation of the platform', () => {
    for (const key of ['asm.mat.l1.tag', 'asm.mat.l2.tag', 'asm.mat.l1.text', 'asm.mat.l2.text'] as const) {
      const text = entryFor(key);
      expect(text.en).not.toMatch(/without|silos|late|war room/i);
      expect(text['pt-BR']).not.toMatch(/sem entendimento|sem consistência|silos|sala de guerra/i);
    }
  });
});

describe('Platform adoption over time', () => {
  it('fills the days without activity with zero, inside the window only', () => {
    const series = toDailySeries(
      [
        { day: '2026-11-01T00:00:00.000Z', users: 3, actions: 100 },
        { day: '2026-11-03T00:00:00.000Z', users: 5, actions: 900 },
      ],
      '2026-11-01T10:00:00Z',
      '2026-11-04T09:00:00Z',
    );
    expect(series.map((entry) => entry.actions)).toEqual([100, 0, 900, 0]);
    const summary = summariseTrend(series);
    expect(summary.peakActions?.day).toBe('2026-11-03');
    expect(summary.activeDays).toBe(2);
    expect(summary.totalActions).toBe(1000);
  });

  it('folds hours into weekday × hour in the viewer’s time zone', () => {
    // 2026-11-17 (Tuesday) 14:00 UTC is 11:00 in São Paulo (offset 180 minutes).
    const grid = toHourGrid([{ hour: '2026-11-17T14:00:00.000Z', actions: 50 }], 180);
    expect(grid[2]?.[11]).toBe(50);
    expect(gridPeak(grid)).toEqual({ weekday: 2, hour: 11, actions: 50 });
    expect(workingHoursShare(grid)).toBe(100);
  });

  it('groups apps by area and never sums distinct users', () => {
    expect(areaOf('dynatrace.notebooks', false)).toBe('analytics');
    expect(areaOf('dynatrace.davis.copilot', false)).toBe('ai');
    expect(areaOf('my.poc.value.studio', true)).toBe('custom');
    const areas = byArea([
      { app: 'dynatrace.notebooks', actions: 100, users: 8, custom: false },
      { app: 'dynatrace.dashboards', actions: 50, users: 10, custom: false },
    ]);
    expect(areas).toEqual([{ area: 'analytics', actions: 150, apps: 2, usersAtLeast: 10 }]);
  });

  it('draws a line per measure with its peak, and a heat map whose cells say their count', () => {
    // 3.5.1: the line is the platform's TimeseriesChart (its own crosshair and tooltip); the peak is the app's text
    // and every day's value stays in a table for assistive technology.
    const { container } = render(
      <AppRoot>
        <DailyLine
          points={[
            { day: '2026-11-01', value: 1 },
            { day: '2026-11-02', value: 9 },
            { day: '2026-11-03', value: 4 },
          ]}
          label="Actions per day"
          format={String}
          formatDay={(day) => day.slice(5)}
          peakLabel={(value, day) => `Peak: ${value} on ${day}`}
        />
      </AppRoot>,
    );
    expect(container.textContent).toContain('Peak: 9 on 11-02');
    expect(container.querySelector('[data-pvs-chart="timeseries"]')).not.toBeNull();
    expect(container.querySelector('.pvs-sr-only table')?.textContent).toContain('2026-11-03');
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    (grid[1] as number[])[9] = 12;
    render(<HourHeatmap grid={grid} weekdays={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']} caption="When" cellLabel={(count, weekday, hour) => `${count} on ${weekday} ${hour}`} legend={{ less: 'less', more: 'more' }} />);
    expect(screen.getAllByText('12 on Mon 9').length).toBeGreaterThan(0);
  });

  it('reads both series from catalog entries validated at 0 bytes, bounded by the window', () => {
    for (const id of ['adopt.platform.trend', 'adopt.platform.hours'] as const) {
      const entry = getQuery(id);
      expect(entry.validation.scannedBytesOnDemand).toBe(0);
      expect(entry.dql).not.toMatch(/\blimit\b/);
    }
    expect(getQuery('adopt.platform.trend').dql).toContain('bin(timestamp, 1d)');
    expect(getQuery('adopt.platform.hours').dql).toContain('bin(timestamp, 1h)');
    const page = read('ui/app/pages/PlatformAdoption.tsx');
    expect(page).toContain("useCatalogQuery('adopt.platform.trend', scope)");
    expect(page).toContain("useCatalogQuery('adopt.platform.hours', scope)");
    expect(page).toContain('<HourHeatmap');
  });
});

describe('3.4.8 — Platform adoption side by side (owner’s review of 3.4.7)', () => {
  it('puts the daily charts, the three usage tiles and the hours beside Intelligence in rows', () => {
    const page = read('ui/app/pages/PlatformAdoption.tsx');
    expect((page.match(/className="pvs-adopt-row/g) ?? []).length).toBe(3);
    expect(page).toContain('data-cols="3"');
    expect((page.match(/width=\{480\}/g) ?? []).length).toBe(2);
    expect(page).not.toContain('CockpitRow');
    const css = read('ui/app/features/assessment/assessment.css');
    expect(css).toContain('@media screen and (max-width: 1100px)');
  });
});
