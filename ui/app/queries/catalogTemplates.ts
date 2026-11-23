import { assumed } from '../config/assumptions';
import type { CatalogEntry, ValidationRecord } from './types';

/**
 * The parameterised catalog entries (TD-08, 3.3.2): the RCA trail's callers, the incident's own
 * logs and the evidence queries of the real-prints deck.
 *
 * Until 3.3.1 these were built at run time by `models/trailLinks.ts`, `models/rca.ts` and
 * `features/wrapup/prints/evidence/builders.ts`, outside the catalog, its contract tests and the
 * query register. Each is now a fixed template here: the ids it needs are typed parameters
 * (`queries/params.ts` validates and quotes them), its window is the reading screen's own
 * (`{ caller: true, maxMs }`, refused when longer), and its cost guards are request fields.
 *
 * The templates render to exactly the text the builders produced for the same inputs — pinned
 * byte for byte by `tests/td08.catalogParams.test.ts` against strings captured from the 3.3.1
 * code — so the live validations recorded for the builders still describe these entries. The
 * builders remain as thin wrappers over `renderCatalogDql`, because their text is also printed on
 * the analysis slides ("printed = executed").
 *
 * Merged into `CATALOG` by `queries/catalog.ts`; no module here imports the models, so the models
 * can import from the catalog without a cycle.
 */

const ENV = 'internal-lab';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** The day the builders were validated on the validation tenant (3.2.7 spec, Appendix A). */
const BUILDERS_VALIDATED = '2026-10-05';
const UNCHANGED = 'TD-08 (3.3.2): the rendered text is unchanged, byte for byte, from the 3.3.1 builder';

/** How many callers the trail lists under a database root cause. */
export const ROOT_CALLER_LIMIT = 5;
/** How many message signatures the incident-logs query lists (the totals row is extra). */
export const INCIDENT_SIGNATURE_LIMIT = assumed('windows.incidentSignatures');
/** The longest window the incident-logs query may read (3.2.3, Q6): it scans every log bucket. */
export const INCIDENT_LOG_MAX_MS = 6 * HOUR_MS;
/** At most this many entity ids scope the incident's logs (the affected and related ids together). */
export const INCIDENT_LOG_MAX_IDS = 500;
/** 3.6.1: at most this many services scope the propagation's links, and at most this many links come back. */
export const RCA_EDGE_MAX_IDS = 40;
export const RCA_EDGE_LIMIT = 200;
/** At most this many services in one per-minute evidence read (B4). */
export const MAX_SERVICE_IDS = 6;
/** The endpoint rows of the service page's read (B8) and of the failed-requests read (B16): a count of them is a floor once full. */
export const SERVICE_SCREEN_ENDPOINTS = 10;
export const FAILED_ENDPOINTS_ROWS = 8;

const evidenceWindow = (maxMs: number) => ({ caller: true as const, maxMs, label: 'timeframe.caller.evidence' });

/** The validation record of an evidence builder, as the 3.2.7 registry wrote it, plus the TD-08 note. */
const evidenceValidation = (builder: string, records: number, notes: string, scannedBytesOnDemand: number | null = null): ValidationRecord => ({
  validatedOn: BUILDERS_VALIDATED,
  environmentId: ENV,
  durationMs: null,
  scannedBytesOnDemand,
  records,
  outcome: 'ok',
  notes: `${notes} ${UNCHANGED} ${builder} validated on ${BUILDERS_VALIDATED}.`,
});

const EVIDENCE_PURPOSE_TAIL = 'read over the same entity and window as the screenshot, for its analysis slide in the real-prints deck.';

// ------------------------------------------------------------------ the RCA trail and the incident

const ROOT_CALLERS_DQL = [
  'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}',
  '| lookup [fetch dt.entity.service | filter id == {{rootId}} | fieldsAdd rootType = serviceType | expand caller = called_by[dt.entity.service] | fields caller, rootType], sourceField: dt.entity.service, lookupField: caller, prefix: "root."',
  '| filter isNotNull(root.caller)',
  '| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), rootType = root.rootType',
  '| fields id, name, requests, failures, rootType',
  '| sort failures desc, requests desc',
  `| limit ${ROOT_CALLER_LIMIT}`,
].join('\n');

const INCIDENT_IDS = 'in(dt.source_entity, array({{entityIds}}))';
// DQL entity-selector grammar (not a secret); high-entropy literal is expected.
/* eslint-disable noSecrets/no-secrets */
const INCIDENT_PG = ' or in(dt.entity.process_group, classicEntitySelector("""type(PROCESS_GROUP), toRelationship.isServiceOfProcessGroup(entityId({{serviceIds}}))"""))';
/* eslint-enable noSecrets/no-secrets */

/** The incident-logs text for one entity scope (`buildIncidentLogsDql` of 3.3.1). */
const incidentLogsDql = (scope: string) =>
  [
    'fetch logs',
    `| filter ${scope}`,
    '| filter status == "ERROR" or status == "WARN"',
    '| fieldsAdd sig = if(isNotNull(content) and content != "", substring(trim(content), from: 0, to: 110), else: "")',
    '| summarize count = count(), errors = countIf(status == "ERROR"), by:{ sig }',
    '| sort count desc',
    `| limit ${INCIDENT_SIGNATURE_LIMIT}`,
    // The exact totals over every error/warn log of the incident, as one tagged row.
    '| append [',
    '    fetch logs',
    `    | filter ${scope}`,
    '    | filter status == "ERROR" or status == "WARN"',
    '    | summarize count = count(), errors = countIf(status == "ERROR")',
    '    | fieldsAdd isTotal = true',
    '  ]',
  ].join('\n');

