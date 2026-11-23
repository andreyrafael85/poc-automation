import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRootCallersDql } from '../models/trailLinks';
import { ALL_QUERIES } from '../queries/catalog';
import { assembleBundle, assemblePack, worstOutcome } from '../features/wrapup/prints/evidence/assemble';
import * as B from '../features/wrapup/prints/evidence/builders';
import { evidenceRequest, hash8, planEvidenceRequests } from '../features/wrapup/prints/evidence/plan';
import { DYNAMIC_EVIDENCE_IDS, EVIDENCE_QUERIES, identifyEvidenceQuery } from '../features/wrapup/prints/evidence/registry';
import {
  isoOf,
  minuteSeries,
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
  timeframeMinutes,
} from '../features/wrapup/prints/evidence/summarise';
import { clampWindow, dayWindow, eventsWindow, globalWindow, incidentWindow, problemWindow, recurrenceWindow, screenWindow } from '../features/wrapup/prints/evidence/windows';
import { EVIDENCE_SLOTS, type EvidenceQueryId, type ShotSlot } from '../features/wrapup/prints/types';
import {
  A10_FAILING,
  A11_FAILED,
  A12_LOGS,
  A13_SERVICE_SCREEN,
  A14_ENTITY_EVENTS,
  A15_FAILING_ENDPOINTS,
  A16_BLAST,
  A17_HUBS,
  A1_PROBLEM_EVENTS,
  A2_CALLERS,
  A3_SERVICE_MINUTES,
  A4_ENDPOINTS,
  A5_FRONTEND_W,
  A6_FRONTEND_PROBLEM,
  A7_FRONTEND_MINUTES,
  A8B_WORKLOADS,
  A8C_CHURN,
  A8D_INCIDENT_RESTARTS,
  A8_CAPACITY_ARD,
  A8_CAPACITY_LOAN,
  A9_RECURRENCE,
  LAB,
  LAB_INCIDENT,
  LAB_PLAN,
  labPlanInput,
  labPrint,
  labPrints,
  labResult,
  labResults,
} from './fixtures/prints.lab';

/** The `useDql` double: answers each query from the lab rows, as the visual harness does (by signature). */
const dql = vi.hoisted(() => ({
  calls: [] as { params: { query: string; defaultTimeframeStart?: string; defaultTimeframeEnd?: string; defaultScanLimitGbytes?: number; maxResultRecords?: number }; enabled: boolean }[],
  answer: (() => ({ data: undefined, error: null, isLoading: true })) as (query: string, enabled: boolean) => { data: unknown; error: unknown; isLoading: boolean },
}));

vi.mock('@dynatrace-sdk/react-hooks', () => ({
  useDql: (params: { query: string }, options: { enabled?: boolean }) => {
    const enabled = options.enabled !== false;
    dql.calls.push({ params, enabled });
    const answer = dql.answer(params.query, enabled);
    return { ...answer, refetch: () => Promise.resolve(undefined) };
  },
}));

vi.mock('@dynatrace-sdk/client-query', () => ({
  isErrorEnvelopeError: (error: unknown) => typeof error === 'object' && error !== null && 'body' in error,
}));

/**
 * The evidence engine of the real-prints deck (3.2.7, WP5): the exact DQL of every builder, the
 * id validation that keeps names and user text out of a query, the DQL traps the builders encode,
 * the registry the visual harness resolves dynamic queries with, the windows (never derived from
 * `event.id`), the plan of the 23 fixed slots, and the summarisers run on the Appendix A rows.
 */

const ROOT = LAB.root;
const SVC = LAB.caller;

