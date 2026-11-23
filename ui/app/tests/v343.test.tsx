import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImpactHeatmap } from '../engine/chart/ImpactHeatmap';
import { RadarChart } from '../engine/chart/RadarChart';
import { computeIndex, ratioDomain } from '../features/assessment/coverageIndex';
import type { AssessmentSignals } from '../features/assessment/findings';
import { maturity } from '../features/assessment/maturity';
import { srePractices } from '../features/assessment/sre';
import { EN_TEXT } from '../features/insights/deriveInsights';

/**
 * 3.4.3 — the Assessment refined (owner's order of 2026-11-18): maturity journey, SRE and platform
 * engineering, heat map, radar, tabs, soft colours. The AI adoption read went to the Platform adoption
 * page at the owner's request; the Assessment does not read it.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const UNREAD: AssessmentSignals = {
  hostModes: null,
  servicesInModel: null,
  servicesWithTraffic: null,
  servicesAboveOnePct: null,
  clusters: null,
  clustersWithMetrics: null,
  webApps: null,
  frontendsWithRealUsers: null,
  syntheticMonitors: null,
  publicDomainServices: null,
  bizEvents: null,
  saturatedHosts: null,
  resolved: null,
  logRecords: null,
  logRecordsWithContext: null,
  topology: null,
  vulnerabilities: null,
  ownedServices: null,
  thirdPartyTools: null,
  vitals: null,
  workflows: null,
  cloudProviders: null,
};

const FOUNDATIONAL: AssessmentSignals = {
  ...UNREAD,
  hostModes: { fullStack: 2, infra: 8, other: 0, unknown: 0 },
  servicesWithTraffic: 10,
  servicesInModel: 12,
  servicesAboveOnePct: 0,
  logRecords: 100,
  logRecordsWithContext: 50,
  frontendsWithRealUsers: 2,
  webApps: 2,
  resolved: { problems: 5, meanHours: 30 },
  vulnerabilities: { total: 3, actNow: 0, critical: 0 },
};

describe('the maturity journey', () => {
  it('starts reactive when nothing was read, and never counts a criterion not read as unmet', () => {
    const reading = maturity(UNREAD);
    expect(reading.level).toBe(1);
    expect(reading.criteria.every((criterion) => criterion.state === 'unread')).toBe(true);
    expect(reading.mayBeHigher).toBe(true);
  });

  it('reaches a step only when every criterion of it and of the steps below is met', () => {
    // Foundational met; Proficient misses full-stack depth (2 of 10). Since 3.4.7 every step asks four pillars:
    // depth and a good coverage index, logs with context on one platform, real users, and a resolution time.
    const reading = maturity(FOUNDATIONAL, 70);
    expect(reading.level).toBe(2);
    const proficient = {
      ...FOUNDATIONAL,
      hostModes: { fullStack: 8, infra: 2, other: 0, unknown: 0 },
      resolved: { problems: 5, meanHours: 6 },
      thirdPartyTools: [],
    };
    expect(maturity(proficient, 70).level).toBe(3);
    expect(maturity(proficient, 50).level).toBe(2);
  });

  it('does not read the AI adoption (it lives on the Platform adoption page)', () => {
    expect(maturity(FOUNDATIONAL).criteria.some((criterion) => criterion.id === 'ai')).toBe(false);
  });
});

describe('SRE and platform engineering', () => {
  it('reads seven practices; SLOs say why they cannot be read, never a guess', () => {
    const index = computeIndex([{ id: 'infra', queryIds: [], state: ratioDomain(9, 10, ['ok']) }]);
    const practices = srePractices({ ...FOUNDATIONAL, resolved: { problems: 5, meanHours: 2 }, workflows: { workflows: 2, executions: 100, succeeded: 99 } }, index, EN_TEXT);
    expect(practices.map((practice) => practice.id)).toEqual(['observability', 'incidents', 'reliability', 'automation', 'slo', 'platform', 'security']);
    expect(practices.find((practice) => practice.id === 'slo')?.state).toBe('unread');
    expect(practices.find((practice) => practice.id === 'incidents')?.state).toBe('established');
    expect(practices.find((practice) => practice.id === 'automation')?.state).toBe('established');
  });
});

describe('the heat map and the radar', () => {
  it('puts the count of each cell in words and numbers, the quick wins marked', () => {
    render(
      <ImpactHeatmap
        caption="Risks and opportunities"
        items={[
          { key: 'a', rank: 1, title: 'A', impact: 'high', effort: 'low' },
          { key: 'b', rank: 2, title: 'B', impact: 'high', effort: 'low' },
          { key: 'c', rank: 3, title: 'C', impact: 'low', effort: 'high' },
        ]}
        labels={{
          impact: 'Impact',
          effort: 'Effort',
          level: { high: 'high', medium: 'medium', low: 'low' },
          zone: { quickWins: 'Quick wins', strategic: 'Strategic', fillIns: 'Fill-ins', reconsider: 'Reconsider', plan: 'Plan' },
          hint: { quickWins: 'Do first', strategic: 'Plan as a project', fillIns: 'When there is room', reconsider: 'Reconsider', plan: 'Schedule' },
          count: (count) => `Actions in this cell: ${count}`,
          more: (count) => `+${count} more`,
          legend: 'Legend',
        }}
      />,
    );
    const table = screen.getByRole('table', { name: 'Risks and opportunities' });
    const quick = table.querySelector('[data-zone="quickWins"]') as HTMLElement;
    expect(quick.textContent).toContain('Quick wins');
    expect(quick.textContent).toContain('Actions in this cell: 2');
  });

  it('draws a spoke per axis and keeps an axis not read out of the shape', () => {
    const { container } = render(
      <RadarChart
        ariaLabel="Coverage by domain"
        axes={[
          { key: 'a', label: 'A', value: 80, display: '80%' },
          { key: 'b', label: 'B', value: 60, display: '60%' },
          { key: 'c', label: 'C', value: null, display: 'not read' },
          { key: 'd', label: 'D', value: 40, display: '40%' },
        ]}
      />,
    );
    expect(container.querySelectorAll('.pvs-radar__spoke')).toHaveLength(4);
    expect(container.querySelectorAll('.pvs-radar__spoke[data-unread="true"]')).toHaveLength(1);
    expect(container.querySelector('.pvs-radar__area')).not.toBeNull();
  });
});

describe('the page', () => {
  it('has seven tabs that all print (five, plus "What is mapped" since 3.4.12 and "Depth map" since 3.6.4), and no longer repeats the Technologies page', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect((page.match(/<Tab title=/g) ?? []).length).toBe(7);
    expect((page.match(/keepMounted/g) ?? []).length).toBe(7);
    expect(page).not.toContain("t('p.asm.discovery.title')");
    expect(page).toContain('<ImpactHeatmap');
    const css = read('ui/app/features/assessment/assessment.css');
    expect(css).toContain(".pvs-asm-tabs [role='tabpanel'][hidden]");
    expect(css).toContain(".pvs-adopt__item[data-state='not-detected']");
  });

  it('does not read the AI adoption on the Assessment', () => {
    expect(read('ui/app/features/assessment/useAssessment.ts')).not.toContain('adopt.ai');
  });
});
