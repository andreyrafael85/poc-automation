import { useMemo } from 'react';

import { useQueryScope } from '../../config/StudioContext';
import { useCatalogQuery, type CatalogQueryResult } from '../../hooks/useCatalogQuery';
import { useInsightSignals } from '../../hooks/useInsightSignals';
import { useTranslation } from '../../i18n/useTranslation';
import { summariseCloud } from '../../models/cloud';
import { summariseCompetitors } from '../../models/competitor';
import { rateInp, rateLcp } from '../../models/rum';
import { serviceOwnership } from '../../models/securityQueue';
import { bool, num, str, type GrailRecord } from '../../utils/records';
import { computeIndex, presenceDomain, ratioDomain, type CoverageIndex, type DomainReading, type ReadOutcome } from './coverageIndex';
import { platformAdoption, type AdoptionRow } from './adoption';
import { maturity as readMaturity, type MaturityReading } from './maturity';
import { srePractices, type Practice } from './sre';
import { deriveAssessmentFindings, type AssessmentFinding, type AssessmentSignals } from './findings';

/**
 * Everything the Assessment page shows, read once (3.4.0). Only existing catalog entries — no new
 * query, no new scope — and the `useDql` request cache shares each read with the domain pages.
 *
 * Every count the index divides comes from an aggregate (`summarize` without a limit) or a bounded
 * list whose cardinality the platform caps (`BOUNDED_LIST_CEILING`); a truncated read leaves its
 * domain instead of being summed (rule 7).
 */

export interface AssessmentReads {
  inventory: CatalogQueryResult;
  hosts: CatalogQueryResult;
  servicesTotal: CatalogQueryResult;
  servicesRanking: CatalogQueryResult;
  logs: CatalogQueryResult;
  k8sInventory: CatalogQueryResult;
  k8sClusters: CatalogQueryResult;
  rum: CatalogQueryResult;
  biz: CatalogQueryResult;
  capacity: CatalogQueryResult;
  mttx: CatalogQueryResult;
  technologies: CatalogQueryResult;
  // 3.4.1 — the rest of what the app already reads, for a detailed reading of an existing environment.
  cloud: CatalogQueryResult;
  security: CatalogQueryResult;
  owners: CatalogQueryResult;
  tools: CatalogQueryResult;
  vitals: CatalogQueryResult;
  workflows: CatalogQueryResult;
  hubs: CatalogQueryResult;
}

export interface Assessment {
  reads: AssessmentReads;
  index: CoverageIndex;
  signals: AssessmentSignals;
  findings: AssessmentFinding[];
  /** How each Dynatrace capability is used here (3.4.1). */
  adoption: AdoptionRow[];
  /** 3.4.3: the maturity journey and the SRE / platform-engineering practices. */
  maturity: MaturityReading;
  practices: Practice[];
  /** Reads that answered, of all the reads the page makes (the "x of y sources read" badge). */
  sourcesRead: number;
  sourcesTotal: number;
  isLoading: boolean;
}

const first = (result: CatalogQueryResult): GrailRecord => result.records[0] ?? {};
const answered = (result: CatalogQueryResult) => result.outcome === 'ok' || result.outcome === 'empty';
/** A count from an answered aggregate; null when the read did not answer. */
const countOf = (result: CatalogQueryResult, field: string): number | null => (result.outcome === 'ok' ? num(first(result), field) : null);
const outcome = (result: CatalogQueryResult): ReadOutcome => (result.quality.truncated ? 'scan-limit' : result.outcome);

const byName = (result: CatalogQueryResult, key: string, name: string, valueField = 'value'): number | null => {
  if (result.outcome !== 'ok') return null;
  const record = result.records.find((entry) => str(entry, key) === name);
  return record === undefined ? 0 : num(record, valueField);
};

export function hostModes(result: CatalogQueryResult): AssessmentSignals['hostModes'] {
  if (result.outcome !== 'ok') return null;
  const modes = { fullStack: 0, infra: 0, other: 0, unknown: 0 };
  for (const record of result.records) {
    const hosts = num(record, 'hosts') ?? 0;
    const mode = str(record, 'monitoringMode');
    if (mode === 'FULL_STACK') modes.fullStack += hosts;
    else if (mode === 'INFRASTRUCTURE') modes.infra += hosts;
    else if (mode === null) modes.unknown += hosts;
    else modes.other += hosts;
  }
  return modes;
}

