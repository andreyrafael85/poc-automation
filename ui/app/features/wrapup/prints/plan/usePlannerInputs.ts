import { useMemo } from 'react';

import { useQueryScope } from '../../../../config/StudioContext';
import { useCatalogQuery, type QueryOutcome } from '../../../../hooks/useCatalogQuery';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { Locale } from '../../../../i18n/strings';
import { attentionOrder, toHostCapacity } from '../../../../models/capacity';
import { summariseRca, type RcaIncident } from '../../../../models/rca';
import { summarisePosture } from '../../../../models/security';
import { frontendIdMap } from '../../../../models/trailLinks';
import type { CatalogId } from '../../../../queries/catalog';
import { entityType, environmentBase } from '../../../../utils/deepLinks';
import { num, str, type GrailRecord } from '../../../../utils/records';
import { EVENT_ID } from '../evidence/builders';
import { useIncidentEvidence } from '../evidence/useEvidencePacks';
import type { EvidenceQueryResult, EvidenceWindow, IncidentSnapshot } from '../types';

/**
 * What the shot planner reads (3.2.7, spec §3.1), gathered from the app's existing catalog reads —
 * cache hits shared with the Tech Wrapup, plus the new `k8s.cluster.ids` map — and the incident's
 * planning-grade evidence: its Davis events and the callers of its root cause over the incident
 * window W (`useIncidentEvidence`, both 0 bytes). The tab never calls `useWrapupViewModel` (its 28
 * queries and the 10 GB incident-log scan).
 *
 * The record readers are pure (`plannerInputsFrom`), so the planner's tests feed it rows shaped
 * like the validated ones; the hook only wires the reads.
 */

export interface PlannerInputs {
  /** `new URL(environmentBase()).host`, lower-case; '' outside the platform. */
  tenantHost: string;
  /** The most impactful root-caused problem of 15 days (or the SE's choice), and the next ones (≤ 5). */
  incident: IncidentSnapshot | null;
  others: IncidentSnapshot[];
  /**
   * The display id of `rca.top`'s first root-caused problem (the most impactful). It differs from
   * `incident` when the SE re-centred the plan on another problem, whose why-line then must not
   * call it "the most impactful".
   */
  topIncidentId: string | null;
  /** B1 (events window) and B3 (= `buildRootCallersDql`, over W), from `useIncidentEvidence`. */
  problemEvents: EvidenceQueryResult;
  callers: EvidenceQueryResult;
  /** `APPLICATION-…` → `FRONTEND-…` (`rum.frontend.ids`). */
  frontendIds: ReadonlyMap<string, string>;
  frontendRows: { name: string; applicationId: string; frontendId: string; requests: number }[];
  /** `svc.ranking` (top 50 by volume, the app's window) and `svc.totals`. */
  services: { id: string; name: string; requests: number; failures: number; ratePct: number }[];
  svcTotals: { requests: number; failures: number } | null;
  /** Cluster name → its first `K8S_CLUSTER-…` id (`k8s.cluster.ids`). */
  clusterIds: ReadonlyMap<string, string>;
  /** Every (name, id) pair of `k8s.cluster.ids`, so a name mapped to two ids keeps both. */
  clusterRows: { clusterName: string; clusterId: string }[];
  k8sPressure: { workload: string; cluster: string; totalOom: number; throttledPct: number }[];
  security: { outcome: QueryOutcome; open: number; critical: number; actNow: number };
  /** Worst first (`attentionOrder`). */
  hosts: { id: string; name: string; peakCpuPct: number | null; peakMemPct: number | null }[];
  /** The app's window, translated ("last 24 hours"), for the why-lines read over it. */
  globalWindowLabel: string;
  /** W (`incidentWindow`), for the root cause's why-line; null without an incident. */
  incidentWindow: EvidenceWindow | null;
  /** Catalog reads the platform refused (no-permission): their slots say so instead of "no data". */
  denied: readonly CatalogId[];
  /** Catalog reads that failed (error): an empty incident list then says "no data", never "no problem in 15 days". */
  failed: readonly CatalogId[];
  /** Why-line numbers and windows are formatted when the plan is built (`I18nText` params are final). */
  locale: Locale;
  timeZone: string;
  /** Stable per incident and refresh (the problem link's window, `generatedAtIso`). */
  now: number;
  loading: boolean;
}

const READABLE: ReadonlySet<QueryOutcome> = new Set<QueryOutcome>(['ok', 'scan-limit']);

/** The planner's view of a Davis problem; null when it cannot anchor a plan (no event id, start or root cause). */
export function toIncidentSnapshot(incident: RcaIncident): IncidentSnapshot | null {
  if (incident.eventId === null || !EVENT_ID.test(incident.eventId)) return null;
  if (incident.startIso === null || !Number.isFinite(Date.parse(incident.startIso))) return null;
  if (incident.rootCauseId === null || incident.displayId === '—') return null;
  return {
    eventId: incident.eventId,
    displayId: incident.displayId,
    name: incident.name,
    category: incident.category,
    rootCauseId: incident.rootCauseId,
    rootCauseName: incident.rootCauseName,
    affectedIds: [...incident.affectedIds],
    relatedIds: [...incident.relatedIds],
    startIso: incident.startIso,
    endIso: incident.endIso,
    durationNs: incident.durationNs,
    clusters: [...incident.clusters],
    namespaces: [...incident.namespaces],
  };
}

