import { entityType } from '../../../../utils/deepLinks';
import { EVIDENCE_SLOTS, type EvidenceQueryId, type EvidenceRequest, type EvidenceSlot, type EvidenceWindow, type IncidentSnapshot, type PrintRecord, type ShotKind, type ShotPlan, type ShotSlot } from '../types';
import type { CatalogId } from '../../../../queries/catalog';
import type { CatalogParamValues } from '../../../../queries/types';
import {
  entityEventsQuery,
  failedEndpointsQuery,
  failingEndpointsQuery,
  failingServicesQuery,
  frontendMinutesQuery,
  frontendSummaryQuery,
  hostCpuQuery,
  incidentCallersQuery,
  k8sCapacityQuery,
  k8sChurnQuery,
  k8sIncidentRestartsQuery,
  k8sWorkloadsQuery,
  logErrorsQuery,
  problemEventsQuery,
  recurrenceQuery,
  serviceEndpointsQuery,
  serviceMinutesQuery,
  serviceScreenQuery,
  topologyBlastQuery,
  topologyHubsQuery,
  type EvidenceQuery,
} from './builders';
import { EVIDENCE_QUERIES } from './registry';
import { LOGS_REQUEST_MAX_MS, clampWindow, dayWindow, eventsWindow, globalWindow, incidentWindow, problemWindow, recurrenceWindow, screenWindow } from './windows';

/**
 * Which evidence query each of the 23 fixed slots runs, over which window (3.2.7, spec §4.2).
 *
 * Pure: the plan, the prints, the first correlated event and an injected `now` in, one request or
 * null per slot out. A slot runs only when its shot is in the plan AND has a usable print, so a
 * PoC with three prints reads three dossiers, not twenty-three; the two planning-grade reads
 * (`problemEvents`, `incidentCallers`) run whenever an incident exists. Every request carries the
 * registry's guards and a stable key, `${id}|${start}|${end}|${hash8(dql)}|${refreshToken}`, that
 * the query hook memoises on — the same inputs always give the same key, so nothing refetches in
 * a loop.
 */

export interface EvidencePlanInput {
  plan: ShotPlan;
  /** The prints, keyed by slot id (records are also matched by their own `slotId`). */
  prints: ReadonlyMap<string, PrintRecord>;
  /** From B1 (`useIncidentEvidence`); null until it is read, or when it has no event. */
  firstEventStartIso: string | null;
  /** The app's global window (`useQueryScope().globalWindow`). */
  global: { startIso: string; endIso: string };
  now: number;
  refreshToken: number;
  /**
   * B1 has settled (any outcome), so W is final and the reads over W (B3, B4, B5, B6/B7 incident,
   * B13) may run. Defaults to true; the hooks pass the real state so none of them runs twice (once
   * before and once after W moves).
   */
  problemEventsSettled?: boolean;
}

/**
 * A request as the evidence hook runs it (TD-08): the catalog entry and its validated values travel
 * with the rendered text, so `useEvidenceQuery` reads through `useCatalogQuery` and the text printed
 * on the slide is the text that ran.
 */
export interface CatalogEvidenceRequest extends EvidenceRequest {
  catalogId: CatalogId;
  params: CatalogParamValues | null;
}

