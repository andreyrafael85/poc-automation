/**
 * `rich` scenario: a busy, realistic, entirely synthetic estate.
 *
 * Stress included on purpose: ~60 hosts, 70 services, a few very long names
 * (80+ characters, no spaces), nulls and missing fields, one problem with a long
 * markdown description, 64-bit counts delivered as numeric strings (as Grail
 * does), and a timeseries with gaps.
 *
 * Field names and units follow the catalog's DQL aliases and
 * docs/SOURCES-AND-FIELDS.md: Grail durations are NANOSECONDS, response_time is
 * MICROSECONDS, memoryTotal is BYTES.
 *
 * No real customer, tenant, e-mail or UUID appears here. Entity ids are
 * zero-padded and obviously synthetic.
 */

import { DAY, HOUR, MIN, Rand, assertLong, entityId, isoAgo, nowMs, ns, pad2, table, timeseries } from './lib.mjs';
import { buildPrintFixtures } from './prints.mjs';

const GIB = 1024 ** 3;

// ------------------------------------------------------------------ hosts
function buildHosts() {
  const r = new Rand(101);
  const hosts = [];
  const add = (name, extra = {}) => {
    const n = hosts.length + 1;
    const cores = r.pick([2, 4, 4, 8, 8, 16, 32]);
    hosts.push({
      id: entityId('HOST', n),
      name,
      osType: r.chance(0.86) ? 'LINUX' : 'WINDOWS',
      osVersion: null,
      cloudType: null,
      monitoringMode: null,
      cpuCores: cores,
      memoryTotal: cores * r.pick([2, 4, 4, 8]) * GIB,
      hostGroupName: r.pick(['hg-prod-eu', 'hg-prod-us', 'hg-prod-ap', 'hg-staging', null]),
      networkZone: r.pick(['default', 'default', 'dmz-eu', 'dmz-us', null]),
      state: 'MONITORED',
      ...extra,
    });
  };
  const regions = ['eu', 'us', 'ap'];
  for (let i = 1; i <= 38; i += 1) add(`host-${regions[i % 3]}-${pad2(Math.ceil(i / 3))}`);
  for (const cluster of ['a', 'b', 'c']) {
    for (let i = 1; i <= 6; i += 1) add(`k8s-cluster-${cluster}-node-${pad2(i)}`, { osType: 'LINUX' });
  }
  for (let i = 1; i <= 4; i += 1) add(`db-eu-${pad2(i)}`, { osType: 'LINUX' });
  add(assertLong('host-eu-west-1-production-checkout-payment-gateway-primary-replica-0042-internal-corp-example'), {
    osType: 'LINUX',
  });
  add('win-app-01', { osType: 'WINDOWS' });

  // Attributes the platform reports on only some hosts.
  hosts.forEach((host, i) => {
    host.osVersion =
      host.osType === 'WINDOWS'
        ? 'Windows Server 2022'
        : r.pick(['Ubuntu 22.04.4 LTS', 'Ubuntu 22.04.4 LTS', 'RHEL 9.3', 'Debian 12', 'Amazon Linux 2023']);
    if (i % 11 === 0) host.osVersion = null;
    host.monitoringMode = i % 3 === 0 ? 'FULL_STACK' : i % 7 === 0 ? 'INFRASTRUCTURE' : i % 5 === 0 ? 'FULL_STACK' : null;
    if (i % 9 === 4) host.state = 'UNMONITORED';
  });
  // Cloud attribution on 19 hosts.
  const cloudKinds = [...Array(10).fill('EC2'), ...Array(5).fill('GOOGLE_CLOUD_PLATFORM'), ...Array(4).fill('AZURE')];
  cloudKinds.forEach((kind, i) => {
    hosts[i * 3 + 1].cloudType = kind;
  });
  // A couple of hosts with a field missing entirely (not null): exercises `undefined`.
  delete hosts[5].cpuCores;
  delete hosts[17].hostGroupName;
  return hosts;
}

// --------------------------------------------------------------- services
const TECH = {
  JAVA: 'type:JAVA,edition:null,version:17.0.9',
  JAVA8: 'type:JAVA,edition:null,version:1.8.0_292',
  SPRING: 'type:SPRINGBOOT,edition:null,version:3.2.0',
  TOMCAT: 'type:TOMCAT,edition:null,version:10.1.16.0',
  NODE: 'type:NODE_JS,edition:null,version:20.11.0',
  DOTNET: 'type:DOTNET,edition:null,version:8.0.1',
  GO: 'type:GO,edition:null,version:null',
  PY: 'type:PYTHON,edition:null,version:3.11.6',
  NGINX: 'type:NGINX,edition:null,version:1.25.3',
  KAFKA: 'type:KAFKA,edition:null,version:3.6.0',
};

function buildServices() {
  const r = new Rand(202);
  const domains = [
    'checkout', 'cart', 'catalog', 'payments', 'inventory', 'search', 'auth', 'notifications',
    'shipping', 'billing', 'gateway', 'recommendation', 'reporting', 'orders', 'users',
  ];
  const kinds = [
    ...Array(22).fill(['WEB_SERVICE', 'JAVA']),
    ...Array(12).fill(['WEB_REQUEST_SERVICE', 'NGINX']),
    ...Array(9).fill(['DATABASE_SERVICE', 'N/A']),
    ...Array(7).fill(['MESSAGING_SERVICE', 'JAVA']),
    ...Array(5).fill(['QUEUE_LISTENER_SERVICE', 'JAVA']),
    ...Array(8).fill(['CUSTOM_SERVICE', 'SDK']),
    ...Array(7).fill(['UNIFIED', 'GO']),
  ];
  const agentFor = { JAVA: ['JAVA', 'JAVA', 'DOTNET', 'NODEJS', 'PYTHON', 'GO'], NGINX: ['NGINX'], 'N/A': ['N/A'], SDK: ['SDK'], GO: ['GO', 'NODEJS'] };
  const dbVendors = [['PostgreSQL', 'orders-db'], ['MySQL', 'catalog-db'], ['MongoDB', 'sessions'], ['Redis', 'cart-cache'], ['PostgreSQL', 'billing-db']];
  const counters = {};
  const services = kinds.map(([serviceType, defaultAgent], i) => {
    const domain = domains[i % domains.length];
    counters[domain] = (counters[domain] ?? 0) + 1;
    const agent = r.pick(agentFor[defaultAgent] ?? [defaultAgent]);
    const tech =
      agent === 'JAVA' ? [r.pick([TECH.JAVA, TECH.JAVA, TECH.JAVA8]), r.pick([TECH.SPRING, TECH.TOMCAT])]
      : agent === 'NODEJS' ? [TECH.NODE]
      : agent === 'DOTNET' ? [TECH.DOTNET]
      : agent === 'PYTHON' ? [TECH.PY]
      : agent === 'GO' ? [TECH.GO]
      : agent === 'NGINX' ? [TECH.NGINX]
      : [];
    const service = {
      id: entityId('SERVICE', i + 1),
      name: `svc-${domain}-${pad2(counters[domain])}`,
      serviceType,
      agentTechnologyType: agent,
      technologies: tech,
      databaseVendor: null,
      databaseName: null,
      databaseHosts: [],
      isExternal: false,
      publicDomain: null,
      port: null,
    };
    if (serviceType === 'DATABASE_SERVICE') {
      const [vendor, db] = dbVendors[i % dbVendors.length];
      service.databaseVendor = vendor;
      service.databaseName = db;
      service.databaseHosts = [`db-eu-${pad2((i % 4) + 1)}`];
      service.port = vendor === 'Redis' ? 6379 : vendor === 'MongoDB' ? 27017 : 5432;
    }
    if (serviceType === 'WEB_REQUEST_SERVICE' && i % 4 === 0) {
      service.isExternal = true;
      service.publicDomain = `api.partner-${pad2((i % 9) + 1)}.example.invalid`;
      service.port = 443;
    }
    return service;
  });
  // Three very long names, and one oddly-named dependency.
  services[3].name = assertLong('svc-checkout-orchestrator-payment-authorization-fraud-scoring-shadow-canary-eu-west-1-primary');
  services[11].name = assertLong('svc-recommendation-engine-feature-store-online-inference-gateway-v2-experimental-eu-central-1');
  services[26].name = assertLong('svc-billing-invoice-reconciliation-batch-worker-nightly-settlement-export-to-data-warehouse-prod');
  services[40].technologies = []; // nothing detected
  services[41].agentTechnologyType = null; // missing attribute
  return services;
}

/** Per-service golden-signal numbers, deterministic and long-tailed. */
function buildServiceStats(services) {
  const r = new Rand(303);
  return services.map((service, i) => {
    const base = Math.round(2_400_000 / (1 + i * 0.55) + r.float(500, 9000));
    const failureRate = i === 2 ? 11.4 : i === 7 ? 4.9 : r.chance(0.2) ? r.float(0.6, 3.2) : r.float(0, 0.45);
    const failures = Math.round((base * failureRate) / 100);
    return {
      name: service.name,
      serviceId: service.id,
      totalRequests: base,
      totalFailures: failures,
      failureRatePct: base > 0 ? (failures * 100) / base : 0,
      avgResponseTimeUs: i === 12 ? null : Math.round(r.float(700, 90_000) * (i % 5 === 0 ? 6 : 1)),
    };
  });
}

// --------------------------------------------------------------- problems
const LONG_RCA = [
  '## Response time degradation',
  '',
  'The problem affects 5 entities overall.',
  '',
  'A root-cause was detected.',
  '',
  '**Root cause**',
  '',
  'Service `svc-payments-02` experienced a sustained increase in response time after a deployment of version `2026.09.4-rc1`.',
  'The slowdown propagated to all callers within 4 minutes. Davis correlated the onset with a rise in connection-pool wait time on `db-eu-02`.',
  '',
  '**Following entities were affected by the problem:**',
  '- Service, svc-checkout-01',
  '- Service, svc-cart-02',
  '- Service, svc-payments-02',
  '- Service, svc-gateway-01',
  '- Service, svc-orders-03',
  '',
  '**Evidence**',
  '',
  '| Signal | Baseline | Observed |',
  '| --- | --- | --- |',
  '| Response time (p90) | 120 ms | 1.9 s |',
  '| Failure rate | 0.2 % | 3.8 % |',
  '| Connection pool wait | 2 ms | 640 ms |',
  '',
  'Info: Unexpected high service load',
  'The current response time (1.9 s) exceeds the auto-detected baseline (118 ms) by 1510 %.',
  '',
  '```',
  'GET /api/v2/checkout/authorize?session=0000-synthetic-0000-0000-0000&trace=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '```',
  '',
  'See https://docs.example.invalid/runbooks/payments/connection-pool-exhaustion-and-slow-authorization-troubleshooting-guide-for-on-call-engineers-v12 for the runbook.',
  '',
  '- Endpoint /api/v2/checkout/authorize has a slowdown.',
  '- ... and 2 more affected entities.',
].join('\n');

const SHORT_RCA = (name, n) =>
  [
    `## ${name}`,
    '',
    `The problem affects ${n} entities overall.`,
    '',
    '**Following entities were affected by the problem:**',
    '- Service, svc-orders-02',
  ].join('\n');

