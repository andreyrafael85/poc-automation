import { assumed } from '../config/assumptions';
import { CAPACITY_THRESHOLDS } from '../models/capacity';
import { GIB_PER_HOST_UNIT } from '../models/licensing';
import { TEMPLATE_ENTRIES } from './catalogTemplates';
import { renderOrNull } from './params';
import type { Catalog, CatalogEntry, CatalogParamValues } from './types';
import { withMeasuredCosts } from './measuredCosts';

/**
 * The DQL catalog.
 *
 * Every entry was executed against a real Dynatrace environment before being
 * allowed to back a visualization, and carries the platform's own accounting of
 * that execution in `validation`. Cost figures come from
 * `QUERY_EXECUTION_EVENT` (`scanned_bytes.on_demand`), not from an estimate.
 *
 * Conventions applied to every query, per DQL best practices:
 *   fetch (bucket-scoped, scan-limited) -> filter -> fields -> summarize -> sort
 * Timeframes travel as `defaultTimeframeStart` / `defaultTimeframeEnd` request
 * fields. No query string is ever built by concatenating user input.
 */

/**
 * Label for the environment these queries were validated against.
 *
 * Deliberately not the real environment id. An environment id identifies a
 * specific tenant, and this repository is meant to be reusable across
 * engagements, so the concrete id belongs in the delivery record rather than in
 * source control. What matters for traceability is that validation happened
 * against a real environment on a stated date, which is preserved here.
 */
const ENV = 'internal-lab';
const VALIDATED_ON = '2026-08-31';

/** A problem pattern is "recurring" from this many occurrences; an "automation candidate" from the second number. */
/**
 * What a row says when Davis named no root cause (3.3.1, backlog Q12). A literal, not a null, so
 * the patterns without a cause group together instead of scattering — and so the table can say
 * which they are. `utils/sentinels.ts` translates it at the moment it is displayed.
 */
export const CAUSE_NOT_NAMED = 'Cause not named by Davis';

const RECURRING_MIN = assumed('problems.recurring.pattern');
const CANDIDATE_MIN = assumed('problems.recurring.candidate');

/**
 * Ceiling for a grouped list whose cardinality the platform bounds (technology versions,
 * billing capabilities, frontends, Grail tables, cloud resource types). There is no `limit`
 * on these, so every total the app sums from them is exact; the ceiling only replaces the
 * API's silent default of 1,000 rows with a number no real estate reaches, and a result that
 * ever fills it is labelled as cut off (see `resultCap`).
 */
export const BOUNDED_LIST_CEILING = 10_000;

/** A query run live against the validation tenant on the stated date. */
const liveValidation = (validatedOn: string, records: number, notes: string) => ({
  validatedOn,
  environmentId: ENV,
  durationMs: null,
  scannedBytesOnDemand: null,
  records,
  outcome: 'ok' as const,
  notes,
});

/**
 * A query the platform does not bill by scanned bytes (3.3.1, backlog TD-17/Q14).
 *
 * Measured on the lab tenant on 2026-11-03: `dt.system.events` and `timeseries` (the metric store)
 * both reported **0 scanned bytes** on every read, across six queries — the same 0 the entity model
 * reports. These entries used to carry `scannedBytesOnDemand: null`, which `useCatalogQuery` reads
 * as "cost unknown" and so gave them the shortest cache lifetime of all, re-running the cheapest
 * queries in the catalog most often.
 */
const zeroRatedValidation = (records: number, notes: string) => ({
  validatedOn: '2026-11-03',
  environmentId: ENV,
  durationMs: null,
  scannedBytesOnDemand: 0,
  records,
  outcome: 'ok' as const,
  notes,
});

/** Entity queries read the topology model and scan no Grail bytes at all. */
const entityValidation = (records: number, durationMs: number | null, notes?: string) => ({
  validatedOn: VALIDATED_ON,
  environmentId: ENV,
  durationMs,
  scannedBytesOnDemand: 0,
  records,
  outcome: 'ok' as const,
  notes: notes ?? 'Entity model query: 0 bytes scanned, no on-demand cost.',
});

/**
 * The rows of the vulnerability list: the most that `sec.vulnerabilities` returns. The page
 * and the report read this number to say "top N of TOTAL", and a test pins it to the `limit`
 * in the DQL below, so the two cannot drift.
 */
export const VULNERABILITY_LIST_LIMIT = 500;

/** Rows in the per-host capacity list: the largest hosts by memory. */
export const CAPACITY_LIST_LIMIT = 200;

/**
 * The shared head of both security queries: one row per open, non-muted vulnerability at its
 * latest state. `sec.posture` aggregates it (exact totals over every vulnerability) and
 * `sec.vulnerabilities` lists the highest-risk ones; sharing the text means the two cannot
 * disagree about what "open" means.
 */
const VULNERABILITY_ROLLUP = [
  'fetch security.events',
  '| filter event.provider == "Dynatrace"',
  '| filter in(event.type, {"VULNERABILITY_STATE_REPORT_EVENT",',
  '    "VULNERABILITY_STATUS_CHANGE_EVENT", "VULNERABILITY_TRACKING_LINK_CHANGE_EVENT"})',
  '    and event.level == "ENTITY"',
  '| dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}',
  '| summarize {',
  '    title = takeFirst(vulnerability.title),',
  '    cve = takeFirst(vulnerability.references.cve),',
  '    stack = takeAny(vulnerability.stack),',
  '    score = round(takeMax(if(vulnerability.mute.status != "MUTED", vulnerability.risk.score, else:0)), decimals:1),',
  '    muteStatuses = collectDistinct(vulnerability.mute.status),',
  '    resolutionStatuses = collectDistinct(vulnerability.resolution.status),',
  '    functionStatuses = collectDistinct(vulnerability.davis_assessment.vulnerable_function_status),',
  '    exposureStatuses = collectDistinct(vulnerability.davis_assessment.exposure_status),',
  '    exploitStatuses = collectDistinct(vulnerability.davis_assessment.exploit_status),',
  '    entityNames = collectDistinct(affected_entity.name)',
  '  }, by: {vulnerability.display_id, vulnerability.id}',
  '| fieldsAdd resolutionStatus = if(in("OPEN", resolutionStatuses), "OPEN", else:"RESOLVED"),',
  '    muteStatus = if(in("NOT_MUTED", muteStatuses), "NOT_MUTED", else:"MUTED"),',
  '    level = if(score >= 9, "CRITICAL", else:if(score >= 7, "HIGH",',
  '        else:if(score >= 4, "MEDIUM", else:if(score >= 0.1, "LOW", else:"NONE")))),',
  '    functionStatus = if(in("IN_USE", functionStatuses), "IN_USE", else:"NOT_IN_USE"),',
  '    exposureStatus = if(in("PUBLIC_NETWORK", exposureStatuses), "PUBLIC_NETWORK", else:"NOT_PUBLIC"),',
  '    exploitStatus = if(in("AVAILABLE", exploitStatuses), "AVAILABLE", else:"NOT_AVAILABLE")',
  '| filter resolutionStatus == "OPEN" and muteStatus != "MUTED"',
];

/**
 * Every monitored entity category in one call. `cov.inventory` reads it over the app's window and
 * `cov.inventory.day0` over the PoC's first day (3.2.5), so "Day 0 → today" compares like with like.
 */
const INVENTORY_DQL = [
      'fetch dt.entity.host | summarize value = count() | fieldsAdd category = "Hosts"',
      '| append [ fetch dt.entity.service | summarize value = count() | fieldsAdd category = "Services" ]',
      '| append [ fetch dt.entity.application | summarize value = count() | fieldsAdd category = "Web applications" ]',
      '| append [ fetch dt.entity.mobile_application | summarize value = count() | fieldsAdd category = "Mobile applications" ]',
      '| append [ fetch dt.entity.process_group_instance | summarize value = count() | fieldsAdd category = "Process instances" ]',
      '| append [ fetch dt.entity.kubernetes_cluster | summarize value = count() | fieldsAdd category = "Kubernetes clusters" ]',
      '| append [ fetch dt.entity.cloud_application | summarize value = count() | fieldsAdd category = "Kubernetes workloads" ]',
      // Browser and HTTP monitors are two entity types; the category counts both (3.2.3), and two
      // rows carry the split. Consumers read categories by name and never sum every row.
      '| append [ fetch dt.entity.synthetic_test | fields id | append [ fetch dt.entity.http_check | fields id ]',
      '    | summarize value = count() | fieldsAdd category = "Synthetic monitors" ]',
      '| append [ fetch dt.entity.synthetic_test | summarize value = count() | fieldsAdd category = "Synthetic monitors (browser)" ]',
      '| append [ fetch dt.entity.http_check | summarize value = count() | fieldsAdd category = "Synthetic monitors (HTTP)" ]',
      '| fields category, value',
    ].join('\n');

/**
 * `sec.context` (3.2.5): the same rollup as the two security queries, with the vulnerable component
 * and the services and workloads related to each vulnerability added to its summary. The extra
 * fields come from the platform's vulnerability-event schema; where a tenant does not fill them
 * they read as empty lists, never as an error.
 */
const VULNERABILITY_CONTEXT = VULNERABILITY_ROLLUP.flatMap((line) =>
  line.startsWith('    entityNames = collectDistinct(')
    ? [
        '    components = collectDistinct(affected_entity.vulnerable_component.short_name),',
        '    servicesNested = collectArray(related_entities.services.names),',
        '    workloadsNested = collectArray(related_entities.kubernetes_workloads.names),',
        line,
      ]
    : [line],
);

