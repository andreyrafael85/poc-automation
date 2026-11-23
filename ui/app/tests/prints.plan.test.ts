import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ALL_KEYS, entryFor, translate, type StringKey } from '../i18n/strings';
import { getQuery } from '../queries/catalog';
import { CLEAN_QUALITY } from '../queries/grailMetadata';
import { FAILED_REQUESTS_EVIDENCE, FAILED_REQUESTS_PATH, SMARTSCAPE_SERVICES_EVIDENCE, SMARTSCAPE_SERVICES_PATH, entityLinkEvidence } from '../utils/deepLinks';
import type { GrailRecord } from '../utils/records';
import { SHOT_ID } from '../features/wrapup/prints/constants';
import { SCREEN_FALLBACK } from '../features/wrapup/prints/evidence/windows';
import { LINK_CHECK_MAX_AGE_MS, applyLinkChecks, linkStatus, urlTemplateKey } from '../features/wrapup/prints/plan/linkChecks';
import { IDENTITY_KEY, LAYOUTS, LUPA_MAX_PX, defaultFocus, identityFound, resolveAnchors } from '../features/wrapup/prints/plan/pinTemplates';
import {
  NO_OVERRIDES,
  buildShotPlan,
  canonicalPlanJson,
  excessRanking,
  planIdOf,
  problemWindowDays,
  sha256Hex,
  shotId,
  validateCustomUrl,
  type PlanOverrides,
} from '../features/wrapup/prints/plan/planner';
import { matchBatch, suggestedFileName } from '../features/wrapup/prints/capture/match';
import { batchTargets } from '../features/wrapup/prints/ui/CapturePanels';
import { incidentsFromRca, plannerInputsFrom, tenantHostOf, type CatalogRead, type PlannerInputs, type PlannerReads } from '../features/wrapup/prints/plan/usePlannerInputs';
import type { EvidenceQueryResult, LinkCheck, PrintRecord, ShotKind, ShotPlan, ShotSlot } from '../features/wrapup/prints/types';

/**
 * The shot planner (3.2.7, WP2, spec §3): which real screen proves each point, from this PoC's data.
 *
 * The fixture is the validation tenant's P-260914359 (records shaped like the validated rows of the
 * spec's Appendix A: A1 events, A2 callers over W, A10 failing services, the `rca.top` projection
 * and the `k8s.cluster.ids` map). Its first three planned addresses must be byte-identical to the
 * three links the owner sent; ids that the validation did not name (the login and order callers,
 * datadog-agent) are illustrative.
 */

/* eslint-disable noSecrets/no-secrets -- entity ids and platform addresses of the fixture */
const HOST = 'abc12345.apps.dynatrace.com';
const NOW = Date.parse('2026-10-05T18:58:00.000Z');
const EVENT = '1495944828232761706_1790117520000V2';
const ROOT = 'SERVICE-E1990917A56EB6C5'; // TradeManagement (DATABASE_SERVICE)
const ROOT_TWIN = 'SERVICE-1C3BCE85FF1EBCFE'; // a second "TradeManagement" (EKS easytrade-db)
const ETM = 'SERVICE-C44033DE8492CF45'; // easyTradeManager
const LOGIN = 'SERVICE-735D88A54ACBBC95';
const BROKER = 'SERVICE-41A4F03120E830E8';
const ORDER = 'SERVICE-CB326BF8113A8410';
const NGINX = 'SERVICE-8BACD834F8B0945E'; // ":80"
const DATADOG = 'SERVICE-0D0D0D0D0D0D0D0D';
const APP = 'APPLICATION-6331991FD4EFBB24';
const FE = 'FRONTEND-32E311F297817EA0';
const APP2 = 'APPLICATION-1F31F034940B45EF';
const FE2 = 'FRONTEND-1C56BD052D1AD8FF';
const LOAN = 'K8S_CLUSTER-87E7E0B19F2B0431';
const ARD = 'K8S_CLUSTER-53B76CCF6F84D68E';
const HOST_ID = 'HOST-F91F108503DD0BA8';

/** The owner's three links (3.2.6 validation), byte for byte. */
const OWNER_PROBLEM = `https://${HOST}/ui/apps/dynatrace.davis.problems/problem/${EVENT}?from=now%28%29-15d&to=now%28%29&filters=ID+%3D+P-260914359`;
const OWNER_SERVICE = `https://${HOST}/ui/apps/dynatrace.services/explorer/services?perspective=performance&sort=healthIndicators%3Adescending&detailsId=${ETM}&sidebarOpen=false`;
const OWNER_FRONTEND = `https://${HOST}/ui/apps/dynatrace.experience.vitals/performance/web/${FE}`;
/* eslint-enable noSecrets/no-secrets */

const ok = (records: GrailRecord[]): CatalogRead => ({ outcome: 'ok', records });
const evidence = (records: GrailRecord[], outcome: EvidenceQueryResult['outcome'] = 'ok'): EvidenceQueryResult => ({ request: null, outcome, records, quality: CLEAN_QUALITY, readAtIso: null });

function rcaRow(overrides: Partial<Record<string, unknown>> = {}): GrailRecord {
  return {
    displayId: 'P-260914359',
    name: 'Request error rate increase',
    category: 'ERROR',
    status: 'CLOSED',
    severity: 3,
    impact: ['Application', 'Services'],
    affectedNames: ['TradeManagement', ':80', 'frontendreverseproxy-easytrade'],
    affectedTypes: ['dt.entity.service', 'dt.entity.service', 'dt.entity.application'],
    relatedNames: [],
    affectedIds: [ROOT, NGINX, APP],
    relatedIds: [],
    rootCauseName: 'TradeManagement',
    rootCauseId: ROOT,
    eventId: EVENT,
    start: '2026-09-22T22:57:00.000000000Z',
    end: '2026-09-22T23:09:00.000000000Z',
    durationNs: 720_000_000_000,
    affectedCount: 3,
    cluster: ['loan-app-dynakube'],
    namespace: ['easytrade'],
    workload: [],
    description: null,
    ...overrides,
  };
}

const OTHER_INCIDENT = rcaRow({
  displayId: 'P-26100001',
  name: 'Response time degradation',
  category: 'SLOWDOWN',
  eventId: '-7200000000000000001_1790200000000V2',
  rootCauseName: 'BrokerService',
  rootCauseId: BROKER,
  affectedIds: [BROKER],
  start: '2026-09-25T10:00:00.000Z',
  end: '2026-09-25T10:20:00.000Z',
  durationNs: 1_200_000_000_000,
  cluster: [],
});