function buildProblems() {
  const r = new Rand(404);
  const catalog = [
    ['Response time degradation', 'SLOWDOWN'],
    ['Failure rate increase', 'ERROR'],
    ['Memory saturation', 'RESOURCE_CONTENTION'],
    ['CPU saturation', 'RESOURCE_CONTENTION'],
    ['Host unavailable', 'AVAILABILITY'],
    ['Pod restarts exceeded threshold', 'AVAILABILITY'],
    ['Connectivity problem', 'AVAILABILITY'],
    ['Slow disk response', 'RESOURCE_CONTENTION'],
    ['Queue backlog growing', 'CUSTOM_ALERT'],
  ];
  const services = ['svc-checkout-01', 'svc-cart-02', 'svc-payments-02', 'svc-gateway-01', 'svc-orders-03', 'svc-search-01', 'svc-auth-02'];
  const namespaces = ['checkout', 'payments', 'shop-prod', 'platform'];
  const problems = [];
  for (let i = 0; i < 100; i += 1) {
    const [name, category] = catalog[r.int(0, catalog.length - 1)];
    const active = i % 11 === 3;
    const startAgo = Math.round(r.float(5, 7 * 24 * 60)) * MIN;
    const durationMs = Math.round(r.float(2, 300)) * MIN;
    const service = r.pick(services);
    const hasK8s = r.chance(0.6);
    problems.push({
      displayId: `P-${9100100 + i}`,
      name,
      category,
      status: active ? 'ACTIVE' : 'CLOSED',
      severity: null,
      start: isoAgo(startAgo),
      end: active ? null : isoAgo(Math.max(startAgo - durationMs, 0)),
      durationNs: active ? null : ns(durationMs),
      impactLevel: r.chance(0.5) ? ['Services'] : ['Infrastructure'],
      affected: r.chance(0.3) ? [service, r.pick(services)] : [service],
      affectedTypes: ['SERVICE'],
      related: r.chance(0.4) ? [`host-eu-${pad2(r.int(1, 12))}`] : [],
      cluster: hasK8s ? ['k8s-cluster-a'] : null,
      namespace: hasK8s ? [r.pick(namespaces)] : null,
      workload: hasK8s ? [service.replace('svc-', 'wl-')] : null,
      underMaintenance: i % 17 === 0,
      analysisReady: r.chance(0.8),
      description: SHORT_RCA(name, r.int(1, 4)),
    });
  }
  problems[0].status = 'ACTIVE';
  problems[0].end = null;
  problems[0].durationNs = null;
  problems[0].name = 'Response time degradation';
  problems[0].category = 'SLOWDOWN';
  problems[0].description = LONG_RCA;
  problems[0].affected = ['svc-checkout-01', 'svc-cart-02', 'svc-payments-02', 'svc-gateway-01', 'svc-orders-03'];
  problems[1].description = null; // no narrative
  problems[2].name = 'Failure rate increase in svc-checkout-orchestrator-payment-authorization-fraud-scoring-shadow-canary-eu-west-1';
  problems[2].affected = [assertLong('svc-checkout-orchestrator-payment-authorization-fraud-scoring-shadow-canary-eu-west-1-primary')];
  return problems;
}

function problemAggregates(problems) {
  const r = new Rand(405);
  const summary = [
    ['AVAILABILITY', 'CLOSED', 3412], ['ERROR', 'CLOSED', 2718], ['RESOURCE_CONTENTION', 'CLOSED', 904],
    ['SLOWDOWN', 'CLOSED', 611], ['AVAILABILITY', 'ACTIVE', 22], ['ERROR', 'ACTIVE', 11],
    ['RESOURCE_CONTENTION', 'ACTIVE', 6], ['SLOWDOWN', 'ACTIVE', 2], ['CUSTOM_ALERT', 'CLOSED', 7],
  ].map(([category, status, count]) => ({ 'event.category': category, 'event.status': status, problems: count }));

  const names = [
    ['Failure rate increase', 'ERROR'], ['Host unavailable', 'AVAILABILITY'], ['Pod restarts exceeded threshold', 'AVAILABILITY'],
    ['Response time degradation', 'SLOWDOWN'], ['Memory saturation', 'RESOURCE_CONTENTION'], ['Connectivity problem', 'AVAILABILITY'],
    ['CPU saturation', 'RESOURCE_CONTENTION'], ['Slow disk response', 'RESOURCE_CONTENTION'], ['Queue backlog growing', 'CUSTOM_ALERT'],
  ];
  const recurrent = [];
  for (let i = 0; i < 25; i += 1) {
    const [name, category] = names[i % names.length];
    recurrent.push({
      'event.name': i < names.length ? name : `${name} (${['eu', 'us', 'ap'][i % 3]} cluster)`,
      'event.category': category,
      // 3.3.1 (Q12): a pattern is a problem name on an entity. Most carry no cause on a real
      // tenant, and a few name one — the mix the lab tenant actually shows.
      rootCause: i % 4 === 1 ? ['checkout-service', 'payments-db', 'easytrade_offer_service'][i % 3] : 'Cause not named by Davis',
      occurrences: Math.round(1800 / (1 + i * 0.45)),
      lastSeen: isoAgo(r.int(2, 600) * MIN),
      frequentEvent: Math.round(r.float(0, 40)),
    });
  }

  const timeline = [];
  for (let i = 0; i < 29; i += 1) {
    timeline.push({
      interval: isoAgo((29 - i) * 6 * HOUR - 6 * HOUR),
      problems: Math.round(40 + 25 * Math.sin(i / 3) + r.float(0, 30) + (i === 0 ? -20 : 0)),
    });
  }

  const mttx = [
    { 'event.category': 'RESOURCE_CONTENTION', problems: 612, mttrNs: ns(18.9 * HOUR), medianNs: ns(34 * MIN), p90Ns: ns(31 * HOUR), totalNs: ns(612 * 18.9 * HOUR) },
    { 'event.category': 'ERROR', problems: 2480, mttrNs: ns(11.5 * HOUR), medianNs: ns(22 * MIN), p90Ns: ns(26 * HOUR), totalNs: ns(2480 * 11.5 * HOUR) },
    { 'event.category': 'AVAILABILITY', problems: 3210, mttrNs: ns(2.1 * HOUR), medianNs: ns(9 * MIN), p90Ns: ns(4.6 * HOUR), totalNs: ns(3210 * 2.1 * HOUR) },
    { 'event.category': 'SLOWDOWN', problems: 540, mttrNs: ns(55 * MIN), medianNs: ns(14 * MIN), p90Ns: ns(2.2 * HOUR), totalNs: ns(540 * 55 * MIN) },
  ];

  const exposure = [{
    activeProblems: 41,
    totalOpenNs: ns(18_247 * HOUR),
    avgOpenNs: ns((18_247 / 41) * HOUR),
    oldestOpenNs: ns(1_419 * HOUR),
  }];

  const entities = [
    'svc-checkout-01', 'host-eu-03', 'svc-payments-02', 'k8s-cluster-a-node-02', 'svc-cart-02', 'svc-gateway-01',
    'db-eu-02', 'svc-orders-03', 'host-us-05', 'svc-search-01', 'k8s-cluster-b-node-04', 'svc-auth-02', 'host-ap-02',
    'svc-inventory-03', assertLong('svc-checkout-orchestrator-payment-authorization-fraud-scoring-shadow-canary-eu-west-1-primary'),
  ].map((affected, i) => ({
    affected,
    problems: Math.round(344 / (1 + i * 0.6)),
    categories: i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
    lastSeen: isoAgo(r.int(3, 900) * MIN),
  }));
  return { summary, recurrent, timeline, mttx, exposure, entities, problems };
}

function buildRca(problems) {
  const r = new Rand(505);
  const top = problems.slice(0, 8).map((p, i) => ({
    displayId: p.displayId,
    name: p.name,
    category: p.category,
    status: i === 0 ? 'ACTIVE' : p.status,
    severity: null,
    impact: p.impactLevel,
    affectedNames: p.affected,
    affectedTypes: p.affected.map(() => 'SERVICE'),
    relatedNames: ['db-eu-02', 'host-eu-03'],
    affectedIds: p.affected.map((_, k) => entityId('SERVICE', 20 + i * 5 + k)),
    relatedIds: [entityId('HOST', 3), entityId('HOST', 45)],
    // 3.2.7: the top incident's root cause is a database, as on the validation tenant, so the trail opens its top caller.
    rootCauseName: i < 6 ? (i === 0 ? 'payments-db' : p.affected[0]) : null,
    rootCauseId: i < 6 ? entityId('SERVICE', i === 0 ? 7 : 20 + i * 5) : null,
    eventId: `-${9000000000000000000n + BigInt(i)}_1790000000000V2`,
    start: p.start,
    end: p.end,
    durationNs: p.durationNs ?? ns(r.int(40, 900) * MIN),
    affectedCount: p.affected.length,
    hasRootCause: i < 6 ? 1 : 0,
    serviceRca: i < 4 ? 1 : 0,
    cluster: ['k8s-cluster-a'],
    namespace: ['checkout'],
    workload: ['wl-checkout-01'],
    description: p.description ?? LONG_RCA,
  }));
  top[0].description = LONG_RCA;
  top[0].durationNs = ns(7 * HOUR + 12 * MIN);

  const kpi = [{ total: 6824, rootCaused: 213, active: 41, resolved: 6783, avgAffected: 1.7 }];
  const logs = ['checkout', 'payments', 'shop-prod', 'platform', 'kube-system', 'monitoring', 'ingress-nginx', 'batch', 'search', 'data-pipeline']
    .map((namespace, i) => ({ namespace, errors: Math.round(498 / (1 + i * 0.7)), warnings: Math.round(1200 / (1 + i * 0.5)) }));
  logs[7].namespace = null;
  const trend = [];
  for (let i = 0; i < 8; i += 1) {
    trend.push({ day: isoAgo((8 - i) * DAY), opened: 700 + r.int(0, 130), rootCaused: r.int(6, 19), avgAffected: 1 + r.float(0, 0.15) });
  }
  const errsig = [
    ['Connection refused while connecting to upstream svc-payments-02:8443', 2210],
    ['java.net.SocketTimeoutException: Read timed out after 30000 ms', 1604],
    ['HTTP 503 Service Unavailable from gateway (no healthy upstream)', 982],
    ['OOMKilled: container exceeded memory limit 512Mi', 411],
    [assertLong('ERROR_com.example.synthetic.payments.authorization.FraudScoringTimeoutException_requestId_0000000000000000_shard_17_retry_exhausted'), 188],
    ['Failed to acquire connection from pool within 5000 ms', 97],
  ].map(([signature, count]) => ({ signature, count }));
  const catmix = [['AVAILABILITY', 3510], ['ERROR', 2705], ['RESOURCE_CONTENTION', 912], ['SLOWDOWN', 613], ['CUSTOM_ALERT', 7]]
    .map(([category, count]) => ({ category, count }));
  return { top, kpi, logs, trend, errsig, catmix };
}