const ENTITY_IDS_PARAM = {
  kind: 'entityIdList',
  minItems: 1,
  maxItems: INCIDENT_LOG_MAX_IDS,
  separator: ',',
  description: "The incident's affected and related entity ids (any type), in Davis's order.",
} as const;

const INCIDENT_LOGS_VALIDATION = (notes: string): ValidationRecord => ({
  validatedOn: BUILDERS_VALIDATED,
  environmentId: ENV,
  durationMs: null,
  scannedBytesOnDemand: null,
  records: INCIDENT_SIGNATURE_LIMIT + 1,
  outcome: 'ok',
  notes:
    `${notes} Validated read-only on the lab tenant with 3.2.3 (Q6: entity-id validation, a 6-hour window, a 10 GB ceiling; ` +
    `deploy record of ${BUILDERS_VALIDATED}). Row count and scanned bytes not recorded: the row figure is the shape’s ceiling ` +
    `(the listed signatures and the totals row). ${UNCHANGED} buildIncidentLogsDql (models/rca.ts).`,
});

// ------------------------------------------------------------------ the evidence of the real-prints deck

const PROBLEM_ROW = 'fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | filter event.id == {{eventId}} | sort timestamp desc | limit 1';

const FAILING_SERIES = 'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}';
const FAILING_ENV =
  'lookup [timeseries { r = sum(dt.service.request.count, scalar: true), f = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd k = 1, envRate = toDouble(f) / r | fields k, envRate, envRequests = r, envFailures = f], sourceField: k, lookupField: k, prefix: "env."';
const FAILING_ROW =
  'fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), failurePct = round(100.0 * failures / requests, decimals: 2), excess = round(failures - requests * env.envRate, decimals: 0), timesEnv = round((toDouble(failures) / requests) / env.envRate, decimals: 1)';
const FAILING_FIELDS = 'fields id, name, requests, failures, failurePct, excess, timesEnv, env.envRequests, env.envFailures';

const HOST_SERIES = 'timeseries { cpu = avg(dt.host.cpu.usage), mem = avg(dt.host.memory.usage) }, by: {dt.entity.host}';
const HOST_ROW =
  'fieldsAdd name = entityName(dt.entity.host), cpuAvg = round(arrayAvg(cpu), decimals: 1), cpuPeak = round(arrayMax(cpu), decimals: 1), memAvg = round(arrayAvg(mem), decimals: 1), memPeak = round(arrayMax(mem), decimals: 1)';
const HOST_FIELDS = 'fields dt.entity.host, name, cpuAvg, cpuPeak, memAvg, memPeak';

const K8S_FILTER = 'filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}})';

const SERVICE_PARAM = { kind: 'entityId', entityType: 'SERVICE', description: 'A service entity id (SERVICE-…).' } as const;
const FRONTEND_PARAM = { kind: 'entityId', entityType: 'FRONTEND', description: 'An Experience Vitals frontend id (FRONTEND-…).' } as const;
const CLUSTER_PARAM = { kind: 'entityId', entityType: 'K8S_CLUSTER', description: 'A Smartscape Kubernetes cluster id (K8S_CLUSTER-…).' } as const;

