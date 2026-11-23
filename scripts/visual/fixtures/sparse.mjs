/**
 * `sparse` scenario: an environment that is barely instrumented.
 *
 * Zero or near-zero counts, empty lists, some entity categories at 0 (but not
 * all of them: "every category at zero" is the separate entity-model-down state
 * the app diagnoses on its own). Scalar queries return a row of zeros so the
 * "measured zero" path is exercised, list queries return no rows so the
 * "no telemetry" path is exercised.
 */

import { EVIDENCE_IDS } from './evidenceIds.mjs';
import { HOUR, entityId, table, timeseries } from './lib.mjs';
import { emptyPrintFixtures } from './prints.mjs';

export function buildSparse() {
  const empty = () => table([]);
  const t = (records) => table(records);

  const flat = (points, intervalMs, fields, metrics) =>
    timeseries({
      points,
      intervalMs,
      series: [{ values: Object.fromEntries(fields.map(([name, value]) => [name, Array.from({ length: points }, () => value)])) }],
      metrics,
    });

  return {
    'cov.inventory': t([
      ['Hosts', 2], ['Services', 3], ['Web applications', 0], ['Mobile applications', 0],
      ['Process instances', 5], ['Kubernetes clusters', 0], ['Kubernetes workloads', 0], ['Synthetic monitors', 0],
    ].map(([category, value]) => ({ category, value }))),
    'cov.buckets': t([
      { name: 'default_logs', table: 'logs', retentionDays: 35, includedQueryDays: 0, records: 120, bytes: 48_000, hasAccess: true },
      { name: 'default_metrics', table: 'metrics', retentionDays: 462, includedQueryDays: 0, records: 0, bytes: 0, hasAccess: true },
      { name: 'default_security_events', table: 'security.events', retentionDays: 35, includedQueryDays: 0, records: 0, bytes: 0, hasAccess: false },
    ]),
    'cov.hosts.breakdown': t([{ osType: 'LINUX', cloudType: null, monitoringMode: null, hosts: 2 }]),
    'cov.hosts.table': t([
      { id: entityId('HOST', 1), name: 'host-eu-01', osType: 'LINUX', osVersion: null, cloudType: null, monitoringMode: null, cpuCores: 2, memoryTotal: 4 * 1024 ** 3, hostGroupName: null, networkZone: null, state: 'MONITORED' },
      { id: entityId('HOST', 2), name: 'host-eu-02', osType: 'LINUX', osVersion: null, cloudType: null, monitoringMode: null, cpuCores: null, memoryTotal: null, hostGroupName: null, networkZone: null, state: 'MONITORED' },
    ]),
    'cov.dataobjects': empty(),
    'prob.summary': t([{ 'event.category': 'AVAILABILITY', 'event.status': 'CLOSED', problems: 1 }]),
    'prob.recurrent': empty(),
    'prob.list': empty(),
    'prob.timeline': empty(),
    'prob.status.rows': empty(),
    'log.errors.recent': empty(),
    'log.errors.grouped': empty(),
    'prob.mttx': empty(),
    'prob.exposure': t([{ activeProblems: 0, totalOpenNs: 0, avgOpenNs: null, oldestOpenNs: null }]),
    'prob.mttx.rca': empty(),
    'prob.exposure.rca': t([{ activeProblems: 0, totalOpenNs: 0, avgOpenNs: null, oldestOpenNs: null }]),
    'prob.topentities': empty(),
    'rca.top': empty(),
    'rca.kpi': t([{ total: 0, rootCaused: 0, active: 0, resolved: 0, avgAffected: null }]),
    'rca.logs': empty(),
    'rca.trend': empty(),
    'rca.catmix': empty(),
    'svc.golden': flat(6, HOUR, [['requests', 0], ['failures', 0], ['responseTime', 0]], [
      { fieldName: 'requests', unit: 'count' }, { fieldName: 'failures', unit: 'count' }, { fieldName: 'responseTime', unit: 'us' },
    ]),
    'svc.ranking': empty(),
    'svc.breakdown': t([{ serviceType: 'CUSTOM_SERVICE', agentTechnologyType: 'SDK', services: 3 }]),
    'svc.topology': t([
      { id: entityId('SERVICE', 1), name: 'svc-checkout-01', serviceType: 'CUSTOM_SERVICE', technologies: [], databaseVendor: null, databaseName: null, databaseHosts: [], isExternal: false, publicDomain: null, port: null },
    ]),
    'infra.trend': flat(4, HOUR, [['cpuPct', 1.2], ['memoryPct', 3.4]], [
      { fieldName: 'cpuPct', unit: 'Percent' }, { fieldName: 'memoryPct', unit: 'Percent' },
    ]),
    'cloud.hosts': empty(),
    'cloud.hosts.detail': empty(),
    'cloud.services': empty(),
    'lic.hosts': t([{ hosts: 1, memoryBytes: 4 * 1024 ** 3, huBucket: 1, monitoringMode: null }, { hosts: 1, memoryBytes: 0, huBucket: null, monitoringMode: null }]),
    'lic.k8spods': t([{ pods: 0 }]),
    'k8s.clusters': empty(),
    'k8s.restarts': empty(),
    'k8s.pressure': empty(),
    'k8s.inventory': empty(),
    'k8s.restarts.trend': empty(),
    'svc.topology.calls': empty(),
    'log.ingest.trend': empty(),
    'auto.trend': empty(),
    'auto.failing': empty(),
    'proc.technologies': empty(),
    'comp.agents': empty(),
    'log.quality': empty(),
    'log.levels.preview': empty(),
    'log.pipeline.check': empty(),
    'app.query.billing': empty(),
    'ai.tokens': empty(),
    'ai.tokens.trend': empty(),
    'ai.calls': empty(),
    'log.sources.nolevel': empty(),
    'log.ingest': empty(),
    'log.buckets': t([{ name: 'default_logs', records: 120, retentionDays: 35, bytes: 48_000, hasAccess: true }]),
    'log.sfm': empty(),
    'cons.capabilities': t([{ 'event.type': 'Infrastructure Monitoring', events: 12, billedBytes: 2 }]),
    'cons.advisor': empty(),
    'cons.advisor.total': empty(),
    'lic.k8spodhours': empty(),
    'auto.workflows': empty(),
    'biz.events': empty(),
    'infra.capacity': t([
      { hostId: entityId('HOST', 1), avgCpuPct: 1.1, maxCpuPct: 3.0, avgMemPct: 4.2, maxMemPct: 6.0, avgDiskPct: 9.5, maxDiskPct: 9.9, name: 'host-eu-01', cores: 2, memBytes: 4 * 1024 ** 3, memUsedBytes: 180_000_000, memHeadroomBytes: 4_000_000_000 },
    ]),
    'infra.capacity.total': t([{ hosts: 2, totalCores: 2, totalMemBytes: 4 * 1024 ** 3 }]),
    'svc.totals': t([{ totalRequests: 0, totalFailures: 0, failureRatePct: 0 }]),
    'sec.vulnerabilities': empty(),
    'sec.context': empty(),
    'svc.owners': empty(),
    'cov.inventory.day0': empty(),
    'prob.poc.daily': empty(),
    'cons.daily': empty(),
    'sec.posture': empty(),
    'infra.capacity.summary': t([{ hosts: 1, saturated: 0, pressured: 0, balanced: 1, oversized: 0, unknown: 0, declaredMemBytes: 4 * 1024 ** 3, usedMemBytes: 180_000_000, reclaimableMemBytes: 0, oversizedCores: 0 }]),
    'adopt.platform.total': t([{ users: 1, dynatraceUsers: 1, apps: 2, browserActions: 40, apiCalls: 0, aiCalls: 0, analyzerCalls: 0 }]),
    'adopt.platform.daily': t([{ avgDau: 1, activeDays: 2 }]),
    'adopt.platform.trend': t([{ day: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) + 'T00:00:00.000Z', users: 1, actions: 40 }]),
    'adopt.platform.hours': t([{ hour: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 13) + ':00:00.000Z', actions: 40 }]),
    'adopt.platform.apps': t([{ app: 'dynatrace.dashboards', actions: 30, users: 1 }, { app: 'my.poc.value.studio', actions: 10, users: 1 }]),
    'adopt.platform.breadth': t([{ segment: '2-3', users: 1 }]),
    'adopt.ai.total': t([{ invocations: 0, succeeded: 0, failed: 0, blocked: 0, users: 0, skills: 0, feedback: 0, positive: 0, negative: 0 }]),
    'adopt.ai.skills': empty(),
    'auto.workflows.total': t([{ workflows: 0, executions: 0, succeeded: 0, failed: 0, failingWorkflows: 0 }]),
    'prob.recurrent.total': t([{ patterns: 0, candidates: 0, recurringVolume: 0, allVolume: 0, worst: null }]),
    'prob.topentities.total': t([{ entities: 0, problems: 0 }]),
    'k8s.restarts.total': t([{ workloads: 0, restarts: null, worst: null }]),
    'k8s.pressure.total': t([{ workloads: 0, oomKills: null, throttled: null, oomWorkloads: 0, throttledWorkloads: 0 }]),
    'svc.ranking.total': t([{ services: 0, failing: 0, aboveOnePct: 0, weightedResponseUs: null }]),
    'svc.topology.total': t([{ services: 1, withDatabase: 0, external: 0, publicDomain: 0, vendors: 0 }]),
    'svc.topology.mix': t([{ tier: 'type', label: 'CUSTOM_SERVICE', services: 1 }]),
    'biz.events.total': t([{ events: 0, types: 0 }]),
    'rum.audience.total': empty(),
    'rum.sessions': empty(),
    'rum.scorecard': empty(),
    'rum.webvitals': empty(),
    'rum.funnel': empty(),
    'rum.audience': empty(),
    'incident.logs': empty(),
    'rum.frontend.ids': empty(),
    'rca.callers': empty(),
    'rca.edges': empty(),
    // 3.2.7 (real prints): no cluster ids and no evidence rows, so the deck has no analysis slide.
    ...emptyPrintFixtures(EVIDENCE_IDS),
  };
}
