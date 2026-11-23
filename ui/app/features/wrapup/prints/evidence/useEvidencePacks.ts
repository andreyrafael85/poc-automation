import { useMemo } from 'react';

import { useQueryScope } from '../../../../config/StudioContext';
import { useCatalogQuery, type QueryOutcome } from '../../../../hooks/useCatalogQuery';
import { useIncidentErrorLogs, type IncidentLogsOutcome } from '../../../../hooks/useIncidentErrorLogs';
import type { RcaIncident } from '../../../../models/rca';
import type { EvidenceBundle, EvidenceOutcome, EvidenceQueryResult, EvidenceSlot, EvidenceWindow, ExecutedQuery, IncidentSnapshot, PrintRecord, ShotPlan } from '../types';
import { assembleBundle, type CatalogEvidence, type EvidenceExtras } from './assemble';
import { incidentCallersRequest, planEvidenceRequests, problemEventsRequest, shotWithPrint } from './plan';
import { summariseProblemEvents } from './summarise';
import { useEvidenceQuery } from './useEvidenceQuery';
import { incidentWindow } from './windows';

/**
 * The evidence of the real-prints deck, read live (3.2.7, spec §4.2): the 23 fixed slots, one
 * `useEvidenceQuery` each and always in the same order, plus two catalog-side reads — `sec.posture`
 * (a cache hit with the Tech Wrapup, it gates the vulnerabilities shot) and the existing incident
 * logs (only when the logs print and an incident exist; D17).
 *
 * The tab never calls `useWrapupViewModel` (its 28 queries and the 10 GB incident scan); it reads
 * only what its prints need. `now` is read once per incident and refresh, rounded to the minute,
 * so two hooks mounted in the same minute share every request key.
 */

const MINUTE_MS = 60_000;

