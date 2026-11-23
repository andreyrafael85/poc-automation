import Colors from '@dynatrace/strato-design-tokens/colors';
import { DQL, type DashboardBlueprint, type DashboardTilePlan } from './pocDashboard';

/**
 * The three specialty dashboards (3.3.4, the owner's order of 2026-11-03, repeated 2026-11-16):
 * besides "Value of the PoC", an SE or partner can deploy on the tenant a dashboard for
 * SRE/DevOps, for Cloud & Infra engineers and for Business analytics & user experience.
 *
 * Every tile reads either a catalog query, as the app runs it (with its own window and scan
 * ceiling), or a query registered below with the record of its live validation. Nothing commercial
 * (no `lic.*`, no `cons.*`: rule 6), no total taken from a capped list (rule 7), and — as for the
 * PoC dashboard — never created on the app's own: only on the SE's click in Settings (rule 10).
 */

// 3.6.7 (the owner: "Seguir com a 3.6.7 com suas recomendações"): two more for the teams every PoC meets — runtime
// security and logs & data quality —, from catalog queries only.
// 3.7.1 (the owner: "Conseguimos criar um dashboard interessante de performance ou observabilidade geral do ambiente mediante
// a criação dos SLOs?"): the environment overview with the PoC's SLOs comes first.
export type SpecialtyId = 'overview' | 'sre' | 'infra' | 'experience' | 'security' | 'logs' | 'kubernetes' | 'database';

export const SPECIALTY_IDS: readonly SpecialtyId[] = ['overview', 'sre', 'infra', 'experience', 'security', 'logs', 'kubernetes', 'database'];

/** How a dashboard query was validated on the lab tenant before a tile could use it. */
export interface DashboardValidation {
  validatedOn: string;
  window: string;
  records: number;
  scannedBytes: number;
  notes: string;
}

export interface ValidatedDql {
  dql: string;
  validation: DashboardValidation;
}

/**
 * The dashboard queries that are not catalog entries, each run read-only on the lab tenant on
 * 2026-11-16 with a cost estimate first (the owner's read window). Metric queries read 0 bytes.
 */
