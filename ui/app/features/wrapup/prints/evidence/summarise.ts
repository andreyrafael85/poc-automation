import { summarisePosture } from '../../../../models/security';
import { summariseRootCallers } from '../../../../models/trailLinks';
import { entityType } from '../../../../utils/deepLinks';
import { bool, list, num, str, type GrailRecord } from '../../../../utils/records';
import { printText } from '../text';
import type { DavisEvent, EvidencePack, FrontendSummary, K8sCapacity, K8sWorkload, MinuteSeries } from '../types';

/**
 * Grail records → the typed parts of an `EvidencePack` (3.2.7, spec §4.4), one summariser per
 * query, all pure.
 *
 * Absent is never zero: a field Grail did not fill stays null, a series bin it did not fill stays a
 * null bin, and a part whose query was refused, failed or came back empty is not built at all (the
 * caller, `assemble.ts`, only summarises ok and partial reads). Tenant text that can reach a slide
 * — a log signature, its origin, an event detail — is redacted here with the SE profile's rules
 * (secrets, e-mails, IPs, tenant URLs); the deck masks hosts again for the customer.
 */

/** An instant as ISO 8601 (Grail writes nanoseconds and sometimes epoch numbers); null when unreadable. */
export function isoOf(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** `timeframe.start` / `.end` of a timeseries record, as ISO. */
export function timeframeOf(record: GrailRecord | undefined): { startIso: string; endIso: string } | null {
  const frame = record?.timeframe as { start?: unknown; end?: unknown } | undefined;
  const startIso = isoOf(frame?.start);
  const endIso = isoOf(frame?.end);
  return startIso === null || endIso === null ? null : { startIso, endIso };
}

/** Minutes of the RETURNED timeframe (a relative 30 min may resolve to 31): per-minute rates divide by this. */
export function timeframeMinutes(record: GrailRecord | undefined): number | null {
  const frame = timeframeOf(record);
  if (frame === null) return null;
  return Math.round((Date.parse(frame.endIso) - Date.parse(frame.startIso)) / 60_000);
}

/** One array field of a timeseries record as a `MinuteSeries` (`stepMs = interval / 1e6`); null when unreadable. */
export function minuteSeries(record: GrailRecord | undefined, field: string): MinuteSeries | null {
  const frame = timeframeOf(record);
  const intervalNs = num(record, 'interval');
  const raw = record?.[field];
  if (frame === null || intervalNs === null || intervalNs <= 0 || !Array.isArray(raw)) return null;
  const values = raw.map((value: unknown) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
  return { startIso: frame.startIso, stepMs: intervalNs / 1e6, values };
}

const isTagged = (record: GrailRecord, field: string) => bool(record, field) === true;

// ------------------------------------------------------------------ B1 problem and its events

export interface ProblemEventsSummary {
  problem: NonNullable<EvidencePack['problem']> | null;
  /** The earliest `event.start` among the events (the problem row excluded): the anchor of W. */
  firstEventStartIso: string | null;
}

export function summariseProblemEvents(records: readonly GrailRecord[]): ProblemEventsSummary {
  const events: DavisEvent[] = records
    .filter((record) => !isTagged(record, 'isProblem'))
    .map((record) => ({
      id: str(record, 'event.id') ?? '',
      name: str(record, 'event.name') ?? '',
      category: str(record, 'event.category') ?? '',
      startIso: isoOf(record['event.start']) ?? '',
      endIso: isoOf(record['event.end']),
      writtenAtIso: isoOf(record.writtenAt),
      sourceId: str(record, 'source') ?? '',
      sourceName: str(record, 'sourceName'),
      detail: printText(str(record, 'detail') ?? '', 160, 'se'),
    }))
    .filter((event) => event.startIso !== '')
    .sort((a, b) => Date.parse(a.startIso) - Date.parse(b.startIso));
  const firstEventStartIso = events[0]?.startIso ?? null;
  const row = records.find((record) => isTagged(record, 'isProblem'));
  const startIso = isoOf(row?.pStart);
  if (row === undefined || startIso === null) return { problem: null, firstEventStartIso };
  return {
    problem: {
      davisUsers: num(row, 'users'),
      eventCount: num(row, 'eventCount'),
      impact: list(row, 'impact'),
      status: str(row, 'problemStatus'),
      severity: str(row, 'severity'),
      startIso,
      endIso: isoOf(row.pEnd),
      events,
    },
    firstEventStartIso,
  };
}

// ------------------------------------------------------------------ B2 recurrence

export function summariseRecurrence(records: readonly GrailRecord[]): NonNullable<EvidencePack['recurrence']> {
  const anchor = records.find((record) => isTagged(record, 'isAnchor'));
  const total = records.find((record) => isTagged(record, 'isTotal'));
  const rank = records
    .filter((record) => !isTagged(record, 'isAnchor') && !isTagged(record, 'isTotal'))
    .map((record) => {
      const id = str(record, 'rootId') ?? '';
      return { id, name: str(record, 'rankName') ?? id, problems: num(record, 'problems') ?? 0 };
    })
    .filter((row) => entityType(row.id) !== null)
    .slice(0, 3);
  return {
    anchorProblems: num(anchor, 'problems'),
    medianMin: num(anchor, 'medianMin'),
    p90Min: num(anchor, 'p90Min'),
    rank,
    totalProblems: num(total, 'problems'),
    rootCaused: num(total, 'rootCaused'),
  };
}

// ------------------------------------------------------------------ B3 callers (the trail's summariser)

export function summariseCallers(records: readonly GrailRecord[]): NonNullable<EvidencePack['callers']> {
  const callers = summariseRootCallers(records);
  return { rootType: callers.rootType, rows: callers.callers };
}

// ------------------------------------------------------------------ B4 per-minute services

export function summariseServiceMinutes(records: readonly GrailRecord[]): NonNullable<EvidencePack['services']> {
  const services: NonNullable<EvidencePack['services']> = [];
  for (const record of records) {
    const id = str(record, 'id');
    const requests = minuteSeries(record, 'requests');
    const failures = minuteSeries(record, 'failures');
    const p90Us = minuteSeries(record, 'p90');
    if (id === null || entityType(id) !== 'SERVICE' || requests === null || failures === null) continue;
    const sum = (series: MinuteSeries) => series.values.reduce<number>((total, value) => total + (value ?? 0), 0);
    services.push({
      id,
      name: str(record, 'name') ?? id,
      requests,
      failures,
      p90Us: p90Us ?? { startIso: requests.startIso, stepMs: requests.stepMs, values: requests.values.map(() => null) },
      totals: { requests: num(record, 'req') ?? sum(requests), failures: num(record, 'fail') ?? sum(failures) },
    });
  }
  return services;
}

// ------------------------------------------------------------------ B5 endpoints of one service

export function summariseServiceEndpoints(records: readonly GrailRecord[]): NonNullable<EvidencePack['endpoints']> {
  return records
    .map((record) => ({
      serviceId: str(record, 'id') ?? '',
      endpoint: str(record, 'endpoint.name') ?? '',
      requests: num(record, 'requests') ?? 0,
      failures: num(record, 'failures') ?? 0,
      ratePct: num(record, 'ratePct'),
    }))
    .filter((row) => row.endpoint !== '');
}

// ------------------------------------------------------------------ B6 / B7 frontend

export function summariseFrontend(records: readonly GrailRecord[], windowMinutes: number): FrontendSummary | null {
  const row = records[0];
  if (row === undefined) return null;
  const cls = num(row, 'cls');
  const clsX10k = num(row, 'cls_x10k_p75');
  return {
    lcpMs: num(row, 'lcp_p75'),
    inpMs: num(row, 'inp_p75'),
    cls: cls ?? (clsX10k === null ? null : clsX10k / 10000),
    ttfbMs: num(row, 'ttfb_p75'),
    requests: num(row, 'reqs'),
    errors: num(row, 'errs'),
    actionP75Ms: num(row, 'ua_p75'),
    users: num(row, 'users'),
    sessions: num(row, 'sessions'),
    timeframeMinutes: timeframeMinutes(row) ?? windowMinutes,
  };
}

export function summariseFrontendMinutes(records: readonly GrailRecord[]): { requests: MinuteSeries; errors: MinuteSeries } | null {
  const row = records[0];
  const requests = minuteSeries(row, 'reqs');
  const errors = minuteSeries(row, 'errs');
  return requests === null || errors === null ? null : { requests, errors };
}

// ------------------------------------------------------------------ B8 the service page's own numbers

export function summariseServiceScreen(records: readonly GrailRecord[], serviceId: string, windowMinutes: number): NonNullable<EvidencePack['serviceScreen']> | null {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  if (total === undefined) return null;
  return {
    serviceId,
    requests: num(total, 'requests') ?? 0,
    failures: num(total, 'failures') ?? 0,
    avgMs: num(total, 'avgMs'),
    p50Ms: num(total, 'p50Ms'),
    endpoints: records
      .filter((record) => !isTagged(record, 'isTotal'))
      .map((record) => ({
        endpoint: str(record, 'endpoint.name') ?? '',
        requests: num(record, 'requests') ?? 0,
        failures: num(record, 'failures') ?? 0,
        p50Ms: num(record, 'p50Ms'),
      }))
      .filter((row) => row.endpoint !== ''),
    timeframeMinutes: timeframeMinutes(total) ?? windowMinutes,
  };
}

// ------------------------------------------------------------------ B9 events on one entity

export function summariseEntityEvents(records: readonly GrailRecord[]): NonNullable<NonNullable<EvidencePack['failing']>['events']> | null {
  const row = records[0];
  const count = num(row, 'events');
  if (row === undefined || count === null) return null;
  return { count, categories: list(row, 'byCategory'), lastIso: isoOf(row.last) };
}

// ------------------------------------------------------------------ B10–B13 Kubernetes

export function summariseK8sCapacity(records: readonly GrailRecord[]): K8sCapacity | null {
  const usage = records.find((record) => !isTagged(record, 'isAllocatable'));
  const allocatable = records.find((record) => isTagged(record, 'isAllocatable'));
  if (usage === undefined && allocatable === undefined) return null;
  return {
    cpuUsed: num(usage, 'cpuUsedCores'),
    cpuReq: num(usage, 'cpuReqCores'),
    cpuLim: num(usage, 'cpuLimCores'),
    cpuAlloc: num(allocatable, 'cpuAllocCores'),
    memUsedGiB: num(usage, 'memUsedGiB'),
    memReqGiB: num(usage, 'memReqGiB'),
    memLimGiB: num(usage, 'memLimGiB'),
    memAllocGiB: num(allocatable, 'memAllocGiB'),
  };
}

export function summariseK8sWorkloads(records: readonly GrailRecord[]): K8sWorkload[] {
  return records
    .map((record) => ({
      name: str(record, 'k8s.workload.name') ?? '',
      namespace: str(record, 'k8s.namespace.name') ?? '',
      memOfReqPct: num(record, 'memOfReqPct'),
      cpuOfReqPct: num(record, 'cpuOfReqPct'),
      memReqGiB: num(record, 'memReqGiB'),
      memUsedGiB: num(record, 'memUsedGiB'),
    }))
    .filter((row) => row.name !== '');
}

export function summariseK8sChurn(records: readonly GrailRecord[]): NonNullable<NonNullable<EvidencePack['k8s']>['churn']> {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  return {
    total: num(total, 'restarts'),
    rows: records
      .filter((record) => !isTagged(record, 'isTotal'))
      .map((record) => ({
        workload: str(record, 'k8s.workload.name') ?? '',
        namespace: str(record, 'k8s.namespace.name') ?? '',
        restarts: num(record, 'restarts') ?? 0,
        oom: num(record, 'oomKills'),
      }))
      .filter((row) => row.workload !== ''),
  };
}

/** B13, kept to the incident's namespaces (all of them when the snapshot names none). `firstIso = timeframe.start + firstIdx × 1 min`. */
export function summariseIncidentRestarts(records: readonly GrailRecord[], namespaces: readonly string[]): NonNullable<EvidencePack['k8s']>['incidentRestarts'] {
  const keep = new Set(namespaces);
  return records
    .map((record) => {
      const frame = timeframeOf(record);
      const firstIdx = num(record, 'firstIdx');
      const firstIso = frame !== null && firstIdx !== null && firstIdx >= 0 ? new Date(Date.parse(frame.startIso) + firstIdx * 60_000).toISOString() : null;
      return {
        workload: str(record, 'k8s.workload.name') ?? '',
        namespace: str(record, 'k8s.namespace.name') ?? '',
        total: num(record, 'total') ?? 0,
        firstIso,
      };
    })
    .filter((row) => row.workload !== '' && row.total > 0 && (keep.size === 0 || keep.has(row.namespace)));
}

// ------------------------------------------------------------------ B14 / B14b failing service

export function summariseFailingServices(records: readonly GrailRecord[]): Pick<NonNullable<EvidencePack['failing']>, 'envRate' | 'envRequests' | 'envFailures' | 'rows'> {
  const ranked = records.filter((record) => !isTagged(record, 'isSubject'));
  // The slot's own row (B14's `isSubject` append) joins the ranking only when it is not already in it.
  const subject = records.filter((record) => isTagged(record, 'isSubject') && !ranked.some((row) => str(row, 'id') === str(record, 'id')));
  const first = ranked[0] ?? subject[0];
  const envRequests = num(first, 'env.envRequests');
  const envFailures = num(first, 'env.envFailures');
  return {
    envRate: envRequests !== null && envFailures !== null && envRequests > 0 ? envFailures / envRequests : null,
    envRequests,
    envFailures,
    rows: [...ranked, ...subject]
      .map((record) => ({
        id: str(record, 'id') ?? '',
        name: str(record, 'name') ?? str(record, 'id') ?? '',
        requests: num(record, 'requests') ?? 0,
        failures: num(record, 'failures') ?? 0,
        failurePct: num(record, 'failurePct') ?? 0,
        excess: num(record, 'excess') ?? 0,
        timesEnv: num(record, 'timesEnv') ?? 0,
      }))
      .filter((row) => entityType(row.id) === 'SERVICE'),
  };
}

export function summariseFailingEndpoints(records: readonly GrailRecord[]): NonNullable<EvidencePack['failing']>['endpoints'] {
  return records
    .map((record) => ({
      endpoint: str(record, 'endpoint.name') ?? '',
      requests: num(record, 'requests') ?? 0,
      failures: num(record, 'failures') ?? 0,
      failurePct: num(record, 'failurePct') ?? 0,
      p50Ms: num(record, 'p50Ms'),
      p90Ms: num(record, 'p90Ms'),
    }))
    .filter((row) => row.endpoint !== '');
}

// ------------------------------------------------------------------ B16 failed requests

export function summariseFailedEndpoints(records: readonly GrailRecord[]): NonNullable<EvidencePack['failed']> | null {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  if (total === undefined) return null;
  return {
    totalRequests: num(total, 'requests') ?? 0,
    totalFailures: num(total, 'failures') ?? 0,
    rows: records
      .filter((record) => !isTagged(record, 'isTotal'))
      .map((record) => ({
        serviceId: str(record, 'id') ?? '',
        name: str(record, 'name') ?? str(record, 'id') ?? '',
        endpoint: str(record, 'endpoint.name') ?? '',
        requests: num(record, 'requests') ?? 0,
        failures: num(record, 'failures') ?? 0,
        ratePct: num(record, 'ratePct'),
      }))
      .filter((row) => row.endpoint !== ''),
  };
}

// ------------------------------------------------------------------ B15 logs

export function summariseLogErrors(records: readonly GrailRecord[]): Pick<NonNullable<EvidencePack['logs']>, 'totalErrors' | 'signatures'> {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  return {
    totalErrors: num(total, 'occurrences'),
    signatures: records
      .filter((record) => !isTagged(record, 'isTotal'))
      .map((record) => {
        const origin = str(record, 'topOrigin');
        return {
          signature: printText(str(record, 'signature') ?? '', 110, 'se'),
          occurrences: num(record, 'occurrences') ?? 0,
          origins: num(record, 'origins') ?? 0,
          topOrigin: origin === null ? null : printText(origin, 80, 'se'),
        };
      }),
  };
}

// ------------------------------------------------------------------ B17 / B18 topology

export function summariseTopologyBlast(records: readonly GrailRecord[]): NonNullable<NonNullable<EvidencePack['topology']>['blast']> | null {
  const row = records[0];
  if (row === undefined) return null;
  const ids = (field: string) => list(row, field).filter((id) => entityType(id) !== null);
  return { rootType: str(row, 'rootType'), hop1Ids: ids('hop1Ids'), hop2Ids: ids('hop2Ids'), apps: ids('apps') };
}

export function summariseTopologyHubs(records: readonly GrailRecord[]): Pick<NonNullable<EvidencePack['topology']>, 'hubs' | 'services' | 'isolated' | 'dbServices'> {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  return {
    hubs: records
      .filter((record) => !isTagged(record, 'isTotal'))
      .map((record) => {
        const id = str(record, 'id') ?? '';
        return { id, name: str(record, 'entity.name') ?? id, degree: num(record, 'degree') ?? 0 };
      })
      .filter((row) => entityType(row.id) !== null),
    services: num(total, 'services'),
    isolated: num(total, 'isolated'),
    dbServices: num(total, 'dbServices'),
  };
}

// ------------------------------------------------------------------ B19 host

export function summariseHostCpu(records: readonly GrailRecord[], hostId: string): NonNullable<EvidencePack['host']> {
  const total = records.find((record) => isTagged(record, 'isTotal'));
  // B19's `isSubject` row is the host itself whether or not it is among the three hottest (3.2.7 review DQL-1).
  const ofHost = (record: GrailRecord) => !isTagged(record, 'isTotal') && str(record, 'dt.entity.host') === hostId;
  const row = records.find((record) => ofHost(record) && isTagged(record, 'isSubject')) ?? records.find(ofHost);
  return {
    id: hostId,
    name: str(row, 'name') ?? hostId,
    cpuAvg: num(row, 'cpuAvg'),
    cpuPeak: num(row, 'cpuPeak'),
    memAvg: num(row, 'memAvg'),
    fleetMedianCpu: num(total, 'medianCpu'),
    hosts: num(total, 'hosts'),
    under10: num(total, 'under10'),
  };
}

// ------------------------------------------------------------------ sec.posture (catalog)

/** The catalog's posture rows → the security part; technologies counted over critical and high only (the finding's claim). */
export function summariseSecurity(records: readonly GrailRecord[]): NonNullable<EvidencePack['security']> {
  const posture = summarisePosture(records);
  const tech = new Map<string, number>();
  for (const record of records) {
    const level = (str(record, 'level') ?? '').toUpperCase();
    const technology = str(record, 'technology');
    if (technology === null || (level !== 'CRITICAL' && level !== 'HIGH')) continue;
    tech.set(technology, (tech.get(technology) ?? 0) + (num(record, 'vulnerabilities') ?? 0));
  }
  return {
    open: posture.total,
    critical: posture.bySeverity.CRITICAL,
    high: posture.bySeverity.HIGH,
    actNow: posture.actNowCount,
    twoSignals: posture.twoSignalsCount,
    byTechnology: [...tech.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value })),
  };
}
