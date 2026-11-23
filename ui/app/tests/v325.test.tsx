import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { SHARED_KEY, parseShared, sharedContent, EMPTY_SHARED } from '../config/persistence';
import { createMemoryStore } from '../config/stateStore';
import { StudioProvider, useStudio } from '../config/StudioContext';
import { useCriteriaResults } from '../features/criteria/CriteriaPanel';
import { FixQueue } from '../features/security/FixQueue';
import { PocPlanEditor, pickedDate } from '../features/pocPlan/PocPlanEditor';
import {
  DASHBOARD_SECTIONS,
  DASHBOARD_TILES,
  buildPocDashboard,
  classifyDashboardError,
  markdownText,
  pinWindow,
} from '../features/dashboard/pocDashboard';
import { objectivesSection } from '../features/wrapup/useWrapupViewModel';
import { buildWrapupModel, type WrapupResults } from '../features/wrapup/model';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import {
  capabilityUnit,
  linearFit,
  MIN_PROJECTION_DAYS,
  projectForward,
  summariseConsumption,
} from '../models/consumptionForecast';
import { CRITERION_METRICS, CRITERION_METRIC_IDS, evaluateCriterion, progressTowards } from '../models/criteria';
import { automationPlay, incidentStories } from '../models/incidentStories';
import { compareWeeks, inventoryDeltas, pocMilestones, problemDays } from '../models/pocBaseline';
import { EMPTY_POC_PLAN, MAX_CRITERIA, isIsoDate, parsePocPlan, pocDay, pocWindows, type PocPlan, type SuccessCriterion } from '../models/pocPlan';
import type { RcaIncident } from '../models/rca';
import { fixQueue, serviceOwnership } from '../models/securityQueue';
import { PocTimeline } from '../pages/PocTimeline';
import { CATALOG, getQuery, type CatalogId } from '../queries/catalog';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import type { GrailRecord } from '../utils/records';

/**
 * 3.2.5 (milestone M5): the PoC plan (dates and success criteria), the baseline rebuilt from
 * Grail, measured MTTR, incident stories, the security fix queue with context, the "Value of the
 * PoC" dashboard and the consumption projection.
 */

interface Canned {
  outcome?: QueryOutcome;
  records?: GrailRecord[];
}
let canned: Partial<Record<CatalogId, Canned>> = {};
const calls: { id: CatalogId; enabled: boolean }[] = [];

vi.mock('../hooks/useCatalogQuery', () => ({
  useCatalogQuery: (id: CatalogId, options: { enabled?: boolean } = {}): CatalogQueryResult => {
    calls.push({ id, enabled: options.enabled !== false });
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
      timeframe: { startIso: '2026-10-04T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 24 hours', expression: 'now-24h' },
      missingScopes: [],
      errorMessage: null,
      isLoading: outcome === 'loading',
      refetch: () => undefined,
    };
  },
}));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: () => ({ data: undefined, error: undefined, isLoading: false, refetch: () => undefined }),
}));

beforeEach(() => {
  canned = {};
  calls.length = 0;
});

const en = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params);
const criterion = (patch: Partial<SuccessCriterion>): SuccessCriterion => ({
  id: 'c1',
  metric: 'coverage.categories',
  operator: '>=',
  target: 80,
  text: '',
  origin: '',
  manualStatus: 'pending',
  ...patch,
});
const NOW = new Date('2026-10-05T12:00:00.000Z');

const mount = (node: React.ReactNode, store: ReturnType<typeof createMemoryStore> | null = null) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider store={store}>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

// ------------------------------------------------------------------ the plan