export const VALIDATED_DQL = {
  successPct: {
    dql: [
      'timeseries {req = sum(dt.service.request.count, scalar: true), fail = sum(dt.service.request.failure_count, scalar: true)}',
      '| fieldsAdd successPct = round(100.0 * (req - fail) / req, decimals: 2)',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '7 d', records: 1, scannedBytes: 0, notes: 'One row: requests, failures and the success share over the window (96.42 % on the lab tenant).' },
  },
  problemsByHour: {
    dql: [
      'fetch dt.davis.problems',
      '| filter isNull(dt.davis.is_duplicate) or not(dt.davis.is_duplicate)',
      '| fieldsAdd hourOfDay = getHour(event.start)',
      '| summarize problems = count(), by: {hourOfDay}',
      '| sort hourOfDay asc',
    ].join('\n'),
    validation: {
      validatedOn: '2026-11-16',
      window: '7 d',
      records: 24,
      scannedBytes: 287_266_491,
      notes: 'One row per hour of the day (UTC). Estimated 0.08–1.7 GB before running; read 0.29 GB. The hours when problems start: the on-call window as it really is.',
    },
  },
  cpuTop: {
    dql: [
      'timeseries cpu = avg(dt.host.cpu.usage), by: {dt.entity.host}, interval: 1h',
      '| fieldsAdd host = entityName(dt.entity.host), peak = arrayMax(cpu)',
      '| sort peak desc',
      '| limit 10',
      '| fields timeframe, interval, host, cpu',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 10, scannedBytes: 0, notes: 'The ten hosts with the highest CPU peak, hourly. A top 10: never summed.' },
  },
  memoryTop: {
    dql: [
      'timeseries memory = avg(dt.host.memory.usage), by: {dt.entity.host}, interval: 1h',
      '| fieldsAdd host = entityName(dt.entity.host), peak = arrayMax(memory)',
      '| sort peak desc',
      '| limit 10',
      '| fields timeframe, interval, host, memory',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 10, scannedBytes: 0, notes: 'The ten hosts with the highest memory peak, hourly. A top 10: never summed.' },
  },
  diskTop: {
    dql: [
      'timeseries used = max(dt.host.disk.used.percent), by: {dt.entity.host}, interval: 1h',
      '| fieldsAdd host = entityName(dt.entity.host), peak = arrayMax(used)',
      '| sort peak desc',
      '| limit 10',
      '| fields timeframe, interval, host, used',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 10, scannedBytes: 0, notes: 'The ten hosts with the fullest disk, hourly (two lab hosts sat at 100 %). A top 10: never summed.' },
  },
  network: {
    dql: 'timeseries {received = sum(dt.host.net.nic.bytes_rx), sent = sum(dt.host.net.nic.bytes_tx)}, interval: 1h',
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 1, scannedBytes: 0, notes: 'Bytes received and sent by every monitored NIC, hourly.' },
  },
  browserAvailability: {
    dql: [
      'timeseries availability = avg(dt.synthetic.browser.availability), by: {dt.entity.synthetic_test}, interval: 1h',
      '| fieldsAdd monitor = entityName(dt.entity.synthetic_test), avgAvailability = round(arrayAvg(availability), decimals: 1)',
      '| fields monitor, avgAvailability',
      '| sort avgAvailability asc',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 21, scannedBytes: 0, notes: 'Average availability per browser monitor, the least available first.' },
  },
  httpAvailability: {
    dql: [
      'timeseries availability = avg(dt.synthetic.http.availability), by: {dt.entity.http_check}, interval: 1h',
      '| fieldsAdd monitor = entityName(dt.entity.http_check), avgAvailability = round(arrayAvg(availability), decimals: 1)',
      '| fields monitor, avgAvailability',
      '| sort avgAvailability asc',
    ].join('\n'),
    validation: { validatedOn: '2026-11-16', window: '24 h', records: 11, scannedBytes: 0, notes: 'Average availability per HTTP monitor, the least available first.' },
  },
  // ---------------------------------------------------------------- 3.7.1 (the owner's examples of 2026-11-22: services
  // overview, infrastructure & capacity, log analytics, vulnerability tracker), each run on the lab on 2026-11-22, 2 h.
  serviceHealth: {
    dql: [
      'fetch dt.entity.service',
      '| lookup [',
      '    fetch dt.davis.problems',
      '    | filter event.status == "ACTIVE" and not dt.davis.is_duplicate',
      '    | expand affected_entity_ids',
      '    | fieldsAdd severity = if(event.category == "AVAILABILITY", 1, else: if(event.category == "ERROR", 2, else: if(event.category == "SLOWDOWN", 3, else: 4)))',
      '    | sort severity asc',
      '  ], sourceField: id, lookupField: affected_entity_ids, fields: {event.category, severity}',
      '| fieldsAdd status = coalesce(event.category, "OK"), severity = coalesce(severity, 10)',
      '| sort severity asc, entity.name asc',
      '| limit 300',
      '| fields entity.name, status',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 300, scannedBytes: 22_041_222, notes: 'Every service with the category of its active problem, OK otherwise (one service in AVAILABILITY on the lab). A map of at most 300: never summed.' },
  },
  hostHealth: {
    dql: [
      'fetch dt.entity.host',
      '| lookup [',
      '    fetch dt.davis.problems',
      '    | filter event.status == "ACTIVE" and not dt.davis.is_duplicate',
      '    | expand affected_entity_ids',
      '    | fieldsAdd severity = if(event.category == "AVAILABILITY", 1, else: if(event.category == "ERROR", 2, else: if(event.category == "SLOWDOWN", 3, else: 4)))',
      '    | sort severity asc',
      '  ], sourceField: id, lookupField: affected_entity_ids, fields: {event.category, severity}',
      '| fieldsAdd status = coalesce(event.category, "OK"), severity = coalesce(severity, 10)',
      '| sort severity asc, entity.name asc',
      '| limit 300',
      '| fields entity.name, status',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 69, scannedBytes: 22_041_222, notes: 'The same map for hosts (the service form validated; the entity model and the active problems). At most 300: never summed.' },
  },
  serviceThroughput: {
    dql: [
      'timeseries requests = sum(dt.service.request.count), by: {dt.entity.service}',
      '| fieldsAdd name = entityName(dt.entity.service)',
      '| sort arraySum(requests) desc',
      '| limit 10',
      '| fields timeframe, interval, name, requests',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 10, scannedBytes: 0, notes: 'The ten busiest services, per minute. A top 10: never summed.' },
  },
  serviceFailureRate: {
    dql: [
      'timeseries {failures = sum(dt.service.request.failure_count, default: 0), requests = sum(dt.service.request.count, default: 0)}, by: {dt.entity.service}',
      '| fieldsAdd failurePct = 100.0 * failures[] / requests[], name = entityName(dt.entity.service)',
      '| sort arraySum(failures) desc',
      '| limit 10',
      '| fields timeframe, interval, name, failurePct',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 10, scannedBytes: 0, notes: 'Failure rate of the ten services with most failures (easyTradeManager, TradeManagement, loan-checker on the lab).' },
  },
  responsePercentiles: {
    dql: [
      'timeseries {p50 = percentile(dt.service.request.response_time, 50), p90 = percentile(dt.service.request.response_time, 90), p99 = percentile(dt.service.request.response_time, 99)}',
      '| fieldsAdd p50Ms = round(arrayAvg(p50) / 1000, decimals: 0), p90Ms = round(arrayAvg(p90) / 1000, decimals: 0), p99Ms = round(arrayAvg(p99) / 1000, decimals: 0)',
      '| fields p50Ms, p90Ms, p99Ms',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 1, scannedBytes: 0, notes: 'Response time percentiles over every service, in ms (p50 2, p90 717, p99 45,420 on the lab).' },
  },
  processCpu: {
    dql: [
      'timeseries cpu = avg(dt.process.cpu.usage), by: {dt.entity.process_group_instance}',
      '| fieldsAdd name = entityName(dt.entity.process_group_instance)',
      '| sort arrayAvg(cpu) desc',
      '| limit 10',
      '| fields timeframe, interval, name, cpu',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 10, scannedBytes: 0, notes: 'The ten processes with the highest CPU (metrics, as the host form). A top 10: never summed.' },
  },
  hostInventory: {
    dql: [
      'fetch dt.entity.host',
      '| fieldsAdd osType, osVersion, cpuCores, memoryTotal, monitoringMode, cloudType',
      '| fieldsAdd memoryGB = round(toDouble(memoryTotal) / 1073741824, decimals: 1)',
      '| fields host = entity.name, osType, osVersion, cpuCores, memoryGB, monitoringMode, cloudType',
      '| sort host asc',
      '| limit 200',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 69, scannedBytes: 0, notes: 'Every monitored host with OS, cores, memory, monitoring mode and cloud (69 on the lab). At most 200: a list, never summed.' },
  },
  monitoringTypes: {
    dql: [
      'fetch dt.entity.host',
      '| fieldsAdd monitoringMode, paasVendorType, cloudType, isMonitoringCandidate',
      '| fieldsAdd mode = if(isNotNull(monitoringMode), monitoringMode, else: if(paasVendorType == "KUBERNETES", "KUBERNETES_POD", else: if(isNotNull(cloudType), "CLOUD_INTEGRATION", else: if(isMonitoringCandidate == true, "MONITORING_CANDIDATE", else: "UNMONITORED"))))',
      '| summarize hosts = count(), by: {mode}',
      '| sort hosts desc',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 5, scannedBytes: 0, notes: "Hosts by how they are monitored (the owner's infrastructure example), from the entity model." },
  },
  cpuTable: {
    dql: [
      'timeseries usage = avg(dt.host.cpu.usage), by: {dt.entity.host}',
      '| fieldsAdd usage = round(arrayAvg(usage), decimals: 1), host = entityName(dt.entity.host)',
      '| sort usage desc',
      '| limit 20',
      '| fields host, usage',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 20, scannedBytes: 0, notes: 'The twenty hosts with the highest mean CPU (%). A top 20: never summed.' },
  },
  memoryTable: {
    dql: [
      'timeseries usage = avg(dt.host.memory.usage), by: {dt.entity.host}',
      '| fieldsAdd usage = round(arrayAvg(usage), decimals: 1), host = entityName(dt.entity.host)',
      '| sort usage desc',
      '| limit 20',
      '| fields host, usage',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 20, scannedBytes: 0, notes: 'The twenty hosts with the highest mean memory use (%). A top 20: never summed.' },
  },
  diskTable: {
    dql: [
      'timeseries percent = avg(dt.host.disk.used.percent), by: {dt.entity.disk, dt.entity.host}',
      '| fieldsAdd percent = round(arrayAvg(percent), decimals: 1), host = entityName(dt.entity.host), disk = entityName(dt.entity.disk)',
      '| sort percent desc',
      '| limit 30',
      '| fields host, disk, percent',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 30, scannedBytes: 0, notes: 'The thirty fullest disks with their host and mount (several at 100 % on the lab). A top 30: never summed.' },
  },
  networkTable: {
    dql: [
      'timeseries {rx = sum(dt.host.net.nic.bytes_rx), tx = sum(dt.host.net.nic.bytes_tx)}, by: {dt.entity.host}',
      '| fieldsAdd rxMbps = round(arrayAvg(rx) * 8 / 1000000, decimals: 2), txMbps = round(arrayAvg(tx) * 8 / 1000000, decimals: 2), host = entityName(dt.entity.host)',
      '| sort rxMbps desc',
      '| limit 20',
      '| fields host, rxMbps, txMbps',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 20, scannedBytes: 0, notes: 'Mean received and sent Mbit/s per host, the twenty busiest. A top 20: never summed.' },
  },
  techVersions: {
    dql: [
      'fetch dt.entity.process_group',
      '| fieldsAdd softwareTechnologies',
      '| expand softwareTechnologies',
      `| parse softwareTechnologies, """'type:' LD:technology ',edition:' LD:edition ',version:' LD:version"""`,
      '| summarize processGroups = countDistinct(id), by: {technology, version}',
      '| sort processGroups desc',
      '| limit 20',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 20, scannedBytes: 0, notes: "Technologies and versions by process groups (the owner's vulnerability-tracker example), from the entity model." },
  },
  // 3.7.3 (the owner: sessions as a figure with the week's change, more experience metrics): real users only, metrics only
  // (0 B); the previous window by `shift: -7d`. user.sessions is not read (not readable on the lab).
  expPulse: {
    dql: [
      'timeseries { sessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true), actions = sum(dt.frontend.user_action.count, scalar: true), requests = sum(dt.frontend.request.count, scalar: true), errors = sum(dt.frontend.error.count, scalar: true) }, filter: (dt.rum.user_type == "real_user")',
      '| append [ timeseries { prevSessions = countDistinct(dt.frontend.session.active.estimated_count, scalar: true), prevActions = sum(dt.frontend.user_action.count, scalar: true) }, shift: -7d, filter: (dt.rum.user_type == "real_user") ]',
      '| append [ timeseries { w = sum(dt.frontend.experience.weight, scalar: true) }, by: {experience.level}, filter: (dt.rum.user_type == "real_user") | summarize satisfied = sum(if(experience.level == "satisfied", w, else: 0)), frustrated = sum(if(experience.level == "frustrated", w, else: 0)), weight = sum(w) ]',
      '| append [ timeseries lcp = percentile(dt.frontend.web.page.largest_contentful_paint, 75, rollup: avg, scalar: true), filter: (dt.rum.user_type == "real_user") ]',
      '| summarize sessions = sum(sessions), actions = sum(actions), requests = sum(requests), errors = sum(errors), prevSessions = sum(prevSessions), prevActions = sum(prevActions), satisfied = sum(satisfied), frustrated = sum(frustrated), weight = sum(weight), lcpMs = round(max(lcp), decimals: 0)',
      '| fieldsAdd sessionsChangePct = if(prevSessions > 0, round(100.0 * (sessions - prevSessions) / prevSessions, decimals: 1)), actionsChangePct = if(prevActions > 0, round(100.0 * (actions - prevActions) / prevActions, decimals: 1)), satisfiedPct = if(weight > 0, round(100.0 * satisfied / weight, decimals: 1)), frustratedPct = if(weight > 0, round(100.0 * frustrated / weight, decimals: 1)), errorRatePct = if(requests > 0, round(100.0 * errors / requests, decimals: 2))',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '7 d', records: 1, scannedBytes: 0, notes: 'Lab: 98,723 sessions (+8.5 % on the week before), actions +2.5 %, 78 % satisfied, 7.1 % frustrated, 1.75 % request errors, LCP p75 833 ms.' },
  },
  // 3.7.3 — Kubernetes and containers, Databases and dependencies (the owner's two examples, in the app's mould; no variables).
  k8sPulse: {
    dql: [
      'timeseries cpu = sum(dt.kubernetes.container.cpu_usage), by: {k8s.cluster.name, k8s.namespace.name, k8s.workload.name}',
      '| summarize clusters = countDistinct(k8s.cluster.name), namespaces = countDistinct(k8s.namespace.name), workloads = count()',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 1, scannedBytes: 0, notes: "Clusters, namespaces and workloads reporting container CPU (lab: 6, 18, 175)." },
  },
  k8sCpuByWorkload: {
    dql: [
      'timeseries cpu = sum(dt.kubernetes.container.cpu_usage, rollup: avg), by: {k8s.namespace.name, k8s.workload.name}',
      '| fieldsAdd workload = concat(k8s.namespace.name, "/", k8s.workload.name)',
      '| sort arrayAvg(cpu) desc',
      '| limit 10',
      '| fields timeframe, interval, workload, cpu',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 10, scannedBytes: 0, notes: "The ten workloads using most CPU (namespace/workload)." },
  },
  k8sMemByWorkload: {
    dql: [
      'timeseries memory = sum(dt.kubernetes.container.memory_working_set, rollup: avg), by: {k8s.namespace.name, k8s.workload.name}',
      '| fieldsAdd workload = concat(k8s.namespace.name, "/", k8s.workload.name)',
      '| sort arrayAvg(memory) desc',
      '| limit 10',
      '| fields timeframe, interval, workload, memory',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 10, scannedBytes: 0, notes: "The ten workloads using most memory (working set)." },
  },
  k8sByKind: {
    dql: [
      'timeseries { cpu = sum(dt.kubernetes.container.cpu_usage, scalar: true), memory = sum(dt.kubernetes.container.memory_working_set, scalar: true) }, by: {k8s.workload.kind}',
      '| fieldsAdd total = cpu',
      '| summarize cpuShare = sum(cpu), by: {kind = k8s.workload.kind}',
      '| sort cpuShare desc',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "CPU by workload kind (deployment, daemonset, statefulset\u2026) \u2014 a share." },
  },
  k8sNetwork: {
    dql: [
      'timeseries received = sum(dt.kubernetes.pod.network_received_data, rollup: avg), by: {k8s.namespace.name, k8s.workload.name}',
      '| fieldsAdd workload = concat(k8s.namespace.name, "/", k8s.workload.name)',
      '| sort arrayAvg(received) desc',
      '| limit 10',
      '| fields timeframe, interval, workload, received',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 10, scannedBytes: 0, notes: "The ten workloads receiving most network data." },
  },
  k8sNetworkTx: {
    dql: [
      'timeseries transmitted = sum(dt.kubernetes.pod.network_transmitted_data, rollup: avg), by: {k8s.namespace.name, k8s.workload.name}',
      '| fieldsAdd workload = concat(k8s.namespace.name, "/", k8s.workload.name)',
      '| sort arrayAvg(transmitted) desc',
      '| limit 10',
      '| fields timeframe, interval, workload, transmitted',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 10, scannedBytes: 0, notes: "The ten workloads sending most network data." },
  },
  dbHealth: {
    dql: [
      'fetch dt.entity.service',
      '| filter serviceType == "DATABASE_SERVICE"',
      '| lookup [',
      '    fetch dt.davis.problems',
      '    | filter event.status == "ACTIVE" and not dt.davis.is_duplicate',
      '    | expand affected_entity_ids',
      '    | fieldsAdd severity = if(event.category == "AVAILABILITY", 1, else: if(event.category == "ERROR", 2, else: if(event.category == "SLOWDOWN", 3, else: 4)))',
      '    | sort severity asc',
      '  ], sourceField: id, lookupField: affected_entity_ids, fields: {event.category, severity}',
      '| fieldsAdd status = coalesce(event.category, "OK")',
      '| limit 300',
      '| fields entity.name, status',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 21595723, notes: "Every database service coloured by the category of its active problem (OK when none)." },
  },
  dbPulse: {
    dql: [
      'timeseries { calls = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true), p90 = percentile(dt.service.request.response_time, 90, scalar: true) }, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd failurePct = if(calls > 0, round(100.0 * failures / calls, decimals: 2)), p90Ms = round(p90 / 1000, decimals: 1)',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 1, scannedBytes: 0, notes: "Database calls, failures and p90 response time (lab: 100,479 calls, 0.19 % failing, p90 461 ms)." },
  },
  dbCount: {
    dql: [
      'fetch dt.entity.service',
      '| filter serviceType == "DATABASE_SERVICE"',
      '| summarize databases = count(), vendors = countDistinct(databaseVendor)',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 1, scannedBytes: 0, notes: "Database services and their vendors (lab: 5 and 4)." },
  },
  dbCallsTop: {
    dql: [
      'timeseries calls = sum(dt.service.request.count, scalar: true), by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service)',
      '| sort calls desc',
      '| limit 10',
      '| fields database, calls',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "The databases called most." },
  },
  dbCallsTrend: {
    dql: [
      'timeseries calls = sum(dt.service.request.count), by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service)',
      '| sort arraySum(calls) desc',
      '| limit 10',
      '| fields timeframe, interval, database, calls',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "Calls per database over time." },
  },
  dbLatencyTop: {
    dql: [
      'timeseries p90 = percentile(dt.service.request.response_time, 90, scalar: true), by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service), p90Ms = round(p90 / 1000, decimals: 1)',
      '| sort p90Ms desc',
      '| limit 10',
      '| fields database, p90Ms',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "The slowest databases by p90 response time." },
  },
  dbLatencyTrend: {
    dql: [
      'timeseries p90 = percentile(dt.service.request.response_time, 90), by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service), p90Ms = p90[] / 1000',
      '| sort arrayAvg(p90) desc',
      '| limit 10',
      '| fields timeframe, interval, database, p90Ms',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "p90 response time per database over time." },
  },
  dbFailuresTop: {
    dql: [
      'timeseries { failures = sum(dt.service.request.failure_count, scalar: true), calls = sum(dt.service.request.count, scalar: true) }, by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service), failurePct = if(calls > 0, round(100.0 * failures / calls, decimals: 2))',
      '| sort failurePct desc',
      '| limit 10',
      '| fields database, failurePct, failures, calls',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "The databases with the highest failure rate." },
  },
  dbFailuresTrend: {
    dql: [
      'timeseries failures = sum(dt.service.request.failure_count), by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }',
      '| fieldsAdd database = entityName(dt.entity.service)',
      '| sort arraySum(failures) desc',
      '| limit 10',
      '| fields timeframe, interval, database, failures',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "Failures per database over time." },
  },
  dbTable: {
    dql: [
      'timeseries { avg = avg(dt.service.request.response_time, scalar: true), p99 = percentile(dt.service.request.response_time, 99, scalar: true), calls = sum(dt.service.request.count, scalar: true), failures = sum(dt.service.request.failure_count, scalar: true) }, by: {dt.entity.service}, filter: { in(dt.entity.service, classicEntitySelector("type(service),servicetype(\\"DATABASE_SERVICE\\")")) }, union: true',
      '| fieldsAdd database = entityName(dt.entity.service), avgMs = round(avg / 1000, decimals: 1), p99Ms = round(p99 / 1000, decimals: 1)',
      '| fields database, calls, failures, avgMs, p99Ms',
      '| sort calls desc',
      '| limit 20',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 5, scannedBytes: 0, notes: "Each database: calls, failures, mean and p99 response time." },
  },
  dbCallers: {
    dql: [
      'fetch dt.entity.service',
      '| filter serviceType == "DATABASE_SERVICE"',
      '| fieldsAdd callers = called_by[dt.entity.service]',
      '| expand callers',
      '| filter isNotNull(callers)',
      '| lookup [ fetch dt.entity.service | fields id, caller = entity.name ], sourceField: callers, lookupField: id, fields: {caller}',
      '| summarize callers = countDistinct(callers), names = collectDistinct(caller), by: {database = entity.name, vendor = databaseVendor}',
      '| fieldsAdd callingServices = arrayToString(arraySlice(names, from: 0, to: 5), delimiter: ", ")',
      '| fields database, vendor, callers, callingServices',
      '| sort callers desc',
      '| limit 20',
    ].join('\n'),
    validation: { validatedOn: '2026-11-23', window: '2 h', records: 4, scannedBytes: 0, notes: "Which services call each database (from the entity model; up to five names each)." },
  },
  logMonthly: {
    dql: [
      'fetch dt.system.events, from: now()-180d',
      '| filter event.kind == "BILLING_USAGE_EVENT"',
      '| filter event.type == "Log Management & Analytics - Ingest & Process"',
      '| fieldsAdd month = formatTimestamp(timestamp, format: "yyyy-MM")',
      '| summarize gib = round(sum(billed_bytes) / 1073741824.0, decimals: 1), by: {month}',
      '| sort month asc',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '180 d', records: 7, scannedBytes: 0, notes: 'Logs ingested per month in GiB, from the billing usage events (89 to 700 GiB a month on the lab). Volume only: no price.' },
  },
  logStatusTrend: {
    dql: ['fetch logs, samplingRatio: 100', '| makeTimeseries records = count(), by: {status}, interval: 5m'].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 4, scannedBytes: 65_356_320, notes: 'A 1:100 sample of every record by status — the shape of the curve, not its count (read unsampled, the 2 hours hit a 3 GB ceiling on the lab).' },
  },
  // 3.7.2 (the owner: tables full of "null"): every record's origin — the log source, else the service, the workload, the
  // host or the ingest path — so no row is empty (100 % of the lab's records carry one).
  logSources: {
    dql: [
      'fetch logs, samplingRatio: 100',
      '| fieldsAdd origin = coalesce(log.source, service.name, k8s.workload.name, host.name, dt.openpipeline.source)',
      '| summarize sampled = count(), errors = countIf(status == "ERROR"), warnings = countIf(status == "WARN"), by: {origin}',
      '| fieldsAdd errorPct = round(100.0 * errors / sampled, decimals: 2), warnPct = round(100.0 * warnings / sampled, decimals: 2)',
      '| sort sampled desc',
      '| limit 15',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 15, scannedBytes: 64_813_747, notes: '3.7.2: the fifteen origins of a 1:100 sample with their error and warning shares (proportions, not counts); no null row (bytes as the 3.7.1 sampled read).' },
  },
  // 3.7.2: the shares the owner's log-analytics example counts by level, as proportions of the 1:100 sample.
  logContextShare: {
    dql: [
      'fetch logs, samplingRatio: 100',
      '| summarize sampled = count(), errors = countIf(status == "ERROR"), warnings = countIf(status == "WARN"), noLevel = countIf(status == "NONE"), withTrace = countIf(isNotNull(trace_id)), withService = countIf(isNotNull(dt.entity.service))',
      '| fieldsAdd errorPct = round(100.0 * errors / sampled, decimals: 2), warnPct = round(100.0 * warnings / sampled, decimals: 2), noLevelPct = round(100.0 * noLevel / sampled, decimals: 1), withTracePct = round(100.0 * withTrace / sampled, decimals: 1), withServicePct = round(100.0 * withService / sampled, decimals: 1)',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 1, scannedBytes: 64_813_932, notes: 'Shares of a 1:100 sample: errors 0.04 %, warnings 0.7 %, no level 87 %, with a trace 4.8 %, with a service 0.7 % on the lab.' },
  },
  logLevels: {
    dql: ['fetch logs, samplingRatio: 100', '| summarize sampled = count(), by: {status}', '| sort sampled desc'].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 4, scannedBytes: 64_813_932, notes: '3.7.2: a 1:100 sample by level (NONE, INFO, WARN, ERROR) — the mix, not the count.' },
  },
  logTopMessages: {
    dql: [
      'fetch logs, samplingRatio: 100',
      '| fieldsAdd message = substring(replacePattern(replacePattern(content, "[0-9a-fA-F\\\\-]{8,}", "<id>"), "DIGIT+", "#"), from: 0, to: 160), origin = coalesce(log.source, service.name, k8s.workload.name, host.name, dt.openpipeline.source)',
      '| summarize sampled = count(), by: {status, origin, message}',
      '| sort sampled desc',
      '| limit 20',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 20, scannedBytes: 64_813_932, notes: '3.7.2, after the owner\'s log-analytics example: the twenty most frequent messages (numbers as #, ids as <id>) with their level and origin, from a 1:100 sample.' },
  },
  logExceptions: {
    dql: [
      'fetch logs, samplingRatio: 100',
      '| filter contains(content, "Exception") or contains(content, "exception")',
      '| fieldsAdd message = substring(replacePattern(replacePattern(content, "[0-9a-fA-F\\\\-]{8,}", "<id>"), "DIGIT+", "#"), from: 0, to: 160), origin = coalesce(log.source, service.name, k8s.workload.name, host.name, dt.openpipeline.source)',
      '| summarize sampled = count(), by: {status, origin, message}',
      '| sort sampled desc',
      '| limit 10',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 2, scannedBytes: 3_887_400, notes: 'Exceptions grouped by message (numbers as #, ids as <id>) with their origin, in a 1:100 sample — whatever their level says; 3.7.2 no null column.' },
  },
  logHiddenErrors: {
    dql: [
      'fetch logs, samplingRatio: 100',
      '| filter status == "NONE" and (contains(content, "error") or contains(content, "Error") or contains(content, "fail"))',
      '| fieldsAdd origin = coalesce(log.source, service.name, k8s.workload.name, host.name, dt.openpipeline.source)',
      '| summarize sampled = count(), by: {origin}',
      '| sort sampled desc',
      '| limit 10',
    ].join('\n'),
    validation: { validatedOn: '2026-11-22', window: '2 h', records: 3, scannedBytes: 21_419_879, notes: 'Origins of records with no level that read like errors (a 1:100 sample): where a log level is missing; 3.7.2 no null row.' },
  },
} as const satisfies Record<string, ValidatedDql>;

