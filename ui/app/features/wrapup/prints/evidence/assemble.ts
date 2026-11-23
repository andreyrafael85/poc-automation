import type { CatalogId } from '../../../../queries/catalog';
import type { GrailRecord } from '../../../../utils/records';
import {
  EVIDENCE_OUTCOMES,
  EVIDENCE_SLOTS,
  type EvidenceBundle,
  type EvidenceOutcome,
  type EvidencePack,
  type EvidenceQueryResult,
  type EvidenceSlot,
  type EvidenceWindow,
  type ExecutedQuery,
  type ShotKind,
  type ShotPlan,
  type ShotSlot,
  type WindowKind,
} from '../types';
import {
  summariseCallers,
  summariseEntityEvents,
  summariseFailedEndpoints,
  summariseFailingEndpoints,
  summariseFailingServices,
  summariseFrontend,
  summariseFrontendMinutes,
  summariseHostCpu,
  summariseIncidentRestarts,
  summariseK8sCapacity,
  summariseK8sChurn,
  summariseK8sWorkloads,
  summariseLogErrors,
  summariseProblemEvents,
  summariseRecurrence,
  summariseSecurity,
  summariseServiceEndpoints,
  summariseServiceMinutes,
  summariseServiceScreen,
  summariseTopologyBlast,
  summariseTopologyHubs,
} from './summarise';

/**
 * The 23 query results (plus the two catalog-side reads) → one `EvidencePack` per shot of the
 * plan (3.2.7). Pure, so the bundle the deck reads can be rebuilt from recorded results in a test.
 *
 * Each pack holds the parts its kind's analysis reads, summarised only from ok or partial reads: a
 * refused, failed or empty read leaves its part absent, never zeroed. A pack's `outcome` is the
 * worst outcome among its REQUIRED queries (`EVIDENCE_OUTCOMES` order), and `queries` lists every
 * query that fed it, with the exact text that ran.
 */

/** A catalog read that feeds a pack (`sec.posture` for vulnerabilities). */
export interface CatalogEvidence {
  id: CatalogId;
  dql: string;
  outcome: EvidenceOutcome;
  records: readonly GrailRecord[];
  window: EvidenceWindow;
  readAtIso: string | null;
  scannedBytes: number | null;
}

export interface EvidenceExtras {
  security: CatalogEvidence | null;
  /** `useIncidentErrorLogs` over the incident's entities: the logs they wrote in the incident (D17). */
  incidentLogs: { outcome: EvidenceOutcome; total: number | null } | null;
}

export const NO_EXTRAS: EvidenceExtras = { security: null, incidentLogs: null };

type Results = Readonly<Record<EvidenceSlot, EvidenceQueryResult>>;

/** The queries whose outcome a pack's outcome is (the worst of them). */
const REQUIRED: Readonly<Record<ShotKind, readonly EvidenceSlot[]>> = {
  problem: ['problemEvents'],
  'root-cause': ['incidentMinutes', 'incidentCallers'],
  frontend: ['frontendScreen'],
  'k8s-cluster': ['k8sCapacity'],
  'failing-service': ['failingServices'],
  'failed-requests': ['failedEndpoints'],
  'logs-errors': ['logErrors'],
  smartscape: ['topologyHubs'],
  vulnerabilities: [],
  host: ['hostCpu'],
  custom: [],
};

/** Every query that may feed a kind's pack. */
const FEEDS: Readonly<Record<ShotKind, readonly EvidenceSlot[]>> = {
  problem: ['problemEvents', 'incidentCallers', 'recurrence', 'incidentMinutes', 'frontendProblem', 'frontendMinutes'],
  'root-cause': ['problemEvents', 'incidentCallers', 'incidentMinutes', 'incidentEndpoints', 'rootScreen'],
  frontend: ['problemEvents', 'frontendIncident', 'frontendProblem', 'frontendScreen', 'frontendMinutes'],
  'k8s-cluster': ['k8sCapacity', 'k8sWorkloads', 'k8sChurn', 'k8sIncidentRestarts'],
  // The incident's callers too: "not on the incident's path" (f.independent) is proven from them.
  'failing-service': ['failingServices', 'failingEndpoints', 'failingEvents', 'failingScreen', 'incidentCallers'],
  'failed-requests': ['failedEndpoints'],
  'logs-errors': ['logErrors'],
  smartscape: ['topologyBlast', 'topologyHubs'],
  vulnerabilities: [],
  host: ['hostCpu'],
  custom: [],
};

