import { LAYOUTS } from '../../features/wrapup/prints/plan/pinTemplates';
import { CLEAN_QUALITY } from '../../queries/grailMetadata';
import type { GrailRecord } from '../../utils/records';
import { disabledResults } from '../../features/wrapup/prints/evidence/assemble';
import { planEvidenceRequests, type EvidencePlanInput } from '../../features/wrapup/prints/evidence/plan';
import { EVIDENCE_SLOTS, type EvidenceQueryResult, type EvidenceSlot, type IncidentSnapshot, type PrintRecord, type ShotPlan, type ShotSlot } from '../../features/wrapup/prints/types';

/**
 * Lab fixtures of the real-prints deck (3.2.7, spec §4.10): Grail records shaped exactly like the
 * Appendix A outputs of the validation (lab) tenant, each pinned with the window it was read
 * over, so the evidence engine and its analysis can be checked against the numbers of P-260914359
 * without a tenant. The per-minute arrays are the ones the spec's lab analytics were computed from
 * (`calc/svc.py`, `calc/fe.py`).
 *
 * Ids: the ones Appendix A prints in full are kept; TradeManagement (abbreviated "E199…") is
 * completed with zeros, and the ids Appendix A does not print (":80", the other callers, the extra
 * workloads, signatures and endpoints) are synthetic, labelled where they are made up. No real
 * screenshot, no credential, no customer data.
 */

// Entity ids and host names of the lab are high-entropy by nature; none is a secret.
/* eslint-disable noSecrets/no-secrets */
export const LAB = {
  eventId: '1495944828232761706_1790117520000V2',
  displayId: 'P-260914359',
  /** TradeManagement, the DATABASE_SERVICE root ("E199…" in Appendix A, completed with zeros). */
  root: 'SERVICE-E199000000000000',
  /** easyTradeManager, its top failing caller (the owner's link). */
  caller: 'SERVICE-C44033DE8492CF45',
  /** BrokerService 41A4…, the failing service by excess. */
  broker: 'SERVICE-41A4F03120E830E8',
  /** The other BrokerService (Appendix A A17). */
  broker2: 'SERVICE-4F4F000000000000',
  /** easyTradeLoginService and OrderController (hop-1 ids of A16; which is which is assumed). */
  login: 'SERVICE-735D88A54ACBBC95',
  order: 'SERVICE-CB326BF8113A8410',
  /** ":80" — assumed to be the hop-2 entry service 8BACD834F8B0945E of A16. */
  port80: 'SERVICE-8BACD834F8B0945E',
  entry2: 'SERVICE-4CA8A383F8400A11',
  datadog: 'SERVICE-DA7AD06000000000',
  application: 'APPLICATION-6331991FD4EFBB24',
  frontend: 'FRONTEND-32E311F297817EA0',
  cluster: 'K8S_CLUSTER-87E7E0B19F2B0431',
  clusterName: 'loan-app-dynakube',
  hostRoot: 'HOST-F91F108503DD0BA8',
  /** The VM host behind HOST-F91F… (masked in the Customer profile). */
  hostRootName: 'ag-env-public-br.2z2vq0abcdefghijklmn.bx.internal.cloudapp.net',
} as const;
/* eslint-enable noSecrets/no-secrets */

/** P-260914359 as `rca.top` snapshots it: 22:57–23:09 UTC, 3 affected entities. */
export const LAB_INCIDENT: IncidentSnapshot = {
  eventId: LAB.eventId,
  displayId: LAB.displayId,
  name: 'Request error rate increase',
  category: 'ERROR',
  rootCauseId: LAB.root,
  rootCauseName: 'TradeManagement',
  affectedIds: [LAB.root, LAB.port80, LAB.application],
  startIso: '2026-09-22T22:57:00.000Z',
  endIso: '2026-09-22T23:09:00.000Z',
  durationNs: 12 * 60 * 1e9,
  clusters: [LAB.clusterName],
  namespaces: ['easytrade'],
};

/** Grail writes instants with nanoseconds. */
const at = (hhmm: string, day = '2026-09-22') => `${day}T${hhmm}:00.000000000Z`;

