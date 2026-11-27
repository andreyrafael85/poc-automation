import { describe, expect, it } from 'vitest';

import { WHATS_NEW } from '../components/HelpPanels';
import { wholeSloIds } from '../features/builder/pocAutomation';
import { buildInvestigationNotebook, buildPocLaunchpad, NOTEBOOK_STEPS, stepVisualization, windowOf, withResults } from '../features/builder/pocDocuments';
import { SPECIALTY_BLUEPRINTS, SPECIALTY_IDS, VALIDATED_DQL } from '../features/dashboard/blueprints';
import { arrangeSection, bannerHeading, buildDashboard, rowWidths, SLO_TILE_SETTINGS, type DashboardDocument, type DashboardWords } from '../features/dashboard/pocDashboard';
import { triageDuration, triageSummary } from '../features/triage/triage';
import { entryFor } from '../i18n/strings';
import { parsePocPlan } from '../models/pocPlan';
import type { RcaIncident } from '../models/rca';

/**
 * 3.7.2 (the owner: "Seguir com a 3.7.2, porém valide estes pontos antes da 3.7.1"): the overview's SLO tiles the dashboards
 * app accepts (and their whole ids), every dashboard on the layout of his own resize, Logs without empty columns and with
 * more of his log-analytics example, a calmer Experience tone, the notebook on the golden signals with its results kept, the
 * launchpad as lists, and the triage e-mail with when the problem began.
 */

const words = (extra: Partial<DashboardWords> = {}): DashboardWords => ({
  title: 'Board',
  intro: 'Intro',
  objectivesTitle: '',
  objectives: [],
  footer: 'Footer',
  sectionTitle: (section, index) => `${index}. ${section}`,
  tileTitle: (key) => key,
  evidence: new Set(['kubernetes', 'automation', 'experience', 'synthetic', 'security']),
  ...extra,
});

const layoutOf = (doc: DashboardDocument, title: string) => {
  const entry = Object.entries(doc.tiles).find(([, tile]) => tile.title === title);
  return entry === undefined ? undefined : doc.layouts[entry[0]];
};

// An SLO id of the platform's length (156 characters); its content is made up.
const SLO_ID = `slo-${'x'.repeat(152)}`;

describe('the overview’s SLO tiles', () => {
  it('carries the columns and options the dashboards app asks for', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.overview, words({ slos: [{ id: SLO_ID, name: 'Availability' }] }));
    const slo = Object.values(doc.tiles).find((tile) => tile.type === 'slo');
    expect(slo?.type === 'slo' ? slo.visualizationSettings : null).toEqual({
      columns: ['status', 'errorBudget', 'target', 'evaluationPeriod'],
      options: { showLabels: true, colorizeBackground: false },
    });
    expect(SLO_TILE_SETTINGS.columns).toHaveLength(4);
  });

  it('keeps an SLO id whole and makes a cut one whole again from the platform’s list', () => {
    const plan = parsePocPlan({ slos: [{ id: SLO_ID, name: 'Availability', kind: 'hostCpu', serviceId: '', createdAt: '', shared: true }] });
    expect(plan.slos?.[0]?.id).toBe(SLO_ID);
    expect(SLO_ID.length).toBe(156);
    const cut = { id: SLO_ID.slice(0, 100), name: 'Availability' };
    const other = { id: 'short-id', name: 'Other' };
    const whole = wholeSloIds([cut, other], [{ id: SLO_ID }, { id: 'unrelated' }]);
    expect(whole.changed).toBe(true);
    expect(whole.refs.map((ref) => ref.id)).toEqual([SLO_ID, 'short-id']);
    // Two SLOs starting alike: nothing is guessed.
    expect(wholeSloIds([cut], [{ id: SLO_ID }, { id: `${SLO_ID.slice(0, 100)}${'b'.repeat(56)}` }]).changed).toBe(false);
  });
});

