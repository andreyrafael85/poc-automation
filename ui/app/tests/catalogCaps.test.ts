import { describe, expect, it } from 'vitest';

import {
  ALL_QUERIES,
  BOUNDED_LIST_CEILING,
  CAPACITY_LIST_LIMIT,
  CATALOG,
  VULNERABILITY_LIST_LIMIT,
} from '../queries/catalog';
import { isCapped, resultCap } from '../queries/resultCap';

/**
 * A total, count or share must never be computed from the rows of a list that stops at a limit:
 * on a larger estate it silently undercounts. 3.1.0 did exactly that in fifteen places (the
 * 500-vulnerability list, the 1,000-host licensing list, the 25 busiest Kubernetes workloads,
 * the 25 most frequent business event types of 1,626 ...).
 *
 * The rule these tests pin:
 *  - a query that is capped (a trailing `| limit N`, or a `maxResultRecords` below the ceiling)
 *    is a DISPLAY LIST, and must either be listed as list-only here or name the aggregate query
 *    that carries its totals;
 *  - the aggregate is a real aggregate: it summarises, with no limit of its own;
 *  - grouped lists whose cardinality the platform bounds carry no limit at all.
 */

/** Capped list -> the aggregate query that holds its exact totals. */
const COMPANION: Record<string, string> = {
  'sec.vulnerabilities': 'sec.posture',
  'infra.capacity': 'infra.capacity.summary',
  'auto.workflows': 'auto.workflows.total',
  'prob.recurrent': 'prob.recurrent.total',
  'prob.topentities': 'prob.topentities.total',
  'svc.ranking': 'svc.ranking.total',
  'svc.topology': 'svc.topology.total',
  'k8s.restarts': 'k8s.restarts.total',
  'k8s.pressure': 'k8s.pressure.total',
  'biz.events': 'biz.events.total',
  'auto.failing': 'auto.workflows.total',
};

/** Capped lists that are only ever displayed: nothing is counted or summed from them. */
const LIST_ONLY = new Set([
  // 3.7.4: one aggregate record (shares and 1:100 sampled counts) for the OpenPipeline kit's preview — shown, never summed.
  'log.levels.preview',
  // 3.7.6: one aggregate record (1:100 sampled counts) for the OpenPipeline kit's check — shown, never summed.
  'log.pipeline.check',
  // 3.7.6: the 12 sources without a level the route can take — a list of choices, never added up.
  'log.sources.nolevel',
  'prob.list',
  // 3.6.4: the console's 12 most recent error records — shown, never counted; the total is log.quality's ERROR rows.
  'log.errors.recent',
  // 3.6.8: the console's 12 most recently seen errors with their counts in the window — each count is its own group's; never summed.
  'log.errors.grouped',
  // 3.6.9: the SLO indicators the PoC Builder writes — one series of one service, evaluated by the platform, never counted here.
  'slo.availability',
  'slo.performance',
  // 3.7.0: the one problem a workflow hands to the triage action.
  'triage.problem',
  // 3.6.1: the links between an incident's services — drawn, never counted.
  'rca.edges',
  'cloud.hosts.detail',
  'cov.hosts.table',
  'rca.top',
  'rca.logs',
  'rca.trend',
  'rca.catmix',
  'cov.dataobjects',
  'log.sfm',
  'rum.sessions',
  // 3.2.5: per-vulnerability context, joined to the listed vulnerabilities by id; never summed.
  'sec.context',
  // 3.2.6: the frontend → service edges of the two busiest frontends, drawn as flows; never counted.
  'rum.app.flow',
  // TD-08 (3.3.2): the parameterised entries. Each row ceiling is the request guard the 3.2.7
  // registry set; the rows are drawn or read one by one, never added up.
  'rca.callers', // the five callers of a root cause, each a link
  'ev.problem.events', // the grouped events (a timeline) and the problem row, whose eventCount is the total
  'ev.service.minutes', // one row per requested service (≤ 6): a full series each, not a cut list
  'ev.service.endpoints', // the ten endpoints with most failures, listed
  'ev.frontend.summary', // one aggregate row
  'ev.frontend.minutes', // one aggregate row
  'ev.k8s.capacity', // one usage row and one allocatable row
  'ev.k8s.workloads', // the eight largest reservations, listed
  'ev.k8s.incidentRestarts', // the ten workloads that restarted most, listed
  'ev.failing.services', // the five services by excess and the subject row; the environment totals are lookup fields
  'ev.failing.endpoints', // the six endpoints with most failures, listed
  'ev.entity.events', // one aggregate row
  'ev.topology.blast', // one aggregate row
]);

