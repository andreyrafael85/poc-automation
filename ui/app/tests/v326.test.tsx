import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoot } from '@dynatrace/strato-components/core';
import { MemoryRouter } from 'react-router-dom';

import { SPECTRUM_FAMILIES } from '../components/spectrum';
import { StudioProvider } from '../config/StudioContext';
import { FAILURE_BAND_COLOR } from '../design/palette';
import { DASHBOARD_SECTIONS, DASHBOARD_TILES, bannerHeading, buildPocDashboard, colourRules, type DashboardWords } from '../features/dashboard/pocDashboard';
import { ErrorRateMeter } from '../features/experience/ErrorRateMeter';
import { LoadTimeline } from '../features/experience/LoadTimeline';
import { pillarProof, pillarStrength } from '../features/pillars/PillarSummary';
import type { PillarEvidence } from '../features/pillars/usePillarEvidence';
import { buildDeckSpec } from '../features/wrapup/spec';
import { CONTENT_BOTTOM, SLIDE_W, storyLayout } from '../features/wrapup/geometry';
import type { WrapupModel } from '../features/wrapup/deck';
import type { CatalogQueryResult, QueryOutcome } from '../hooks/useCatalogQuery';
import { translate, type StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { appFlow, durationTicks, errorBand, errorScaleMax, RUM_FOCUS_APPS, trafficById } from '../models/appFlow';
import { CRITERION_METRIC_IDS, CRITERION_METRICS, criterionPillar, suggestedMetric } from '../models/criteria';
import { consumptionCost, PUBLIC_DPS_RATES } from '../models/licensing';
import { POC_PILLARS } from '../models/pillars';
import { adoptionSignals, firstAutomationDay, pocMilestones, problemDays, trackStops, TRACK_MAX_ROWS } from '../models/pocBaseline';
import { PLAN_PILLAR_IDS, parsePocPlan, type SuccessCriterion } from '../models/pocPlan';
import { problemHours } from '../models/problemHours';
import type { RumApp } from '../models/rum';
import { summarisePosture, summariseVulnerabilities, twoOfThree } from '../models/security';
import { layoutStack, STACK_GEOMETRY } from '../models/stackMap';
import { CATALOG, getQuery, type CatalogId } from '../queries/catalog';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import type { GrailRecord } from '../utils/records';

/**
 * 3.2.6 — the owner's v3.2.5 validation round: commercial data native to the SE and partner, the
 * Overview and pillars redesign, pillars tied to the success criteria, the detailed dashboard, the
 * timeline fixes and adoption series, the Digital experience spotlight and flows, the security
 * "next queue", clickable flow maps, the Value & ROI restyle and the richer deck.
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
      evidence: { queryId: entry.id, source: entry.domain, timeframe: 'last 7 days' },
      timeframe: { startIso: '2026-09-28T00:00:00.000Z', endIso: '2026-10-05T00:00:00.000Z', label: 'last 7 days', expression: 'now-7d' },
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
});

const en = (key: StringKey, params?: Record<string, string | number>) => translate(key, 'en', params);
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-05T12:00:00.000Z');
const mount = (node: React.ReactNode) =>
  render(
    <AppRoot>
      <MemoryRouter>
        <StudioProvider>{node}</StudioProvider>
      </MemoryRouter>
    </AppRoot>,
  );

// ------------------------------------------------------------------ the timeline (owner's screenshot)

describe('the PoC track', () => {
  it('writes a UTC calendar day as that day, whatever the viewer zone (5 Oct read as 4 Oct in Brasília)', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider> });
    const day = Date.parse('2026-10-05T00:00:00.000Z');
    const { formatDay } = result.current;
    // Read in UTC: the day itself, never the evening before in a zone west of Greenwich.
    expect(formatDay(day)).toMatch(/0?5/);
    expect(formatDay(day)).not.toMatch(/(^|\D)0?4(\D|$)/);
    expect(formatDay('2026-10-05')).toBe(formatDay(day));
    expect(formatDay(day)).not.toBe(formatDay(day - DAY));
  });

  it('merges the milestones of one day into one mark: on day 1 the kick-off is today', () => {
    const start = '2026-10-05';
    const days = problemDays([{ day: '2026-10-05T00:00:00.000Z', opened: 3, closedCount: 1, closedNs: 1, rootCaused: 1 }], start, NOW);
    const stops = trackStops(pocMilestones(start, '2026-10-22', days, NOW));
    const first = stops[0];
    expect(first?.kinds.sort()).toEqual(['first-root-cause', 'kickoff', 'today']);
    expect(stops).toHaveLength(2);
    expect(stops[1]?.kinds).toEqual(['planned-end']);
  });

  it('puts close labels on different rows, never more than three', () => {
    const at = (position: number, kind: 'kickoff' | 'first-root-cause' | 'today' | 'planned-end' | 'first-automation') => ({ kind, day: position * 100 * DAY, position });
    const stops = trackStops([at(0, 'kickoff'), at(0.05, 'first-root-cause'), at(0.1, 'first-automation'), at(0.15, 'today'), at(1, 'planned-end')]);
    expect(stops.map((stop) => stop.row)).toEqual([0, 1, 2, 0, 0]);
    expect(Math.max(...stops.map((stop) => stop.row))).toBeLessThan(TRACK_MAX_ROWS);
  });

  it('dates the first automation only when none ran on the first day', () => {
    const record = (values: number[]) => ({ timeframe: { start: '2026-10-01T00:00:00.000Z' }, interval: String(DAY * 1_000_000), succeeded: values, executions: values, logBytes: values });
    expect(firstAutomationDay([record([0, 0, 4, 9, 9])], '2026-10-01', NOW)).toBe(Date.parse('2026-10-03T00:00:00.000Z'));
    expect(firstAutomationDay([record([5, 5, 5, 5, 5])], '2026-10-01', NOW)).toBeNull();
    const milestones = pocMilestones('2026-10-01', null, [], NOW, Date.parse('2026-10-03T00:00:00.000Z'));
    expect(milestones.map((milestone) => milestone.kind)).toEqual(['kickoff', 'first-automation', 'today']);
  });

  it('reads the adoption series from the start date, leaves today out of the comparison and drops a silent series', () => {
    const signals = { timeframe: { start: '2026-09-25T00:00:00.000Z' }, interval: String(DAY * 1_000_000), executions: [1, 1, 1, 1, 10, 10, 10, 10, 10, 10, 2], logBytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], succeeded: [] };
    const result = adoptionSignals([signals], [], '2026-09-27', NOW);
    expect(result.map((signal) => signal.id)).toEqual(['automation']);
    const automation = result[0];
    expect(automation?.days[0]?.day).toBe(Date.parse('2026-09-27T00:00:00.000Z'));
    expect(automation?.days[automation.days.length - 1]?.partial).toBe(true);
    expect(automation?.span).toBe(4);
    expect(automation?.first).toBeCloseTo(5.5);
    expect(automation?.latest).toBe(10);
  });
});

// ------------------------------------------------------------------ the stack map (on premises)

describe('the stack map of an estate on premises', () => {
  it('ends at the infrastructure: no empty cloud column, a narrower drawing', () => {
    const layout = layoutStack([
      { id: 'web', count: 3 },
      { id: 'services', count: 70 },
      { id: 'processes', count: 400 },
      { id: 'hosts', count: 60 },
    ]);
    expect(layout?.columns.map((column) => column.id)).toEqual(['experience', 'services', 'processes', 'infrastructure']);
    expect(layout?.width).toBeLessThan(STACK_GEOMETRY.width);
    const withCloud = layoutStack([{ id: 'hosts', count: 60 }, { id: 'cloud-AWS', count: 20 }]);
    expect(withCloud?.width).toBe(STACK_GEOMETRY.width);
  });
});

// ------------------------------------------------------------------ pillars and objectives

describe('pillars tied to the objectives', () => {
  it('keeps one list of pillar ids for the plan and the pillar model', () => {
    expect([...PLAN_PILLAR_IDS].sort()).toEqual(POC_PILLARS.map((pillar) => pillar.id).sort());
  });

  it('gives every metric a pillar, and an objective the pillar the SE chose', () => {
    for (const id of CRITERION_METRIC_IDS) expect(PLAN_PILLAR_IDS).toContain(CRITERION_METRICS[id].pillar);
    const base: SuccessCriterion = { id: 'c1', metric: 'problems.mttr', operator: '<=', target: 4, text: '', origin: '', manualStatus: 'pending' };
    expect(criterionPillar(base)).toBe('resilience');
    expect(criterionPillar({ ...base, pillar: 'agility' })).toBe('agility');
    expect(criterionPillar({ ...base, metric: 'manual', text: 'Go-live' })).toBeNull();
    expect(CRITERION_METRICS[suggestedMetric('cost')].pillar).toBe('cost');
  });

  it('keeps a chosen pillar through the shared document and drops an unknown one', () => {
    const plan = parsePocPlan({
      criteria: [
        { id: 'a', metric: 'problems.mttr', operator: '<=', target: 4, pillar: 'agility' },
        { id: 'b', metric: 'problems.open', operator: '<=', target: 1, pillar: 'licences' },
      ],
    });
    expect(plan.criteria[0]?.pillar).toBe('agility');
    expect('pillar' in (plan.criteria[1] ?? {})).toBe(false);
  });

  it('counts half a point for a partial one, and proves a pillar with its first measured figures', () => {
    const reading = (value: number | null) => ({ metric: { id: `m${String(value)}`, labelKey: 'pillar.roi' as StringKey, queryId: 'prob.summary' as const, reduce: () => null, unit: 'count' as const }, value, fact: { value, provenance: 'observed' as const, confidence: 'high' as const } });
    const evidence = {
      pillar: POC_PILLARS[0],
      points: [
        { point: { id: 'p1', labelKey: 'pillar.roi', metrics: [] }, status: 'evidenced', readings: [reading(null), reading(12)], missingScopes: [] },
        { point: { id: 'p2', labelKey: 'pillar.roi', metrics: [] }, status: 'partial', readings: [reading(7)], missingScopes: [] },
        { point: { id: 'p3', labelKey: 'pillar.roi', metrics: [] }, status: 'not-evidenced', readings: [reading(99)], missingScopes: [] },
      ],
      evidenced: 1,
      partial: 1,
      notEvidenced: 1,
      measuring: 0,
      total: 3,
    } as unknown as PillarEvidence;
    expect(pillarStrength(evidence)).toBe(50);
    expect(pillarProof(evidence).map((item) => item.value)).toEqual([12, 7]);
  });
});

// ------------------------------------------------------------------ security: the next queue

describe('vulnerabilities with two of the three signals', () => {
  it('is exact from the pairs: a vulnerability with all three is taken away twice', () => {
    expect(twoOfThree({ exploitPublic: 5, exploitInUse: 2, publicInUse: 3 }, 1)).toBe(8);
    expect(twoOfThree({ exploitPublic: 0, exploitInUse: 0, publicInUse: 0 }, 0)).toBe(0);
  });

  it('sums the pairs over the posture rows, and counts them from the list when the posture did not answer', () => {
    const posture = summarisePosture([
      { level: 'CRITICAL', technology: 'JAVA', vulnerabilities: 4, actNow: 0, exploitable: 3, publicExposed: 2, inUse: 0, exploitPublic: 2, exploitInUse: 0, publicInUse: 0 },
      { level: 'HIGH', technology: 'NODE', vulnerabilities: 6, actNow: 0, exploitable: 1, publicExposed: 4, inUse: 1, exploitPublic: 1, exploitInUse: 0, publicInUse: 1 },
    ]);
    expect(posture.actNowCount).toBe(0);
    expect(posture.pairs).toEqual({ exploitPublic: 3, exploitInUse: 0, publicInUse: 1 });
    expect(posture.twoSignalsCount).toBe(4);
    const list = summariseVulnerabilities([
      { displayId: 'S-1', score: 9.8, level: 'CRITICAL', exploitStatus: 'AVAILABLE', exposureStatus: 'PUBLIC_NETWORK', functionStatus: 'NOT_IN_USE' },
      { displayId: 'S-2', score: 7.1, level: 'HIGH', exploitStatus: 'AVAILABLE', exposureStatus: 'PUBLIC_NETWORK', functionStatus: 'IN_USE' },
    ]);
    expect(list.actNowCount).toBe(1);
    expect(list.twoSignalsCount).toBe(2);
  });

  it('paints the total red: the one family that is a verdict, still readable', () => {
    expect(SPECTRUM_FAMILIES).toContain('red');
  });
});

// ------------------------------------------------------------------ digital experience

describe('the flow of a frontend', () => {
  const flow: GrailRecord[] = [
    { frontend: 'shop', frontendId: 'APPLICATION-1F31F034940B45EF', entry: 'SERVICE-14CC13973497424B', entryName: ':8080', hop: 'SERVICE-DB5C1DA49F791679', hopName: 'OrderController' },
    { frontend: 'shop', frontendId: 'APPLICATION-1F31F034940B45EF', entry: 'SERVICE-14CC13973497424B', entryName: ':8080', hop: 'SERVICE-4F4F3983BF6175F9', hopName: 'BrokerService' },
    { frontend: 'shop', frontendId: 'APPLICATION-1F31F034940B45EF', entry: 'SERVICE-14CC13973497424B', entryName: ':8080', hop: 'SERVICE-14CC13973497424B', hopName: ':8080' },
    { frontend: 'other', frontendId: 'APPLICATION-6331991FD4EFBB24', entry: 'SERVICE-8BACD834F8B0945E', entryName: ':80', hop: 'SERVICE-41A4F03120E830E8', hopName: 'BrokerService' },
  ];
  const ranking: GrailRecord[] = [{ serviceId: 'SERVICE-4F4F3983BF6175F9', totalRequests: 900, failureRatePct: 2.5 }];

  it('draws the frontend, its entry services and what they call, busiest first, without loops', () => {
    const model = appFlow(flow, 'shop', ranking, 1);
    expect(model?.app.id).toBe('APPLICATION-1F31F034940B45EF');
    expect(model?.entries.map((entry) => entry.name)).toEqual([':8080']);
    expect(model?.next.map((entry) => entry.name)).toEqual(['BrokerService']);
    expect(model?.moreNext).toBe(1);
    expect(model?.links).toEqual([
      { from: 'APPLICATION-1F31F034940B45EF', to: 'SERVICE-14CC13973497424B' },
      { from: 'SERVICE-14CC13973497424B', to: 'SERVICE-4F4F3983BF6175F9' },
    ]);
    expect(trafficById(ranking).get('SERVICE-4F4F3983BF6175F9')?.requests).toBe(900);
    expect(appFlow(flow, 'nobody', ranking)).toBeNull();
    expect(RUM_FOCUS_APPS).toBe(2);
  });

  it('reads error rates on one absolute scale with the page bands', () => {
    expect(errorBand(0.5, 1, 5)).toBe('good');
    expect(errorBand(1, 1, 5)).toBe('attention');
    expect(errorBand(7, 1, 5)).toBe('high');
    expect(errorScaleMax([3.6, 0.5], 5)).toBe(6);
    expect(errorScaleMax([42], 5)).toBe(50);
    expect(durationTicks(286)).toEqual({ max: 300, ticks: [0, 100, 200, 300] });
    expect(durationTicks(1500)).toEqual({ max: 1500, ticks: [0, 500, 1000, 1500] });
  });

  const app = (patch: Partial<RumApp>): RumApp => ({
    name: 'shop',
    actions: 10,
    requests: 1000,
    errors: 36,
    errorRatePct: 3.6,
    lcp: null,
    inp: null,
    cls: null,
    load: 286,
    ttfb: 8,
    dom: 107,
    actionDur: 1200,
    sessions: null,
    users: null,
    ...patch,
  });

  it('draws the page load end to end in its natural order, and says when nothing was observed', () => {
    const { container } = mount(<LoadTimeline app={app({})} />);
    const segments = [...container.querySelectorAll('.pvs-loadline__seg')].map((segment) => segment.getAttribute('data-seg'));
    expect(segments).toEqual(['server', 'dom', 'load', 'action']);
    expect(screen.getByText(en('p.dx3.load.ttfb'))).toBeTruthy();
    const empty = mount(<LoadTimeline app={app({ load: null, ttfb: null, dom: null, actionDur: null })} />);
    expect(empty.container.querySelector('.pvs-loadline')).toBeNull();
  });

  it('lists the error rates worst first, with how many errors in how many requests', () => {
    const { container } = mount(<ErrorRateMeter apps={[app({ name: 'calm', errorRatePct: 0.4, errors: 4 }), app({})]} />);
    const rows = [...container.querySelectorAll('.pvs-errmeter__row')];
    expect(rows.map((row) => row.getAttribute('data-band'))).toEqual(['attention', 'good']);
    expect(rows[0]?.textContent).toContain(en('p.dx3.err.of', { errors: '36', requests: '1,000' }));
  });
});

// Deep links: 3.2.7 replaced the generic entity intents with explicit addresses (tests/v327.test.tsx).

// ------------------------------------------------------------------ services honeycomb

describe('the failure bands of the services honeycomb', () => {
  // 3.4.16 (design proposal D-10): the platform's "Status and health" scale replaced the 3.2.6 traffic light.
  it('runs Ideal, Good, Warning, Critical', () => {
    expect(FAILURE_BAND_COLOR.none).toContain('status-ideal');
    expect(FAILURE_BAND_COLOR.under).toContain('status-good');
    expect(FAILURE_BAND_COLOR.review).toContain('status-warning');
    expect(FAILURE_BAND_COLOR.high).toContain('status-critical');
  });
});

// ------------------------------------------------------------------ value & ROI

describe('where the problem hours went', () => {
  it('ranks the categories by hours, with their share, count and mean time to resolve (3.2.7: no mosaic)', () => {
    const rows = problemHours([
      { 'event.category': 'ERROR', problems: 10, totalNs: 3 * 3_600_000_000_000 },
      { 'event.category': 'SLOWDOWN', problems: 2, totalNs: 1 * 3_600_000_000_000 },
      { 'event.category': 'AVAILABILITY', problems: 1, totalNs: 2 * 3_600_000_000_000 },
    ]);
    expect(rows.map((row) => row.category)).toEqual(['ERROR', 'AVAILABILITY', 'SLOWDOWN']);
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(100);
    expect(rows[0]?.mttrHours).toBeCloseTo(0.3);
  });
});

// ------------------------------------------------------------------ licensing: the projection, priced

describe('the consumption projection at the public list price', () => {
  const projections = [
    { capability: 'Log Management & Analytics - Ingest & Process', next30: 30 * 2 ** 30, next365: 365 * 2 ** 30 },
    { capability: 'Full-Stack Monitoring', next30: 1000, next365: null },
    { capability: 'Traces - Ingest & Process', next30: 5, next365: 50 },
  ];

  it('prices each capability it knows, converts with the rate card and names the ones it cannot price', () => {
    const cost = consumptionCost(projections, { enabled: true, currencyLabel: 'BRL', usdToLocalRate: 5 });
    expect(cost.rows.find((row) => row.capability.startsWith('Log'))?.next30).toBeCloseTo(30 * 0.2 * 5);
    expect(cost.rows.find((row) => row.capability === 'Full-Stack Monitoring')?.next365).toBeNull();
    expect(cost.unpriced).toEqual(['Traces - Ingest & Process']);
    expect(cost.total30).toBeCloseTo(30 * 0.2 * 5 + 1000 * 0.01 * 5);
    expect(PUBLIC_DPS_RATES['Infrastructure Monitoring']?.usdPerUnit).toBe(0.04);
  });

  it('shows no money at all while the rate card is off', () => {
    const cost = consumptionCost(projections, { enabled: false, currencyLabel: '', usdToLocalRate: null });
    expect(cost.total30).toBeNull();
    expect(cost.rows.every((row) => row.next30 === null)).toBe(true);
  });
});

// ------------------------------------------------------------------ the dashboard

describe('the detailed "Value of the PoC" dashboard', () => {
  const words: DashboardWords = {
    title: 'Value of the PoC — Acme (prod)',
    intro: 'Observability PoC',
    facts: [{ label: 'Customer', value: 'Acme | Inc.' }],
    question: 'What has Dynatrace proven?',
    objectivesTitle: '1. Objectives',
    objectives: [],
    goals: [{ pillar: 'Resilience', text: 'MTTR | under 4 h', target: '≤ 4 h', measured: '3.2 h', status: 'met' }],
    goalHeaders: ['Pillar', 'Objective', 'Target', 'Measured', 'Status'],
    goalStatus: { met: 'Met', 'not-met': 'Not met', open: 'In progress' },
    sectionTitle: (section, index) => `${index}. ${section}`,
    nextTitle: 'Next steps',
    next: ['Close the objective'],
    footer: 'Generated by the PoC Value Studio.',
    tileTitle: (key) => `Tile ${key}`,
    evidence: new Set(['automation']),
  };

  it('leaves out the sections the tenant did not prove, and numbers the rest', () => {
    const doc = buildPocDashboard(words);
    const markdown = Object.values(doc.tiles).flatMap((tile) => (tile.type === 'markdown' ? [tile.content] : []));
    // 3.7.1: each proven section opens on a coloured banner; the objectives and the next steps keep their "##" heading.
    const banners = Object.values(doc.tiles).flatMap((tile) => {
      const heading = bannerHeading(tile);
      return heading === null ? [] : [heading];
    });
    expect(banners.some((heading) => heading.includes('experience'))).toBe(false);
    expect(banners.some((heading) => heading.includes('security'))).toBe(false);
    expect(banners.some((heading) => heading.includes('automation'))).toBe(true);
    expect(banners.length).toBe(DASHBOARD_SECTIONS.length - 2);
    expect(markdown.filter((content) => content.startsWith('## ')).length).toBe(2);
    const titles = Object.values(doc.tiles).flatMap((tile) => (tile.type === 'data' ? [tile.title] : []));
    expect(titles).not.toContain('Tile secTotal');
    expect(titles).not.toContain('Tile rumScorecard');
  });

  it('escapes what came from Settings, even inside the objectives table', () => {
    const goals = buildPocDashboard(words).tiles['1'];
    const content = goals?.type === 'markdown' ? goals.content : '';
    expect(content).toContain('MTTR \\| under 4 h');
    expect(content).toContain('✅ Met');
    const header = buildPocDashboard(words).tiles['0'];
    expect(header?.type === 'markdown' ? header.content : '').toContain('Acme \\| Inc\\.');
  });

  it('colours its single values with the platform status colours, the strictest rule first', () => {
    expect(colourRules({ field: 'active', better: 'lower', good: 1, bad: 10 }).map((rule) => [rule.value, rule.customColor.Default])).toEqual([
      [10, 'var(--dt-colors-charts-status-critical-default)'],
      [1, 'var(--dt-colors-charts-status-warning-default)'],
      [0, 'var(--dt-colors-charts-status-ideal-default)'],
    ]);
    expect(colourRules({ field: 'x', better: 'none' })).toEqual([]);
    const doc = buildPocDashboard({ ...words, evidence: new Set(['experience', 'security', 'automation']) });
    for (const plan of DASHBOARD_TILES) {
      if (plan.queryId !== undefined) expect(Object.keys(CATALOG)).toContain(plan.queryId);
      expect(plan.queryId ?? '').not.toMatch(/^(cons|lic)\./);
    }
    for (const tile of Object.values(doc.tiles)) {
      if (tile.type !== 'data' || tile.visualization !== 'singleValue') continue;
      expect(tile.visualizationSettings.singleValue?.recordField).toBeTruthy();
      expect(tile.query).not.toMatch(/BILLING_USAGE_EVENT/);
    }
  });
});

// ------------------------------------------------------------------ the deck

describe('the capture slides of the deck', () => {
  it('lays the picture across its column, the numbers and pins beside it, and the strip of cards along the bottom (3.3.5)', () => {
    const layout = storyLayout({ subtitle: true, aspect: 3.2, kpis: 3, pins: 700000, cards: 3, strip: 1100000, under: 600000, findings: [700000] });
    expect(layout.kpis).toHaveLength(3);
    expect(layout.kpis[0]?.x).toBeGreaterThan(layout.frame.x + layout.frame.w);
    expect(layout.pins?.y).toBeGreaterThan((layout.kpis[0]?.y ?? 0) + (layout.kpis[0]?.h ?? 0));
    // Three cards, side by side, under everything else and inside the slide.
    expect(layout.cards).toHaveLength(3);
    const strip = layout.cards[0]?.y ?? 0;
    expect(layout.frame.y + layout.frame.h).toBeLessThan(strip);
    expect((layout.pins?.y ?? 0) + (layout.pins?.h ?? 0)).toBeLessThan(strip);
    expect((layout.cards[2]?.x ?? 0) + (layout.cards[2]?.w ?? 0)).toBeLessThanOrEqual(SLIDE_W);
    expect(strip + (layout.cards[0]?.h ?? 0)).toBeLessThanOrEqual(CONTENT_BOTTOM);
    // A wide panel at its column's width leaves room under it.
    expect(layout.under?.y).toBeGreaterThan(layout.frame.y + layout.frame.h);
  });

  it('gives a tall panel its height and offers the width it leaves beside it', () => {
    const layout = storyLayout({ subtitle: false, aspect: 0.9, kpis: 2, pins: 0, cards: 2, strip: 1000000, under: 2500000, beside: 900000, findings: [] });
    expect(layout.under).toBeNull();
    expect(layout.beside).not.toBeNull();
    expect(layout.frame.h).toBeGreaterThan(3000000);
  });

  it('carries the section numbers and its findings onto the one story slide', () => {
    const section = { id: 'services', title: 'Services', narrative: ['finding one', 'finding two', 'finding three'], kpis: [{ label: 'Requests', value: '1.2M' }], assist: [] as string[] };
    const model: WrapupModel = {
      customerName: 'Acme',
      engagementName: 'PoC',
      windowLabel: 'last 7 days',
      generatedAtLabel: 'Generated',
      seName: null,
      dtLogo: '',
      customerLogo: null,
      customerLogoAspect: null,
      partnerName: '',
      partnerLogo: null,
      partnerLogoAspect: null,
      platformLogos: [],
      agenda: [],
      why: [],
      strings: {
        title: 'Tech Wrapup',
        subtitle: 'What Dynatrace discovered',
        tagline: 'Tagline',
        preparedBy: 'Prepared by',
        agendaTitle: 'Agenda',
        whyTitle: 'Why',
        whySubtitle: 'One platform',
        assistLabel: 'Dynatrace Assist',
        partnerLabel: 'Delivered with',
        technicalDivider: 'Part one',
        technicalKicker: 'Results',
        businessDivider: 'Part two',
        businessKicker: 'Value',
        closingTitle: 'Thank you',
        closingBullets: [],
        footer: 'Footer',
        measured: 'Measured live.',
        confidential: 'Confidential.',
      },
      technical: [section],
      business: [],
    };
    const capture = { dataUrl: 'data:image/png;base64,AAAA', width: 720, height: 300, pins: [] };
    const spec = buildDeckSpec(model, { profile: 'customer', captures: { services: capture }, findingsLabel: 'Key findings' });
    const slide = spec.slides.find((entry) => entry.kind === 'capture');
    expect(slide?.kind === 'capture' ? slide.kpis.map((kpi) => kpi.value) : []).toEqual(['1.2M']);
    // 3.3.5: no Assist, no drawn chart — all three findings are on the one slide.
    expect(slide?.kind === 'capture' ? slide.assist : ['x']).toEqual([]);
    const shown = slide?.kind === 'capture' ? [...slide.stripFindings, ...slide.findings, ...(slide.under?.kind === 'findings' ? slide.under.lines : [])] : [];
    expect(shown).toEqual(['finding one', 'finding two', 'finding three']);
    expect(spec.slides.filter((entry) => entry.kind === 'section' && entry.id === 'services')).toHaveLength(0);
  });
});