const V = VALIDATED_DQL;

// ------------------------------------------------------------------ 3.7.1: shared looks

/** The health tones (exported for the notebook's health map, 3.7.2). */
export const TOKEN = {
  ideal: Colors.Charts.Status.Ideal.Default,
  warning: Colors.Charts.Status.Warning.Default,
  critical: Colors.Charts.Status.Critical.Default,
  availability: Colors.Charts.Categorical.Color15.Default,
  error: Colors.Charts.Categorical.Color12.Default,
  slowdown: Colors.Charts.Categorical.Color06.Default,
  resource: Colors.Charts.Categorical.Color01.Default,
  ok: Colors.Charts.Status.Ideal.Default,
} as const;

/** A health map: each entity a cell, coloured by the category of its active problem (OK in the ideal tone). */
const HEALTH_MAP: Readonly<Record<string, unknown>> = {
  honeycomb: { legend: { hidden: false }, dataMappings: { value: 'status' }, displayedFields: ['entity.name'] },
  coloring: {
    colorRules: [
      { colorMode: 'custom-color', customColor: { Default: TOKEN.ok }, field: 'status', value: 'OK', comparator: '=' },
      { colorMode: 'custom-color', customColor: { Default: TOKEN.availability }, field: 'status', value: 'AVAILABILITY', comparator: '=' },
      { colorMode: 'custom-color', customColor: { Default: TOKEN.error }, field: 'status', value: 'ERROR', comparator: '=' },
      { colorMode: 'custom-color', customColor: { Default: TOKEN.slowdown }, field: 'status', value: 'SLOWDOWN', comparator: '=' },
      { colorMode: 'custom-color', customColor: { Default: TOKEN.resource }, field: 'status', value: 'RESOURCE_CONTENTION', comparator: '=' },
    ],
  },
};