describe('the layout of the owner’s resize, for every dashboard', () => {
  it('reproduces his SRE dashboard', () => {
    const doc = buildDashboard(SPECIALTY_BLUEPRINTS.sre, words());
    expect(doc.layouts['0']).toEqual({ x: 0, y: 0, w: 24, h: 3 });
    expect(layoutOf(doc, 'sre.successPct')).toMatchObject({ x: 0, w: 6, h: 2 });
    expect(layoutOf(doc, 'serviceHealth')).toMatchObject({ x: 0, w: 12, h: 3 });
    expect(layoutOf(doc, 'p50')).toMatchObject({ x: 12, w: 4, h: 3 });
    expect(layoutOf(doc, 'p99')).toMatchObject({ x: 20, w: 4, h: 3 });
    expect(layoutOf(doc, 'sre.recurringPatterns')).toMatchObject({ x: 0, w: 8, h: 2 });
    expect(layoutOf(doc, 'problemMix')).toMatchObject({ x: 0, w: 12, h: 6 });
    expect(layoutOf(doc, 'mttx')).toMatchObject({ x: 12, w: 12, h: 6 });
    expect(layoutOf(doc, 'sre.recurring')).toMatchObject({ x: 0, w: 24, h: 6 });
    expect(layoutOf(doc, 'svcRanking')).toMatchObject({ x: 0, w: 12, h: 6 });
    expect(layoutOf(doc, 'sre.calls')).toMatchObject({ x: 12, w: 12, h: 6 });
    expect(layoutOf(doc, 'processCpu')).toMatchObject({ x: 0, w: 24, h: 5 });
    expect(layoutOf(doc, 'sre.rootCausePct')).toBeUndefined();
  });

  it('fills every row of every dashboard across the 24 columns, banners one row high', () => {
    for (const id of SPECIALTY_IDS) {
      const doc = buildDashboard(SPECIALTY_BLUEPRINTS[id], words({ slos: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }] }));
      const rows = new Map<number, number>();
      for (const [key, layout] of Object.entries(doc.layouts)) {
        const tile = doc.tiles[key];
        if (tile !== undefined && bannerHeading(tile) !== null) expect(layout, `${id} banner`).toMatchObject({ w: 24, h: 1 });
        rows.set(layout.y, Math.max(rows.get(layout.y) ?? 0, layout.x + layout.w));
      }
      for (const [y, end] of rows) expect(end, `${id} row ${y}`).toBe(24);
    }
  });

  it('spreads figures over the row and pairs the rest', () => {
    expect(rowWidths(5)).toEqual([5, 5, 5, 5, 4]);
    expect(rowWidths(6).every((width) => width === 4)).toBe(true);
    const placed = arrangeSection([{ visualization: 'lineChart' as const }, { visualization: 'table' as const }, { visualization: 'lineChart' as const }]);
    expect(placed.map((tile) => [tile.x, tile.w, tile.h])).toEqual([
      [0, 12, 6],
      [12, 12, 6],
      [0, 24, 5],
    ]);
  });
});

describe('the Logs dashboard', () => {
  it('names an origin for every record, so no table shows an empty column', () => {
    expect(VALIDATED_DQL.logSources.dql).toMatch(/coalesce\(log\.source, service\.name, k8s\.workload\.name, host\.name, dt\.openpipeline\.source\)/);
    expect(VALIDATED_DQL.logHiddenErrors.dql).toContain('by: {origin}');
    const tails = SPECIALTY_BLUEPRINTS.logs.tiles.filter((tile) => tile.queryId === 'log.errors.grouped' || tile.queryId === 'log.errors.recent');
    for (const tile of tails) expect(tile.tail?.join('\n'), tile.key).toMatch(/origin = coalesce\(/);
  });

  it('adds the shares by level and the most frequent messages, each labelled as a sample', () => {
    const keys = SPECIALTY_BLUEPRINTS.logs.tiles.map((tile) => tile.key);
    expect(keys).toEqual(expect.arrayContaining(['logErrorPct', 'logWarnPct', 'logNoLevelPct', 'logLevels', 'logTopMessages']));
    for (const key of ['logErrorPct', 'logWarnPct', 'logNoLevelPct', 'logLevels', 'logTopMessages']) {
      expect(entryFor(`dash2.tile.${key}` as never)['pt-BR'], key).toContain('amostra 1:100');
    }
  });

  it('gives Experience a calmer banner', () => {
    expect(JSON.stringify(SPECIALTY_BLUEPRINTS.experience.banner)).toContain('categorical-themed-swamps-color-01');
  });
});

describe('the investigation notebook', () => {
  const notebook = buildInvestigationNotebook({ title: 't', intro: 'i', chapter: (key, n) => ({ title: `${n}. ${key}`, why: 'w' }), tile: (key) => key, footer: 'f' });

  it('follows the golden signals and draws each step the way the platform’s notebooks write it', () => {
    const titles = notebook.sections.filter((section) => section.type === 'markdown').map((section) => section.markdown ?? '');
    expect(titles.slice(1, 6).map((text) => text.split('\n')[0])).toEqual(['## 1\\. status', '## 2\\. traffic', '## 3\\. latency', '## 4\\. failures', '## 5\\. saturation']);
    const bars = NOTEBOOK_STEPS.find((step) => step.visual === 'categoricalBarChart');
    expect(bars === undefined ? null : stepVisualization(bars)).toMatchObject({ chartSettings: { categoricalBarChartSettings: { categoryAxis: [bars?.by], valueAxis: [bars?.field] } } });
    const line = NOTEBOOK_STEPS.find((step) => step.visual === 'lineChart');
    expect(line === undefined ? null : stepVisualization(line)).toMatchObject({ chartSettings: { fieldMapping: { timestamp: 'timeframe', leftAxisValues: [line?.field] } } });
  });

  it('keeps each section’s result, so it opens with its chart; a query that did not answer keeps none', async () => {
    let calls = 0;
    const kept = await withResults(
      notebook,
      () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error('refused'));
        return Promise.resolve({ records: [{ a: 1 }], metadata: {}, types: [] });
      },
      Date.parse('2026-11-22T12:00:00Z'),
    );
    const queries = kept.sections.filter((section) => section.type === 'dql');
    expect(queries.filter((section) => section.state?.result !== undefined)).toHaveLength(NOTEBOOK_STEPS.length - 1);
    const done = queries.find((section) => section.state?.result !== undefined);
    expect(done?.state?.state).toBe('success');
    expect(done?.state?.result).toMatchObject({ code: 200, value: { records: [{ a: 1 }] }, dateTime: '2026-11-22T12:00:00.000Z' });
    expect(windowOf({ from: 'now()-24h' }, Date.parse('2026-11-22T12:00:00Z'))).toEqual({ startIso: '2026-11-21T12:00:00.000Z', endIso: '2026-11-22T12:00:00.000Z' });
  });
});

