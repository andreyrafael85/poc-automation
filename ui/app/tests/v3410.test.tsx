import React, { useEffect, useState } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { computeIndex, ratioDomain } from '../features/assessment/coverageIndex';
import type { AssessmentSignals } from '../features/assessment/findings';
import { maturity } from '../features/assessment/maturity';
import type { Assessment } from '../features/assessment/useAssessment';
import { assessmentSection } from '../features/wrapup/assessmentSection';
import { CAPTURE_REGISTRY, CaptureStage, resolveCaptureChoice, type CaptureOutcome, type CaptureTarget } from '../features/wrapup/captures';
import { DECK_SECTION_IDS } from '../features/wrapup/model';
import { EN_TEXT } from '../features/insights/deriveInsights';

/**
 * 3.4.10 — the owner's report on the Tech Wrapup ("ainda não vem as capturas dos gráficos novos em Dynatrace
 * Intelligence") and proposal §C8 F-02, the Assessment in the deck (the golden re-pinned at his request; logged in
 * `deckFingerprint.test.ts`).
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('the Dynatrace Intelligence section photographs its new charts', () => {
  it('opens on the heat calendar and offers the rings, the arrivals and the mix', () => {
    const problems = CAPTURE_REGISTRY.filter((entry) => entry.sectionId === 'problems').map((entry) => entry.captureId);
    expect(problems).toEqual(['problems.calendar', 'problems.rings', 'problems.arrivals', 'problems.mix']);
    expect(resolveCaptureChoice('problems', {})).toEqual(['problems.calendar']);
    expect(resolveCaptureChoice('problems', { problems: ['problems.rings', 'problems.arrivals'] })).toEqual(['problems.rings', 'problems.arrivals']);
  });

  it('draws the page and the capture from one component', () => {
    const page = read('ui/app/pages/AiInsightsCenter.tsx');
    expect(page).toContain('<ProblemRingsPanel />');
    expect(page).toContain('<ProblemCalendarPanel />');
    const captures = read('ui/app/features/wrapup/captures.tsx');
    expect(captures).toContain('return <ProblemCalendarPanel />;');
    expect(captures).toContain('return <ProblemRingsPanel />;');
  });
});

/** A panel that draws its chart a while after its query settles (a second read, a measure). */
const LateChart = ({ after }: { after: number }) => {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDrawn(true), after);
    return () => window.clearTimeout(timer);
  }, [after]);
  return drawn ? <p className="figure">42</p> : <div />;
};

const target = (captureId: string, node: React.ReactNode): CaptureTarget => ({
  sectionId: captureId,
  captureId,
  node,
  ready: (root) => root.querySelector('.figure') !== null,
  pins: [],
});