/** FNV-1a, 32 bits, as 8 hex: a synchronous digest of the DQL for the request key (not a security hash). */
export function hash8(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** A request with the registry's guards; the window is cut to the query's longest allowed span. A refused query (null) is no request. */
export function evidenceRequest(id: EvidenceQueryId, slot: EvidenceSlot, query: EvidenceQuery | null, window: EvidenceWindow, refreshToken: number): CatalogEvidenceRequest | null {
  if (query === null) return null;
  const meta = EVIDENCE_QUERIES[id];
  if (query.catalogId !== meta.catalogId) return null;
  const fitted = clampWindow(window, meta.maxWindowMs);
  const { dql } = query;
  return {
    id,
    slot,
    catalogId: query.catalogId,
    params: query.params,
    dql,
    window: fitted,
    scanLimitGbytes: meta.scanLimitGbytes,
    maxResultRecords: meta.maxResultRecords,
    key: [id, fitted.startIso, fitted.endIso, hash8(dql), refreshToken].join('|'),
  };
}

/** B1 over the events window: enabled whenever an incident exists. */
export function problemEventsRequest(incident: IncidentSnapshot | null, now: number, refreshToken: number): CatalogEvidenceRequest | null {
  if (incident === null) return null;
  return evidenceRequest('ev.problem.events', 'problemEvents', problemEventsQuery(incident.eventId), eventsWindow(incident, now), refreshToken);
}

/** B3 over W: enabled when an incident exists and its root is a service. */
export function incidentCallersRequest(incident: IncidentSnapshot | null, firstEventStartIso: string | null, now: number, refreshToken: number): CatalogEvidenceRequest | null {
  if (incident === null || entityType(incident.rootCauseId) !== 'SERVICE') return null;
  return evidenceRequest('ev.incident.callers', 'incidentCallers', incidentCallersQuery(incident.rootCauseId ?? ''), incidentWindow(incident, firstEventStartIso, now), refreshToken);
}

/** A print the evidence may be read for: captured and not a failed landing (manual and guided prints count). */
export function isUsablePrint(record: PrintRecord | undefined): record is PrintRecord {
  return record !== undefined && (record.landing === 'ok' || record.landing === 'unknown');
}

/** The usable print of a slot, by map key or by the record's own `slotId`. */
export function printOf(slot: ShotSlot, prints: ReadonlyMap<string, PrintRecord>): PrintRecord | null {
  const direct = prints.get(slot.id);
  if (isUsablePrint(direct)) return direct;
  for (const record of prints.values()) if (record.slotId === slot.id && isUsablePrint(record)) return record;
  return null;
}

/** The first included slot of a kind that has a usable print, with that print. */
export function shotWithPrint(plan: ShotPlan, prints: ReadonlyMap<string, PrintRecord>, kind: ShotKind): { slot: ShotSlot; print: PrintRecord } | null {
  for (const slot of plan.slots) {
    if (slot.kind !== kind || !slot.included) continue;
    const print = printOf(slot, prints);
    if (print !== null) return { slot, print };
  }
  return null;
}

const serviceOf = (slot: ShotSlot | undefined): string | null => (slot?.subject.kind === 'service' ? slot.subject.serviceId : null);

export function planEvidenceRequests(input: EvidencePlanInput): Readonly<Record<EvidenceSlot, CatalogEvidenceRequest | null>> {
  const { plan, prints, firstEventStartIso, now, refreshToken } = input;
  const settled = input.problemEventsSettled ?? true;
  const incident = plan.incident;
  const out = Object.fromEntries(EVIDENCE_SLOTS.map((slot) => [slot, null])) as Record<EvidenceSlot, CatalogEvidenceRequest | null>;

  const problem = shotWithPrint(plan, prints, 'problem');
  const root = shotWithPrint(plan, prints, 'root-cause');
  const frontend = shotWithPrint(plan, prints, 'frontend');
  const k8s = shotWithPrint(plan, prints, 'k8s-cluster');
  const failing = shotWithPrint(plan, prints, 'failing-service');
  const failed = shotWithPrint(plan, prints, 'failed-requests');
  const logs = shotWithPrint(plan, prints, 'logs-errors');
  const topology = shotWithPrint(plan, prints, 'smartscape');
  const host = shotWithPrint(plan, prints, 'host');

  const rootId = incident !== null && entityType(incident.rootCauseId) === 'SERVICE' ? (incident.rootCauseId as string) : null;
  // Every read over W waits for B1 to settle, as B3 does: a provisional W (anchored on the problem
  // start) would run each of them twice and put the real onset inside its baseline (3.2.7 review DQL-3).
  const W = incident === null || !settled ? null : incidentWindow(incident, firstEventStartIso, now);
  const screen = (shot: { slot: ShotSlot; print: PrintRecord }) => screenWindow(shot.print, shot.slot.layout, now);
  const day = dayWindow(now);
  const globalW = globalWindow(input.global);

  out.problemEvents = problemEventsRequest(incident, now, refreshToken);
  out.incidentCallers = settled ? incidentCallersRequest(incident, firstEventStartIso, now, refreshToken) : null;

  if (problem !== null && incident !== null && entityType(incident.rootCauseId) !== null) {
    out.recurrence = evidenceRequest('ev.problem.recurrence', 'recurrence', recurrenceQuery(incident.rootCauseId ?? ''), recurrenceWindow(now), refreshToken);
  }

  if (W !== null && (problem !== null || root !== null)) {
    const ids = [rootId, serviceOf(root?.slot)].filter((id): id is string => id !== null);
    if (ids.length > 0) out.incidentMinutes = evidenceRequest('ev.service.minutes', 'incidentMinutes', serviceMinutesQuery(ids), W, refreshToken);
  }

  const rootSubject = serviceOf(root?.slot);
  if (root !== null && rootSubject !== null) {
    if (W !== null) out.incidentEndpoints = evidenceRequest('ev.service.endpoints', 'incidentEndpoints', serviceEndpointsQuery(rootSubject), W, refreshToken);
    out.rootScreen = evidenceRequest('ev.service.screen', 'rootScreen', serviceScreenQuery(rootSubject), screen(root), refreshToken);
  }

  // The frontend subject of the plan, whether or not it has a print: its id serves the problem's users too.
  const frontendSlot = plan.slots.find((slot) => slot.kind === 'frontend' && slot.subject.kind === 'frontend');
  const frontendSubject = frontendSlot?.subject.kind === 'frontend' ? frontendSlot.subject : null;
  const frontendId = frontendSubject !== null && entityType(frontendSubject.frontendId) === 'FRONTEND' ? frontendSubject.frontendId : null;
  if (frontend !== null && frontendId !== null && frontend.slot.subject.kind === 'frontend') {
    const bound = frontend.slot.subject.incidentBound;
    if (bound && W !== null) {
      out.frontendIncident = evidenceRequest('ev.frontend.summary', 'frontendIncident', frontendSummaryQuery(frontendId), W, refreshToken);
      out.frontendMinutes = evidenceRequest('ev.frontend.minutes', 'frontendMinutes', frontendMinutesQuery(frontendId), W, refreshToken);
    }
    out.frontendScreen = evidenceRequest('ev.frontend.summary', 'frontendScreen', frontendSummaryQuery(frontendId), screen(frontend), refreshToken);
  }
  if ((frontend !== null || problem !== null) && incident !== null && frontendId !== null && frontendSubject?.incidentBound === true) {
    out.frontendProblem = evidenceRequest('ev.frontend.summary', 'frontendProblem', frontendSummaryQuery(frontendId), problemWindow(incident, now), refreshToken);
  }

  if (k8s !== null && k8s.slot.subject.kind === 'k8s-cluster') {
    const subject = k8s.slot.subject;
    out.k8sCapacity = evidenceRequest('ev.k8s.capacity', 'k8sCapacity', k8sCapacityQuery(subject.clusterId), screen(k8s), refreshToken);
    out.k8sWorkloads = evidenceRequest('ev.k8s.workloads', 'k8sWorkloads', k8sWorkloadsQuery(subject.clusterId), screen(k8s), refreshToken);
    out.k8sChurn = evidenceRequest('ev.k8s.churn', 'k8sChurn', k8sChurnQuery(subject.clusterId), day, refreshToken);
    if (subject.incidentBound && W !== null) {
      out.k8sIncidentRestarts = evidenceRequest('ev.k8s.incidentRestarts', 'k8sIncidentRestarts', k8sIncidentRestartsQuery(subject.clusterId), W, refreshToken);
    }
  }

  const failingId = serviceOf(failing?.slot);
  if (failing !== null && failingId !== null) {
    out.failingServices = evidenceRequest('ev.failing.services', 'failingServices', failingServicesQuery(failingId), globalW, refreshToken);
    out.failingEndpoints = evidenceRequest('ev.failing.endpoints', 'failingEndpoints', failingEndpointsQuery(failingId), globalW, refreshToken);
    out.failingEvents = evidenceRequest('ev.entity.events', 'failingEvents', entityEventsQuery(failingId), day, refreshToken);
    out.failingScreen = evidenceRequest('ev.service.screen', 'failingScreen', serviceScreenQuery(failingId), screen(failing), refreshToken);
  }

  if (failed !== null) out.failedEndpoints = evidenceRequest('ev.failed.endpoints', 'failedEndpoints', failedEndpointsQuery(), screen(failed), refreshToken);
  // B15 is the deck's one new logs scan: requested over ≤ 2 h whatever the screen showed (the 6 h guard stays in the registry).
  if (logs !== null) out.logErrors = evidenceRequest('ev.logs.errors', 'logErrors', logErrorsQuery(), clampWindow(screen(logs), LOGS_REQUEST_MAX_MS), refreshToken);
  if (topology !== null) {
    if (rootId !== null) out.topologyBlast = evidenceRequest('ev.topology.blast', 'topologyBlast', topologyBlastQuery(rootId), screen(topology), refreshToken);
    out.topologyHubs = evidenceRequest('ev.topology.hubs', 'topologyHubs', topologyHubsQuery(), screen(topology), refreshToken);
  }
  if (host !== null && host.slot.subject.kind === 'host' && entityType(host.slot.subject.hostId) === 'HOST') {
    out.hostCpu = evidenceRequest('ev.host.cpu', 'hostCpu', hostCpuQuery(host.slot.subject.hostId), screen(host), refreshToken);
  }
  return out;
}
