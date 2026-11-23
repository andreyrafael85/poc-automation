import { describe, expect, it } from 'vitest';

import { buildDimensions, type ScorecardSources } from '../features/scorecard/Scorecard';
import { translate, type StringKey } from '../i18n/strings';
import type { QueryOutcome } from '../hooks/useCatalogQuery';
import type { GrailRecord } from '../utils/records';

/**
 * The scorecard sits on the Overview. Its rows used to state counts they had not read
 * ("0 buckets enumerated"), a fixed "Working" for anomaly detection, and a red "Blocked"
 * for a missing permission. A row whose source did not answer says "Not read" and states
 * no figure; a refusal is never red.
 */

const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
const formatNumber = (value: number) => value.toLocaleString('en-US');

const source = (outcome: QueryOutcome, records: GrailRecord[] = [], missingScopes: string[] = []) => ({
  outcome,
  records,
  missingScopes,
});

const inventory = (counts: Record<string, number>): GrailRecord[] =>
  Object.entries(counts).map(([category, value]) => ({ category, value }));

const answeredSources = (): ScorecardSources => ({
  inventory: source('ok', inventory({ Hosts: 62, Services: 70, 'Kubernetes clusters': 3, 'Kubernetes workloads': 138 })),
  buckets: source('ok', [
    { table: 'spans', hasAccess: true, records: 5_000_000, retentionDays: 10 },
    { table: 'logs', hasAccess: true, records: 1_000 },
    { table: 'user.sessions', hasAccess: true, records: 4_000 },
  ]),
  security: source('ok', [{ id: 1 }]),
  // `auto.workflows.total`: one aggregate row over every finished execution.
  workflows: source('ok', [{ workflows: 3, executions: 10, succeeded: 10, failed: 0, failingWorkflows: 0 }]),
  capabilities: source('ok', [{ capability: 'Full-Stack Monitoring' }]),
  problems: source('ok', [{ 'event.status': 'CLOSED', problems: 4 }]),
});

const row = (sources: ScorecardSources, id: string) => {
  const found = buildDimensions(sources, t, formatNumber).find((dimension) => dimension.id === id);
  if (found === undefined) throw new Error(`no row ${id}`);
  return found;
};

describe('buildDimensions', () => {
  it('states what was read when every source answered', () => {
    const sources = answeredSources();
    expect(row(sources, 'observational-coverage').status).toBe('good');
    expect(row(sources, 'observational-coverage').evidence).toContain('62 hosts');
    expect(row(sources, 'anomaly-detection').status).toBe('good');
    expect(row(sources, 'diagnostic-capability').status).toBe('good');
    expect(row(sources, 'digital-experience').status).toBe('good');
    expect(row(sources, 'data-governance').status).toBe('good');
    expect(row(sources, 'security').status).toBe('good');
  });

  it('says "not read" and states no figure when a source failed', () => {
    const sources: ScorecardSources = {
      inventory: source('error'),
      buckets: source('error'),
      security: source('error'),
      workflows: source('error'),
      capabilities: source('error'),
      problems: source('error'),
    };
    for (const dimension of buildDimensions(sources, t, formatNumber)) {
      expect(dimension.status, dimension.id).toBe('unread');
      expect(dimension.evidence, dimension.id).toBe(t('f.score.unread.failed'));
      expect(dimension.evidence, dimension.id).not.toMatch(/\b0\b/);
    }
  });

  it('does not claim detection works from a problem feed that failed or was empty', () => {
    expect(row({ ...answeredSources(), problems: source('error') }, 'anomaly-detection').status).toBe('unread');
    const empty = row({ ...answeredSources(), problems: source('empty') }, 'anomaly-detection');
    expect(empty.status).toBe('neutral');
    expect(empty.evidence).toBe(t('f.score.d.anomaly.empty'));
  });

  it('never turns a refusal into a fault: no row is "critical" for a missing permission', () => {
    const sources: ScorecardSources = {
      ...answeredSources(),
      security: source('no-permission', [], ['storage:security.events:read']),
      buckets: source('ok', [{ table: 'user.sessions', hasAccess: false, records: 0 }]),
    };
    expect(row(sources, 'security').status).toBe('unread');
    expect(row(sources, 'security').evidence).toBe(t('f.score.d.security.denied'));
    expect(row(sources, 'security').gap).toContain('storage:security.events:read');
    expect(row(sources, 'digital-experience').status).toBe('unread');
    for (const dimension of buildDimensions(sources, t, formatNumber)) {
      expect(dimension.status, dimension.id).not.toBe('critical');
    }
  });

  it('names a refused source as a missing scope and a failed one as not answering', () => {
    const refused = row({ ...answeredSources(), workflows: source('no-permission') }, 'automation');
    expect(refused.evidence).toBe(t('f.score.unread.refused'));
    const failed = row({ ...answeredSources(), workflows: source('error') }, 'automation');
    expect(failed.evidence).toBe(t('f.score.unread.failed'));
  });

  it('keeps a measured shortfall as a measured shortfall', () => {
    const sources: ScorecardSources = {
      ...answeredSources(),
      buckets: source('ok', [
        { table: 'logs', hasAccess: false, records: 0 },
        { table: 'spans', hasAccess: true, records: 100, retentionDays: 10 },
        { table: 'user.sessions', hasAccess: true, records: 40 },
      ]),
      workflows: source('ok', [{ workflows: 3, executions: 12, succeeded: 10, failed: 2, failingWorkflows: 1 }]),
    };
    expect(row(sources, 'data-governance').status).toBe('warning');
    expect(row(sources, 'automation').status).toBe('warning');
    expect(row(sources, 'digital-experience').status).toBe('warning');
  });

  it('every Portuguese string for the new states exists and differs from English', () => {
    for (const key of ['f.score.status.unread', 'f.score.unread.refused', 'f.score.unread.failed', 'f.score.d.anomaly.empty'] as const) {
      expect(translate(key, 'pt-BR')).not.toBe(translate(key, 'en'));
    }
  });
});
