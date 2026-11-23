/**
 * Evidence fixtures of the real-prints deck (3.2.7, spec §7.6): Grail records per
 * `EvidenceQueryId`, shaped like the validation tenant's outputs (Appendix A of the spec, pinned in
 * `ui/app/tests/fixtures/prints.lab.ts`) but entirely synthetic: entity ids come from `entityId()`,
 * names from the rich estate, and every instant is derived from the rich incident (`rca.top[0]`)
 * or from `Date.now()` (frozen by the harness), so two runs are byte-identical.
 *
 * Fixtures that depend on what was asked are functions of `{ query, startIso, endIso }`
 * (`mocks/react-hooks.mjs` calls them): the per-minute reads start at the window the app asked
 * for, so the baseline is the 30 minutes before the anchor exactly as on a tenant; the service
 * reads answer for the ids in the text; B6 answers per window (incident, problem, screen).
 *
 * What each one exercises:
 * - B1 5 events + the problem row (users 52); one event detail carries a fake e-mail and IP (redaction).
 * - B2 the root ranks 1st, 3.0x the next (D13 recurrence).
 * - B4 one point per minute of W (70 on the lab; the rich incident is still open, so W runs ~6.75 h)
 *   per service: a collapse, a 5-minute 100 % block (D1), a 4-minute null gap on the caller (D4)
 *   and a p90 spike (D5a), all in the first 70 minutes.
 * - B6 x3 (by window), B7 a frontend error spike (D7), B10 memory reserved and idle (D8a),
 *   B11-B13 workloads, churn and restarts in the incident's namespace, B14/B14b the failing service
 *   by excess failures, B15 6 log signatures with a 3-way cascade (D11) and a fake e-mail and IP
 *   (redaction), B16 the failed requests, B17 a blast radius over 3 (D14), B18 the hubs, B19 hosts.
 * - `k8s.cluster.ids` (catalog): the Smartscape id of each rich cluster, so the plan has its
 *   Kubernetes screen.
 *
 * No real tenant, customer, e-mail or id: `contoso.example` and `10.1.2.3` are reserved
 * documentation values, there only to prove they never reach a slide unmasked.
 */

import { HOUR, MIN, Rand, entityId, isoAgo, nowMs, table } from './lib.mjs';

const MINUTE_NS = '60000000000';
/** The lab's W is 70 one-minute bins (a 12-minute problem); a longer W (the rich incident is still open) keeps its baseline to the end. */
const POINTS = 70;
const MAX_POINTS = 7 * 60;
/** The fake personal data the redaction must remove (documentation-reserved values). */
export const FAKE_EMAIL = 'ana.silva@contoso.example';
export const FAKE_IP = '10.1.2.3';

const iso = (ms) => new Date(ms).toISOString();
const minutesOf = (request) => {
  const start = Date.parse(request?.startIso ?? '');
  const end = Date.parse(request?.endIso ?? '');
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / MIN) : null;
};
/** The window the app asked for, or the given fallback. */
function windowOf(request, fallbackStartMs, fallbackEndMs) {
  const start = Date.parse(request?.startIso ?? '');
  const end = Date.parse(request?.endIso ?? '');
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : { start: fallbackStartMs, end: fallbackEndMs };
}
/** The entity ids a query text names, in order (`"SERVICE-…"`). */
const idsIn = (query, type) => [...String(query ?? '').matchAll(new RegExp(`"(${type}-[0-9A-F]{16})"`, 'g'))].map((match) => match[1]);
const frameOf = (startMs, points = POINTS) => ({ start: iso(startMs), end: iso(startMs + points * MIN) });
/** One bin per minute of the window asked for: at least the lab's 70, at most W's 7 hours. */
const pointsOf = (request) => Math.min(MAX_POINTS, Math.max(POINTS, minutesOf(request) ?? POINTS));

// ------------------------------------------------------------------ per-minute series (B4, B7)