/**
 * TD-08 (3.3.2): capped lists whose exact totals travel in the same query, as one appended row that
 * aggregates on its own (`isTotal`/`isAnchor`), so the totals never come from the listed rows.
 */
const SELF_TOTALLED = new Set([
  'rca.incident.logs',
  'rca.incident.logs.services',
  'ev.problem.recurrence',
  'ev.service.screen',
  'ev.k8s.churn',
  'ev.failed.endpoints',
  'ev.logs.errors',
  'ev.topology.hubs',
  'ev.host.cpu',
]);

const capped = ALL_QUERIES.filter((entry) => {
  const cap = resultCap(entry);
  return cap !== null && cap < BOUNDED_LIST_CEILING;
});

describe('capped lists', () => {
  it('are each either list-only or paired with an aggregate that carries the totals', () => {
    const undecided = capped
      .map((entry) => entry.id)
      .filter((id) => COMPANION[id] === undefined && !LIST_ONLY.has(id) && !SELF_TOTALLED.has(id));
    expect(undecided, 'a capped query needs an aggregate companion, or a place in LIST_ONLY').toEqual([]);
  });

  it('only name companions that exist in the catalog', () => {
    for (const [list, companion] of Object.entries(COMPANION)) {
      expect(Object.keys(CATALOG), `${list} -> ${companion}`).toContain(companion);
      expect(Object.keys(CATALOG), list).toContain(list);
    }
  });

  it('keep list-only entries real, so a rename cannot leave a stale exemption', () => {
    for (const id of LIST_ONLY) expect(Object.keys(CATALOG), id).toContain(id);
    for (const id of SELF_TOTALLED) expect(Object.keys(CATALOG), id).toContain(id);
  });

  it('carry their totals in an appended row that aggregates on its own, when self-totalled (TD-08)', () => {
    for (const id of SELF_TOTALLED) {
      const dql = CATALOG[id]!.dql;
      const appended = dql.slice(dql.indexOf('| append ['));
      expect(dql, `${id} appends its totals`).toContain('| append [');
      expect(appended, `${id}: the totals row is tagged`).toMatch(/isTotal = true|isAnchor = true/);
      // The appended pipeline aggregates (summarize) or reads scalar metric totals: never the listed rows.
      expect(appended, `${id}: the totals row aggregates`).toMatch(/\|\s*summarize|scalar: true/);
    }
  });
});

describe('aggregate companions', () => {
  it('summarise, and carry no row limit that could cut the figure they exist to make exact', () => {
    for (const companion of new Set(Object.values(COMPANION))) {
      const entry = CATALOG[companion]!;
      expect(entry.dql, `${companion} must aggregate`).toMatch(/\|\s*summarize/);
      expect(resultCap(entry), `${companion} must not be capped by a limit`).toBeNull();
    }
  });
});

describe('grouped lists the platform bounds', () => {
  it('have no limit, only an explicit ceiling no real estate reaches', () => {
    const bounded = [
      'proc.technologies',
      'cons.advisor',
      'cons.capabilities',
      'cloud.services',
      'comp.agents',
      'rum.scorecard',
      'rum.webvitals',
      'rum.audience',
    ];
    for (const id of bounded) {
      const entry = CATALOG[id as keyof typeof CATALOG]!;
      expect(entry.dql, `${id} must not end in a limit`).not.toMatch(/\|\s*limit\s+\d+/);
      expect(resultCap(entry), id).toBe(BOUNDED_LIST_CEILING);
    }
  });

  it('say so when a result fills its cap, instead of looking complete', () => {
    const entry = CATALOG['sec.vulnerabilities']!;
    expect(isCapped(entry, VULNERABILITY_LIST_LIMIT - 1)).toBe(false);
    expect(isCapped(entry, VULNERABILITY_LIST_LIMIT)).toBe(true);
  });
});

describe('list limits the pages print', () => {
  it('match the limit in the DQL, so "top N of TOTAL" can never state a different N', () => {
    expect(resultCap(CATALOG['sec.vulnerabilities']!)).toBe(VULNERABILITY_LIST_LIMIT);
    expect(resultCap(CATALOG['infra.capacity']!)).toBe(CAPACITY_LIST_LIMIT);
  });
});

describe('resultCap', () => {
  it('reads a trailing limit and the guard, and takes the smaller', () => {
    expect(resultCap({ dql: 'fetch x\n| limit 25', guards: undefined })).toBe(25);
    expect(resultCap({ dql: 'fetch x', guards: { maxResultRecords: 300 } })).toBe(300);
    expect(resultCap({ dql: 'fetch x\n| limit 25', guards: { maxResultRecords: 10 } })).toBe(10);
    expect(resultCap({ dql: 'fetch x', guards: undefined })).toBeNull();
  });
});