/** `now` for the windows: stable until the incident or the refresh token changes. */
function useEvidenceNow(incidentKey: string, refreshToken: number): number {
  return useMemo(() => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS, [incidentKey, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps
}

const incidentKeyOf = (incident: IncidentSnapshot | null) =>
  incident === null ? '' : [incident.eventId, incident.startIso, incident.endIso ?? '', incident.rootCauseId ?? '', incident.affectedIds.join(',')].join('|');

export interface IncidentEvidence {
  problemEvents: EvidenceQueryResult;
  callers: EvidenceQueryResult;
  /** W, final once B1 has settled; null without an incident. */
  window: EvidenceWindow | null;
  firstEventStartIso: string | null;
  /** The `now` the windows were computed with. */
  now: number;
}

/**
 * The planning-grade pair (B1 + B3), enabled whenever an incident exists. B3 waits for B1 to
 * settle, so W is computed once, with the first correlated event when there is one.
 */
export function useIncidentEvidence(incident: IncidentSnapshot | null): IncidentEvidence {
  const { refreshToken } = useQueryScope();
  const key = incidentKeyOf(incident);
  const now = useEvidenceNow(key, refreshToken);
  const eventsRequest = useMemo(() => problemEventsRequest(incident, now, refreshToken), [key, now, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps
  const problemEvents = useEvidenceQuery(eventsRequest);
  const settled = problemEvents.outcome !== 'loading';
  const firstEventStartIso = useMemo(
    () => (problemEvents.outcome === 'ok' || problemEvents.outcome === 'partial' ? summariseProblemEvents(problemEvents.records).firstEventStartIso : null),
    [problemEvents.outcome, problemEvents.records],
  );
  const callersRequest = useMemo(
    () => (settled ? incidentCallersRequest(incident, firstEventStartIso, now, refreshToken) : null),
    [key, settled, firstEventStartIso, now, refreshToken], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const callers = useEvidenceQuery(callersRequest);
  const window = useMemo(() => (incident === null ? null : incidentWindow(incident, firstEventStartIso, now)), [key, firstEventStartIso, now]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => ({ problemEvents, callers, window, firstEventStartIso, now }), [problemEvents, callers, window, firstEventStartIso, now]);
}

/** The incident as the existing incident-logs hook reads it (its query scopes to these ids). */
function rcaIncidentOf(incident: IncidentSnapshot): RcaIncident {
  return {
    displayId: incident.displayId,
    name: incident.name,
    category: incident.category,
    status: '',
    severity: null,
    impactLevels: [],
    affectedNames: [],
    affectedTypes: [],
    relatedNames: [],
    affectedIds: incident.affectedIds,
    relatedIds: incident.relatedIds ?? [],
    rootCauseName: incident.rootCauseName,
    rootCauseId: incident.rootCauseId,
    eventId: incident.eventId,
    startIso: incident.startIso,
    endIso: incident.endIso,
    durationNs: incident.durationNs,
    affectedCount: incident.affectedIds.length,
    clusters: incident.clusters,
    namespaces: incident.namespaces,
    workloads: [],
    description: null,
  };
}

const CATALOG_OUTCOME: Readonly<Record<QueryOutcome, EvidenceOutcome>> = {
  loading: 'loading',
  ok: 'ok',
  empty: 'empty',
  'no-permission': 'no-permission',
  'scan-limit': 'partial',
  error: 'error',
  refused: 'error',
};

const LOGS_OUTCOME: Readonly<Record<IncidentLogsOutcome, EvidenceOutcome>> = {
  loading: 'loading',
  ok: 'ok',
  'no-permission': 'no-permission',
  error: 'error',
  disabled: 'disabled',
};

export function useEvidencePacks(plan: ShotPlan, prints: ReadonlyMap<string, PrintRecord>): { bundle: EvidenceBundle; executed: ExecutedQuery[]; loading: boolean } {
  const scope = useQueryScope();
  const incident = plan.incident;
  const key = incidentKeyOf(incident);
  const pair = useIncidentEvidence(incident);
  const settled = pair.problemEvents.outcome !== 'loading';

  const requests = useMemo(
    () =>
      planEvidenceRequests({
        plan,
        prints,
        firstEventStartIso: pair.firstEventStartIso,
        global: scope.globalWindow,
        now: pair.now,
        refreshToken: scope.refreshToken,
        problemEventsSettled: settled,
      }),
    [plan, prints, pair.firstEventStartIso, scope.globalWindow, pair.now, scope.refreshToken, settled],
  );

  // One hook per fixed slot, always in EVIDENCE_SLOTS order; B1 and B3 come from the pair above.
  const recurrence = useEvidenceQuery(requests.recurrence);
  const incidentMinutes = useEvidenceQuery(requests.incidentMinutes);
  const incidentEndpoints = useEvidenceQuery(requests.incidentEndpoints);
  const rootScreen = useEvidenceQuery(requests.rootScreen);
  const frontendIncident = useEvidenceQuery(requests.frontendIncident);
  const frontendProblem = useEvidenceQuery(requests.frontendProblem);
  const frontendScreen = useEvidenceQuery(requests.frontendScreen);
  const frontendMinutes = useEvidenceQuery(requests.frontendMinutes);
  const k8sCapacity = useEvidenceQuery(requests.k8sCapacity);
  const k8sWorkloads = useEvidenceQuery(requests.k8sWorkloads);
  const k8sChurn = useEvidenceQuery(requests.k8sChurn);
  const k8sIncidentRestarts = useEvidenceQuery(requests.k8sIncidentRestarts);
  const failingServices = useEvidenceQuery(requests.failingServices);
  const failingEndpoints = useEvidenceQuery(requests.failingEndpoints);
  const failingEvents = useEvidenceQuery(requests.failingEvents);
  const failingScreen = useEvidenceQuery(requests.failingScreen);
  const failedEndpoints = useEvidenceQuery(requests.failedEndpoints);
  const logErrors = useEvidenceQuery(requests.logErrors);
  const topologyBlast = useEvidenceQuery(requests.topologyBlast);
  const topologyHubs = useEvidenceQuery(requests.topologyHubs);
  const hostCpu = useEvidenceQuery(requests.hostCpu);

  const vulnsPrint = shotWithPrint(plan, prints, 'vulnerabilities') !== null;
  const logsPrint = shotWithPrint(plan, prints, 'logs-errors') !== null;
  const posture = useCatalogQuery('sec.posture', { ...scope, enabled: vulnsPrint });
  const logsIncident = useMemo(() => (incident !== null && logsPrint ? rcaIncidentOf(incident) : null), [key, logsPrint]); // eslint-disable-line react-hooks/exhaustive-deps
  const incidentLogs = useIncidentErrorLogs(logsIncident, scope.refreshToken);

  const security = useMemo<CatalogEvidence | null>(() => {
    if (!vulnsPrint) return null;
    const startMs = Date.parse(posture.timeframe.startIso);
    const endMs = Date.parse(posture.timeframe.endIso);
    return {
      id: 'sec.posture',
      dql: posture.entry.dql,
      outcome: CATALOG_OUTCOME[posture.outcome],
      records: posture.records,
      window: { kind: 'global', startIso: posture.timeframe.startIso, endIso: posture.timeframe.endIso, source: 'app', minutes: Math.round((endMs - startMs) / MINUTE_MS) },
      readAtIso: posture.evidence.collectedAt ?? null,
      scannedBytes: posture.quality.scannedBytes,
    };
  }, [vulnsPrint, posture.timeframe, posture.entry, posture.outcome, posture.records, posture.evidence, posture.quality]);

  const extras = useMemo<EvidenceExtras>(
    () => ({
      security,
      incidentLogs:
        logsIncident === null
          ? null
          : {
              // A capped read (10 GB) is partial: its count is a floor, and zero proves nothing (D17).
              outcome: incidentLogs.outcome === 'ok' && incidentLogs.incomplete ? 'partial' : LOGS_OUTCOME[incidentLogs.outcome],
              total: incidentLogs.outcome === 'ok' ? incidentLogs.logs.total : null,
            },
    }),
    [security, logsIncident, incidentLogs.outcome, incidentLogs.logs, incidentLogs.incomplete],
  );

  const results = useMemo<Record<EvidenceSlot, EvidenceQueryResult>>(
    () => ({
      problemEvents: pair.problemEvents,
      incidentCallers: pair.callers,
      recurrence,
      incidentMinutes,
      incidentEndpoints,
      rootScreen,
      frontendIncident,
      frontendProblem,
      frontendScreen,
      frontendMinutes,
      k8sCapacity,
      k8sWorkloads,
      k8sChurn,
      k8sIncidentRestarts,
      failingServices,
      failingEndpoints,
      failingEvents,
      failingScreen,
      failedEndpoints,
      logErrors,
      topologyBlast,
      topologyHubs,
      hostCpu,
    }),
    [
      pair.problemEvents,
      pair.callers,
      recurrence,
      incidentMinutes,
      incidentEndpoints,
      rootScreen,
      frontendIncident,
      frontendProblem,
      frontendScreen,
      frontendMinutes,
      k8sCapacity,
      k8sWorkloads,
      k8sChurn,
      k8sIncidentRestarts,
      failingServices,
      failingEndpoints,
      failingEvents,
      failingScreen,
      failedEndpoints,
      logErrors,
      topologyBlast,
      topologyHubs,
      hostCpu,
    ],
  );

  const assembled = useMemo(() => assembleBundle(plan, results, extras), [plan, results, extras]);
  const loading =
    Object.values(results).some((result) => result.outcome === 'loading') ||
    (vulnsPrint && posture.outcome === 'loading') ||
    (logsIncident !== null && incidentLogs.outcome === 'loading');

  return useMemo(() => ({ bundle: assembled.bundle, executed: assembled.executed, loading }), [assembled, loading]);
}