/** A1: the Davis events of P-260914359 (all written 23:11:55Z) and the problem row. */
const A1: GrailRecord[] = [
  { 'event.id': 'e1', 'event.name': 'Response time degradation', 'event.category': 'SLOWDOWN', 'event.start': '2026-09-22T22:44:00.000Z', writtenAt: '2026-09-22T23:11:55.483Z', source: ROOT, sourceName: 'TradeManagement' },
  { 'event.id': 'e2', 'event.name': 'Failure rate increase', 'event.category': 'ERROR', 'event.start': '2026-09-22T22:44:30.000Z', writtenAt: '2026-09-22T23:11:55.483Z', source: ROOT, sourceName: 'TradeManagement' },
  { 'event.id': 'e3', 'event.name': 'Failure rate increase', 'event.category': 'ERROR', 'event.start': '2026-09-22T22:52:00.000Z', writtenAt: '2026-09-22T23:11:55.483Z', source: NGINX, sourceName: ':80' },
  { 'event.id': 'e4', 'event.name': 'JavaScript error rate increase', 'event.category': 'ERROR', 'event.start': '2026-09-22T22:57:00.000Z', writtenAt: '2026-09-22T23:11:55.483Z', source: APP, sourceName: 'frontendreverseproxy-easytrade' },
  { isProblem: true, users: 52, eventCount: 5, impact: ['Application', 'Services'], problemStatus: 'CLOSED', severity: '3', pStart: '2026-09-22T22:57:00.000Z', pEnd: '2026-09-22T23:09:00.000Z' },
];

/** A2: the callers of TradeManagement over W (22:14–23:24 UTC). */
const A2: GrailRecord[] = [
  { id: ETM, name: 'easyTradeManager', requests: 12_344, failures: 341, rootType: 'DATABASE_SERVICE' },
  { id: LOGIN, name: 'easyTradeLoginService', requests: 782, failures: 14, rootType: 'DATABASE_SERVICE' },
  { id: BROKER, name: 'BrokerService', requests: 2_304, failures: 4, rootType: 'DATABASE_SERVICE' },
  { id: ORDER, name: 'OrderController', requests: 389, failures: 1, rootType: 'DATABASE_SERVICE' },
];

/** A10: services over 24 h; env 6,905,550 / 1,900. datadog-agent has more raw failures, BrokerService the larger excess. */
const A10: GrailRecord[] = [
  { name: 'datadog-agent', serviceId: DATADOG, totalRequests: 373_850, totalFailures: 247, failureRatePct: 0.066 },
  { name: 'BrokerService', serviceId: BROKER, totalRequests: 78_818, totalFailures: 218, failureRatePct: 0.2766 },
  { name: 'TradeManagement', serviceId: ROOT, totalRequests: 52_000, totalFailures: 12, failureRatePct: 0.023 },
  { name: 'TradeManagement', serviceId: ROOT_TWIN, totalRequests: 40_000, totalFailures: 40, failureRatePct: 0.1 },
  { name: 'tiny', serviceId: 'SERVICE-0000000000000001', totalRequests: 100, totalFailures: 50, failureRatePct: 50 },
];
const A10_TOTALS: GrailRecord[] = [{ totalRequests: 6_905_550, totalFailures: 1_900, failureRatePct: 0.0275 }];

const FRONTEND_IDS: GrailRecord[] = [
  { 'frontend.name': 'www.easytravel.com', applicationId: APP2, frontendId: FE2, requests: 90_000 },
  { 'frontend.name': 'frontendreverseproxy-easytrade', applicationId: APP, frontendId: FE, requests: 45_000 },
];

/** The `k8s.cluster.ids` map (validated 2026-10-05, 6 rows; two shown). */
const CLUSTER_IDS: GrailRecord[] = [
  { clusterName: 'ard-dynatrace-gcp-monitor', clusterId: ARD },
  { clusterName: 'loan-app-dynakube', clusterId: LOAN },
];

const PRESSURE: GrailRecord[] = [{ workload: 'sqs-demo', cluster: 'loan-app-dynakube', totalOom: 252, throttledAvg: 85.8, throttledPct: 17.2 }];
const POSTURE: GrailRecord[] = [
  { level: 'CRITICAL', technology: 'JAVA', vulnerabilities: 4, actNow: 1, exploitable: 2, publicExposed: 2, inUse: 3, exploitPublic: 1, exploitInUse: 1, publicInUse: 1 },
  { level: 'HIGH', technology: 'JAVA', vulnerabilities: 10, actNow: 0, exploitable: 1, publicExposed: 0, inUse: 2, exploitPublic: 0, exploitInUse: 0, publicInUse: 0 },
];
const CAPACITY: GrailRecord[] = [
  { hostId: HOST_ID, name: 'ag-env-public-br.internal.cloudapp.net', avgCpuPct: 40, maxCpuPct: 97, avgMemPct: 60, maxMemPct: 95, memBytes: 8e9, memUsedBytes: 4.8e9, memHeadroomBytes: 0.4e9, cores: 4 },
  { hostId: 'HOST-0000000000000002', name: 'quiet-host', avgCpuPct: 3, maxCpuPct: 9, avgMemPct: 20, maxMemPct: 25, memBytes: 16e9, memUsedBytes: 3.2e9, memHeadroomBytes: 12e9, cores: 8 },
];