/** W = 22/09 22:14–23:24 UTC (70 one-minute bins). */
export const LAB_W = { startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z' } as const;
const W_FRAME = { start: at('22:14'), end: at('23:24') };
const MINUTE_NS = '60000000000';

/** A1 — B1 over the events window 21:57–00:09Z: 5 events (all written 23:11:55.483Z) and the problem row. */
export const A1_PROBLEM_EVENTS: GrailRecord[] = [
  { 'event.id': '-101_1790116640000V2', 'event.name': 'Response time degradation', 'event.category': 'SLOWDOWN', 'event.start': at('22:44'), 'event.end': at('23:03'), writtenAt: '2026-09-22T23:11:55.483000000Z', source: LAB.root, sourceName: 'TradeManagement', detail: 'The current response time is above the baseline.' },
  { 'event.id': '-102_1790116640000V2', 'event.name': 'Failure rate increase', 'event.category': 'ERROR', 'event.start': at('22:44'), 'event.end': at('23:03'), writtenAt: '2026-09-22T23:11:55.483000000Z', source: LAB.root, sourceName: 'TradeManagement', detail: 'The current failure rate is above the baseline.' },
  { 'event.id': '-103_1790117120000V2', 'event.name': 'Failure rate increase', 'event.category': 'ERROR', 'event.start': at('22:52'), 'event.end': at('23:08'), writtenAt: '2026-09-22T23:11:55.483000000Z', source: LAB.port80, sourceName: ':80', detail: 'Contact ops@contoso.example on 10.1.2.3.' },
  { 'event.id': '-104_1790117120000V2', 'event.name': 'Response time degradation', 'event.category': 'SLOWDOWN', 'event.start': at('22:52'), 'event.end': at('23:09'), writtenAt: '2026-09-22T23:11:55.483000000Z', source: LAB.port80, sourceName: ':80', detail: 'The current response time is above the baseline.' },
  { 'event.id': '-105_1790117420000V2', 'event.name': 'JavaScript error rate increase', 'event.category': 'ERROR', 'event.start': at('22:57'), 'event.end': at('23:04'), writtenAt: '2026-09-22T23:11:55.483000000Z', source: LAB.application, sourceName: 'easyTrade', detail: 'User action error rate increase.' },
  { isProblem: true, users: '52', eventCount: 5, impact: ['Application', 'Services'], problemStatus: 'CLOSED', severity: '3', pStart: at('22:57'), pEnd: at('23:09') },
];

/** A2 — B3 (= buildRootCallersDql) over W: the callers of the DATABASE_SERVICE root. */
export const A2_CALLERS: GrailRecord[] = [
  { id: LAB.caller, name: 'easyTradeManager', requests: 12344, failures: 341, rootType: 'DATABASE_SERVICE' },
  { id: LAB.login, name: 'easyTradeLoginService', requests: 782, failures: 14, rootType: 'DATABASE_SERVICE' },
  { id: LAB.broker, name: 'BrokerService', requests: 2304, failures: 4, rootType: 'DATABASE_SERVICE' },
  { id: LAB.order, name: 'OrderController', requests: 389, failures: 1, rootType: 'DATABASE_SERVICE' },
];

const TM_REQ = [594, 549, 592, 640, 615, 683, 610, 556, 586, 605, 729, 668, 616, 627, 498, 539, 609, 656, 633, 659, 605, 533, 630, 673, 637, 633, 646, 649, 667, 550, 541, 590, 726, 616, 592, 557, 605, 624, 539, 156, 235, 109, 9, 9, 34, 48, 110, 137, 22, 9, 203, 288, 404, 295, 697, 666, 629, 637, 737, 842, 848, 711, 698, 828, 858, 779, 871, 848, 820, 834];
const TM_FAIL = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 34, 48, 110, 137, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
/** p90 in µs. */
const TM_P90 = [5091.423579450855, 8018.343037741221, 3010.2309563041695, 2960.4246613120517, 4702.661413738197, 5552.236783665381, 4281.359836498459, 3926.024280483177, 3228.365985133719, 4668.856008024033, 3626.54859765144, 4978.820970651988, 5091.423579450855, 5496.939199159636, 6602.759487314696, 5552.236783665381, 6456.731970267429, 3676.426492705368, 5669.824735866762, 6456.731970267429, 9337.712016048068, 7852.048560966356, 7852.048560966356, 7852.048560966356, 6054.757146175578, 7352.852985410727, 8373.345412822544, 9337.712016048068, 6151.531109956011, 6456.731970267429, 17125.439345993844, 12109.51429235116, 6054.757146175578, 7852.048560966356, 13485.191833422334, 9535.47059101439, 5920.849322624096, 6182.987717319455, 24219.028584702326, 50687, 5567, 3551, 1647, 1967, 16383999, 13238271, 2654207, 14286847, 20709375, 2654207, 1303404.4363394212, 1843292.2311284689, 1690306.4287525653, 3380612.8575051315, 845153.2143762824, 1550017.829420951, 1096028.1181436074, 995052.2837749595, 96876.11433880933, 1614.1829925668612, 1327, 230411.52889105846, 1195227.1380541548, 1650.6898718286734, 1417.4561839666944, 1391, 1417.4561839666944, 1480.212330656028, 2147.090705790194, 1545.746929329868];
const EM_REQ = [209, 208, 210, 212, 211, 214, 209, 208, 210, 210, 214, 214, 210, 212, 202, 209, 211, 212, 212, 214, 208, 207, 211, 214, 212, 212, 212, 212, 214, 206, 208, 210, 218, 208, 210, 208, 210, 212, 160, 33, null, null, null, null, 28, 54, 110, 125, 25, 10, 41, 54, 94, 92, 226, 211, 216, 210, 218, 222, 224, 206, 226, 222, 224, 220, 224, 222, 222, 222];
const EM_FAIL = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, null, null, null, 28, 54, 110, 125, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const EM_P90 = [49993.73214517434, 67704.2890696796, 46848.31734743272, 21950.400021271627, 69186.81995195965, 47874.161916584686, 23937.080958292343, 30377.37550249691, 47874.161916584686, 53350.33135273114, 38550.43745841642, 36124.99108267868, 53350.33135273114, 42039.5501460315, 44862.10238710947, 33852.1445348398, 69186.81995195965, 24996.86607258717, 48922.46955676339, 60754.75100499382, 70701.81403335332, 60754.75100499382, 48922.46955676339, 58178.94888040705, 59452.901972581574, 62085.106819194014, 72249.98216535736, 69186.81995195965, 54518.55148910828, 64833.84933048976, 73832.05076508949, 78789.16423624917, 70701.81403335332, 75448.76215613094, 72249.98216535736, 69186.81995195965, 52207.14376490419, 59452.901972581574, 195689.87822705356, 50096608.82612571, null, null, null, null, 23472360.7101523, 22969396.42220005, 8120907.984949839, 3643666.8144636685, 21063029.389128357, 80680104.17791915, 116597338.06283739, 16597465.428605378, 12255785.45064568, 13956749.18121172, 3723452.728346051, 3131038.051632857, 2120112.824547139, 1986723.4182142084, 336316.401168252, 5856.03966842909, 3797.171937812114, 733511.2721922593, 2262458.0490673063, 7930.574204052577, 5032.151392366495, 3482.0220197170247, 3880.319176199626, 5254.943768253937, 10975.200010635814, 5984.270239573086];
const sum = (values: readonly (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);

/** A3 — B4 over W, 1 minute: TradeManagement (E199) and easyTradeManager (C440), 70 points each. */
export const A3_SERVICE_MINUTES: GrailRecord[] = [
  { id: LAB.root, name: 'TradeManagement', timeframe: W_FRAME, interval: MINUTE_NS, requests: TM_REQ, failures: TM_FAIL, p90: TM_P90, req: sum(TM_REQ), fail: sum(TM_FAIL) },
  { id: LAB.caller, name: 'easyTradeManager', timeframe: W_FRAME, interval: MINUTE_NS, requests: EM_REQ, failures: EM_FAIL, p90: EM_P90, req: sum(EM_REQ), fail: sum(EM_FAIL) },
];

/** A4 — B5 over W: easyTradeManager's endpoints. */
export const A4_ENDPOINTS: GrailRecord[] = [
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GetPackages', requests: 5776, failures: 166, ratePct: 2.87 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GetProducts', requests: 5775, failures: 165, ratePct: 2.86 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'Accounts', requests: 410, failures: 10, ratePct: 2.44 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GetAccountById', requests: 382, failures: 0, ratePct: 0 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GET /*', requests: 1, failures: 0, ratePct: 0 },
];

/** A5 — B6 over W (real users). */
export const A5_FRONTEND_W: GrailRecord[] = [
  { timeframe: W_FRAME, interval: '4200000000000', lcp_p75: 576, inp_p75: 4978.8, cls_x10k_p75: 10, ttfb_p75: 11, reqs: 4593, errs: 371, ua_p75: 1093, users: 86, sessions: 401, cls: 0.001, errorsPer100: 8.08 },
];

/** A6 — B6 over the problem window 22:57–23:09Z: 30 users and 46 sessions, the screen's numbers. */
export const A6_FRONTEND_PROBLEM: GrailRecord[] = [
  { timeframe: { start: at('22:57'), end: at('23:09') }, interval: '720000000000', lcp_p75: 756, inp_p75: 3672, cls_x10k_p75: null, ttfb_p75: null, reqs: 398, errs: 64, ua_p75: null, users: 30, sessions: 46, cls: null, errorsPer100: 16.08 },
];

const FE_REQS = [41, 53, 56, 76, 63, 80, 51, 50, 56, 57, 92, 75, 65, 70, 11, 51, 56, 70, 80, 84, 49, 38, 64, 87, 71, 56, 69, 64, 86, 36, 37, 72, 92, 55, 66, 39, 63, 67, 71, 41, 89, 34, null, 10, 20, null, null, 26, 18, 18, 48, 64, 75, 39, 80, 65, 64, 68, 100, 131, 130, 88, 71, 123, 141, 109, 137, 134, 114, 137];
const FE_ERRS = [1, 3, 1, 4, 3, 3, 2, 3, 1, 3, 4, 4, 2, 3, 1, 2, 2, 3, 4, 3, 2, 2, 2, 4, 2, 3, 3, 2, 4, 2, 1, 2, 3, 3, 2, 1, 3, 3, 2, 9, 81, 46, null, 10, 18, null, null, 8, 8, null, null, 12, 4, 1, 3, 4, 2, 3, 5, 5, 6, 4, 2, 6, 7, 5, 5, 7, 4, 8];

/** A7 — B7 over W, 1 minute. */
export const A7_FRONTEND_MINUTES: GrailRecord[] = [{ timeframe: W_FRAME, interval: MINUTE_NS, reqs: FE_REQS, errs: FE_ERRS, totalReqs: sum(FE_REQS), totalErrs: sum(FE_ERRS) }];

/** A8 — B10 over now-30m (2026-10-05 ~18:58Z), loan-app-dynakube. */
export const A8_CAPACITY_LOAN: GrailRecord[] = [
  { cpuUsedCores: 1.71, cpuReqCores: 10.29, cpuLimCores: 27.3, memUsedGiB: 13.96, memReqGiB: 30.48, memLimGiB: 42.19 },
  { isAllocatable: true, cpuAllocCores: 40.24, memAllocGiB: 82.75 },
];

/** A8 — B10, ard-dynatrace-gcp-monitor: the reference print's 15.8 / 13.7 / 31.1 cores and 55.2 / 55.2 / 58.5 GiB. */
export const A8_CAPACITY_ARD: GrailRecord[] = [
  { cpuUsedCores: 0.49, cpuReqCores: 13.695, cpuLimCores: 31.148, memUsedGiB: 4.86, memReqGiB: 55.17, memLimGiB: 58.54 },
  { isAllocatable: true, cpuAllocCores: 15.82, memAllocGiB: 55.17 },
];

/** A8b — B11 over now-30m: 8 workloads (kafka-broker and loadgen as measured; the others synthetic). */
export const A8B_WORKLOADS: GrailRecord[] = [
  { 'k8s.workload.name': 'kafka-broker', 'k8s.namespace.name': 'kafka', memOfReqPct: 117.5, cpuOfReqPct: 12.4, memReqGiB: 4, memUsedGiB: 4.7 },
  { 'k8s.workload.name': 'loadgen', 'k8s.namespace.name': 'easytrade', memOfReqPct: 61.2, cpuOfReqPct: 82.2, memReqGiB: 2, memUsedGiB: 1.22 },
  { 'k8s.workload.name': 'loan-service', 'k8s.namespace.name': 'loan', memOfReqPct: 40.1, cpuOfReqPct: 5.2, memReqGiB: 1.5, memUsedGiB: 0.6 },
  { 'k8s.workload.name': 'pricing-service', 'k8s.namespace.name': 'easytrade', memOfReqPct: 55.3, cpuOfReqPct: 9.8, memReqGiB: 1, memUsedGiB: 0.55 },
  { 'k8s.workload.name': 'sqs-demo', 'k8s.namespace.name': 'sqs-demo', memOfReqPct: 88.1, cpuOfReqPct: 3.1, memReqGiB: 0.5, memUsedGiB: 0.44 },
  { 'k8s.workload.name': 'broker-service', 'k8s.namespace.name': 'easytrade', memOfReqPct: 47, cpuOfReqPct: 6.6, memReqGiB: 0.5, memUsedGiB: 0.24 },
  { 'k8s.workload.name': 'frontend', 'k8s.namespace.name': 'easytrade', memOfReqPct: 33.3, cpuOfReqPct: 2, memReqGiB: 0.25, memUsedGiB: 0.08 },
  { 'k8s.workload.name': 'db', 'k8s.namespace.name': 'easytrade', memOfReqPct: 71.9, cpuOfReqPct: 14.5, memReqGiB: 0.25, memUsedGiB: 0.18 },
];

/** A8c — B12 over 24 h: the churn (namespaces synthetic), total 1,522. */
export const A8C_CHURN: GrailRecord[] = [
  { 'k8s.workload.name': 'sqs-demo', 'k8s.namespace.name': 'sqs-demo', restarts: 669, oomKills: 257 },
  { 'k8s.workload.name': 'aws-load-balancer-controller', 'k8s.namespace.name': 'kube-system', restarts: 555, oomKills: null },
  { 'k8s.workload.name': 'tier5-loan-finalizer', 'k8s.namespace.name': 'loan', restarts: 161, oomKills: null },
  { 'k8s.workload.name': 'simple-java-rest', 'k8s.namespace.name': 'demo', restarts: 132, oomKills: null },
  { isTotal: true, restarts: 1522, timeframe: { start: at('18:58', '2026-10-04'), end: at('18:58', '2026-10-05') } },
];

/** A8d — B13 over W, 1 minute: pricing-service (easytrade) 2 restarts, firstIdx 47 → 23:01 (the other rows synthetic). */
export const A8D_INCIDENT_RESTARTS: GrailRecord[] = [
  { 'k8s.workload.name': 'sqs-demo', 'k8s.namespace.name': 'sqs-demo', total: 31, firstIdx: 0, timeframe: W_FRAME },
  { 'k8s.workload.name': 'aws-load-balancer-controller', 'k8s.namespace.name': 'kube-system', total: 25, firstIdx: 2, timeframe: W_FRAME },
  { 'k8s.workload.name': 'pricing-service', 'k8s.namespace.name': 'easytrade', total: 2, firstIdx: 47, timeframe: W_FRAME },
  { 'k8s.workload.name': 'tier5-loan-finalizer', 'k8s.namespace.name': 'loan', total: 7, firstIdx: 5, timeframe: W_FRAME },
];

/** A9 — B2 over 7 days (the app reads 15): the root 6 (rank 1, 3.0× the next); totals 2,505 / 22. */
export const A9_RECURRENCE: GrailRecord[] = [
  { rootId: LAB.root, problems: 6, medianMin: 9, rankName: 'TradeManagement' },
  { rootId: LAB.hostRoot, problems: 2, medianMin: 31, rankName: LAB.hostRootName },
  { rootId: LAB.datadog, problems: 2, medianMin: 4, rankName: 'datadog-agent' },
  { isAnchor: true, problems: 6, closed: 6, medianMin: 9, p90Min: 17 },
  { isTotal: true, problems: 2505, rootCaused: 22, medianMin: 11 },
];

/** A10 — B14 over 24 h: BrokerService 41A4 by excess (datadog-agent's requests reconstructed from its excess 144 and 2.4×). */
export const A10_FAILING: GrailRecord[] = [
  { id: LAB.broker, name: 'BrokerService', requests: 78818, failures: 218, failurePct: 0.28, excess: 196, timesEnv: 10.1, 'env.envRequests': 6905550, 'env.envFailures': 1900 },
  { id: LAB.datadog, name: 'datadog-agent', requests: 373843, failures: 247, failurePct: 0.07, excess: 144, timesEnv: 2.4, 'env.envRequests': 6905550, 'env.envFailures': 1900 },
];

/** A15 — B14b over 24 h: BrokerService's endpoints (the last two synthetic, to make up 218). */
export const A15_FAILING_ENDPOINTS: GrailRecord[] = [
  { 'endpoint.name': 'GET v1/instrument', requests: 16727, failures: 86, failurePct: 0.51, p50Ms: 3.1, p90Ms: 12.4 },
  { 'endpoint.name': 'POST v1/trade/long/process', requests: 1429, failures: 43, failurePct: 3.01, p50Ms: 6682.5, p90Ms: 11993.2 },
  { 'endpoint.name': 'GET v1/price', requests: 30102, failures: 51, failurePct: 0.17, p50Ms: 2.2, p90Ms: 8.1 },
  { 'endpoint.name': 'POST v1/trade/short/process', requests: 1300, failures: 38, failurePct: 2.92, p50Ms: 5120, p90Ms: 9900 },
];

/** A14 — B9 over 24 h: 8 events on BrokerService, the last at 18:02Z. */
export const A14_ENTITY_EVENTS: GrailRecord[] = [{ events: 8, byCategory: ['ERROR', 'SLOWDOWN'], last: at('18:02', '2026-10-05'), names: ['Failure rate increase', 'Response time degradation'] }];

/** A11 — B16 over 2 h: the failed requests (the 6th–8th rows synthetic). */
export const A11_FAILED: GrailRecord[] = [
  { id: LAB.root, name: 'TradeManagement', 'endpoint.name': 'NON_KEY_REQUESTS', requests: 40211, failures: 48, ratePct: 0.12 },
  { id: LAB.broker, name: 'BrokerService', 'endpoint.name': 'GET v1/instrument', requests: 1319, failures: 31, ratePct: 2.35 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GetProducts', requests: 1880, failures: 16, ratePct: 0.85 },
  { id: LAB.caller, name: 'easyTradeManager', 'endpoint.name': 'GetPackages', requests: 1881, failures: 15, ratePct: 0.8 },
  { id: 'SERVICE-F1A6D00000000000', name: 'flagd', 'endpoint.name': 'EventStream', requests: 12, failures: 12, ratePct: 100 },
  { id: LAB.order, name: 'OrderController', 'endpoint.name': 'POST order', requests: 640, failures: 9, ratePct: 1.41 },
  { id: LAB.login, name: 'easyTradeLoginService', 'endpoint.name': 'Login', requests: 512, failures: 7, ratePct: 1.37 },
  { id: LAB.broker2, name: 'BrokerService', 'endpoint.name': 'GET v1/instrument', requests: 300, failures: 5, ratePct: 1.67 },
  { isTotal: true, requests: 832433, failures: 284 },
];

/** A12 — B15 over 2 h at 5 GB: 15,126 ERROR logs, 4 × 2,754 (a cascade); one signature carries an e-mail and an IP. */
export const A12_LOGS: GrailRecord[] = [
  { signature: '[ant] BUILD FAILED /opt/build/build.xml:# The following error occurred while executing this line', occurrences: 2754, origins: 1, topOrigin: 'ant-runner' },
  { signature: '[ant] /opt/build/common.xml:# Compile failed; see the compiler error output for details', occurrences: 2754, origins: 1, topOrigin: 'ant-runner' },
  { signature: '[ant] Target "compile" does not exist in the project "#". It is used from target "dist"', occurrences: 2754, origins: 1, topOrigin: 'ant-runner' },
  { signature: '[ant] Java returned: # — owner ops@contoso.example on 10.1.2.3', occurrences: 2754, origins: 1, topOrigin: 'ant-runner' },
  { signature: 'prometheus scrape failed: context deadline exceeded', occurrences: 1197, origins: 3, topOrigin: 'monitoring' },
  { signature: 'dynakube reconcile error: certificate not ready', occurrences: 1005, origins: 1, topOrigin: 'dynatrace' },
  { isTotal: true, occurrences: 15126 },
];

/** A16 — B17: the blast radius of the DATABASE_SERVICE root (4 + 2 + 1 frontend). */
export const A16_BLAST: GrailRecord[] = [
  {
    rootType: 'DATABASE_SERVICE',
    hop1: 4,
    hop2: 2,
    hop1Ids: [LAB.broker, LAB.login, LAB.order, LAB.caller],
    hop2Ids: [LAB.port80, LAB.entry2],
    apps: [LAB.application],
    appCount: 1,
  },
];

/** A17 — B18: the hubs (two BrokerService entities) and the totals 94 / 29 / 7. */
export const A17_HUBS: GrailRecord[] = [
  { id: 'SERVICE-8080000000000001', 'entity.name': ':8080', serviceType: 'WEB_REQUEST_SERVICE', callers: 2, callees: 6, degree: 8 },
  { id: LAB.port80, 'entity.name': ':80', serviceType: 'WEB_REQUEST_SERVICE', callers: 1, callees: 6, degree: 7 },
  { id: 'SERVICE-EA57000000000001', 'entity.name': 'EasytravelService', serviceType: 'WEB_SERVICE', callers: 2, callees: 3, degree: 5 },
  { id: LAB.broker2, 'entity.name': 'BrokerService', serviceType: 'WEB_REQUEST_SERVICE', callers: 2, callees: 3, degree: 5 },
  { id: LAB.broker, 'entity.name': 'BrokerService', serviceType: 'WEB_REQUEST_SERVICE', callers: 2, callees: 3, degree: 5 },
  { isTotal: true, services: 94, isolated: 29, dbServices: 7 },
];

/** A13 — B8 over now-30m, resolved to 18:40–19:11 (31 min): easyTradeManager's page. */
export const A13_SERVICE_SCREEN: GrailRecord[] = [
  { 'endpoint.name': 'GET api/Accounts', requests: 410, failures: 0, failurePct: 0, p50Ms: 37.72 },
  { 'endpoint.name': 'GetPackages', requests: 2790, failures: 4, failurePct: 0.14, p50Ms: 2.9 },
  { 'endpoint.name': 'GetProducts', requests: 2804, failures: 3, failurePct: 0.11, p50Ms: 2.7 },
  {
    isTotal: true,
    requests: 6004,
    failures: 7,
    failurePct: 0.12,
    avgMs: 485.9,
    p50Ms: 2.78,
    avgRt: 485900,
    p50All: 2780,
    timeframe: { start: at('18:40', '2026-10-05'), end: at('19:11', '2026-10-05') },
    interval: '1860000000000',
  },
];

// ------------------------------------------------------------------ the lab's plan, prints and query results

/** "Now" for the lab: 2026-10-05 19:00Z, when the current-state rows (A8–A17) were read. */
export const LAB_NOW = Date.parse('2026-10-05T19:00:00.000Z');

/**
 * The kinds the planner (`plan/planner.ts`) gives the incident snapshot to: the problem, its root
 * cause, the incident's own frontend and cluster, and the topology around the root. The failing
 * service, the failed requests, the logs, the vulnerabilities and the host (its root is a service
 * here) carry none, so the analysis must take the plan's incident for them.
 */
const INCIDENT_KINDS: ReadonlySet<ShotSlot['kind']> = new Set(['problem', 'root-cause', 'frontend', 'k8s-cluster', 'smartscape']);

function labSlot(id: string, kind: ShotSlot['kind'], layout: ShotSlot['layout'], order: number, subject: ShotSlot['subject'], entityName: string | null, included = true): ShotSlot {
  return {
    id,
    kind,
    layout,
    order,
    titleText: { key: 'prt.title.problem', params: { id: LAB.displayId } },
    chosen: { entityId: null, entityName, url: 'https://abc12345.apps.dynatrace.com/ui/apps/x', evidence: 'verified', why: { key: 'prt.why.logs', params: {} } },
    alternates: [],
    omittedReason: null,
    included,
    probeOnly: false,
    forced: false,
    subject,
    incident: INCIDENT_KINDS.has(kind) ? LAB_INCIDENT : null,
    anchors: [],
    settleMs: 3000,
    urlTemplateKey: `${kind}:x`,
  };
}

/** The plan of §3.7 (lab tenant, 2026-10-05), the opt-in host slot left out. */
export const LAB_PLAN: ShotPlan = {
  tenantHost: 'abc12345.apps.dynatrace.com',
  generatedAtIso: '2026-10-05T19:00:00.000Z',
  planId: '0123456789ab',
  incident: LAB_INCIDENT,
  slots: [
    labSlot('problem--p-260914359', 'problem', 'problems.detail', 1, { kind: 'incident' }, LAB.displayId),
    labSlot('root-cause--service-c44033de8492cf45', 'root-cause', 'services.details', 2, { kind: 'service', serviceId: LAB.caller, role: 'root-caller' }, 'easyTradeManager'),
    labSlot('frontend--frontend-32e311f297817ea0', 'frontend', 'vitals.web', 3, { kind: 'frontend', frontendId: LAB.frontend, applicationId: LAB.application, incidentBound: true }, 'easyTrade'),
    labSlot('k8s-cluster--k8s_cluster-87e7e0b19f2b0431', 'k8s-cluster', 'k8s.cluster', 4, { kind: 'k8s-cluster', clusterId: LAB.cluster, clusterName: LAB.clusterName, incidentBound: true }, LAB.clusterName),
    labSlot('failing-service--service-41a4f03120e830e8', 'failing-service', 'services.details', 5, { kind: 'service', serviceId: LAB.broker, role: 'failing' }, 'BrokerService'),
    labSlot('failed-requests--list', 'failed-requests', 'tracing.failedList', 6, { kind: 'list', list: 'failed-requests' }, null),
    labSlot('logs-errors--status-error-2h', 'logs-errors', 'logs.filter', 7, { kind: 'list', list: 'logs-errors' }, null),
    labSlot('smartscape--service-overview', 'smartscape', 'smartscape.services', 8, { kind: 'list', list: 'smartscape' }, null),
    labSlot('vulnerabilities--list', 'vulnerabilities', 'vulns.list', 9, { kind: 'list', list: 'vulnerabilities' }, null),
    labSlot('host--host-f91f108503dd0ba8', 'host', 'infraops.host', 10, { kind: 'host', hostId: LAB.hostRoot }, LAB.hostRootName, false),
  ],
};

export const labSlotOf = (kind: ShotSlot['kind']): ShotSlot => {
  const found = LAB_PLAN.slots.find((item) => item.kind === kind);
  if (found === undefined) throw new Error(kind);
  return found;
};

/** A companion print of a slot, captured 05/10 18:58 UTC on a UTC VM. */
/** One hit per anchor key of the slot's layout, a 40×16 box centred on the pin's reference spot. */
export function labAnchors(target: Pick<ShotSlot, 'layout'>): PrintRecord['anchors'] {
  const seen = new Set<string>();
  return LAYOUTS[target.layout].pins.flatMap((pin) => {
    if (pin.anchor === null || seen.has(pin.anchor.key)) return [];
    seen.add(pin.anchor.key);
    return [{ key: pin.anchor.key, hit: 0, rect: { x: Math.round(pin.x * 1720) - 20, y: Math.round(pin.y * 1080) - 8, w: 40, h: 16 } }];
  });
}

export function labPrint(target: ShotSlot, overrides: Partial<PrintRecord> = {}): PrintRecord {
  return {
    id: `print-${target.id}`,
    slotId: target.id,
    kind: target.kind,
    layout: target.layout,
    titleText: target.titleText,
    entity: { id: null, name: null },
    subject: target.subject,
    incident: target.incident,
    requestedPath: '/ui/apps/x',
    finalPath: '/ui/apps/x',
    finalAppId: 'x',
    linkEvidence: 'verified',
    source: 'companion',
    landing: 'ok',
    capturedAtIso: '2026-10-05T18:58:00.000Z',
    capturedAtApprox: false,
    captureTimeZone: 'UTC',
    screenTimeframeLabel: null,
    companion: { version: '1.1.0', planId: '0123456789ab', browser: 'chromium' },
    image: { sha256: 'a'.repeat(64), mime: 'image/jpeg', bytes: 200_000, width: 1720, height: 1080, normalization: 'native', partial: false },
    // 3.5.5: a lab print's labels were found where its layout expects them (the companion's anchors, or the
    // automatic reading of a manual print): every anchored pin of the layout has its hit, so its pin is drawn.
    anchors: labAnchors(target),
    screenNumbers: [],
    identity: 'anchor',
    pins: [],
    masks: [],
    maskSuggestions: [],
    focus: null,
    lupaOn: false,
    approval: null,
    warnings: [],
    matchedBy: 'id',
    edited: false,
    updatedAtIso: '2026-10-05T19:00:00.000Z',
    ...overrides,
  };
}

/** A print for every slot (the logs screen read "Last 2 hours"). */
export const labPrints = (plan: ShotPlan = LAB_PLAN): Map<string, PrintRecord> =>
  new Map(plan.slots.map((item) => [item.id, labPrint(item, item.kind === 'logs-errors' ? { screenTimeframeLabel: 'Last 2 hours' } : {})]));

export const labPlanInput = (overrides: Partial<EvidencePlanInput> = {}): EvidencePlanInput => ({
  plan: LAB_PLAN,
  prints: labPrints(),
  firstEventStartIso: '2026-09-22T22:44:00.000Z',
  global: { startIso: '2026-10-04T19:00:00.000Z', endIso: '2026-10-05T19:00:00.000Z' },
  now: LAB_NOW,
  refreshToken: 0,
  ...overrides,
});

export const labResult = (records: GrailRecord[], request: EvidenceQueryResult['request'], outcome: EvidenceQueryResult['outcome'] = 'ok'): EvidenceQueryResult => ({
  request,
  outcome,
  records,
  quality: { ...CLEAN_QUALITY, scannedBytes: outcome === 'ok' ? 1_000 : null },
  readAtIso: '2026-10-05T19:00:05.000Z',
});

/** The lab's results for `LAB_PLAN`: every enabled slot read from its Appendix A rows (empty when there is none). */
export function labResults(overrides: Partial<Record<EvidenceSlot, EvidenceQueryResult>> = {}, inputOverrides: Partial<EvidencePlanInput> = {}): Record<EvidenceSlot, EvidenceQueryResult> {
  const requests = planEvidenceRequests(labPlanInput(inputOverrides));
  const results = disabledResults();
  const rows: Partial<Record<EvidenceSlot, GrailRecord[]>> = {
    problemEvents: A1_PROBLEM_EVENTS,
    incidentCallers: A2_CALLERS,
    recurrence: A9_RECURRENCE,
    incidentMinutes: A3_SERVICE_MINUTES,
    incidentEndpoints: A4_ENDPOINTS,
    rootScreen: A13_SERVICE_SCREEN,
    frontendIncident: A5_FRONTEND_W,
    frontendProblem: A6_FRONTEND_PROBLEM,
    frontendMinutes: A7_FRONTEND_MINUTES,
    k8sCapacity: A8_CAPACITY_LOAN,
    k8sWorkloads: A8B_WORKLOADS,
    k8sChurn: A8C_CHURN,
    k8sIncidentRestarts: A8D_INCIDENT_RESTARTS,
    failingServices: A10_FAILING,
    failingEndpoints: A15_FAILING_ENDPOINTS,
    failingEvents: A14_ENTITY_EVENTS,
    // Shape only: the lab's service-page read (A13) stands in for BrokerService's.
    failingScreen: A13_SERVICE_SCREEN,
    failedEndpoints: A11_FAILED,
    logErrors: A12_LOGS,
    topologyBlast: A16_BLAST,
    topologyHubs: A17_HUBS,
  };
  for (const name of EVIDENCE_SLOTS) {
    const request = requests[name];
    const records = rows[name];
    if (request !== null && records !== undefined) results[name] = labResult(records, request);
    else if (request !== null) results[name] = labResult([], request, 'empty');
  }
  return { ...results, ...overrides };
}