export function useAssessment(): Assessment {
  const scope = useQueryScope();
  const text = useTranslation();
  const reads: AssessmentReads = {
    inventory: useCatalogQuery('cov.inventory', scope),
    hosts: useCatalogQuery('cov.hosts.breakdown', scope),
    servicesTotal: useCatalogQuery('svc.topology.total', scope),
    servicesRanking: useCatalogQuery('svc.ranking.total', scope),
    logs: useCatalogQuery('log.quality', scope),
    k8sInventory: useCatalogQuery('k8s.inventory', scope),
    k8sClusters: useCatalogQuery('k8s.cluster.ids', scope),
    rum: useCatalogQuery('rum.scorecard', scope),
    biz: useCatalogQuery('biz.events.total', scope),
    capacity: useCatalogQuery('infra.capacity.summary', scope),
    mttx: useCatalogQuery('prob.mttx', scope),
    technologies: useCatalogQuery('proc.technologies', scope),
    cloud: useCatalogQuery('cloud.hosts', scope),
    security: useCatalogQuery('sec.posture', scope),
    owners: useCatalogQuery('svc.owners', scope),
    tools: useCatalogQuery('comp.agents', scope),
    vitals: useCatalogQuery('rum.webvitals', scope),
    workflows: useCatalogQuery('auto.workflows.total', scope),
    // The hubs and the model's totals: an entity-model read (0 B) that takes the caller's window.
    hubs: useCatalogQuery('ev.topology.hubs', {
      ...scope,
      window: { startIso: scope.globalWindow.startIso, endIso: scope.globalWindow.endIso },
    }),
  };
  const insight = useInsightSignals();

  const modes = hostModes(reads.hosts);
  const reported = modes === null ? null : modes.fullStack + modes.infra + modes.other;

  const logTotals = reads.logs.records.reduce<{ total: number; withService: number }>(
    (totals, record) => ({ total: totals.total + (num(record, 'total') ?? 0), withService: totals.withService + (num(record, 'withService') ?? 0) }),
    { total: 0, withService: 0 },
  );

  const clusters = byName(reads.k8sInventory, 'kind', 'clusters');
  // The bounded list of clusters that report container metrics: its length is exact unless truncated.
  const clustersWithMetrics = answered(reads.k8sClusters) ? reads.k8sClusters.records.length : null;
  const webApps = byName(reads.inventory, 'category', 'Web applications');
  const frontendsWithRealUsers = answered(reads.rum)
    ? reads.rum.records.filter((record) => (num(record, 'requests') ?? 0) > 0 || (num(record, 'actions') ?? 0) > 0).length
    : null;

  const resolved = (() => {
    if (reads.mttx.outcome !== 'ok') return null;
    let problems = 0;
    let weighted = 0;
    for (const record of reads.mttx.records) {
      const count = num(record, 'problems') ?? 0;
      const meanNs = num(record, 'mttrNs');
      if (meanNs === null) continue;
      problems += count;
      weighted += meanNs * count;
    }
    return problems === 0 ? null : { problems, meanHours: weighted / problems / 3_600_000_000_000 };
  })();

  const signals: AssessmentSignals = {
    hostModes: modes,
    servicesInModel: countOf(reads.servicesTotal, 'services'),
    servicesWithTraffic: countOf(reads.servicesRanking, 'services'),
    servicesAboveOnePct: countOf(reads.servicesRanking, 'aboveOnePct'),
    clusters,
    clustersWithMetrics,
    webApps,
    frontendsWithRealUsers,
    syntheticMonitors: byName(reads.inventory, 'category', 'Synthetic monitors'),
    publicDomainServices: countOf(reads.servicesTotal, 'publicDomain'),
    bizEvents: answered(reads.biz) ? (num(first(reads.biz), 'events') ?? 0) : null,
    saturatedHosts: countOf(reads.capacity, 'saturated'),
    resolved,
    logRecords: answered(reads.logs) ? logTotals.total : null,
    logRecordsWithContext: answered(reads.logs) ? logTotals.withService : null,
    topology: (() => {
      if (reads.hubs.outcome !== 'ok') return null;
      const total = reads.hubs.records.find((record) => bool(record, 'isTotal') === true);
      if (total === undefined) return null;
      return {
        hubs: reads.hubs.records
          .filter((record) => bool(record, 'isTotal') !== true)
          .map((record) => ({ name: str(record, 'entity.name') ?? '—', callers: num(record, 'callers') ?? 0, callees: num(record, 'callees') ?? 0 }))
          .sort((a, b) => b.callers - a.callers),
        services: num(total, 'services') ?? 0,
        isolated: num(total, 'isolated') ?? 0,
        dbServices: num(total, 'dbServices') ?? 0,
      };
    })(),
    vulnerabilities: (() => {
      if (!answered(reads.security) || reads.security.quality.truncated) return null;
      let total = 0;
      let actNow = 0;
      let critical = 0;
      for (const record of reads.security.records) {
        const count = num(record, 'vulnerabilities') ?? 0;
        total += count;
        actNow += num(record, 'actNow') ?? 0;
        if (str(record, 'level') === 'CRITICAL') critical += count;
      }
      return { total, actNow, critical };
    })(),
    // Services whose tags name an owner or a team (the same keys the security fix queue reads).
    ownedServices: answered(reads.owners) && !reads.owners.quality.truncated
      ? [...serviceOwnership(reads.owners.records).values()].filter((entry) => entry.owners.length > 0).length
      : null,
    thirdPartyTools: answered(reads.tools) ? summariseCompetitors(reads.tools.records).vendors.map((entry) => entry.vendor) : null,
    vitals: answered(reads.vitals)
      ? {
          measured: reads.vitals.records.length,
          poor: reads.vitals.records.filter((record) => rateLcp(num(record, 'lcp')) === 'poor' || rateInp(num(record, 'inp')) === 'poor').length,
        }
      : null,
    workflows:
      reads.workflows.outcome === 'ok'
        ? {
            workflows: num(first(reads.workflows), 'workflows') ?? 0,
            executions: num(first(reads.workflows), 'executions') ?? 0,
            succeeded: num(first(reads.workflows), 'succeeded') ?? 0,
          }
        : reads.workflows.outcome === 'empty'
          ? { workflows: 0, executions: 0, succeeded: 0 }
          : null,
    cloudProviders: answered(reads.cloud) ? summariseCloud(reads.cloud.records).providers.map((entry) => ({ provider: entry.provider, hosts: entry.hosts })) : null,
  };

  const readings: DomainReading[] = [
    {
      id: 'infra',
      queryIds: ['cov.hosts.breakdown'],
      state: ratioDomain(modes === null ? null : modes.fullStack + modes.infra, reported, [outcome(reads.hosts)]),
    },
    {
      id: 'apm',
      queryIds: ['svc.ranking.total', 'svc.topology.total'],
      state: ratioDomain(signals.servicesWithTraffic, signals.servicesInModel, [outcome(reads.servicesRanking), outcome(reads.servicesTotal)]),
    },
    {
      id: 'logs',
      queryIds: ['log.quality'],
      state: ratioDomain(answered(reads.logs) ? logTotals.withService : null, answered(reads.logs) ? logTotals.total : null, [outcome(reads.logs)]),
    },
    {
      id: 'k8s',
      queryIds: ['k8s.cluster.ids', 'k8s.inventory'],
      state: ratioDomain(clustersWithMetrics, clusters, [outcome(reads.k8sClusters), outcome(reads.k8sInventory)]),
    },
    {
      id: 'experience',
      queryIds: ['rum.scorecard', 'cov.inventory'],
      state: ratioDomain(frontendsWithRealUsers, webApps, [outcome(reads.rum), outcome(reads.inventory)]),
    },
    { id: 'business', queryIds: ['biz.events.total'], state: presenceDomain(signals.bizEvents, [outcome(reads.biz)]) },
  ];

  const index = computeIndex(readings);
  const findings = useMemo(
    () => deriveAssessmentFindings(insight.signals, signals, text),
    // The findings depend only on the values the signals carry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(insight.signals), JSON.stringify(signals), text.locale],
  );

  const adoption = useMemo(
    () => platformAdoption(signals, text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(signals), text.locale],
  );
  const maturityReading = useMemo(
    () => readMaturity(signals, index.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(signals), index.value],
  );
  const practices = useMemo(
    () => srePractices(signals, index, text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(signals), index.value, text.locale],
  );
  const all = Object.values(reads) as CatalogQueryResult[];
  return {
    reads,
    index,
    signals,
    findings,
    adoption,
    maturity: maturityReading,
    practices,
    sourcesRead: all.filter(answered).length,
    sourcesTotal: all.length,
    isLoading: all.some((result) => result.isLoading) || insight.isLoading,
  };
}