describe('the PoC plan', () => {
  it('keeps real calendar days only, and an end that is not before the start', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-09-14')).toBe(true);
    const plan = parsePocPlan({ startDate: '2026-09-14', endDate: '2026-09-01', criteria: [] });
    expect(plan.startDate).toBe('2026-09-14');
    expect(plan.endDate).toBeNull();
    expect(parsePocPlan('nonsense')).toEqual(EMPTY_POC_PLAN);
  });

  it('drops a manual criterion without words and anything unknown, caps the list and fixes clashing keys', () => {
    const many = Array.from({ length: MAX_CRITERIA + 5 }, (_, index) => ({ id: 'same', metric: 'problems.open', operator: '<=', target: index }));
    const plan = parsePocPlan({
      criteria: [{ id: 'x', metric: 'manual', text: '   ' }, { id: 'y', metric: 'licences.cost', target: 1 }, ...many],
    });
    expect(plan.criteria).toHaveLength(MAX_CRITERIA - 2);
    expect(new Set(plan.criteria.map((item) => item.id)).size).toBe(plan.criteria.length);
    expect(plan.criteria.every((item) => item.metric === 'problems.open')).toBe(true);
  });

  it('counts the days of the PoC and anchors its windows to the start date, capped at 90 days', () => {
    expect(pocDay('2026-10-01', NOW)).toBe(5);
    expect(pocDay('2026-10-09', NOW)).toBeNull();
    const windows = pocWindows('2026-10-01', NOW);
    expect(windows?.since.startIso).toBe('2026-10-01T00:00:00.000Z');
    expect(windows?.day0).toMatchObject({ startIso: '2026-10-01T00:00:00.000Z', endIso: '2026-10-02T00:00:00.000Z', label: 'timeframe.poc.day0' });
    const old = pocWindows('2026-01-01', NOW);
    expect(old?.clamped).toBe(true);
    expect(Date.parse(old!.since.startIso)).toBe(NOW.getTime() - 90 * 24 * 3_600_000);
    expect(pocWindows(null, NOW)).toBeNull();
    expect(pocWindows('2026-12-01', NOW)).toBeNull();
  });

  it('travels in the shared document, loads empty from a document written before 3.2.5, and counts as a change', () => {
    const plan: PocPlan = { ...EMPTY_POC_PLAN, startDate: '2026-09-14', criteria: [criterion({})] };
    const doc = { v: 1, rev: 3, savedAt: '', savedBy: null, parameters: EMPTY_SHARED.parameters, pillars: [], poc: plan };
    expect(parseShared(JSON.stringify(doc))?.poc).toEqual(plan);
    const older: Record<string, unknown> = { ...doc };
    delete older['poc'];
    expect(parseShared(JSON.stringify(older))?.poc).toEqual(EMPTY_POC_PLAN);
    expect(sharedContent({ ...EMPTY_SHARED, poc: plan })).not.toBe(sharedContent(EMPTY_SHARED));
  });

  it('reads a picked day whether the picker hands a bare day or a timestamp', () => {
    expect(pickedDate('2026-09-14')).toBe('2026-09-14');
    expect(pickedDate({ value: '2026-09-14', absoluteDate: '2026-09-14T03:00:00.000Z', type: 'iso8601' })).toBe('2026-09-14');
    expect(pickedDate(null)).toBeNull();
    expect(pickedDate('not a date')).toBeNull();
  });

  it('is loaded from the tenant with the rest of the PoC', async () => {
    const plan: PocPlan = { ...EMPTY_POC_PLAN, startDate: '2026-09-20', criteria: [criterion({ metric: 'problems.mttr', operator: '<=', target: 4 })] };
    const store = createMemoryStore({
      [`app:${SHARED_KEY}`]: JSON.stringify({ v: 1, rev: 1, savedAt: '', savedBy: null, parameters: EMPTY_SHARED.parameters, pillars: [], poc: plan }),
    });
    const { result } = renderHook(() => useStudio(), { wrapper: ({ children }) => <StudioProvider store={store}>{children}</StudioProvider> });
    await waitFor(() => expect(result.current.pocPlan.startDate).toBe('2026-09-20'));
    expect(result.current.pocPlan.criteria[0]?.metric).toBe('problems.mttr');
    expect(result.current.pocWindows?.startDate).toBe('2026-09-20');
  });
});

// ------------------------------------------------------------------ success criteria

