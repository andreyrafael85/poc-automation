import { getQuery, type CatalogId } from '../../../../queries/catalog';
import type { EvidenceQueryId } from '../types';

/**
 * The registry of the evidence queries (3.2.7, spec §4.2–4.3): the cost guards each one runs
 * under, the scope it needs, where it was validated, and a first-line signature.
 *
 * TD-08 (3.3.2): every evidence query is a catalog entry (`ev.*`; B3 is the trail's `rca.callers`),
 * which now owns its guards, scope, longest window and validation record. This registry reads them
 * from the catalog (`catalogId`) and keeps what is the deck's own: the signature and `sameTextAs`.
 *
 * The signatures give the dynamic DQL one source of truth outside the app: the visual harness
 * resolves a query text to its fixture with `identifyEvidenceQuery` (after its own `rca.callers`
 * regex), and `prints.evidence.test.ts` asserts that every signature matches exactly one builder
 * and no catalog query other than its own template. The cost guards are request fields, never DQL text.
 */

export interface EvidenceQueryMeta {
  id: EvidenceQueryId;
  /** The catalog entry that holds the text, the guards and the validation (TD-08). */
  catalogId: CatalogId;
  /** Anchored on the builder's first line(s). */
  signature: RegExp;
  /** ≤ 5 for every query. */
  scanLimitGbytes: number;
  maxResultRecords: number;
  /** The longest window the query may read; a longer one is cut to its newest part. */
  maxWindowMs: number;
  requiredScope: 'storage:events:read' | 'storage:metrics:read' | 'storage:logs:read' | 'storage:entities:read';
  validatedOn: string;
  validation: string;
  /** The text is another query's (B3 is `buildRootCallersDql`, the trail's `rca.callers`). */
  sameTextAs?: 'rca.callers';
}