describe('the launchpad', () => {
  it('lists the documents and the app pages, with no card waiting for an image', () => {
    const launchpad = buildPocLaunchpad({
      title: 't',
      intro: 'i',
      appIcon: '/platform/app-engine/registry/v1/app-icons/my.poc.automation',
      groups: [
        { heading: 'Notebook', description: 'd', items: [{ title: 'Investigation', description: 'd', documentId: 'nb', category: 'notebooks' }] },
        { heading: 'App', description: 'd', items: [{ title: 'Overview', description: 'd', url: '/ui/apps/my.poc.automation/' }] },
      ],
      footer: 'f',
    });
    const json = JSON.stringify(launchpad);
    expect(json).not.toMatch(/"cards"|imageDark|imageLight/);
    expect(json).toContain('"openDocument"');
    expect(json).toContain('/platform/app-engine/registry/v1/app-icons/my.poc.automation');
  });
});

describe('the triage e-mail', () => {
  it('says when the problem began and for how long, and counts one entity in the singular', () => {
    const incident = {
      displayId: 'P-1',
      name: 'Http monitor global outage',
      category: 'AVAILABILITY',
      status: 'CLOSED',
      rootCauseName: null,
      affectedCount: 1,
      affectedNames: ['teste'],
      clusters: [],
      namespaces: [],
      workloads: [],
      startIso: '2026-11-22T21:30:00Z',
      durationNs: 72 * 60 * 1e9,
    } as unknown as RcaIncident;
    const text = triageSummary(incident, null, [], { problem: null, app: 'https://x/a' }, 'pt-BR');
    expect(text).toContain('| **Início** | 2026-11-22 21:30 UTC |');
    expect(text).toContain('| **Durou** | 1 h 12 min |');
    expect(text).toContain('### Alcance — 1 entidade');
    expect(triageDuration(45 * 60 * 1e9)).toBe('45 min');
    expect(triageDuration(null)).toBeNull();
  });
});

describe('What’s new', () => {
  it('keeps 3.7.2 among the ten releases', () => {
    // 3.7.3: newer releases come first.
    // 3.8.2: i114 left the ten What's new shows (the entry stays in its fragment).
    expect(WHATS_NEW).not.toContainEqual({ key: 'help.whatsNew.i114', published: '2026-11-23' });
    expect(WHATS_NEW.length).toBe(10);
    expect(entryFor('help.whatsNew.i114').en.startsWith('3.7.2 — ')).toBe(true);
  });
});