/** The database root: a collapse, then five minutes where every request fails, then recovery. */
function rootMinutes(points) {
  const r = new Rand(7001);
  const requests = [];
  const failures = [];
  const p90 = [];
  for (let i = 0; i < 39; i += 1) {
    requests.push(r.int(560, 690));
    failures.push(0);
    p90.push(Math.round(r.float(3000, 9500)));
  }
  const tailReq = [160, 110, 40, 9, 9, 34, 48, 110, 137, 22, 9, 203, 288, 404, 295];
  const tailP90 = [50_687, 3_551, 1_647, 1_967, 2_211, 16_383_999, 13_238_271, 2_654_207, 14_286_847, 20_709_375, 2_654_207, 1_303_404, 1_843_292, 1_690_306, 3_380_612];
  tailReq.forEach((value, k) => {
    requests.push(value);
    // Minutes 44-48 of the window: every request fails (D1, five minutes).
    failures.push(k >= 5 && k <= 9 ? value : 0);
    p90.push(tailP90[k]);
  });
  while (requests.length < points) {
    requests.push(r.int(650, 860));
    failures.push(0);
    p90.push(Math.round(r.float(1300, 2200)));
  }
  return { requests, failures, p90 };
}

/** The caller that took the failures: a 4-minute hole in its data, the same 100 % block, a p90 spike. */
function callerMinutes(seed, points) {
  const r = new Rand(seed);
  const requests = [];
  const failures = [];
  const p90 = [];
  for (let i = 0; i < 39; i += 1) {
    requests.push(r.int(205, 218));
    failures.push(0);
    p90.push(Math.round(r.float(22_000, 78_000)));
  }
  const tailReq = [160, null, null, null, null, 28, 54, 110, 125, 24, 10, 41, 54, 94, 92];
  const tailP90 = [195_689, null, null, null, null, 23_472_360, 22_969_396, 8_120_907, 3_643_666, 21_063_029, 80_680_104, 116_597_338, 16_597_465, 12_255_785, 13_956_749];
  tailReq.forEach((value, k) => {
    requests.push(value);
    failures.push(value === null ? null : k >= 5 && k <= 9 ? value : 0);
    p90.push(tailP90[k]);
  });
  while (requests.length < points) {
    requests.push(r.int(206, 226));
    failures.push(0);
    p90.push(Math.round(r.float(3800, 11_000)));
  }
  return { requests, failures, p90 };
}

/** Real-user requests and errors per minute: errors at about 3/min, then a peak of 81 (D7). */
function frontendMinutes(points) {
  const r = new Rand(7003);
  const reqs = [];
  const errs = [];
  for (let i = 0; i < points; i += 1) {
    if (i === 42 || i === 45 || i === 46) {
      reqs.push(null);
      errs.push(null);
      continue;
    }
    reqs.push(i >= 39 && i <= 50 ? r.int(10, 90) : r.int(36, 141));
    errs.push(i === 40 ? 81 : i === 41 ? 46 : i >= 43 && i <= 49 ? r.int(8, 18) : r.int(1, 4));
  }
  return { reqs, errs };
}

const sum = (values) => values.reduce((total, value) => total + (value ?? 0), 0);

// ------------------------------------------------------------------ the fixtures

/**
 * @param {object} input
 * @param {{ top: object[] }} input.rca              the rich `buildRca` output (`top[0]` is the incident)
 * @param {object[]} input.callers                    the rich `rca.callers` rows (B3 is that text)
 * @param {object[]} input.ranking                    the rich `svc.ranking` rows
 * @param {{ totalRequests: number, totalFailures: number }} input.totals   the rich `svc.totals` row
 * @param {{ name: string }[]} input.clusters          the rich clusters (`k8s-cluster-a` …)
 */