/** §4.3 of the spec, verbatim, with the lab's validated ids in place of `<…>`. */
const SPEC_DQL: Record<string, string> = {
  B1: `fetch dt.davis.events
| lookup [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | filter event.id == "${LAB.eventId}" | sort timestamp desc | limit 1 | expand eid = dt.davis.event_ids | fields eid], sourceField: event.id, lookupField: eid, prefix: "p."
| filter isNotNull(p.eid)
| dedup event.id, sort: {timestamp desc}
| fieldsAdd source = toString(dt.source_entity), sourceName = coalesce(dt.entity.service.name, dt.entity.application.name), detail = substring(event.description, from: 0, to: 160), writtenAt = timestamp
| fields event.id, event.name, event.category, event.start, event.end, writtenAt, source, sourceName, detail
| sort event.start asc
| limit 12
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | filter event.id == "${LAB.eventId}" | sort timestamp desc | limit 1 | fieldsAdd isProblem = true, users = toLong(dt.davis.affected_users_count), eventCount = arraySize(dt.davis.event_ids), impact = dt.davis.impact_level, problemStatus = event.status, severity = event.severity, pStart = event.start, pEnd = event.end | fields isProblem, users, eventCount, impact, problemStatus, severity, pStart, pEnd]`,
  B2: `fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and isNotNull(root_cause_entity_id)
| dedup event.id, sort: {timestamp desc}
| summarize problems = count(), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, rankName = takeFirst(root_cause_entity_name), by: {rootId = root_cause_entity_id}
| sort problems desc
| limit 3
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) and root_cause_entity_id == "${ROOT}" | dedup event.id, sort: {timestamp desc} | summarize problems = count(), closed = countIf(event.status == "CLOSED"), medianMin = median(toLong(resolved_problem_duration)) / 60000000000, p90Min = percentile(toLong(resolved_problem_duration), 90) / 60000000000 | fieldsAdd isAnchor = true]
| append [fetch dt.davis.problems | filter not(dt.davis.is_duplicate) | dedup event.id, sort: {timestamp desc} | summarize problems = count(), rootCaused = countIf(isNotNull(root_cause_entity_id)), medianMin = median(toLong(resolved_problem_duration)) / 60000000000 | fieldsAdd isTotal = true]`,
  B4: `timeseries { requests = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count), p90 = percentile(dt.service.request.response_time, 90) }, by: {dt.entity.service}, filter: in(dt.entity.service, array("${LAB.root}", "${LAB.caller}")), interval: 1m
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), req = arraySum(requests), fail = arraySum(failures)
| fields id, name, timeframe, interval, requests, failures, p90, req, fail`,
  B5: `timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}, filter: in(dt.entity.service, array("${SVC}"))
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)
| fields id, name, endpoint.name, requests, failures, ratePct
| sort failures desc, requests desc
| limit 10`,
  B6: `timeseries { lcp_p75 = percentile(dt.frontend.web.page.largest_contentful_paint, 75, scalar: true), inp_p75 = percentile(dt.frontend.web.page.interaction_to_next_paint, 75, scalar: true), cls_x10k_p75 = percentile(dt.frontend.web.page.cumulative_layout_shift, 75, scalar: true), ttfb_p75 = percentile(dt.frontend.web.navigation.time_to_first_byte, 75, scalar: true), reqs = sum(dt.frontend.request.count, scalar: true), errs = sum(dt.frontend.error.count, scalar: true), ua_p75 = percentile(dt.frontend.user_action.duration, 75, scalar: true), users = countDistinct(dt.frontend.user.active.estimated_count, scalar: true), sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true) }, filter: dt.smartscape.frontend == toSmartscapeId("${LAB.frontend}") and dt.rum.user_type == "real_user"
| fieldsAdd cls = cls_x10k_p75 / 10000.0, errorsPer100 = round(100.0 * errs / reqs, decimals: 2)`,
  B7: `timeseries { reqs = sum(dt.frontend.request.count), errs = sum(dt.frontend.error.count) }, filter: dt.smartscape.frontend == toSmartscapeId("${LAB.frontend}") and dt.rum.user_type == "real_user", interval: 1m
| fieldsAdd totalReqs = arraySum(reqs), totalErrs = arraySum(errs)
| fields timeframe, interval, reqs, errs, totalReqs, totalErrs`,
  B8: `timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == "${SVC}"
| fieldsAdd p50Ms = round(p50 / 1000, decimals: 2), failurePct = round(100.0 * failures / requests, decimals: 2)
| fields endpoint.name, requests, failures, failurePct, p50Ms
| sort p50Ms desc
| limit 10
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), avgRt = avg(dt.service.request.response_time, scalar: true), p50All = percentile(dt.service.request.response_time, 50, scalar: true) }, filter: dt.entity.service == "${SVC}" | fieldsAdd isTotal = true, failurePct = round(100.0 * failures / requests, decimals: 2), avgMs = round(avgRt / 1000, decimals: 1), p50Ms = round(p50All / 1000, decimals: 2)]`,
  B9: `fetch dt.davis.events
| filter toString(dt.source_entity) == "${LAB.broker}" or in("${LAB.broker}", affected_entity_ids)
| dedup event.id, sort: {timestamp desc}
| summarize events = count(), byCategory = collectDistinct(event.category), last = max(event.start), names = collectDistinct(event.name)`,
  B10: `timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), cpuLim = sum(dt.kubernetes.container.limits_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg), memLim = sum(dt.kubernetes.container.limits_memory, rollup: avg) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}"), interval: 5m
| fieldsAdd cpuUsedCores = arrayAvg(cpu) / 1000, cpuReqCores = arrayAvg(cpuReq) / 1000, cpuLimCores = arrayAvg(cpuLim) / 1000, memUsedGiB = arrayAvg(mem) / 1073741824, memReqGiB = arrayAvg(memReq) / 1073741824, memLimGiB = arrayAvg(memLim) / 1073741824
| fields cpuUsedCores, cpuReqCores, cpuLimCores, memUsedGiB, memReqGiB, memLimGiB
| append [timeseries { cpuA = sum(dt.kubernetes.node.cpu_allocatable, rollup: avg), memA = sum(dt.kubernetes.node.memory_allocatable, rollup: avg) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}"), interval: 5m | fieldsAdd cpuAllocCores = arrayAvg(cpuA) / 1000, memAllocGiB = arrayAvg(memA) / 1073741824, isAllocatable = true | fields isAllocatable, cpuAllocCores, memAllocGiB]`,
  B11: `timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), cpuReq = sum(dt.kubernetes.container.requests_cpu, rollup: avg), mem = sum(dt.kubernetes.container.memory_working_set, rollup: avg), memReq = sum(dt.kubernetes.container.requests_memory, rollup: avg) }, by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}"), interval: 5m
| fieldsAdd cpuAvg = arrayAvg(cpu), cpuReqAvg = arrayAvg(cpuReq), memAvg = arrayAvg(mem), memReqAvg = arrayAvg(memReq)
| fieldsAdd memOfReqPct = round(100.0 * memAvg / memReqAvg, decimals: 1), cpuOfReqPct = round(100.0 * cpuAvg / cpuReqAvg, decimals: 1), memReqGiB = round(memReqAvg / 1073741824, decimals: 2), memUsedGiB = round(memAvg / 1073741824, decimals: 2)
| fields k8s.workload.name, k8s.namespace.name, memOfReqPct, cpuOfReqPct, memReqGiB, memUsedGiB
| sort memReqGiB desc
| limit 8`,
  B12: `timeseries restarts = sum(dt.kubernetes.container.restarts, scalar: true), by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}")
| filter restarts > 0
| lookup [timeseries oom = sum(dt.kubernetes.container.oom_kills, scalar: true), by: {k8s.workload.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}")], sourceField: k8s.workload.name, lookupField: k8s.workload.name, prefix: "x."
| fields k8s.workload.name, k8s.namespace.name, restarts, oomKills = x.oom
| sort restarts desc
| limit 5
| append [timeseries { restarts = sum(dt.kubernetes.container.restarts, scalar: true) }, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}") | fieldsAdd isTotal = true]`,
  B13: `timeseries restarts = sum(dt.kubernetes.container.restarts), by: {k8s.workload.name, k8s.namespace.name}, filter: dt.smartscape.k8s_cluster == toSmartscapeId("${LAB.cluster}"), interval: 1m
| fieldsAdd total = arraySum(restarts)
| filter total > 0
| fieldsAdd firstIdx = arrayIndexOf(iCollectArray(if(restarts[] > 0, 1, else: 0)), 1)
| fields k8s.workload.name, k8s.namespace.name, total, firstIdx, timeframe
| sort total desc
| limit 10`,
  B14: `timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}
| filter requests >= 500 and failures > 0
| fieldsAdd k = 1
| lookup [timeseries { r = sum(dt.service.request.count, scalar: true), f = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd k = 1, envRate = toDouble(f) / r | fields k, envRate, envRequests = r, envFailures = f], sourceField: k, lookupField: k, prefix: "env."
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), failurePct = round(100.0 * failures / requests, decimals: 2), excess = round(failures - requests * env.envRate, decimals: 0), timesEnv = round((toDouble(failures) / requests) / env.envRate, decimals: 1)
| sort failures - requests * env.envRate desc, id asc
| limit 5
| fields id, name, requests, failures, failurePct, excess, timesEnv, env.envRequests, env.envFailures
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}, filter: dt.entity.service == "${LAB.broker}" | filter requests >= 500 and failures > 0 | fieldsAdd k = 1 | lookup [timeseries { r = sum(dt.service.request.count, scalar: true), f = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd k = 1, envRate = toDouble(f) / r | fields k, envRate, envRequests = r, envFailures = f], sourceField: k, lookupField: k, prefix: "env." | fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), failurePct = round(100.0 * failures / requests, decimals: 2), excess = round(failures - requests * env.envRate, decimals: 0), timesEnv = round((toDouble(failures) / requests) / env.envRate, decimals: 1), isSubject = true | fields id, name, requests, failures, failurePct, excess, timesEnv, env.envRequests, env.envFailures, isSubject]`,
  B14b: `timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p50 = percentile(dt.service.request.response_time, 50, scalar: true), p90 = percentile(dt.service.request.response_time, 90, scalar: true) }, by: {endpoint.name}, filter: dt.entity.service == "${SVC}"
| fieldsAdd failurePct = round(100.0 * failures / requests, decimals: 2), p50Ms = round(p50 / 1000, decimals: 1), p90Ms = round(p90 / 1000, decimals: 1)
| fields endpoint.name, requests, failures, failurePct, p50Ms, p90Ms
| sort failures desc
| limit 6`,
  B15: `fetch logs
| filter status == "ERROR"
| fieldsAdd signature = substring(replacePattern(replaceString(content, "\\n", " "), "DIGIT+", "#"), from: 0, to: 110), origin = coalesce(k8s.namespace.name, dt.process.name, log.source, "n/a")
| summarize occurrences = count(), origins = countDistinct(origin), topOrigin = takeMax(origin), by: {signature}
| sort occurrences desc
| limit 6
| append [fetch logs | filter status == "ERROR" | summarize occurrences = count() | fieldsAdd isTotal = true]`,
  B16: `timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service, endpoint.name}
| filter failures > 0
| fieldsAdd id = toString(dt.entity.service), name = entityName(dt.entity.service), ratePct = round(100.0 * failures / requests, decimals: 2)
| fields id, name, endpoint.name, requests, failures, ratePct
| sort failures desc, requests desc
| limit 8
| append [timeseries { requests = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) } | fieldsAdd isTotal = true]`,
  B17: `fetch dt.entity.service
| filter id == "${ROOT}"
| fieldsAdd rootType = serviceType
| expand hop1 = called_by[dt.entity.service]
| lookup [fetch dt.entity.service | fields id, entity.name, up = called_by[dt.entity.service], apps = called_by[dt.entity.application]], sourceField: hop1, lookupField: id, prefix: "h1."
| expand hop2 = h1.up
| lookup [fetch dt.entity.service | fields id, entity.name, apps = called_by[dt.entity.application]], sourceField: hop2, lookupField: id, prefix: "h2."
| summarize rootType = takeAny(rootType), hop1 = countDistinct(hop1), hop2 = countDistinct(hop2), hop1Ids = collectDistinct(hop1), hop2Ids = collectDistinct(hop2), appsNested = collectArray(arrayConcat(coalesce(h1.apps, array()), coalesce(h2.apps, array())))
| fieldsAdd apps = arrayDistinct(arrayFlatten(appsNested))
| fieldsAdd appCount = arraySize(apps)
| fieldsRemove appsNested`,
  B18: `fetch dt.entity.service
| fieldsAdd callers = coalesce(arraySize(called_by[dt.entity.service]), 0), callees = coalesce(arraySize(calls[dt.entity.service]), 0)
| fieldsAdd degree = callers + callees
| fields id, entity.name, serviceType, callers, callees, degree
| sort degree desc
| limit 5
| append [fetch dt.entity.service | fieldsAdd d = coalesce(arraySize(called_by[dt.entity.service]), 0) + coalesce(arraySize(calls[dt.entity.service]), 0) | summarize services = count(), isolated = countIf(d == 0), dbServices = countIf(serviceType == "DATABASE_SERVICE") | fieldsAdd isTotal = true]`,
  B19: `timeseries { cpu = avg(dt.host.cpu.usage), mem = avg(dt.host.memory.usage) }, by: {dt.entity.host}, interval: 5m
| fieldsAdd name = entityName(dt.entity.host), cpuAvg = round(arrayAvg(cpu), decimals: 1), cpuPeak = round(arrayMax(cpu), decimals: 1), memAvg = round(arrayAvg(mem), decimals: 1), memPeak = round(arrayMax(mem), decimals: 1)
| fields dt.entity.host, name, cpuAvg, cpuPeak, memAvg, memPeak
| sort cpuPeak desc
| limit 3
| append [timeseries { cpu = avg(dt.host.cpu.usage), mem = avg(dt.host.memory.usage) }, by: {dt.entity.host}, filter: dt.entity.host == "${LAB.hostRoot}", interval: 5m | fieldsAdd name = entityName(dt.entity.host), cpuAvg = round(arrayAvg(cpu), decimals: 1), cpuPeak = round(arrayMax(cpu), decimals: 1), memAvg = round(arrayAvg(mem), decimals: 1), memPeak = round(arrayMax(mem), decimals: 1), isSubject = true | fields dt.entity.host, name, cpuAvg, cpuPeak, memAvg, memPeak, isSubject]
| append [timeseries cpu = avg(dt.host.cpu.usage), by: {dt.entity.host}, interval: 5m | fieldsAdd c = arrayAvg(cpu) | summarize hosts = count(), medianCpu = median(c), under10 = countIf(c < 10) | fieldsAdd isTotal = true]`,
};