const W = { kind: 'incident' as const, startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z', source: 'derived' as const, minutes: 70 };

function reads(overrides: Partial<PlannerReads> = {}): PlannerReads {
  return {
    tenantHost: HOST,
    rcaTop: ok([rcaRow(), OTHER_INCIDENT]),
    preferredIncident: null,
    problemEvents: evidence(A1),
    callers: evidence(A2),
    incidentWindow: W,
    frontendIds: ok(FRONTEND_IDS),
    svcRanking: ok(A10),
    svcTotals: ok(A10_TOTALS),
    clusterIds: ok(CLUSTER_IDS),
    k8sPressure: ok(PRESSURE),
    posture: ok(POSTURE),
    capacity: ok(CAPACITY),
    globalWindowLabel: 'last 24 hours',
    locale: 'en',
    timeZone: 'UTC',
    now: NOW,
    ...overrides,
  };
}

const inputs = (overrides: Partial<PlannerReads> = {}): PlannerInputs => plannerInputsFrom(reads(overrides));
const plan = (overrides: Partial<PlannerReads> = {}, checks: readonly LinkCheck[] = [], planOverrides: Partial<PlanOverrides> = {}): ShotPlan =>
  buildShotPlan(inputs(overrides), checks, { ...NO_OVERRIDES, ...planOverrides });
const slotOf = (shotPlan: ShotPlan, kind: ShotKind): ShotSlot => {
  const slot = shotPlan.slots.find((item) => item.kind === kind);
  if (slot === undefined) throw new Error(`no ${kind} slot`);
  return slot;
};
const whyText = (slot: ShotSlot) => (slot.chosen === null ? '' : translate(slot.chosen.why.key, 'en', slot.chosen.why.params));
const check = (templateKey: string, status: LinkCheck['status'], checkedAtIso = '2026-10-04T12:00:00.000Z'): LinkCheck => ({ templateKey, status, finalAppId: null, checkedAtIso, companionVersion: '1.1.0' });

describe('the P-260914359 plan (spec §3.7)', () => {
  const shotPlan = plan();

  it('emits the owner’s three links byte for byte as slots 1–3', () => {
    expect(shotPlan.slots.slice(0, 3).map((slot) => slot.chosen?.url)).toEqual([OWNER_PROBLEM, OWNER_SERVICE, OWNER_FRONTEND]);
    expect(shotPlan.slots.slice(0, 3).map((slot) => slot.id)).toEqual(['problem--p-260914359', 'root-cause--service-c44033de8492cf45', 'frontend--frontend-32e311f297817ea0']);
  });

  it('shows the database root through its top failing caller, with the numbers and window of W', () => {
    const root = slotOf(shotPlan, 'root-cause');
    expect(root.subject).toEqual({ kind: 'service', serviceId: ETM, role: 'root-caller' });
    expect(whyText(root)).toBe(
      'TradeManagement is a database with no page of its own: this screen shows easyTradeManager, its top failing caller — 341 failures in 12,344 requests, 94.7% of all callers\' failures (22/09 22:14–23:24 UTC).',
    );
    expect(root.alternates.map((item) => item.entityId)).toEqual([LOGIN, BROKER, ORDER]);
    expect(root.alternates.every((item) => item.why.key === 'prt.why.rootDb.other')).toBe(true);
    // The title names the root cause (the database), never the caller whose page shows it.
    expect(translate(root.titleText.key, 'en', root.titleText.params)).toBe('Root cause · TradeManagement');
  });

  it('plans every slot in deck order, with the K8s, failing-service, logs and vulnerability addresses of §3.7', () => {
    expect(shotPlan.slots.map((slot) => slot.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    /* eslint-disable noSecrets/no-secrets */
    expect(slotOf(shotPlan, 'k8s-cluster').chosen?.url).toBe(
      `https://${HOST}/ui/apps/dynatrace.kubernetes/smartscape/K8S_CLUSTER?perspective=Health&sort=healthIndicators%3Adescending&detailsId=${LOAN}&sidebarOpen=false`,
    );
    expect(slotOf(shotPlan, 'failing-service').chosen?.url).toBe(
      `https://${HOST}/ui/apps/dynatrace.services/explorer/services?perspective=performance&sort=healthIndicators%3Adescending&detailsId=${BROKER}&sidebarOpen=false`,
    );
    expect(slotOf(shotPlan, 'logs-errors').chosen?.url).toBe(
      `https://${HOST}/ui/apps/dynatrace.logs/#%7B%22version%22%3A2%2C%22dt.timeframe%22%3A%7B%22from%22%3A%22now()-2h%22%2C%22to%22%3A%22now()%22%7D%2C%22tableConfig%22%3A%7B%22columns%22%3A%5B%22timestamp%22%2C%22status%22%2C%22Log%20message%22%5D%7D%2C%22analysisMode%22%3A%22logs%22%2C%22showDqlEditor%22%3Afalse%2C%22filterFieldQuery%22%3A%22status%20%3D%20ERROR%22%7D`,
    );
    expect(slotOf(shotPlan, 'smartscape').chosen?.url).toBe(`https://${HOST}/ui/apps/dynatrace.smartscape/view/dynatrace.smartscape.service-overview#from=now%28%29-2h&to=now%28%29&layout=force`);
    expect(slotOf(shotPlan, 'failed-requests').chosen?.url).toBe(`https://${HOST}/ui/apps/dynatrace.distributedtracing/explorer?v=requests&filter=request.is_failed+%3D+Failure`);
    expect(slotOf(shotPlan, 'vulnerabilities').chosen?.url).toBe(
      `https://${HOST}/ui/apps/dynatrace.security.vulnerabilities/vulnerabilities?filter=&pageSize=20&pageIndex=0&sort=dynatraceSecurityScore%3Adesc&from=now-30m&to=now`,
    );
    /* eslint-enable noSecrets/no-secrets */
    expect(shotPlan.slots.map((slot) => slot.id)).toEqual([
      'problem--p-260914359',
      'root-cause--service-c44033de8492cf45',
      'frontend--frontend-32e311f297817ea0',
      'k8s-cluster--k8s_cluster-87e7e0b19f2b0431',
      'failing-service--service-41a4f03120e830e8',
      'failed-requests--list',
      'logs-errors--status-error-2h',
      'smartscape--service-overview',
      'vulnerabilities--list',
    ]);
  });

  it('puts 1, 2, 3, 4, 5, 7 and 9 in the default batch; 6 and 8 are probe only', () => {
    expect(shotPlan.slots.filter((slot) => slot.included).map((slot) => slot.order)).toEqual([1, 2, 3, 4, 5, 7, 9]);
    expect(shotPlan.slots.filter((slot) => slot.probeOnly).map((slot) => slot.order)).toEqual([6, 8]);
  });

  it('writes the why-lines with their windows and the slot titles as dictionary keys', () => {
    expect(whyText(slotOf(shotPlan, 'problem'))).toBe(
      'P-260914359 “Request error rate increase”: the most impactful problem with a root cause in 15 days — root cause TradeManagement, 3 affected entities, lasted 12 min.',
    );
    expect(whyText(slotOf(shotPlan, 'frontend'))).toBe('frontendreverseproxy-easytrade: the frontend affected by P-260914359.');
    expect(whyText(slotOf(shotPlan, 'k8s-cluster'))).toBe('loan-app-dynakube: the cluster where P-260914359 happened.');
    expect(whyText(slotOf(shotPlan, 'vulnerabilities'))).toBe('14 open vulnerabilities, 4 critical, 1 to act on now (last 30 minutes).');
    expect(whyText(slotOf(shotPlan, 'smartscape'))).toBe('The topology discovered automatically, with the path to TradeManagement.');
    for (const slot of shotPlan.slots) {
      expect(ALL_KEYS).toContain(slot.titleText.key);
      if (slot.chosen !== null) expect(ALL_KEYS).toContain(slot.chosen.why.key);
    }
  });

  it('formats the why-line numbers in Portuguese for a pt-BR plan', () => {
    const pt = plan({ locale: 'pt-BR' });
    const root = slotOf(pt, 'root-cause');
    expect(translate(root.chosen?.why.key as StringKey, 'pt-BR', root.chosen?.why.params)).toContain('341 falhas em 12.344 requisições, 94,7 % das falhas');
  });

  it('carries the identity anchor and the pin labels the companion must find, facts resolved', () => {
    const problem = slotOf(shotPlan, 'problem');
    expect(problem.anchors[0]).toEqual({ key: IDENTITY_KEY, match: ['P-260914359'] });
    expect(problem.anchors).toContainEqual({ key: 'users', match: ['Users'] });
    expect(problem.anchors).toContainEqual({ key: 'frontend', match: ['frontendreverseproxy-easytrade'] });
    // The first B1 event on the root (22:44), never a time from event.id.
    expect(problem.anchors).toContainEqual({ key: 'signals', match: ['Response time degradation'] });
    expect(slotOf(shotPlan, 'root-cause').anchors[0]).toEqual({ key: IDENTITY_KEY, match: ['easyTradeManager'] });
    expect(slotOf(shotPlan, 'k8s-cluster').anchors).toContainEqual({ key: IDENTITY_KEY, match: ['loan-app-dynakube'] });
    // The hub is known only once the print exists: its anchor is not sent.
    expect(slotOf(shotPlan, 'smartscape').anchors.map((anchor) => anchor.key)).not.toContain('hub');
    expect(slotOf(shotPlan, 'smartscape').anchors).toContainEqual({ key: 'root', match: ['TradeManagement'] });
  });

  it('keeps the incident snapshot on the incident-bound slots only', () => {
    expect(slotOf(shotPlan, 'problem').incident?.displayId).toBe('P-260914359');
    expect(slotOf(shotPlan, 'frontend').subject).toEqual({ kind: 'frontend', frontendId: FE, applicationId: APP, incidentBound: true });
    expect(slotOf(shotPlan, 'failing-service').incident).toBeNull();
    expect(shotPlan.incident?.eventId).toBe(EVENT);
  });

  it('widens the problem link only once the problem is older than 13 days', () => {
    expect(problemWindowDays('2026-09-22T22:57:00Z', NOW)).toBe(15);
    expect(problemWindowDays('2026-09-22T22:57:00Z', Date.parse('2026-10-06T12:00:00Z'))).toBe(16);
    expect(problemWindowDays('2026-08-01T00:00:00Z', NOW)).toBe(30);
  });
});

describe('the root-cause slot by root type', () => {
  it('shows a non-database service root itself', () => {
    const callers = evidence(A2.map((row) => ({ ...row, rootType: 'WEB_REQUEST_SERVICE' })));
    const root = slotOf(plan({ callers }), 'root-cause');
    expect(root.chosen?.entityId).toBe(ROOT);
    expect(root.subject).toEqual({ kind: 'service', serviceId: ROOT, role: 'root' });
    expect(whyText(root)).toBe('The root cause Dynatrace Intelligence named for P-260914359: TradeManagement.');
  });

  it('falls back to the root service when its callers could not be read', () => {
    const root = slotOf(plan({ callers: evidence([], 'error') }), 'root-cause');
    expect(root.chosen?.entityId).toBe(ROOT);
  });

  it('turns a host root into a documented, probe-only host slot', () => {
    const shotPlan = plan({ rcaTop: ok([rcaRow({ rootCauseId: HOST_ID, rootCauseName: 'ag-env-public-br.internal.cloudapp.net' })]), callers: evidence([], 'disabled') });
    expect(slotOf(shotPlan, 'root-cause').omittedReason).toBe('prt.why.none.dedup');
    const host = slotOf(shotPlan, 'host');
    expect(host.chosen?.evidence).toBe('documented');
    expect(host.probeOnly).toBe(true);
    expect(host.included).toBe(false);
    expect(host.chosen?.url).toBe(`https://${HOST}/ui/intent/dynatrace.infraops/view_host#%7B%22dt.entity.host%22%3A%22${HOST_ID}%22%7D`);
    expect(host.incident?.displayId).toBe('P-260914359');
  });

  it('omits a root without a verified page (a queue) with noPage', () => {
    const shotPlan = plan({ rcaTop: ok([rcaRow({ rootCauseId: 'QUEUE-0000000000000001', rootCauseName: 'orders' })]) });
    expect(slotOf(shotPlan, 'root-cause').chosen).toBeNull();
    expect(slotOf(shotPlan, 'root-cause').omittedReason).toBe('prt.why.none.noPage');
  });
});

describe('ids, not names', () => {
  it('never merges two services that share a name', () => {
    const { rows } = excessRanking(inputs().services, inputs().svcTotals);
    const twins = rows.filter((row) => row.name === 'TradeManagement').map((row) => row.id);
    expect(twins).toEqual([ROOT_TWIN]); // ROOT fails less than the environment rate; the twin is its own row
    const failing = slotOf(plan(), 'failing-service');
    expect(failing.alternates.map((item) => item.entityId)).toEqual([DATADOG, ROOT_TWIN]);
  });

  it('takes the next candidate when the top excess is already the root-cause screen', () => {
    const ranking = ok([...A10, { name: 'easyTradeManager', serviceId: ETM, totalRequests: 12_344, totalFailures: 2_000, failureRatePct: 16.2 }]);
    const shotPlan = plan({ svcRanking: ranking });
    expect(slotOf(shotPlan, 'root-cause').chosen?.entityId).toBe(ETM);
    const failing = slotOf(shotPlan, 'failing-service');
    expect(failing.chosen?.entityId).toBe(BROKER);
    expect(failing.alternates.map((item) => item.entityId)).not.toContain(ETM);
    // BrokerService is second in the ranking here: neither its title nor its why-line may call it the largest excess.
    expect(failing.titleText).toEqual({ key: 'prt.title.failing.other', params: { name: 'BrokerService' } });
    expect(failing.chosen?.why.key).toBe('prt.why.failing.other');
    expect(slotOf(plan(), 'failing-service').titleText.key).toBe('prt.title.failing');
  });

  it('omits a slot whose only candidate another slot already shows', () => {
    const ranking = ok([{ name: 'easyTradeManager', serviceId: ETM, totalRequests: 12_344, totalFailures: 2_000, failureRatePct: 16.2 }]);
    const failing = slotOf(plan({ svcRanking: ranking }), 'failing-service');
    expect(failing.chosen).toBeNull();
    expect(failing.omittedReason).toBe('prt.why.none.dedup');
  });

  it('re-centres on the SE’s preferred incident by display id', () => {
    const { incident, others, topId } = incidentsFromRca([rcaRow(), OTHER_INCIDENT], 'P-26100001');
    expect(incident?.displayId).toBe('P-26100001');
    expect(others.map((item) => item.displayId)).toEqual(['P-260914359']);
    expect(topId).toBe('P-260914359');
    // The preferred problem is not "the most impactful"; the most impactful one, now an alternate, still is.
    const problem = slotOf(plan({ preferredIncident: 'P-26100001' }), 'problem');
    expect(problem.chosen?.entityId).toBe('P-26100001');
    expect(problem.chosen?.why.key).toBe('prt.why.problem.other');
    expect(problem.alternates[0]).toMatchObject({ entityId: 'P-260914359', why: { key: 'prt.why.problem' } });
  });

  it('titles a slot with no screen chosen without a dangling dash (3.2.7 review UX-L7)', () => {
    const sparse = plan({ rcaTop: ok([]), svcRanking: ok([]), svcTotals: ok([]), frontendIds: ok([]), clusterIds: ok([]), k8sPressure: ok([]), capacity: ok([]) }, [], { hostOptIn: true });
    const empty = sparse.slots.filter((slot) => slot.chosen === null);
    expect(empty.map((slot) => slot.kind)).toEqual(expect.arrayContaining(['problem', 'root-cause', 'frontend', 'k8s-cluster', 'failing-service', 'host']));
    for (const slot of empty) {
      for (const locale of ['en', 'pt-BR'] as const) expect(translate(slot.titleText.key, locale, slot.titleText.params)).not.toMatch(/—/);
    }
    const ptTitle = (kind: ShotKind) => {
      const slot = slotOf(sparse, kind);
      return translate(slot.titleText.key, 'pt-BR', slot.titleText.params);
    };
    expect((['problem', 'root-cause', 'k8s-cluster', 'frontend', 'failing-service', 'host'] as const).map(ptTitle)).toEqual([
      'Problema',
      'Causa raiz',
      'Kubernetes',
      'Experiência do usuário',
      'Serviço com mais falhas em excesso',
      'Host',
    ]);
  });

  it('says "open for", never "lasted", for a problem still open (3.2.7 review UX-L2)', () => {
    // ACTIVE on the tenant: `event.end` is null, and rca.top's durationNs is `now() - event.start`.
    const active = rcaRow({ status: 'ACTIVE', end: null, durationNs: 25_920_000_000_000 });
    const problem = slotOf(plan({ rcaTop: ok([active, OTHER_INCIDENT]) }), 'problem');
    expect(problem.chosen?.why.key).toBe('prt.why.problem.open');
    expect(whyText(problem)).toContain('open for 7.2 h');
    expect(translate('prt.why.problem.open', 'pt-BR', problem.chosen?.why.params ?? {})).toContain('aberto há 7.2 h');
    // With no duration read, the open time runs from the start to now (13 days).
    const noDuration = slotOf(plan({ rcaTop: ok([rcaRow({ status: 'ACTIVE', end: null, durationNs: null }), OTHER_INCIDENT]) }), 'problem');
    expect(whyText(noDuration)).toContain('open for 13 d');
    // An open alternate gets the alternate's own "open" line; a closed one keeps "lasted".
    const recentred = slotOf(plan({ rcaTop: ok([rcaRow(), rcaRow({ ...OTHER_INCIDENT, end: null })]), preferredIncident: 'P-26100001' }), 'problem');
    expect(recentred.chosen?.why.key).toBe('prt.why.problem.other.open');
    expect(recentred.alternates[0]?.why.key).toBe('prt.why.problem');
    expect(whyText(slotOf(plan(), 'problem'))).toContain('lasted 12 min');
  });

  it('never reads a time from the event id: the window comes from the snapshot', () => {
    const { incident } = incidentsFromRca([rcaRow()]);
    expect(incident?.startIso).toBe('2026-09-22T22:57:00.000000000Z');
    expect(incident?.eventId).toBe(EVENT);
  });
});

describe('k8s.cluster.ids', () => {
  it('maps loan-app-dynakube to K8S_CLUSTER-87E7E0B19F2B0431', () => {
    expect(inputs().clusterIds.get('loan-app-dynakube')).toBe(LOAN);
    expect(slotOf(plan(), 'k8s-cluster').subject).toEqual({ kind: 'k8s-cluster', clusterId: LOAN, clusterName: 'loan-app-dynakube', incidentBound: true });
  });

  it('keeps the second id of a name as an alternate', () => {
    const second = 'K8S_CLUSTER-0000000000000002';
    const shotPlan = plan({ clusterIds: ok([...CLUSTER_IDS, { clusterName: 'loan-app-dynakube', clusterId: second }]) });
    const k8s = slotOf(shotPlan, 'k8s-cluster');
    expect(k8s.chosen?.entityId).toBe(LOAN);
    expect(k8s.alternates.map((item) => item.entityId)).toContain(second);
  });

  it('falls back to the cluster under the most pressure without an incident', () => {
    const k8s = slotOf(plan({ rcaTop: ok([]) }), 'k8s-cluster');
    expect(k8s.chosen?.entityId).toBe(LOAN);
    expect(whyText(k8s)).toBe('loan-app-dynakube: cluster of sqs-demo, with 252 OOM kills.');
  });

  it('is the catalog entry of §3.3: no limit, metrics scope, smartscape id through toString()', () => {
    const entry = getQuery('k8s.cluster.ids');
    expect(entry.requiredScope).toBe('storage:metrics:read');
    expect(entry.dql).not.toMatch(/\blimit\b/);
    expect(entry.dql).toContain('toString(dt.smartscape.k8s_cluster)');
    expect(entryFor('catalog.purpose.k8s.cluster.ids').en).toBe(entry.purpose);
  });
});

describe('the failing service by excess failures (A10)', () => {
  it('picks BrokerService over datadog-agent, which has more raw failures', () => {
    const failing = slotOf(plan(), 'failing-service');
    expect(failing.chosen?.entityId).toBe(BROKER);
    expect(whyText(failing)).toBe('BrokerService: the largest excess of failures — 218 in 78,818 requests (0.28%), 10× the environment rate (last 24 hours).');
    const { rows } = excessRanking(inputs().services, inputs().svcTotals);
    expect(Math.round(rows[0]?.excess ?? 0)).toBe(196);
    expect(Math.round(rows[1]?.excess ?? 0)).toBe(144);
  });

  it('ignores a service under 500 requests, whatever its rate', () => {
    expect(excessRanking(inputs().services, inputs().svcTotals).rows.map((row) => row.id)).not.toContain('SERVICE-0000000000000001');
  });

  it('honours the SE’s swap, keyed by kind or by the default slot id', () => {
    expect(slotOf(plan({}, [], { swapped: { 'failing-service': DATADOG } }), 'failing-service').chosen?.entityId).toBe(DATADOG);
    expect(slotOf(plan({}, [], { swapped: { 'failing-service--service-41a4f03120e830e8': DATADOG } }), 'failing-service').id).toBe('failing-service--service-0d0d0d0d0d0d0d0d');
  });

  it('says noPermission, not noData, when the ranking is refused', () => {
    const failing = slotOf(plan({ svcRanking: { outcome: 'no-permission', records: [] } }), 'failing-service');
    expect(failing.omittedReason).toBe('prt.why.none.noPermission');
  });
});

describe('link evidence levels', () => {
  it('marks the failed-requests and smartscape addresses observed', () => {
    expect(FAILED_REQUESTS_EVIDENCE).toBe('observed');
    expect(SMARTSCAPE_SERVICES_EVIDENCE).toBe('observed');
    // Output strings unchanged; entity links keep their levels.
    expect(FAILED_REQUESTS_PATH).toBe('dynatrace.distributedtracing/explorer?v=requests&filter=request.is_failed+%3D+Failure');
    expect(SMARTSCAPE_SERVICES_PATH).toBe('dynatrace.smartscape/view/dynatrace.smartscape.service-overview#from=now%28%29-2h&to=now%28%29&layout=force');
    expect(entityLinkEvidence(ETM)).toBe('verified');
    for (const kind of ['failed-requests', 'smartscape'] as const) {
      const slot = slotOf(plan(), kind);
      expect(slot.chosen?.evidence).toBe('observed');
      expect(slot.probeOnly).toBe(true);
      expect(slot.included).toBe(false);
    }
  });

  it('upgrades an observed shape that a probe opened fine here, and includes it', () => {
    const key = slotOf(plan(), 'failed-requests').urlTemplateKey;
    const slot = slotOf(plan({}, [check(key, 'ok')]), 'failed-requests');
    expect(slot.chosen?.evidence).toBe('verified');
    expect(slot.probeOnly).toBe(false);
    expect(slot.included).toBe(true);
    expect(linkStatus('observed', key, [check(key, 'ok')], NOW)).toMatchObject({ effect: 'upgraded', check: { checkedAtIso: '2026-10-04T12:00:00.000Z' } });
  });

  it('takes a verified shape out when the probe landed elsewhere', () => {
    const key = slotOf(plan(), 'root-cause').urlTemplateKey;
    expect(key).toBe('service:/ui/apps/dynatrace.services/explorer/services?detailsId={ID}&perspective&sidebarOpen&sort');
    const shotPlan = plan({}, [check(key, 'unresolved_link')]);
    const root = slotOf(shotPlan, 'root-cause');
    expect(root.omittedReason).toBe('prt.why.none.probeFailed');
    expect(root.chosen).toBeNull();
    expect(root.included).toBe(false);
    // One shape: the failing service's page went with it.
    expect(slotOf(shotPlan, 'failing-service').omittedReason).toBe('prt.why.none.probeFailed');
  });

  it('counts a probe imported after the plan was computed (the plan’s clock is read once per session)', () => {
    const key = slotOf(plan(), 'smartscape').urlTemplateKey;
    const later = new Date(NOW + 3 * 60 * 60 * 1000).toISOString();
    const slot = slotOf(plan({}, [check(key, 'ok', later)]), 'smartscape');
    expect(slot.chosen?.evidence).toBe('verified');
    expect(slot.included).toBe(true);
    const rootKey = slotOf(plan(), 'root-cause').urlTemplateKey;
    expect(slotOf(plan({}, [check(rootKey, 'unresolved_link', later)]), 'root-cause').omittedReason).toBe('prt.why.none.probeFailed');
    // A date far in the future is a bad clock, not a fresh check.
    const farFuture = new Date(NOW + LINK_CHECK_MAX_AGE_MS + 60_000).toISOString();
    expect(slotOf(plan({}, [check(key, 'ok', farFuture)]), 'smartscape').probeOnly).toBe(true);
  });

  it('ignores inconclusive and month-old checks', () => {
    const key = slotOf(plan(), 'failed-requests').urlTemplateKey;
    const old = new Date(NOW - LINK_CHECK_MAX_AGE_MS - 60_000).toISOString();
    expect(slotOf(plan({}, [check(key, 'ok', old)]), 'failed-requests').probeOnly).toBe(true);
    expect(slotOf(plan({}, [check(key, 'session_lost')]), 'failed-requests').probeOnly).toBe(true);
    const rootKey = slotOf(plan(), 'root-cause').urlTemplateKey;
    expect(slotOf(plan({}, [check(rootKey, 'error')]), 'root-cause').included).toBe(true);
  });

  it('lets the SE include a probe-only slot anyway, and leave any slot out', () => {
    const forced = slotOf(plan({}, [], { forced: ['smartscape--service-overview'] }), 'smartscape');
    expect(forced.forced).toBe(true);
    expect(forced.included).toBe(true);
    const excluded = slotOf(plan({}, [], { excluded: ['problem--p-260914359'] }), 'problem');
    expect(excluded.included).toBe(false);
    // A forced flag on a verified slot changes nothing.
    expect(slotOf(plan({}, [], { forced: ['problem--p-260914359'] }), 'problem').forced).toBe(false);
  });

  it('applyLinkChecks leaves the SE’s own screens alone', () => {
    const custom = plan({}, [], { custom: [customShot(`https://${HOST}/ui/apps/dynatrace.notebooks/notebook/abc`)] }).slots.find((slot) => slot.kind === 'custom');
    expect(custom).toBeDefined();
    if (custom !== undefined) expect(applyLinkChecks(custom, [check(custom.urlTemplateKey, 'unresolved_link')], NOW)).toMatchObject({ included: true, omittedReason: null });
  });
});

describe('addresses', () => {
  it('never emits /ui/entity/ nor an intent without its id', () => {
    const shotPlan = plan({}, [], { hostOptIn: true });
    const urls = shotPlan.slots.flatMap((slot) => [slot.chosen, ...slot.alternates].flatMap((item) => (item === null ? [] : [item.url])));
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) {
      const { pathname } = new URL(url);
      expect(pathname.startsWith('/ui/entity/')).toBe(false);
      if (pathname.startsWith('/ui/intent/')) expect(pathname).toMatch(/^\/ui\/intent\/[a-z0-9.]+\/[A-Za-z0-9_.-]+$/);
      expect(new URL(url).host).toBe(HOST);
    }
  });

  it('opens a frontend without a FRONTEND mapping through the verified APPLICATION intent', () => {
    const frontend = slotOf(plan({ frontendIds: ok([]) }), 'frontend');
    expect(frontend.chosen?.url).toBe(`https://${HOST}/ui/apps/dynatrace.experience.vitals/intent/view-pages-views-waterfall#%7B%22frontend%22%3A%22${APP}%22%7D`);
    expect(frontend.chosen?.evidence).toBe('verified');
  });

  it('plans the busiest frontend without an incident', () => {
    const shotPlan = plan({ rcaTop: ok([]) });
    expect(slotOf(shotPlan, 'problem').omittedReason).toBe('prt.why.none.noIncident');
    expect(slotOf(shotPlan, 'root-cause').omittedReason).toBe('prt.why.none.noIncident');
    const frontend = slotOf(shotPlan, 'frontend');
    expect(frontend.chosen?.entityId).toBe(FE2);
    expect(whyText(frontend)).toBe('www.easytravel.com: the frontend with the most traffic, 90,000 requests in 7 days.');
    expect(frontend.subject).toMatchObject({ incidentBound: false });
    expect(whyText(slotOf(shotPlan, 'smartscape'))).toBe('The topology discovered automatically, with no manual configuration.');
  });

  it('gates vulnerabilities on the app’s own posture read', () => {
    expect(slotOf(plan({ posture: { outcome: 'no-permission', records: [] } }), 'vulnerabilities').omittedReason).toBe('prt.why.none.noPermission');
    expect(slotOf(plan({ posture: ok([]) }), 'vulnerabilities').omittedReason).toBe('prt.why.none.noData');
  });

  it('lists the host only on request, worst host first', () => {
    expect(plan().slots.some((slot) => slot.kind === 'host')).toBe(false);
    const host = slotOf(plan({}, [], { hostOptIn: true }), 'host');
    expect(host.chosen?.entityId).toBe(HOST_ID);
    expect(host.probeOnly).toBe(true);
    expect(whyText(host)).toBe('ag-env-public-br.internal.cloudapp.net: the host with the least headroom — CPU peak 97%, memory peak 95%.');
  });
});

describe('the batch targets (3.3.2, the shot list’s successor)', () => {
  const shotPlan = plan({}, [], { hostOptIn: true, custom: [customShot(`https://${HOST}/ui/apps/dynatrace.notebooks/notebook/abc`)] });

  it('offers the included screens, numbered as the plan numbers them, with both titles and the app as terms', () => {
    const targets = batchTargets(shotPlan, new Map());
    const included = shotPlan.slots.filter((slot) => slot.included && slot.chosen !== null);
    expect(targets.map((target) => target.slotId)).toEqual(included.map((slot) => slot.id));
    for (const target of targets) expect(shotPlan.slots[target.position - 1]?.id).toBe(target.slotId);
    const problem = targets.find((target) => target.slotId === 'problem--p-260914359');
    expect(problem?.terms).toEqual(expect.arrayContaining(['Problem P-260914359', 'dynatrace.davis.problems', 'problem']));
    expect(targets.every((target) => !target.hasPrint)).toBe(true);
  });

  it('marks the screens that already have a print', () => {
    const printsBySlot = new Map<string, PrintRecord>([['problem--p-260914359', { slotId: 'problem--p-260914359' } as PrintRecord]]);
    expect(batchTargets(shotPlan, printsBySlot).find((target) => target.slotId === 'problem--p-260914359')?.hasPrint).toBe(true);
  });

  it('reads back, with high confidence, the file name it offers for every screen', () => {
    const targets = batchTargets(shotPlan, new Map());
    const images = [...targets].reverse().map((target, index) => ({
      key: `k${index}`,
      name: suggestedFileName(target.position, target.slotId),
      lastModified: null,
      sha256: `sha-${index}`,
      width: 1920,
      height: 1080,
    }));
    const proposals = matchBatch(images, targets);
    for (const [index, proposal] of proposals.entries()) {
      const target = [...targets].reverse()[index]!;
      expect(proposal).toMatchObject({ slotId: target.slotId, confidence: 'high' });
    }
  });
});

describe('plan id and shot ids', () => {
  it('is stable under slot reordering and equals the crypto.subtle digest', async () => {
    const shotPlan = plan();
    const reversed = [...shotPlan.slots].reverse();
    expect(canonicalPlanJson(HOST, reversed)).toBe(canonicalPlanJson(HOST, shotPlan.slots));
    expect(await planIdOf(HOST, reversed)).toBe(shotPlan.planId);
    expect(shotPlan.planId).toMatch(/^[0-9a-f]{12}$/);
    // Ticking a slot in or out does not move it.
    expect(plan({}, [], { excluded: ['problem--p-260914359'] }).planId).toBe(shotPlan.planId);
    // Another screen does.
    expect(plan({}, [], { swapped: { 'failing-service': DATADOG } }).planId).not.toBe(shotPlan.planId);
  });

  it('computes SHA-256 synchronously, as node does', () => {
    for (const sample of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'Tela não verificada · ‹host› 🙂', 'x'.repeat(1000)]) {
      expect(sha256Hex(sample)).toBe(createHash('sha256').update(sample, 'utf8').digest('hex'));
    }
  });

  it('builds ids of the shot-id pattern', () => {
    expect(shotId('k8s-cluster', LOAN)).toBe('k8s-cluster--k8s_cluster-87e7e0b19f2b0431');
    expect(shotId('custom', '')).toBe('custom--none');
    for (const slot of plan({}, [], { hostOptIn: true }).slots) {
      expect(slot.id).toMatch(SHOT_ID);
    }
  });

  it('blanks the ids of an address shape', () => {
    expect(urlTemplateKey('problem', OWNER_PROBLEM)).toBe('problem:/ui/apps/dynatrace.davis.problems/problem/{ID}?filters=ID = {ID}&from&to');
    expect(urlTemplateKey('frontend', OWNER_FRONTEND)).toBe('frontend:/ui/apps/dynatrace.experience.vitals/performance/web/{ID}');
    expect(urlTemplateKey('failing-service', OWNER_SERVICE)).toBe(urlTemplateKey('root-cause', OWNER_SERVICE));
  });
});

function customShot(url: string, title = 'Notebook'): PlanOverrides['custom'][number] {
  return { url, titleText: { key: 'prt.title.custom', params: { title } }, titleRaw: title, layout: 'free' };
}

describe('custom addresses', () => {
  const base = `https://${HOST}/ui/apps`;

  it.each([
    ['another host', `https://xyz98765.apps.dynatrace.com/ui/apps/dynatrace.notebooks/notebook/1`, 'prt.err.customUrl'],
    ['http', `http://${HOST}/ui/apps/dynatrace.notebooks/notebook/1`, 'prt.err.customUrl'],
    ['/ui/entity/', `https://${HOST}/ui/entity/SERVICE-C44033DE8492CF45`, 'prt.err.customUrl'],
    ['an intent without its id', `https://${HOST}/ui/intent/dynatrace.infraops`, 'prt.err.customUrl'],
    ['not a /ui/ page', `https://${HOST}/platform/document/v1/documents`, 'prt.err.customUrl'],
    ['credentials', `https://user:secret@${HOST}/ui/apps/dynatrace.notebooks/notebook/1`, 'prt.err.customUrl'],
    ['longer than 2048', `${base}/dynatrace.notebooks/notebook/${'a'.repeat(2048)}`, 'prt.err.customUrl'],
    ['licensing', `${base}/dynatrace.account.management/licensing`, 'prt.err.commercial'],
    ['billing', `${base}/dynatrace.hub/billing`, 'prt.err.commercial'],
    ['cost', `${base}/dynatrace.notebooks/#cost-overview`, 'prt.err.commercial'],
    ['consumption', `${base}/dynatrace.classic.consumption/overview`, 'prt.err.commercial'],
    ['DPS', `${base}/dynatrace.notebooks/%20DPS%20`, 'prt.err.commercial'],
  ])('refuses %s', (_name, url, reason) => {
    expect(validateCustomUrl(url, HOST)).toEqual({ ok: false, reason });
  });

  it('accepts a page of this tenant, and plans it as a manual, included slot', () => {
    const url = `${base}/dynatrace.notebooks/notebook/abc`;
    expect(validateCustomUrl(url, HOST)).toEqual({ ok: true });
    const custom = plan({}, [], { custom: [customShot(url), customShot(url), customShot(`${base}/dynatrace.hub/billing`)] }).slots.filter((slot) => slot.kind === 'custom');
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ id: `custom--${sha256Hex(url).slice(0, 10)}`, layout: 'free', included: true, probeOnly: false, settleMs: 2500, order: 11 });
    expect(custom[0]?.chosen?.evidence).toBe('manual');
  });

  it('keeps at most six', () => {
    const many = Array.from({ length: 8 }, (_, index) => customShot(`${base}/dynatrace.notebooks/notebook/${index}`));
    expect(plan({}, [], { custom: many }).slots.filter((slot) => slot.kind === 'custom')).toHaveLength(6);
  });

});