/**
 * The root-caused incidents of `rca.top`, in its order (root-caused first, then breadth, then
 * duration): the SE's preferred one (by display id) first when it is there, else the first.
 * `topId` is the display id of the first one, whichever is shown.
 */
export function incidentsFromRca(
  records: readonly GrailRecord[],
  preferred: string | null = null,
): { incident: IncidentSnapshot | null; others: IncidentSnapshot[]; topId: string | null } {
  const summary = summariseRca(records, [], []);
  const all = [summary.incident, ...summary.others]
    .filter((item): item is RcaIncident => item !== null)
    .map(toIncidentSnapshot)
    .filter((item): item is IncidentSnapshot => item !== null);
  const index = preferred === null ? -1 : all.findIndex((item) => item.displayId === preferred);
  const ordered = index > 0 ? [all[index] as IncidentSnapshot, ...all.slice(0, index), ...all.slice(index + 1)] : all;
  return { incident: ordered[0] ?? null, others: ordered.slice(1, 6), topId: all[0]?.displayId ?? null };
}

/** A catalog read as the planner needs it. */
export interface CatalogRead {
  outcome: QueryOutcome;
  records: readonly GrailRecord[];
}

export interface PlannerReads {
  tenantHost: string;
  rcaTop: CatalogRead;
  preferredIncident: string | null;
  problemEvents: EvidenceQueryResult;
  callers: EvidenceQueryResult;
  incidentWindow: EvidenceWindow | null;
  frontendIds: CatalogRead;
  svcRanking: CatalogRead;
  svcTotals: CatalogRead;
  clusterIds: CatalogRead;
  k8sPressure: CatalogRead;
  posture: CatalogRead;
  capacity: CatalogRead;
  globalWindowLabel: string;
  locale: Locale;
  timeZone: string;
  now: number;
}

const readable = (read: CatalogRead): readonly GrailRecord[] => (READABLE.has(read.outcome) ? read.records : []);

/** `PlannerInputs` from the raw reads (pure). */
export function plannerInputsFrom(reads: PlannerReads): PlannerInputs {
  const { incident, others, topId } = incidentsFromRca(readable(reads.rcaTop), reads.preferredIncident);

  const frontendRecords = readable(reads.frontendIds);
  const frontendRows = frontendRecords
    .map((record) => ({
      name: str(record, 'frontend.name') ?? str(record, 'applicationId') ?? '',
      applicationId: str(record, 'applicationId') ?? '',
      frontendId: str(record, 'frontendId') ?? '',
      requests: num(record, 'requests') ?? 0,
    }))
    .filter((row) => entityType(row.applicationId) === 'APPLICATION' && entityType(row.frontendId) === 'FRONTEND');

  const services = readable(reads.svcRanking)
    .map((record) => {
      const requests = num(record, 'totalRequests') ?? 0;
      const failures = num(record, 'totalFailures') ?? 0;
      return {
        id: str(record, 'serviceId') ?? '',
        name: str(record, 'name') ?? str(record, 'serviceId') ?? '',
        requests,
        failures,
        ratePct: num(record, 'failureRatePct') ?? (requests > 0 ? (100 * failures) / requests : 0),
      };
    })
    .filter((row) => entityType(row.id) === 'SERVICE');

  const totalsRow = readable(reads.svcTotals)[0];
  const totalRequests = num(totalsRow, 'totalRequests');
  const totalFailures = num(totalsRow, 'totalFailures');
  const svcTotals = totalRequests === null || totalFailures === null ? null : { requests: totalRequests, failures: totalFailures };

  const clusterRows = readable(reads.clusterIds)
    .map((record) => ({ clusterName: str(record, 'clusterName') ?? '', clusterId: str(record, 'clusterId') ?? '' }))
    .filter((row) => row.clusterName !== '' && entityType(row.clusterId) === 'K8S_CLUSTER');
  const clusterIds = new Map<string, string>();
  for (const row of clusterRows) if (!clusterIds.has(row.clusterName)) clusterIds.set(row.clusterName, row.clusterId);

  const k8sPressure = readable(reads.k8sPressure)
    .map((record) => ({
      workload: str(record, 'workload') ?? '',
      cluster: str(record, 'cluster') ?? '',
      totalOom: num(record, 'totalOom') ?? 0,
      throttledPct: num(record, 'throttledPct') ?? 0,
    }))
    .filter((row) => row.cluster !== '');

  const posture = summarisePosture(readable(reads.posture));
  const hosts = attentionOrder(toHostCapacity([...readable(reads.capacity)]))
    .filter((host) => entityType(host.hostId) === 'HOST')
    .map((host) => ({ id: host.hostId, name: host.name, peakCpuPct: host.peakCpuPct, peakMemPct: host.peakMemPct }));

  const catalogReads: [CatalogId, CatalogRead][] = [
    ['rca.top', reads.rcaTop],
    ['rum.frontend.ids', reads.frontendIds],
    ['svc.ranking', reads.svcRanking],
    ['svc.totals', reads.svcTotals],
    ['k8s.cluster.ids', reads.clusterIds],
    ['k8s.pressure', reads.k8sPressure],
    ['sec.posture', reads.posture],
    ['infra.capacity', reads.capacity],
  ];
  const denied = catalogReads.filter(([, read]) => read.outcome === 'no-permission').map(([id]) => id);
  const failed = catalogReads.filter(([, read]) => read.outcome === 'error').map(([id]) => id);
  const loading =
    catalogReads.some(([, read]) => read.outcome === 'loading') || reads.problemEvents.outcome === 'loading' || reads.callers.outcome === 'loading';

  return {
    tenantHost: reads.tenantHost.toLowerCase(),
    incident,
    others,
    topIncidentId: topId,
    problemEvents: reads.problemEvents,
    callers: reads.callers,
    frontendIds: frontendIdMap(frontendRecords),
    frontendRows,
    services,
    svcTotals,
    clusterIds,
    clusterRows,
    k8sPressure,
    security: { outcome: reads.posture.outcome, open: posture.total, critical: posture.bySeverity.CRITICAL, actNow: posture.actNowCount },
    hosts,
    globalWindowLabel: reads.globalWindowLabel,
    incidentWindow: reads.incidentWindow,
    denied,
    failed,
    locale: reads.locale,
    timeZone: reads.timeZone,
    now: reads.now,
    loading,
  };
}