/** A table whose numeric column turns amber from `warn` and red from `bad` (the last matching rule wins). */
function usageColours(field: string, warn: number, bad: number): Readonly<Record<string, unknown>> {
  return {
    coloring: {
      colorRules: [
        { value: 0, comparator: '≥', field, colorMode: 'custom-color', customColor: { Default: TOKEN.ideal }, type: 'double' },
        { value: warn, comparator: '≥', field, colorMode: 'custom-color', customColor: { Default: TOKEN.warning }, type: 'double' },
        { value: bad, comparator: '≥', field, colorMode: 'custom-color', customColor: { Default: TOKEN.critical }, type: 'double' },
      ],
    },
  };
}

/** The banner colours of the dashboards (categorical chart tokens, as the platform's own dashboards). */
const BANNER = {
  overview: Colors.Charts.CategoricalThemed.BlueSteel.Color05.Default,
  sre: Colors.Charts.CategoricalThemed.BlueSteel.Color04.Default,
  infra: Colors.Charts.CategoricalThemed.BlueSteel.Color02.Default,
  // 3.7.2, the owner: the green was too strong — the deep pine of the Swamps theme.
  experience: Colors.Charts.CategoricalThemed.Swamps.Color01.Default,
  // 3.7.1, the owner before the deploy: orange and red read as "everything is a problem" — calm tones instead.
  security: Colors.Charts.CategoricalThemed.BlueSteel.Color06.Default,
  logs: Colors.Charts.CategoricalThemed.Tide.Color04.Default,
  // 3.7.3: the two new dashboards, in calm tones of their own.
  kubernetes: Colors.Charts.CategoricalThemed.BlueSteel.Color03.Default,
  database: Colors.Charts.CategoricalThemed.Swamps.Color04.Default,
} as const;