describe('pin templates (spec §5.6)', () => {
  it('keeps every position, zone and lupa inside the crop, lupas ≤ 520 px wide', () => {
    for (const layout of Object.values(LAYOUTS)) {
      for (const template of layout.pins) {
        expect(template.x).toBeGreaterThanOrEqual(0);
        expect(template.x).toBeLessThanOrEqual(1);
        expect(template.y).toBeGreaterThanOrEqual(0);
        expect(template.y).toBeLessThanOrEqual(1);
        if (template.anchor !== null) {
          const { x0, y0, x1, y1 } = template.anchor.zone;
          expect(0 <= x0 && x0 < x1 && x1 <= 1 && 0 <= y0 && y0 < y1 && y1 <= 1, `${layout.key} pin ${template.n}`).toBe(true);
        }
      }
      expect(new Set(layout.pins.map((template) => template.n)).size).toBe(layout.pins.length);
      if (layout.lupa !== null) {
        expect(layout.lupa.w * 1720).toBeLessThanOrEqual(LUPA_MAX_PX);
        expect(layout.lupa.x + layout.lupa.w).toBeLessThanOrEqual(1);
        expect(layout.lupa.y + layout.lupa.h).toBeLessThanOrEqual(1);
        expect(layout.pins.map((template) => template.n)).toContain(layout.lupa.pin);
      }
    }
  });

  it('names only dictionary keys', () => {
    for (const layout of Object.values(LAYOUTS)) {
      expect(ALL_KEYS).toContain(layout.appLabelKey);
      for (const template of layout.pins) expect(ALL_KEYS).toContain(template.legendKey);
    }
  });

  it('agrees with the evidence engine on the window each screen shows', () => {
    for (const layout of Object.values(LAYOUTS)) {
      expect({ minutes: layout.screenWindowFallbackMin, source: layout.screenWindowSource }).toEqual(SCREEN_FALLBACK[layout.key]);
    }
  });

  it('gives an identity anchor to every layout but the host and free ones', () => {
    for (const layout of Object.values(LAYOUTS)) {
      const anchors = resolveAnchors(layout.key, { entityName: 'svc', displayId: 'P-1', clusterName: 'c', frontendName: 'f' });
      expect(anchors.some((anchor) => anchor.key === IDENTITY_KEY), layout.key).toBe(layout.identity !== null);
    }
    expect(resolveAnchors('vulns.list', {}).find((anchor) => anchor.key === IDENTITY_KEY)?.match).toEqual(['vulnerabilities detected', 'Vulnerabilities']);
    // An unknown fact drops its text, and an anchor left empty.
    expect(resolveAnchors('services.details', {}).map((anchor) => anchor.key)).not.toContain(IDENTITY_KEY);
  });

  it('verifies the screen only when the identity hit lies in its zone', () => {
    const header = { key: IDENTITY_KEY, rect: { x: 600, y: 60, w: 200, h: 30 } };
    const list = { key: IDENTITY_KEY, rect: { x: 40, y: 400, w: 200, h: 30 } };
    expect(identityFound('services.details', [header])).toBe(true);
    expect(identityFound('services.details', [list])).toBe(false);
    expect(identityFound('free', [header])).toBe(false);
    expect(defaultFocus('problems.detail')).toEqual({ x: 574, y: 121, w: 482, h: 41 });
    expect(defaultFocus('logs.filter')).toBeNull();
  });
});