// ------------------------------------------------------------ timeseries
function buildGolden() {
  const r = new Rand(606);
  const points = 24;
  const requests = [], failures = [], responseTime = [];
  for (let i = 0; i < points; i += 1) {
    const daily = 0.65 + 0.35 * Math.sin((i / 24) * Math.PI * 2 - 1.2);
    requests.push(Math.round(146_000 + daily * 86_000 + r.float(-4000, 4000)));
    failures.push(i === 9 || i === 10 ? null : Math.round(i < 6 ? 1696 - i * 270 : 18 + r.float(0, 40)));
    responseTime.push(Math.round(14_000 + daily * 6_000 + (i === 17 ? 38_000 : 0) + r.float(-1000, 1000)));
  }
  return timeseries({
    points, intervalMs: HOUR,
    series: [{ values: { requests, failures, responseTime } }],
    metrics: [
      { fieldName: 'requests', unit: 'count', key: 'dt.service.request.count' },
      { fieldName: 'failures', unit: 'count', key: 'dt.service.request.failure_count' },
      { fieldName: 'responseTime', unit: 'us', key: 'dt.service.request.response_time' },
    ],
  });
}

function buildInfraTrend() {
  const r = new Rand(707);
  const points = 24;
  const cpuPct = [], memoryPct = [];
  for (let i = 0; i < points; i += 1) {
    cpuPct.push(Number((12 + 18 * Math.max(0, Math.sin((i / 24) * Math.PI * 2 - 0.8)) + r.float(0, 4)).toFixed(2)));
    memoryPct.push(Number((24 + 28 * ((i % 24) / 24) * 0.6 + r.float(0, 3) + 12).toFixed(2)));
  }
  return timeseries({
    points, intervalMs: HOUR,
    series: [{ values: { cpuPct, memoryPct } }],
    metrics: [
      { fieldName: 'cpuPct', unit: 'Percent', key: 'dt.host.cpu.usage' },
      { fieldName: 'memoryPct', unit: 'Percent', key: 'dt.host.memory.usage' },
    ],
  });
}

/** An hourly series per field, between the given bounds, with the first `emptyFirst` bins empty. */
function buildHourly(seed, ranges, emptyFirst = 0) {
  const r = new Rand(seed);
  const points = 24;
  const values = Object.fromEntries(
    Object.entries(ranges).map(([field, [low, high]]) => [
      field,
      Array.from({ length: points }, (_, i) => (i < emptyFirst ? null : Math.round(r.float(low, high)))),
    ]),
  );
  return timeseries({ points, intervalMs: HOUR, series: [{ values }] });
}

/** `svc.topology.calls`: who calls what, by service type and database vendor (3.2.3). */
function buildCalls() {
  const links = [
    ['WEB_REQUEST_SERVICE', 'WEB_REQUEST_SERVICE', 'WEB_REQUEST_SERVICE', 25, 10, 18],
    ['WEB_REQUEST_SERVICE', 'WEB_SERVICE', 'WEB_SERVICE', 11, 7, 7],
    ['WEB_REQUEST_SERVICE', 'SQL Server', 'DATABASE_SERVICE', 6, 6, 2],
    ['WEB_REQUEST_SERVICE', 'PostgreSQL', 'DATABASE_SERVICE', 2, 1, 2],
    ['WEB_REQUEST_SERVICE', 'MESSAGING_SERVICE', 'MESSAGING_SERVICE', 3, 1, 3],
    ['QUEUE_LISTENER_SERVICE', 'MESSAGING_SERVICE', 'MESSAGING_SERVICE', 5, 4, 5],
    ['WEB_SERVICE', 'SQL Server', 'DATABASE_SERVICE', 2, 2, 2],
    ['WEB_REQUEST_SERVICE', '[declared unavailable by agent]', 'DATABASE_SERVICE', 2, 2, 1],
  ].map(([source, target, targetType, calls, callers, callees]) => ({ row: 'link', source, target, targetType, calls, callers, callees }));
  const callers = [['WEB_REQUEST_SERVICE', 16], ['QUEUE_LISTENER_SERVICE', 4], ['WEB_SERVICE', 2]]
    .map(([source, services]) => ({ row: 'caller', source, services }));
  const callees = [
    ['WEB_REQUEST_SERVICE', 'WEB_REQUEST_SERVICE', 18], ['WEB_SERVICE', 'WEB_SERVICE', 7], ['MESSAGING_SERVICE', 'MESSAGING_SERVICE', 5],
    ['SQL Server', 'DATABASE_SERVICE', 2], ['PostgreSQL', 'DATABASE_SERVICE', 2], ['[declared unavailable by agent]', 'DATABASE_SERVICE', 1],
  ].map(([target, targetType, services]) => ({ row: 'callee', target, targetType, services }));
  return [...links, ...callers, ...callees, { row: 'total', services: 76, withCalls: 23 }];
}