const LOG_WINDOW = { from: 'now()-2h', to: 'now()' } as const;

// ------------------------------------------------------------------ SRE / DevOps

/** "Operation and reliability": what hurts now, who gets paged and what can already be automated. */
const SRE_TILES: readonly DashboardTilePlan[] = [
  { key: 'sre.successPct', section: 'pulse', dql: V.successPct.dql, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'successPct', better: 'higher', good: 99, bad: 95 } },
  { key: 'svcTraffic', section: 'pulse', queryId: 'svc.ranking.total', visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'services', better: 'none' } },
  {
    key: 'svcResponse',
    section: 'pulse',
    queryId: 'svc.ranking.total',
    tail: ['| fieldsAdd responseMs = round(weightedResponseUs / 1000, decimals: 0)'],
    visualization: 'singleValue',
    w: 6,
    h: 3,
    singleValue: { field: 'responseMs', better: 'lower', good: 300, bad: 1000 },
  },
  { key: 'problemsActive', section: 'pulse', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'active', better: 'lower', good: 1, bad: 10 } },
  // 3.7.1 (the owner's services-overview example): the health map, the percentiles and what each service carries.
  { key: 'serviceHealth', section: 'health', dql: V.serviceHealth.dql, visualization: 'honeycomb', w: 12, h: 7, settings: HEALTH_MAP },
  { key: 'p50', section: 'health', dql: V.responsePercentiles.dql, visualization: 'singleValue', w: 4, h: 7, singleValue: { field: 'p50Ms', better: 'lower', good: 300, bad: 1000 } },
  { key: 'p90', section: 'health', dql: V.responsePercentiles.dql, visualization: 'singleValue', w: 4, h: 7, singleValue: { field: 'p90Ms', better: 'lower', good: 1000, bad: 3000 } },
  { key: 'p99', section: 'health', dql: V.responsePercentiles.dql, visualization: 'singleValue', w: 4, h: 7, singleValue: { field: 'p99Ms', better: 'lower', good: 3000, bad: 10000 } },
  { key: 'serviceThroughput', section: 'health', dql: V.serviceThroughput.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'serviceFailureRate', section: 'health', dql: V.serviceFailureRate.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'problemTimeline', section: 'problems', dql: DQL.problemTimeline, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'sre.problemsByHour', section: 'problems', dql: V.problemsByHour.dql, visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'problemMix', section: 'problems', queryId: 'prob.summary', visualization: 'categoricalBarChart', w: 12, h: 6 },
  { key: 'mttx', section: 'problems', queryId: 'prob.mttx', visualization: 'table', w: 12, h: 6 },
  { key: 'sre.recurringPatterns', section: 'problems', queryId: 'prob.recurrent.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'patterns', better: 'lower', good: 1, bad: 10 } },
  { key: 'sre.automationCandidates', section: 'problems', queryId: 'prob.recurrent.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'candidates', better: 'none' } },
  { key: 'sre.worstPattern', section: 'problems', queryId: 'prob.recurrent.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'worst', better: 'none' } },
  { key: 'sre.recurring', section: 'problems', queryId: 'prob.recurrent', visualization: 'table', w: 24, h: 6 },
  // 3.7.2: the owner's resize left out the root-cause share — the trend and the mix tell it.
  { key: 'sre.rcaTrend', section: 'rca', queryId: 'rca.trend', visualization: 'lineChart', w: 16, h: 5 },
  { key: 'sre.rcaMix', section: 'rca', queryId: 'rca.catmix', visualization: 'categoricalBarChart', w: 24, h: 5 },
  { key: 'golden', section: 'services', dql: DQL.golden, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'responseTime', section: 'services', dql: DQL.responseTime, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'svcRanking', section: 'services', queryId: 'svc.ranking', visualization: 'table', w: 24, h: 7 },
  { key: 'sre.calls', section: 'services', queryId: 'svc.topology.calls', visualization: 'table', w: 24, h: 6 },
  { key: 'processCpu', section: 'services', dql: V.processCpu.dql, visualization: 'lineChart', w: 24, h: 5 },
  { key: 'sre.logTrend', section: 'logs', queryId: 'log.ingest.trend', visualization: 'lineChart', w: 12, h: 5 },
  { key: 'sre.logQuality', section: 'logs', queryId: 'log.quality', visualization: 'table', w: 12, h: 5 },
  { key: 'wfCount', section: 'automation', queryId: 'auto.workflows.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'workflows', better: 'none' } },
  { key: 'wfExecutions', section: 'automation', queryId: 'auto.workflows.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'executions', better: 'none' } },
  {
    key: 'wfSuccess',
    section: 'automation',
    queryId: 'auto.workflows.total',
    tail: ['| fieldsAdd successPct = round(100.0 * succeeded / executions, decimals: 1)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'successPct', better: 'higher', good: 95, bad: 80 },
  },
  { key: 'sre.failingWorkflows', section: 'automation', queryId: 'auto.failing', visualization: 'table', w: 24, h: 5 },
];

// ------------------------------------------------------------------ Cloud & Infra

/** "Infrastructure and cloud": where the estate is tight, what Kubernetes suffers, what fills up first. */
const INFRA_TILES: readonly DashboardTilePlan[] = [
  // 3.7.1 (the owner's infrastructure-and-capacity example): the inventory and how each host is monitored, then the maps.
  { key: 'hostInventory', section: 'inventory', dql: V.hostInventory.dql, visualization: 'table', w: 17, h: 7 },
  { key: 'monitoringTypes', section: 'inventory', dql: V.monitoringTypes.dql, visualization: 'donutChart', w: 7, h: 7 },
  { key: 'hostHealth', section: 'inventory', dql: V.hostHealth.dql, visualization: 'honeycomb', w: 24, h: 6, settings: HEALTH_MAP },
  { key: 'hosts', section: 'estate', dql: DQL.hosts, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'hosts', better: 'none' } },
  { key: 'processes', section: 'estate', dql: DQL.processes, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'processes', better: 'none' } },
  { key: 'infra.cloudHosts', section: 'estate', queryId: 'cloud.hosts', visualization: 'categoricalBarChart', w: 12, h: 6 },
  { key: 'infra.hostClasses', section: 'estate', queryId: 'cov.hosts.breakdown', visualization: 'categoricalBarChart', w: 12, h: 6 },
  { key: 'infra.cloudServices', section: 'estate', queryId: 'cloud.services', visualization: 'table', w: 12, h: 6 },
  { key: 'infra.capacityClasses', section: 'saturation', queryId: 'infra.capacity.summary', visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'infra.cpuTop', section: 'saturation', dql: V.cpuTop.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'infra.memoryTop', section: 'saturation', dql: V.memoryTop.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'infra.diskTop', section: 'saturation', dql: V.diskTop.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'cpuTable', section: 'saturation', dql: V.cpuTable.dql, visualization: 'table', w: 12, h: 7, settings: usageColours('usage', 75, 90) },
  { key: 'memoryTable', section: 'saturation', dql: V.memoryTable.dql, visualization: 'table', w: 12, h: 7, settings: usageColours('usage', 75, 90) },
  { key: 'diskTable', section: 'saturation', dql: V.diskTable.dql, visualization: 'table', w: 24, h: 7, settings: usageColours('percent', 80, 95) },
  { key: 'infra.capacity', section: 'saturation', queryId: 'infra.capacity', visualization: 'table', w: 24, h: 7 },
  { key: 'infra.network', section: 'network', dql: V.network.dql, visualization: 'lineChart', w: 12, h: 6 },
  { key: 'networkTable', section: 'network', dql: V.networkTable.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'infra.restartsTotal', section: 'kubernetes', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'restarts', better: 'lower', good: 10, bad: 100 } },
  { key: 'infra.oomKills', section: 'kubernetes', queryId: 'k8s.pressure.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'oomKills', better: 'lower', good: 1, bad: 10 } },
  { key: 'infra.restartingWorkloads', section: 'kubernetes', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'workloads', better: 'none' } },
  { key: 'infra.restartsTrend', section: 'kubernetes', queryId: 'k8s.restarts.trend', visualization: 'lineChart', w: 24, h: 5 },
  { key: 'infra.pressure', section: 'kubernetes', queryId: 'k8s.pressure', visualization: 'table', w: 12, h: 6 },
  { key: 'infra.k8sInventory', section: 'kubernetes', queryId: 'k8s.inventory', visualization: 'table', w: 12, h: 6 },
  { key: 'topEntities', section: 'problems', queryId: 'prob.topentities', visualization: 'table', w: 24, h: 6 },
  { key: 'infra.logBuckets', section: 'data', queryId: 'log.buckets', visualization: 'table', w: 24, h: 5 },
];

// ------------------------------------------------------------------ Business analytics & experience

/** "Digital experience and business": who used it, what they felt, and what it means for the business. */
const EXPERIENCE_TILES: readonly DashboardTilePlan[] = [
  // 3.7.3: the pulse of the real users — figures with the week's change.
  { key: 'exp.sessionsTotal', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'sessions', better: 'none' } },
  { key: 'exp.sessionsChange', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'sessionsChangePct', better: 'none' } },
  { key: 'exp.satisfiedPct', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'satisfiedPct', better: 'higher', good: 85, bad: 70 } },
  { key: 'exp.frustratedPct', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'frustratedPct', better: 'lower', good: 5, bad: 15 } },
  { key: 'exp.errorRatePct', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'errorRatePct', better: 'lower', good: 1, bad: 5 } },
  { key: 'exp.lcpMs', section: 'pulse', dql: V.expPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'lcpMs', better: 'lower', good: 2500, bad: 4000 } },
  { key: 'exp.audience', section: 'audience', queryId: 'rum.audience', visualization: 'table', w: 12, h: 6 },
  { key: 'exp.dailyRum', section: 'audience', queryId: 'poc.daily.rum', visualization: 'lineChart', w: 12, h: 5 },
  { key: 'rumScorecard', section: 'health', queryId: 'rum.scorecard', visualization: 'table', w: 12, h: 6 },
  { key: 'rumVitals', section: 'health', queryId: 'rum.webvitals', visualization: 'table', w: 12, h: 6 },
  { key: 'exp.appFlow', section: 'journeys', queryId: 'rum.app.flow', visualization: 'table', w: 24, h: 6 },
  { key: 'exp.browserMonitors', section: 'synthetic', dql: V.browserAvailability.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'exp.httpMonitors', section: 'synthetic', dql: V.httpAvailability.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'exp.bizTotal', section: 'business', queryId: 'biz.events.total', visualization: 'singleValue', w: 12, h: 3, singleValue: { field: 'events', better: 'none' } },
  { key: 'exp.bizTypes', section: 'business', queryId: 'biz.events.total', visualization: 'singleValue', w: 12, h: 3, singleValue: { field: 'types', better: 'none' } },
  // 3.7.3 (the owner: "poderia estar em 12x5 e ter mais um outro ao lado"): the events beside the experience funnel.
  { key: 'exp.bizEvents', section: 'business', queryId: 'biz.events', visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'exp.funnel', section: 'business', queryId: 'rum.funnel', visualization: 'table', w: 12, h: 6 },
  { key: 'golden', section: 'backend', dql: DQL.golden, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'responseTime', section: 'backend', dql: DQL.responseTime, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'svcRanking', section: 'backend', queryId: 'svc.ranking', visualization: 'table', w: 24, h: 7 },
];