const SETTLED: ReadonlySet<EvidenceOutcome> = new Set(['ok', 'partial', 'empty', 'no-permission', 'error']);

/** The worst of some outcomes (`EVIDENCE_OUTCOMES` order); 'disabled' when there is none. */
export function worstOutcome(outcomes: readonly EvidenceOutcome[]): EvidenceOutcome {
  if (outcomes.length === 0) return 'disabled';
  return outcomes.reduce((worst, outcome) => (EVIDENCE_OUTCOMES.indexOf(outcome) > EVIDENCE_OUTCOMES.indexOf(worst) ? outcome : worst));
}

const usable = (result: EvidenceQueryResult | undefined): result is EvidenceQueryResult & { request: NonNullable<EvidenceQueryResult['request']> } =>
  result !== undefined && result.request !== null && (result.outcome === 'ok' || result.outcome === 'partial');

/** An `ExecutedQuery` for a settled result; null while it is disabled or loading. */
export function executedOf(result: EvidenceQueryResult): ExecutedQuery | null {
  if (result.request === null || !SETTLED.has(result.outcome)) return null;
  return {
    id: result.request.id,
    dql: result.request.dql,
    window: result.request.window,
    records: result.records.length,
    scannedBytes: result.quality.scannedBytes,
    outcome: result.outcome,
    readAtIso: result.readAtIso,
  };
}

function catalogExecuted(read: CatalogEvidence): ExecutedQuery | null {
  if (!SETTLED.has(read.outcome)) return null;
  return { id: read.id, dql: read.dql, window: read.window, records: read.records.length, scannedBytes: read.scannedBytes, outcome: read.outcome, readAtIso: read.readAtIso };
}

