import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { StudioProvider } from '../config/StudioContext';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { getQuery, type CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';
import { translate, type StringKey } from '../i18n/strings';

/**
 * 3.2.3 (wave V4): the pages that took the Spectrum, rendered for real with the one door to Grail
 * (`useCatalogQuery`) answering canned records. What they pin is what the restyle and the data
 * fixes promise: the new pictures appear only from what the tenant said, and no total is taken
 * from a row that should not be summed.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}
let canned: Partial<Record<CatalogId, Canned>> = {};

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId): CatalogQueryResult => {
    const entry = getQuery(id);
    const given = canned[id] ?? {};
    const records = given.records ?? [];
    const outcome: QueryOutcome = given.outcome ?? (records.length > 0 ? 'ok' : 'empty');
    return {
      entry,
      records,
      raw: undefined,
      quality: CLEAN_QUALITY,
      outcome,
      provenance: outcome === 'ok' ? 'observed' : outcome === 'empty' ? 'no-telemetry' : outcome === 'loading' ? 'loading' : 'failed',
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 24 hours' },
      timeframe: {
        startIso: '2026-10-03T21:00:00.000Z',
        endIso: '2026-10-04T21:00:00.000Z',
        label: 'last 24 hours',
        expression: 'now-24h',
      },
      missingScopes: [],
      errorMessage: null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

beforeEach(() => {
  canned = {};
});

const HOUR_NS = String(3_600_000_000_000);
const series = (fields: Record<string, (number | null)[]>): GrailRecord => ({
  timeframe: { start: '2026-10-04T00:00:00.000000000Z', end: '2026-10-04T04:00:00.000000000Z' },
  interval: HOUR_NS,
  ...fields,
});

const INVENTORY: GrailRecord[] = [
  { category: 'Hosts', value: 77 },
  { category: 'Services', value: 76 },
  { category: 'Process instances', value: 400 },
  { category: 'Kubernetes clusters', value: 6 },
  { category: 'Kubernetes workloads', value: 308 },
  { category: 'Web applications', value: 5 },
  { category: 'Mobile applications', value: 0 },
  { category: 'Synthetic monitors', value: 67 },
  { category: 'Synthetic monitors (browser)', value: 42 },
  { category: 'Synthetic monitors (HTTP)', value: 25 },
];

const { CoverageInventory } = await import('../features/assessment/CoverageInventory');
const { Topology } = await import('../pages/Topology');
const { KubernetesAndContainers, throttleLabel } = await import('../pages/KubernetesAndContainers');
const { LogsAndDataQuality } = await import('../pages/LogsAndDataQuality');
const { AutomationAndWorkflows } = await import('../pages/AutomationAndWorkflows');
const { DigitalExperience } = await import('../pages/DigitalExperience');
const { ExecutiveSummary } = await import('../pages/ExecutiveSummary');

describe('/coverage', () => {
  it('counts the eight categories only: the synthetic split rows are never added on top', () => {
    canned['cov.inventory'] = { records: INVENTORY };
    mount(<CoverageInventory />);
    // 77 + 76 + 400 + 6 + 308 + 5 + 0 + 67 = 939. Adding every row would give 1,006.
    expect(screen.getAllByText('939').length).toBeGreaterThan(0);
    expect(screen.queryByText('1,006')).toBeNull();
    expect(screen.getByText('42 browser · 25 HTTP')).toBeTruthy();
  });
});

describe('/topology', () => {
  it('draws who calls what from the measured call relationships, and says how many services make calls', () => {
    canned['svc.topology.calls'] = {
      records: [
        { row: 'link', source: 'WEB_REQUEST_SERVICE', target: 'SQL Server', targetType: 'DATABASE_SERVICE', calls: 6 },
        { row: 'caller', source: 'WEB_REQUEST_SERVICE', services: 6 },
        { row: 'callee', target: 'SQL Server', targetType: 'DATABASE_SERVICE', services: 2 },
        { row: 'total', services: 76, withCalls: 23 },
      ],
    };
    canned['svc.topology.mix'] = { records: [{ tier: 'technology', label: 'JAVA', services: 12 }] };
    const { container } = mount(<Topology />);
    expect(screen.getByText('23 of 76 services make calls the platform recorded.')).toBeTruthy();
    const map = screen.getByRole('group', { name: /Measured call relationships/ });
    expect(within(map).getByRole('link', { name: /SQL Server: 2 services called/ })).toBeTruthy();
    expect(container.querySelectorAll('.pvs-flowmap .pvs-stackmap__link')).toHaveLength(1);
    // The composition chips carry the official glyph where the gallery has one.
    expect(screen.getByRole('list', { name: 'Technologies' }).querySelector('svg.pvs-glyph')).not.toBeNull();
  });

  it('says plainly when no call relationship was recorded, and draws no map', () => {
    canned['svc.topology.calls'] = { records: [{ row: 'total', services: 3, withCalls: 0 }] };
    const { container } = mount(<Topology />);
    expect(screen.getByText(/reports no call relationships/)).toBeTruthy();
    expect(container.querySelector('.pvs-flowmap')).toBeNull();
  });
});

describe('/kubernetes', () => {
  it('opens with the estate in tiles and states throttling as a share of the CPU limit (Q9)', () => {
    canned['k8s.inventory'] = {
      records: [
        { kind: 'clusters', value: 6 },
        { kind: 'nodes', value: 42 },
        { kind: 'namespaces', value: 61 },
        { kind: 'workloads', value: 308 },
        { kind: 'pods', value: 4738 },
      ],
    };
    canned['k8s.pressure'] = {
      records: [
        { workload: 'sqs-demo', cluster: 'loan', totalOom: 252, throttledAvg: 85.8, throttledPct: 17.16 },
        { workload: 'no-limit', cluster: 'loan', totalOom: 0, throttledAvg: 40, throttledPct: null },
      ],
    };
    canned['k8s.restarts.trend'] = { records: [series({ restarts: [67, 65, 64, 51], oomKills: [13, 11, 17, 9] })] };
    mount(<KubernetesAndContainers />);
    // 3.5.1: the estate tiles are StratoKpi cards (the reading on screen and the same text for paper).
    expect(screen.getAllByText('4,738').length).toBeGreaterThan(0);
    // The table's rows are virtualised (no layout in jsdom); its cell text is the pure label.
    const t = (key: StringKey, params?: Readonly<Record<string, string | number>>) => translate(key, 'en', params);
    const decimal = (value: number, digits: number) => value.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits });
    expect(throttleLabel(17.16, 85.8, t, decimal)).toBe('17.2%');
    expect(throttleLabel(null, 40, t, decimal)).toBe('40 mCPU (no limit set)');
    expect(throttleLabel(null, 0, t, decimal)).toBe('—');
    // The restarts chart opens with the window total of the series.
    expect(screen.getByRole('img', { name: /Container restarts per hour/ })).toBeTruthy();
    expect(screen.getByText('247')).toBeTruthy();
  });
});

describe('/logs', () => {
  it('shows the context of every bucket, not only default_logs (C12)', () => {
    canned['log.quality'] = {
      records: [
        { status: 'NONE', bucket: 'default_logs', total: 1_500, withService: 30, withHost: 300, withK8sNamespace: 0 },
        { status: 'INFO', bucket: 'logs_teste', total: 500, withService: 100, withHost: 500, withK8sNamespace: 500 },
      ],
    };
    mount(<LogsAndDataQuality />);
    expect(screen.getByText('logs_teste')).toBeTruthy();
    expect(screen.getByText('default_logs')).toBeTruthy();
    // The band's sample is every bucket: 2,000 records.
    expect(screen.getAllByText('2,000').length).toBeGreaterThan(0);
  });
});

describe('/automation', () => {
  it('rings the success rate and ranks the workflows that fail, never summing the ranked rows', () => {
    canned['auto.workflows.total'] = { records: [{ workflows: 20, executions: 6469, succeeded: 5580, failed: 889, failingWorkflows: 4 }] };
    canned['auto.failing'] = {
      records: [
        { title: 'Business Data Generator', executions: 576, failed: 576, failureRatePct: 100 },
        { title: 'Carbon Impact', executions: 24, failed: 24, failureRatePct: 100 },
      ],
    };
    mount(<AutomationAndWorkflows />);
    expect(screen.getByRole('img', { name: 'Share of finished workflow executions that succeeded: 86.3%' })).toBeTruthy();
    expect(screen.getByText('576 of 576 runs failed (100%)')).toBeTruthy();
    // The figure of failed runs is the aggregate's 889, not 576 + 24.
    expect(screen.getAllByText('889').length).toBeGreaterThan(0);
    expect(screen.queryByText('600')).toBeNull();
  });
});

describe('/experience', () => {
  it('draws each vital on a dial with its published zones, CLS in its published unit', () => {
    canned['rum.scorecard'] = {
      records: [{ 'frontend.name': 'easyTravel', requests: 1000, actions: 500, errors: 5, users: 40, sessions: 60 }],
    };
    canned['rum.webvitals'] = { records: [{ 'frontend.name': 'easyTravel', lcp: 1800, inp: 250, cls: 850 }] };
    const { container } = mount(<DigitalExperience />);
    expect(container.querySelectorAll('.pvs-tgauge')).toHaveLength(3);
    // The tenant's CLS field is the score × 10,000: 850 is 0.085.
    expect(screen.getByRole('img', { name: 'Cumulative Layout Shift: 0.085, Good' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Interaction to Next Paint: 250 ms, Needs improvement' })).toBeTruthy();
  });
});

describe('/executive', () => {
  it('opens as a story: three rings, five numbers and what changed this week', () => {
    canned['cov.inventory'] = { records: INVENTORY };
    canned['prob.summary'] = {
      records: [
        { 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 90 },
        { 'event.category': 'ERROR', 'event.status': 'ACTIVE', problems: 10 },
      ],
    };
    canned['svc.ranking.total'] = { records: [{ services: 50, failing: 10, aboveOnePct: 5 }] };
    canned['prob.timeline'] = {
      records: Array.from({ length: 14 }, (_, index) => ({
        interval: new Date(Date.parse('2026-09-28T00:00:00Z') + index * 6 * 3_600_000).toISOString(),
        problems: 4,
      })),
    };
    const { container } = mount(<ExecutiveSummary />);
    expect(container.querySelectorAll('.pvs-gauge')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Services below 1% failed requests: 90%' })).toBeTruthy();
    expect(container.querySelectorAll('.pvs-kpi')).toHaveLength(5 + container.querySelectorAll('.pvs-tile').length);
    expect(screen.getByText('What changed this week')).toBeTruthy();
    expect(screen.getByText('Next steps')).toBeTruthy();
  });
});