/**
 * "Runtime security" (3.6.7; 3.7.1 after the owner's vulnerability-tracker example, and without the evidence gate that left
 * it empty): the posture by severity, what to act on, by technology, the queue, where each runs and the versions in use.
 */
const POSTURE_SUM = (field: string, level?: string) => [
  `| summarize ${field} = sum(${level === undefined ? 'vulnerabilities' : `if(level == "${level}", vulnerabilities, else: 0)`})`,
];
const SECURITY_TILES: readonly DashboardTilePlan[] = [
  { key: 'secTotal', section: 'posture', queryId: 'sec.posture', tail: POSTURE_SUM('total'), visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'total', better: 'lower', good: 1, bad: 1 } },
  { key: 'secCritical', section: 'posture', queryId: 'sec.posture', tail: POSTURE_SUM('critical', 'CRITICAL'), visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'critical', better: 'lower', good: 1, bad: 1 } },
  { key: 'secHigh', section: 'posture', queryId: 'sec.posture', tail: POSTURE_SUM('high', 'HIGH'), visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'high', better: 'lower', good: 1, bad: 10 } },
  { key: 'secActNow', section: 'posture', queryId: 'sec.posture', tail: ['| summarize actNow = sum(actNow)'], visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'actNow', better: 'lower', good: 1, bad: 1 } },
  { key: 'secExploitable', section: 'posture', queryId: 'sec.posture', tail: ['| summarize exploitable = sum(exploitable)'], visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'exploitable', better: 'lower', good: 1, bad: 10 } },
  { key: 'sec.public', section: 'posture', queryId: 'sec.posture', tail: ['| summarize publicExposed = sum(publicExposed)'], visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'publicExposed', better: 'lower', good: 1, bad: 10 } },
  { key: 'secByLevel', section: 'distribution', queryId: 'sec.posture', tail: ['| summarize vulnerabilities = sum(vulnerabilities), by: {level}'], visualization: 'donutChart', w: 9, h: 6 },
  { key: 'secByTechnology', section: 'distribution', queryId: 'sec.posture', tail: ['| summarize vulnerabilities = sum(vulnerabilities), by: {technology}', '| sort vulnerabilities desc'], visualization: 'categoricalBarChart', w: 15, h: 6 },
  { key: 'secPosture', section: 'distribution', queryId: 'sec.posture', visualization: 'table', w: 24, h: 6 },
  { key: 'sec.list', section: 'queue', queryId: 'sec.vulnerabilities', visualization: 'table', w: 24, h: 8 },
  { key: 'sec.context', section: 'context', queryId: 'sec.context', visualization: 'table', w: 24, h: 7 },
  { key: 'techVersions', section: 'technology', dql: V.techVersions.dql, visualization: 'table', w: 24, h: 6 },
];