/** Every builder with the lab's ids, keyed by the spec's B number. */
const BUILT: Record<string, { id: EvidenceQueryId; dql: string | null }> = {
  B1: { id: 'ev.problem.events', dql: B.problemEventsDql(LAB.eventId) },
  B2: { id: 'ev.problem.recurrence', dql: B.recurrenceDql(ROOT) },
  B3: { id: 'ev.incident.callers', dql: B.incidentCallersDql(ROOT) },
  B4: { id: 'ev.service.minutes', dql: B.serviceMinutesDql([LAB.root, LAB.caller]) },
  B5: { id: 'ev.service.endpoints', dql: B.serviceEndpointsDql(SVC) },
  B6: { id: 'ev.frontend.summary', dql: B.frontendSummaryDql(LAB.frontend) },
  B7: { id: 'ev.frontend.minutes', dql: B.frontendMinutesDql(LAB.frontend) },
  B8: { id: 'ev.service.screen', dql: B.serviceScreenDql(SVC) },
  B9: { id: 'ev.entity.events', dql: B.entityEventsDql(LAB.broker) },
  B10: { id: 'ev.k8s.capacity', dql: B.k8sCapacityDql(LAB.cluster) },
  B11: { id: 'ev.k8s.workloads', dql: B.k8sWorkloadsDql(LAB.cluster) },
  B12: { id: 'ev.k8s.churn', dql: B.k8sChurnDql(LAB.cluster) },
  B13: { id: 'ev.k8s.incidentRestarts', dql: B.k8sIncidentRestartsDql(LAB.cluster) },
  B14: { id: 'ev.failing.services', dql: B.failingServicesDql(LAB.broker) },
  B14b: { id: 'ev.failing.endpoints', dql: B.failingEndpointsDql(SVC) },
  B15: { id: 'ev.logs.errors', dql: B.logErrorsDql() },
  B16: { id: 'ev.failed.endpoints', dql: B.failedEndpointsDql() },
  B17: { id: 'ev.topology.blast', dql: B.topologyBlastDql(ROOT) },
  B18: { id: 'ev.topology.hubs', dql: B.topologyHubsDql() },
  B19: { id: 'ev.host.cpu', dql: B.hostCpuDql(LAB.hostRoot) },
};
const texts = () => Object.entries(BUILT).map(([name, built]) => [name, built.dql ?? ''] as const);

/** Builders that take an id, with a valid one, for the injection tests. */
const ID_BUILDERS: [string, (id: string) => string | null, string][] = [
  ['B1', B.problemEventsDql, LAB.eventId],
  ['B2', B.recurrenceDql, ROOT],
  ['B3', B.incidentCallersDql, ROOT],
  ['B4', (id) => B.serviceMinutesDql([id]), ROOT],
  ['B5', B.serviceEndpointsDql, SVC],
  ['B6', B.frontendSummaryDql, LAB.frontend],
  ['B7', B.frontendMinutesDql, LAB.frontend],
  ['B8', B.serviceScreenDql, SVC],
  ['B9', B.entityEventsDql, LAB.broker],
  ['B10', B.k8sCapacityDql, LAB.cluster],
  ['B11', B.k8sWorkloadsDql, LAB.cluster],
  ['B12', B.k8sChurnDql, LAB.cluster],
  ['B13', B.k8sIncidentRestartsDql, LAB.cluster],
  ['B14', B.failingServicesDql, LAB.broker],
  ['B14b', B.failingEndpointsDql, SVC],
  ['B17', B.topologyBlastDql, ROOT],
  ['B19', B.hostCpuDql, LAB.hostRoot],
];

describe('builders: the exact DQL of §4.3', () => {
  it('returns the spec text for every builder', () => {
    for (const [name, built] of Object.entries(BUILT)) {
      const expected = name === 'B3' ? buildRootCallersDql(ROOT) : SPEC_DQL[name];
      expect(built.dql, name).toBe(expected);
    }
    expect(Object.keys(SPEC_DQL).sort()).toEqual(Object.keys(BUILT).filter((name) => name !== 'B3').sort());
  });

  it('joins lines with \\n and de-duplicates the services of B4', () => {
    expect(B.serviceMinutesDql([ROOT, SVC, ROOT])).toBe(B.serviceMinutesDql([ROOT, SVC]));
    expect(B.serviceMinutesDql([])).toBeNull();
    const seven = Array.from({ length: 7 }, (_, index) => `SERVICE-${String(index).padStart(16, '0')}`);
    expect(B.serviceMinutesDql(seven)).toBeNull();
    expect(B.serviceMinutesDql(seven.slice(0, 6))).not.toBeNull();
    for (const [, text] of texts()) expect(text).not.toMatch(/\r/);
  });

  it('refuses every id that is not a validated one (injection, lower case, names, short ids)', () => {
    const attempts = (valid: string) => [
      `${valid}" | fetch logs | limit 1 //`,
      `${valid} | fetch logs`,
      `${valid}\n| fetch logs`,
      valid.toLowerCase(),
      'easyTradeManager',
      'TradeManagement',
      'FRONTEND-12',
      'SERVICE-C44033DE8492CF4',
      'SERVICE-C44033DE8492CF45X',
      ' SERVICE-C44033DE8492CF45',
      '',
      'https://abc12345.apps.dynatrace.com/ui/apps/x',
      '1495944828232761706_1790117520000V2"); fetch logs',
    ];
    for (const [name, build, valid] of ID_BUILDERS) {
      expect(build(valid), `${name} accepts its validated id`).not.toBeNull();
      for (const attempt of attempts(valid)) expect(build(attempt), `${name}: ${JSON.stringify(attempt)}`).toBeNull();
    }
  });

  it('accepts only its own entity type', () => {
    expect(B.serviceEndpointsDql(LAB.frontend)).toBeNull();
    expect(B.frontendSummaryDql(LAB.application)).toBeNull();
    expect(B.k8sCapacityDql('KUBERNETES_CLUSTER-87E7E0B19F2B0431')).toBeNull(); // the classic id shares no digits with the Smartscape one
    expect(B.k8sCapacityDql(SVC)).toBeNull();
    expect(B.topologyBlastDql(LAB.hostRoot)).toBeNull();
    expect(B.recurrenceDql(LAB.hostRoot)).not.toBeNull();
    expect(B.problemEventsDql(LAB.displayId)).toBeNull();
    expect(B.incidentCallersDql(LAB.hostRoot)).toBeNull();
    expect(B.hostCpuDql(SVC)).toBeNull();
    expect(B.failingServicesDql(LAB.hostRoot)).toBeNull();
  });
});