describe('success criteria, judged live', () => {
  const inventory: GrailRecord[] = ['Hosts', 'Services', 'Process instances', 'Kubernetes clusters', 'Kubernetes workloads', 'Web applications', 'Mobile applications', 'Synthetic monitors'].map(
    (category, index) => ({ category, value: index < 6 ? 10 : 0 }),
  );

  it('meets, misses and measures progress both ways', () => {
    expect(evaluateCriterion(criterion({ target: 70 }), inventory, 'ok')).toMatchObject({ status: 'met', value: 75, progressPct: 100 });
    expect(evaluateCriterion(criterion({ target: 100 }), inventory, 'ok')).toMatchObject({ status: 'not-met', progressPct: 75 });
    expect(progressTowards(8, '<=', 4)).toBe(50);
    expect(progressTowards(3, '<=', 4)).toBe(100);
  });

  it('never judges an unanswered query as missed, and reads an empty count as zero', () => {
    expect(evaluateCriterion(criterion({}), [], 'no-permission').status).toBe('not-read');
    // A partial read has rows, and "at most 5 open" must not be called met from a count that stopped early.
    expect(evaluateCriterion(criterion({ metric: 'problems.open', operator: '<=', target: 5 }), [{ activeProblems: 3 }], 'scan-limit').status).toBe('not-read');
    expect(evaluateCriterion(criterion({ target: 50 }), inventory, 'error').status).toBe('not-read');
    expect(evaluateCriterion(criterion({}), [], 'loading').status).toBe('measuring');
    expect(evaluateCriterion(criterion({ metric: 'problems.open', operator: '<=', target: 5 }), [], 'empty')).toMatchObject({ status: 'met', value: 0 });
    expect(evaluateCriterion(criterion({ target: null }), inventory, 'ok').status).toBe('no-target');
  });

  it('carries the team verdict on a manual criterion', () => {
    expect(evaluateCriterion(criterion({ metric: 'manual', text: 'Root cause without a war room', manualStatus: 'met' }), [], null).status).toBe('manual-met');
    expect(evaluateCriterion(criterion({ metric: 'manual', text: 'x' }), [], null).status).toBe('manual-pending');
  });

  it('runs exactly the queries the criteria name, and every metric reads a catalog query', () => {
    for (const id of CRITERION_METRIC_IDS) expect(CATALOG[CRITERION_METRICS[id].queryId], id).toBeDefined();
    renderHook(() => useCriteriaResults(CRITERION_METRIC_IDS.map((metric, index) => criterion({ id: `c${index}`, metric }))), {
      wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider>,
    });
    const enabled = new Set(calls.filter((call) => call.enabled).map((call) => call.id));
    for (const id of CRITERION_METRIC_IDS) expect(enabled.has(CRITERION_METRICS[id].queryId), id).toBe(true);
    calls.length = 0;
    renderHook(() => useCriteriaResults([]), { wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider> });
    expect(calls.filter((call) => call.enabled)).toEqual([]);
  });
});

// ------------------------------------------------------------------ the baseline

const DAY = 24 * 3_600_000;
const dayIso = (offset: number) => new Date(Date.parse('2026-09-21T00:00:00.000Z') + offset * DAY).toISOString();

describe('the baseline rebuilt from Grail', () => {
  it('compares Day 0 with today by category, and leaves a category without history uncompared', () => {
    const deltas = inventoryDeltas([{ category: 'Hosts', value: 69 }, { category: 'Services', value: 106 }], [
      { category: 'Hosts', value: 77 },
      { category: 'Services', value: 75 },
      { category: 'Process instances', value: 1300 },
    ]);
    expect(deltas.find((entry) => entry.category === 'Hosts')).toMatchObject({ day0: 69, today: 77, delta: 8 });
    expect(deltas.find((entry) => entry.category === 'Services')?.delta).toBe(-31);
    expect(deltas.find((entry) => entry.category === 'Process instances')).toMatchObject({ day0: null, delta: null });
  });

  it('fills the quiet days with zeros and drops the days before the start', () => {
    const days = problemDays(
      [
        { day: dayIso(-3), opened: 9, closedCount: 9, closedNs: 1, rootCaused: 0 },
        { day: dayIso(0), opened: 4, closedCount: 4, closedNs: 4 * 3_600_000_000_000, rootCaused: 1 },
        { day: dayIso(2), opened: 2, closedCount: 1, closedNs: 3_600_000_000_000, rootCaused: 0 },
      ],
      '2026-09-21',
      new Date(Date.parse(dayIso(3)) + 3_600_000),
    );
    expect(days.map((day) => day.opened)).toEqual([4, 0, 2, 0]);
  });

  it('compares the first and the latest complete days without overlap', () => {
    const days = Array.from({ length: 16 }, (_, index) => ({
      day: Date.parse(dayIso(index)),
      opened: index < 7 ? 10 : 5,
      closed: index < 7 ? 10 : 5,
      closedNs: (index < 7 ? 10 * 8 : 5 * 2) * 3_600_000_000_000,
      rootCaused: index === 3 ? 1 : 0,
    }));
    const now = new Date(Date.parse(dayIso(15)) + 3_600_000);
    const weeks = compareWeeks(days, now);
    expect(weeks?.span).toBe(7);
    expect(weeks?.first).toMatchObject({ perDay: 10, mttrHours: 8 });
    expect(weeks?.latest).toMatchObject({ perDay: 5, mttrHours: 2 });
    expect(weeks?.perDayChangePct).toBe(-50);
    expect(weeks?.mttrChangePct).toBe(-75);
    expect(compareWeeks(days.slice(0, 9), new Date(Date.parse(dayIso(8)) + 3_600_000))?.span).toBe(4);
    expect(compareWeeks(days.slice(0, 4), new Date(Date.parse(dayIso(3)) + 3_600_000))).toBeNull();
    const milestones = pocMilestones('2026-09-21', '2026-10-21', days, now);
    expect(milestones.map((milestone) => milestone.kind)).toEqual(['kickoff', 'first-root-cause', 'today', 'planned-end']);
    expect(milestones[0]?.position).toBe(0);
    expect(milestones[3]?.position).toBe(1);
  });
});