/** The pack of one shot, from the results of the queries that feed its kind. */
export function assemblePack(slot: ShotSlot, plan: ShotPlan, results: Results, extras: EvidenceExtras = NO_EXTRAS): EvidencePack {
  const feeds = FEEDS[slot.kind];
  const windows: Partial<Record<WindowKind, EvidenceWindow>> = {};
  const queries: ExecutedQuery[] = [];
  for (const name of feeds) {
    const result = results[name];
    if (result.request === null) continue;
    windows[result.request.window.kind] ??= result.request.window;
    const executed = executedOf(result);
    if (executed !== null) queries.push(executed);
  }
  const required = REQUIRED[slot.kind].map((name) => results[name].outcome);
  const pack: EvidencePack = { shotId: slot.id, kind: slot.kind, outcome: worstOutcome(required), windows, queries };
  const incident = slot.incident ?? plan.incident;

  const events = results.problemEvents;
  if (feeds.includes('problemEvents') && usable(events)) {
    const summary = summariseProblemEvents(events.records);
    if (summary.problem !== null) pack.problem = summary.problem;
  }
  if (feeds.includes('recurrence') && usable(results.recurrence)) pack.recurrence = summariseRecurrence(results.recurrence.records);
  if (feeds.includes('incidentCallers') && usable(results.incidentCallers)) pack.callers = summariseCallers(results.incidentCallers.records);
  if (feeds.includes('incidentMinutes') && usable(results.incidentMinutes)) {
    const services = summariseServiceMinutes(results.incidentMinutes.records);
    if (services.length > 0) pack.services = services;
  }
  if (feeds.includes('incidentEndpoints') && usable(results.incidentEndpoints)) pack.endpoints = summariseServiceEndpoints(results.incidentEndpoints.records);

  const screenOf = (name: 'rootScreen' | 'failingScreen') => {
    const result = results[name];
    const serviceId = slot.subject.kind === 'service' ? slot.subject.serviceId : null;
    if (!feeds.includes(name) || !usable(result) || serviceId === null) return;
    const screen = summariseServiceScreen(result.records, serviceId, result.request.window.minutes);
    if (screen !== null) pack.serviceScreen = screen;
  };
  screenOf('rootScreen');
  screenOf('failingScreen');

  const frontend: NonNullable<EvidencePack['frontend']> = {};
  const summaryOf = (name: 'frontendIncident' | 'frontendProblem' | 'frontendScreen', key: 'incident' | 'problem' | 'screen') => {
    const result = results[name];
    if (!feeds.includes(name) || !usable(result)) return;
    const summary = summariseFrontend(result.records, result.request.window.minutes);
    if (summary !== null) frontend[key] = summary;
  };
  summaryOf('frontendIncident', 'incident');
  summaryOf('frontendProblem', 'problem');
  summaryOf('frontendScreen', 'screen');
  if (feeds.includes('frontendMinutes') && usable(results.frontendMinutes)) {
    const minutes = summariseFrontendMinutes(results.frontendMinutes.records);
    if (minutes !== null) frontend.minutes = minutes;
  }
  if (Object.keys(frontend).length > 0) pack.frontend = frontend;

  if (slot.kind === 'k8s-cluster') {
    const capacity = usable(results.k8sCapacity) ? summariseK8sCapacity(results.k8sCapacity.records) : null;
    const workloads = usable(results.k8sWorkloads) ? summariseK8sWorkloads(results.k8sWorkloads.records) : [];
    const churn = usable(results.k8sChurn) ? summariseK8sChurn(results.k8sChurn.records) : null;
    const restarts = usable(results.k8sIncidentRestarts) ? summariseIncidentRestarts(results.k8sIncidentRestarts.records, incident?.namespaces ?? []) : [];
    if (capacity !== null || workloads.length > 0 || churn !== null || restarts.length > 0) pack.k8s = { capacity, workloads, churn, incidentRestarts: restarts };
  }

  if (slot.kind === 'failing-service' && usable(results.failingServices)) {
    pack.failing = {
      ...summariseFailingServices(results.failingServices.records),
      endpoints: usable(results.failingEndpoints) ? summariseFailingEndpoints(results.failingEndpoints.records) : [],
      events: usable(results.failingEvents) ? summariseEntityEvents(results.failingEvents.records) : null,
    };
  }

  if (slot.kind === 'failed-requests' && usable(results.failedEndpoints)) {
    const failed = summariseFailedEndpoints(results.failedEndpoints.records);
    if (failed !== null) pack.failed = failed;
  }

  if (slot.kind === 'logs-errors' && usable(results.logErrors)) {
    const incidentLogs = extras.incidentLogs;
    pack.logs = { ...summariseLogErrors(results.logErrors.records), incidentLogCount: incidentLogs?.outcome === 'ok' ? incidentLogs.total : null };
  }

  if (slot.kind === 'smartscape' && (usable(results.topologyHubs) || usable(results.topologyBlast))) {
    const hubs = usable(results.topologyHubs) ? summariseTopologyHubs(results.topologyHubs.records) : { hubs: [], services: null, isolated: null, dbServices: null };
    pack.topology = { blast: usable(results.topologyBlast) ? summariseTopologyBlast(results.topologyBlast.records) : null, ...hubs };
  }

  if (slot.kind === 'host' && slot.subject.kind === 'host' && usable(results.hostCpu)) pack.host = summariseHostCpu(results.hostCpu.records, slot.subject.hostId);

  if (slot.kind === 'vulnerabilities') {
    const security = extras.security;
    if (security !== null) {
      pack.outcome = worstOutcome([security.outcome]);
      pack.windows.global ??= security.window;
      const executed = catalogExecuted(security);
      if (executed !== null) pack.queries.push(executed);
      if (security.outcome === 'ok' || security.outcome === 'partial') pack.security = summariseSecurity(security.records);
    }
  }
  return pack;
}

/** Every pack of the plan, and the settled queries (each distinct request once, in slot order). */
export function assembleBundle(
  plan: ShotPlan,
  results: Results,
  extras: EvidenceExtras = NO_EXTRAS,
): { bundle: EvidenceBundle; executed: ExecutedQuery[] } {
  const bundle: Record<string, EvidencePack> = {};
  for (const slot of plan.slots) bundle[slot.id] = assemblePack(slot, plan, results, extras);
  const seen = new Set<string>();
  const executed: ExecutedQuery[] = [];
  for (const name of EVIDENCE_SLOTS) {
    const result = results[name];
    const query = executedOf(result);
    if (query === null || result.request === null || seen.has(result.request.key)) continue;
    seen.add(result.request.key);
    executed.push(query);
  }
  if (extras.security !== null) {
    const query = catalogExecuted(extras.security);
    if (query !== null) executed.push(query);
  }
  return { bundle, executed };
}

/** Results for slots that did not run (tests and the empty state). */
export function disabledResults(): Record<EvidenceSlot, EvidenceQueryResult> {
  const out: Partial<Record<EvidenceSlot, EvidenceQueryResult>> = {};
  for (const name of EVIDENCE_SLOTS) {
    out[name] = { request: null, outcome: 'disabled', records: [], quality: { scanLimited: false, truncated: false, sampled: false, scannedBytes: null, notices: [] }, readAtIso: null };
  }
  return out as Record<EvidenceSlot, EvidenceQueryResult>;
}