/**
 * "Logs and data quality" (3.6.7; 3.7.1 after the owner's log-analytics example, for SRE troubleshooting): volume by month,
 * the records by status, the error patterns, exceptions and errors without a level, sources, context and retention. Reads
 * of every record use a 1:100 sample (labelled so: shapes and shares, never counts); the dashboard opens on the last 2 h.
 */
const ORIGIN_TAIL = (fields: string, origin: string) => [`| fieldsAdd origin = coalesce(${origin})`, `| fields ${fields}`];
const LOGS_TILES: readonly DashboardTilePlan[] = [
  { key: 'logMonthly', section: 'volume', dql: V.logMonthly.dql, visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'sre.logTrend', section: 'volume', queryId: 'log.ingest.trend', visualization: 'lineChart', w: 12, h: 5 },
  { key: 'logErrorPct', section: 'status', dql: V.logContextShare.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'errorPct', better: 'lower', good: 1, bad: 5 } },
  { key: 'logWarnPct', section: 'status', dql: V.logContextShare.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'warnPct', better: 'lower', good: 5, bad: 15 } },
  { key: 'logNoLevelPct', section: 'status', dql: V.logContextShare.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'noLevelPct', better: 'lower', good: 20, bad: 60 } },
  { key: 'logTracePct', section: 'status', dql: V.logContextShare.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'withTracePct', better: 'higher', good: 50, bad: 10 } },
  { key: 'logServicePct', section: 'status', dql: V.logContextShare.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'withServicePct', better: 'higher', good: 50, bad: 10 } },
  { key: 'logStatusTrend', section: 'status', dql: V.logStatusTrend.dql, visualization: 'barChart', w: 12, h: 5 },
  { key: 'logLevels', section: 'status', dql: V.logLevels.dql, visualization: 'donutChart', w: 12, h: 5 },
  // 3.7.2 (the owner: tables full of "null"): the catalog reads keep their columns, the dashboard shows one origin instead.
  { key: 'logPatterns', section: 'patterns', queryId: 'log.errors.grouped', tail: ORIGIN_TAIL('last, origin, message, count, hosts', 'service, workload, bucket'), visualization: 'table', w: 12, h: 6 },
  { key: 'logTopMessages', section: 'patterns', dql: V.logTopMessages.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'logExceptions', section: 'patterns', dql: V.logExceptions.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'logHiddenErrors', section: 'patterns', dql: V.logHiddenErrors.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'logs.errors', section: 'patterns', queryId: 'log.errors.recent', tail: ORIGIN_TAIL('timestamp, origin, content', 'service, workload, host, bucket'), visualization: 'table', w: 24, h: 6 },
  { key: 'logSources', section: 'sources', dql: V.logSources.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'sre.logQuality', section: 'sources', queryId: 'log.quality', visualization: 'table', w: 12, h: 6 },
  { key: 'logs.buckets', section: 'retention', queryId: 'log.buckets', visualization: 'table', w: 12, h: 6 },
  { key: 'logs.sfm', section: 'retention', queryId: 'log.sfm', visualization: 'table', w: 12, h: 6 },
];

/**
 * 3.7.1 — "Environment overview and SLOs" (the owner: a general overview with the SLOs the PoC Builder created, its SLO
 * part filled once they exist; it takes the place of "Value of the PoC" on the Builder). The SLOs on the platform's own
 * SLO tiles, then the pulse, the health maps, services, the estate, Kubernetes, the latest log errors and security.
 */
const OVERVIEW_TILES: readonly DashboardTilePlan[] = [
  { key: 'sre.successPct', section: 'pulse', dql: V.successPct.dql, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'successPct', better: 'higher', good: 99, bad: 95 } },
  { key: 'p90', section: 'pulse', dql: V.responsePercentiles.dql, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'p90Ms', better: 'lower', good: 1000, bad: 3000 } },
  { key: 'problemsActive', section: 'pulse', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'active', better: 'lower', good: 1, bad: 10 } },
  { key: 'hosts', section: 'pulse', dql: DQL.hosts, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'hosts', better: 'none' } },
  { key: 'serviceHealth', section: 'health', dql: V.serviceHealth.dql, visualization: 'honeycomb', w: 12, h: 7, settings: HEALTH_MAP },
  { key: 'hostHealth', section: 'health', dql: V.hostHealth.dql, visualization: 'honeycomb', w: 12, h: 7, settings: HEALTH_MAP },
  { key: 'serviceFailureRate', section: 'services', dql: V.serviceFailureRate.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'serviceThroughput', section: 'services', dql: V.serviceThroughput.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'cpuTable', section: 'estate', dql: V.cpuTable.dql, visualization: 'table', w: 8, h: 6, settings: usageColours('usage', 75, 90) },
  { key: 'memoryTable', section: 'estate', dql: V.memoryTable.dql, visualization: 'table', w: 8, h: 6, settings: usageColours('usage', 75, 90) },
  { key: 'diskTable', section: 'estate', dql: V.diskTable.dql, visualization: 'table', w: 8, h: 6, settings: usageColours('percent', 80, 95) },
  { key: 'infra.restartsTotal', section: 'kubernetes', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'restarts', better: 'lower', good: 10, bad: 100 } },
  { key: 'infra.oomKills', section: 'kubernetes', queryId: 'k8s.pressure.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'oomKills', better: 'lower', good: 1, bad: 10 } },
  { key: 'infra.restartingWorkloads', section: 'kubernetes', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'workloads', better: 'none' } },
  { key: 'infra.restartsTrend', section: 'kubernetes', queryId: 'k8s.restarts.trend', visualization: 'lineChart', w: 16, h: 5 },
  { key: 'logs.errors', section: 'logs', queryId: 'log.errors.recent', tail: ORIGIN_TAIL('timestamp, origin, content', 'service, workload, host, bucket'), visualization: 'table', w: 24, h: 6 },
  { key: 'secCritical', section: 'security', queryId: 'sec.posture', tail: POSTURE_SUM('critical', 'CRITICAL'), visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'critical', better: 'lower', good: 1, bad: 1 } },
  { key: 'secActNow', section: 'security', queryId: 'sec.posture', tail: ['| summarize actNow = sum(actNow)'], visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'actNow', better: 'lower', good: 1, bad: 1 } },
  { key: 'secTotal', section: 'security', queryId: 'sec.posture', tail: POSTURE_SUM('total'), visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'total', better: 'lower', good: 1, bad: 1 } },
];