// ------------------------------------------------------------------ consumption

describe('consumption and its projection', () => {
  it('reads each capability in its own unit', () => {
    expect(capabilityUnit('Full-Stack Monitoring')).toBe('gibHours');
    expect(capabilityUnit('Log Management & Analytics - Retain')).toBe('bytesRetained');
    expect(capabilityUnit('Metrics - Ingest & Process')).toBe('dataPoints');
    expect(capabilityUnit('Traces - Ingest & Process')).toBe('bytes');
    expect(capabilityUnit('Automation Workflow')).toBe('events');
  });

  it('projects a straight line through the complete days, never below zero, and not below seven days', () => {
    const fit = linearFit([10, 12, 14, 16]);
    expect(fit).toEqual({ slope: 2, intercept: 10 });
    expect(projectForward({ slope: -5, intercept: 10 }, 0, 4)).toBe(15);
    const series = (values: number[]): GrailRecord => ({
      'event.type': 'Full-Stack Monitoring',
      timeframe: { start: '2026-09-25T00:00:00.000Z', end: new Date(Date.parse('2026-09-25T00:00:00.000Z') + values.length * DAY).toISOString() },
      interval: String(DAY * 1_000_000),
      amount: values,
      events: values.map(() => 1),
    });
    const [row] = summariseConsumption([series([100, 100, 100, 100, 100, 100, 100, 100, 40])]);
    expect(row?.daily).toHaveLength(8);
    expect(row?.today).toBe(40);
    expect(row?.last7Avg).toBe(100);
    expect(row?.next30).toBe(3000);
    expect(summariseConsumption([series([1, 2, 3, 4])])[0]?.next30).toBeNull();
    expect(MIN_PROJECTION_DAYS).toBe(7);
    const [retain] = summariseConsumption([{ ...series([2400, 2400]), 'event.type': 'Events - Retain' }]);
    expect(retain?.daily).toEqual([100]);
  });
});

// ------------------------------------------------------------------ incident stories

const incident = (patch: Partial<RcaIncident>): RcaIncident => ({
  displayId: 'P-1',
  name: 'Response time degradation',
  category: 'SLOWDOWN',
  status: 'CLOSED',
  severity: null,
  impactLevels: [],
  affectedNames: ['checkout', 'cart', 'payments', 'orders'],
  affectedTypes: [],
  relatedNames: [],
  affectedIds: [],
  relatedIds: [],
  rootCauseName: 'svc-payments',
  rootCauseId: null,
  eventId: null,
  startIso: '2026-10-04T10:00:00.000Z',
  endIso: null,
  durationNs: 3_600_000_000_000,
  affectedCount: 4,
  clusters: [],
  namespaces: ['shop'],
  workloads: [],
  description: null,
  ...patch,
});