describe('DQL traps encoded in the builders (§4.5)', () => {
  it('sums every Kubernetes gauge with rollup: avg (restarts and OOM kills are counters)', () => {
    let gauges = 0;
    for (const [name, text] of texts()) {
      for (const match of text.matchAll(/sum\((dt\.kubernetes\.[a-z_.]+)([^)]*)\)/g)) {
        const metric = match[1] ?? '';
        if (/\.(restarts|oom_kills)$/.test(metric)) continue;
        gauges += 1;
        expect(match[2], `${name}: ${metric}`).toContain('rollup: avg');
      }
    }
    expect(gauges).toBeGreaterThanOrEqual(12);
  });

  it('reads frontend metrics for real users only, through toSmartscapeId', () => {
    for (const [name, text] of texts()) {
      if (!text.includes('dt.frontend.')) continue;
      expect(text, name).toContain('dt.rum.user_type == "real_user"');
      expect(text, name).toContain('toSmartscapeId(');
    }
  });

  it('compares smartscape ids only through toSmartscapeId (filters) or toString (output)', () => {
    for (const [name, text] of texts()) {
      for (const match of text.matchAll(/dt\.smartscape\.[a-z_]+ == ([^,\s)]+)/g)) expect(match[1], name).toMatch(/^toSmartscapeId\(/);
    }
  });

  it('never uses bins:, spans or user events, nor entityName(dt.source_entity)', () => {
    for (const [name, text] of texts()) {
      expect(text, name).not.toContain('bins:');
      expect(text, name).not.toContain('fetch spans');
      expect(text, name).not.toContain('fetch user.events');
      expect(text, name).not.toContain('entityName(dt.source_entity)');
    }
  });

  it('keeps not(dt.davis.is_duplicate) on every problem read', () => {
    for (const [name, text] of texts()) {
      const reads = text.split('fetch dt.davis.problems').length - 1;
      const kept = text.split('not(dt.davis.is_duplicate)').length - 1;
      expect(kept, name).toBe(reads);
    }
    expect((BUILT.B1?.dql ?? '').split('not(dt.davis.is_duplicate)').length - 1).toBe(2);
    expect((BUILT.B2?.dql ?? '').split('not(dt.davis.is_duplicate)').length - 1).toBe(3);
  });

  it('keeps B6 within the 10 metric keys of one timeseries, and never labels errors per 100 a percentage', () => {
    const b6 = BUILT.B6?.dql ?? '';
    expect(b6.match(/dt\.frontend\.[a-z_.]+/g)?.length).toBe(9);
    expect(b6).toContain('errorsPer100');
    expect(b6).toMatch(/countDistinct\(dt\.frontend\.user\.active\.estimated_count/);
    expect(b6).not.toMatch(/countDistinctIf/);
  });

  it('puts the sparse OOM metric in a lookup, not in a multi-metric timeseries', () => {
    const b12 = BUILT.B12?.dql ?? '';
    expect(b12).toMatch(/\| lookup \[timeseries oom = sum\(dt\.kubernetes\.container\.oom_kills/);
    expect(b12.split('\n')[0]).not.toContain('oom_kills');
  });
});

describe('the registry', () => {
  it('identifies every builder by its own signature, and no other catalog query', () => {
    for (const [name, built] of Object.entries(BUILT)) {
      expect(identifyEvidenceQuery(built.dql ?? ''), name).toBe(built.id);
      const matching = Object.values(EVIDENCE_QUERIES).filter((meta) => meta.signature.test(built.dql ?? ''));
      expect(matching.map((meta) => meta.id), name).toEqual([built.id]);
    }
    // TD-08: the evidence templates are catalog entries; a template may match its own signature only.
    const own = new Map(Object.values(EVIDENCE_QUERIES).map((meta) => [meta.catalogId as string, meta.id]));
    for (const entry of ALL_QUERIES) {
      const identified = identifyEvidenceQuery(entry.dql);
      if (identified !== null) expect(own.get(entry.id), entry.id).toBe(identified);
    }
    const unrelated = ALL_QUERIES.filter((entry) => !own.has(entry.id));
    expect(unrelated.length).toBeGreaterThan(70);
    for (const entry of unrelated) expect(identifyEvidenceQuery(entry.dql), entry.id).toBeNull();
    expect(identifyEvidenceQuery('fetch logs | limit 1')).toBeNull();
  });

  it('covers the 20 ids exactly once, at ≤ 5 GB each, logs ≤ 6 h', () => {
    const ids = Object.keys(EVIDENCE_QUERIES);
    expect(ids).toHaveLength(20);
    expect(new Set(Object.values(BUILT).map((built) => built.id))).toEqual(new Set(ids));
    for (const meta of Object.values(EVIDENCE_QUERIES)) {
      expect(meta.scanLimitGbytes, meta.id).toBeLessThanOrEqual(5);
      expect(meta.scanLimitGbytes, meta.id).toBeGreaterThan(0);
      expect(meta.maxResultRecords, meta.id).toBeGreaterThan(0);
      expect(meta.validatedOn).toBe('2026-10-05');
    }
    expect(EVIDENCE_QUERIES['ev.logs.errors'].maxWindowMs).toBeLessThanOrEqual(6 * 3600_000);
    expect(EVIDENCE_QUERIES['ev.logs.errors'].requiredScope).toBe('storage:logs:read');
  });

  it('flags B3 as the trail’s callers text, resolved by the harness’s own regex, and leaves it out of the dynamic ids', () => {
    expect(EVIDENCE_QUERIES['ev.incident.callers'].sameTextAs).toBe('rca.callers');
    const mock = readFileSync(join(process.cwd(), 'scripts/visual/mocks/react-hooks.mjs'), 'utf8');
    const harness = /const ROOT_CALLERS = (\/.+\/);/.exec(mock)?.[1];
    expect(harness).toBe(String(EVIDENCE_QUERIES['ev.incident.callers'].signature));
    expect(DYNAMIC_EVIDENCE_IDS).toHaveLength(19);
    expect(DYNAMIC_EVIDENCE_IDS).not.toContain('ev.incident.callers');
  });
});

// ------------------------------------------------------------------ windows

const NOW = Date.parse('2026-10-05T19:00:00.000Z'); // = LAB_NOW

describe('windows (§4.1)', () => {
  it('gives P-260914359 the one incident window 22/09 22:14–23:24 UTC (70 min)', () => {
    const W = incidentWindow(LAB_INCIDENT, '2026-09-22T22:44:00.000Z', NOW);
    expect(W).toEqual({ kind: 'incident', startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z', source: 'derived', minutes: 70 });
  });

  it('never reads a time from event.id (its number is the first grouped event, 22:52)', () => {
    const epoch = Number(LAB.eventId.split('_')[1]?.replace('V2', ''));
    expect(new Date(epoch).toISOString()).toBe('2026-09-22T22:52:00.000Z');
    const shifted = { ...LAB_INCIDENT, eventId: '-1_1000000000000V2' };
    expect(incidentWindow(shifted, '2026-09-22T22:44:00.000Z', NOW)).toEqual(incidentWindow(LAB_INCIDENT, '2026-09-22T22:44:00.000Z', NOW));
    expect(eventsWindow(shifted, NOW)).toEqual(eventsWindow(LAB_INCIDENT, NOW));
  });

  it('anchors on the problem start without events, and caps an open problem at now', () => {
    const noEvents = incidentWindow(LAB_INCIDENT, null, NOW);
    expect(noEvents.startIso).toBe('2026-09-22T22:27:00.000Z');
    expect(noEvents.endIso).toBe('2026-09-22T23:24:00.000Z');
    const now = Date.parse('2026-09-22T23:30:00.000Z');
    const open = incidentWindow({ ...LAB_INCIDENT, endIso: null }, '2026-09-22T22:44:00.000Z', now);
    expect(open.endIso).toBe('2026-09-22T23:30:00.000Z');
    const longOpen = incidentWindow({ ...LAB_INCIDENT, endIso: null }, null, Date.parse('2026-09-23T12:00:00.000Z'));
    expect(longOpen.endIso).toBe('2026-09-23T05:12:00.000Z'); // anchor 22:57 + 6 h + 15 min
  });

  it('reads the problem and events windows from the snapshot', () => {
    expect(problemWindow(LAB_INCIDENT, NOW)).toMatchObject({ startIso: '2026-09-22T22:57:00.000Z', endIso: '2026-09-22T23:09:00.000Z', minutes: 12 });
    expect(eventsWindow(LAB_INCIDENT, NOW)).toMatchObject({ startIso: '2026-09-22T21:57:00.000Z', endIso: '2026-09-23T00:09:00.000Z' });
    expect(eventsWindow({ ...LAB_INCIDENT, endIso: null }, Date.parse('2026-09-22T23:30:00.000Z')).endIso).toBe('2026-09-22T23:30:00.000Z');
  });

  it('reads the screen window from the screen’s label, else the layout fallback, logs capped at 6 h', () => {
    const record = { layout: 'services.details' as const, capturedAtIso: '2026-10-05T19:11:00.000Z', screenTimeframeLabel: 'Last 2 hours' };
    expect(screenWindow(record, 'services.details', NOW)).toMatchObject({ kind: 'screen', source: 'screen-label', minutes: 120, endIso: '2026-10-05T19:00:00.000Z' });
    const earlier = { ...record, capturedAtIso: '2026-10-05T18:58:00.000Z' };
    expect(screenWindow(earlier, 'services.details', NOW)).toMatchObject({ startIso: '2026-10-05T16:58:00.000Z', endIso: '2026-10-05T18:58:00.000Z' });
    expect(screenWindow({ ...earlier, screenTimeframeLabel: null }, 'services.details', NOW)).toMatchObject({ source: 'layout-default', minutes: 30 });
    expect(screenWindow({ ...earlier, layout: 'logs.filter', screenTimeframeLabel: null }, 'logs.filter', NOW)).toMatchObject({ source: 'url', minutes: 120 });
    expect(screenWindow({ ...earlier, layout: 'logs.filter', screenTimeframeLabel: 'Last 7 days' }, 'logs.filter', NOW)).toMatchObject({ source: 'screen-label', minutes: 360 });
    expect(screenWindow(null, 'vitals.web', NOW)).toMatchObject({ source: 'layout-default', minutes: 120, endIso: new Date(NOW).toISOString() });
  });

  it('reads 15 days, 24 h and the app’s global window, and cuts a window to a registry limit', () => {
    expect(recurrenceWindow(NOW)).toMatchObject({ kind: 'recurrence', minutes: 15 * 1440, startIso: '2026-09-20T19:00:00.000Z' });
    expect(dayWindow(NOW)).toMatchObject({ kind: 'day', minutes: 1440 });
    const global = globalWindow({ startIso: '2026-10-04T19:00:00.000Z', endIso: '2026-10-05T19:00:00.000Z' });
    expect(global).toMatchObject({ kind: 'global', source: 'app', minutes: 1440 });
    expect(clampWindow(global, 3600_000)).toMatchObject({ startIso: '2026-10-05T18:00:00.000Z', endIso: '2026-10-05T19:00:00.000Z', minutes: 60 });
    expect(clampWindow(global, 2 * 86400_000)).toBe(global);
  });
});

// ------------------------------------------------------------------ the plan of the 23 slots

const W_ISO = { startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z' };
const input = labPlanInput;
const allPrints = labPrints;

describe('planEvidenceRequests (§4.2)', () => {
  it('runs only the planning-grade pair without prints', () => {
    const requests = planEvidenceRequests(input({ prints: new Map() }));
    const enabled = EVIDENCE_SLOTS.filter((name) => requests[name] !== null);
    expect(enabled).toEqual(['problemEvents', 'incidentCallers']);
    expect(requests.problemEvents?.window).toMatchObject({ kind: 'events', startIso: '2026-09-22T21:57:00.000Z' });
    expect(requests.incidentCallers?.window).toMatchObject({ kind: 'incident', ...W_ISO });
    expect(requests.incidentCallers?.dql).toBe(buildRootCallersDql(LAB.root));
  });

  it('holds the callers read until B1 settles, and runs nothing without an incident', () => {
    expect(planEvidenceRequests(input({ problemEventsSettled: false })).incidentCallers).toBeNull();
    // Every read over W waits too, so none runs once over a provisional W and again over the final one (3.2.7 review DQL-3).
    const W_SLOTS = ['incidentMinutes', 'incidentEndpoints', 'frontendIncident', 'frontendMinutes', 'k8sIncidentRestarts'] as const;
    const early = planEvidenceRequests(input({ prints: allPrints(), firstEventStartIso: null, problemEventsSettled: false }));
    const final = planEvidenceRequests(input({ prints: allPrints() }));
    for (const slot of W_SLOTS) {
      expect(early[slot], slot).toBeNull();
      expect(final[slot]?.window, slot).toMatchObject({ kind: 'incident', ...W_ISO });
    }
    expect(early.rootScreen).not.toBeNull();
    const none = planEvidenceRequests(input({ plan: { ...LAB_PLAN, incident: null }, prints: new Map() }));
    expect(EVIDENCE_SLOTS.filter((name) => none[name] !== null)).toEqual([]);
  });

  it('enables every slot whose shot is included and has a usable print', () => {
    const requests = planEvidenceRequests(input());
    const disabled = EVIDENCE_SLOTS.filter((name) => requests[name] === null);
    expect(disabled).toEqual(['hostCpu']); // the host slot is opt-in (not included)
    expect(requests.incidentMinutes?.dql).toBe(B.serviceMinutesDql([LAB.root, LAB.caller]));
    expect(requests.incidentMinutes?.window).toMatchObject(W_ISO);
    expect(requests.frontendProblem?.window).toMatchObject({ kind: 'problem', startIso: '2026-09-22T22:57:00.000Z', endIso: '2026-09-22T23:09:00.000Z' });
    expect(requests.frontendScreen?.window).toMatchObject({ kind: 'screen', source: 'layout-default', minutes: 120 });
    expect(requests.k8sCapacity?.window).toMatchObject({ kind: 'screen', minutes: 30 });
    expect(requests.k8sChurn?.window.kind).toBe('day');
    expect(requests.failingServices?.window).toMatchObject({ kind: 'global', source: 'app' });
    expect(requests.recurrence?.window.kind).toBe('recurrence');
    expect(requests.topologyBlast?.dql).toBe(B.topologyBlastDql(LAB.root));
  });

  it('keeps the logs request at the screen’s 2 hours (≤ 6 h) and every request at ≤ 5 GB', () => {
    const requests = planEvidenceRequests(input());
    const logs = requests.logErrors;
    expect(logs?.window).toMatchObject({ source: 'screen-label', minutes: 120 });
    expect(Date.parse(logs?.window.endIso ?? '') - Date.parse(logs?.window.startIso ?? '')).toBeLessThanOrEqual(2 * 3600_000);
    expect(logs?.scanLimitGbytes).toBe(5);
    for (const name of EVIDENCE_SLOTS) if (requests[name] !== null) expect(requests[name]?.scanLimitGbytes, name).toBeLessThanOrEqual(5);
  });

  it('skips failed landings, excluded shots and prints of other slots', () => {
    const prints = allPrints();
    const logsSlot = LAB_PLAN.slots[6] as ShotSlot;
    prints.set(logsSlot.id, labPrint(logsSlot, { landing: 'session_lost' }));
    expect(planEvidenceRequests(input({ prints })).logErrors).toBeNull();
    const excluded = { ...LAB_PLAN, slots: LAB_PLAN.slots.map((item) => (item.kind === 'smartscape' ? { ...item, included: false } : item)) };
    const requests = planEvidenceRequests(input({ plan: excluded }));
    expect(requests.topologyHubs).toBeNull();
    expect(requests.topologyBlast).toBeNull();
    // A manual print (landing unknown), keyed by its own id, still counts.
    const manual = new Map([[`p1`, labPrint(logsSlot, { landing: 'unknown', source: 'manual' })]]);
    expect(planEvidenceRequests(input({ prints: manual })).logErrors).not.toBeNull();
  });

  it('gives stable keys: same inputs, same key; a refresh or another window, another key', () => {
    const a = planEvidenceRequests(input());
    const b = planEvidenceRequests(input({ prints: allPrints() }));
    for (const name of EVIDENCE_SLOTS) expect(a[name]?.key, name).toBe(b[name]?.key);
    const refreshed = planEvidenceRequests(input({ refreshToken: 1 }));
    expect(refreshed.recurrence?.key).not.toBe(a.recurrence?.key);
    const key = a.incidentMinutes?.key ?? '';
    expect(key).toBe(`ev.service.minutes|${W_ISO.startIso}|${W_ISO.endIso}|${hash8(a.incidentMinutes?.dql ?? '')}|0`);
    expect(hash8('abc')).toMatch(/^[0-9a-f]{8}$/);
    expect(hash8('abc')).toBe(hash8('abc'));
    expect(hash8('abc')).not.toBe(hash8('abd'));
  });

  it('cuts a window longer than the registry allows', () => {
    const long = { kind: 'global' as const, startIso: '2025-01-01T00:00:00.000Z', endIso: '2026-10-05T19:00:00.000Z', source: 'app' as const, minutes: 0 };
    const request = evidenceRequest('ev.logs.errors', 'logErrors', B.logErrorsQuery(), long, 0);
    expect(Date.parse(request?.window.endIso ?? '') - Date.parse(request?.window.startIso ?? '')).toBe(6 * 3600_000);
    expect(evidenceRequest('ev.logs.errors', 'logErrors', null, long, 0)).toBeNull();
  });
});

// ------------------------------------------------------------------ summarisers on Appendix A rows

describe('summarisers (§4.4) on the Appendix A rows', () => {
  it('B1: the problem row and the events, in start order, written later', () => {
    const { problem, firstEventStartIso } = summariseProblemEvents(A1_PROBLEM_EVENTS);
    expect(firstEventStartIso).toBe('2026-09-22T22:44:00.000Z');
    expect(problem).toMatchObject({ davisUsers: 52, eventCount: 5, impact: ['Application', 'Services'], status: 'CLOSED', severity: '3', startIso: '2026-09-22T22:57:00.000Z', endIso: '2026-09-22T23:09:00.000Z' });
    expect(problem?.events).toHaveLength(5);
    expect(problem?.events.every((event) => event.writtenAtIso === '2026-09-22T23:11:55.483Z')).toBe(true);
    expect(problem?.events.map((event) => event.startIso.slice(11, 16))).toEqual(['22:44', '22:44', '22:52', '22:52', '22:57']);
    const detail = problem?.events[2]?.detail ?? '';
    expect(detail).not.toContain('ops@contoso.example');
    expect(detail).not.toContain('10.1.2.3');
    expect(summariseProblemEvents([]).problem).toBeNull();
  });

  it('B2: rank by id, the anchor and the totals', () => {
    const recurrence = summariseRecurrence(A9_RECURRENCE);
    expect(recurrence).toMatchObject({ anchorProblems: 6, medianMin: 9, p90Min: 17, totalProblems: 2505, rootCaused: 22 });
    expect(recurrence.rank.map((row) => [row.id, row.problems])).toEqual([[LAB.root, 6], [LAB.hostRoot, 2], [LAB.datadog, 2]]);
  });

  it('B3: the callers through the trail’s summariser', () => {
    const callers = summariseCallers(A2_CALLERS);
    expect(callers.rootType).toBe('DATABASE_SERVICE');
    expect(callers.rows[0]).toMatchObject({ id: LAB.caller, failures: 341, requests: 12344 });
    expect(callers.rows.reduce((sum, row) => sum + (row.failures ?? 0), 0)).toBe(360);
  });

  it('B4: 70 one-minute points per service from timeframe.start, nulls kept', () => {
    const services = summariseServiceMinutes(A3_SERVICE_MINUTES);
    expect(services.map((service) => [service.name, service.totals.requests, service.totals.failures])).toEqual([
      ['TradeManagement', 38248, 351],
      ['easyTradeManager', 12344, 341],
    ]);
    const etm = services[1];
    expect(etm?.requests).toMatchObject({ startIso: '2026-09-22T22:14:00.000Z', stepMs: 60_000 });
    expect(etm?.requests.values).toHaveLength(70);
    expect(etm?.requests.values.slice(40, 44)).toEqual([null, null, null, null]);
    expect(minuteSeries({ timeframe: { start: 'x', end: 'y' }, interval: '60000000000', a: [1] }, 'a')).toBeNull();
  });

  it('B5, B14b, B16: endpoint rows and the failed totals', () => {
    expect(summariseServiceEndpoints(A4_ENDPOINTS).slice(0, 2).map((row) => [row.endpoint, row.failures])).toEqual([['GetPackages', 166], ['GetProducts', 165]]);
    expect(summariseFailingEndpoints(A15_FAILING_ENDPOINTS)[1]).toMatchObject({ endpoint: 'POST v1/trade/long/process', failurePct: 3.01, p50Ms: 6682.5 });
    const failed = summariseFailedEndpoints(A11_FAILED);
    expect(failed).toMatchObject({ totalRequests: 832433, totalFailures: 284 });
    expect(failed?.rows).toHaveLength(8);
    expect(summariseFailedEndpoints(A11_FAILED.slice(0, 3))).toBeNull();
  });

  it('B6/B7: real-user summaries with their returned timeframe, and the per-minute series', () => {
    expect(summariseFrontend(A5_FRONTEND_W, 0)).toMatchObject({ lcpMs: 576, inpMs: 4978.8, cls: 0.001, requests: 4593, errors: 371, users: 86, sessions: 401, timeframeMinutes: 70 });
    expect(summariseFrontend(A6_FRONTEND_PROBLEM, 0)).toMatchObject({ users: 30, sessions: 46, requests: 398, errors: 64, cls: null, timeframeMinutes: 12 });
    const minutes = summariseFrontendMinutes(A7_FRONTEND_MINUTES);
    expect(minutes?.errors.values[40]).toBe(81);
    expect(minutes?.requests.values[42]).toBeNull();
  });

  it('B8: the service page’s totals over the resolved 31 minutes', () => {
    const screen = summariseServiceScreen(A13_SERVICE_SCREEN, LAB.caller, 30);
    expect(screen).toMatchObject({ serviceId: LAB.caller, requests: 6004, failures: 7, avgMs: 485.9, p50Ms: 2.78, timeframeMinutes: 31 });
    expect(screen?.endpoints[0]).toMatchObject({ endpoint: 'GET api/Accounts', p50Ms: 37.72 });
    expect(timeframeMinutes(A13_SERVICE_SCREEN[3])).toBe(31);
  });

  it('B9: the events on one entity in 24 h', () => {
    expect(summariseEntityEvents(A14_ENTITY_EVENTS)).toEqual({ count: 8, categories: ['ERROR', 'SLOWDOWN'], lastIso: '2026-10-05T18:02:00.000Z' });
  });

  it('B10–B13: capacity, workloads, churn and the incident’s restarts kept to its namespaces', () => {
    expect(summariseK8sCapacity(A8_CAPACITY_ARD)).toEqual({ cpuUsed: 0.49, cpuReq: 13.695, cpuLim: 31.148, cpuAlloc: 15.82, memUsedGiB: 4.86, memReqGiB: 55.17, memLimGiB: 58.54, memAllocGiB: 55.17 });
    expect(summariseK8sCapacity(A8_CAPACITY_LOAN)?.memAllocGiB).toBe(82.75);
    expect(summariseK8sWorkloads(A8B_WORKLOADS)[0]).toMatchObject({ name: 'kafka-broker', memOfReqPct: 117.5 });
    expect(summariseK8sChurn(A8C_CHURN)).toMatchObject({ total: 1522 });
    expect(summariseK8sChurn(A8C_CHURN).rows[0]).toEqual({ workload: 'sqs-demo', namespace: 'sqs-demo', restarts: 669, oom: 257 });
    expect(summariseIncidentRestarts(A8D_INCIDENT_RESTARTS, ['easytrade'])).toEqual([{ workload: 'pricing-service', namespace: 'easytrade', total: 2, firstIso: '2026-09-22T23:01:00.000Z' }]);
    expect(summariseIncidentRestarts(A8D_INCIDENT_RESTARTS, [])).toHaveLength(4);
  });

  it('B14: excess ranking with the environment rate', () => {
    const failing = summariseFailingServices(A10_FAILING);
    expect(failing.envRate).toBeCloseTo(1900 / 6905550, 10);
    expect(failing.rows[0]).toMatchObject({ id: LAB.broker, excess: 196, timesEnv: 10.1 });
  });

  it('B14: the subject row joins the ranking once, so a swapped sixth service keeps its KPIs (3.2.7 review DQL-2)', () => {
    const sixth = 'SERVICE-C5969E2CC2E44142';
    const env = { 'env.envRequests': 10077145, 'env.envFailures': 3354 };
    const subject = { id: sixth, name: 'EasyTravelWebserver:9079', requests: 1052, failures: 69, failurePct: 6.56, excess: 69, timesEnv: 197.1, ...env, isSubject: true };
    const withSubject = summariseFailingServices([...A10_FAILING, subject]);
    expect(withSubject.rows.find((row) => row.id === sixth)).toMatchObject({ timesEnv: 197.1, excess: 69 });
    expect(withSubject.rows.slice(0, A10_FAILING.length).map((row) => row.id)).toEqual(summariseFailingServices(A10_FAILING).rows.map((row) => row.id));
    const first = A10_FAILING[0] ?? {};
    const duplicate = summariseFailingServices([...A10_FAILING, { ...first, isSubject: true }]);
    expect(duplicate.rows.filter((row) => row.id === LAB.broker)).toHaveLength(1);
    expect(summariseFailingServices([subject]).envRate).toBeCloseTo(3354 / 10077145, 10);
  });

  it('B15: signatures redacted, the total from its tagged row', () => {
    const logs = summariseLogErrors(A12_LOGS);
    expect(logs.totalErrors).toBe(15126);
    expect(logs.signatures).toHaveLength(6);
    const joined = logs.signatures.map((row) => row.signature).join('\n');
    expect(joined).not.toContain('ops@contoso.example');
    expect(joined).not.toContain('10.1.2.3');
  });

  it('B17/B18: the blast radius by id and the hubs with the model’s totals', () => {
    expect(summariseTopologyBlast(A16_BLAST)).toEqual({ rootType: 'DATABASE_SERVICE', hop1Ids: [LAB.broker, LAB.login, LAB.order, LAB.caller], hop2Ids: [LAB.port80, LAB.entry2], apps: [LAB.application] });
    expect(summariseTopologyHubs(A17_HUBS)).toMatchObject({ services: 94, isolated: 29, dbServices: 7 });
    expect(summariseTopologyHubs(A17_HUBS).hubs.filter((hub) => hub.name === 'BrokerService')).toHaveLength(2);
  });

  it('B19 and sec.posture', () => {
    const host = summariseHostCpu(
      [
        { 'dt.entity.host': 'HOST-AAAAAAAAAAAAAAAA', name: 'ip-172-31-93-120.ec2.internal', cpuAvg: 75.7, cpuPeak: 98.1, memAvg: 61, memPeak: 70 },
        { isTotal: true, hosts: 40, medianCpu: 2.3, under10: 31 },
      ],
      'HOST-AAAAAAAAAAAAAAAA',
    );
    expect(host).toMatchObject({ cpuAvg: 75.7, fleetMedianCpu: 2.3, hosts: 40, under10: 31 });
    // A host outside the three hottest (live lab tenant, 2026-10-06) is read from its isSubject row (3.2.7 review DQL-1).
    const calm = summariseHostCpu(
      [
        { 'dt.entity.host': 'HOST-C563A91EA4A3F4D3', name: 'EC2AMAZ-1P8FLTC', cpuAvg: 36.1, cpuPeak: 96.5, memAvg: 69.2, memPeak: 72.8 },
        { 'dt.entity.host': 'HOST-FB604DBB42EF2259', name: 'ip-172-31-20-189.ec2.internal', cpuAvg: 60.6, cpuPeak: 96.5, memAvg: 45.1, memPeak: 45.2 },
        { 'dt.entity.host': 'HOST-F69CCF097816CE6D', name: 'ip-172-31-93-120.ec2.internal', cpuAvg: 74.1, cpuPeak: 90.4, memAvg: 70.5, memPeak: 79 },
        { 'dt.entity.host': LAB.hostRoot, name: LAB.hostRootName, cpuAvg: 7.3, cpuPeak: 41.6, memAvg: 32.7, memPeak: 39.5, isSubject: true },
        { isTotal: true, hosts: '29', medianCpu: 3.3856701405843097, under10: '24' },
      ],
      LAB.hostRoot,
    );
    expect(calm).toMatchObject({ name: LAB.hostRootName, cpuAvg: 7.3, cpuPeak: 41.6, memAvg: 32.7, hosts: 29, under10: 24 });
    const security = summariseSecurity([
      { level: 'CRITICAL', technology: 'JAVA', vulnerabilities: 3, actNow: 1, exploitable: 2, publicExposed: 1, inUse: 2, exploitPublic: 1, exploitInUse: 1, publicInUse: 1 },
      { level: 'HIGH', technology: 'JAVA', vulnerabilities: 5, actNow: 0 },
      { level: 'HIGH', technology: 'DOTNET', vulnerabilities: 2, actNow: 0 },
      { level: 'LOW', technology: 'DOTNET', vulnerabilities: 9, actNow: 0 },
    ]);
    expect(security).toMatchObject({ open: 19, critical: 3, high: 7, actNow: 1 });
    expect(security.byTechnology).toEqual([{ label: 'JAVA', value: 8 }, { label: 'DOTNET', value: 2 }]);
  });

  it('reads Grail instants with nanoseconds and epoch numbers; absent is null', () => {
    expect(isoOf('2026-09-22T22:44:00.000000000Z')).toBe('2026-09-22T22:44:00.000Z');
    expect(isoOf(Date.parse('2026-09-22T22:44:00.000Z'))).toBe('2026-09-22T22:44:00.000Z');
    expect(isoOf(null)).toBeNull();
    expect(isoOf('not a time')).toBeNull();
  });
});

// ------------------------------------------------------------------ packs

const ok = labResult;

describe('packs (assemble)', () => {
  it('builds one pack per shot with the parts of its kind, and lists every settled query once', () => {
    const { bundle, executed } = assembleBundle(LAB_PLAN, labResults());
    const problem = bundle['problem--p-260914359'];
    expect(problem?.outcome).toBe('ok');
    expect(problem?.problem?.davisUsers).toBe(52);
    expect(problem?.recurrence?.anchorProblems).toBe(6);
    expect(problem?.frontend?.problem?.users).toBe(30);
    expect(problem?.windows.incident).toMatchObject(W_ISO);
    const root = bundle['root-cause--service-c44033de8492cf45'];
    expect(root?.callers?.rows[0]?.failures).toBe(341);
    expect(root?.serviceScreen?.requests).toBe(6004);
    expect(root?.endpoints?.[0]?.endpoint).toBe('GetPackages');
    expect(bundle['k8s-cluster--k8s_cluster-87e7e0b19f2b0431']?.k8s?.incidentRestarts).toEqual([{ workload: 'pricing-service', namespace: 'easytrade', total: 2, firstIso: '2026-09-22T23:01:00.000Z' }]);
    expect(bundle['failing-service--service-41a4f03120e830e8']?.serviceScreen?.serviceId).toBe(LAB.broker);
    expect(bundle['vulnerabilities--list']?.outcome).toBe('disabled');
    expect(bundle['host--host-f91f108503dd0ba8']?.outcome).toBe('disabled');
    const keys = executed.map((query) => `${query.id}|${query.window?.startIso}|${query.dql}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(executed.every((query) => query.dql.length > 0 && query.outcome !== 'loading')).toBe(true);
  });

  it('never turns a refused, failed or empty read into zeros', () => {
    const requests = planEvidenceRequests(input());
    const results = labResults({
      k8sCapacity: ok([], requests.k8sCapacity, 'no-permission'),
      k8sChurn: ok([], requests.k8sChurn, 'error'),
      logErrors: ok([], requests.logErrors, 'empty'),
    });
    const { bundle } = assembleBundle(LAB_PLAN, results);
    const k8s = bundle['k8s-cluster--k8s_cluster-87e7e0b19f2b0431'];
    expect(k8s?.k8s?.capacity).toBeNull();
    expect(k8s?.k8s?.churn).toBeNull();
    expect(k8s?.outcome).toBe('no-permission');
    const logs = bundle['logs-errors--status-error-2h'];
    expect(logs?.logs).toBeUndefined();
    expect(logs?.outcome).toBe('empty');
  });

  it('ranks the worst outcome among the required queries', () => {
    expect(worstOutcome(['ok', 'partial'])).toBe('partial');
    expect(worstOutcome(['ok', 'loading', 'empty'])).toBe('loading');
    expect(worstOutcome(['ok', 'error', 'no-permission'])).toBe('error');
    expect(worstOutcome([])).toBe('disabled');
  });

  it('feeds the vulnerabilities pack from the catalog posture read, and logs from the incident logs', () => {
    const vulns = LAB_PLAN.slots[8] as ShotSlot;
    const pack = assemblePack(vulns, LAB_PLAN, labResults(), {
      security: {
        id: 'sec.posture',
        dql: ALL_QUERIES.find((entry) => entry.id === 'sec.posture')?.dql ?? '',
        outcome: 'ok',
        records: [{ level: 'CRITICAL', technology: 'JAVA', vulnerabilities: 2, actNow: 1 }],
        window: { kind: 'global', startIso: '2026-10-05T18:30:00.000Z', endIso: '2026-10-05T19:00:00.000Z', source: 'app', minutes: 30 },
        readAtIso: '2026-10-05T19:00:01.000Z',
        scannedBytes: null,
      },
      incidentLogs: null,
    });
    expect(pack.outcome).toBe('ok');
    expect(pack.security).toMatchObject({ open: 2, critical: 2, actNow: 1 });
    expect(pack.queries[0]?.id).toBe('sec.posture');
    const logsSlot = LAB_PLAN.slots[6] as ShotSlot;
    const logs = assemblePack(logsSlot, LAB_PLAN, labResults(), { security: null, incidentLogs: { outcome: 'ok', total: 0 } });
    expect(logs.logs?.incidentLogCount).toBe(0);
  });
});

// ------------------------------------------------------------------ the hooks

const { useEvidenceQuery } = await import('../features/wrapup/prints/evidence/useEvidenceQuery');
const { useEvidencePacks, useIncidentEvidence } = await import('../features/wrapup/prints/evidence/useEvidencePacks');
const { StudioProvider } = await import('../config/StudioContext');

const studio = ({ children }: { children: React.ReactNode }) => React.createElement(StudioProvider, null, children);

/** One stable data object per query text, as the platform cache would hand back. */
const answers = new Map<string, unknown>();
interface Answer {
  data: unknown;
  error: unknown;
  isLoading: boolean;
}
function labAnswer(query: string, enabled: boolean): Answer {
  if (!enabled) return { data: undefined, error: null, isLoading: false };
  const id = identifyEvidenceQuery(query);
  const rows: Partial<Record<EvidenceQueryId, GrailRows>> = {
    'ev.problem.events': A1_PROBLEM_EVENTS,
    'ev.incident.callers': A2_CALLERS,
    'ev.problem.recurrence': A9_RECURRENCE,
    'ev.service.minutes': A3_SERVICE_MINUTES,
    'ev.service.endpoints': A4_ENDPOINTS,
    'ev.service.screen': A13_SERVICE_SCREEN,
    'ev.frontend.summary': A6_FRONTEND_PROBLEM,
    'ev.frontend.minutes': A7_FRONTEND_MINUTES,
    'ev.logs.errors': A12_LOGS,
  };
  const records = id === null ? [] : (rows[id] ?? []);
  let data = answers.get(query);
  if (data === undefined) {
    data = { records, metadata: { grail: { scannedBytes: 1234, notifications: [] } } };
    answers.set(query, data);
  }
  return { data, error: null, isLoading: false };
}
type GrailRows = readonly Record<string, unknown>[];

beforeEach(() => {
  dql.calls.length = 0;
  answers.clear();
});

describe('useEvidenceQuery', () => {
  const request = () => planEvidenceRequests(labPlanInput()).incidentMinutes;

  it('is disabled without a request, and sends nothing enabled', () => {
    dql.answer = labAnswer;
    const { result } = renderHook(() => useEvidenceQuery(null));
    expect(result.current.outcome).toBe('disabled');
    expect(result.current.records).toEqual([]);
    expect(dql.calls.every((call) => !call.enabled)).toBe(true);
  });

  it('sends the request’s window and guards, and reads ok with its records', () => {
    dql.answer = labAnswer;
    const { result } = renderHook(() => useEvidenceQuery(request()));
    expect(result.current.outcome).toBe('ok');
    expect(result.current.records).toHaveLength(2);
    expect(result.current.quality.scannedBytes).toBe(1234);
    expect(result.current.readAtIso).not.toBeNull();
    const sent = dql.calls.find((call) => call.enabled)?.params;
    expect(sent).toMatchObject({ defaultTimeframeStart: '2026-09-22T22:14:00.000Z', defaultTimeframeEnd: '2026-09-22T23:24:00.000Z', defaultScanLimitGbytes: 1, maxResultRecords: 6 });
  });

  it('classifies loading, partial, empty, no-permission and error like useCatalogQuery', () => {
    const cases: [Answer, string][] = [
      [{ data: undefined, error: null, isLoading: true }, 'loading'],
      [{ data: { records: [{ a: 1 }], metadata: { grail: { notifications: [{ notificationType: 'SCAN_LIMIT_GBYTES', message: 'scan limit reached' }] } } }, error: null, isLoading: false }, 'partial'],
      [{ data: { records: [], metadata: { grail: {} } }, error: null, isLoading: false }, 'empty'],
      [{ data: undefined, error: { body: { error: { missingScopes: ['storage:logs:read'] } }, message: 'Forbidden' }, isLoading: false }, 'no-permission'],
      [{ data: undefined, error: { message: 'Missing OAuth scope storage:events:read' }, isLoading: false }, 'no-permission'],
      [{ data: undefined, error: { message: 'boom' }, isLoading: false }, 'error'],
    ];
    for (const [answer, outcome] of cases) {
      dql.answer = () => answer;
      const { result, unmount } = renderHook(() => useEvidenceQuery(request()));
      expect(result.current.outcome, outcome).toBe(outcome);
      if (outcome !== 'ok' && outcome !== 'partial') expect(result.current.records).toEqual([]);
      unmount();
    }
  });

  it('keeps the same useDql params across renders while the key holds (no refetch loop)', () => {
    dql.answer = labAnswer;
    const { rerender } = renderHook(() => useEvidenceQuery(request()));
    rerender();
    rerender();
    const sent = dql.calls.filter((call) => call.enabled).map((call) => call.params);
    expect(sent.length).toBeGreaterThanOrEqual(3);
    for (const params of sent) expect(params).toBe(sent[0]);
  });
});

describe('useIncidentEvidence and useEvidencePacks', () => {
  it('runs B1, then B3 over the final W, and nothing without an incident', () => {
    dql.answer = labAnswer;
    const { result } = renderHook(() => useIncidentEvidence(LAB_INCIDENT), { wrapper: studio });
    expect(result.current.problemEvents.outcome).toBe('ok');
    expect(result.current.firstEventStartIso).toBe('2026-09-22T22:44:00.000Z');
    expect(result.current.window).toMatchObject({ startIso: '2026-09-22T22:14:00.000Z', endIso: '2026-09-22T23:24:00.000Z' });
    expect(result.current.callers.request?.window).toMatchObject({ startIso: '2026-09-22T22:14:00.000Z' });
    expect(result.current.callers.outcome).toBe('ok');
    const none = renderHook(() => useIncidentEvidence(null), { wrapper: studio });
    expect(none.result.current.problemEvents.outcome).toBe('disabled');
    expect(none.result.current.callers.outcome).toBe('disabled');
  });

  it('holds B3 while B1 is loading', () => {
    dql.answer = (query, enabled) => (identifyEvidenceQuery(query) === 'ev.problem.events' && enabled ? { data: undefined, error: null, isLoading: true } : labAnswer(query, enabled));
    const { result } = renderHook(() => useIncidentEvidence(LAB_INCIDENT), { wrapper: studio });
    expect(result.current.problemEvents.outcome).toBe('loading');
    expect(result.current.callers.outcome).toBe('disabled');
  });

  it('assembles the bundle from the 23 slots, and settles without refetching', () => {
    dql.answer = labAnswer;
    const prints = labPrints();
    const { result, rerender } = renderHook(() => useEvidencePacks(LAB_PLAN, prints), { wrapper: studio });
    const pack = result.current.bundle['root-cause--service-c44033de8492cf45'];
    expect(pack?.callers?.rows[0]?.failures).toBe(341);
    expect(pack?.services?.map((service) => service.name)).toEqual(['TradeManagement', 'easyTradeManager']);
    expect(result.current.bundle['logs-errors--status-error-2h']?.logs?.incidentLogCount).toBe(0);
    expect(result.current.executed.length).toBeGreaterThan(10);
    const before = new Set(dql.calls.filter((call) => call.enabled).map((call) => call.params));
    act(() => rerender());
    act(() => rerender());
    const after = new Set(dql.calls.filter((call) => call.enabled).map((call) => call.params));
    expect(after.size).toBe(before.size);
  });
});

describe('the logs request after review', () => {
  it('requests B15 over at most 2 h even when the screen showed 6 h, and stops calling that window the screen’s', () => {
    const prints = labPrints();
    const logsSlot = LAB_PLAN.slots.find((slot) => slot.kind === 'logs-errors') as ShotSlot;
    prints.set(logsSlot.id, labPrint(logsSlot, { screenTimeframeLabel: 'Last 6 hours' }));
    const logs = planEvidenceRequests(labPlanInput({ prints })).logErrors;
    expect(logs?.window).toMatchObject({ kind: 'screen', source: 'derived', minutes: 120, startIso: '2026-10-05T16:58:00.000Z', endIso: '2026-10-05T18:58:00.000Z' });
    // The screen's own window is still 6 h (the guard), and a window that fits keeps its label.
    expect(screenWindow(prints.get(logsSlot.id) ?? null, 'logs.filter', NOW)).toMatchObject({ source: 'screen-label', minutes: 360 });
    expect(planEvidenceRequests(labPlanInput()).logErrors?.window).toMatchObject({ source: 'screen-label', minutes: 120 });
  });
});
