import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assumed } from '../config/assumptions';
import { EXECUTIVE_HIDDEN_ROUTES, NAVIGATION, RESTRICTED_ROUTES, SE_ONLY_ROUTES, STORY_STAGES } from '../config/navigation';
import { computeIndex, presenceDomain, ratioDomain, type DomainReading } from '../features/assessment/coverageIndex';
import { deriveAssessmentFindings, orderFindings, priorityOf, type AssessmentSignals } from '../features/assessment/findings';
import { domainOrderFor, findingsFor } from '../features/assessment/lenses';
import type { InsightSignals } from '../features/insights/deriveInsights';

/**
 * 3.4.0 — the Assessment (owner's order "Sim, iniciar 3.4.0" on `docs/v3.4/PROPOSTA-3.4.md` Part C).
 * The index divides only what was measured and applies; a finding fires only on a signal that was
 * read; the page carries no money and no new query.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const NO_INSIGHTS: InsightSignals = {
  recurringProblems: [],
  restartingWorkloads: [],
  pressuredWorkloads: [],
  failingServices: [],
  logServiceContextPct: null,
  logUnclassifiedPct: null,
  emptyBuckets: [],
  unreadableBuckets: [],
  failingWorkflows: [],
  pressuredWorkloadsTotal: null,
  failingWorkflowsTotal: null,
  inefficientTables: [],
  securityUnreadable: false,
  experienceUnavailable: false,
  windowLabel: 'last 24 hours',
  recurringWindowLabel: 'last 7 days',
};

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

const reading = (id: DomainReading['id'], state: DomainReading['state']): DomainReading => ({ id, state, queryIds: [] });

describe('the observable-coverage index', () => {
  it('is the weighted mean of the measured domains only, as in the proposal’s worked example', () => {
    const index = computeIndex([
      reading('infra', ratioDomain(60, 64, ['ok'])),
      reading('apm', ratioDomain(52, 80, ['ok', 'ok'])),
      reading('logs', ratioDomain(340_000, 1_200_000, ['ok'])),
      reading('k8s', ratioDomain(2, 2, ['ok', 'ok'])),
      reading('experience', ratioDomain(null, 3, ['no-permission', 'ok'])),
      reading('business', presenceDomain(10, ['ok'])),
    ]);
    // 25×0.9375 + 25×0.65 + 15×0.2833 + 10×1 + 5×1 = 58.69 over 80 measured points.
    expect(index.measuredWeight).toBe(80);
    expect(index.applicableWeight).toBe(95);
    expect(index.value).toBe(Math.round((100 * (25 * (60 / 64) + 25 * 0.65 + 15 * (340_000 / 1_200_000) + 10 + 5)) / 80));
    expect(index.domains.find((domain) => domain.id === 'experience')?.contribution).toBeNull();
  });

  it('keeps a domain with nothing to observe out of the sum instead of counting it as zero', () => {
    expect(ratioDomain(0, 0, ['ok', 'ok'])).toEqual({ kind: 'not-applicable' });
    const index = computeIndex([reading('infra', ratioDomain(10, 10, ['ok'])), reading('k8s', ratioDomain(0, 0, ['ok', 'ok']))]);
    expect(index.applicableWeight).toBe(assumed('assessment.weight.infra'));
    expect(index.value).toBe(100);
  });

  it('shows no number below the minimum share of the applicable weight measured', () => {
    const index = computeIndex([
      reading('infra', ratioDomain(null, null, ['error'])),
      reading('apm', ratioDomain(null, null, ['no-permission', 'ok'])),
      reading('logs', ratioDomain(1, 2, ['ok'])),
    ]);
    expect(index.reach).toBeLessThan(assumed('assessment.minWeight') / 100);
    expect(index.value).toBeNull();
    expect(index.missing).toBe('insufficient');
  });

  it('turns counts that disagree into a failed reading, never a share cut to 100 %', () => {
    expect(ratioDomain(7, 6, ['ok', 'ok'])).toEqual({ kind: 'unavailable', reason: 'incoherent' });
  });

  it('leaves a read stopped early out of the index', () => {
    expect(ratioDomain(5, 10, ['scan-limit'])).toEqual({ kind: 'unavailable', reason: 'partial' });
  });

  it('counts business events as presence', () => {
    expect(presenceDomain(0, ['ok'])).toMatchObject({ kind: 'measured', share: 0, presence: true });
    expect(presenceDomain(12, ['ok'])).toMatchObject({ kind: 'measured', share: 1 });
    expect(presenceDomain(null, ['no-permission'])).toEqual({ kind: 'unavailable', reason: 'no-permission' });
  });

  it('weighs the six domains as the owner approved (D-C1)', () => {
    expect(
      ['infra', 'apm', 'logs', 'k8s', 'experience', 'business'].map((id) => assumed(`assessment.weight.${id}` as 'assessment.weight.infra')),
    ).toEqual([25, 25, 15, 10, 15, 5]);
  });
});

describe('the assessment findings', () => {
  it('raises nothing from signals that were not read', () => {
    expect(deriveAssessmentFindings(NO_INSIGHTS, UNREAD)).toEqual([]);
  });

  it('raises the coverage findings and strengths from measured counts', () => {
    const findings = deriveAssessmentFindings(NO_INSIGHTS, {
      ...UNREAD,
      hostModes: { fullStack: 10, infra: 50, other: 0, unknown: 7 },
      servicesInModel: 100,
      servicesWithTraffic: 40,
      servicesAboveOnePct: 1,
      clusters: 3,
      clustersWithMetrics: 2,
      webApps: 4,
      frontendsWithRealUsers: 1,
      syntheticMonitors: 0,
      publicDomainServices: 0,
      bizEvents: 0,
      saturatedHosts: 2,
      resolved: { problems: 12, meanHours: 3.5 },
    });
    const rules = findings.map((finding) => finding.rule);
    expect(rules).toEqual(expect.arrayContaining(['ASM-01', 'ASM-02', 'ASM-03', 'ASM-12', 'ASM-15', 'ASM-16', 'ASM-18', 'ASM-22', 'STR-01', 'STR-02', 'STR-03']));
    // Classes in order: critical, attention, opportunity, strength.
    const order = ['critical', 'warning', 'opportunity', 'strength'];
    const classes = findings.map((finding) => order.indexOf(finding.cls));
    expect([...classes].sort((a, b) => a - b)).toEqual(classes);
    expect(findings.find((finding) => finding.rule === 'ASM-02')?.observation).toContain('7');
  });

  it('classes many failing services as critical and keeps the billing rule out (rule 6)', () => {
    const insights: InsightSignals = {
      ...NO_INSIGHTS,
      failingServices: [{ name: 'svc-a', failureRatePct: 9 }],
      inefficientTables: [{ table: 'logs', bytesPerRecord: 9_000, scannedBytes: 9_000_000_000 }],
    };
    const few = deriveAssessmentFindings(insights, { ...UNREAD, servicesAboveOnePct: 1 });
    const many = deriveAssessmentFindings(insights, { ...UNREAD, servicesAboveOnePct: assumed('assessment.failing.critical') });
    expect(few.find((finding) => finding.rule === 'ASM-04')?.cls).toBe('warning');
    expect(many.find((finding) => finding.rule === 'ASM-04')?.cls).toBe('critical');
    expect(many.some((finding) => finding.category === 'consumption')).toBe(false);
  });

  it('never lets a limit of the reading outrank a measured finding of the same class', () => {
    const findings = deriveAssessmentFindings({ ...NO_INSIGHTS, securityUnreadable: true }, { ...UNREAD, saturatedHosts: 1 });
    const warnings = orderFindings(findings).filter((finding) => finding.cls === 'warning');
    expect(warnings.map((finding) => finding.kind)).toEqual(['finding', 'gap']);
  });

  it('gives strengths no priority and critical findings P1', () => {
    const findings = deriveAssessmentFindings(NO_INSIGHTS, { ...UNREAD, resolved: { problems: 3, meanHours: 2 }, saturatedHosts: 1 });
    expect(priorityOf(findings.find((finding) => finding.cls === 'strength')!)).toBeNull();
    expect(priorityOf({ ...findings[0]!, cls: 'critical' })).toBe('P1');
  });
});

describe('the lenses', () => {
  it('keep their own findings and put their domains first, never changing the index', () => {
    const findings = deriveAssessmentFindings(NO_INSIGHTS, { ...UNREAD, clusters: 2, clustersWithMetrics: 1, saturatedHosts: 1 });
    expect(findingsFor('kubernetes', findings).map((finding) => finding.rule)).toEqual(['ASM-12']);
    expect(findingsFor('general', findings)).toHaveLength(findings.length);
    const ids = domainOrderFor('kubernetes', [{ id: 'infra' as const }, { id: 'k8s' as const }]).map((domain) => domain.id);
    expect(ids).toEqual(['k8s', 'infra']);
  });
});

describe('the page', () => {
  it('opens the Coverage stage, stays in executive mode and is not open to a viewer without access (D-C2, D-C3)', () => {
    // 3.4.12: the Assessment and Coverage are one page, at /coverage; /assessment only redirects there.
    expect(NAVIGATION.some((section) => section.route === '/assessment')).toBe(false);
    expect(STORY_STAGES.find((stage) => stage.id === 'coverage')?.routes[0]).toBe('/coverage');
    expect(EXECUTIVE_HIDDEN_ROUTES.has('/coverage')).toBe(false);
    expect(RESTRICTED_ROUTES.has('/coverage')).toBe(false);
    expect(SE_ONLY_ROUTES.has('/coverage')).toBe(false);
  });

  it('carries no money and reads through the catalog only', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    const hook = read('ui/app/features/assessment/useAssessment.ts');
    for (const source of [page, hook]) {
      expect(source).not.toMatch(/formatMoney|rateCard|localValue|useDql\(|from '@dynatrace-sdk\/react-hooks'/);
    }
    expect(hook).toContain("useCatalogQuery('cov.inventory'");
  });
});
