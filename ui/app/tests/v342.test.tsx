import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComparisonView } from '../features/assessment/ComparisonView';

import { platformAdoption } from '../features/assessment/adoption';
import { computeIndex, presenceDomain, ratioDomain } from '../features/assessment/coverageIndex';
import { assessmentFileName, buildAssessmentFile } from '../features/assessment/exportJson';
import { deriveAssessmentFindings, type AssessmentSignals } from '../features/assessment/findings';
import {
  addSnapshot,
  compareSnapshots,
  EMPTY_HISTORY,
  MAX_SNAPSHOTS,
  parseHistory,
  removeSnapshot,
  toSnapshot,
  type AssessmentSnapshot,
} from '../features/assessment/history';
import { EN_TEXT, type InsightSignals } from '../features/insights/deriveInsights';
import type { CatalogQueryResult } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';

/**
 * 3.4.2 — the Assessment before × after (F-01), as a file (F-02) and co-branded (F-10). Owner's order
 * of 2026-11-18: "Seguir com o próximo release com suas sugestões."
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

const SIGNALS: AssessmentSignals = {
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
  topology: null,
  vulnerabilities: null,
  ownedServices: null,
  thirdPartyTools: null,
  vitals: null,
  workflows: null,
  cloudProviders: null,
};

const reading = (infra: [number, number], apm: [number, number], at: string): AssessmentSnapshot => {
  const index = computeIndex([
    { id: 'infra', queryIds: [], state: ratioDomain(infra[0], infra[1], ['ok']) },
    { id: 'apm', queryIds: [], state: ratioDomain(apm[0], apm[1], ['ok', 'ok']) },
    { id: 'logs', queryIds: [], state: ratioDomain(null, null, ['no-permission']) },
    { id: 'business', queryIds: [], state: presenceDomain(5, ['ok']) },
  ]);
  return toSnapshot(
    { index, adoption: platformAdoption(SIGNALS, EN_TEXT), findings: deriveAssessmentFindings(NO_INSIGHTS, SIGNALS) },
    { readAt: at, savedAt: at, savedBy: 'se@example.com', appVersion: '3.4.2', window: 'Last 7 days' },
  );
};

describe('kept readings', () => {
  it('keep the newest first, replace a reading of the same moment and stop at the limit', () => {
    let history = EMPTY_HISTORY;
    for (let day = 1; day <= MAX_SNAPSHOTS + 3; day += 1) {
      history = addSnapshot(history, reading([5, 10], [5, 10], `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`));
    }
    expect(history.snapshots).toHaveLength(MAX_SNAPSHOTS);
    expect(history.snapshots[0]?.readAt).toBe('2026-11-15T12:00:00.000Z');
    const again = addSnapshot(history, reading([9, 10], [5, 10], '2026-11-15T12:00:00.000Z'));
    expect(again.snapshots).toHaveLength(MAX_SNAPSHOTS);
    expect(removeSnapshot(again, '2026-11-15T12:00:00.000Z').snapshots).toHaveLength(MAX_SNAPSHOTS - 1);
  });

  it('never trust what is stored: a broken document reads as empty, a broken reading is dropped', () => {
    expect(parseHistory('not json')).toEqual(EMPTY_HISTORY);
    const good = reading([5, 10], [5, 10], '2026-11-01T12:00:00.000Z');
    const parsed = parseHistory(JSON.stringify({ v: 1, snapshots: [good, { v: 1, readAt: 'nope' }, { ...good, index: 400 }] }));
    expect(parsed.snapshots).toHaveLength(2);
    expect(parsed.snapshots[1]?.index).toBeNull();
  });
});

describe('before × after', () => {
  it('states a difference only where both readings measured', () => {
    const before = reading([5, 10], [5, 10], '2026-11-01T12:00:00.000Z');
    const now = reading([9, 10], [5, 10], '2026-11-18T12:00:00.000Z');
    const comparison = compareSnapshots(before, now);
    expect(comparison.index.delta).toBe((now.index ?? 0) - (before.index ?? 0));
    expect(comparison.domains.find((row) => row.id === 'infra')?.delta).toBeCloseTo(40);
    // Logs were not read in either: no difference, never a zero.
    expect(comparison.domains.find((row) => row.id === 'logs')?.delta).toBeNull();
  });

  it('names the findings no longer raised and the new ones', () => {
    const before = reading([5, 10], [5, 10], '2026-11-01T12:00:00.000Z');
    const now: AssessmentSnapshot = { ...before, readAt: '2026-11-18T12:00:00.000Z', findings: before.findings.filter((finding) => finding.rule !== 'ASM-18') };
    now.findings.push({ rule: 'ASM-99', cls: 'warning', title: 'New one' });
    const comparison = compareSnapshots(before, now);
    expect(comparison.resolved.map((finding) => finding.rule)).toEqual(['ASM-18']);
    expect(comparison.raised.map((finding) => finding.rule)).toEqual(['ASM-99']);
  });
});

describe('the comparison on screen', () => {
  it('draws the index, the domains and the findings of both readings', () => {
    const before = reading([5, 10], [5, 10], '2026-11-01T12:00:00.000Z');
    const now = reading([9, 10], [5, 10], '2026-11-18T12:00:00.000Z');
    render(
      <ComparisonView
        before={before}
        now={now}
        comparison={compareSnapshots(before, now)}
        t={EN_TEXT.t}
        formatNumber={EN_TEXT.formatNumber}
        formatDateTime={(iso) => iso.slice(0, 10)}
      />,
    );
    expect(screen.getByTestId('asm-hist-index').textContent).toContain('Index then');
    expect(screen.getByTestId('asm-hist-domains').textContent).toContain('+40.0 p.p.');
    expect(screen.getByTestId('asm-hist-domains').textContent).toContain('not read');
    expect(screen.getByTestId('asm-hist-resolved').textContent).toContain('No longer raised: 0');
  });
});

describe('the assessment as a file', () => {
  it('carries every source with its DQL and read time, and no tenant, URL, token or price', () => {
    const result = {
      entry: getQuery('cov.inventory'),
      outcome: 'ok',
      timeframe: { label: 'timeframe.now-24h' },
      evidence: { queryId: 'cov.inventory', source: 'dt.entity.*', timeframe: 'last 24 h', collectedAt: '2026-11-18T12:00:00.000Z' },
      dql: getQuery('cov.inventory').dql,
    } as unknown as CatalogQueryResult;
    const index = computeIndex([{ id: 'infra', queryIds: ['cov.hosts.breakdown'], state: ratioDomain(9, 10, ['ok']) }]);
    const file = buildAssessmentFile(
      { index, adoption: platformAdoption(SIGNALS, EN_TEXT), findings: deriveAssessmentFindings(NO_INSIGHTS, SIGNALS), reads: [result, result] },
      { appVersion: '3.4.2', generatedAt: '2026-11-18T12:00:00.000Z', customer: 'Acme', engagement: 'PoC', lens: 'general', window: { label: 'Last 24 hours', startIso: 'a', endIso: 'b' } },
    );
    const text = JSON.stringify(file);
    expect((file.sources as unknown[]).length).toBe(1);
    expect(text).toContain('fetch dt.entity.host');
    expect(text).toContain('2026-11-18T12:00:00.000Z');
    expect(text).not.toMatch(/apps\.dynatrace\.com|https?:\/\/|token|USD|R\$|€/i);
    expect(assessmentFileName('Açme Corp', new Date('2026-11-18T00:00:00Z'))).toBe('assessment-acme-corp-2026-11-18.json');
  });
});

describe('the page and the PoC', () => {
  it('keeps the save, the comparison choice and the JSON for the SE and the partner; the comparison prints when chosen', () => {
    const page = read('ui/app/pages/Assessment.tsx');
    expect(page).toContain("{technical && (\n                <Button onClick={downloadJson}");
    expect(page).toContain('data-testid="asm-history"');
    expect(page).toContain('data-print-section={comparison === null ? undefined : true}');
    expect(page).toContain('data-testid="asm-cobrand"');
  });

  it('clears the kept readings with the PoC on "New PoC"', () => {
    const persistence = read('ui/app/config/useTenantPersistence.ts');
    expect(persistence).toContain("store.remove('app', ASSESSMENT_HISTORY_KEY)");
  });
});