/** 3.7.3 — "Kubernetes and containers" (the owner's namespace-workloads example, cluster-wide and without variables). */
const KUBERNETES_TILES: readonly DashboardTilePlan[] = [
  { key: 'k8s.clusters', section: 'pulse', dql: V.k8sPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'clusters', better: 'none' } },
  { key: 'k8s.namespaces', section: 'pulse', dql: V.k8sPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'namespaces', better: 'none' } },
  { key: 'k8s.workloads', section: 'pulse', dql: V.k8sPulse.dql, visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'workloads', better: 'none' } },
  { key: 'infra.restartsTotal', section: 'pulse', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'restarts', better: 'lower', good: 10, bad: 100 } },
  { key: 'infra.oomKills', section: 'pulse', queryId: 'k8s.pressure.total', visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'oomKills', better: 'lower', good: 1, bad: 10 } },
  { key: 'infra.restartingWorkloads', section: 'pulse', queryId: 'k8s.restarts.total', visualization: 'singleValue', w: 4, h: 2, singleValue: { field: 'workloads', better: 'none' } },
  { key: 'k8s.cpuByWorkload', section: 'usage', dql: V.k8sCpuByWorkload.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'k8s.memByWorkload', section: 'usage', dql: V.k8sMemByWorkload.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'k8s.byKind', section: 'usage', dql: V.k8sByKind.dql, visualization: 'donutChart', w: 12, h: 5 },
  { key: 'infra.k8sInventory', section: 'usage', queryId: 'k8s.inventory', visualization: 'table', w: 12, h: 6 },
  { key: 'k8s.networkRx', section: 'network', dql: V.k8sNetwork.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'k8s.networkTx', section: 'network', dql: V.k8sNetworkTx.dql, visualization: 'areaChart', w: 12, h: 5 },
  { key: 'infra.restartsTrend', section: 'stability', queryId: 'k8s.restarts.trend', visualization: 'lineChart', w: 12, h: 5 },
  { key: 'infra.pressure', section: 'stability', queryId: 'k8s.pressure', visualization: 'table', w: 12, h: 6 },
];

/** 3.7.3 — "Databases and dependencies" (the owner's database-observability and front/back-end examples, in the app's mould). */
const DATABASE_TILES: readonly DashboardTilePlan[] = [
  { key: 'db.health', section: 'health', dql: V.dbHealth.dql, visualization: 'honeycomb', w: 12, h: 3, settings: HEALTH_MAP },
  { key: 'db.calls', section: 'health', dql: V.dbPulse.dql, visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'calls', better: 'none' } },
  { key: 'db.failurePct', section: 'health', dql: V.dbPulse.dql, visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'failurePct', better: 'lower', good: 1, bad: 5 } },
  { key: 'db.p90Ms', section: 'health', dql: V.dbPulse.dql, visualization: 'singleValue', w: 4, h: 3, singleValue: { field: 'p90Ms', better: 'lower', good: 100, bad: 1000 } },
  { key: 'db.callsTop', section: 'traffic', dql: V.dbCallsTop.dql, visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'db.callsTrend', section: 'traffic', dql: V.dbCallsTrend.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'db.latencyTop', section: 'latency', dql: V.dbLatencyTop.dql, visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'db.latencyTrend', section: 'latency', dql: V.dbLatencyTrend.dql, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'db.failuresTop', section: 'failures', dql: V.dbFailuresTop.dql, visualization: 'categoricalBarChart', w: 12, h: 5 },
  { key: 'db.failuresTrend', section: 'failures', dql: V.dbFailuresTrend.dql, visualization: 'barChart', w: 12, h: 5 },
  { key: 'db.table', section: 'consumers', dql: V.dbTable.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'db.callers', section: 'consumers', dql: V.dbCallers.dql, visualization: 'table', w: 12, h: 6 },
  { key: 'sre.calls', section: 'consumers', queryId: 'svc.topology.calls', visualization: 'table', w: 24, h: 6 },
];

export const SPECIALTY_BLUEPRINTS: Readonly<Record<SpecialtyId, DashboardBlueprint>> = {
  overview: {
    id: 'overview',
    sections: ['slos', 'pulse', 'health', 'services', 'estate', 'kubernetes', 'logs', 'security'],
    tiles: OVERVIEW_TILES,
    sectionEvidence: { kubernetes: 'kubernetes' },
    goals: false,
    sloSection: 'slos',
    banner: BANNER.overview,
    icons: { slos: 'ServiceLevelObjectivesIcon', pulse: 'HeartIcon', health: 'HexagonIcon', services: 'ServicesIcon', estate: 'HostsIcon', kubernetes: 'ContainerIcon', logs: 'LogsIcon', security: 'SecurityHighIcon' },
  },
  sre: {
    id: 'sre',
    sections: ['pulse', 'health', 'problems', 'rca', 'services', 'logs', 'automation'],
    tiles: SRE_TILES,
    sectionEvidence: { automation: 'automation' },
    goals: false,
    banner: BANNER.sre,
    icons: { pulse: 'HeartIcon', health: 'HexagonIcon', problems: 'WarningIcon', rca: 'AiIcon', services: 'ServicesIcon', logs: 'LogsIcon', automation: 'WorkflowsIcon' },
  },
  infra: {
    id: 'infra',
    sections: ['inventory', 'estate', 'saturation', 'network', 'kubernetes', 'problems', 'data'],
    tiles: INFRA_TILES,
    sectionEvidence: { kubernetes: 'kubernetes' },
    goals: false,
    banner: BANNER.infra,
    // eslint-disable-next-line noSecrets/no-secrets -- a Strato icon's name
    icons: { inventory: 'InfrastructureObservabilitySignetIcon', estate: 'HostsIcon', saturation: 'BandChartIcon', network: 'NetworkIcon', kubernetes: 'ContainerIcon', problems: 'WarningIcon', data: 'DatabaseIcon' },
  },
  experience: {
    id: 'experience',
    sections: ['slos', 'pulse', 'audience', 'health', 'journeys', 'synthetic', 'business', 'backend'],
    tiles: EXPERIENCE_TILES,
    sectionEvidence: { pulse: 'experience', audience: 'experience', health: 'experience', journeys: 'experience', synthetic: 'synthetic' },
    goals: false,
    // 3.7.3: the main availability and performance SLOs (the overview keeps them all).
    sloSection: 'slos',
    sloKinds: ['availability', 'performance'],
    banner: BANNER.experience,
    icons: { slos: 'ServiceLevelObjectivesIcon', pulse: 'HeartIcon', audience: 'UserSessionsIcon', health: 'HeartIcon', journeys: 'FlowIcon', synthetic: 'SyntheticMonitoringSignetIcon', business: 'BusinessAnalyticsSignetIcon', backend: 'ServicesIcon' },
  },
  // 3.7.1: no evidence gate — the posture shows what the platform reports, zero included (3.6.7's gate left it empty).
  security: {
    id: 'security',
    sections: ['posture', 'distribution', 'queue', 'context', 'technology'],
    tiles: SECURITY_TILES,
    sectionEvidence: {},
    goals: false,
    banner: BANNER.security,
    icons: { posture: 'SecurityHighIcon', distribution: 'DonutChartIcon', queue: 'WarningIcon', context: 'HostsIcon', technology: 'TechnologiesIcon' },
  },
  logs: {
    id: 'logs',
    sections: ['volume', 'status', 'patterns', 'sources', 'retention'],
    tiles: LOGS_TILES,
    sectionEvidence: {},
    goals: false,
    banner: BANNER.logs,
    icons: { volume: 'BarChartIcon', status: 'LogsIcon', patterns: 'MagnifyingGlassIcon', sources: 'DataTableIcon', retention: 'DatabaseIcon' },
    timeframe: LOG_WINDOW,
  },
  kubernetes: {
    id: 'kubernetes',
    sections: ['pulse', 'usage', 'network', 'stability'],
    tiles: KUBERNETES_TILES,
    sectionEvidence: { pulse: 'kubernetes', usage: 'kubernetes', network: 'kubernetes', stability: 'kubernetes' },
    goals: false,
    banner: BANNER.kubernetes,
    icons: { pulse: 'HeartIcon', usage: 'ContainerIcon', network: 'NetworkIcon', stability: 'WarningIcon' },
    timeframe: { from: 'now()-2h', to: 'now()' },
  },
  database: {
    id: 'database',
    sections: ['health', 'traffic', 'latency', 'failures', 'consumers'],
    tiles: DATABASE_TILES,
    sectionEvidence: {},
    goals: false,
    banner: BANNER.database,
    icons: { health: 'DatabaseIcon', traffic: 'BarChartIcon', latency: 'StopwatchIcon', failures: 'WarningIcon', consumers: 'FlowIcon' },
  },
};