describe('incident stories', () => {
  it('tells the three most telling incidents, with an automation suggested by category', () => {
    const stories = incidentStories(incident({}), [incident({ displayId: 'P-2', category: 'AVAILABILITY', status: 'ACTIVE' }), incident({ displayId: 'P-3' }), incident({ displayId: 'P-4' })]);
    expect(stories.map((story) => story.displayId)).toEqual(['P-1', 'P-2', 'P-3']);
    expect(stories[0]).toMatchObject({ play: 'slowdown', affected: ['checkout', 'cart', 'payments'], open: false });
    expect(stories[1]).toMatchObject({ play: 'availability', open: true });
    expect(automationPlay('RESOURCE_CONTENTION')).toBe('resource');
    expect(automationPlay('SOMETHING_NEW')).toBe('generic');
    expect(incidentStories(null, [])).toEqual([]);
  });
});

// ------------------------------------------------------------------ security fix queue

describe('the security fix queue', () => {
  const vuln = (displayId: string, score: number, flags: Partial<Record<'exploitStatus' | 'exposureStatus' | 'functionStatus', string>> = {}): GrailRecord => ({
    displayId,
    title: `Vulnerability ${displayId}`,
    score,
    level: score >= 9 ? 'CRITICAL' : 'HIGH',
    technology: 'JAVA',
    exploitStatus: 'NOT_AVAILABLE',
    exposureStatus: 'NOT_PUBLIC',
    functionStatus: 'NOT_IN_USE',
    entityNames: ['pg-1'],
    ...flags,
  });

  it('puts what Davis says to act on first, then the most criteria, then the score', () => {
    const queue = fixQueue(
      [
        vuln('S-1', 9.8),
        vuln('S-2', 5.0, { exploitStatus: 'AVAILABLE', exposureStatus: 'PUBLIC_NETWORK', functionStatus: 'IN_USE' }),
        vuln('S-3', 7.0, { exploitStatus: 'AVAILABLE' }),
        vuln('S-4', 9.9),
      ],
      [],
      [],
    );
    expect(queue.map((item) => item.displayId)).toEqual(['S-2', 'S-3', 'S-4', 'S-1']);
    expect(queue[0]?.actNow).toBe(true);
    expect(queue[0]?.hasContext).toBe(false);
  });

  it('joins component and services by vulnerability, and an owner tag before a namespace', () => {
    const owners = serviceOwnership([
      { name: 'checkout', tags: ['Owner:team-pay', 'k8s.namespace.name:shop'] },
      { name: 'search', tags: ['k8s.namespace.name:catalog', 'Env:prod'] },
    ]);
    expect(owners.get('checkout')).toEqual({ owners: ['team-pay'], namespaces: ['shop'] });
    expect(owners.get('search')).toEqual({ owners: [], namespaces: ['catalog'] });
    const [item] = fixQueue([vuln('S-1', 9.1)], [{ displayId: 'S-1', components: ['log4j-core'], services: ['checkout', 'search'], workloads: [] }], [
      { name: 'checkout', tags: ['owner:team-pay'] },
      { name: 'search', tags: ['k8s.namespace.name:catalog'] },
    ]);
    expect(item).toMatchObject({ components: ['log4j-core'], services: ['checkout', 'search'], owners: ['team-pay'], namespaces: ['catalog'], hasContext: true });
  });

  it('labels a namespace as a namespace, never as an owner', () => {
    const [item] = fixQueue([vuln('S-1', 9.1)], [{ displayId: 'S-1', components: [], services: ['search'], workloads: [] }], [{ name: 'search', tags: ['k8s.namespace.name:catalog'] }]);
    mount(<FixQueue items={[item!]} context={{ outcome: 'ok' } as CatalogQueryResult} />);
    expect(screen.getByText(en('fix.namespace'))).toBeTruthy();
    expect(screen.queryByText(en('fix.owner'))).toBeNull();
    expect(screen.getByText('catalog')).toBeTruthy();
  });
});

// ------------------------------------------------------------------ the dashboard