// ----------------------------------------------------------------- assembly
export function buildRich() {
  const r = new Rand(808);
  const hosts = buildHosts();
  const services = buildServices();
  const stats = buildServiceStats(services);
  const agg = problemAggregates(buildProblems());
  const rca = buildRca(agg.problems);

  const byKey = (list, keys) => {
    const map = new Map();
    for (const item of list) {
      const key = keys.map((k) => item[k] ?? null).join('|');
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.values()];
  };

  // --- coverage
  const inventory = [
    ['Hosts', hosts.length], ['Services', services.length], ['Web applications', 4], ['Mobile applications', 0],
    ['Process instances', 412], ['Kubernetes clusters', 3], ['Kubernetes workloads', 138], ['Synthetic monitors', 6],
    // 3.2.3: browser and HTTP monitors counted together, with the split.
    ['Synthetic monitors (browser)', 4], ['Synthetic monitors (HTTP)', 2],
  ].map(([category, value]) => ({ category, value }));

  const bucketNames = [
    ['default_logs', 'logs', 35, 91_000_000_000, 61_400_000_000_000], ['default_metrics', 'metrics', 462, 7_300_000_000, 880_000_000_000],
    ['default_spans', 'spans', 10, 5_200_000_000, 3_100_000_000_000], ['default_events', 'events', 35, 220_000_000, 41_000_000_000],
    ['default_bizevents', 'bizevents', 35, 1_099_009, 2_100_000_000], ['dt_davis_problems', 'events', 400, 91_000, 120_000_000],
    ['default_security_events', 'security.events', 35, 0, 0], ['default_user_sessions', 'user.sessions', 35, 5, 21_000],
    ['default_synthetic_user_sessions', 'user.sessions', 35, 6, 25_000], ['default_network_flows', 'network.flows', 14, 1_700_000, 410_000_000],
    ...Array.from({ length: 29 }, (_, i) => [`custom_logs_${['payments', 'checkout', 'audit', 'edge', 'batch'][i % 5]}_${pad2(i + 1)}`, 'logs', [7, 14, 35, 90, 365][i % 5], 40_000_000 / (1 + i), 9_000_000_000 / (1 + i)]),
  ];
  const buckets = bucketNames.map(([name, tableName, retentionDays, records, bytes], i) => ({
    name,
    table: tableName,
    retentionDays,
    includedQueryDays: 0,
    // Grail delivers some 64-bit counters as numeric strings.
    records: i % 4 === 0 ? String(Math.round(records)) : Math.round(records),
    bytes: Math.round(bytes),
    hasAccess: !(i === 6 || i === 7 || i === 8 || (i > 20 && i % 4 === 0)),
  }));
  buckets[12].retentionDays = null;

  const hostBreakdown = [...byKey(hosts, ['osType', 'cloudType', 'monitoringMode'])]
    .map((group) => ({ osType: group[0].osType, cloudType: group[0].cloudType, monitoringMode: group[0].monitoringMode, hosts: group.length }))
    .sort((a, b) => b.hosts - a.hosts);

  const hostTable = hosts.map((h) => ({
    id: h.id, name: h.name, osType: h.osType, osVersion: h.osVersion, cloudType: h.cloudType,
    monitoringMode: h.monitoringMode, cpuCores: h.cpuCores, memoryTotal: h.memoryTotal,
    hostGroupName: h.hostGroupName, networkZone: h.networkZone, state: h.state,
  }));

  // --- cloud
  const cloudHosts = hosts.filter((h) => h.cloudType !== null);
  const cloudAgg = ['EC2', 'GOOGLE_CLOUD_PLATFORM', 'AZURE'].map((cloudType) => {
    const group = cloudHosts.filter((h) => h.cloudType === cloudType);
    return {
      cloudType,
      hosts: group.length,
      cores: group.reduce((s, h) => s + (h.cpuCores ?? 0), 0),
      memBytes: group.reduce((s, h) => s + h.memoryTotal, 0),
      fullStack: group.filter((h) => h.monitoringMode === 'FULL_STACK').length,
      infra: group.filter((h) => h.monitoringMode === 'INFRASTRUCTURE').length,
    };
  });
  const cloudDetail = cloudHosts.map((h) => ({
    id: h.id, name: h.name, cloudType: h.cloudType, osType: h.osType, cpuCores: h.cpuCores,
    memoryTotal: h.memoryTotal, hostGroupName: h.hostGroupName, monitoringMode: h.monitoringMode, state: h.state,
  }));
  const cloudServices = [
    ['AWS_LAMBDA_FUNCTION', 112], ['AWS_S3_BUCKET', 61], ['AWS_RDS_DBINSTANCE', 14], ['AWS_SQS_QUEUE', 38], ['AWS_DYNAMODB_TABLE', 23],
    ['AWS_EKS_CLUSTER', 2], ['AWS_ELASTICLOADBALANCINGV2_LOADBALANCER', 9], ['AZURE_MICROSOFT_WEB_SITES', 31], ['AZURE_MICROSOFT_SQL_SERVERS', 6],
    ['AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS', 17], ['GCP_PUBSUB_TOPIC', 8], ['GCP_CLOUD_RUN_SERVICE', 5],
    // CSPM / inventory noise the model must ignore:
    ['AWS_EC2_INSTANCE', 1800], ['AWS_IAM_ROLE', 2400], ['AWS_EC2_SECURITYGROUP', 1500], ['AWS_EC2_VOLUME', 960],
    ['AZURE_MICROSOFT_NETWORK_NETWORKINTERFACES', 300], ['AWS_RDS_DBINSTANCE_CONFIGURATIONS', 14],
  ].map(([type, resources]) => ({ type, resources }));

  // `lic.hosts` groups hosts by monitoring mode and Host-Unit band (16 GiB steps), as the DQL does.
  const licGroups = new Map();
  for (const h of hosts) {
    const memory = h.memoryTotal ?? null;
    const huBucket = memory === null ? null : Math.ceil(memory / (16 * GIB));
    const key = `${h.monitoringMode ?? ''}|${huBucket}`;
    const group = licGroups.get(key) ?? { monitoringMode: h.monitoringMode ?? null, huBucket, hosts: 0, memoryBytes: 0 };
    group.hosts += 1;
    group.memoryBytes += memory ?? 0;
    licGroups.set(key, group);
  }
  const licHosts = [...licGroups.values()];

  // --- infrastructure capacity (per host peaks)
  const capacity = hosts.map((h, i) => {
    const avgCpu = r.float(3, 38), avgMem = r.float(10, 70), avgDisk = r.float(15, 80);
    let maxCpu = Math.min(99, avgCpu + r.float(5, 40)), maxMem = Math.min(99, avgMem + r.float(3, 20));
    if (i % 13 === 2) { maxCpu = r.float(91, 99); maxMem = r.float(80, 96); }
    if (i % 9 === 5) { maxCpu = r.float(6, 20); maxMem = r.float(5, 22); }
    const memBytes = h.memoryTotal ?? 8 * GIB;
    return {
      hostId: h.id, avgCpuPct: avgCpu, maxCpuPct: maxCpu, avgMemPct: avgMem, maxMemPct: maxMem,
      avgDiskPct: avgDisk, maxDiskPct: Math.min(99, avgDisk + r.float(0, 12)),
      name: h.name, cores: h.cpuCores ?? null, memBytes,
      memUsedBytes: (memBytes * avgMem) / 100, memHeadroomBytes: (memBytes * (100 - maxMem)) / 100,
    };
  }).filter((row) => row.memBytes > 0).sort((a, b) => b.memBytes - a.memBytes);
  const capTotal = [{
    hosts: hosts.length,
    totalCores: hosts.reduce((s, h) => s + (h.cpuCores ?? 0), 0),
    totalMemBytes: hosts.reduce((s, h) => s + h.memoryTotal, 0),
  }];

  // --- services
  const ranking = [...stats].sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 50);
  const breakdown = byKey(services, ['serviceType', 'agentTechnologyType'])
    .map((group) => ({ serviceType: group[0].serviceType, agentTechnologyType: group[0].agentTechnologyType, services: group.length }))
    .sort((a, b) => b.services - a.services);
  const totalRequests = stats.reduce((s, x) => s + x.totalRequests, 0);
  const totalFailures = stats.reduce((s, x) => s + x.totalFailures, 0);
  const svcTotals = [{ totalRequests, totalFailures, failureRatePct: (totalFailures * 100) / totalRequests }];
  const svcTopology = services.map((s) => ({
    id: s.id, name: s.name, serviceType: s.serviceType, technologies: s.technologies,
    databaseVendor: s.databaseVendor, databaseName: s.databaseName, databaseHosts: s.databaseHosts,
    isExternal: s.isExternal, publicDomain: s.publicDomain, port: s.port,
  }));

  // --- kubernetes
  const clusters = ['a', 'b', 'c'].map((c, i) => ({ id: entityId('KUBERNETES_CLUSTER', i + 1), name: `k8s-cluster-${c}` }));
  const wl = ['checkout', 'cart', 'payments', 'gateway', 'orders', 'search', 'auth', 'inventory', 'billing', 'notifications'];
  const restarts = Array.from({ length: 20 }, (_, i) => ({
    workload: i === 4 ? assertLong('wl-recommendation-engine-feature-store-online-inference-gateway-v2-experimental-eu-central-1') : `wl-${wl[i % wl.length]}-${pad2((i % 3) + 1)}`,
    cluster: `k8s-cluster-${['a', 'b', 'c'][i % 3]}`,
    total: Math.round(2375 / (1 + i * 0.8)),
  }));
  const pressure = Array.from({ length: 14 }, (_, i) => ({
    workload: `wl-${wl[(i + 2) % wl.length]}-${pad2((i % 3) + 1)}`,
    cluster: `k8s-cluster-${['a', 'b', 'c'][i % 3]}`,
    totalOom: i < 9 ? Math.round(64 / (1 + i)) : 0,
    // 3.2.3 (Q9): throttled millicores and their share of the CPU limit; the last two set no limit.
    throttledAvg: Number((140 / (1 + i * 0.6)).toFixed(1)),
    throttledPct: i >= 12 ? null : Number((28 / (1 + i * 0.6)).toFixed(2)),
  }));

  // --- processes
  const techRows = [
    ['JAVA', null, '17.0.9', 88], ['SPRINGBOOT', null, '3.2.0', 61], ['TOMCAT', null, '10.1.16.0', 24], ['NODE_JS', null, '20.11.0', 37],
    ['KAFKA', null, '3.6.0', 9], ['JAVA', null, '1.8.0_292', 14], ['PYTHON', null, '3.11.6', 22], ['DOTNET', null, '8.0.1', 12],
    ['NGINX', null, '1.25.3', 18], ['GO', null, null, 31], ['POSTGRESQL', null, '15.4', 6], ['REDIS', null, '7.2.3', 5],
    ['MONGODB', null, '6.0.12', 3], ['DYNATRACE', null, '1.300.0', 62], ['ONEAGENT', null, '1.300.0', 62], ['APACHE_HTTPD', null, '2.4.58', 7],
    ...Array.from({ length: 14 }, (_, i) => [['PHP', 'RUBY', 'ENVOY', 'ISTIO', 'ELASTICSEARCH', 'RABBITMQ', 'HAPROXY'][i % 7], i % 3 === 0 ? 'Community' : null, i % 4 === 0 ? null : `${i + 1}.${i}.0`, 10 - Math.floor(i / 2)]),
  ].map(([type, edition, version, instances]) => ({
    softwareTechnologies: `type:${type},edition:${edition},version:${version}`,
    instances,
  }));

  const compAgents = [
    'datadog-agent', 'datadog-cluster-agent', 'datadog-trace-agent', 'newrelic-infra', 'prometheus-server', 'node_exporter',
    'grafana-server', 'splunk-universal-forwarder', 'filebeat', 'zabbix-agent', 'nagios-nrpe',
  ].map((name) => ({ name }));

  // --- logs / consumption / automation / business
  // 3.2.3 (C12): grouped by status and bucket, every readable bucket.
  // 3.6.4: the status rows — problems by category and 3-hour slot over 7 days (a few still open began before it).
  const SLOT = 3 * HOUR;
  const slotIso = (k) => new Date(Math.floor((nowMs() - k * SLOT) / SLOT) * SLOT).toISOString();
  const statusRows = [];
  [['AVAILABILITY', 4, 0.9], ['ERROR', 12, 1.7], ['RESOURCE_CONTENTION', 3, 2.3], ['SLOWDOWN', 1.4, 0.7]].forEach(([category, base, phase]) => {
    for (let k = 55; k >= 0; k -= 1) {
      const wave = Math.sin(k / 4 + phase) + (k === 30 && category === 'ERROR' ? 6 : 0);
      const problems = Math.max(0, Math.round(base * (1 + 0.6 * wave)));
      if (problems === 0) continue;
      statusRows.push({ category, slot: slotIso(k), problems: String(problems), open: String(k < 2 && category !== 'SLOWDOWN' ? Math.min(problems, 2) : 0) });
    }
  });
  statusRows.push({ category: 'AVAILABILITY', slot: slotIso(160), problems: '3', open: '3' });
  // 3.6.4: the log console — the 12 most recent error records of the 30 minutes log.quality reads.
  const logErrors = Array.from({ length: 12 }, (_, i) => ({
    timestamp: isoAgo((i * 2 + 1) * MIN),
    content: [
      'Connection refused while connecting to upstream svc-payments-02:8443 (attempt 3 of 3)',
      'java.lang.IllegalStateException: order 9f2c could not be reserved — inventory lock timed out after 5000 ms',
      '[ds:prometheus] [severe] DEVICE_CONNECTION_ERROR Endpoint="http://localhost:9090/metrics"',
    ][i % 3],
    service: i % 3 === 1 ? 'svc-checkout-01' : null,
    host: i % 3 === 2 ? `host-eu-0${(i % 4) + 1}` : null,
    workload: i % 3 === 0 ? 'wl-checkout-01' : null,
    bucket: i % 3 === 1 ? 'custom_logs_checkout_02' : 'default_logs',
  }));
  // 3.6.8: the console's errors grouped in the window, with their counts (numbers as #, ids as <id>).
  const logErrorsGrouped = [
    ['Connection refused while connecting to upstream svc-payments-#:# (attempt # of #)', 'svc-checkout-01', 'custom_logs_checkout_02', 1_284, 3, 'wl-checkout-01'],
    ['[ds:prometheus] [severe] DEVICE_CONNECTION_ERROR Endpoint="http://localhost:#/metrics"', null, 'default_logs', 11_517, 8, null],
    ['java.lang.IllegalStateException: order <id> could not be reserved — inventory lock timed out after # ms', 'svc-orders-03', 'default_logs', 412, 2, null],
    ['Annotation retrieval failed: PodListFuture not valid (This message was ignored # times.)', null, 'default_logs', 4_314, 1, 'wl-node-agent'],
    ['Failed to connect to Systems Manager with SSM role credentials', null, 'default_logs', 471, 9, null],
    ['TimeoutException: call to svc-inventory-# exceeded # ms', 'svc-cart-02', 'custom_logs_checkout_02', 96, 2, 'wl-cart-02'],
    ['Payment gateway answered #: card issuer unavailable', 'svc-payments-02', 'custom_logs_payments_01', 58, 2, null],
    ['SQLTransientConnectionException: pool exhausted after # ms', 'svc-checkout-01', 'custom_logs_checkout_02', 37, 3, 'wl-checkout-01'],
  ].map(([message, service, bucket, count, hosts, workload], i) => ({
    message, service, bucket, count, hosts, workload, last: isoAgo((i * 3 + 1) * MIN),
  }));
  const logQuality = [
    ['NONE', 'default_logs', 1_517_000, 96, 0.06, 0], ['INFO', 'default_logs', 62_400, 41, 0.06, 0],
    ['WARN', 'default_logs', 9_100, 12, 0.06, 0], ['ERROR', 'default_logs', 5_708, 4, 0.06, 0],
    ['INFO', 'custom_logs_payments_01', 259_695, 7_953, 1, 1], ['NONE', 'custom_logs_payments_01', 40_000, 0, 1, 1],
    ['ERROR', 'custom_logs_checkout_02', 3_786, 2_164, 1, 1],
  ].map(([status, bucket, total, withService, hostShare, nsShare]) => ({
    status, bucket, total, withService, withHost: Math.round(total * hostShare), withK8sNamespace: Math.round(total * nsShare),
  }));
  const logIngest = [
    { 'event.type': 'Log Management & Analytics - Ingest & Process', bytes: '22934202611', events: 1440 },
    { 'event.type': 'Log Management & Analytics - Query', bytes: '60754085732', events: 988 },
  ];
  const logBuckets = buckets.filter((b) => b.table === 'logs').slice(0, 10)
    .map((b) => ({ name: b.name, records: b.records, retentionDays: b.retentionDays, bytes: b.bytes, hasAccess: b.hasAccess }));
  const logSfm = [
    ['LOG_SOURCE_STATUS', 'log_source.status', 3355], ['LOG_SFM', 'pgi.multiple_pgis', 2250], ['LOG_SFM', 'timestamp.no_pattern', 40],
    ['LOG_SFM', 'timestamp.multiple_patterns', 33], ['LOG_SFM', 'truncation.line_too_long', 12], ['LOG_SOURCE_STATUS', 'log_source.rotation', 4],
  ].map(([kind, type, occurrences]) => ({ 'event.kind': kind, 'event.type': type, occurrences }));
  const capabilities = [
    ['Full-Stack Monitoring', 1440, 34_200], ['Infrastructure Monitoring', 1440, 11_100], ['Log Management & Analytics - Ingest & Process', 1440, '22934202611'],
    ['Log Management & Analytics - Query', 988, '60754085732'], ['Log Management & Analytics - Retain', 1440, '412000000000'], ['Kubernetes Platform Monitoring', 1440, 6_000],
    ['Metrics - Ingest & Process', 1440, 4_100_000_000], ['Metrics - Query', 702, 880_000_000], ['Traces - Ingest & Process', 1440, 3_100_000_000],
    ['Traces - Query', 410, 1_900_000_000], ['Events - Ingest & Process', 1440, 41_000_000], ['Automation Workflow', 931, 12_940],
    ['Business Events - Ingest & Process', 1440, 2_100_000_000], ['Real User Monitoring', 144, 5_100], ['Synthetic Monitoring', 288, 4_300],
    ['Application Security', 96, 1_200], ['Davis Data Units', 720, 3_900_000],
  ].map(([type, events, billedBytes]) => ({ 'event.type': type, events, billedBytes }));
  const advisor = [
    ['logs', 9812, 61_400_000_000, 1840, 14_000], ['spans', 2210, 12_100_000_000, 950, 6_100], ['metrics', 4112, 0, 120, 880],
    ['events', 1840, 4_100_000_000, 410, 2_900], ['bizevents', 640, 1_800_000_000, 380, 2_100], ['dt.davis.problems', 530, 469_784_341, 1455, 4_400],
    ['security.events', 12, 0, 40, 90], ['user.events', 8, 0, 33, 41], ['dt.system.events', 3110, 2_700_000_000, 520, 3_300],
    ['dt.entity.host', 2204, 0, 22, 210], ['dt.entity.service', 1980, 0, 25, 190], ['dt.system.buckets', 410, 0, 18, 70],
    ['smartscape.nodes', 150, 0, 31, 120], ['dt.system.data_objects', 61, 0, 16, 33],
  ].map(([tableName, queries, scanned, avgMs, maxMs], i) => {
    const delivered = Math.round(queries * (i === 0 ? 14 : 1100));
    return {
      // 3.3.1 (Q8): distinct queries, not records. `aggregatedRecords` carries the events the
      // platform writes without a query_id, which countDistinctExact cannot see.
      table: tableName, queries, aggregatedRecords: 0, scannedOnDemandBytes: scanned, avgDurationMs: avgMs, maxDurationMs: maxMs,
      deliveredRecords: delivered, bytesPerDeliveredRecord: delivered > 0 ? scanned / delivered : 0,
    };
  });

  /**
   * 3.3.1 (Q8): the totals the page shows, from the aggregate rather than from adding the rows
   * above — a query that touched two tables appears in both. The distinct count is deliberately
   * below their sum, as it is on a real tenant.
   */
  const k8sPodHours = [{
    // 3.3.1 (Q11): measured pod-hours, deliberately below pods-now x 8760, as a real tenant shows.
    podHours: 172417.5, windows: 40992,
    firstSeen: isoAgo(7 * 24 * HOUR), lastSeen: isoAgo(0),
  }];

  const advisorTotal = [{
    queries: Math.round(advisor.reduce((n, row) => n + row.queries, 0) * 0.976),
    aggregatedRecords: 0,
    scannedOnDemandBytes: advisor.reduce((n, row) => n + row.scannedOnDemandBytes, 0),
    deliveredRecords: advisor.reduce((n, row) => n + row.deliveredRecords, 0),
    tables: advisor.length,
  }];
  const workflows = [
    ['Auto-remediate pod OOM', 'SUCCESS', 'Davis problem', 4120, 8.4], ['Notify on-call (checkout)', 'SUCCESS', 'Davis problem', 3100, 2.1],
    ['Nightly cost report', 'SUCCESS', 'Schedule', 31, 41], ['Ticket sync', 'ERROR', 'Event', 212, 6.6], ['Ticket sync', 'SUCCESS', 'Event', 3480, 5.9],
    ['Scale-out payments', 'SUCCESS', 'Davis problem', 76, 22], ['Rotate synthetic credentials', 'ERROR', 'Schedule', 7, 3.3],
    ['Slack digest', 'SUCCESS', 'Schedule', 288, 1.2], ['Security finding triage', 'SUCCESS', 'Event', 410, 9.9],
    ['Maintenance window sync', 'SUCCESS', 'Schedule', 96, 4.4], ['Runbook: restart svc-search', 'ERROR', 'Davis problem', 3, 31],
    [assertLong('workflow-nightly-reconciliation-export-of-invoice-ledger-to-data-warehouse-and-archive-bucket-eu-west-1'), 'SUCCESS', 'Schedule', 31, 120],
  ].map(([title, state, trigger, executions, seconds]) => ({ title, state, trigger, executions, avgDurationNs: ns(seconds * 1000) }));
  const biz = [
    'ecom.order.placed', 'pos.transaction', 'loan.application', 'credit-analysis', 'trade.execution', 'logistics.fulfillment',
    'payment.authorized', 'cart.abandoned', 'user.signup', 'inventory.adjusted', 'refund.issued', 'shipment.delivered',
  ].map((type, i) => ({ 'event.type': type, events: Math.round(412_000 / (1 + i * 0.8)) }));

  // --- security (rich data; the denied scenario fails this query instead)
  const stacks = ['log4j-core', 'spring-web', 'jackson-databind', 'netty-codec-http', 'commons-text', 'express', 'lodash', 'openssl', 'glibc', 'zlib', 'tomcat-embed-core'];
  const vulns = Array.from({ length: 120 }, (_, i) => {
    const score = Number(Math.max(1.1, 9.9 - i * 0.07 - (i % 5) * 0.4).toFixed(1));
    return {
      displayId: `S-${1001 + i}`,
      title: i === 4 ? assertLong('Remote-code-execution-via-unsafe-deserialization-in-synthetic-library-component-before-version-9.9.9-CVE-2099-00004') : `${['Remote code execution', 'Denial of service', 'Information disclosure', 'Path traversal', 'Prototype pollution'][i % 5]} in ${stacks[i % stacks.length]}`,
      cve: i % 6 === 0 ? [`CVE-2099-${String(1000 + i)}`, `CVE-2099-${String(2000 + i)}`] : [`CVE-2099-${String(1000 + i)}`],
      technology: i % 17 === 0 ? null : stacks[i % stacks.length],
      score,
      level: score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW',
      functionStatus: i % 3 === 0 ? 'IN_USE' : 'NOT_IN_USE',
      exposureStatus: i % 4 === 0 ? 'PUBLIC_NETWORK' : 'NOT_PUBLIC',
      exploitStatus: i % 5 === 0 ? 'AVAILABLE' : 'NOT_AVAILABLE',
      entityNames: Array.from({ length: (i % 4) + 1 }, (_, k) => `svc-${domainOf(i + k)}-${pad2(k + 1)}`),
    };
  });

  // --- RUM
  const rumScorecard = [
    ['web-shop-frontend', 48_200, 612_000, 3_100], ['admin-portal', 3_900, 51_000, 0], [assertLong('mobile-backend-for-frontend-api-gateway-public-facing-production-eu-west-1-primary'), 9_100, 120_000, 4_300],
  ].map(([name, actions, requests, errors]) => ({ 'frontend.name': name, actions, requests, errors, errorRatePct: Number(((errors / requests) * 100).toFixed(2)) }));
  const rumWebvitals = [
    ['web-shop-frontend', 402, 5400, 80, 286, 10, 155, 640], ['admin-portal', 324, 180, 20, 275, 5, 107, 210],
    [rumScorecard[2]['frontend.name'], 2900, 410, 1200, 1500, 900, 600, null],
  ].map(([name, lcp, inp, cls, load, ttfb, dom, actionDur]) => ({ 'frontend.name': name, lcp, inp, cls, load, ttfb, dom, actionDur }));
  const rumAudience = [['web-shop-frontend', 12_540, 99], ['admin-portal', 410, 22], [rumScorecard[2]['frontend.name'], 5_020, 1_300]]
    .map(([name, sessions, users]) => ({ 'frontend.name': name, sessions, users }));
  // 3.6.2: the Experience funnel — actions by experience level, requests by response class (consistent with the scorecard).
  const rumFunnel = [
    ['web-shop-frontend', 48_200, 39_100, 8_700, 400, 612_000, 609_900, 2_100],
    ['admin-portal', 3_900, 3_600, 280, 20, 51_000, 51_000, 0],
    [rumScorecard[2]['frontend.name'], 9_100, 4_300, 2_400, 2_400, 120_000, 117_100, 2_900],
  ].map(([name, actions, satisfied, tolerating, frustrated, requests, requestsOk, requestsFailed]) => ({ 'frontend.name': name, actions, satisfied, tolerating, frustrated, requests, requestsOk, requestsFailed }));
  const rumSessions = [{ userType: 'REAL_USER', sessions: 17_970 }, { userType: 'SYNTHETIC', sessions: 288 }];

  const incidentLogs = [
    ['Connection refused while connecting to upstream svc-payments-02:8443', 1210, 1210],
    ['java.net.SocketTimeoutException: Read timed out after 30000 ms', 604, 590],
    ['WARN Slow query detected on orders-db (3412 ms)', 311, 0],
    ['HTTP 503 Service Unavailable from gateway', 180, 180],
    ['', 40, 12],
  ].map(([sig, count, errors]) => ({ sig, count, errors }));
  // The exact totals over every error/warn log of the incident (the signatures above are the top list).
  incidentLogs.push({ sig: null, count: incidentLogs.reduce((n, row) => n + row.count, 0) + 3200, errors: incidentLogs.reduce((n, row) => n + row.errors, 0) + 2100, isTotal: true });

  // --- exact aggregates: the totals the pages print (the lists above are the display lists)
  const SEV = (level) => vulns.filter((v) => v.level === level);
  const postureGroups = new Map();
  for (const v of vulns) {
    const key = `${v.level}|${v.technology}`;
    const g = postureGroups.get(key) ?? { level: v.level, technology: v.technology, vulnerabilities: 0, actNow: 0, exploitable: 0, publicExposed: 0, inUse: 0, exploitPublic: 0, exploitInUse: 0, publicInUse: 0 };
    g.vulnerabilities += 1;
    const exploit = v.exploitStatus === 'AVAILABLE';
    const exposed = v.exposureStatus === 'PUBLIC_NETWORK';
    const inUse = v.functionStatus === 'IN_USE';
    if (exploit && exposed && inUse) g.actNow += 1;
    if (exploit) g.exploitable += 1;
    if (exposed) g.publicExposed += 1;
    if (inUse) g.inUse += 1;
    // 3.2.6: the pairs, for the queue after "act now".
    if (exploit && exposed) g.exploitPublic += 1;
    if (exploit && inUse) g.exploitInUse += 1;
    if (exposed && inUse) g.publicInUse += 1;
    postureGroups.set(key, g);
  }
  void SEV;
  const posture = [...postureGroups.values()];

  const capClass = (c) => {
    const hi = Math.max(c.maxCpuPct, c.maxMemPct);
    if (hi >= 90) return 'saturated';
    if (hi >= 75) return 'pressured';
    if (c.maxCpuPct < 25 && c.maxMemPct < 25) return 'oversized';
    return 'balanced';
  };
  const capSummary = [{
    hosts: capacity.length,
    saturated: capacity.filter((c) => capClass(c) === 'saturated').length,
    pressured: capacity.filter((c) => capClass(c) === 'pressured').length,
    balanced: capacity.filter((c) => capClass(c) === 'balanced').length,
    oversized: capacity.filter((c) => capClass(c) === 'oversized').length,
    unknown: 0,
    declaredMemBytes: capacity.reduce((s2, c) => s2 + c.memBytes, 0),
    usedMemBytes: capacity.reduce((s2, c) => s2 + c.memUsedBytes, 0),
    reclaimableMemBytes: capacity.filter((c) => capClass(c) === 'oversized').reduce((s2, c) => s2 + c.memHeadroomBytes, 0),
    oversizedCores: capacity.filter((c) => capClass(c) === 'oversized').reduce((s2, c) => s2 + (c.cores ?? 0), 0),
  }];

  const wfTotals = [{
    workflows: new Set(workflows.map((w) => w.title)).size,
    executions: workflows.reduce((s2, w) => s2 + w.executions, 0),
    succeeded: workflows.filter((w) => w.state === 'SUCCESS').reduce((s2, w) => s2 + w.executions, 0),
    failed: workflows.filter((w) => w.state === 'ERROR').reduce((s2, w) => s2 + w.executions, 0),
    failingWorkflows: new Set(workflows.filter((w) => w.state === 'ERROR').map((w) => w.title)).size,
  }];
  const recurrentTotals = [{
    patterns: agg.recurrent.filter((x) => x.occurrences >= 2).length,
    candidates: agg.recurrent.filter((x) => x.occurrences >= 5).length,
    recurringVolume: agg.recurrent.filter((x) => x.occurrences >= 2).reduce((s2, x) => s2 + x.occurrences, 0),
    allVolume: agg.recurrent.reduce((s2, x) => s2 + x.occurrences, 0),
    worst: Math.max(...agg.recurrent.map((x) => x.occurrences)),
  }];
  const restartTotals = [{ workloads: restarts.length, restarts: restarts.reduce((s2, x) => s2 + x.total, 0), worst: Math.max(...restarts.map((x) => x.total)) }];
  const pressureTotals = [{
    workloads: pressure.length,
    oomKills: pressure.reduce((s2, x) => s2 + x.totalOom, 0),
    throttled: pressure.reduce((s2, x) => s2 + x.totalThrottled, 0),
    oomWorkloads: pressure.filter((x) => x.totalOom > 0).length,
    throttledWorkloads: pressure.filter((x) => x.totalThrottled > 0).length,
  }];
  const rankingTotals = [{
    services: stats.length,
    failing: stats.filter((x) => x.totalFailures > 0).length,
    aboveOnePct: stats.filter((x) => (x.totalFailures * 100) / x.totalRequests > 1).length,
    weightedResponseUs: stats.reduce((s2, x) => s2 + x.avgResponseTimeUs * x.totalRequests, 0) / stats.reduce((s2, x) => s2 + x.totalRequests, 0),
  }];
  const topologyTotals = [{
    services: svcTopology.length,
    withDatabase: svcTopology.filter((x) => x.databaseVendor).length,
    external: svcTopology.filter((x) => x.isExternal).length,
    publicDomain: svcTopology.filter((x) => x.publicDomain).length,
    vendors: new Set(svcTopology.filter((x) => x.databaseVendor).map((x) => x.databaseVendor)).size,
  }];
  const countBy = (rows, pick) => {
    const m = new Map();
    for (const row of rows) for (const label of [].concat(pick(row)).filter(Boolean)) m.set(label, (m.get(label) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const topologyMix = [
    ...countBy(svcTopology, (x) => x.serviceType).map(([label, n]) => ({ tier: 'type', label, services: n })),
    ...countBy(svcTopology, (x) => (x.technologies ?? []).map((raw) => /type:([^,]+)/.exec(raw)?.[1])).map(([label, n]) => ({ tier: 'technology', label, services: n })),
    ...countBy(svcTopology, (x) => x.databaseVendor).map(([label, n]) => ({ tier: 'database', label, services: n })),
    ...countBy(svcTopology, (x) => x.publicDomain).map(([label, n]) => ({ tier: 'domain', label, services: n })),
  ];
  const bizTotals = [{ events: biz.reduce((s2, x) => s2 + x.events, 0) * 3, types: 1626 }];
  const topEntitiesTotals = [{ entities: 134, problems: agg.entities.reduce((s2, x) => s2 + x.problems, 0) }];
  const audienceTotals = [{ sessions: 17_970, users: 1_340 }];

  // 3.2.7: the callers of the top incident's root (a database), as the trail's query returns them
  // (most failures first). The real-prints evidence B3 has the same text, so it reads these too.
  const rootCallers = [
    { id: entityId('SERVICE', 20), name: 'svc-checkout-01', requests: 41_220, failures: 3_412, rootType: 'DATABASE_SERVICE' },
    { id: entityId('SERVICE', 22), name: 'svc-payments-02', requests: 18_904, failures: 377, rootType: 'DATABASE_SERVICE' },
    { id: entityId('SERVICE', 23), name: 'svc-gateway-01', requests: 96_410, failures: 12, rootType: 'DATABASE_SERVICE' },
    { id: entityId('SERVICE', 21), name: 'svc-cart-02', requests: 2_304, failures: 4, rootType: 'DATABASE_SERVICE' },
  ];

  const t = (records) => table(records);
  return {
    'cov.inventory': t(inventory),
    'cov.buckets': t(buckets),
    'cov.hosts.breakdown': t(hostBreakdown),
    'cov.hosts.table': t(hostTable),
    'cov.dataobjects': t(Array.from({ length: 60 }, (_, i) => ({ name: ['logs', 'spans', 'events', 'bizevents', 'metrics', 'dt.entity.host', 'dt.entity.service', 'dt.davis.problems', 'dt.system.events', 'security.events'][i % 10] + (i >= 10 ? `_${i}` : '') }))),
    'prob.summary': t(agg.summary),
    'prob.recurrent': t(agg.recurrent),
    'prob.list': t(agg.problems),
    'prob.timeline': t(agg.timeline),
    'prob.mttx': t(agg.mttx),
    'prob.exposure': t(agg.exposure),
    // 3.7.3: the cost basis — the problems with a named root cause, a quarter of the fixture's problems.
    'prob.mttx.rca': t(agg.mttx.map((row) => ({ ...row, problems: Math.ceil(row.problems / 4), totalNs: Math.round(row.totalNs / 4) }))),
    'prob.exposure.rca': t(agg.exposure.map((row) => ({ ...row, activeProblems: Math.ceil(row.activeProblems / 4), totalOpenNs: Math.round(row.totalOpenNs / 4) }))),
    'prob.topentities': t(agg.entities),
    'rca.top': t(rca.top),
    'rca.kpi': t(rca.kpi),
    'rca.logs': t(rca.logs),
    'rca.trend': t(rca.trend),
    'rca.catmix': t(rca.catmix),
    'svc.golden': buildGolden(),
    'svc.ranking': t(ranking),
    'svc.breakdown': t(breakdown),
    'svc.topology': t(svcTopology),
    'infra.trend': buildInfraTrend(),
    'cloud.hosts': t(cloudAgg),
    'cloud.hosts.detail': t(cloudDetail),
    'cloud.services': t(cloudServices),
    'lic.hosts': t(licHosts),
    'lic.k8spods': t([{ pods: 6012 }]),
    'k8s.clusters': t(clusters),
    'k8s.restarts': t(restarts),
    'k8s.pressure': t(pressure),
    'k8s.inventory': t([['clusters', 3], ['nodes', 42], ['namespaces', 61], ['workloads', 138], ['pods', 4738]].map(([kind, value]) => ({ kind, value }))),
    'k8s.restarts.trend': buildHourly(909, { restarts: [51, 89], oomKills: [6, 17] }),
    'svc.topology.calls': t(buildCalls()),
    'log.ingest.trend': buildHourly(919, { bytes: [990_000_000, 1_030_000_000] }, 1),
    'auto.trend': buildHourly(929, { succeeded: [228, 236], failed: [35, 38] }),
    'auto.failing': t([
      { title: 'Ticket sync', executions: 3692, failed: 212, lastFailure: isoAgo(HOUR), failureRatePct: 5.74 },
      { title: 'Rotate synthetic credentials', executions: 7, failed: 7, lastFailure: isoAgo(3 * HOUR), failureRatePct: 100 },
      { title: 'Runbook: restart svc-search', executions: 3, failed: 3, lastFailure: isoAgo(5 * HOUR), failureRatePct: 100 },
    ]),
    'proc.technologies': t(techRows),
    'comp.agents': t(compAgents),
    'log.quality': t(logQuality),
    // 3.7.4: the OpenPipeline kit's preview (a 1:100 sample: shares and sampled counts, as read on the lab).
    // 3.7.6: the OpenPipeline kit's check (records through the pipeline) and what the licence was billed for the app's queries.
    'log.pipeline.check': t([{ sampled: 1964, error: 1, warn: 11, info: 773, stillNone: 226, last: '2026-09-15T11:58:00.000Z' }]),
    'log.sources.nolevel': t([
      { 'dt.openpipeline.source': '/api/v2/logs/ingest', sampled: 14608, looksError: 0 },
      { 'dt.openpipeline.source': 'oneagent', 'log.source': 'Container Output', sampled: 207, looksError: 7 },
      { 'dt.openpipeline.source': 'oneagent', 'k8s.workload.name': 'checkout-loadgen', 'log.source': 'Container Output', sampled: 9, looksError: 4 },
    ]),
    // 3.7.7: AI Observability — the GenAI metrics of three instrumented apps (shaped as read on the lab, made-up names).
    'ai.tokens': t([
      { 'service.name': 'support-assistant', 'gen_ai.request.model': 'gpt-4o', 'gen_ai.token.type': 'input', total: 18_420_500 },
      { 'service.name': 'support-assistant', 'gen_ai.request.model': 'gpt-4o', 'gen_ai.token.type': 'output', total: 1_284_300 },
      { 'service.name': 'checkout-recommender', 'gen_ai.request.model': 'claude-sonnet', 'gen_ai.token.type': 'input', total: 6_905_200 },
      { 'service.name': 'checkout-recommender', 'gen_ai.request.model': 'claude-sonnet', 'gen_ai.token.type': 'output', total: 512_800 },
      { 'service.name': 'search-embeddings', 'gen_ai.request.model': 'text-embedding-3-small', 'gen_ai.token.type': 'input', total: 2_310_000 },
      { 'service.name': 'search-embeddings', 'gen_ai.request.model': null, 'gen_ai.token.type': 'input', total: 140_200 },
    ]),
    'ai.tokens.trend': timeseries({
      points: 24,
      intervalMs: HOUR,
      series: [
        { dims: { 'gen_ai.token.type': 'input' }, values: { tokens: Array.from({ length: 24 }, (_, i) => 700_000 + ((i * 97_331) % 650_000)) } },
        { dims: { 'gen_ai.token.type': 'output' }, values: { tokens: Array.from({ length: 24 }, (_, i) => 50_000 + ((i * 7_919) % 40_000)) } },
      ],
    }),
    'ai.calls': t([
      { 'service.name': 'support-assistant', 'gen_ai.request.model': 'gpt-4o', 'error.type': null, calls: 4_812, avgSeconds: 2.41 },
      { 'service.name': 'checkout-recommender', 'gen_ai.request.model': 'claude-sonnet', 'error.type': null, calls: 1_930, avgSeconds: 1.12 },
      { 'service.name': 'support-assistant', 'gen_ai.request.model': 'gpt-4o', 'error.type': 'timeout', calls: 37, avgSeconds: 30.0 },
      { 'service.name': 'search-embeddings', 'gen_ai.request.model': 'text-embedding-3-small', 'error.type': null, calls: 12_400, avgSeconds: 0.08 },
    ]),
    'app.query.billing': t([
      { app: 'my.poc.value.studio.v31', 'event.type': 'Log Management & Analytics - Query', queries: 6, billedBytes: 10094804922 },
      { app: 'my.poc.value.studio.v31', 'event.type': 'Events - Query', queries: 162, billedBytes: 2630975277 },
    ]),
    'log.levels.preview': t([{ sampled: 14882, withoutLevel: 12903, toError: 13, toWarn: 2, toInfo: 39, withoutLevelPct: 86.7 }]),
    'log.errors.recent': t(logErrors),
    'log.errors.grouped': t(logErrorsGrouped),
    'prob.status.rows': t(statusRows),
    'log.ingest': t(logIngest),
    'log.buckets': t(logBuckets),
    'log.sfm': t(logSfm),
    'cons.capabilities': t(capabilities),
    'cons.advisor': t(advisor),
    'cons.advisor.total': t(advisorTotal),
    'lic.k8spodhours': t(k8sPodHours),
    'auto.workflows': t(workflows),
    'biz.events': t(biz),
    'infra.capacity': t(capacity),
    'infra.capacity.total': t(capTotal),
    'svc.totals': t(svcTotals),
    'sec.vulnerabilities': t(vulns),
    'sec.posture': t(posture),
    'infra.capacity.summary': t(capSummary),
    'adopt.platform.total': t([{ users: 16, dynatraceUsers: 13, apps: 49, browserActions: 82616, apiCalls: 9155, aiCalls: 2016, analyzerCalls: 573 }]),
    'adopt.platform.daily': t([{ avgDau: 4.36, activeDays: 25 }]),
    // 3.4.7: the shape measured on the lab tenant over 30 days (users and actions per day; hours of work).
    'adopt.platform.trend': t(buildAdoptTrend()),
    'adopt.platform.hours': t(buildAdoptHours()),
    'adopt.platform.apps': t([
      { app: 'dynatrace.notebooks', actions: 20069, users: 8 },
      { app: 'dynatrace.dashboards', actions: 12040, users: 10 },
      { app: 'dynatrace.extensions.manager', actions: 4374, users: 3 },
      { app: 'dynatrace.automations', actions: 3098, users: 7 },
      { app: 'dynatrace.infraops', actions: 2128, users: 8 },
      { app: 'my.poc.value.studio', actions: 1608, users: 1 },
      { app: 'dynatrace.genai.observability', actions: 1393, users: 4 },
      { app: 'dynatrace.synthetic', actions: 1378, users: 4 },
      { app: 'dynatrace.davis.problems', actions: 1250, users: 7 },
      { app: 'dynatrace.services', actions: 1048, users: 3 },
      { app: 'dynatrace.logs', actions: 954, users: 5 },
      { app: 'dynatrace.distributedtracing', actions: 899, users: 5 },
      { app: 'dynatrace.kubernetes', actions: 757, users: 5 },
      { app: 'dynatrace.davis.copilot', actions: 485, users: 6 },
    ]),
    'adopt.platform.breadth': t([{ segment: '1', users: 1 }, { segment: '2-3', users: 3 }, { segment: '4-6', users: 4 }, { segment: '7+', users: 8 }]),
    'adopt.ai.total': t([{ invocations: 777, succeeded: 765, failed: 11, blocked: 1, users: 7, skills: 4, feedback: 0, positive: 0, negative: 0 }]),
    'adopt.ai.skills': t([
      { skill: 'nl2dql', invocations: 318, succeeded: 307, users: 3 },
      { skill: 'operator', invocations: 314, succeeded: 313, users: 6 },
      { skill: 'chat', invocations: 144, succeeded: 144, users: 6 },
      { skill: 'document-search', invocations: 1, succeeded: 1, users: 1 },
    ]),
    'auto.workflows.total': t(wfTotals),
    'prob.recurrent.total': t(recurrentTotals),
    'prob.topentities.total': t(topEntitiesTotals),
    'k8s.restarts.total': t(restartTotals),
    'k8s.pressure.total': t(pressureTotals),
    'svc.ranking.total': t(rankingTotals),
    'svc.topology.total': t(topologyTotals),
    'svc.topology.mix': t(topologyMix),
    'biz.events.total': t(bizTotals),
    'rum.audience.total': t(audienceTotals),
    'rum.sessions': t(rumSessions),
    'rum.scorecard': t(rumScorecard),
    'rum.webvitals': t(rumWebvitals),
    'rum.funnel': t(rumFunnel),
    'rum.audience': t(rumAudience),
    // 3.2.5 (M5)
    'cov.inventory.day0': t(inventory.map((row) => ({ ...row, value: typeof row.value === 'number' ? Math.round(row.value * 0.72) : row.value }))),
    'prob.poc.daily': t(buildPocDaily()),
    'cons.daily': buildConsDaily(),
    // 3.2.6
    'poc.daily.signals': buildDailySignals(),
    'poc.daily.rum': buildDailyRum(),
    'rum.app.flow': t(buildAppFlow(ranking, rumScorecard)),
    'sec.context': t(
      vulns.map((vuln, i) => ({
        displayId: vuln.displayId,
        score: vuln.score,
        components: i % 9 === 8 ? [] : [`${(vuln.technology ?? 'lib').toLowerCase()}-core-${(i % 4) + 2}.${i % 10}.${i % 3}`],
        services: i % 7 === 6 ? [] : vuln.entityNames.slice(0, 3),
        workloads: i % 7 === 6 ? [`wl-${domainOf(i)}`] : [],
      })),
    ),
    'svc.owners': t(
      Array.from({ length: 28 }, (_, i) => ({
        name: `svc-${domainOf(i)}-${pad2((i % 4) + 1)}`,
        tags: [
          ...(i % 3 === 0 ? [`owner:team-${domainOf(i)}`] : []),
          `k8s.namespace.name:${domainOf(i)}`,
          'Env:production',
        ],
      })),
    ),
    // Not a catalog id: the dynamic incident-logs query in useIncidentErrorLogs.
    'incident.logs': t(incidentLogs),
    // 3.2.7
    'rum.frontend.ids': t(
      rumScorecard.map((app, a) => ({
        'frontend.name': app['frontend.name'],
        applicationId: `APPLICATION-${(0xa100 + a).toString(16).toUpperCase().padStart(16, '0')}`,
        frontendId: `FRONTEND-${(0xf100 + a).toString(16).toUpperCase().padStart(16, '0')}`,
        requests: app.requests,
      })),
    ),
    // Not a catalog id: the dynamic root-caller query in useRootCallers (and the real prints' B3).
    'rca.callers': t(rootCallers),
    // 3.6.1: the calls among the top incident's services — the four callers of payments-db, then two second hops.
    'rca.edges': t([
      ...rootCallers.map((caller) => ({ from: caller.id, to: entityId('SERVICE', 7) })),
      { from: entityId('SERVICE', 24), to: entityId('SERVICE', 20) },
      { from: entityId('SERVICE', 23), to: entityId('SERVICE', 22) },
    ]),
    // 3.2.7 (real prints): `k8s.cluster.ids` and the evidence queries (fixtures/prints.mjs).
    ...buildPrintFixtures({ rca, callers: rootCallers, ranking, totals: svcTotals[0], clusters }),
  };
}

/** `prob.poc.daily`: the last 30 UTC days, fewer problems and faster closing as the PoC goes on. */
function buildPocDaily() {
  const r = new Rand(941);
  const today = Math.floor(Date.now() / DAY) * DAY;
  return Array.from({ length: 31 }, (_, i) => {
    const day = today - (30 - i) * DAY;
    const progress = i / 30;
    const opened = Math.round(r.float(780, 860) * (1 - 0.55 * progress));
    const stillOpen = i >= 29 ? Math.round(opened * 0.18) : 0;
    const closed = opened - stillOpen;
    const mttrHours = 6.5 - 4.6 * progress + r.float(-0.3, 0.3);
    return {
      day: new Date(day).toISOString(),
      opened,
      closedCount: closed,
      closedNs: String(Math.round(closed * mttrHours * 3_600_000) * 1_000_000),
      rootCaused: i < 2 ? 0 : Math.round(r.float(4, 30)),
    };
  });
}

/** A daily series of 31 UTC days ending today (partial), aligned to midnight as Grail bins days. */
function dailySeries(values) {
  const today = Math.floor(Date.now() / DAY) * DAY;
  const result = timeseries({ points: 31, intervalMs: DAY, series: [{ values }] });
  for (const record of result.records) record.timeframe = { start: new Date(today - 30 * DAY).toISOString(), end: new Date(today + DAY).toISOString() };
  return result;
}

/** `poc.daily.signals`: no workflow for the first days of the PoC, then automation growing; log volume steady. */
function buildDailySignals() {
  const r = new Rand(961);
  // The seeded PoC starts 20 days ago (index 10): its first automation lands on its fourth day.
  const executions = Array.from({ length: 31 }, (_, i) => (i < 13 ? 0 : Math.round(120 + i * 38 + r.float(-20, 20))));
  const succeeded = executions.map((value, i) => (value === 0 ? 0 : Math.round(value * (0.78 + Math.min(0.2, i * 0.007)))));
  const logBytes = Array.from({ length: 31 }, (_, i) => Math.round((18e9 + i * 0.25e9) * r.float(0.96, 1.04)));
  executions[30] = Math.round(executions[30] * 0.4);
  succeeded[30] = Math.round(succeeded[30] * 0.4);
  logBytes[30] = Math.round(logBytes[30] * 0.4);
  return dailySeries({ executions, succeeded, logBytes });
}

/** `poc.daily.rum`: real-user actions, requests and errors per day, errors falling as fixes land. */
function buildDailyRum() {
  const r = new Rand(971);
  const actions = Array.from({ length: 31 }, () => Math.round(r.float(58_000, 66_000)));
  const requests = actions.map((value) => Math.round(value * 2.8));
  const errors = Array.from({ length: 31 }, (_, i) => Math.round(r.float(3_400, 3_900) * (1 - 0.45 * (i / 30))));
  for (const series of [actions, requests, errors]) series[30] = Math.round(series[30] * 0.4);
  return dailySeries({ actions, requests, errors });
}

/** `rum.app.flow`: each frontend → one entry service → the next services it calls. */
function buildAppFlow(ranking, scorecard) {
  const rows = [];
  scorecard.forEach((app, a) => {
    const frontendId = `APPLICATION-${(0xa100 + a).toString(16).toUpperCase().padStart(16, '0')}`;
    const entry = ranking[a * 7];
    if (entry === undefined) return;
    for (const hop of ranking.slice(a * 7 + 1, a * 7 + 7)) {
      rows.push({ frontend: app['frontend.name'], frontendId, entry: entry.serviceId, entryName: entry.name, hop: hop.serviceId, hopName: hop.name });
    }
  });
  return rows;
}

/** `cons.daily`: 30 complete days and today, per capability, in each one's own unit. */
function buildConsDaily() {
  const r = new Rand(951);
  const capabilities = [
    ['Full-Stack Monitoring', 7200, 7410],
    ['Infrastructure Monitoring', 85, 89],
    ['Kubernetes Platform Monitoring', 24_000, 62_000],
    ['Code Monitoring', 1180, 1460],
    ['Real User Monitoring', 7800, 12_600],
    ['HTTP Monitor', 9400, 9410],
    ['Log Management & Analytics - Ingest & Process', 23e9, 24.6e9],
    ['Log Management & Analytics - Retain', 72e12 * 24, 74e12 * 24],
    ['Metrics - Ingest & Process', 29e6, 31.5e6],
    ['Automation Workflow', 1750, 1800],
  ];
  return timeseries({
    points: 31,
    intervalMs: DAY,
    series: capabilities.map(([name, low, high]) => {
      const amount = Array.from({ length: 31 }, (_, i) => Math.round(low + (high - low) * (i / 30) + r.float(-0.02, 0.02) * low));
      amount[30] = Math.round(amount[30] * 0.06);
      return { dims: { 'event.type': name }, values: { amount, events: amount.map((value) => Math.max(1, Math.round(value / 1000))) } };
    }),
  });
}

function domainOf(i) {
  return ['checkout', 'cart', 'catalog', 'payments', 'inventory', 'search', 'auth'][i % 7];
}

// ---------------------------------------------------------------- 3.4.7: platform adoption over time
// Days ago → [users, actions], the pattern read on the lab tenant (25 active days in 30; weekends quiet).
const ADOPT_DAYS = [
  [30, 4, 5767], [29, 7, 8824], [28, 5, 3448], [27, 3, 3012], [26, 7, 10717], [25, 1, 6091], [24, 1, 437],
  [23, 8, 2385], [22, 5, 1579], [21, 5, 2706], [20, 2, 205], [19, 6, 1528], [15, 6, 3566], [14, 8, 6424],
  [13, 6, 983], [12, 4, 341], [11, 1, 346], [9, 3, 3036], [8, 4, 1148], [7, 3, 311], [6, 6, 3994],
  [5, 6, 7467], [2, 2, 1564], [1, 4, 2970], [0, 3, 1438],
];
const dayStart = (daysAgo) => {
  const at = new Date(nowMs() - daysAgo * DAY);
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
};
function buildAdoptTrend() {
  return ADOPT_DAYS.map(([ago, users, actions]) => ({ day: new Date(dayStart(ago)).toISOString(), users, actions }));
}
// Actions of each day spread over the working hours (UTC 12–22, i.e. 09–19 in São Paulo), busiest mid-afternoon.
const HOUR_WEIGHTS = [[12, 0.06], [13, 0.1], [14, 0.12], [15, 0.1], [16, 0.12], [17, 0.14], [18, 0.13], [19, 0.1], [20, 0.07], [21, 0.04], [22, 0.02]];
function buildAdoptHours() {
  const rows = [];
  for (const [ago, , actions] of ADOPT_DAYS) {
    for (const [hour, weight] of HOUR_WEIGHTS) {
      const count = Math.round(actions * weight);
      if (count > 0) rows.push({ hour: new Date(dayStart(ago) + hour * HOUR).toISOString(), actions: count });
    }
  }
  return rows;
}