const catalogEntries = {
  // ---------------------------------------------------------------- coverage
  'cov.inventory': {
    id: 'cov.inventory',
    domain: 'coverage',
    purpose:
      'Single-call inventory of every monitored entity category, so the opening ' +
      'screen states scope before it states any conclusion.',
    dql: INVENTORY_DQL,
    shape: 'table',
    visualization: 'SingleValueGrid / DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: liveValidation(
      '2026-10-04',
      10,
      'Returned 8 categories plus the synthetic split. Mobile applications legitimately 0 - rendered as an explicit gap, never as a zero KPI. ' +
        '3.2.3: synthetic monitors counted only browser monitors; on the validation tenant 67 = 42 browser + 25 HTTP (dt.entity.http_check). Entity model, 0 bytes.',
    ),
  },

  'cov.buckets': {
    id: 'cov.buckets',
    domain: 'coverage',
    purpose:
      'Retention, volume and readability per bucket. `has_access` is the ' +
      'authoritative source for the permission column of the coverage matrix.',
    dql: [
      'fetch dt.system.buckets',
      '| fields name, table = `dt.system.table`, retentionDays = retention_days,',
      '    includedQueryDays = included_query_days, records,',
      '    bytes = estimated_uncompressed_bytes, hasAccess = has_access',
      '| sort bytes desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:buckets:read',
    timeframe: 'global',
    validation: entityValidation(
      39,
      null,
      'Returned 39 buckets. 10 reported has_access=false, which is surfaced as an explicit permission gap rather than hidden.',
    ),
  },

  'cov.hosts.breakdown': {
    id: 'cov.hosts.breakdown',
    domain: 'coverage',
    purpose:
      'Monitoring-mode and cloud distribution across hosts, to show instrumentation ' +
      'depth instead of a bare host count.',
    dql: [
      'fetch dt.entity.host',
      '| summarize hosts = count(), by:{osType, cloudType, monitoringMode}',
      '| sort hosts desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable / CategoricalBarChart',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      7,
      211,
      'A large share of hosts report a null monitoringMode. This is presented as an absent attribute, not as an unmonitored host.',
    ),
  },

  'cov.hosts.table': {
    id: 'cov.hosts.table',
    domain: 'infrastructure',
    purpose: 'Host inventory with capacity and placement attributes for the technical audience.',
    dql: [
      'fetch dt.entity.host',
      '| fields id, name = entity.name, osType, osVersion, cloudType, monitoringMode,',
      '    cpuCores, memoryTotal, hostGroupName, networkZone, state',
      '| sort name asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: 500 },
    validation: entityValidation(67, null, 'Returned 67 hosts.'),
  },

  'cov.dataobjects': {
    id: 'cov.dataobjects',
    domain: 'coverage',
    purpose:
      'Full list of queryable Grail data objects. Backs the technical appendix so ' +
      'reviewers can see what the environment exposes beyond what this app reads.',
    dql: 'fetch dt.system.data_objects\n| fields name\n| sort name asc',
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:buckets:read',
    timeframe: 'global',
    guards: { maxResultRecords: 1000 },
    validation: entityValidation(60, null, 'Truncated at 60 during validation; the environment exposes considerably more.'),
  },

  // ---------------------------------------------------------------- problems
  'prob.summary': {
    id: 'prob.summary',
    domain: 'problems',
    purpose:
      'Problem mix by category and lifecycle status, Dynatrace Intelligence duplicates excluded. ' +
      'Pinned to 7 days so the problem figures always describe the same window.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| summarize problems = count(), by:{event.category, event.status}',
      '| sort problems desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'CategoricalBarChart / DataTable',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: 1455,
      scannedBytesOnDemand: 469784341,
      records: 8,
      outcome: 'ok',
      notes:
        'Measured via QUERY_EXECUTION_EVENT: 469.8 MB on-demand across 3 bucket shards, 1455 ms. ' +
        'Dominant cost in the app - cached and never widened past 7 days by default.',
    },
  },

  'prob.recurrent': {
    id: 'prob.recurrent',
    domain: 'problems',
    purpose:
      'Recurring problem patterns, keyed by the entity Dynatrace Intelligence blamed as well as the problem name. ' +
      'Recurrence is the honest argument for automation: the same problem returning on the same ' +
      'thing is measured, not asserted.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      `| fieldsAdd rootCause = if(isNull(root_cause_entity_name), "${CAUSE_NOT_NAMED}", else: root_cause_entity_name)`,
      '| summarize occurrences = count(), lastSeen = max(timestamp),',
      '    frequentEvent = countIf(dt.davis.is_frequent_event),',
      '    by:{event.name, event.category, rootCause}',
      `| filter occurrences >= ${RECURRING_MIN}`,
      '| sort occurrences desc',
      '| limit 25',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable / TopList',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 25,
      outcome: 'ok',
      notes:
        '3.3.1 (backlog Q12): the root-cause entity joins the key. Measured on 2026-11-03 over 7 d: keyed by ' +
        'name and category alone there were 25 patterns, and "Failure rate increase" showed as ONE pattern of 59 ' +
        'occurrences - it is really 32 with no cause named, 8 on TradeManagement and 7 on easytrade_offer_service, ' +
        'three different things wearing one label. With the entity in the key: 31 patterns, named causes such as ' +
        'TradeManagement, easytrade_offer_service and LoanConsumer finally visible. The worst pattern is 318 either ' +
        'way, because Davis names no cause for it: on this tenant most problems have none, so they group under an ' +
        'explicit sentinel instead of a null. Shares the 7-day problem scan with prob.summary; duplicates excluded.',
    },
  },

  'prob.recurrent.total': {
    id: 'prob.recurrent.total',
    domain: 'problems',
    purpose:
      'Exact count of recurring problem patterns: how many distinct problem names repeated at least ' +
      'twice, how many repeated often enough (five or more) to be worth a workflow, and the problems ' +
      'they account for. Counted over every pattern, not the 25 most frequent.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      `| fieldsAdd rootCause = if(isNull(root_cause_entity_name), "${CAUSE_NOT_NAMED}", else: root_cause_entity_name)`,
      '| summarize occurrences = count(), by:{event.name, event.category, rootCause}',
      `| summarize patterns = countIf(occurrences >= ${RECURRING_MIN}),`,
      `    candidates = countIf(occurrences >= ${CANDIDATE_MIN}),`,
      `    recurringVolume = sum(if(occurrences >= ${RECURRING_MIN}, occurrences, else:0)),`,
      '    allVolume = sum(occurrences),',
      '    worst = max(occurrences)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: '2026-11-03',
      environmentId: ENV,
      durationMs: 119,
      scannedBytesOnDemand: 308986213,
      records: 1,
      outcome: 'ok',
      notes:
        '3.3.1 (backlog Q12): same key as prob.recurrent, so the totals describe the list. Measured over 7 d: ' +
        '31 patterns (was 25 before the root-cause entity joined the key), 23 worth a workflow, 1,500 of 1,538 ' +
        'problems inside a recurring pattern, worst 318, and 9 of the 31 patterns have a cause Davis named. ' +
        'Counted over every pattern, not the 25 the list shows.',
    },
  },

  'prob.list': {
    id: 'prob.list',
    domain: 'problems',
    purpose:
      'Problem detail with the Smartscape entities Dynatrace Intelligence itself attached. Backs the ' +
      '"what happened / what was affected / what evidence" narrative.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| fields displayId = display_id, name = event.name, category = event.category,',
      '    status = event.status, severity = event.severity, start = event.start, end = event.end,',
      '    durationNs = resolved_problem_duration, impactLevel = dt.davis.impact_level,',
      '    affected = affected_entity_names, affectedTypes = affected_entity_types,',
      '    related = related_entity_names, cluster = k8s.cluster.name,',
      '    namespace = k8s.namespace.name, workload = k8s.workload.name,',
      '    underMaintenance = maintenance.is_under_maintenance,',
      '    analysisReady = dt.analysis.ready, description = event.description',
      '| sort start desc',
      '| limit 100',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable with expandable rows',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25, maxResultRecords: 100 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 100,
      outcome: 'ok',
      notes:
        'Schema confirmed on a real record: smartscape.affected_entities / related_entities, ' +
        'dt.davis.impact_level and a markdown event.description are all populated by the platform.',
    },
  },

  'prob.timeline': {
    id: 'prob.timeline',
    domain: 'problems',
    purpose:
      'Problem arrival grouped by the time each problem began, to show whether the ' +
      'environment is improving or degrading.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| summarize problems = count(), by:{interval = bin(event.start, 6h)}',
      '| sort interval asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'TimeseriesChart (from binned table)',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 40,
      outcome: 'ok',
      notes:
        'A first attempt using makeTimeseries with a status_transition filter returned an almost entirely null ' +
        'series and was discarded. Binning on event.start returns a dense distribution. Buckets can predate the ' +
        'window because a problem active in the window may have started earlier - the UI states this explicitly ' +
        'rather than silently clipping it.',
    },
  },

  // 3.6.4 (v6, the status rows; the owner approved the read with its estimate, ~0.4 GiB, on 2026-11-22): the problems
  // of the pinned 7 days by category and the 3-hour slot each began in, one row per problem.
  'prob.status.rows': {
    id: 'prob.status.rows',
    domain: 'problems',
    purpose:
      'Problems by category and the 3-hour slot each began in, with how many of them are still open — the status rows of ' +
      'Dynatrace Intelligence, one bar per slot. One row per problem (duplicates and repeated records left out).',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| dedup event.id, sort: {timestamp desc}',
      '| summarize problems = count(), open = countIf(event.status == "ACTIVE"), by: {category = event.category, slot = bin(event.start, 3h)}',
      '| sort category asc, slot asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Status rows (bars per 3-hour slot)',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    // Grouped by category and slot, both bounded by the platform and the window: no limit, the rows may be added up.
    guards: { scanLimitGbytes: 3, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 77,
      scannedBytesOnDemand: 285552035,
      records: 205,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 7 days) after a 0.08–1.7 GiB estimate the owner approved: ' +
        '0.27 GiB scanned, 205 rows over four categories (AVAILABILITY, ERROR, RESOURCE_CONTENTION, SLOWDOWN). Slots can ' +
        'predate the window (a problem still open that began earlier); the rows draw only the window and say so.',
    },
  },

  'prob.mttx': {
    id: 'prob.mttx',
    domain: 'problems',
    purpose:
      'Mean, median and 90th-percentile time to resolve per problem category, plus ' +
      'total accumulated problem time. This is the measured MTTR of the environment.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| filter event.status == "CLOSED" and isNotNull(resolved_problem_duration)',
      '| summarize problems = count(),',
      '    mttrNs = avg(resolved_problem_duration),',
      '    medianNs = percentile(resolved_problem_duration, 50),',
      '    p90Ns = percentile(resolved_problem_duration, 90),',
      '    totalNs = sum(resolved_problem_duration),',
      '    by:{event.category}',
      '| sort totalNs desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'SingleValue row + DataTable',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 4,
      outcome: 'ok',
      notes:
        'Durations are returned as raw nanoseconds and formatted in the UI. An earlier version divided ' +
        'inside DQL to get hours and silently truncated to integers (11 instead of 11.5), because ' +
        'resolved_problem_duration is a long. Keeping the native unit and formatting client-side avoids ' +
        'the whole class of problem. Real values observed: MTTR 11.5 h for ERROR, 18.9 h for ' +
        'RESOURCE_CONTENTION, with medians well under an hour - most problems close quickly and a ' +
        'long tail drags the mean up.',
    },
  },

  'prob.exposure': {
    id: 'prob.exposure',
    domain: 'problems',
    purpose:
      'Currently open problems and the time they have accumulated while open. This is ' +
      'the observed basis for any operational-exposure statement.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| filter event.status == "ACTIVE"',
      '| fieldsAdd openNs = now() - event.start',
      '| summarize activeProblems = count(),',
      '    totalOpenNs = sum(openNs),',
      '    avgOpenNs = avg(openNs),',
      '    oldestOpenNs = max(openNs)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'SingleValue tiles',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 1,
      outcome: 'ok',
      notes:
        'Observed: 110 open problems accumulating 18,247 problem-hours, the oldest open for 1,419 hours ' +
        '(59 days). Open time is computed against now(), so it grows until the problem closes. ' +
        'These hours are an observation; converting them into money requires a rate the user supplies.',
    },
  },

  // 3.7.3 (the owner: "custo por hora de problema aberto e de indisponibilidade … somente para alertas que contenham RCA"):
  // the operational cost counts only problems whose root cause Dynatrace Intelligence named — a real problem with a cause,
  // not a false positive. The MTTR and the counts keep reading every problem (`prob.mttx`, `prob.exposure`).
  'prob.exposure.rca': {
    id: 'prob.exposure.rca',
    domain: 'problems',
    purpose:
      'Open problems with a root cause named by Dynatrace Intelligence and the time they have accumulated while open — ' +
      'the basis of the cost per hour of an open problem.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| filter event.status == "ACTIVE"',
      '| filter isNotNull(root_cause_entity_id)',
      '| fieldsAdd openNs = now() - event.start',
      '| summarize activeProblems = count(),',
      '    totalOpenNs = sum(openNs),',
      '    avgOpenNs = avg(openNs),',
      '    oldestOpenNs = max(openNs)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Cost basis',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 288249597,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated on the lab tenant over 7 days: 1 of the 109 open problems has a named root cause (of 1,438 problems, 76 ' +
        'have one) — the cost no longer counts problems without a cause.',
    },
  },

  'prob.mttx.rca': {
    id: 'prob.mttx.rca',
    domain: 'problems',
    purpose:
      'Resolved problems with a root cause named by Dynatrace Intelligence, per category, with their total time — the basis ' +
      'of the cost of resolved problem time and of downtime.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| filter event.status == "CLOSED" and isNotNull(resolved_problem_duration)',
      '| filter isNotNull(root_cause_entity_id)',
      '| summarize problems = count(),',
      '    mttrNs = avg(resolved_problem_duration),',
      '    medianNs = percentile(resolved_problem_duration, 50),',
      '    p90Ns = percentile(resolved_problem_duration, 90),',
      '    totalNs = sum(resolved_problem_duration),',
      '    by:{event.category}',
      '| sort totalNs desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Cost basis',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 288249597,
      records: 4,
      outcome: 'ok',
      notes: 'Validated on the lab tenant over 7 days: 4 categories (ERROR 40, SLOWDOWN 19, AVAILABILITY and RESOURCE_CONTENTION) of resolved problems with a named root cause.',
    },
  },

  'prob.topentities': {
    id: 'prob.topentities',
    domain: 'problems',
    purpose:
      'Entities appearing in the most problems. Answers "where is the pain concentrated" ' +
      'without needing a topology graph.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| expand affected = affected_entity_names',
      '| summarize problems = count(),',
      '    categories = countDistinctExact(event.category),',
      '    lastSeen = max(timestamp),',
      '    by:{affected}',
      '| sort problems desc',
      '| limit 15',
    ].join('\n'),
    shape: 'table',
    visualization: 'CategoricalBarChart + DataTable',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 469784341,
      records: 15,
      outcome: 'ok',
      notes:
        'Uses expand on the affected_entity_names array, so a problem affecting several entities counts ' +
        'once per entity. That is intended here - the question is which entity is involved most often, ' +
        'not how many problems exist. Real top entity observed with 344 problems in 7 days.',
    },
  },

  'prob.topentities.total': {
    id: 'prob.topentities.total',
    domain: 'problems',
    purpose:
      'Exact count of distinct entities that Dynatrace Intelligence attached to a problem, and the problem-entity ' +
      'links they account for. The ranked list shows only the 15 most affected.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| expand affected = affected_entity_names',
      '| summarize entities = countDistinctExact(affected), problems = count()',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25 },
    validation: liveValidation(
      '2026-10-04',
      1,
      'Validated live on the validation tenant over 7 d: 134 distinct affected entities across 2,818 problem-entity links (the list showed 15).',
    ),
  },

  // ------------------------------------------------------- problems & RCA
  'rca.top': {
    id: 'rca.top',
    domain: 'problems',
    purpose:
      'The most impactful problems of the last 15 days, ranked so the War Room can ' +
      'open on the single incident that best demonstrates Dynatrace Intelligence root-cause analysis: ' +
      'root-caused first, then by breadth of affected entities, then by duration. ' +
      'Carries the full Dynatrace Intelligence detail — root-cause entity, affected/related entity ' +
      'trail, K8s context and the markdown RCA narrative — for the top few.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| fieldsAdd affectedCount = arraySize(affected_entity_names)',
      '| fieldsAdd durationNs = coalesce(resolved_problem_duration, now() - event.start)',
      '| fieldsAdd hasRootCause = if(isNotNull(root_cause_entity_name), 1, else: 0)',
      '| fieldsAdd serviceRca = if((event.category == "SLOWDOWN" or event.category == "ERROR") and isNotNull(root_cause_entity_name), 1, else: 0)',
      '| fields displayId = display_id, name = event.name, category = event.category,',
      '    status = event.status, severity = event.severity, impact = dt.davis.impact_level,',
      '    affectedNames = affected_entity_names, affectedTypes = affected_entity_types,',
      '    relatedNames = related_entity_names, affectedIds = affected_entity_ids,',
      '    relatedIds = related_entity_ids, rootCauseName = root_cause_entity_name,',
      '    rootCauseId = root_cause_entity_id, eventId = event.id, start = event.start,',
      '    end = event.end, durationNs, affectedCount, hasRootCause, serviceRca,',
      '    cluster = k8s.cluster.name, namespace = k8s.namespace.name,',
      '    workload = k8s.workload.name, description = event.description',
      '| sort serviceRca desc, hasRootCause desc, affectedCount desc, durationNs desc',
      '| limit 8',
    ].join('\n'),
    shape: 'table',
    visualization: 'War Room incident + root-cause trail',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-15d', label: 'timeframe.pinned.15d' },
    guards: { scanLimitGbytes: 40, maxResultRecords: 8 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 8,
      outcome: 'ok',
      notes:
        'Validated live via dtctl (2026-09-09): top incident P-26086733 "Response time degradation" ' +
        '(SLOWDOWN), root cause easytrade_offer_service, 5 affected services, K8s namespace easytrade, ' +
        'with a full markdown event.description RCA narrative. Ranking is deterministic and cross-tenant.',
    },
  },

  'rca.kpi': {
    id: 'rca.kpi',
    domain: 'problems',
    purpose:
      'Environment-wide problem KPIs over the 15-day RCA window: total problems, how ' +
      'many Dynatrace Intelligence root-caused automatically, how many are still active and the average ' +
      'number of entities each problem touched.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| summarize total = count(),',
      '    rootCaused = countIf(isNotNull(root_cause_entity_name)),',
      '    active = countIf(event.status == "ACTIVE"),',
      '    resolved = countIf(event.status == "CLOSED"),',
      '    avgAffected = avg(arraySize(affected_entity_names))',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'SingleValue tiles',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-15d', label: 'timeframe.pinned.15d' },
    guards: { scanLimitGbytes: 40 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated live via dtctl (2026-09-09): 9,485 problems in 15 days, 161 root-caused, 102 active.',
    },
  },

  'rca.logs': {
    id: 'rca.logs',
    domain: 'logs',
    purpose:
      'Error and warning log volume by Kubernetes namespace over the last 6 hours, in every ' +
      'readable log bucket, as the corroborating failure signal beside the RCA incident. ' +
      'Aggregate counts only — no log content, no PII.',
    dql: [
      'fetch logs',
      '| filter loglevel == "ERROR" or loglevel == "SEVERE" or loglevel == "WARN"',
      '| summarize errors = countIf(loglevel == "ERROR" or loglevel == "SEVERE"),',
      '    warnings = countIf(loglevel == "WARN"),',
      '    by:{namespace = k8s.namespace.name}',
      '| sort errors desc',
      '| limit 12',
    ].join('\n'),
    shape: 'table',
    visualization: 'Failure-by-namespace table',
    requiredScope: 'storage:logs:read',
    // 3.2.3 (C12, Q15): every readable bucket, not only default_logs; the window went from 24 h to
    // 6 h and the ceiling from 25 GB to 10 GB, because it feeds one sentence of the RCA page.
    timeframe: { relative: 'now-6h', label: 'timeframe.pinned.6h' },
    guards: { scanLimitGbytes: 10 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 10,
      outcome: 'ok',
      notes:
        'Validated live via dtctl (2026-09-09): easytrade namespace showed 498 error logs in 24h, ' +
        'matching the top RCA incident namespace — a genuine cross-signal. 3.2.3: re-validated over every ' +
        'bucket (default_logs, logs_teste, field_sets_tests on the validation tenant).',
    },
  },

  'rca.trend': {
    id: 'rca.trend',
    domain: 'problems',
    purpose:
      'A 7-day daily trend of the RCA headline numbers — problems opened, how many ' +
      'Dynatrace Intelligence root-caused and the average entities touched per day — so the key tiles ' +
      'can carry a micro-sparkline showing direction. Aggregate counts only.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| summarize opened = count(),',
      '    rootCaused = countIf(isNotNull(root_cause_entity_name)),',
      '    avgAffected = avg(arraySize(affected_entity_names)),',
      '    by:{ day = bin(event.start, 1d) }',
      '| sort day asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Sparklines under the KPI tiles',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 25, maxResultRecords: 8 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 8,
      outcome: 'ok',
      notes:
        'Validated live via dtctl (2026-09-10): 7 daily buckets, ~700–830 problems/day, ' +
        '6–19 root-caused/day, avgAffected ~1.0 — a genuine daily series for the sparklines.',
    },
  },

  'rca.catmix': {
    id: 'rca.catmix',
    domain: 'problems',
    purpose:
      'The mix of Dynatrace Intelligence problems by category over the 15-day window (availability, error, ' +
      'slowdown, resource, custom) — an executive read on what kind of problems dominate ' +
      'the environment. Aggregate counts only.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| summarize count = count(), by:{ category = event.category }',
      '| sort count desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Problem-mix bars',
    requiredScope: 'storage:events:read',
    timeframe: { relative: 'now-15d', label: 'timeframe.pinned.15d' },
    guards: { scanLimitGbytes: 40, maxResultRecords: 8 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 5,
      outcome: 'ok',
      notes:
        'Validated live via dtctl (2026-09-10): AVAILABILITY ~3.5k, ERROR ~2.7k, RESOURCE ~0.9k, ' +
        'SLOWDOWN ~0.6k, CUSTOM_ALERT ~7 — a genuine category breakdown.',
    },
  },

  // ---------------------------------------------------------------- services
  'svc.golden': {
    id: 'svc.golden',
    domain: 'services',
    purpose: 'Environment-wide request rate, failures and response time trend.',
    dql: [
      'timeseries {',
      '    requests = sum(dt.service.request.count),',
      '    failures = sum(dt.service.request.failure_count),',
      '    responseTime = avg(dt.service.request.response_time)',
      '  }, interval: 1h',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'TimeseriesChart',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      1,
      null,
      'Real values observed: ~146k-232k requests/h; failures fell from 1696/h to 18/h across the window. ' +
        'response_time is reported in microseconds by the metric.',
    ),
  },

  'svc.ranking': {
    id: 'svc.ranking',
    domain: 'services',
    purpose:
      'Per-service golden signals with a derived failure rate, to select which ' +
      'service is worth drilling into.',
    dql: [
      'timeseries {',
      '    requests = sum(dt.service.request.count),',
      '    failures = sum(dt.service.request.failure_count),',
      '    responseTime = avg(dt.service.request.response_time)',
      '  }, by:{dt.entity.service}, interval: 1h',
      '| fieldsAdd name = entityName(dt.entity.service),',
      '    totalRequests = arraySum(requests),',
      '    totalFailures = arraySum(failures),',
      '    avgResponseTimeUs = arrayAvg(responseTime)',
      '| filter totalRequests > 0',
      '| fieldsAdd failureRatePct = totalFailures * 100.0 / totalRequests',
      '| fields name, serviceId = dt.entity.service, totalRequests, totalFailures,',
      '    failureRatePct, avgResponseTimeUs',
      '| sort totalRequests desc',
      '| limit 50',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      10,
      null,
      'entityName() resolves service ids to names in-query. failureRatePct is a derived field and is labelled as derived in the UI.',
    ),
  },

  'svc.ranking.total': {
    id: 'svc.ranking.total',
    domain: 'services',
    purpose:
      'Exact service counts over every service that handled traffic: how many, how many had at ' +
      'least one failure, how many are above the 1% review line, and the request-weighted response ' +
      'time. The ranked list shows only the 50 busiest.',
    dql: [
      'timeseries {',
      '    requests = sum(dt.service.request.count),',
      '    failures = sum(dt.service.request.failure_count),',
      '    responseTime = avg(dt.service.request.response_time)',
      '  }, by:{dt.entity.service}, interval: 1h',
      '| fieldsAdd totalRequests = arraySum(requests), totalFailures = arraySum(failures),',
      '    avgResponseTimeUs = arrayAvg(responseTime)',
      '| filter totalRequests > 0',
      '| summarize services = count(),',
      '    failing = countIf(totalFailures > 0),',
      '    aboveOnePct = countIf(totalFailures * 100.0 / totalRequests > 1),',
      '    weightedResponseUs = sum(avgResponseTimeUs * totalRequests) / sum(totalRequests)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 72 services with traffic, 23 with failures, 5 above 1%, 144 ms request-weighted response time. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'svc.breakdown': {
    id: 'svc.breakdown',
    domain: 'services',
    purpose: 'Service mix by type and instrumentation technology - what the platform detected on its own.',
    dql: [
      'fetch dt.entity.service',
      '| summarize services = count(), by:{serviceType, agentTechnologyType}',
      '| sort services desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable / CategoricalBarChart',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(13, 112, 'Returned 13 type/technology combinations across 71 services.'),
  },

  'svc.topology': {
    id: 'svc.topology',
    domain: 'topology',
    purpose:
      'Service dependency attributes and database bindings, read from the entity ' +
      'model. No inferred or decorative edges.',
    dql: [
      'fetch dt.entity.service',
      '| fields id, name = entity.name, serviceType, technologies = softwareTechnologies,',
      '    databaseVendor, databaseName, databaseHosts = databaseHostNames,',
      '    isExternal = isExternalService, publicDomain = publicDomainName, port',
      '| sort name asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable (hierarchical)',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: 300 },
    validation: entityValidation(
      71,
      null,
      'Relationship record fields (calls / called_by / runs_on) exist on the entity but are not rendered as a graph: ' +
        'no official Strato topology-graph component was confirmed, so dependencies are shown tabularly. ' +
        'Topology comes from the entity model plus the Smartscape arrays Davis attaches to problems. ' +
        '(The note that smartscape.nodes and smartscape.edges had been rejected outright was written ' +
        'before 3.2.1: the app does declare storage:smartscape:read and does read smartscapeNodes in ' +
        'cloud.services and lic.k8spods. Moving this entry to Smartscape is backlog TD-16/R17, not a ' +
        'platform refusal.)',
    ),
  },

  'svc.topology.total': {
    id: 'svc.topology.total',
    domain: 'topology',
    purpose:
      'Exact service-topology counts over every service: how many exist, how many are bound to a ' +
      'data store (and how many distinct database vendors that spans), how many are external and how ' +
      'many are publicly reachable. The list is capped at 300 services by name.',
    dql: [
      'fetch dt.entity.service',
      '| summarize services = count(),',
      '    withDatabase = countIf(isNotNull(databaseVendor)),',
      '    external = countIf(isExternalService == true),',
      '    publicDomain = countIf(isNotNull(publicDomainName)),',
      '    vendors = countDistinctExact(databaseVendor)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      1,
      null,
      'Validated live on the validation tenant: 71 services, 3 bound to a database, 6 external, 0 with a public domain. Entity model query, no Grail scan.',
    ),
  },

  'svc.topology.mix': {
    id: 'svc.topology.mix',
    domain: 'topology',
    purpose:
      'What the service topology is made of, counted over every service: the most common service ' +
      'types, technologies, database vendors and public domains. One row per entry, tagged with its ' +
      'tier, so the Smartscape view never describes only an alphabetical slice of the estate.',
    dql: [
      'fetch dt.entity.service',
      '| summarize services = count(), by:{label = serviceType}',
      '| sort services desc',
      '| limit 8',
      '| fieldsAdd tier = "type"',
      '| append [',
      '    fetch dt.entity.service',
      '    | expand tech = softwareTechnologies',
      '    | fieldsAdd family = splitString(splitString(tech, ",")[0], ":")[1]',
      '    | filter isNotNull(family)',
      '    | summarize services = countDistinctExact(id), by:{label = family}',
      '    | sort services desc',
      '    | limit 8',
      '    | fieldsAdd tier = "technology"',
      '  ]',
      '| append [',
      '    fetch dt.entity.service',
      '    | filter isNotNull(databaseVendor)',
      '    | summarize services = count(), by:{label = databaseVendor}',
      '    | sort services desc',
      '    | limit 8',
      '    | fieldsAdd tier = "database"',
      '  ]',
      '| append [',
      '    fetch dt.entity.service',
      '    | filter isNotNull(publicDomainName)',
      '    | summarize services = count(), by:{label = publicDomainName}',
      '    | sort services desc',
      '    | limit 8',
      '    | fieldsAdd tier = "domain"',
      '  ]',
    ].join('\n'),
    shape: 'table',
    visualization: 'Smartscape tiers',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      18,
      null,
      'Validated live on the validation tenant: 7 service types (39 web-request services leading), 8 technologies, 3 database vendors, no public domains. Each tier is the top 8 over all services, each count exact. Entity model query, no Grail scan.',
    ),
  },

  // ---------------------------------------------------------- infrastructure
  'svc.topology.calls': {
    id: 'svc.topology.calls',
    domain: 'topology',
    purpose:
      'Who calls what, from the Smartscape call relationships of every service: the calls between service types and ' +
      'into each database vendor and messaging system, with how many services sit on each side. Measured edges, not a drawn hierarchy.',
    dql: [
      'fetch dt.entity.service',
      '| fields id, source = serviceType, callee = calls[dt.entity.service]',
      '| expand callee',
      '| filter isNotNull(callee)',
      '| lookup [ fetch dt.entity.service | fields id, targetType = serviceType, vendor = databaseVendor ],',
      '    sourceField: callee, lookupField: id, fields: {targetType, vendor}',
      '| fieldsAdd target = if(targetType == "DATABASE_SERVICE", coalesce(vendor, "DATABASE_SERVICE"), else: targetType)',
      '| summarize calls = count(), callers = countDistinctExact(id), callees = countDistinctExact(callee),',
      '    by:{source, target, targetType}',
      '| fieldsAdd row = "link"',
      '| append [',
      '    fetch dt.entity.service',
      '    | fields id, source = serviceType, callee = calls[dt.entity.service]',
      '    | expand callee',
      '    | filter isNotNull(callee)',
      '    | summarize services = countDistinctExact(id), by:{source}',
      '    | fieldsAdd row = "caller"',
      '  ]',
      '| append [',
      '    fetch dt.entity.service',
      '    | fields id, callee = calls[dt.entity.service]',
      '    | expand callee',
      '    | filter isNotNull(callee)',
      '    | lookup [ fetch dt.entity.service | fields id, targetType = serviceType, vendor = databaseVendor ],',
      '        sourceField: callee, lookupField: id, fields: {targetType, vendor}',
      '    | fieldsAdd target = if(targetType == "DATABASE_SERVICE", coalesce(vendor, "DATABASE_SERVICE"), else: targetType)',
      '    | summarize services = countDistinctExact(callee), by:{target, targetType}',
      '    | fieldsAdd row = "callee"',
      '  ]',
      '| append [',
      '    fetch dt.entity.service',
      '    | summarize services = count(), withCalls = countIf(arraySize(calls[dt.entity.service]) > 0)',
      '    | fieldsAdd row = "total"',
      '  ]',
    ].join('\n'),
    shape: 'table',
    visualization: 'Flow map (Smartscape calls)',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    // Grouped by service types and vendors, which the platform bounds: summed by the page, so no limit.
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: liveValidation(
      '2026-10-04',
      21,
      'Validated live on the validation tenant over 24 h: 76 services, 23 with outgoing calls; 9 caller→callee type pairs ' +
        '(web request → web request 25 calls, → web service 11, → SQL Server 6, → PostgreSQL 2, queue listener → messaging 5…). ' +
        'The calls relationship is read from the entity model (0 bytes), unlike smartscapeEdges, which needs storage:smartscape:read.',
    ),
  },

  'infra.trend': {
    id: 'infra.trend',
    domain: 'infrastructure',
    purpose: 'Host CPU and memory saturation trend across the monitored estate.',
    dql: [
      'timeseries {',
      '    cpuPct = avg(dt.host.cpu.usage),',
      '    memoryPct = avg(dt.host.memory.usage)',
      '  }, interval: 1h',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'TimeseriesChart',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(1, null, 'Real values observed: CPU ~12%, memory ~24% average across hosts.'),
  },

  // ------------------------------------------------------------------- cloud
  'cloud.hosts': {
    id: 'cloud.hosts',
    domain: 'cloud',
    purpose:
      'Cloud footprint per provider: how many hosts, cores and memory Dynatrace ' +
      'attributed to each cloud, with the full-stack / infrastructure split. Only ' +
      'hosts the platform tagged with a cloud type are counted.',
    dql: [
      'fetch dt.entity.host',
      '| filter isNotNull(cloudType)',
      '| summarize hosts = count(),',
      '    cores = sum(toLong(cpuCores)),',
      '    memBytes = sum(toLong(memoryTotal)),',
      '    fullStack = countIf(monitoringMode == "FULL_STACK"),',
      '    infra = countIf(monitoringMode == "INFRASTRUCTURE"),',
      '    by:{cloudType}',
      '| sort hosts desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DonutBreakdown + provider cards',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      3,
      null,
      'Validated on the validation tenant: EC2 (AWS) 14 hosts, GOOGLE_CLOUD_PLATFORM 3, AZURE 2. Entity model query, no on-demand Grail scan.',
    ),
  },

  'cloud.hosts.detail': {
    id: 'cloud.hosts.detail',
    domain: 'cloud',
    purpose:
      'Per-host cloud inventory for the technical audience: provider, OS, size and ' +
      'monitoring mode of every cloud-attributed host.',
    dql: [
      'fetch dt.entity.host',
      '| filter isNotNull(cloudType)',
      '| fields id, name = entity.name, cloudType, osType, cpuCores,',
      '    memoryTotal, hostGroupName, monitoringMode, state',
      '| sort name asc',
      '| limit 500',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: 500 },
    validation: entityValidation(19, null, 'Returned 19 cloud-attributed hosts across AWS, GCP and Azure.'),
  },

  'cloud.services': {
    id: 'cloud.services',
    domain: 'cloud',
    purpose:
      'Which cloud services Dynatrace actually monitors, read from the Smartscape ' +
      'topology. The model folds the raw types into friendly service families but ' +
      'counts only PRIMARY managed services (Lambda, RDS, SQS, App Service, ' +
      'PostgreSQL, AKS, Apigee, ...) via an allow-list — cloud inventory/CSPM ' +
      'objects (configurations, patch results, IAM, security groups, network ' +
      'interfaces, volumes, backups) and compute hosts are excluded, so the count ' +
      'reflects genuine monitored services, not raw topology nodes.',
    dql: [
      'smartscapeNodes "*"',
      '| filter startsWith(type, "AWS_") or startsWith(type, "AZURE_") or startsWith(type, "GOOGLE_") or startsWith(type, "GCP_")',
      '| summarize resources = count(), by:{type}',
      '| sort resources desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Monitored cloud services by provider and family',
    requiredScope: 'storage:smartscape:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: entityValidation(
      100,
      33,
      'Validated live via dtctl on the validation tenant (2026-09-09). Smartscape topology read (0 Grail bytes). Raw feed ' +
        'returns 167 AWS/Azure types (8,744 nodes) dominated by CSPM inventory; the model allow-list folds this ' +
        'to 39 genuine monitored service families / 440 primary resources (AWS 367, Azure 73). GCP services use a ' +
        'separate cloud feed and are not present as GCP_/GOOGLE_ smartscape nodes on this tenant.',
    ),
  },

  // ------------------------------------------------------------- licensing
  'lic.hosts': {
    id: 'lic.hosts',
    domain: 'consumption',
    purpose:
      'Every monitored host grouped by monitoring mode and Host-Unit band (memory in 16 GiB steps), ' +
      'the input the licence sizer turns into Classic Host Units and the DPS host footprint. Counted ' +
      'in the query over all hosts, so a large estate is never cut off. Entity model only, no scan.',
    dql: [
      'fetch dt.entity.host',
      `| fieldsAdd huBucket = ceil(toDouble(memoryTotal) / ${GIB_PER_HOST_UNIT * 1024 ** 3}.0)`,
      '| summarize hosts = count(), memoryBytes = sum(toDouble(memoryTotal)), by:{monitoringMode, huBucket}',
      '| sort hosts desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Sizing model (not rendered directly)',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      6,
      null,
      'Validated live on the validation tenant (2026-10-03): 77 hosts in 6 groups (13 full-stack, 4 infrastructure, 60 without a reported mode). ' +
        'Replaces a per-host list that stopped at 1,000 rows and so under-counted Host Units on a larger estate.',
    ),
  },

  'lic.k8spods': {
    id: 'lic.k8spods',
    domain: 'consumption',
    purpose:
      'Count of monitored Kubernetes pods, the driver for the DPS Kubernetes ' +
      'Platform pod-hour estimate. Smartscape topology read, no Grail scan.',
    dql: [
      'smartscapeNodes "K8S_POD"',
      '| summarize pods = count()',
    ].join('\n'),
    shape: 'table',
    visualization: 'Sizing input (not rendered directly)',
    requiredScope: 'storage:smartscape:read',
    timeframe: 'global',
    validation: entityValidation(1, 20, 'Smartscape topology read (0 Grail bytes). Returned the current monitored pod count (~6,000 on the validation tenant).'),
  },


  'lic.k8spodhours': {
    id: 'lic.k8spodhours',
    domain: 'consumption',
    purpose:
      'Kubernetes pod-hours the platform actually billed in the window, with the window it covers, ' +
      'so the annual sizing is extrapolated from measured hours instead of from a count of pods ' +
      'that happen to exist right now.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT" and event.type == "Kubernetes Platform Monitoring"',
      '| summarize podHours = sum(billed_pod_hours), windows = count(),',
      '    firstSeen = min(usage.start), lastSeen = max(usage.end)',
    ].join('\n'),
    shape: 'table',
    visualization: 'Sizing input (not rendered directly)',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-03',
      environmentId: ENV,
      durationMs: 59,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok',
      notes:
        '3.3.1 (backlog Q11). Measured over 7 d: 172,417.5 pod-hours across 40,992 fifteen-minute windows, ' +
        '0 bytes scanned. That is an average of 1,026 pods against the 1,571 `lic.k8spods` counts right now - ' +
        'annualising the snapshot gave 13,761,960 pod-hours against the 8,989,826 the measured hours ' +
        'extrapolate to, an overstatement of 53 %. `billed_pod_hours` is the platform\'s own billing field, ' +
        'per namespace and cluster, so this is what a PoC is actually charged for rather than what the app guesses.',
    },
  },

  'k8s.clusters': {
    id: 'k8s.clusters',
    domain: 'kubernetes',
    purpose: 'Cluster inventory as the entry point for Kubernetes drill-down.',
    dql: 'fetch dt.entity.kubernetes_cluster\n| fields id, name = entity.name\n| sort name asc',
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(6, 48, 'Returned 6 clusters.'),
  },

  'k8s.inventory': {
    id: 'k8s.inventory',
    domain: 'kubernetes',
    purpose:
      'The Kubernetes estate in one call: clusters, nodes, namespaces, workloads and the pods seen in the window, ' +
      'so the page opens with the size of what is monitored before it shows what restarts.',
    dql: [
      'fetch dt.entity.kubernetes_cluster | summarize value = count() | fieldsAdd kind = "clusters"',
      '| append [ fetch dt.entity.kubernetes_node | summarize value = count() | fieldsAdd kind = "nodes" ]',
      '| append [ fetch dt.entity.cloud_application_namespace | summarize value = count() | fieldsAdd kind = "namespaces" ]',
      '| append [ fetch dt.entity.cloud_application | summarize value = count() | fieldsAdd kind = "workloads" ]',
      '| append [ fetch dt.entity.cloud_application_instance | summarize value = count() | fieldsAdd kind = "pods" ]',
      '| fields kind, value',
    ].join('\n'),
    shape: 'table',
    visualization: 'Inventory tiles',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: liveValidation(
      '2026-10-04',
      5,
      'Validated live on the validation tenant over 24 h: 6 clusters, 42 nodes, 61 namespaces, 308 workloads and 4,738 pods seen (pods churn, ' +
        'so the pod count is "seen in the window", not "running now"). Entity model query, 0 bytes scanned.',
    ),
  },

  'k8s.restarts': {
    id: 'k8s.restarts',
    domain: 'kubernetes',
    purpose:
      'Workloads by container restarts. Restart churn is the most legible ' +
      'reliability signal for a mixed audience.',
    dql: [
      'timeseries restarts = sum(dt.kubernetes.container.restarts),',
      '    by:{k8s.workload.name, k8s.cluster.name}, interval: 1h',
      '| fieldsAdd total = arraySum(restarts)',
      '| filter total > 0',
      '| fields workload = k8s.workload.name, cluster = k8s.cluster.name, total',
      '| sort total desc',
      '| limit 25',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      12,
      null,
      'Validated over 24 h: 12 workloads with restarts, the highest at 2375 restarts in a single workload.',
    ),
  },

  'k8s.restarts.total': {
    id: 'k8s.restarts.total',
    domain: 'kubernetes',
    purpose:
      'Exact restart totals over every workload: how many restarted at all and how many restarts ' +
      'that adds up to, so the headline is not the sum of the 25 noisiest.',
    dql: [
      'timeseries restarts = sum(dt.kubernetes.container.restarts),',
      '    by:{k8s.workload.name, k8s.cluster.name}, interval: 1h',
      '| fieldsAdd total = arraySum(restarts)',
      '| filter total > 0',
      '| summarize workloads = count(), restarts = sum(total), worst = max(total)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 14 workloads restarting, 1,971 restarts, the worst at 654. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'k8s.restarts.trend': {
    id: 'k8s.restarts.trend',
    domain: 'kubernetes',
    purpose:
      'Container restarts and out-of-memory kills per hour across every workload, so the page shows when the ' +
      'platform restarts, not only which workload restarts most.',
    dql: [
      'timeseries {',
      '    restarts = sum(dt.kubernetes.container.restarts),',
      '    oomKills = sum(dt.kubernetes.container.oom_kills)',
      '  }, interval: 1h',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'Spectrum area chart',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 25 hourly bins, 1,765 restarts (51 to 89 per hour) and 252 OOM kills. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'k8s.pressure': {
    id: 'k8s.pressure',
    domain: 'kubernetes',
    purpose:
      'Out-of-memory kills and CPU throttling per workload - the evidence behind any ' +
      'right-sizing recommendation.',
    dql: [
      // 3.2.3 (Q9): throttling is CPU (millicores) held back by the limit. Summed over the hours it
      // had no unit a reader could use; it is now the average throttled CPU over the average limit.
      'timeseries {',
      '    oomKills = sum(dt.kubernetes.container.oom_kills),',
      '    throttled = avg(dt.kubernetes.container.cpu_throttled),',
      '    cpuLimit = avg(dt.kubernetes.container.limits_cpu)',
      '  }, by:{k8s.workload.name, k8s.cluster.name}, interval: 1h',
      '| fieldsAdd totalOom = arraySum(oomKills), throttledAvg = arrayAvg(throttled), limitAvg = arrayAvg(cpuLimit)',
      '| fieldsAdd throttledPct = if(limitAvg > 0, throttledAvg * 100.0 / limitAvg)',
      '| filter totalOom > 0 or throttledAvg > 0',
      '| fields workload = k8s.workload.name, cluster = k8s.cluster.name, totalOom, throttledAvg, throttledPct',
      '| sort totalOom desc, throttledPct desc',
      '| limit 25',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Metric keys dt.kubernetes.container.oom_kills, .cpu_throttled and .limits_cpu confirmed on the validation tenant over 24 h: sqs-demo (loan-app-dynakube) with 252 OOM kills and 85.8 of its 500 millicores throttled on average (17.2 %). Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'k8s.pressure.total': {
    id: 'k8s.pressure.total',
    domain: 'kubernetes',
    purpose:
      'Exact resource-pressure totals over every workload: how many were out-of-memory killed, how ' +
      'many were CPU-throttled and the number of OOM kills, not just the 25 worst.',
    dql: [
      'timeseries {',
      '    oomKills = sum(dt.kubernetes.container.oom_kills),',
      '    cpuThrottled = sum(dt.kubernetes.container.cpu_throttled)',
      '  }, by:{k8s.workload.name, k8s.cluster.name}, interval: 1h',
      '| fieldsAdd totalOom = arraySum(oomKills), totalThrottled = arraySum(cpuThrottled)',
      '| filter totalOom > 0 or totalThrottled > 0',
      '| summarize workloads = count(), oomKills = sum(totalOom), throttled = sum(totalThrottled),',
      '    oomWorkloads = countIf(totalOom > 0), throttledWorkloads = countIf(totalThrottled > 0)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 1 workload under pressure, 288 OOM kills, 1 OOM-killed and 1 throttled workload. Metric query, no Grail scan. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  // -------------------------------------------------------------- processes
  'proc.technologies': {
    id: 'proc.technologies',
    domain: 'processes',
    purpose:
      'Technology and runtime version inventory discovered automatically, including ' +
      'edition and version where the platform reports them.',
    dql: [
      'fetch dt.entity.process_group_instance',
      '| expand softwareTechnologies',
      '| summarize instances = count(), by:{softwareTechnologies}',
      '| sort instances desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: entityValidation(
      30,
      null,
      'Real versions surfaced, e.g. Spring Boot 3.2.0, Tomcat 10.1.16.0, Node.js 24.18.1, Kafka 3.6.0 and Java 1.8.0_292. ' +
        'Version strings are reported verbatim; no end-of-support claim is derived from them.',
    ),
  },

  // ------------------------------------------------------------- competitor
  'comp.agents': {
    id: 'comp.agents',
    domain: 'competitor',
    purpose:
      'Third-party observability and log agents running alongside OneAgent, ' +
      'discovered by the platform. Evidence for consolidation, never a claim ' +
      'against a competitor beyond what is observed.',
    dql: [
      'fetch dt.entity.process_group',
      '| fieldsAdd name = entity.name',
      '| filter (matchesPhrase(name,"datadog") or matchesPhrase(name,"newrelic") or matchesPhrase(name,"new relic")',
      '  or matchesPhrase(name,"appdynamics") or matchesPhrase(name,"splunk") or matchesPhrase(name,"filebeat")',
      '  or matchesPhrase(name,"metricbeat") or matchesPhrase(name,"elastic-agent") or matchesPhrase(name,"zabbix")',
      '  or matchesPhrase(name,"prometheus") or matchesPhrase(name,"node_exporter") or matchesPhrase(name,"grafana")',
      '  or matchesPhrase(name,"nagios") or matchesPhrase(name,"collectd") or matchesPhrase(name,"logstash"))',
      '  and not matchesPhrase(name,"dynatrace")',
      '| fields name',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: entityValidation(
      11,
      null,
      'Validated on the validation tenant 2026-09-03: 11 process groups matched (Datadog agent/cluster-agent/operator/system-probe/security-agent/trace-agent, New Relic infra, Prometheus, Grafana). Pure log forwarders (Fluentd) excluded as not a direct APM/observability competitor; Dynatrace-owned processes excluded to avoid false positives.',
    ),
  },

  // ------------------------------------------------------------------- logs
  // 3.7.4 (the owner's order of the OpenPipeline kit): how many records carry no level, and what the PoC Builder's rule would
  // set on them — read on a 1:100 sample over 30 minutes, so the kit shows the rule's effect before the SE creates it.
  'log.levels.preview': {
    id: 'log.levels.preview',
    domain: 'logs',
    purpose:
      'The share of log records written without a level and the level the PoC Builder’s OpenPipeline rule would give them ' +
      '(error, warning, info), from a 1:100 sample — proportions, not counts.',
    dql: [
      'fetch logs, samplingRatio: 100',
      '| fieldsAdd noLevel = isNull(loglevel) or loglevel == "NONE"',
      '| fieldsAdd pocLevel = if(noLevel and (matchesPhrase(content, "error") or matchesPhrase(content, "exception") or matchesPhrase(content, "fatal") or matchesPhrase(content, "failed")), "ERROR", else: if(noLevel and (matchesPhrase(content, "warn") or matchesPhrase(content, "warning")), "WARN", else: if(noLevel and matchesPhrase(content, "info"), "INFO")))',
      '| summarize sampled = count(), withoutLevel = countIf(noLevel), toError = countIf(pocLevel == "ERROR"), toWarn = countIf(pocLevel == "WARN"), toInfo = countIf(pocLevel == "INFO")',
      '| fieldsAdd withoutLevelPct = round(100.0 * withoutLevel / sampled, decimals: 1)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'OpenPipeline kit preview',
    requiredScope: 'storage:logs:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 18498247,
      records: 1,
      outcome: 'ok',
      notes: 'Validated on the lab tenant over 30 minutes at 1:100: 86.7 % of the sampled records carry no level; the rule would set ERROR on 13, WARN on 2 and INFO on 39 of 14,882 (the rest are data records).',
    },
  },

  // 3.7.6 (the owner: "esse ponto 2 você não consegue criar junto na automação do pipeline?"): the sources whose records come
  // without a level, so the SE ticks the ones the PoC pipeline should receive and the app adds the route.
  'log.sources.nolevel': {
    id: 'log.sources.nolevel',
    domain: 'logs',
    purpose:
      'The log sources whose records come without a level — by log source, Kubernetes workload and ingest path — and how many ' +
      'of their lines read as errors, from a 1:100 sample over 30 minutes: the choices for the route the PoC Builder adds to ' +
      'its OpenPipeline pipeline. A list of sources, never added up.',
    dql: [
      'fetch logs, samplingRatio: 100',
      '| filter isNull(loglevel) or loglevel == "NONE"',
      '| summarize sampled = count(), looksError = countIf(matchesPhrase(content, "error") or matchesPhrase(content, "exception")),',
      '    by: {log.source, k8s.workload.name, dt.openpipeline.source}',
      '| sort sampled desc',
      '| limit 12',
    ].join('\n'),
    shape: 'table',
    visualization: 'OpenPipeline kit route choices',
    requiredScope: 'storage:logs:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 12 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 4891882,
      records: 9,
      outcome: 'ok',
      notes:
        'Validated on the lab tenant over 30 minutes at 1:100: 9 sources without a level — the logs ingest API (14,608 sampled), ' +
        'Container Output (207, 7 reading as errors), OTLP (184), a OneAgent extension log (19, 4 as errors), the easytrade-loadgen ' +
        'workload (9, 4 as errors) and four smaller ones.',
    },
  },

  // 3.7.6 (the owner: "como validamos se está totalmente funcional?"): how many records went through the PoC Builder's
  // OpenPipeline pipeline and the level each one left with. A record's `dt.openpipeline.pipelines` names the pipelines it
  // went through as `logs:<custom id>` (read on the lab, 2026-11-23).
  'log.pipeline.check': {
    id: 'log.pipeline.check',
    domain: 'logs',
    purpose:
      'How many log records went through the PoC Builder’s OpenPipeline pipeline and the level each left with (error, warning, ' +
      'info, still without one), from a 1:100 sample over 30 minutes — the proof that the pipeline works once a route sends it data.',
    dql: [
      'fetch logs, samplingRatio: 100',
      '| filter iAny(dt.openpipeline.pipelines[] == "logs:pipeline_poc_automation_log_levels")',
      '| summarize sampled = count(), error = countIf(loglevel == "ERROR"), warn = countIf(loglevel == "WARN"),',
      '    info = countIf(loglevel == "INFO"), stillNone = countIf(isNull(loglevel) or loglevel == "NONE"), last = max(timestamp)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'OpenPipeline kit check',
    requiredScope: 'storage:logs:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 1, maxResultRecords: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 1764487,
      records: 1,
      outcome: 'ok',
      notes:
        'Validated on the lab tenant over 30 minutes at 1:100: 0 records for the PoC pipeline (created, no route yet); the same ' +
        'read on another pipeline of the lab answered 1,964 sampled records (773 INFO, 11 WARN, 1 ERROR, 226 without a level).',
    },
  },

  'log.quality': {
    id: 'log.quality',
    domain: 'logs',
    purpose:
      'Severity mix and topology-enrichment coverage of ingested logs. This is the ' +
      'difference between storing logs and being able to use them.',
    dql: [
      // 3.2.3 (C12): every readable log bucket. Reading only default_logs, the validation tenant
      // showed 0 % of records with a Kubernetes namespace; over all its buckets it is 14 %.
      'fetch logs',
      '| summarize total = count(),',
      '    withService = countIf(isNotNull(dt.entity.service)),',
      '    withHost = countIf(isNotNull(dt.entity.host)),',
      '    withK8sNamespace = countIf(isNotNull(k8s.namespace.name)),',
      '    by:{status, bucket = dt.system.bucket}',
      '| sort total desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:logs:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    // Grouped by status and bucket, both bounded by the platform: the page sums the rows, so no limit.
    guards: { scanLimitGbytes: 3, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: liveValidation(
      '2026-10-04',
      9,
      'Over 30 minutes and every bucket: 1,879,105 records (default_logs 1,576,248, logs_teste 259,695, field_sets_tests 3,786); ' +
        '10,186 with service context and 263,481 with a Kubernetes namespace. On default_logs alone the namespace share was 0 %, ' +
        'which the 3.2.2 page reported as "logs without context". Pinned to a short window because logs are the costliest table to scan.',
    ),
  },

  // 3.6.4 (v6, the Logs model's console; the owner approved the read with its estimate, ~0.5 GiB, on 2026-11-22): the
  // most recent error records of the short window log.quality reads. A display list: its total is log.quality's.
  'log.errors.recent': {
    id: 'log.errors.recent',
    domain: 'logs',
    purpose:
      'The most recent error records of every readable bucket in the last 30 minutes, as console lines: when, where they ' +
      'came from (service, workload, host or bucket) and the start of the message. A list; the total comes from log.quality.',
    dql: [
      'fetch logs',
      '| filter status == "ERROR"',
      '| sort timestamp desc',
      '| limit 12',
      '| fields timestamp, content = substring(content, from: 0, to: 220), service = entityName(dt.entity.service), host = host.name, workload = k8s.workload.name, bucket = dt.system.bucket',
    ].join('\n'),
    shape: 'table',
    visualization: 'Console lines',
    requiredScope: 'storage:logs:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 3, maxResultRecords: 12 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 209,
      scannedBytesOnDemand: 68417857,
      records: 12,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 30 minutes, every bucket) after a ~0.5 GiB estimate the ' +
        'owner approved: 0.064 GiB scanned, 12 lines (Prometheus extension connection errors on the EC2 hosts and a ' +
        "container-detector message in logs_teste). Pinned to log.quality's short window, whose ERROR rows give the total.",
    },
  },

  'log.errors.grouped': {
    id: 'log.errors.grouped',
    domain: 'logs',
    purpose:
      'The error records of every readable bucket in the selected window, grouped by message — numbers written as # and ids ' +
      'as <id>, so a repeated error counts as one — with how many times each appeared, when it was last seen and on how ' +
      'many hosts. The 12 most recently seen; a list of counts, never summed.',
    dql: [
      'fetch logs',
      '| filter status == "ERROR"',
      '| fieldsAdd message = substring(replacePattern(replacePattern(content, "[0-9a-fA-F\\\\-]{8,}", "<id>"), "DIGIT+", "#"), from: 0, to: 160), service = entityName(dt.entity.service), bucket = dt.system.bucket',
      '| summarize count = count(), last = max(timestamp), hosts = countDistinct(host.name), workload = takeAny(k8s.workload.name), by: {message, service, bucket}',
      '| sort last desc',
      '| limit 12',
    ].join('\n'),
    shape: 'table',
    visualization: 'Console lines with a count',
    requiredScope: 'storage:logs:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 20, maxResultRecords: 12 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 472,
      scannedBytesOnDemand: 1851443351,
      records: 12,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22) at the owner\'s choice "Sempre no período" for the count: last ' +
        '2 hours 0.20 GiB, last 24 hours 1.72 GiB in 472 ms (about 0.072 GiB per hour of window; 7 days ≈ 12 GiB), 12 rows. ' +
        'Grouping by the raw message start counted every line once (timestamps and ids differ); with numbers as # and ids as ' +
        '<id> the same error groups: 11,517 Prometheus connection errors on 8 hosts and 4,314 container-detector messages ' +
        'in 24 hours. The ceiling of 20 GiB covers a week; a longer window that reaches it is shown as "at least".',
    },
  },

  // 3.6.9 (the owner: "senti a falta de SLO de infraestrutura dos servidores monitorados (hosts) e Kubernetes"): the
  // indicators of the fleet SLOs the PoC Builder creates — every host, every workload — evaluated by the platform.
  'slo.hosts.cpu': {
    id: 'slo.hosts.cpu',
    domain: 'infrastructure',
    purpose:
      'The indicator of the hosts CPU SLO the SE creates on the PoC Builder: for every monitored host, the minutes ' +
      'whose mean CPU use stays within 80 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.',
    dql: [
      'timeseries cpu = avg(dt.host.cpu.usage), by: { dt.entity.host }',
      '| fieldsAdd sli = iCollectArray(if(isNull(cpu[]), cpu[], else: if(cpu[] <= 80, 100.0, else: 0.0)))',
      '| fieldsAdd entityName(dt.entity.host)',
      '| fieldsRemove cpu',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'SLO indicator (evaluated by the platform)',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 221,
      scannedBytesOnDemand: 0,
      records: 3,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 2 hours, every host, first 3 rows read): metrics, 0 bytes, one series of 100 % per minute each; the last, unreported minute read 0 % before the gap rule.',
    },
  },

  'slo.hosts.memory': {
    id: 'slo.hosts.memory',
    domain: 'infrastructure',
    purpose:
      'The indicator of the hosts memory SLO the SE creates on the PoC Builder: for every monitored host, the minutes ' +
      'whose mean memory use stays within 85 %. A minute not yet reported is a gap, never a failure. Evaluated by the platform.',
    dql: [
      'timeseries mem = avg(dt.host.memory.usage), by: { dt.entity.host }',
      '| fieldsAdd sli = iCollectArray(if(isNull(mem[]), mem[], else: if(mem[] <= 85, 100.0, else: 0.0)))',
      '| fieldsAdd entityName(dt.entity.host)',
      '| fieldsRemove mem',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'SLO indicator (evaluated by the platform)',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 221,
      scannedBytesOnDemand: 0,
      records: 3,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 2 hours, every host, first 3 rows read): metrics, 0 bytes, one series of 100 % per minute each.',
    },
  },

  'slo.k8s.restarts': {
    id: 'slo.k8s.restarts',
    domain: 'kubernetes',
    purpose:
      'The indicator of the Kubernetes SLO the SE creates on the PoC Builder: for every workload, the minutes in ' +
      'which none of its containers restarted. Evaluated by the platform.',
    dql: [
      'timeseries restarts = sum(dt.kubernetes.container.restarts, default: 0), by: { k8s.cluster.name, k8s.workload.name }',
      '| fieldsAdd sli = iCollectArray(if(restarts[] == 0, 100.0, else: 0.0))',
      '| fieldsRemove restarts',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'SLO indicator (evaluated by the platform)',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 221,
      scannedBytesOnDemand: 0,
      records: 3,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 2 hours, first 3 workloads read): metrics, 0 bytes; workloads of the lab cluster restart every few minutes (series of 100 and 0), the reading the SLO is for.',
    },
  },

  // 3.7.6 (the owner: "quanto o consumo do app está cobrando do licenciamento"): the queries this app had billed, read from
  // the platform's billing usage events by their `client.application_context` — the app's id and its two earlier ids.
  'app.query.billing': {
    id: 'app.query.billing',
    domain: 'consumption',
    purpose:
      'The query consumption the platform billed to this app (and its two earlier app ids) over the last 30 days, by kind of ' +
      'query, read from the billing usage events — the bytes the licence was charged for, not an estimate.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| filter in(client.application_context, array("my.poc.automation", "my.poc.value.studio", "my.poc.value.studio.v31"))',
      '| filter contains(event.type, "Query")',
      '| summarize queries = count(), billedBytes = sum(toDouble(billed_bytes)), by: {app = client.application_context, event.type}',
      '| sort billedBytes desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'App consumption cost',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: 0,
      records: 6,
      outcome: 'ok',
      notes:
        'Validated on the lab tenant over 30 days at 0 B: the earlier ids had 14.9 GB of queries billed (logs 11.7 GB, events ' +
        '3.1 GB, DEM 0.06 GB); the current id my.poc.automation had none billed in the window.',
    },
  },

  // 3.7.7 — AI Observability (the owner approved the 3.7.6 proposal "AI Observability e o notebook semanal"): what the
  // instrumented generative-AI apps of the environment send in the OpenTelemetry GenAI metrics — tokens by service, model and
  // kind, the calls and their time. Metrics only (0 B); never a price (rule 6: no money outside Licensing).
  'ai.tokens': {
    id: 'ai.tokens',
    domain: 'services',
    purpose:
      'Tokens sent and received by the generative-AI clients of the environment over the window, by service, model and kind ' +
      '(input or output), from the OpenTelemetry GenAI metric gen_ai.client.token.usage.',
    dql: [
      'timeseries tokens = sum(gen_ai.client.token.usage), by: {service.name, gen_ai.request.model, gen_ai.token.type}',
      '| fieldsAdd total = arraySum(tokens)',
      '| fields service.name, gen_ai.request.model, gen_ai.token.type, total',
      '| sort total desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'KPI tiles / DataTable',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: 31,
      scannedBytesOnDemand: 0,
      records: 12,
      outcome: 'ok',
      notes:
        'Validated on the lab tenant over 24 h at 0 B: 12 rows (4 services); about 184 million input tokens and 0.36 million ' +
        'output tokens, most of them from one desktop assistant; rows without a model where the client does not report one.',
    },
  },

  'ai.tokens.trend': {
    id: 'ai.tokens.trend',
    domain: 'services',
    purpose: 'Input and output tokens of the generative-AI clients over time (one series per kind), from gen_ai.client.token.usage.',
    dql: 'timeseries tokens = sum(gen_ai.client.token.usage), by: {gen_ai.token.type}',
    shape: 'timeseries',
    visualization: 'Spectrum area chart',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: 27,
      scannedBytesOnDemand: 0,
      records: 2,
      outcome: 'ok',
      notes: 'Validated on the lab tenant over 24 h at 0 B: two series (input, output), 10-minute bins.',
    },
  },

  'ai.calls': {
    id: 'ai.calls',
    domain: 'services',
    purpose:
      'Calls to generative-AI models over the window, by service, model and error type, with their mean duration, from the ' +
      'OpenTelemetry GenAI metric gen_ai.client.operation.duration.',
    dql: [
      'timeseries calls = sum(gen_ai.client.operation.duration, rollup: count), seconds = avg(gen_ai.client.operation.duration), by: {service.name, gen_ai.request.model, error.type}',
      '| fieldsAdd calls = arraySum(calls), avgSeconds = arrayAvg(seconds)',
      '| fields service.name, gen_ai.request.model, error.type, calls, avgSeconds',
      '| sort calls desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: '2026-11-23',
      environmentId: ENV,
      durationMs: 25,
      scannedBytesOnDemand: 0,
      records: 3,
      outcome: 'ok',
      notes: 'Validated on the lab tenant over 24 h at 0 B: 3 rows, 5 calls in total with no error, 0.27–0.34 s on average.',
    },
  },

  'log.ingest': {
    id: 'log.ingest',
    domain: 'logs',
    purpose:
      'Log bytes ingested and log bytes queried over the window, read from the ' +
      "platform's own billing usage events. Gives the log page a sense of scale " +
      'that a record count alone cannot.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| filter event.type == "Log Management & Analytics - Ingest & Process"',
      '    or event.type == "Log Management & Analytics - Query"',
      '| summarize bytes = sum(billed_bytes), events = count(), by:{event.type}',
      '| sort bytes desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Summary tiles',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 5 },
    validation: entityValidation(
      2,
      null,
      'Observed on the validation tenant over 24 hours: 22,934,202,611 bytes ingested and ' +
        '60,754,085,732 bytes scanned by log queries. The "Retain" capability was deliberately ' +
        'excluded: its billed_bytes is a byte-day retention figure rather than a plain byte ' +
        'count, and showing it as GB would overstate ingest by three orders of magnitude.',
    ),
  },

  'log.ingest.trend': {
    id: 'log.ingest.trend',
    domain: 'logs',
    purpose:
      'Log bytes ingested per hour, read from the platform\'s own billing usage events, so the page shows the rhythm ' +
      'of ingestion and not only its total. Volume only: no price is applied.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| filter event.type == "Log Management & Analytics - Ingest & Process"',
      '| makeTimeseries bytes = sum(billed_bytes), interval: 1h',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'Spectrum area chart',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 5 },
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 25 hourly bins, about 1 GB ingested per hour, 24.1 GB in total (the first bin empty, the last partial). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'log.buckets': {
    id: 'log.buckets',
    domain: 'logs',
    purpose: 'Log volume and retention per bucket, for retention and governance decisions.',
    dql: [
      'fetch dt.system.buckets',
      '| filter `dt.system.table` == "logs"',
      '| fields name, records, retentionDays = retention_days,',
      '    bytes = estimated_uncompressed_bytes, hasAccess = has_access',
      '| sort bytes desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:buckets:read',
    timeframe: 'global',
    validation: entityValidation(
      10,
      null,
      'Reads bucket metadata rather than log content, so bucket-level volume costs nothing to display.',
    ),
  },

  'log.sfm': {
    id: 'log.sfm',
    domain: 'logs',
    purpose:
      'The platform\'s own self-monitoring on log ingestion quality: unparsed ' +
      'timestamps, ambiguous patterns and process-group ambiguity.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "LOG_SFM" or event.kind == "LOG_SOURCE_STATUS"',
      '| summarize occurrences = count(), by:{event.kind, event.type}',
      '| sort occurrences desc',
      '| limit 25',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 2 },
    validation: entityValidation(
      6,
      null,
      'Observed over 24 h: pgi.multiple_pgis 2250, log_source.status 3355, timestamp.no_pattern 40, ' +
        'timestamp.multiple_patterns 33. These are platform-reported, not app-inferred.',
    ),
  },

  // ------------------------------------------------------------ consumption
  'cons.capabilities': {
    id: 'cons.capabilities',
    domain: 'consumption',
    purpose:
      'Which licensed capabilities the environment actually exercised, with billed ' +
      'volume as reported by the platform. Volume only - this app never shows money.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| summarize events = count(), billedBytes = sum(billed_bytes), by:{event.type}',
      '| sort events desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 3, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: entityValidation(
      19,
      null,
      '17 distinct capabilities observed in 24 h. billed_bytes is reported verbatim: for "Retain" capability types ' +
        'the platform-reported figure is not a plain byte count, so the UI labels its unit as source-reported and ' +
        'flags it as requiring commercial confirmation.',
    ),
  },

  'cons.advisor': {
    id: 'cons.advisor',
    domain: 'consumption',
    purpose:
      'Query cost per table from the platform\'s own query accounting, counting distinct queries ' +
      'rather than records. Feeds the DQL Efficiency Advisor. user.email is deliberately excluded: ' +
      'aggregate only, no PII.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "QUERY_EXECUTION_EVENT" and isNotNull(table) and table != ""',
      '| summarize queries = countDistinctExact(query_id),',
      '    aggregatedRecords = countIf(isNull(query_id)),',
      '    scannedOnDemandBytes = sum(`scanned_bytes.on_demand`),',
      '    avgDurationMs = avg(execution_duration_ms),',
      '    maxDurationMs = max(execution_duration_ms),',
      '    deliveredRecords = sum(delivered_records),',
      '    by:{table}',
      '| fieldsAdd bytesPerDeliveredRecord = if(deliveredRecords > 0, scannedOnDemandBytes / deliveredRecords, else: 0)',
      '| sort scannedOnDemandBytes desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 3, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-11-03',
      environmentId: ENV,
      durationMs: 43,
      scannedBytesOnDemand: 0,
      records: 11,
      outcome: 'ok',
      notes:
        '3.3.1 (backlog Q8): `executions = count()` counted RECORDS, not queries. The platform writes one ' +
        'record per table a query touched, so the column read far above the truth where it matters most - ' +
        'measured on 2026-11-03 over 24 h: `events` 930 records for 305 distinct queries (3x), `logs` 105 ' +
        'for 37 (2.8x). It now counts `query_id` distinctly. `query_id` is null on aggregated events ' +
        '(platform docs), which `countDistinctExact` would silently drop, so `aggregatedRecords` carries ' +
        'them beside the count - it was 0 on every table in that run. Totals come from `cons.advisor.total`, ' +
        'never from summing these rows across tables. Schema confirmed on real records: query_string, ' +
        'scanned_bytes.on_demand, execution_duration_ms, sampling_ratio, table, status, flags. The platform ' +
        'masks literals inside query_string, and user.email is on the raw record - this query never selects it. ' +
        'The read scanned 0 bytes: dt.system.events is zero-rated.',
    },
  },

  'cons.advisor.total': {
    id: 'cons.advisor.total',
    domain: 'consumption',
    purpose:
      'Exact totals of the query accounting over every table at once: how many distinct queries ran, ' +
      'how much they scanned on demand and how many records they delivered. Exists because one query ' +
      'touching several tables appears once per table, so adding up the per-table rows counts it twice.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "QUERY_EXECUTION_EVENT" and isNotNull(table) and table != ""',
      '| summarize queries = countDistinctExact(query_id),',
      '    aggregatedRecords = countIf(isNull(query_id)),',
      '    scannedOnDemandBytes = sum(`scanned_bytes.on_demand`),',
      '    deliveredRecords = sum(delivered_records),',
      '    tables = countDistinctExact(table)',
    ].join('\n'),
    shape: 'table',
    visualization: 'SingleValue',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 3 },
    validation: {
      validatedOn: '2026-11-03',
      environmentId: ENV,
      durationMs: 38,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok',
      notes:
        '3.3.1 (backlog Q8). Measured on 2026-11-03 over 24 h: 33,154 distinct queries across 11 tables, ' +
        'against the 33,974 the page used to reach by adding the per-table rows - 820 of them were one ' +
        'query counted in a second table. 0 aggregated records in that run. 0 bytes scanned.',
    },
  },

  // ------------------------------------------------------------- automation
  'auto.workflows': {
    id: 'auto.workflows',
    domain: 'automation',
    purpose:
      'Workflow executions by state and trigger type - measured automation already ' +
      'running, rather than a claim about what automation could do.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"',
      '| filter dt.automation_engine.state.is_final == true',
      '| summarize executions = count(), avgDurationNs = avg(duration),',
      '    by:{title = dt.automation_engine.workflow.title,',
      '        state = dt.automation_engine.state,',
      '        trigger = dt.automation_engine.workflow_execution.trigger.type}',
      '| sort executions desc',
      '| limit 40',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 2 },
    validation: entityValidation(
      1,
      null,
      'Schema confirmed on a real record: dt.automation_engine.workflow.title, .state (SUCCESS), ' +
        '.workflow_execution.trigger.type (Schedule) and duration. 12,940 workflow executions observed in 24 h.',
    ),
  },

  'auto.workflows.total': {
    id: 'auto.workflows.total',
    domain: 'automation',
    purpose:
      'Exact workflow totals over every finished execution: how many distinct workflows ran, how ' +
      'many executions there were and how many failed. The ranked list only shows the busiest ' +
      'workflow, state and trigger combinations.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"',
      '| filter dt.automation_engine.state.is_final == true',
      '| summarize workflows = countDistinctExact(dt.automation_engine.workflow.title),',
      '    executions = count(),',
      '    succeeded = countIf(dt.automation_engine.state == "SUCCESS"),',
      '    failed = countIf(dt.automation_engine.state == "ERROR"),',
      '    failingWorkflows = countDistinctExact(if(dt.automation_engine.state == "ERROR", dt.automation_engine.workflow.title))',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 2 },
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 20 workflows, 6,469 executions (5,580 succeeded, 889 failed), 4 workflows failing. Replaces counting the rows of a list capped at 40 title/state/trigger groups. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  // --------------------------------------------------------------- business
  'auto.trend': {
    id: 'auto.trend',
    domain: 'automation',
    purpose:
      'Finished workflow executions per hour, split into succeeded and failed, so a failure that repeats on a ' +
      'schedule shows as a steady band rather than one number.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"',
      '| filter dt.automation_engine.state.is_final == true',
      '| makeTimeseries {',
      '    succeeded = countIf(dt.automation_engine.state == "SUCCESS"),',
      '    failed = countIf(dt.automation_engine.state == "ERROR")',
      '  }, interval: 1h',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'Spectrum area charts',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 2 },
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 5,579 succeeded and 889 failed executions in 25 hourly bins (about 232 and 37 per hour), matching auto.workflows.total. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'auto.failing': {
    id: 'auto.failing',
    domain: 'automation',
    purpose:
      'The workflows that fail, worst first: failed executions, all executions and the failure rate of each, and when ' +
      'it last failed. A ranked list; the totals come from auto.workflows.total.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION"',
      '| filter dt.automation_engine.state.is_final == true',
      '| summarize executions = count(),',
      '    failed = countIf(dt.automation_engine.state == "ERROR"),',
      '    lastFailure = takeMax(if(dt.automation_engine.state == "ERROR", timestamp)),',
      '    by:{title = dt.automation_engine.workflow.title}',
      '| filter failed > 0',
      '| fieldsAdd failureRatePct = failed * 100.0 / executions',
      '| sort failed desc',
      '| limit 10',
    ].join('\n'),
    shape: 'table',
    visualization: 'Ranked bars',
    requiredScope: 'storage:system:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 2, maxResultRecords: 10 },
    validation: zeroRatedValidation(4, 'Validated live on the validation tenant over 24 h: 4 failing workflows, each failing every run (576, 288, 24 and 1 executions). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  'biz.events': {
    id: 'biz.events',
    domain: 'business',
    purpose:
      'Business event types actually flowing into Grail. Establishes that business ' +
      'context exists before any business-impact statement is made.',
    dql: [
      'fetch bizevents',
      '| summarize events = count(), by:{event.type}',
      '| sort events desc',
      '| limit 25',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:bizevents:read',
    timeframe: { relative: 'now-6h', label: 'timeframe.pinned.6h' },
    guards: { scanLimitGbytes: 2 },
    validation: entityValidation(
      20,
      null,
      'Real business domains observed: pos.transaction, loan.application, credit-analysis, ecom.order.placed, ' +
        'trade.execution and others. Volume is real; mapping an event type to a monetary outcome is not attempted.',
    ),
  },

  'biz.events.total': {
    id: 'biz.events.total',
    domain: 'business',
    purpose:
      'Exact business-event totals: how many events were captured and how many distinct event types ' +
      'they span. A busy tenant has hundreds of types, so the list shows only the 25 most frequent.',
    dql: [
      'fetch bizevents',
      '| summarize events = count(), types = countDistinctExact(event.type)',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:bizevents:read',
    timeframe: { relative: 'now-6h', label: 'timeframe.pinned.6h' },
    guards: { scanLimitGbytes: 2 },
    validation: liveValidation(
      '2026-10-04',
      1,
      'Validated live on the validation tenant over 24 h: 3,992,534 events across 1,626 distinct event types (the list showed 25).',
    ),
  },

  // --------------------------------------------------------------- security
  // ------------------------------------------------------ capacity headroom
  'infra.capacity': {
    id: 'infra.capacity',
    domain: 'infrastructure',
    purpose:
      'Declared capacity against measured usage, per host. This is the evidence ' +
      'behind both halves of a right-sizing conversation: a host running at its ' +
      'ceiling, and a host that was sized for load it never sees.',
    dql: [
      'timeseries {',
      '    cpu = avg(dt.host.cpu.usage), cpuMax = max(dt.host.cpu.usage),',
      '    mem = avg(dt.host.memory.usage), memMax = max(dt.host.memory.usage),',
      '    disk = avg(dt.host.disk.used.percent), diskMax = max(dt.host.disk.used.percent)',
      '  }, by:{dt.entity.host}, interval: 1h',
      '| fieldsAdd avgCpuPct = arrayAvg(cpu), maxCpuPct = arrayMax(cpuMax),',
      '    avgMemPct = arrayAvg(mem), maxMemPct = arrayMax(memMax),',
      '    avgDiskPct = arrayAvg(disk), maxDiskPct = arrayMax(diskMax)',
      '| fields hostId = dt.entity.host, avgCpuPct, maxCpuPct, avgMemPct, maxMemPct,',
      '    avgDiskPct, maxDiskPct',
      '| lookup [',
      '    fetch dt.entity.host',
      '    | fields id, name = entity.name, cores = toLong(cpuCores),',
      '        memBytes = toLong(memoryTotal)',
      '  ], sourceField:hostId, lookupField:id, fields:{name, cores, memBytes}',
      '| filter isNotNull(memBytes) and memBytes > 0',
      '| fieldsAdd memUsedBytes = memBytes * avgMemPct / 100.0,',
      '    memHeadroomBytes = memBytes * (100.0 - maxMemPct) / 100.0',
      '| sort memBytes desc',
      `| limit ${CAPACITY_LIST_LIMIT}`,
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable with headroom classification',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      24,
      null,
      'Metric plus entity lookup: no on-demand Grail scan. Validated live on the validation tenant (2026-10-03): peaks are now ' +
        'the true maximum of each hour (max(), not the largest hourly average, which understated a short spike), ' +
        'e.g. one 8-core host at 14.6% CPU peak against a 7.0% average. The list holds the largest hosts by ' +
        'memory; every count and total on the page comes from infra.capacity.summary over all of them.',
    ),
  },

  'infra.capacity.summary': {
    id: 'infra.capacity.summary',
    domain: 'infrastructure',
    purpose:
      'Exact capacity verdicts over every host: how many are saturated, under pressure, balanced or ' +
      'oversized, and the memory declared, in use and reclaimable. Classified inside the query with the ' +
      'same thresholds the page shows, so a large estate is never cut to its biggest hosts.',
    dql: [
      'timeseries {',
      '    cpuMax = max(dt.host.cpu.usage),',
      '    memMax = max(dt.host.memory.usage),',
      '    memAvg = avg(dt.host.memory.usage)',
      '  }, by:{dt.entity.host}, interval: 1h',
      '| fieldsAdd peakCpu = arrayMax(cpuMax), peakMem = arrayMax(memMax), avgMem = arrayAvg(memAvg)',
      '| lookup [',
      '    fetch dt.entity.host',
      '    | fields id, cores = toLong(cpuCores), memBytes = toLong(memoryTotal)',
      '  ], sourceField:dt.entity.host, lookupField:id, fields:{cores, memBytes}',
      '| filter isNotNull(memBytes) and memBytes > 0',
      '| fieldsAdd verdict = if(isNull(peakCpu) and isNull(peakMem), "unknown",',
      `    else:if(peakCpu >= ${CAPACITY_THRESHOLDS.saturatedPct} or peakMem >= ${CAPACITY_THRESHOLDS.saturatedPct}, "saturated",`,
      `    else:if(peakCpu >= ${CAPACITY_THRESHOLDS.pressuredPct} or peakMem >= ${CAPACITY_THRESHOLDS.pressuredPct}, "pressured",`,
      `    else:if(peakCpu < ${CAPACITY_THRESHOLDS.oversizedPct} and peakMem < ${CAPACITY_THRESHOLDS.oversizedPct}, "oversized", else:"balanced"))))`,
      '| summarize {',
      '    hosts = count(),',
      '    saturated = countIf(verdict == "saturated"),',
      '    pressured = countIf(verdict == "pressured"),',
      '    balanced = countIf(verdict == "balanced"),',
      '    oversized = countIf(verdict == "oversized"),',
      '    unknown = countIf(verdict == "unknown"),',
      '    declaredMemBytes = sum(memBytes),',
      '    usedMemBytes = sum(memBytes * avgMem / 100.0),',
      '    reclaimableMemBytes = sum(if(verdict == "oversized", memBytes * (100.0 - peakMem) / 100.0, else:0.0)),',
      '    oversizedCores = sum(if(verdict == "oversized", cores, else:0))',
      '  }',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      1,
      null,
      'Validated live on the validation tenant (2026-10-03) over 24 h: 24 hosts with memory and metrics, 3 saturated, 1 under ' +
        'pressure, 11 balanced, 9 oversized, 465 GB declared, 97 GB in use, 237 GB reclaimable on the oversized ones. ' +
        'Metric plus entity lookup: no on-demand Grail scan.',
    ),
  },

  'infra.capacity.total': {
    id: 'infra.capacity.total',
    domain: 'infrastructure',
    purpose:
      'Estate-level declared capacity: how many hosts, how many cores and how much ' +
      'memory Dynatrace found. The denominator for every headroom statement.',
    dql: [
      'fetch dt.entity.host',
      '| summarize hosts = count(),',
      '    totalCores = sum(toLong(cpuCores)),',
      '    totalMemBytes = sum(toLong(memoryTotal))',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: entityValidation(
      1,
      null,
      'Observed on the validation tenant: 63 hosts, 106 cores, 622,306,312,192 bytes of memory.',
    ),
  },

  // ------------------------------------------------------- service totals
  'svc.totals': {
    id: 'svc.totals',
    domain: 'services',
    purpose:
      'Estate-wide request and failure totals with the derived failure rate, so the ' +
      'services page opens with the overall picture before it ranks anything.',
    dql: [
      'timeseries {',
      '    requests = sum(dt.service.request.count),',
      '    failures = sum(dt.service.request.failure_count)',
      '  }, interval: 1h',
      '| fieldsAdd totalRequests = arraySum(requests), totalFailures = arraySum(failures)',
      '| fieldsAdd failureRatePct =',
      '    if(totalRequests > 0, totalFailures * 100.0 / totalRequests, else: 0.0)',
      '| fields totalRequests, totalFailures, failureRatePct',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: entityValidation(
      1,
      null,
      'Observed on the validation tenant over 24 hours: 3,918,313 requests, 19,776 failures, ' +
        '0.5047% failure rate. Metric query, so no on-demand Grail scan.',
    ),
  },

  'sec.vulnerabilities': {
    id: 'sec.vulnerabilities',
    domain: 'security',
    purpose:
      'Current open, non-muted runtime vulnerabilities, deduplicated to their ' +
      'latest state per affected entity and rolled up per vulnerability. Carries ' +
      'the Security Score, the technology stack, and the exploit / public-' +
      'exposure / vulnerable-function signals that drive remediation priority.',
    dql: [
      ...VULNERABILITY_ROLLUP,
      '| fields displayId = vulnerability.display_id, title, cve, technology = stack,',
      '    score, level, functionStatus, exposureStatus, exploitStatus, entityNames',
      '| sort score desc',
      `| limit ${VULNERABILITY_LIST_LIMIT}`,
    ].join('\n'),
    shape: 'table',
    visualization: 'Top vulnerabilities table + remediation queue',
    requiredScope: 'storage:security.events:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 25, maxResultRecords: VULNERABILITY_LIST_LIMIT },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 0,
      outcome: 'no-permission',
      notes:
        'The detail list only: the highest-risk vulnerabilities by Davis risk score, capped at ' +
        `${VULNERABILITY_LIST_LIMIT} rows. It is never summed or counted for a total — every total, share ` +
        'and severity count comes from sec.posture, which aggregates the same rollup over all of them. ' +
        'Same rollup as the operator-supplied best-practice pattern (event.provider == "Dynatrace", the three ' +
        'vulnerability event types at ENTITY level, dedup by {display_id, affected_entity.id} to the latest ' +
        'state, risk level from the Davis risk.score, OPEN/NOT_MUTED only). Could not be run from here: the ' +
        'MCP validating identity lacks storage:security.events:read; the reference dashboard on the validation tenant ' +
        'reports 508 open vulnerabilities, which is why a 500-row cap had to stop being a total.',
    },
  },

  'sec.posture': {
    id: 'sec.posture',
    domain: 'security',
    purpose:
      'Exact vulnerability posture: how many open, non-muted vulnerabilities exist in total, by ' +
      'severity and by technology stack, and how many are exploitable, publicly exposed, in use or ' +
      'all three at once. Aggregated in the query over every vulnerability, so no row cap can ' +
      'turn a total into a floor.',
    dql: [
      ...VULNERABILITY_ROLLUP,
      '| summarize {',
      '    vulnerabilities = count(),',
      '    actNow = countIf(exploitStatus == "AVAILABLE" and exposureStatus == "PUBLIC_NETWORK" and functionStatus == "IN_USE"),',
      '    exploitable = countIf(exploitStatus == "AVAILABLE"),',
      '    publicExposed = countIf(exposureStatus == "PUBLIC_NETWORK"),',
      '    inUse = countIf(functionStatus == "IN_USE"),',
      // 3.2.6: the pairs, so the page can name the next queue when no vulnerability has all three.
      '    exploitPublic = countIf(exploitStatus == "AVAILABLE" and exposureStatus == "PUBLIC_NETWORK"),',
      '    exploitInUse = countIf(exploitStatus == "AVAILABLE" and functionStatus == "IN_USE"),',
      '    publicInUse = countIf(exposureStatus == "PUBLIC_NETWORK" and functionStatus == "IN_USE")',
      '  }, by: {level, technology = stack}',
    ].join('\n'),
    shape: 'table',
    visualization: 'Severity stack + technology bars + headline totals',
    requiredScope: 'storage:security.events:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 25 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 0,
      outcome: 'no-permission',
      notes:
        'One row per severity level and technology stack (a handful, never near any limit), each carrying ' +
        'the exact count and the exploit / public-exposure / in-use counts, so the totals are sums of ' +
        'exact counts over every open vulnerability. The rollup is the same text as sec.vulnerabilities and ' +
        'the tail follows the sec_rva_levels aggregation of the operator-supplied pattern. Could not be run ' +
        'from here: the MCP validating identity lacks storage:security.events:read, so it is checked for ' +
        'shape against the list query and by the unit tests that feed its rows through the model. ' +
        '3.2.6: three pair counts added (exploit + public, exploit + in use, public + in use) — the same ' +
        'countIf over the same derived fields — so "two of three signals" is exact by inclusion-exclusion.',
    },
  },

  // ------------------------------------------------------------- experience
  'rum.sessions': {
    id: 'rum.sessions',
    domain: 'experience',
    purpose:
      'Real user session volume. Retained to make the digital-experience gap explicit ' +
      'and to avoid staging a story the data cannot support.',
    dql: [
      'fetch user.sessions',
      '| summarize sessions = count(), by:{userType = usersession.type}',
      '| sort sessions desc',
      '| limit 10',
    ].join('\n'),
    shape: 'table',
    visualization: 'DataTable',
    requiredScope: 'storage:user.sessions:read',
    timeframe: 'global',
    guards: { scanLimitGbytes: 1 },
    validation: {
      validatedOn: VALIDATED_ON,
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 0,
      outcome: 'no-permission',
      notes:
        'Buckets default_user_sessions and default_synthetic_user_sessions both report has_access=false, and hold ' +
        '5 and 6 records respectively. Both a permission gap and a telemetry gap - the field name usersession.type ' +
        'could not be schema-verified and is therefore not trusted for display until the scope is granted.',
    },
  },

  'rum.scorecard': {
    id: 'rum.scorecard',
    domain: 'experience',
    purpose:
      'Per-application digital-experience scorecard from the dt.frontend.* metrics, real users ' +
      'only: user actions, requests, errors and the derived error rate. Metric-based, so it ' +
      'reads under storage:metrics:read without the user.sessions table.',
    dql: [
      'timeseries {',
      '    actions = sum(dt.frontend.user_action.count, scalar: true),',
      '    requests = sum(dt.frontend.request.count, scalar: true),',
      '    errors = sum(dt.frontend.error.count, scalar: true)',
      '  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")',
      '| filter isNotNull(frontend.name)',
      '| fieldsAdd errorRatePct = if(requests > 0, round((errors / requests) * 100, decimals: 2), else: 0.0)',
      '| fields frontend.name, actions, requests, errors, errorRatePct',
      '| sort requests desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Per-app experience scorecard',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-09-04',
      environmentId: ENV,
      durationMs: 34,
      scannedBytesOnDemand: 0,
      records: 2,
      outcome: 'ok',
      notes:
        'Validated live via dtctl on the validation tenant (2026-09-04). Two named frontends returned: ' +
        'easytrade-frontendreverseproxy (0% error rate) and frontendreverseproxy-easytrade (~3.5-3.8% error rate, ' +
        'all of type "request"). Classic RUM exposes these as dt.frontend.* metrics; the New-RUM user.sessions / ' +
        'user.events tables are empty in this tenant. No hardcoded app name, so it works for any engagement. ' +
        'The active-users / active-sessions estimated_count metrics are not populated here and are shown as not ' +
        'observed rather than zero.',
    },
  },

  'rum.webvitals': {
    id: 'rum.webvitals',
    domain: 'experience',
    purpose:
      'Per-application Core Web Vitals (LCP, INP, CLS) and navigation timings (load, TTFB, DOM ' +
      'interactive) plus user-action duration, at the 75th percentile and for real users only - ' +
      'the standard way to grade perceived web experience.',
    dql: [
      'timeseries {',
      '    lcp = percentile(dt.frontend.web.page.largest_contentful_paint, 75, rollup: avg, scalar: true),',
      '    inp = percentile(dt.frontend.web.page.interaction_to_next_paint, 75, rollup: avg, scalar: true),',
      '    cls = percentile(dt.frontend.web.page.cumulative_layout_shift, 75, rollup: avg, scalar: true),',
      '    load = percentile(dt.frontend.web.navigation.load_event_end, 75, rollup: avg, scalar: true),',
      '    ttfb = percentile(dt.frontend.web.navigation.time_to_first_byte, 75, rollup: avg, scalar: true),',
      '    dom = percentile(dt.frontend.web.navigation.dom_interactive, 75, rollup: avg, scalar: true),',
      '    actionDur = percentile(dt.frontend.user_action.duration, 75, rollup: avg, scalar: true)',
      '  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")',
      '| filter isNotNull(frontend.name)',
      '| fields frontend.name, lcp, inp, cls, load, ttfb, dom, actionDur',
    ].join('\n'),
    shape: 'table',
    visualization: 'Core Web Vitals scorecard',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-09-04',
      environmentId: ENV,
      durationMs: 38,
      scannedBytesOnDemand: 0,
      records: 2,
      outcome: 'ok',
      notes:
        'Validated live via dtctl on the validation tenant (2026-09-04). Both frontends returned real p75 values: LCP ~324-402 ms ' +
        '(good), CLS good, load ~275-286 ms, TTFB ~5-10 ms, DOM ~107-155 ms - but INP ~5.4-6.4 s, which is roughly ' +
        'ten times the 500 ms "poor" line and is the headline finding for these apps. Metric-based (0 on-demand ' +
        'bytes), no hardcoded app name.',
    },
  },

  // 3.6.2 (the Experience funnel, approved with the v5 proposal on 2026-11-21: "validar as consultas novas … do funil
  // com estimativa de custo antes"): the user actions of real users by the experience level the platform gave each one,
  // and their requests by response class — one unit per funnel, each step part of the one before.
  'rum.funnel': {
    id: 'rum.funnel',
    domain: 'experience',
    purpose:
      'The experience funnel per application, real users only: every user action, the actions not frustrated ' +
      '(satisfied or tolerating) and the satisfied ones, by the experience level the platform gives each action; and ' +
      'the requests, those answered without a 4xx or 5xx, and those with one. Each step is part of the one before, in the same unit.',
    dql: [
      'timeseries { w = sum(dt.frontend.experience.weight, scalar: true) }, by: {frontend.name, experience.level}, filter: (dt.rum.user_type == "real_user")',
      '| append [timeseries { r = sum(dt.frontend.request.count, scalar: true) }, by: {frontend.name, http.response.status_code_class}, filter: (dt.rum.user_type == "real_user")]',
      '| filter isNotNull(frontend.name)',
      '| summarize {',
      '    actions = sum(w),',
      '    satisfied = sum(if(experience.level == "satisfied", w, else: 0)),',
      '    tolerating = sum(if(experience.level == "tolerating", w, else: 0)),',
      '    frustrated = sum(if(experience.level == "frustrated", w, else: 0)),',
      '    requests = sum(r),',
      '    requestsOk = sum(if(in(http.response.status_code_class, {"2xx", "3xx"}), r, else: 0)),',
      '    requestsFailed = sum(if(in(http.response.status_code_class, {"4xx", "5xx"}), r, else: 0))',
      '  }, by: {frontend.name}',
      '| sort actions desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Experience funnel per application',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-11-22',
      environmentId: ENV,
      durationMs: 61,
      scannedBytesOnDemand: 0,
      records: 2,
      outcome: 'ok',
      notes:
        'Validated live on the validation tenant (2026-11-22, last 24 hours, 0 bytes scanned: metrics). The experience ' +
        'weight counts one per user action: its satisfied + tolerating + frustrated equal dt.frontend.user_action.count ' +
        'exactly on both frontends (37,381 and 10,749 on the day measured). Two frontends: 37,396 actions (31,950 ' +
        'satisfied, 5,416 tolerating, 30 frustrated; 108,350 requests, 13 with a 4xx/5xx) and 10,762 actions (4,040 / ' +
        '1,362 / 5,360; 31,922 requests, 431 with a 4xx/5xx). user.sessions is not readable on this tenant, so the ' +
        'funnel is in user actions, not sessions.',
    },
  },

  'rum.audience': {
    id: 'rum.audience',
    domain: 'experience',
    purpose:
      'Per-application audience size: estimated active user sessions and unique active users. ' +
      'These estimated_count metrics are distinct-count gauges, so they are read with ' +
      'countDistinct (not sum) and scoped to real users (dt.rum.user_type real_user; synthetic ' +
      'monitors and robots excluded) to match the platform RUM overview.',
    dql: [
      'timeseries {',
      '    sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true),',
      '    users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true)',
      '  }, by: {frontend.name}, filter: (dt.rum.user_type == "real_user")',
      '| filter isNotNull(frontend.name)',
      '| fields frontend.name, sessions, users',
      '| sort sessions desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Per-app audience scorecard',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-09-08',
      environmentId: ENV,
      durationMs: 84,
      scannedBytesOnDemand: 0,
      records: 2,
      outcome: 'ok',
      notes:
        'Validated live via dtctl on the validation tenant (2026-09-08). Reading the active-user/active-session estimated_count ' +
        'metrics with countDistinct (they are distinct-count gauges, not sums) and excluding synthetic traffic ' +
        'returns real audience: over 24h ~99 unique users on each frontend and thousands of sessions ' +
        '(frontendreverseproxy-easytrade ~12,540; easytrade-frontendreverseproxy ~11,105). The earlier sum-based ' +
        'reading returned null, which is why the tiles previously showed "not observed". Metric-based, so 0 ' +
        'on-demand bytes and no hardcoded app name.',
    },
  },

  'rum.audience.total': {
    id: 'rum.audience.total',
    domain: 'experience',
    purpose:
      'Active sessions and unique users across all frontends together, real users only, as the ' +
      'platform estimates them. Adding the per-app figures would count a user once for every ' +
      'application they use.',
    dql: [
      'timeseries {',
      '    sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true),',
      '    users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true)',
      '  }, filter: (dt.rum.user_type == "real_user")',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:metrics:read',
    timeframe: 'global',
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant over 24 h: 23,762 sessions and 99 unique users overall, where the two frontends each report 99 users (summing them printed 198). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  // ------------------------------------------------------------------ 3.2.5 (M5)
  'cov.inventory.day0': {
    id: 'cov.inventory.day0',
    domain: 'coverage',
    purpose:
      'The same entity inventory read over the first day of the PoC, so the PoC Timeline can show ' +
      'what was monitored on Day 0 next to what is monitored today.',
    // Sorted by category: a no-op for the figures that keeps the request text distinct from
    // `cov.inventory` (the offline harness, and any cache keyed by text alone, tell them apart).
    dql: [INVENTORY_DQL, '| sort category asc'].join('\n'),
    shape: 'table',
    visualization: 'Day 0 to today cards',
    requiredScope: 'storage:entities:read',
    timeframe: { anchor: 'poc-day0', label: 'timeframe.poc.day0' },
    validation: liveValidation(
      '2026-10-05',
      10,
      'The entity model honours a past window: over one day 20 days back it returned 69 hosts, 106 services and 574 ' +
        'process instances; over the last day 77, 75 and 1,300. Entity model, 0 bytes. Entities whose history the ' +
        "tenant no longer keeps are absent from Day 0, and the page says so.",
    ),
  },
  'prob.poc.daily': {
    id: 'prob.poc.daily',
    domain: 'problems',
    purpose:
      'Problems that began on each day of the PoC, with how many closed, their total time to resolve and how many ' +
      'had a root cause, so the first week can be compared with the latest.',
    dql: [
      'fetch dt.davis.problems',
      '| filter not dt.davis.is_duplicate',
      '| fieldsAdd closed = event.status == "CLOSED" and isNotNull(resolved_problem_duration)',
      '| summarize opened = count(),',
      '    closedCount = countIf(closed),',
      '    closedNs = sum(if(closed, resolved_problem_duration)),',
      '    rootCaused = countIf(isNotNull(root_cause_entity_name)),',
      '    by:{day = bin(event.start, 1d)}',
      '| sort day asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'PoC Timeline: first week against the latest',
    requiredScope: 'storage:events:read',
    timeframe: { anchor: 'poc', label: 'timeframe.poc.since' },
    guards: { scanLimitGbytes: 40 },
    validation: liveValidation(
      '2026-10-05',
      38,
      'Daily bins on event.start over 30 days. The duration sum is `sum(if(closed, resolved_problem_duration))` with ' +
        'no else branch: with `else: 0` it mixed a duration with a number and every day that still had an open problem ' +
        'summed to null. Days before the start date appear (a problem active in the window may have begun earlier) and ' +
        'the app drops them. 0 bytes on the validation tenant.',
    ),
  },
  'cons.daily': {
    id: 'cons.daily',
    domain: 'consumption',
    purpose:
      "Daily billed usage per capability over the last 30 days, in each capability's own unit, for the SE-only " +
      'consumption trend and its labelled projection.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| fieldsAdd amount = coalesce(toDouble(billed_gibibyte_hours), toDouble(billed_host_hours),',
      '    toDouble(billed_pod_hours), toDouble(billed_container_hours), toDouble(billed_sessions),',
      '    toDouble(billed_http_request_count), toDouble(billed_synthetic_action_count),',
      '    toDouble(billed_invocations), toDouble(data_points), toDouble(billed_bytes), 1.0)',
      '| makeTimeseries {amount = sum(amount), events = count()}, by:{event.type}, interval: 1d',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'SE-only consumption trend and projection',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 3, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: zeroRatedValidation(21, '21 capabilities, 31 daily bins (30 complete days and today, partial). Each capability bills in its own field: GiB-hours (Full-Stack, Runtime Vulnerability Analytics, Application Protection), host-hours (Infrastructure), pod-hours (Kubernetes), container-hours (Code Monitoring), sessions (RUM), requests (HTTP monitors), actions (browser monitors), invocations (AppEngine functions), data points (metrics), bytes (ingest, query, retain); Automation Workflow and Security Posture Management carry no amount, one event per billed unit. 0 bytes. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },
  'sec.context': {
    id: 'sec.context',
    domain: 'security',
    purpose:
      'For each open vulnerability, the vulnerable component and the services and workloads it reaches, so the ' +
      'top five fixes can say what to upgrade, where it runs and who answers for it.',
    dql: [
      ...VULNERABILITY_CONTEXT,
      '| fieldsAdd services = arrayDistinct(arrayFlatten(servicesNested)),',
      '    workloads = arrayDistinct(arrayFlatten(workloadsNested))',
      '| fields displayId = vulnerability.display_id, score, components, services, workloads',
      '| sort score desc',
      `| limit ${VULNERABILITY_LIST_LIMIT}`,
    ].join('\n'),
    shape: 'table',
    visualization: 'Security fix queue context',
    requiredScope: 'storage:security.events:read',
    timeframe: { relative: 'now-30m', label: 'timeframe.pinned.30m' },
    guards: { scanLimitGbytes: 25, maxResultRecords: VULNERABILITY_LIST_LIMIT },
    validation: {
      validatedOn: '2026-10-05',
      environmentId: ENV,
      durationMs: null,
      scannedBytesOnDemand: null,
      records: 0,
      outcome: 'no-permission',
      notes:
        'The validation identity cannot read security.events (403), like sec.vulnerabilities. The added fields ' +
        '(affected_entity.vulnerable_component.short_name, related_entities.services.names, ' +
        'related_entities.kubernetes_workloads.names) follow the platform vulnerability-event schema; absent fields ' +
        'collect to empty lists, so the fix queue then shows the vulnerability without its component. Check on a tenant ' +
        'where storage:security.events:read is granted.',
    },
  },
  'svc.owners': {
    id: 'svc.owners',
    domain: 'services',
    purpose:
      'The tags of every tagged service, from which the security fix queue reads an owner or team tag, or falls ' +
      'back to the Kubernetes namespace, labelled as such.',
    dql: [
      'fetch dt.entity.service',
      '| fields name = entity.name, tags',
      '| filter isNotNull(tags) and arraySize(tags) > 0',
    ].join('\n'),
    shape: 'table',
    visualization: 'Owner lookup (not shown on its own)',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: liveValidation(
      '2026-10-05',
      5,
      'Entity model, 0 bytes. On the validation tenant the tags are Env:, k8s.namespace.name:, k8s.cluster.name: and ' +
        'kubernetes-pod: — no owner or team tag, so the queue shows the namespace there.',
    ),
  },

  // ---------------------------------------------------------------- 3.2.6
  'poc.daily.signals': {
    id: 'poc.daily.signals',
    domain: 'automation',
    purpose:
      'Workflow executions (and how many succeeded) and log volume ingested on each day of the PoC, so the PoC ' +
      'Timeline shows automation and log adoption beside the problems, and dates the first automation.',
    dql: [
      'fetch dt.system.events',
      '| filter (event.kind == "WORKFLOW_EVENT" and event.type == "WORKFLOW_EXECUTION" and dt.automation_engine.state.is_final == true)',
      '    or (event.kind == "BILLING_USAGE_EVENT" and event.type == "Log Management & Analytics - Ingest & Process")',
      '| makeTimeseries {',
      '    executions = countIf(event.kind == "WORKFLOW_EVENT"),',
      '    succeeded = countIf(event.kind == "WORKFLOW_EVENT" and dt.automation_engine.state == "SUCCESS"),',
      '    logBytes = sum(if(event.kind == "BILLING_USAGE_EVENT", billed_bytes))',
      '  }, interval: 1d',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'PoC Timeline: daily adoption series',
    requiredScope: 'storage:system:read',
    timeframe: { anchor: 'poc', label: 'timeframe.poc.since' },
    guards: { scanLimitGbytes: 5 },
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant from 28 Sep: 8 daily bins aligned to UTC midnight, ~6,500 workflow executions a day (~5,600 succeeded) and ~23.4 GB of logs ingested a day; the last bin partial. Log volume only — no price is applied. 0 bytes scanned. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },
  'poc.daily.rum': {
    id: 'poc.daily.rum',
    domain: 'experience',
    purpose:
      'Real-user actions, requests and errors on each day of the PoC, so the PoC Timeline shows the digital ' +
      'experience beside the problems.',
    dql: [
      'timeseries {',
      '    actions = sum(dt.frontend.user_action.count),',
      '    requests = sum(dt.frontend.request.count),',
      '    errors = sum(dt.frontend.error.count)',
      '  }, interval: 1d, filter: (dt.rum.user_type == "real_user")',
    ].join('\n'),
    shape: 'timeseries',
    visualization: 'PoC Timeline: daily adoption series',
    requiredScope: 'storage:metrics:read',
    timeframe: { anchor: 'poc', label: 'timeframe.poc.since' },
    validation: zeroRatedValidation(1, 'Validated live on the validation tenant from 28 Sep: 8 daily bins, ~93k-101k real-user actions, ~265k-287k requests and ~2.3k-5k errors a day. Metric query, 0 bytes. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },
  'rum.app.flow': {
    id: 'rum.app.flow',
    domain: 'experience',
    purpose:
      'Which services each web frontend calls, and what those services call next, from the entity model, so the ' +
      'Digital experience page draws the flow of its busiest applications.',
    dql: [
      'fetch dt.entity.application',
      '| fieldsAdd entry = calls[dt.entity.service]',
      '| filter isNotNull(entry)',
      '| expand entry',
      '| lookup [fetch dt.entity.service | fields id, entity.name, next = calls[dt.entity.service]], sourceField: entry, lookupField: id, prefix: "entry."',
      '| expand hop = entry.next',
      '| lookup [fetch dt.entity.service | fields id, entity.name], sourceField: hop, lookupField: id, prefix: "hop."',
      '| fields frontend = entity.name, frontendId = id, entry, entryName = entry.entity.name, hop, hopName = hop.entity.name',
      '| limit 400',
    ].join('\n'),
    shape: 'table',
    visualization: 'Per-application flow map',
    requiredScope: 'storage:entities:read',
    timeframe: 'global',
    validation: liveValidation(
      '2026-10-05',
      22,
      'Entity model, 0 bytes. On the validation tenant two frontends call one entry service each (the reverse ' +
        'proxies), which call 13 and 8 services; a frontend that calls no service is filtered out. Capped at 400 ' +
        'rows: the page draws only the two busiest frontends and never counts the rows.',
    ),
  },

  'rum.frontend.ids': {
    id: 'rum.frontend.ids',
    domain: 'experience',
    purpose:
      'The Experience Vitals id (FRONTEND-…) of each web application Dynatrace Intelligence reports by its classic id (APPLICATION-…), ' +
      'read from the dimensions of the frontend request metric, so a frontend opens straight on its own page in the ' +
      'platform. Problems never carry the FRONTEND id.',
    dql: [
      'timeseries requests = sum(dt.frontend.request.count, scalar: true), by: {frontend.name, dt.rum.application.entity, dt.smartscape.frontend}',
      '| filter isNotNull(dt.rum.application.entity) and isNotNull(dt.smartscape.frontend)',
      '| fieldsAdd applicationId = toString(dt.rum.application.entity), frontendId = toString(dt.smartscape.frontend)',
      '| fields frontend.name, applicationId, frontendId, requests',
      '| sort requests desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Frontend id map (links only)',
    requiredScope: 'storage:metrics:read',
    timeframe: { relative: 'now-7d', label: 'timeframe.pinned.7d' },
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: zeroRatedValidation(2, 'Metric dimensions, 0 bytes. Both frontends of the validation tenant mapped: APPLICATION-6331991FD4EFBB24 → FRONTEND-32E311F297817EA0 and APPLICATION-1F31F034940B45EF → FRONTEND-1C56BD052D1AD8FF. The smartscape id only compares through toString() or toSmartscapeId(); a plain string filter returns no rows. Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  // 3.2.7 (real-prints deck): the shot planner opens a cluster on its own page in the Kubernetes app.
  'k8s.cluster.ids': {
    id: 'k8s.cluster.ids',
    domain: 'kubernetes',
    purpose:
      'The Smartscape id (K8S_CLUSTER-…) of each Kubernetes cluster, read from the dimensions of the container CPU metric, ' +
      'so a cluster opens straight on its page in the Kubernetes app. The classic KUBERNETES_CLUSTER-… id shares no digits with it.',
    dql: [
      'timeseries cpu = sum(dt.kubernetes.container.cpu_usage, scalar: true), by: {k8s.cluster.name, dt.smartscape.k8s_cluster}',
      '| filter isNotNull(k8s.cluster.name) and isNotNull(dt.smartscape.k8s_cluster)',
      '| fieldsAdd clusterId = toString(dt.smartscape.k8s_cluster)',
      '| fields clusterName = k8s.cluster.name, clusterId',
      '| sort clusterName asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Cluster id map (links only)',
    requiredScope: 'storage:metrics:read',
    timeframe: { relative: 'now-24h', label: 'timeframe.pinned.24h' },
    guards: { maxResultRecords: BOUNDED_LIST_CEILING },
    validation: zeroRatedValidation(6, 'Metric dimensions, 0 bytes. ard-dynatrace-gcp-monitor → K8S_CLUSTER-53B76CCF6F84D68E (the verified owner link); loan-app-dynakube → K8S_CLUSTER-87E7E0B19F2B0431. The smartscape id must go through toString(). Cost measured 2026-11-03: 0 scanned bytes (this data object is not billed by scan).'),
  },

  // TD-08 (3.3.2): the RCA trail's callers, the incident's logs and the real-prints evidence, as
  // parameterised templates (queries/catalogTemplates.ts, rendered by queries/params.ts).
  ...TEMPLATE_ENTRIES,


  // ---------------------------------------------------------------- 3.4.4
  // Platform adoption (owner's order of 2026-11-18, the "Dynatrace Intelligence feature adoption" and
  // "Dynatrace Platform Adoption v1.5.0" dashboards composed into one page). Every read is a count from
  // `dt.system.events`: `user.id` and `user_email` are counted, never returned. Validated with the
  // owner's approval on 2026-11-18, each at 0 scanned bytes (`docs/v3.4/ADOCAO-CONSULTAS-VALIDADAS.md`).
  'adopt.platform.total': {
    id: 'adopt.platform.total',
    domain: 'automation',
    purpose:
      'How the platform is used by people and by integrations: distinct users in the browser (and how many of ' +
      'them belong to the Dynatrace organisation), distinct apps opened, browser actions, API calls and calls to ' +
      'Dynatrace Intelligence and its analyzers. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| summarize { users = countDistinctExact(if(`request.source` == "BROWSER", `user.id`)),',
      '    dynatraceUsers = countDistinctExact(if(`request.source` == "BROWSER" and user.organization == "DYNATRACE", `user.id`)),',
      '    apps = countDistinctExact(if(`request.source` == "BROWSER" and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher", `dt.app.id`)),',
      '    browserActions = countIf(`request.source` == "BROWSER"),',
      '    apiCalls = countIf(`request.source` == "OTHER"),',
      '    aiCalls = countIf(contains(toString(resource), "/davis/")),',
      '    analyzerCalls = countIf(contains(toString(resource), "/davis/analyzer")) }',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary band and the adoption index',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 978,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval: 16 browser users (13 of the ' +
        'Dynatrace organisation), 49 apps, 82,616 browser actions, 9,155 API calls, 2,016 Davis calls, 573 analyzer calls. 0 scanned bytes.',
    },
  },

  'adopt.platform.daily': {
    id: 'adopt.platform.daily',
    domain: 'automation',
    purpose:
      'Distinct browser users per day, averaged over the days with activity, so stickiness (daily ÷ monthly ' +
      'users) is a measured ratio. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| fieldsAdd day = formatTimestamp(timestamp, format: "yyyy-MM-dd")',
      '| summarize { dau = countDistinctExact(`user.id`) }, by: { day }',
      '| summarize { avgDau = avg(toDouble(dau)), activeDays = count() }',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Stickiness figure',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 670,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok' as const,
      notes: 'Validated live on the validation tenant over 30 days, with the owner\'s approval: 4.36 users a day on average over 25 active days. 0 scanned bytes.',
    },
  },

  'adopt.platform.apps': {
    id: 'adopt.platform.apps',
    domain: 'automation',
    purpose:
      'Every app opened in the browser, with its actions and distinct users, so the page shows which parts of the ' +
      'platform the teams use. The list is bounded by the apps installed, not cut. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| filter isNotNull(`dt.app.id`) and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher"',
      '| summarize { actions = count(), users = countDistinctExact(`user.id`) }, by: { app = `dt.app.id` }',
      '| sort actions desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Bars of the apps in use',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 1752,
      scannedBytesOnDemand: 0,
      records: 49,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval: 49 apps; the most used were ' +
        'Notebooks (20,069 actions, 8 users) and Dashboards (12,040, 10). 0 scanned bytes.',
    },
  },

  'adopt.platform.breadth': {
    id: 'adopt.platform.breadth',
    domain: 'automation',
    purpose:
      'How many distinct apps each user opened, grouped 1, 2–3, 4–6 and 7 or more, so the page shows how broadly ' +
      'people use the platform; 7 or more is a power user in the DPA method. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| filter isNotNull(`dt.app.id`) and `dt.app.id` != "dynatrace.appshell" and `dt.app.id` != "dynatrace.launcher"',
      '| summarize { appCount = countDistinctExact(`dt.app.id`) }, by: { `user.id` }',
      '| fieldsAdd segment = if(appCount == 1, "1", else: if(appCount <= 3, "2-3", else: if(appCount <= 6, "4-6", else: "7+")))',
      '| summarize { users = count() }, by: { segment }',
      '| sort segment asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Bars of users by breadth',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 586,
      scannedBytesOnDemand: 0,
      records: 4,
      outcome: 'ok' as const,
      notes: 'Validated live on the validation tenant over 30 days, with the owner\'s approval: 1 / 3 / 4 / 8 users with 1, 2–3, 4–6 and 7+ apps. 0 scanned bytes.',
    },
  },

  'adopt.platform.trend': {
    id: 'adopt.platform.trend',
    domain: 'automation',
    purpose:
      'Distinct browser users and their actions for each day of the window, so the page draws how use rises and ' +
      'falls over time and names the busiest day. A day without a row had no browser activity. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| summarize { users = countDistinctExact(`user.id`), actions = count() }, by: { day = bin(timestamp, 1d) }',
      '| sort day asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Daily line of users and actions',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 294,
      scannedBytesOnDemand: 0,
      records: 25,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval (3.4.7): 25 days with activity, ' +
        'the busiest 10,717 actions by 7 users; at most one row per day of the window. 0 scanned bytes.',
    },
  },

  'adopt.platform.hours': {
    id: 'adopt.platform.hours',
    domain: 'automation',
    purpose:
      'Browser actions for each hour of the window, so the page shows on which weekdays and at which hours the ' +
      'platform is used, folded into the viewer\'s own time zone. At most one row per hour. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "AUDIT_EVENT" and event.provider == "API_GATEWAY" and `request.source` == "BROWSER"',
      '| filter `user.id` != "UNKNOWN" and `user.id` != "system"',
      '| summarize { actions = count() }, by: { hour = bin(timestamp, 1h) }',
      '| sort hour asc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Weekday × hour heat map',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 206,
      scannedBytesOnDemand: 0,
      records: 243,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval (3.4.7): 243 hours with ' +
        'activity out of 720; at most 720 rows, under the platform\'s 1,000-record default. 0 scanned bytes.',
    },
  },

  'adopt.ai.skills': {
    id: 'adopt.ai.skills',
    domain: 'automation',
    purpose:
      'Dynatrace Intelligence by skill (Assist chat, natural-language queries, explanations, document search…): ' +
      'invocations, successes and distinct users of each. The list is bounded by the skills the platform offers. ' +
      'Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "GENAI_EVENT" and event.type == "GenAI Skill Invocation"',
      '| summarize { invocations = count(), succeeded = countIf(status == "SUCCESSFUL"), users = countDistinctExact(user_email) }, by: { skill }',
      '| sort invocations desc',
    ].join('\n'),
    shape: 'table',
    visualization: 'Bars by skill',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2, maxResultRecords: BOUNDED_LIST_CEILING },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 665,
      scannedBytesOnDemand: 0,
      records: 4,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval: nl2dql 318 (307 succeeded, 3 users), ' +
        'operator 314 (313, 6), chat 144 (144, 6), document-search 1. 0 scanned bytes.',
    },
  },

  // Dynatrace Intelligence (Davis AI / Assist) in use: from the owner's adoption dashboards of
  // 2026-11-18, aggregated so no user is ever named — `user_email` is only counted, never returned.
  'adopt.ai.total': {
    id: 'adopt.ai.total',
    domain: 'automation',
    purpose:
      'How much the teams use Dynatrace Intelligence (Assist, natural-language queries, explanations): ' +
      'invocations, how many succeeded, failed or were blocked, how many distinct users and skills, and the ' +
      'feedback given. Counted only; no user is named.',
    dql: [
      'fetch dt.system.events',
      '| filter event.kind == "GENAI_EVENT"',
      '| summarize { invocations = countIf(event.type == "GenAI Skill Invocation"),',
      '    succeeded = countIf(event.type == "GenAI Skill Invocation" and status == "SUCCESSFUL"),',
      '    failed = countIf(event.type == "GenAI Skill Invocation" and status == "FAILED"),',
      '    blocked = countIf(event.type == "GenAI Skill Invocation" and status == "BLOCKED"),',
      '    users = countDistinctExact(if(event.type == "GenAI Skill Invocation", user_email)),',
      '    skills = countDistinctExact(if(event.type == "GenAI Skill Invocation", skill)),',
      '    feedback = countIf(event.type == "GenAI Feedback"),',
      '    positive = countIf(event.type == "GenAI Feedback" and feedback.type == "positive"),',
      '    negative = countIf(event.type == "GenAI Feedback" and feedback.type == "negative") }',
    ].join('\n'),
    shape: 'scalar',
    visualization: 'Summary tiles',
    requiredScope: 'storage:system:read',
    timeframe: { relative: 'now-30d', label: 'timeframe.pinned.30d' },
    guards: { scanLimitGbytes: 2 },
    validation: {
      validatedOn: '2026-11-18',
      environmentId: ENV,
      durationMs: 533,
      scannedBytesOnDemand: 0,
      records: 1,
      outcome: 'ok' as const,
      notes:
        'Validated live on the validation tenant over 30 days, with the owner\'s approval: 777 invocations (765 succeeded, ' +
        '11 failed, 1 blocked), 7 users, 4 skills, no feedback yet. 0 scanned bytes (dt.system.events is not billed by scan).',
    },
  },

} satisfies Record<string, CatalogEntry>;

/** 3.3.4: the 37 costs measured from the app's own executions (`measuredCosts.ts`). */
const entries = withMeasuredCosts(catalogEntries);

export const CATALOG: Catalog = entries;

export type CatalogId = keyof typeof entries;

export function getQuery(id: CatalogId): CatalogEntry {
  return entries[id];
}

/**
 * The text a catalog entry runs with these parameter values, or null when a value is refused
 * (TD-08). Pure: the builders that print a query on a slide use it; hooks go through
 * `useCatalogQuery`, which also refuses to run.
 */
export function renderQuery(id: CatalogId, values?: CatalogParamValues | null): string | null {
  return renderOrNull(entries[id], values);
}

/** All entries for a domain, used by the technical appendix and the advisor. */
export function queriesByDomain(domain: CatalogEntry['domain']): CatalogEntry[] {
  return Object.values(entries).filter((entry) => entry.domain === domain);
}

export const ALL_QUERIES: readonly CatalogEntry[] = Object.values(entries);