describe('the "Value of the PoC" dashboard', () => {
  const words = {
    title: 'Value of the PoC — Acme',
    intro: 'Observability PoC',
    objectivesTitle: 'Objectives agreed',
    objectives: ['Categories with telemetry ≥ 80%'],
    footer: 'Generated by the PoC Value Studio.',
    tileTitle: (key: string) => `Tile ${key}`,
  };

  it('is a dashboard document with a tile and a place for every block, inside the 24-column grid', () => {
    const doc = buildPocDashboard(words);
    expect(doc.version).toBe(21);
    expect(Object.keys(doc.tiles)).toEqual(Object.keys(doc.layouts));
    // 3.2.6: header, objectives, a heading per section, every tile, the closing block.
    expect(Object.keys(doc.tiles)).toHaveLength(DASHBOARD_TILES.length + 2 + DASHBOARD_SECTIONS.length + 1);
    for (const layout of Object.values(doc.layouts)) expect(layout.x + layout.w).toBeLessThanOrEqual(24);
    expect(doc.settings.defaultTimeframe).toEqual({ enabled: true, value: { from: 'now()-7d', to: 'now()' } });
    const goals = doc.tiles['1'];
    expect(goals?.type === 'markdown' ? goals.content : '').toContain('Objectives agreed');
  });

  it('holds nothing commercial and keeps the app scan ceiling of each query', () => {
    const doc = buildPocDashboard(words);
    for (const plan of DASHBOARD_TILES) expect(plan.queryId ?? plan.dql ?? '').not.toMatch(/^(cons|lic)\.|BILLING_USAGE_EVENT/);
    for (const tile of Object.values(doc.tiles)) {
      if (tile.type !== 'data') continue;
      expect(tile.query).not.toMatch(/BILLING_USAGE_EVENT|licen/i);
      expect(tile.querySettings.defaultScanLimitGbytes).toBeLessThanOrEqual(40);
    }
  });

  it('carries a query own window in its text only when it has a single fetch', () => {
    expect(pinWindow('fetch security.events\n| filter x', 'now-30m')).toBe('fetch security.events, from: now()-30m\n| filter x');
    expect(pinWindow('fetch dt.entity.host | append [ fetch dt.entity.service ]', 'now-30m')).toContain('fetch dt.entity.host |');
    expect(pinWindow('fetch dt.davis.problems', 'now-7d')).toBe('fetch dt.davis.problems');
    const posture = Object.values(buildPocDashboard(words).tiles).find((tile) => tile.type === 'data' && tile.title === 'Tile secPosture');
    expect(posture?.type === 'data' ? posture.query : '').toMatch(/^fetch security\.events, from: now\(\)-30m/);
  });

  it('escapes what came from Settings, and says what went wrong', () => {
    expect(markdownText('# Acme [corp]')).toBe('\\# Acme \\[corp\\]');
    expect(classifyDashboardError({ response: { status: 403 } })).toBe('forbidden');
    expect(classifyDashboardError({ message: 'Missing scope document:documents:write' })).toBe('forbidden');
    expect(classifyDashboardError({ status: 404 })).toBe('missing');
    expect(classifyDashboardError({ status: 409 })).toBe('conflict');
    expect(classifyDashboardError(new Error('boom'))).toBe('error');
  });
});

// ------------------------------------------------------------------ the deck and the customer profile

describe('the deck', () => {
  it('opens the business part with the objectives, judged as on screen', () => {
    const results = [evaluateCriterion(criterion({ metric: 'problems.open', operator: '<=', target: 5 }), [{ activeProblems: 3 }], 'ok')];
    const section = objectivesSection(results, () => 'Problems open ≤ 5', (value) => String(value), (key, params) => translate(key, 'en', params));
    expect(section?.id).toBe('objectives');
    expect(section?.table?.rows).toEqual([['Problems open ≤ 5', '3', en('crit.status.met')]]);
    expect(objectivesSection([], () => '', () => '', (key) => key)).toBeNull();
  });

  it('builds the same customer model whether or not consumption and licensing were read', () => {
    const ctx = {
      t: (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params),
      formatNumber: (value: number) => String(value),
      params: { ...EMPTY_SHARED.parameters, customerName: 'Acme' },
      costModel: { ratePerHour: 100, currencyLabel: 'USD', rateBasis: '', downtimeRatePerHour: 1000, downtimeBasis: '' },
      baseline: { manualMttrHours: 10, annualCostPerAgent: 500 },
      commercial: false,
      windowLabel: 'last 24 hours',
      generatedAtLabel: 'now',
      seName: null,
      dtLogo: '',
      customerLogo: null,
      customerLogoAspect: null,
      partnerLogo: null,
      partnerLogoAspect: null,
    };
    const q = (records: GrailRecord[]) => ({ records, outcome: 'ok' });
    const base: WrapupResults = { 'cov.inventory': q([{ category: 'Hosts', value: 10 }]), 'prob.summary': q([{ 'event.category': 'ERROR', 'event.status': 'CLOSED', problems: 3 }]) };
    const commercialRead: WrapupResults = {
      ...base,
      'cons.advisor': q([{ table: 'logs', executions: 40, scannedOnDemandBytes: 8e9, avgDurationMs: 120, deliveredRecords: 900 }]),
      'cons.capabilities': q([{ 'event.type': 'Full-Stack Monitoring', events: 10, billedBytes: 0 }]),
      'lic.hosts': q([{ hosts: 3 }]),
    };
    expect(JSON.stringify(buildWrapupModel(commercialRead, ctx))).toBe(JSON.stringify(buildWrapupModel(base, ctx)));
  });
});