/** The trail's callers query (`useRootCallers`), as the harness recognises it. */
const ROOT_CALLERS = /^timeseries \{ requests = sum\(dt\.service\.request\.count, scalar: true\)[^\n]*\n\| lookup \[fetch dt\.entity\.service \| filter id == "SERVICE-/;

/** The registry line of one evidence query: guards, scope, window and validation from its catalog entry. */
function meta(id: EvidenceQueryId, catalogId: CatalogId, signature: RegExp, sameTextAs?: 'rca.callers'): EvidenceQueryMeta {
  const entry = getQuery(catalogId);
  const timeframe = entry.timeframe;
  if (timeframe === 'global' || !('caller' in timeframe)) throw new Error(`${catalogId} must take the caller's window`);
  return {
    id,
    catalogId,
    signature,
    scanLimitGbytes: entry.guards?.scanLimitGbytes ?? 0,
    maxResultRecords: entry.guards?.maxResultRecords ?? 0,
    maxWindowMs: timeframe.maxMs,
    requiredScope: entry.requiredScope as EvidenceQueryMeta['requiredScope'],
    validatedOn: entry.validation.validatedOn,
    validation: entry.validation.notes ?? '',
    ...(sameTextAs === undefined ? {} : { sameTextAs }),
  };
}

export const EVIDENCE_QUERIES: Readonly<Record<EvidenceQueryId, EvidenceQueryMeta>> = {
  'ev.problem.events': meta('ev.problem.events', 'ev.problem.events', /^fetch dt\.davis\.events\n\| lookup \[fetch dt\.davis\.problems/),
  'ev.problem.recurrence': meta('ev.problem.recurrence', 'ev.problem.recurrence', /^fetch dt\.davis\.problems\n\| filter not\(dt\.davis\.is_duplicate\) and isNotNull\(root_cause_entity_id\)/),
  'ev.incident.callers': meta('ev.incident.callers', 'rca.callers', ROOT_CALLERS, 'rca.callers'),
  'ev.service.minutes': meta('ev.service.minutes', 'ev.service.minutes', /^timeseries \{ requests = sum\(dt\.service\.request\.count\), failures/),
  'ev.service.endpoints': meta('ev.service.endpoints', 'ev.service.endpoints', /by: \{dt\.entity\.service, endpoint\.name\}, filter: in\(/),
  'ev.service.screen': meta('ev.service.screen', 'ev.service.screen', /^timeseries \{ requests = sum\(dt\.service\.request\.count, scalar: true\), failures = sum\(dt\.service\.request\.failure_count, scalar: true\), p50 = .*by: \{endpoint\.name\}, filter: dt\.entity\.service ==.*\n\| fieldsAdd p50Ms/),
  'ev.frontend.summary': meta('ev.frontend.summary', 'ev.frontend.summary', /^timeseries \{ lcp_p75/),
  'ev.frontend.minutes': meta('ev.frontend.minutes', 'ev.frontend.minutes', /^timeseries \{ reqs = sum\(dt\.frontend\.request\.count\), errs/),
  // The spec's signature stops at `cpuReq`, which B11 shares; `cpuLim` tells them apart.
  'ev.k8s.capacity': meta('ev.k8s.capacity', 'ev.k8s.capacity', /^timeseries \{ cpu = sum\(dt\.kubernetes\.container\.cpu_usage, rollup: avg\), cpuReq = sum\(dt\.kubernetes\.container\.requests_cpu, rollup: avg\), cpuLim/),
  'ev.k8s.workloads': meta('ev.k8s.workloads', 'ev.k8s.workloads', /rollup: avg\) \}, by: \{k8s\.workload\.name, k8s\.namespace\.name\}, filter: dt\.smartscape\.k8s_cluster/),
  'ev.k8s.churn': meta('ev.k8s.churn', 'ev.k8s.churn', /^timeseries restarts = sum\(dt\.kubernetes\.container\.restarts, scalar: true\)/),
  'ev.k8s.incidentRestarts': meta('ev.k8s.incidentRestarts', 'ev.k8s.incidentRestarts', /^timeseries restarts = sum\(dt\.kubernetes\.container\.restarts\), by/),
  'ev.failing.services': meta('ev.failing.services', 'ev.failing.services', /\| fieldsAdd k = 1\n\| lookup/),
  'ev.failing.endpoints': meta('ev.failing.endpoints', 'ev.failing.endpoints', /p90 = percentile.*by: \{endpoint\.name\}, filter: dt\.entity\.service ==/),
  'ev.entity.events': meta('ev.entity.events', 'ev.entity.events', /^fetch dt\.davis\.events\n\| filter toString\(dt\.source_entity\)/),
  'ev.failed.endpoints': meta('ev.failed.endpoints', 'ev.failed.endpoints', /^timeseries \{ requests = sum\(dt\.service\.request\.count, scalar: true\), failures = sum\(dt\.service\.request\.failure_count, scalar: true\) \}, by: \{dt\.entity\.service, endpoint\.name\}\n\| filter failures > 0/),
  'ev.logs.errors': meta('ev.logs.errors', 'ev.logs.errors', /^fetch logs\n\| filter status == "ERROR"\n\| fieldsAdd signature/),
  'ev.topology.blast': meta('ev.topology.blast', 'ev.topology.blast', /^fetch dt\.entity\.service\n\| filter id ==/),
  'ev.topology.hubs': meta('ev.topology.hubs', 'ev.topology.hubs', /^fetch dt\.entity\.service\n\| fieldsAdd callers/),
  'ev.host.cpu': meta('ev.host.cpu', 'ev.host.cpu', /^timeseries \{ cpu = avg\(dt\.host\.cpu\.usage\)/),
};

const ORDER = Object.keys(EVIDENCE_QUERIES) as EvidenceQueryId[];

/**
 * The evidence ids the visual harness resolves through `identifyEvidenceQuery` and serves from its
 * fixtures (`scripts/visual/fixtures/evidenceIds.mjs` keeps the same list). B3 is not one: its text
 * is the trail's `rca.callers`, which the harness's own regex resolves first.
 */
export const DYNAMIC_EVIDENCE_IDS: readonly EvidenceQueryId[] = ORDER.filter((id) => EVIDENCE_QUERIES[id].sameTextAs === undefined);

/** The evidence query a DQL text is, by its first-line signature; null for anything else (every other catalog query included). */
export function identifyEvidenceQuery(dql: string): EvidenceQueryId | null {
  for (const id of ORDER) if (EVIDENCE_QUERIES[id].signature.test(dql)) return id;
  return null;
}
