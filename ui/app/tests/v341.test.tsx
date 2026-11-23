import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { platformAdoption } from '../features/assessment/adoption';
import { deriveAssessmentFindings, type AssessmentSignals } from '../features/assessment/findings';
import { EN_TEXT, type InsightSignals } from '../features/insights/deriveInsights';
import { ALL_KEYS } from '../i18n/strings';

/**
 * 3.4.1 — the Assessment for the SE and the partner (owner's order of 2026-11-18: a PDF like the SE
 * Report, a detailed reading of how the platform is used, think like an SE). Every capability state
 * comes from exact counts; a source that was not read is "not read", never "not used".
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

const MEASURED: AssessmentSignals = {
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
  logRecords: 1000,
  logRecordsWithContext: 10,
  topology: { hubs: [{ name: 'svc-gateway', callers: 14, callees: 3 }], services: 100, isolated: 40, dbServices: 3 },
  vulnerabilities: { total: 120, actNow: 2, critical: 6 },
  ownedServices: 0,
  thirdPartyTools: ['Datadog', 'Prometheus'],
  vitals: { measured: 3, poor: 1 },
  workflows: { workflows: 0, executions: 0, succeeded: 0 },
  cloudProviders: [{ provider: 'AWS', hosts: 18 }],
};

describe('how the platform is used', () => {
  it('reads every capability as not read, never as not used, when nothing was read', () => {
    const rows = platformAdoption(UNREAD, EN_TEXT);
    expect(rows).toHaveLength(13);
    expect(rows.every((row) => row.state === 'unread')).toBe(true);
  });

  it('states each capability from exact counts', () => {
    const state = Object.fromEntries(platformAdoption(MEASURED, EN_TEXT).map((row) => [row.id, row.state]));
    expect(state).toMatchObject({
      oneagent: 'room',
      tracing: 'room',
      logs: 'room',
      kubernetes: 'room',
      cloud: 'in-use',
      rum: 'room',
      synthetic: 'not-detected',
      business: 'not-detected',
      davis: 'in-use',
      workflows: 'not-detected',
      security: 'room',
      ownership: 'not-detected',
      platform: 'room',
    });
    const logs = platformAdoption(MEASURED, EN_TEXT).find((row) => row.id === 'logs');
    expect(logs?.measured).toContain('1.0%');
    expect(logs?.evidence).toEqual(['log.quality']);
  });
});

describe('the rules added in 3.4.1', () => {
  it('fire on the existing catalog reads, the act-now vulnerabilities as critical', () => {
    const findings = deriveAssessmentFindings(NO_INSIGHTS, MEASURED);
    const rules = findings.map((finding) => finding.rule);
    expect(rules).toEqual(expect.arrayContaining(['ASM-05', 'ASM-07', 'ASM-26', 'ASM-27', 'ASM-28', 'ASM-29', 'ASM-30']));
    expect(findings.find((finding) => finding.rule === 'ASM-26')?.cls).toBe('critical');
    expect(findings.find((finding) => finding.rule === 'ASM-05')?.title).toContain('svc-gateway');
  });

  it('raises the strengths when security is in view and automation succeeds', () => {
    const findings = deriveAssessmentFindings(NO_INSIGHTS, {
      ...UNREAD,
      vulnerabilities: { total: 30, actNow: 0, critical: 0 },
      workflows: { workflows: 4, executions: 200, succeeded: 199 },
    });
    expect(findings.map((finding) => finding.rule)).toEqual(expect.arrayContaining(['STR-04', 'STR-05']));
  });

  it('has a conversation question for every rule that can fire', () => {
    const insights: InsightSignals = {
      ...NO_INSIGHTS,
      recurringProblems: [{ name: 'Failure rate increase', occurrences: 99, category: 'ERROR' }],
      restartingWorkloads: [{ workload: 'wl', cluster: 'c', restarts: 999 }],
      pressuredWorkloads: [{ workload: 'wl', cluster: 'c', oomKills: 1, throttled: 0 }],
      pressuredWorkloadsTotal: 1,
      failingServices: [{ name: 'svc', failureRatePct: 9 }],
      logServiceContextPct: 1,
      logUnclassifiedPct: 90,
      emptyBuckets: ['b'],
      unreadableBuckets: ['c'],
      failingWorkflows: [{ title: 'w', executions: 3 }],
      failingWorkflowsTotal: { workflows: 1, failedRuns: 3 },
      securityUnreadable: true,
      experienceUnavailable: true,
    };
    const all = [
      ...deriveAssessmentFindings(insights, MEASURED),
      ...deriveAssessmentFindings(NO_INSIGHTS, {
        ...MEASURED,
        hostModes: { fullStack: 95, infra: 5, other: 0, unknown: 0 },
        servicesAboveOnePct: 0,
        vulnerabilities: { total: 3, actNow: 0, critical: 0 },
        workflows: { workflows: 2, executions: 100, succeeded: 100 },
      }),
    ];
    const keys = new Set<string>(ALL_KEYS);
    for (const finding of all) expect(keys.has(`asm.q.${finding.rule}`), finding.rule).toBe(true);
  });
});

describe('the page', () => {
  it('prints as a report: the SE Report print rules, a PDF button and sections that flow', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain('<style>{PRINT_STYLES}</style>');
    expect(page).toContain('onClick={() => window.print()}');
    expect((page.match(/data-print-section/g) ?? []).length).toBeGreaterThanOrEqual(8);
    // No virtualised grid on paper: the tables are plain tables.
    expect(page).not.toContain('<DataTable');
  });

  it('keeps the conversation guide and the query ids for the SE and the partner, off the paper', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain('const technical = !executiveMode && access.canWork;');
    const guide = page.slice(page.indexOf("{/* 3.4.1 — the conversation guide"));
    expect(guide.slice(0, 200)).toContain('{technical && guideRows.length > 0 && (');
    // Since 3.4.9 the guide is by audience (PersonaGuide): off the paper unless the SE asks for it.
    expect(guide.slice(0, 400)).toContain('<PersonaGuide');
    expect(read('ui/app/features/assessment/PersonaGuide.tsx')).toContain('data-print-hide={print ? undefined : true}');
  });

  it('shares the print rules with the SE Report from one module', () => {
    expect(read('ui/app/pages/ValueReport.tsx')).toContain("import { PRINT_STYLES } from '../engine/printStyles';");
  });
});