// ------------------------------------------------------------------ the pages

describe('the PoC Timeline', () => {
  it('asks for a start date before it draws a baseline', () => {
    mount(<PocTimeline />);
    expect(screen.getByText(en('tl.plan.title'))).toBeTruthy();
    expect(screen.getByText(en('crit.panel.title'))).toBeTruthy();
  });

  it('draws the track, Day 0 against today and the first days against the latest, once a start date is set', async () => {
    const start = new Date(Date.now() - 20 * DAY).toISOString().slice(0, 10);
    canned = {
      'cov.inventory': { records: [{ category: 'Hosts', value: 77 }, { category: 'Services', value: 75 }] },
      'cov.inventory.day0': { records: [{ category: 'Hosts', value: 69 }, { category: 'Services', value: 106 }] },
      'prob.poc.daily': {
        records: Array.from({ length: 20 }, (_, index) => ({
          day: new Date(Date.parse(`${start}T00:00:00.000Z`) + index * DAY).toISOString(),
          opened: 10,
          closedCount: 10,
          closedNs: 10 * 3_600_000_000_000,
          rootCaused: index === 2 ? 1 : 0,
        })),
      },
    };
    const plan: PocPlan = { ...EMPTY_POC_PLAN, startDate: start };
    const store = createMemoryStore({
      [`app:${SHARED_KEY}`]: JSON.stringify({ v: 1, rev: 1, savedAt: '', savedBy: null, parameters: EMPTY_SHARED.parameters, pillars: [], poc: plan }),
    });
    mount(<PocTimeline />, store);
    expect(await screen.findByText(en('tl.track.title'))).toBeTruthy();
    expect(screen.getByText(en('tl.base.title'))).toBeTruthy();
    expect(screen.getByText(en('tl.base.caption', { day0: '69', delta: '+8' }))).toBeTruthy();
    expect(screen.getByText(en('tl.weeks.title'))).toBeTruthy();
    expect(screen.getByText(en('tl.track.firstRoot'))).toBeTruthy();
  });
});

describe('the PoC plan editor', () => {
  it('adds an objective with the metric rule it measures by, and removes it', () => {
    const changes: PocPlan[] = [];
    const view = mount(<PocPlanEditor draft={EMPTY_POC_PLAN} onChange={(next) => changes.push(next)} pillars={[]} onPillarsChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: en('plan.criteria.add') }));
    expect(changes[0]?.criteria).toHaveLength(1);
    expect(changes[0]?.criteria[0]).toMatchObject({ metric: 'coverage.categories', operator: '>=', target: null });
    view.rerender(
      <AppRoot>
        <MemoryRouter>
          <StudioProvider>
            <PocPlanEditor draft={changes[0]!} onChange={(next) => changes.push(next)} pillars={[]} onPillarsChange={() => undefined} />
          </StudioProvider>
        </MemoryRouter>
      </AppRoot>,
    );
    fireEvent.click(screen.getByRole('button', { name: en('plan.criteria.removeAria', { n: '1' }) }));
    expect(changes[1]?.criteria).toEqual([]);
    act(() => undefined);
  });
});