export const TEMPLATE_ENTRIES = {
  'rca.callers': {
    id: 'rca.callers',
    domain: 'problems',
    purpose:
      "The callers of an incident's root-cause service with their requests and failures over the incident's own window, " +
      'so a database root cause opens the caller that failed most. Also the evidence of the root-cause screenshot (B3).',
    dql: ROOT_CALLERS_DQL,
    params: { rootId: { ...SERVICE_PARAM, description: "The incident's root-cause service (SERVICE-…)." } },
    shape: 'table',
    visualization: 'RCA trail links and the root-cause analysis slide',
    requiredScope: 'storage:metrics:read',
    // The trail reads the incident window (≤ 6 h); the deck's B3 reads W (≤ 7 h).
    timeframe: { caller: true, maxMs: 7 * HOUR_MS, label: 'timeframe.caller.incident' },
    guards: { scanLimitGbytes: 1, maxResultRecords: ROOT_CALLER_LIMIT },
    validation: evidenceValidation(
      'buildRootCallersDql (models/trailLinks.ts), which the deck also ran as ev.incident.callers (A2),',
      4,
      'Validated on the validation tenant: metrics and the entity model, 0 bytes; 4 callers of the DATABASE_SERVICE root, easyTradeManager 341 failures of 12,344 requests, then 14, 3 and 1.',
      0,
    ),
  },

  // 3.6.1 (the propagation v4, approved with the v5 proposal on 2026-11-21: "validar as consultas novas da propagação
  // com estimativa de custo antes"): who calls whom among the incident's affected services, from the entity model.
  'rca.edges': {
    id: 'rca.edges',
    domain: 'problems',
    purpose:
      "The calls between an incident's affected services (and its root cause), read from the entity model, so the " +
      'propagation draws each hop from the service it reached — never a link the platform did not record.',
    dql: [
      'fetch dt.entity.service',
      '| filter in(id, array({{serviceIds}}))',
      '| expand callee = calls[dt.entity.service]',
      '| filter in(callee, array({{serviceIds}}))',
      '| fields from = toString(id), to = toString(callee)',
      `| limit ${RCA_EDGE_LIMIT}`,
    ].join('\n'),
    params: {
      serviceIds: {
        kind: 'entityIdList',
        minItems: 1,
        maxItems: RCA_EDGE_MAX_IDS,
        separator: ',',
        description: "The incident's root cause and affected services (SERVICE-…).",
      },
    },
    shape: 'table',
    visualization: 'RCA propagation graph (the links between hops)',
    requiredScope: 'storage:entities:read',
    timeframe: { caller: true, maxMs: 7 * HOUR_MS, label: 'timeframe.caller.incident' },
    guards: { scanLimitGbytes: 1, maxResultRecords: RCA_EDGE_LIMIT },
    validation: {
      validatedOn: '2026-11-21',
      environmentId: ENV,
      durationMs: 197,
      scannedBytesOnDemand: 0,
      records: 3,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant with the owner\'s approval (v5 proposal) after a 0 B estimate (entity model, zero-rated): ' +
        'over four services (easyTradeManager, OrderController and two callees) it returned the 3 calls among them, 0 bytes scanned, 4 records read, 197 ms.',
    },
  },

  'rca.incident.logs': {
    id: 'rca.incident.logs',
    domain: 'logs',
    purpose:
      "The selected incident's own error and warning logs, scoped to its affected and related entities over its padded window, " +
      'summarised by message signature with one exact totals row. Used when no affected entity is a service.',
    dql: incidentLogsDql(INCIDENT_IDS),
    params: { entityIds: ENTITY_IDS_PARAM },
    shape: 'table',
    visualization: 'Incident log signatures (RCA page, Tech Wrapup and the logs print)',
    requiredScope: 'storage:logs:read',
    timeframe: { caller: true, maxMs: INCIDENT_LOG_MAX_MS, label: 'timeframe.caller.incident' },
    guards: { scanLimitGbytes: 10, maxResultRecords: INCIDENT_SIGNATURE_LIMIT + 1 },
    validation: INCIDENT_LOGS_VALIDATION('The scope without services (no process-group selector).'),
  },

  'rca.incident.logs.services': {
    id: 'rca.incident.logs.services',
    domain: 'logs',
    purpose:
      "The selected incident's own error and warning logs, scoped to its affected and related entities and to the process groups " +
      'of its affected services, over its padded window, summarised by message signature with one exact totals row.',
    dql: incidentLogsDql(`${INCIDENT_IDS}${INCIDENT_PG}`),
    params: {
      entityIds: ENTITY_IDS_PARAM,
      serviceIds: {
        kind: 'entityIdList',
        entityType: 'SERVICE',
        minItems: 1,
        maxItems: INCIDENT_LOG_MAX_IDS,
        separator: ',',
        description: "The incident's affected services (SERVICE-…), whose process groups wrote their logs.",
      },
    },
    shape: 'table',
    visualization: 'Incident log signatures (RCA page, Tech Wrapup and the logs print)',
    requiredScope: 'storage:logs:read',
    timeframe: { caller: true, maxMs: INCIDENT_LOG_MAX_MS, label: 'timeframe.caller.incident' },
    guards: { scanLimitGbytes: 10, maxResultRecords: INCIDENT_SIGNATURE_LIMIT + 1 },
    validation: INCIDENT_LOGS_VALIDATION('The scope with services (entity ids or their process groups).'),
  },

  'ev.problem.events': {
    id: 'ev.problem.events',
    domain: 'problems',
    purpose: `The Dynatrace Intelligence events grouped in one problem, then the problem row itself (users, event count, impact, status), ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch dt.davis.events',
      `| lookup [${PROBLEM_ROW} | expand eid = dt.davis.event_ids | fields eid], sourceField: event.id, lookupField: eid, prefix: "p."`,
      '| filter isNotNull(p.eid)',
      '| dedup event.id, sort: {timestamp desc}',
      '| fieldsAdd source = toString(dt.source_entity), sourceName = coalesce(dt.entity.service.name, dt.entity.application.name), detail = substring(event.description, from: 0, to: 160), writtenAt = timestamp',
      '| fields event.id, event.name, event.category, event.start, event.end, writtenAt, source, sourceName, detail',
      '| sort event.start asc',
      '| limit 12',
      `| append [${PROBLEM_ROW} | fieldsAdd isProblem = true, users = toLong(dt.davis.affected_users_count), eventCount = arraySize(dt.davis.event_ids), impact = dt.davis.impact_level, problemStatus = event.status, severity = event.severity, pStart = event.start, pEnd = event.end | fields isProblem, users, eventCount, impact, problemStatus, severity, pStart, pEnd]`,
    ].join('\n'),
    params: { eventId: { kind: 'eventId', description: "The problem's Davis event.id." } },
    shape: 'table',
    visualization: 'Problem analysis slide (timeline of the grouped events)',
    requiredScope: 'storage:events:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 2, maxResultRecords: 13 },
    validation: evidenceValidation('B1', 6, 'A1: 5 events and the problem row of P-260914359 (users 52, CLOSED), all written 23:11:55Z; window 21:57–00:09Z.'),
  },

  'ev.problem.recurrence': {
    id: 'ev.problem.recurrence',
    domain: 'problems',
    purpose: `The root causes with most problems, this root's own problems with their median and p90 duration, and the totals of the window, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch dt.davis.problems',
      '| filter not(dt.davis.is_duplicate) and isNotNull(root_cause_entity_id)',
      '| dedup event.id, sort: {timestamp desc}',
      '| summarize problems = count(), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, rankName = takeFirst(root_cause_entity_name), by: {rootId = root_cause_entity_id}',
      '| sort problems desc',
      '| limit 3',
      '| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) and root_cause_entity_id == {{rootId}} | dedup event.id, sort: {timestamp desc} | summarize problems = count(), closed = countIf(event.status == "CLOSED"), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, p90Min = percentile(toLong(resolved_problem_duration), 90) / 60000000000 | fieldsAdd isAnchor = true]',
      '| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | dedup event.id, sort: {timestamp desc} | summarize problems = count(), rootCaused = countIf(isNotNull(root_cause_entity_id)), medianMin = median(toLong(resolved_problem_duration)) / 60000000000 | fieldsAdd isTotal = true]',
    ].join('\n'),
    params: { rootId: { kind: 'entityId', description: "The problem's root-cause entity id (any type)." } },
    shape: 'table',
    visualization: 'Problem analysis slide (recurrence)',
    requiredScope: 'storage:events:read',
    timeframe: evidenceWindow(16 * DAY_MS),
    guards: { scanLimitGbytes: 5, maxResultRecords: 5 },
    validation: evidenceValidation(
      'B2',
      5,
      'A9 over 7 days (the connector caps at 7; the app reads 15): root 6 problems, rank 1, 3.0× the next; 2,505 problems, 22 root-caused. Row count not recorded: the figure is the shape’s ceiling (three ranked roots, the anchor row and the totals row).',
    ),
  },

  'ev.service.minutes': {
    id: 'ev.service.minutes',
    domain: 'services',
    purpose: `Requests, failures and p90 response time per minute of up to six services, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { requests = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count), p90 = percentile(dt.service.request.response_time, 90) }, by: {dt.entity.service}, filter: in(dt.entity.service, array({{serviceIds}})), interval: 1m',
      '| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), req = arraySum(requests), fail = arraySum(failures)',
      '| fields id, name, timeframe, interval, requests, failures, p90, req, fail',
    ].join('\n'),
    params: {
      serviceIds: {
        kind: 'entityIdList',
        entityType: 'SERVICE',
        minItems: 1,
        maxItems: MAX_SERVICE_IDS,
        separator: ', ',
        description: 'The services to read (SERVICE-…), already de-duplicated, at most six.',
      },
    },
    shape: 'timeseries',
    visualization: 'Root-cause and problem analysis slides (per-minute chart)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 6 },
    validation: evidenceValidation('B4', 2, 'A3 over W, 1 minute: 70 points per service; TradeManagement 38,248 / 351, easyTradeManager 12,344 / 341.'),
  },

  'ev.service.endpoints': {
    id: 'ev.service.endpoints',
    domain: 'services',
    purpose: `Requests, failures and failure rate per endpoint of one service, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}, filter: in(dt.entity.service, array({{serviceId}}))',
      '| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)',
      '| fields id, name, endpoint.name, requests, failures, ratePct',
      '| sort failures desc, requests desc',
      '| limit 10',
    ].join('\n'),
    params: { serviceId: SERVICE_PARAM },
    shape: 'table',
    visualization: 'Root-cause analysis slide (endpoints)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 10 },
    validation: evidenceValidation('B5', 10, 'A4 over W: GetPackages 166 / 5,776, GetProducts 165 / 5,775. Row count not recorded: the figure is the shape’s ceiling.'),
  },

  'ev.service.screen': {
    id: 'ev.service.screen',
    domain: 'services',
    purpose: `The numbers the service page shows: endpoints by median response time and one totals row, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == {{serviceId}}',
      '| fieldsAdd p50Ms = round(p50 / 1000, decimals: 2), failurePct = round(100.0 * failures / requests, decimals: 2)',
      '| fields endpoint.name, requests, failures, failurePct, p50Ms',
      '| sort p50Ms desc',
      `| limit ${SERVICE_SCREEN_ENDPOINTS}`,
      '| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), avgRt = avg(dt.service.request.response_time, scalar: true), p50All = percentile(dt.service.request.response_time, 50, scalar: true) }, filter: dt.entity.service == {{serviceId}} | fieldsAdd isTotal = true, failurePct = round(100.0 * failures / requests, decimals: 2), avgMs = round(avgRt / 1000, decimals: 1), p50Ms = round(p50All / 1000, decimals: 2)]',
    ].join('\n'),
    params: { serviceId: SERVICE_PARAM },
    shape: 'table',
    visualization: 'Service screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 12 },
    validation: evidenceValidation('B8', 11, 'A13 over now-30m resolved to 31 min: 6,004 requests, 7 failures, avg 485.9 ms, p50 2.78 ms. Row count not recorded: the figure is the shape’s ceiling (ten endpoints and the totals row).'),
  },

  'ev.frontend.summary': {
    id: 'ev.frontend.summary',
    domain: 'experience',
    purpose: `Core Web Vitals, errors, users and sessions of the real users of one frontend, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { lcp_p75 = percentile(dt.frontend.web.page.largest_contentful_paint, 75, scalar: true), inp_p75 = percentile(dt.frontend.web.page.interaction_to_next_paint, 75, scalar: true), cls_x10k_p75 = percentile(dt.frontend.web.page.cumulative_layout_shift, 75, scalar: true), ttfb_p75 = percentile(dt.frontend.web.navigation.time_to_first_byte, 75, scalar: true), reqs = sum(dt.frontend.request.count, scalar: true), errs = sum(dt.frontend.error.count, scalar: true), ua_p75 = percentile(dt.frontend.user_action.duration, 75, scalar: true), users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true), sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true) }, filter: dt.smartscape.frontend == toSmartscapeId({{frontendId}}) and dt.rum.user_type == "real_user"',
      '| fieldsAdd cls = cls_x10k_p75 / 10000.0, errorsPer100 = round(100.0 * errs / reqs, decimals: 2)',
    ].join('\n'),
    params: { frontendId: FRONTEND_PARAM },
    shape: 'table',
    visualization: 'Frontend screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: evidenceValidation('B6', 1, 'A5 over W (INP 4,978.8 ms) and A6 over the problem window: 30 users, 46 sessions — the screen’s numbers.'),
  },

  'ev.frontend.minutes': {
    id: 'ev.frontend.minutes',
    domain: 'experience',
    purpose: `Real-user requests and errors per minute of one frontend, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { reqs = sum(dt.frontend.request.count), errs = sum(dt.frontend.error.count) }, filter: dt.smartscape.frontend == toSmartscapeId({{frontendId}}) and dt.rum.user_type == "real_user", interval: 1m',
      '| fieldsAdd totalReqs = arraySum(reqs), totalErrs = arraySum(errs)',
      '| fields timeframe, interval, reqs, errs, totalReqs, totalErrs',
    ].join('\n'),
    params: { frontendId: FRONTEND_PARAM },
    shape: 'timeseries',
    visualization: 'Frontend screenshot analysis slide (per-minute chart)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: evidenceValidation('B7', 1, 'A7 over W, 1 minute: errors per minute peak 81 at 22:54 against a median of 3.'),
  },

  'ev.k8s.capacity': {
    id: 'ev.k8s.capacity',
    domain: 'kubernetes',
    purpose: `CPU and memory used, requested and limited against what the nodes can allocate, for one Kubernetes cluster, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      `timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), cpuLim = sum(dt.kubernetes.container.limits_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg), memLim = sum(dt.kubernetes.container.limits_memory, rollup: avg) }, ${K8S_FILTER}, interval: 5m`,
      '| fieldsAdd cpuUsedCores = arrayAvg(cpu) / 1000, cpuReqCores = arrayAvg(cpuReq) / 1000, cpuLimCores = arrayAvg(cpuLim) / 1000, memUsedGiB = arrayAvg(mem) / 1073741824, memReqGiB = arrayAvg(memReq) / 1073741824, memLimGiB = arrayAvg(memLim) / 1073741824',
      '| fields cpuUsedCores, cpuReqCores, cpuLimCores, memUsedGiB, memReqGiB, memLimGiB',
      `| append [timeseries { cpuA = sum(dt.kubernetes.node.cpu_allocatable, rollup: avg), memA = sum(dt.kubernetes.node.memory_allocatable, rollup: avg) }, ${K8S_FILTER}, interval: 5m | fieldsAdd cpuAllocCores = arrayAvg(cpuA) / 1000, memAllocGiB = arrayAvg(memA) / 1073741824, isAllocatable = true | fields isAllocatable, cpuAllocCores, memAllocGiB]`,
    ].join('\n'),
    params: { clusterId: CLUSTER_PARAM },
    shape: 'table',
    visualization: 'Kubernetes cluster screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 2 },
    validation: evidenceValidation('B10', 2, 'A8 over now-30m: ard-dynatrace-gcp-monitor 15.8 / 13.7 / 31.1 cores and 55.2 / 55.2 / 58.5 GiB, as the reference print.'),
  },

  'ev.k8s.workloads': {
    id: 'ev.k8s.workloads',
    domain: 'kubernetes',
    purpose: `Use against request per workload of one Kubernetes cluster, the largest memory reservations first, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg) }, by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 5m',
      '| fieldsAdd cpuAvg = arrayAvg(cpu), cpuReqAvg = arrayAvg(cpuReq), memAvg = arrayAvg(mem), memReqAvg = arrayAvg(memReq)',
      '| fieldsAdd memOfReqPct = round(100.0 * memAvg / memReqAvg, decimals: 1), cpuOfReqPct = round(100.0 * cpuAvg / cpuReqAvg, decimals: 1), memReqGiB = round(memReqAvg / 1073741824, decimals: 2), memUsedGiB = round(memAvg / 1073741824, decimals: 2)',
      '| fields k8s.workload.name, k8s.namespace.name, memOfReqPct, cpuOfReqPct, memReqGiB, memUsedGiB',
      '| sort memReqGiB desc',
      '| limit 8',
    ].join('\n'),
    params: { clusterId: CLUSTER_PARAM },
    shape: 'table',
    visualization: 'Kubernetes cluster screenshot analysis slide (workloads)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 8 },
    validation: evidenceValidation('B11', 8, 'A8b over now-30m: 8 workloads; kafka-broker at 117.5 % of its memory request.'),
  },

  'ev.k8s.churn': {
    id: 'ev.k8s.churn',
    domain: 'kubernetes',
    purpose: `Container restarts per workload of one Kubernetes cluster, out-of-memory kills beside them, and the restart total, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      `timeseries restarts = sum(dt.kubernetes.container.restarts, scalar: true), by: {k8s.workload.name, k8s.namespace.name}, ${K8S_FILTER}`,
      '| filter restarts > 0',
      `| lookup [timeseries oom = sum(dt.kubernetes.container.oom_kills, scalar: true), by: {k8s.workload.name}, ${K8S_FILTER}], sourceField: k8s.workload.name, lookupField: k8s.workload.name, prefix: "x."`,
      '| fields k8s.workload.name, k8s.namespace.name, restarts, oomKills = x.oom',
      '| sort restarts desc',
      '| limit 5',
      `| append [timeseries { restarts = sum(dt.kubernetes.container.restarts, scalar: true) }, ${K8S_FILTER} | fieldsAdd isTotal = true]`,
    ].join('\n'),
    params: { clusterId: CLUSTER_PARAM },
    shape: 'table',
    visualization: 'Kubernetes cluster screenshot analysis slide (churn)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(25 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 6 },
    validation: evidenceValidation(
      'B12',
      6,
      'A8c over 24 h: sqs-demo 669 restarts and 257 OOM kills; 1,522 restarts in total. Row count not recorded: the figure is the shape’s ceiling (five workloads and the totals row).',
    ),
  },

  'ev.k8s.incidentRestarts': {
    id: 'ev.k8s.incidentRestarts',
    domain: 'kubernetes',
    purpose: `Container restarts per minute and workload of one Kubernetes cluster during the incident, with the first restarting minute, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries restarts = sum(dt.kubernetes.container.restarts), by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId({{clusterId}}), interval: 1m',
      '| fieldsAdd total = arraySum(restarts)',
      '| filter total > 0',
      '| fieldsAdd firstIdx = arrayIndexOf(iCollectArray(if(restarts[] > 0, 1, else: 0)), 1)',
      '| fields k8s.workload.name, k8s.namespace.name, total, firstIdx, timeframe',
      '| sort total desc',
      '| limit 10',
    ].join('\n'),
    params: { clusterId: CLUSTER_PARAM },
    shape: 'table',
    visualization: 'Kubernetes cluster screenshot analysis slide (restarts in the incident)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 10 },
    validation: evidenceValidation(
      'B13',
      10,
      'A8d over W, 1 minute: pricing-service (easytrade) 2 restarts, first at 23:01. Row count not recorded: the figure is the shape’s ceiling.',
    ),
  },

  'ev.failing.services': {
    id: 'ev.failing.services',
    domain: 'services',
    purpose: `The services with most failures in excess of the environment rate, and the screenshot's own service as a tagged row, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      FAILING_SERIES,
      '| filter requests >= 500 and failures > 0',
      '| fieldsAdd k = 1',
      `| ${FAILING_ENV}`,
      `| ${FAILING_ROW}`,
      '| sort failures - requests * env.envRate desc, id asc',
      '| limit 5',
      `| ${FAILING_FIELDS}`,
      `| append [${[`${FAILING_SERIES}, filter: dt.entity.service == {{serviceId}}`, 'filter requests >= 500 and failures > 0', 'fieldsAdd k = 1', FAILING_ENV, `${FAILING_ROW}, isSubject = true`, `${FAILING_FIELDS}, isSubject`].join(' | ')}]`,
    ].join('\n'),
    params: { serviceId: SERVICE_PARAM },
    shape: 'table',
    visualization: 'Failing-service screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(92 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 6 },
    validation: evidenceValidation(
      'B14',
      6,
      'A10 over 24 h: BrokerService 218 / 78,818, excess 196, 10.1× the environment; datadog-agent excess 144. 2026-10-06 on the lab tenant with the isSubject append: EasyTravelWebserver:9079 (9th by excess) returned as its own row, 197.1× the environment. Row count not recorded: the figure is the shape’s ceiling (five services and the subject row).',
    ),
  },

  'ev.failing.endpoints': {
    id: 'ev.failing.endpoints',
    domain: 'services',
    purpose: `Failures, failure rate and latency per endpoint of the failing service, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true), p90 = percentile(dt.service.request.response_time, 90, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == {{serviceId}}',
      '| fieldsAdd failurePct = round(100.0 * failures / requests, decimals: 2), p50Ms = round(p50 / 1000, decimals: 1), p90Ms = round(p90 / 1000, decimals: 1)',
      '| fields endpoint.name, requests, failures, failurePct, p50Ms, p90Ms',
      '| sort failures desc',
      '| limit 6',
    ].join('\n'),
    params: { serviceId: SERVICE_PARAM },
    shape: 'table',
    visualization: 'Failing-service screenshot analysis slide (endpoints)',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(92 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 6 },
    validation: evidenceValidation(
      'B14b',
      6,
      'A15 over 24 h: GET v1/instrument 86 / 16,727; POST v1/trade/long/process 3.01 %, p50 6,682.5 ms. Row count not recorded: the figure is the shape’s ceiling.',
    ),
  },

  'ev.entity.events': {
    id: 'ev.entity.events',
    domain: 'problems',
    purpose: `The Dynatrace Intelligence events on one entity, as their source or among the affected, counted by category with the latest start, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch dt.davis.events',
      '| filter toString(dt.source_entity) == {{entityId}} or in({{entityId}}, affected_entity_ids)',
      '| dedup event.id, sort: {timestamp desc}',
      '| summarize events = count(), byCategory = collectDistinct(event.category), last = max(event.start), names = collectDistinct(event.name)',
    ].join('\n'),
    params: { entityId: { kind: 'entityId', description: 'The entity of the screenshot (any type).' } },
    shape: 'table',
    visualization: 'Failing-service screenshot analysis slide (Dynatrace Intelligence events)',
    requiredScope: 'storage:events:read',
    timeframe: evidenceWindow(25 * HOUR_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: evidenceValidation('B9', 1, 'A14 over 24 h: 8 events on BrokerService (ERROR, SLOWDOWN), the last at 18:02Z.'),
  },

  'ev.failed.endpoints': {
    id: 'ev.failed.endpoints',
    domain: 'services',
    purpose: `The endpoints with most failed requests in the screenshot's window, and the request and failure totals, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}',
      '| filter failures > 0',
      '| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)',
      '| fields id, name, endpoint.name, requests, failures, ratePct',
      '| sort failures desc, requests desc',
      `| limit ${FAILED_ENDPOINTS_ROWS}`,
      '| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd isTotal = true]',
    ].join('\n'),
    shape: 'table',
    visualization: 'Failed-requests screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 9 },
    validation: evidenceValidation(
      'B16',
      9,
      'A11 over 2 h: 284 failed of 832,433; flagd EventStream 12 / 12. Row count not recorded: the figure is the shape’s ceiling (eight endpoints and the totals row).',
    ),
  },

  'ev.logs.errors': {
    id: 'ev.logs.errors',
    domain: 'logs',
    purpose: `The most frequent ERROR log signatures with digits folded, where they come from, and the ERROR total, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch logs',
      '| filter status == "ERROR"',
      '| fieldsAdd signature = substring(replacePattern(replaceString(content, "\\n", " "), "DIGIT+", "#"), from: 0, to: 110), origin = coalesce(k8s.namespace.name, dt.process.name, log.source, "n/a")',
      '| summarize occurrences = count(), origins = countDistinct(origin), topOrigin = takeMax(origin), by: {signature}',
      '| sort occurrences desc',
      '| limit 6',
      '| append [fetch logs | filter status == "ERROR" | summarize occurrences = count() | fieldsAdd isTotal = true]',
    ].join('\n'),
    shape: 'table',
    visualization: 'Logs screenshot analysis slide',
    requiredScope: 'storage:logs:read',
    // Requested over at most 2 h by the planner; 6 h is the guard of every logs read over all buckets.
    timeframe: evidenceWindow(6 * HOUR_MS),
    guards: { scanLimitGbytes: 5, maxResultRecords: 7 },
    validation: evidenceValidation(
      'B15',
      7,
      'A12 over 2 h at a 5 GB cap: 15,126 ERROR logs; 4 signatures × 2,754 (a cascade). Row count not recorded: the figure is the shape’s ceiling (six signatures and the totals row).',
    ),
  },

  'ev.topology.blast': {
    id: 'ev.topology.blast',
    domain: 'topology',
    purpose: `The services up to two hops above the root cause and the frontends at the top, counted by id, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch dt.entity.service',
      '| filter id == {{rootId}}',
      '| fieldsAdd rootType = serviceType',
      '| expand hop1 = called_by[dt.entity.service]',
      '| lookup [fetch dt.entity.service | fields id, entity.name, up = called_by[dt.entity.service], apps = called_by[dt.entity.application]], sourceField: hop1, lookupField: id, prefix: "h1."',
      '| expand hop2 = h1.up',
      '| lookup [fetch dt.entity.service | fields id, entity.name, apps = called_by[dt.entity.application]], sourceField: hop2, lookupField: id, prefix: "h2."',
      '| summarize rootType = takeAny(rootType), hop1 = countDistinct(hop1), hop2 = countDistinct(hop2), hop1Ids = collectDistinct(hop1), hop2Ids = collectDistinct(hop2), appsNested = collectArray(arrayConcat(coalesce(h1.apps, array()), coalesce(h2.apps, array())))',
      '| fieldsAdd apps = arrayDistinct(arrayFlatten(appsNested))',
      '| fieldsAdd appCount = arraySize(apps)',
      '| fieldsRemove appsNested',
    ].join('\n'),
    params: { rootId: { ...SERVICE_PARAM, description: "The incident's root-cause service (SERVICE-…)." } },
    shape: 'table',
    visualization: 'Smartscape screenshot analysis slide (blast radius)',
    requiredScope: 'storage:entities:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: evidenceValidation('B17', 1, 'A16: DATABASE_SERVICE root; 4 direct callers, 2 entry services, 1 frontend.'),
  },

  'ev.topology.hubs': {
    id: 'ev.topology.hubs',
    domain: 'topology',
    purpose: `The services with most connections in the entity model, and the totals of the model, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      'fetch dt.entity.service',
      '| fieldsAdd callers = coalesce(arraySize(called_by[dt.entity.service]), 0), callees = coalesce(arraySize(calls[dt.entity.service]), 0)',
      '| fieldsAdd degree = callers + callees',
      '| fields id, entity.name, serviceType, callers, callees, degree',
      '| sort degree desc',
      '| limit 5',
      '| append [fetch dt.entity.service | fieldsAdd d = coalesce(arraySize(called_by[dt.entity.service]), 0) + coalesce(arraySize(calls[dt.entity.service]), 0) | summarize services = count(), isolated = countIf(d == 0), dbServices = countIf(serviceType == "DATABASE_SERVICE") | fieldsAdd isTotal = true]',
    ].join('\n'),
    shape: 'table',
    visualization: 'Smartscape screenshot analysis slide (hubs)',
    requiredScope: 'storage:entities:read',
    timeframe: evidenceWindow(31 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 6 },
    validation: evidenceValidation('B18', 6, 'A17: 94 services, 29 isolated, 7 database services; two BrokerService hubs told apart by id. Row count not recorded: the figure is the shape’s ceiling (five hubs and the totals row).'),
  },

  'ev.host.cpu': {
    id: 'ev.host.cpu',
    domain: 'infrastructure',
    purpose: `The hosts with the highest CPU peak, the screenshot's own host as a tagged row, and the fleet median, ${EVIDENCE_PURPOSE_TAIL}`,
    dql: [
      `${HOST_SERIES}, interval: 5m`,
      `| ${HOST_ROW}`,
      `| ${HOST_FIELDS}`,
      '| sort cpuPeak desc',
      '| limit 3',
      `| append [${HOST_SERIES}, filter: dt.entity.host == {{hostId}}, interval: 5m | ${HOST_ROW}, isSubject = true | ${HOST_FIELDS}, isSubject]`,
      '| append [timeseries cpu = avg(dt.host.cpu.usage), by: {dt.entity.host}, interval: 5m | fieldsAdd c = arrayAvg(cpu) | summarize hosts = count(), medianCpu = median(c), under10 = countIf(c < 10) | fieldsAdd isTotal = true]',
    ].join('\n'),
    params: { hostId: { kind: 'entityId', entityType: 'HOST', description: 'The host of the screenshot (HOST-…).' } },
    shape: 'table',
    visualization: 'Host screenshot analysis slide',
    requiredScope: 'storage:metrics:read',
    timeframe: evidenceWindow(7 * DAY_MS),
    guards: { scanLimitGbytes: 1, maxResultRecords: 5 },
    validation: evidenceValidation(
      'B19',
      5,
      'Evidence lens Q20 (not re-run in the synthesis): ip-172-31-93-120 at 75.7 % CPU on average, 33× the fleet median. 2026-10-06 on the lab tenant over 2 h with the isSubject append: HOST-F91F108503DD0BA8 (not in the top 3) returned at 7.3 % / 41.6 %, 29 hosts, median 3.4 %. Row count not recorded: the figure is the shape’s ceiling (the three hottest hosts, the subject row and the fleet row).',
    ),
  },
  // 3.6.9 (the owner: "Seguir com a 3.6.9 com suas recomendações"): the indicators of the SLOs the PoC Builder creates,
  // one per service the SE picks. The app does not run them: the platform's SLO service evaluates them on the tenant.
  // Validated on the lab on 2026-11-22 for one service (easyTradeManager) at 0 B: a series of 100 % per minute each.
  'slo.availability': {
    id: 'slo.availability',
    domain: 'services',
    purpose:
      'The indicator of an availability SLO the SE creates on the PoC Builder: the share of a service’s requests without ' +
      'a failure, per minute — the form the platform’s SLO app writes. Evaluated by the platform, not read by this app.',
    dql: [
      'timeseries { total = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count) }, by: { dt.entity.service }, filter: { dt.entity.service == {{serviceId}} }',
      '| fieldsAdd sli = (total[] - failures[]) / total[] * 100',
      '| fieldsAdd entityName(dt.entity.service)',
      '| fieldsRemove total, failures',
    ].join('\n'),
    params: { serviceId: { ...SERVICE_PARAM, description: 'The service the SLO is about (SERVICE-…).' } },
    shape: 'timeseries',
    visualization: 'SLO indicator (evaluated by the platform)',
    requiredScope: 'storage:metrics:read',
    timeframe: { caller: true, maxMs: 7 * DAY_MS, label: 'timeframe.caller.slo' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 177,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 2 hours, one service): metrics, 0 bytes, one series of ' +
        '100 % per minute. An SLO with this indicator was created on the lab, read back and removed the same day.',
    },
  },

  'slo.performance': {
    id: 'slo.performance',
    domain: 'services',
    purpose:
      'The indicator of a performance SLO the SE creates on the PoC Builder: the share of minutes whose mean response ' +
      'time stays within 1 second for a service — the form the platform’s SLO app writes. Evaluated by the platform.',
    dql: [
      'timeseries total = avg(dt.service.request.response_time, default: 0), by: { dt.entity.service }, filter: { dt.entity.service == {{serviceId}} }',
      '| fieldsAdd high = iCollectArray(if(total[] > 1000000, total[]))',
      '| fieldsAdd low = iCollectArray(if(total[] <= 1000000, total[]))',
      '| fieldsAdd highRespTimes = iCollectArray(if(isNull(high[]), 0, else: 1))',
      '| fieldsAdd lowRespTimes = iCollectArray(if(isNull(low[]), 0, else: 1))',
      '| fieldsAdd sli = 100 * (lowRespTimes[] / (lowRespTimes[] + highRespTimes[]))',
      '| fieldsAdd entityName(dt.entity.service)',
      '| fieldsRemove total, high, low, highRespTimes, lowRespTimes',
    ].join('\n'),
    params: { serviceId: { ...SERVICE_PARAM, description: 'The service the SLO is about (SERVICE-…).' } },
    shape: 'timeseries',
    visualization: 'SLO indicator (evaluated by the platform)',
    requiredScope: 'storage:metrics:read',
    timeframe: { caller: true, maxMs: 7 * DAY_MS, label: 'timeframe.caller.slo' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 177,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 2 hours, one service): metrics, 0 bytes, one series of ' +
        '100 % per minute. A filter on the request duration inside the count returned nothing (not a dimension), so the ' +
        'indicator follows the platform SLO app’s own form; the line of 1 s is the app’s services.latency.attention.',
    },
  },
  // 3.7.0 (the owner: "seguir com a ação customizada na próxima release"): the problem the PoC triage workflow action reads
  // when a workflow hands it the problem's event id — the same fields as rca.top, so the incident parses as on the RCA page.
  'triage.problem': {
    id: 'triage.problem',
    domain: 'problems',
    purpose:
      'The problem a workflow hands to the PoC triage action (its event id from the trigger): name, category, status, root ' +
      'cause, affected and related entities and the Kubernetes context, as the RCA page reads them — the latest record of it.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| filter event.id == {{problemId}}',
      '| sort timestamp desc',
      '| limit 1',
      '| fieldsAdd affectedCount = arraySize(affected_entity_names)',
      '| fieldsAdd durationNs = coalesce(resolved_problem_duration, now() - event.start)',
      '| fields displayId = display_id, name = event.name, category = event.category,',
      '    status = event.status, severity = event.severity, impact = dt.davis.impact_level,',
      '    affectedNames = affected_entity_names, affectedTypes = affected_entity_types,',
      '    relatedNames = related_entity_names, affectedIds = affected_entity_ids,',
      '    relatedIds = related_entity_ids, rootCauseName = root_cause_entity_name,',
      '    rootCauseId = root_cause_entity_id, eventId = event.id, start = event.start,',
      '    end = event.end, durationNs, affectedCount,',
      '    cluster = k8s.cluster.name, namespace = k8s.namespace.name,',
      '    workload = k8s.workload.name',
    ].join('\n'),
    params: { problemId: { kind: 'eventId', description: "The problem's event id, as the workflow's problem trigger hands it." } },
    shape: 'table',
    visualization: 'PoC triage workflow action (its e-mail summary)',
    requiredScope: 'storage:events:read',
    // A problem a workflow just saw open or change has a record of the last day, even when it began weeks before.
    timeframe: { caller: true, maxMs: DAY_MS, label: 'timeframe.caller.triage' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 47,
      scannedBytesOnDemand: 20976792,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 24 hours, one open CPU-saturation problem that began 20 ' +
        'days before): 0.015 GiB, one row with its root cause and affected host — the latest record of a long problem is ' +
        'inside the day. Re-run with the duplicate filter the same day: 0.020 GiB in 47 ms, the same row.',
    },
  },
} satisfies Record<string, CatalogEntry>;