describe('planner inputs', () => {
  it('reads the tenant host from the environment base', () => {
    expect(tenantHostOf('https://ABC12345.apps.dynatrace.com/')).toBe(HOST);
    expect(tenantHostOf('')).toBe('');
  });

  it('reports loading while any read is pending, and refused reads by id', () => {
    expect(inputs().loading).toBe(false);
    expect(inputs({ callers: evidence([], 'loading') }).loading).toBe(true);
    expect(inputs({ capacity: { outcome: 'no-permission', records: [] } }).denied).toEqual(['infra.capacity']);
  });

  it('never says "no problem in 15 days" when the problem read failed or was refused', () => {
    const failed = plan({ rcaTop: { outcome: 'error', records: [] } });
    expect(slotOf(failed, 'problem').omittedReason).toBe('prt.why.none.noData');
    expect(slotOf(failed, 'root-cause').omittedReason).toBe('prt.why.none.noData');
    expect(slotOf(plan({ rcaTop: { outcome: 'no-permission', records: [] } }), 'problem').omittedReason).toBe('prt.why.none.noPermission');
    expect(slotOf(plan({ rcaTop: ok([]) }), 'problem').omittedReason).toBe('prt.why.none.noIncident');
  });

  it('skips incidents without a root cause or a valid event id', () => {
    const { incident } = incidentsFromRca([rcaRow({ rootCauseId: null, rootCauseName: null }), rcaRow({ displayId: 'P-2', eventId: 'not-an-id' }), OTHER_INCIDENT]);
    expect(incident?.displayId).toBe('P-26100001');
  });
});