export function buildPrintFixtures({ rca, callers, ranking, totals, clusters }) {
  const t = (records) => table(records);
  const incident = rca.top[0];
  const rootId = incident.rootCauseId;
  const rootName = incident.rootCauseName ?? rootId;
  const startMs = Date.parse(incident.start);
  const endMs = incident.end === null ? null : Date.parse(incident.end);
  // The first correlated event starts 13 minutes before the problem (as on the lab tenant); W starts 30 minutes earlier.
  const firstEventMs = startMs - 13 * MIN;
  const wStartMs = firstEventMs - 30 * MIN;
  const writtenAtMs = startMs + 15 * MIN;
  const caller = callers[0];
  // The incident's own names win (the rich estate names some ids differently in its ranking).
  const nameOf = new Map([...ranking.map((row) => [row.serviceId, row.name]), ...callers.map((row) => [row.id, row.name]), [rootId, rootName]]);
  const frontendApp = 'APPLICATION-000000000000A100';

  // B1 — the problem's events (the root's first), then the problem row.
  const problemEvents = [
    { id: '-101', name: 'Response time degradation', category: 'SLOWDOWN', start: firstEventMs, end: firstEventMs + 19 * MIN, source: rootId, sourceName: rootName, detail: 'The current response time is above the baseline.' },
    { id: '-102', name: 'Failure rate increase', category: 'ERROR', start: firstEventMs, end: firstEventMs + 19 * MIN, source: rootId, sourceName: rootName, detail: 'The current failure rate is above the baseline.' },
    { id: '-103', name: 'Failure rate increase', category: 'ERROR', start: startMs - 5 * MIN, end: startMs + 11 * MIN, source: caller.id, sourceName: caller.name, detail: `Contact ${FAKE_EMAIL} on ${FAKE_IP}.` },
    { id: '-104', name: 'Response time degradation', category: 'SLOWDOWN', start: startMs - 5 * MIN, end: startMs + 12 * MIN, source: caller.id, sourceName: caller.name, detail: 'The current response time is above the baseline.' },
    { id: '-105', name: 'JavaScript error rate increase', category: 'ERROR', start: startMs, end: startMs + 7 * MIN, source: frontendApp, sourceName: 'web-shop-frontend', detail: 'User action error rate increase.' },
  ].map((event) => ({
    'event.id': `${event.id}_${String(event.start)}V2`,
    'event.name': event.name,
    'event.category': event.category,
    'event.start': iso(event.start),
    'event.end': iso(event.end),
    writtenAt: iso(writtenAtMs),
    source: event.source,
    sourceName: event.sourceName,
    detail: event.detail,
  }));
  problemEvents.push({
    isProblem: true,
    users: '52',
    eventCount: 5,
    impact: ['Application', 'Services'],
    problemStatus: incident.status,
    severity: null,
    pStart: incident.start,
    pEnd: incident.end,
  });

  // B2 — 15 days of root causes: this root first, 3.0x the next.
  const recurrence = [
    { rootId, problems: 6, medianMin: 9, rankName: rootName },
    { rootId: entityId('HOST', 3), problems: 2, medianMin: 31, rankName: 'host-eu-01' },
    { rootId: entityId('SERVICE', 6), problems: 2, medianMin: 4, rankName: 'svc-search-01' },
    { isAnchor: true, problems: 6, closed: 5, medianMin: 9, p90Min: 17 },
    { isTotal: true, problems: 6824, rootCaused: 213, medianMin: 11 },
  ];

  // B4 — per minute over W, for the ids in the text (the root and the caller the plan opened).
  const serviceMinutes = (request) => {
    const { start } = windowOf(request, wStartMs, wStartMs + POINTS * MIN);
    const points = pointsOf(request);
    const ids = idsIn(request?.query, 'SERVICE');
    return t(
      (ids.length > 0 ? ids : [rootId, caller.id]).map((id, index) => {
        const series = id === rootId ? rootMinutes(points) : callerMinutes(7002 + index, points);
        return {
          id,
          name: nameOf.get(id) ?? id,
          timeframe: frameOf(start, points),
          interval: MINUTE_NS,
          requests: series.requests,
          failures: series.failures,
          p90: series.p90,
          req: sum(series.requests),
          fail: sum(series.failures),
        };
      }),
    );
  };

  // B5 — the endpoints of the root's caller over W.
  const serviceEndpoints = (request) => {
    const id = idsIn(request?.query, 'SERVICE')[0] ?? caller.id;
    const name = nameOf.get(id) ?? id;
    return t(
      [
        ['POST /api/v2/checkout/authorize', 5776, 166],
        ['GET /api/v2/cart', 5775, 165],
        ['GET /api/v2/accounts', 410, 10],
        ['GET /api/v2/accounts/{id}', 382, 0],
        ['GET /health', 1, 0],
      ].map(([endpoint, requests, failures]) => ({ id, name, 'endpoint.name': endpoint, requests, failures, ratePct: Math.round((10000 * failures) / requests) / 100 })),
    );
  };

  // B14 — services by failures in EXCESS of the environment rate (as the planner ranks them).
  const envRequests = totals.totalRequests;
  const envFailures = totals.totalFailures;
  const envRate = envFailures / envRequests;
  const failingRows = ranking
    .filter((row) => row.totalRequests >= 500 && row.totalFailures > 0)
    .map((row) => ({
      id: row.serviceId,
      name: row.name,
      requests: row.totalRequests,
      failures: row.totalFailures,
      failurePct: Math.round((10000 * row.totalFailures) / row.totalRequests) / 100,
      excess: Math.round(row.totalFailures - row.totalRequests * envRate),
      timesEnv: Math.round((10 * (row.totalFailures / row.totalRequests)) / envRate) / 10,
      'env.envRequests': envRequests,
      'env.envFailures': envFailures,
    }))
    .sort((a, b) => b.excess - a.excess)
    .slice(0, 5);
  const failing = failingRows.find((row) => row.id !== caller.id) ?? failingRows[0];

  // B14b — the failing service's endpoints: one carries most of the failures (D18).
  const failingEndpoints = failing === undefined
    ? []
    : [
        ['GET /api/v1/catalog/items', 0.35, 0.62, 3.1, 12.4],
        ['POST /api/v1/catalog/reindex', 0.05, 0.21, 6682.5, 11_993.2],
        ['GET /api/v1/catalog/price', 0.5, 0.11, 2.2, 8.1],
        ['GET /api/v1/catalog/search', 0.1, 0.06, 41.0, 96.3],
      ].map(([endpoint, reqShare, failShare, p50Ms, p90Ms]) => {
        const requests = Math.round(failing.requests * reqShare);
        const failures = Math.round(failing.failures * failShare);
        return { 'endpoint.name': endpoint, requests, failures, failurePct: Math.round((10000 * failures) / requests) / 100, p50Ms, p90Ms };
      });

  // B8 — the numbers each service page shows over its screen window, by the id in the text.
  const serviceScreen = (request) => {
    const id = idsIn(request?.query, 'SERVICE')[0] ?? caller.id;
    const { start, end } = windowOf(request, nowMs() - 31 * MIN, nowMs());
    const own = failing !== undefined && id === failing.id;
    const endpoints = own
      ? [
          ['GET /api/v1/catalog/items', 13_402, 1_204, 14.2],
          ['POST /api/v1/catalog/reindex', 1_911, 401, 6120.4],
          ['GET /api/v1/catalog/price', 19_207, 220, 3.3],
        ]
      : [
          ['GET /api/v2/accounts', 410, 0, 37.72],
          ['POST /api/v2/checkout/authorize', 2790, 4, 2.9],
          ['GET /api/v2/cart', 2804, 3, 2.7],
        ];
    const requests = sum(endpoints.map((row) => row[1]));
    const failures = sum(endpoints.map((row) => row[2]));
    return t([
      ...endpoints.map(([endpoint, req, fail, p50Ms]) => ({ 'endpoint.name': endpoint, requests: req, failures: fail, failurePct: Math.round((10000 * fail) / req) / 100, p50Ms })),
      {
        isTotal: true,
        requests,
        failures,
        failurePct: Math.round((10000 * failures) / requests) / 100,
        avgMs: own ? 211.4 : 485.9,
        p50Ms: own ? 14.2 : 2.78,
        avgRt: own ? 211_400 : 485_900,
        p50All: own ? 14_200 : 2780,
        timeframe: { start: iso(start), end: iso(end) },
        interval: String((end - start) * 1_000_000),
      },
    ]);
  };

  // B6 x3 — the frontend's real users, per window: the problem's (the screen's users and sessions), W, or the screen's.
  const frontendSummary = (request) => {
    const minutes = minutesOf(request) ?? 120;
    const { start, end } = windowOf(request, nowMs() - 2 * HOUR, nowMs());
    const frame = { timeframe: { start: iso(start), end: iso(end) }, interval: String((end - start) * 1_000_000) };
    const problemMinutes = Math.round(((endMs ?? nowMs()) - startMs) / MIN);
    if (Math.abs(minutes - problemMinutes) <= 1) {
      return t([{ ...frame, lcp_p75: 756, inp_p75: 3672, cls_x10k_p75: null, ttfb_p75: null, reqs: 398, errs: 64, ua_p75: null, users: 30, sessions: 46, cls: null, errorsPer100: 16.08 }]);
    }
    if (minutes > 150) {
      return t([{ ...frame, lcp_p75: 576, inp_p75: 4978.8, cls_x10k_p75: 10, ttfb_p75: 11, reqs: 4593, errs: 371, ua_p75: 1093, users: 86, sessions: 401, cls: 0.001, errorsPer100: 8.08 }]);
    }
    return t([{ ...frame, lcp_p75: 2870, inp_p75: 612, cls_x10k_p75: 1200, ttfb_p75: 340, reqs: 52_310, errs: 1_204, ua_p75: 1450, users: 1_240, sessions: 1_811, cls: 0.12, errorsPer100: 2.3 }]);
  };

  // B7 — real-user requests and errors per minute over W.
  const frontendMinuteRows = (request) => {
    const { start } = windowOf(request, wStartMs, wStartMs + POINTS * MIN);
    const points = pointsOf(request);
    const { reqs, errs } = frontendMinutes(points);
    return t([{ timeframe: frameOf(start, points), interval: MINUTE_NS, reqs, errs, totalReqs: sum(reqs), totalErrs: sum(errs) }]);
  };

  // B13 — restarts per minute over W; the summariser keeps the incident's namespaces (`checkout`).
  const incidentRestarts = (request) => {
    const { start } = windowOf(request, wStartMs, wStartMs + POINTS * MIN);
    const frame = frameOf(start, pointsOf(request));
    return t([
      { 'k8s.workload.name': 'wl-payments-01', 'k8s.namespace.name': 'payments', total: 31, firstIdx: 0, timeframe: frame },
      { 'k8s.workload.name': 'wl-gateway-02', 'k8s.namespace.name': 'platform', total: 25, firstIdx: 2, timeframe: frame },
      { 'k8s.workload.name': 'wl-checkout-01', 'k8s.namespace.name': 'checkout', total: 2, firstIdx: 47, timeframe: frame },
      { 'k8s.workload.name': 'wl-orders-03', 'k8s.namespace.name': 'shop-prod', total: 7, firstIdx: 5, timeframe: frame },
    ]);
  };

  const clusterRows = clusters.map((cluster, index) => ({ clusterName: cluster.name, clusterId: entityId('K8S_CLUSTER', index + 1) }));

  return {
    'k8s.cluster.ids': t(clusterRows),
    'ev.problem.events': t(problemEvents),
    'ev.problem.recurrence': t(recurrence),
    'ev.service.minutes': serviceMinutes,
    'ev.service.endpoints': serviceEndpoints,
    'ev.service.screen': serviceScreen,
    'ev.frontend.summary': frontendSummary,
    'ev.frontend.minutes': frontendMinuteRows,
    // B10 — the incident cluster: memory almost all reserved, little of it used (D8a).
    'ev.k8s.capacity': t([
      { cpuUsedCores: 4.92, cpuReqCores: 13.7, cpuLimCores: 31.15, memUsedGiB: 4.86, memReqGiB: 55.17, memLimGiB: 58.54 },
      { isAllocatable: true, cpuAllocCores: 15.82, memAllocGiB: 58.0 },
    ]),
    'ev.k8s.workloads': t(
      [
        ['wl-checkout-01', 'checkout', 117.5, 12.4, 4, 4.7],
        ['wl-payments-01', 'payments', 61.2, 82.2, 2, 1.22],
        ['wl-orders-03', 'shop-prod', 40.1, 5.2, 1.5, 0.6],
        ['wl-gateway-02', 'platform', 55.3, 9.8, 1, 0.55],
        ['wl-search-01', 'search', 88.1, 3.1, 0.5, 0.44],
        ['wl-cart-02', 'checkout', 47.0, 6.6, 0.5, 0.24],
        ['wl-auth-01', 'platform', 33.3, 2.0, 0.25, 0.08],
        ['wl-inventory-03', 'shop-prod', 71.9, 14.5, 0.25, 0.18],
      ].map(([name, namespace, memOfReqPct, cpuOfReqPct, memReqGiB, memUsedGiB]) => ({
        'k8s.workload.name': name,
        'k8s.namespace.name': namespace,
        memOfReqPct,
        cpuOfReqPct,
        memReqGiB,
        memUsedGiB,
      })),
    ),
    // B12 — 24 h of restarts: two workloads hold most of them, one with OOM kills (D9).
    'ev.k8s.churn': t([
      { 'k8s.workload.name': 'wl-payments-01', 'k8s.namespace.name': 'payments', restarts: 669, oomKills: 257 },
      { 'k8s.workload.name': 'wl-gateway-02', 'k8s.namespace.name': 'platform', restarts: 555, oomKills: null },
      { 'k8s.workload.name': 'wl-orders-03', 'k8s.namespace.name': 'shop-prod', restarts: 161, oomKills: null },
      { 'k8s.workload.name': 'wl-search-01', 'k8s.namespace.name': 'search', restarts: 132, oomKills: null },
      { isTotal: true, restarts: 1522, timeframe: { start: isoAgo(24 * HOUR), end: isoAgo(0) } },
    ]),
    'ev.k8s.incidentRestarts': incidentRestarts,
    'ev.failing.services': t(failingRows),
    'ev.failing.endpoints': t(failingEndpoints),
    'ev.entity.events': t([{ events: 8, byCategory: ['ERROR', 'SLOWDOWN'], last: isoAgo(4 * HOUR), names: ['Failure rate increase', 'Response time degradation'] }]),
    // B16 — the failed requests of the screen window, and the totals.
    'ev.failed.endpoints': t([
      ...[
        [rootId, 'NON_KEY_REQUESTS', 40_211, 48],
        [failing?.id ?? entityId('SERVICE', 3), 'GET /api/v1/catalog/items', 1_319, 31],
        [caller.id, 'POST /api/v2/checkout/authorize', 1_880, 16],
        [caller.id, 'GET /api/v2/cart', 1_881, 15],
        [entityId('SERVICE', 40), 'EventStream', 12, 12],
        [entityId('SERVICE', 14), 'POST /api/v1/orders', 640, 9],
        [entityId('SERVICE', 7), 'Login', 512, 7],
        [entityId('SERVICE', 9), 'GET /api/v1/shipping/quote', 300, 5],
      ].map(([id, endpoint, requests, failures]) => ({ id, name: nameOf.get(id) ?? id, 'endpoint.name': endpoint, requests, failures, ratePct: Math.round((10000 * failures) / requests) / 100 })),
      { isTotal: true, requests: 832_433, failures: 284 },
    ]),
    // B15 — 6 ERROR signatures (three of them one cascade, D11; one with a fake e-mail and IP) and the total.
    'ev.logs.errors': t([
      { signature: '[build] BUILD FAILED /opt/build/build.xml:# The following error occurred while executing this line', occurrences: 2754, origins: 1, topOrigin: 'batch' },
      { signature: '[build] /opt/build/common.xml:# Compile failed; see the compiler error output for details', occurrences: 2754, origins: 1, topOrigin: 'batch' },
      { signature: '[build] Target "compile" does not exist in the project "#". It is used from target "dist"', occurrences: 2754, origins: 1, topOrigin: 'batch' },
      // The fake e-mail first: a bar label shows about 30 characters, so a leak would be on the slide (the IP is
      // there for the summariser's redaction; on a tenant the DQL already turns its digits into '#').
      { signature: `${FAKE_EMAIL} ${FAKE_IP}: payment callback rejected (code #)`, occurrences: 2_210, origins: 2, topOrigin: 'payments' },
      { signature: 'prometheus scrape failed: context deadline exceeded', occurrences: 1197, origins: 3, topOrigin: 'monitoring' },
      { signature: 'operator reconcile error: certificate not ready', occurrences: 1005, origins: 1, topOrigin: 'platform' },
      { isTotal: true, occurrences: 15_126 },
    ]),
    // B17 — the root's blast radius: its callers, two entry services above them, one frontend (D14).
    'ev.topology.blast': t([
      {
        rootType: 'DATABASE_SERVICE',
        hop1: callers.length,
        hop2: 2,
        hop1Ids: callers.map((row) => row.id),
        hop2Ids: [entityId('SERVICE', 30), entityId('SERVICE', 31)],
        apps: [frontendApp],
        appCount: 1,
      },
    ]),
    // B18 — the services with most connections (two share a name, told apart by id) and the totals.
    'ev.topology.hubs': t([
      ...[
        [entityId('SERVICE', 23), 'WEB_REQUEST_SERVICE', 2, 6],
        [entityId('SERVICE', 13), 'WEB_REQUEST_SERVICE', 1, 6],
        [entityId('SERVICE', 20), 'WEB_SERVICE', 2, 3],
        [entityId('SERVICE', 1), 'WEB_SERVICE', 2, 3],
        [entityId('SERVICE', 16), 'WEB_SERVICE', 2, 3],
      ].map(([id, serviceType, callersCount, callees]) => ({ id, 'entity.name': nameOf.get(id) ?? id, serviceType, callers: callersCount, callees, degree: callersCount + callees })),
      { isTotal: true, services: 70, isolated: 29, dbServices: 9 },
    ]),
    // B19 — the hosts with the highest CPU peak (opt-in host screen) and the fleet median.
    'ev.host.cpu': t([
      { 'dt.entity.host': entityId('HOST', 3), name: 'host-eu-01', cpuAvg: 75.7, cpuPeak: 98.2, memAvg: 61.4, memPeak: 88.0 },
      { 'dt.entity.host': entityId('HOST', 15), name: 'host-eu-05', cpuAvg: 41.2, cpuPeak: 93.5, memAvg: 52.0, memPeak: 70.1 },
      { 'dt.entity.host': entityId('HOST', 27), name: 'host-eu-09', cpuAvg: 22.9, cpuPeak: 91.0, memAvg: 33.3, memPeak: 49.8 },
      { isTotal: true, hosts: 62, medianCpu: 2.3, under10: 41 },
    ]),
  };
}

/** The sparse estate: no cluster ids and no evidence rows at all ("no analysis slide"). */
export function emptyPrintFixtures(evidenceIds) {
  return {
    'k8s.cluster.ids': table([]),
    ...Object.fromEntries(evidenceIds.map((id) => [id, table([])])),
  };
}