describe('the capture stage waits before saying "no data"', () => {
  it('photographs a chart drawn after a quiet longer than the settle time', async () => {
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    render(<CaptureStage targets={[target('late', <LateChart after={250} />)]} onDone={onDone} photographer={() => Promise.resolve(PNG)} settleMs={40} noDataQuietMs={1500} timeoutMs={5000} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const outcome = onDone.mock.calls[0]?.[0] as CaptureOutcome;
    expect(Object.keys(outcome.captures)).toEqual(['late']);
    expect(outcome.noData).toEqual([]);
  });

  it('still says "no data" for a panel that never draws, after the longer quiet', async () => {
    const onDone = vi.fn<(outcome: CaptureOutcome) => void>();
    render(<CaptureStage targets={[target('empty', <div />)]} onDone={onDone} photographer={() => Promise.resolve(PNG)} settleMs={20} noDataQuietMs={120} timeoutMs={5000} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect((onDone.mock.calls[0]?.[0] as CaptureOutcome).noData).toEqual(['empty']);
  });
});

const SIGNALS: AssessmentSignals = {
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
  cloudProviders: null,
};

const assessmentWith = (overrides: Partial<Assessment>): Assessment =>
  ({
    isLoading: false,
    index: computeIndex([
      { id: 'infra', queryIds: [], state: ratioDomain(9, 10, ['ok']) },
      { id: 'logs', queryIds: [], state: ratioDomain(1, 100, ['ok']) },
    ]),
    maturity: maturity(SIGNALS, 80),
    findings: [],
    adoption: [],
    ...overrides,
  }) as unknown as Assessment;

describe('the Assessment in the Tech Wrapup (F-02)', () => {
  it('builds a business section from the page’s own reading — coverage, maturity, findings, domains', () => {
    const section = assessmentSection(assessmentWith({}), EN_TEXT.t, EN_TEXT.formatNumber);
    expect(section?.id).toBe('assessment');
    expect(section?.kpis?.map((kpi) => kpi.label)).toEqual(['Observable coverage', 'Maturity', 'Capabilities in use', 'Critical findings']);
    expect(section?.kpis?.[1]?.value).toBe('2/5 · Foundational');
    expect(section?.bars?.items.map((item) => item.value)).toEqual([90, 1]);
    expect(section?.narrative.join(' ')).toContain('Today the environment is at step 2');
  });

  it('stays out while the Assessment is reading, or when nothing of it was read', () => {
    expect(assessmentSection(assessmentWith({ isLoading: true }), EN_TEXT.t, EN_TEXT.formatNumber)).toBeNull();
    expect(assessmentSection(assessmentWith({ index: computeIndex([]) }), EN_TEXT.t, EN_TEXT.formatNumber)).toBeNull();
  });

  it('has its place in the deck and a picture to take, maturity first', () => {
    expect(DECK_SECTION_IDS.indexOf('assessment')).toBe(DECK_SECTION_IDS.indexOf('overview') - 1);
    expect(resolveCaptureChoice('assessment', {})).toEqual(['assessment.maturity']);
    expect(read('ui/app/features/wrapup/useWrapupViewModel.ts')).toContain('assessmentSection(assessment, t, formatNumber)');
    expect(read('ui/app/tests/deckFingerprint.test.ts')).toContain('**3.4.10, `kinds` / `slides` / `package` / `preview`');
  });
});

describe('3.4.10 — coverage as radial bars, and a journey that never reads as a verdict', () => {
  it('keeps each label whole: the name on one line, "share · word" on the next', async () => {
    const { RadialBars } = await import('../engine/chart/RadialBars');
    const { container } = render(
      <RadialBars
        ariaLabel="Coverage by domain"
        centre={{ value: '80', label: 'Observable coverage', band: 'Excellent' }}
        bars={[
          { key: 'business', label: 'Business events', value: 100, display: '100%', band: 'Excellent', family: 'moss' },
          { key: 'logs', label: 'Logs in context', value: 0.7, display: '0.7%', band: 'Initial', family: 'orange' },
          { key: 'k8s', label: 'Kubernetes', value: null, display: 'not read', family: 'turquoise' },
        ]}
      />,
    );
    const names = [...container.querySelectorAll('.pvs-rbars__name')].map((node) => node.textContent);
    expect(names).toEqual(['Business events', 'Logs in context', 'Kubernetes']);
    expect(container.querySelectorAll('.pvs-rbars__name tspan')).toHaveLength(0);
    expect(container.querySelector('.pvs-rbars__value')?.textContent).toBe('100%  Excellent');
    expect(container.querySelectorAll('.pvs-rbars__sector[data-unread="true"] .pvs-rbars__bar')).toHaveLength(0);
    expect(container.querySelector('.pvs-rbars__centre-value')?.textContent).toBe('80');
  });

  it('speaks of next steps and achievements, never of faults', () => {
    expect(EN_TEXT.t('asm.mat.state.open')).toBe('next step');
    expect(EN_TEXT.t('asm.mat.state.met')).toBe('in place');
    expect(EN_TEXT.t('asm.mat.l1.tag')).toBe('The starting point');
    const css = read('ui/app/features/assessment/assessment.css');
    expect(css).toContain("3.4.10: a next step, not a fault");
  });
});