/** The tenant's bare host, or '' outside the platform. */
export function tenantHostOf(base: string = environmentBase()): string {
  try {
    return new URL(base).host.toLowerCase();
  } catch {
    return '';
  }
}

function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const read = (query: { outcome: QueryOutcome; records: GrailRecord[] }): CatalogRead => ({ outcome: query.outcome, records: query.records });

/** "Last 24 hours" → "last 24 hours": a window label quoted inside a sentence (a custom range keeps its case). */
export function midSentence(label: string, locale: string): string {
  return /^\p{Lu}\p{Ll}/u.test(label) ? `${label.charAt(0).toLocaleLowerCase(locale)}${label.slice(1)}` : label;
}

/**
 * The planner's inputs, live. `preferredIncident` (a display id) re-centres the plan on another
 * root-caused problem of the 15 days ("Trocar entidade" on the problem slot): the root cause, its
 * callers and W follow it.
 */
export function usePlannerInputs(preferredIncident: string | null = null): PlannerInputs {
  const scope = useQueryScope();
  const { locale, tWindow } = useTranslation();
  const rca = useCatalogQuery('rca.top', scope);
  const ranking = useCatalogQuery('svc.ranking', scope);
  const totals = useCatalogQuery('svc.totals', scope);
  const frontends = useCatalogQuery('rum.frontend.ids', scope);
  const clusters = useCatalogQuery('k8s.cluster.ids', scope);
  const pressure = useCatalogQuery('k8s.pressure', scope);
  const posture = useCatalogQuery('sec.posture', scope);
  const capacity = useCatalogQuery('infra.capacity', scope);

  const rcaRead = useMemo(() => read(rca), [rca.outcome, rca.records]); // eslint-disable-line react-hooks/exhaustive-deps
  const { incident } = useMemo(() => incidentsFromRca(readable(rcaRead), preferredIncident), [rcaRead, preferredIncident]);
  const pair = useIncidentEvidence(incident);

  // The label is a menu entry ("Last 24 hours"); inside a why-line it reads mid-sentence, so lower-case.
  const windowLabel = midSentence(tWindow(scope.globalWindow.label), locale);
  const timeZone = useMemo(viewerTimeZone, []);

  return useMemo(
    () =>
      plannerInputsFrom({
        tenantHost: tenantHostOf(),
        rcaTop: rcaRead,
        preferredIncident,
        problemEvents: pair.problemEvents,
        callers: pair.callers,
        incidentWindow: pair.window,
        frontendIds: read(frontends),
        svcRanking: read(ranking),
        svcTotals: read(totals),
        clusterIds: read(clusters),
        k8sPressure: read(pressure),
        posture: read(posture),
        capacity: read(capacity),
        globalWindowLabel: windowLabel,
        locale,
        timeZone,
        now: pair.now,
      }),
    // The reads are memoised by their hooks (records by result, outcome by state); listing the
    // parts keeps the inputs stable between renders, so the plan is not rebuilt in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rcaRead,
      preferredIncident,
      pair.problemEvents,
      pair.callers,
      pair.window,
      pair.now,
      frontends.outcome,
      frontends.records,
      ranking.outcome,
      ranking.records,
      totals.outcome,
      totals.records,
      clusters.outcome,
      clusters.records,
      pressure.outcome,
      pressure.records,
      posture.outcome,
      posture.records,
      capacity.outcome,
      capacity.records,
      windowLabel,
      locale,
      timeZone,
    ],
  );
}
