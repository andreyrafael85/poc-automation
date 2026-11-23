import { getQuery, type CatalogId } from '../queries/catalog';
import type { StringKey } from '../i18n/strings';
import {
  countRecords,
  distinctOf,
  distinctTechnologyFamilies,
  firstOf,
  inventoryCount,
  maxOf,
  percentWhere,
  sumOf,
  sumWhere,
  topName,
  type MetricUnit,
  type Reducer,
} from './pillarMetrics';

/**
 * The four value pillars a proof of concept is usually scoped against.
 *
 * Selecting pillars in Settings does three things:
 *
 *   1. It frames the engagement — the report and the executive views state which
 *      pillars were agreed, so the audience judges the findings against what was
 *      actually promised rather than against everything Dynatrace can do.
 *   2. It measures. Every validation point names the live figures that evidence
 *      it, read from this tenant over the selected window. A pillar is not a
 *      checklist item; it is a claim with numbers attached.
 *   3. It exposes honesty. Where no query can evidence a point, the app says so
 *      instead of implying the pillar was fully proven.
 *
 * ## Why the metrics live here
 *
 * A point and the figures that prove it belong in the same declaration. Keeping
 * them apart is how a pillar ends up claiming something the data never showed:
 * the wording drifts, the query is replaced, and nobody notices because nothing
 * connects the two. Here, deleting a query id is a compile error.
 *
 * The reducers are pure functions from `pillarMetrics`, so the whole evidence
 * model is testable without a tenant.
 */

export type PillarId = 'resilience' | 'productivity' | 'cost' | 'agility';

export type EvidenceStatus =
  /** Backing queries returned real data over the selected window. */
  | 'evidenced'
  /** Blocked, empty, or only partly covering the point. */
  | 'partial'
  /** This app has no data source for the point. Requires a different assessment. */
  | 'not-evidenced'
  /** Queries are still running. Never rendered as a conclusion. */
  | 'measuring';

/** One live figure that supports a validation point. */
export interface PointMetric {
  id: string;
  labelKey: StringKey;
  queryId: CatalogId;
  reduce: Reducer;
  unit: MetricUnit;
  /**
   * Whether the figure is what the query returned or something this app worked
   * out from it. Percentages and weighted means are calculations and are badged
   * as such, exactly like every other derived number in the app.
   */
  kind?: 'observed' | 'derived';
  /** States the calculation. Required on a derived metric. */
  derivationKey?: StringKey;
  /**
   * Read from billing or licence data: shown only while "Commercial data" is on, so it never
   * reaches a customer screen or a customer export (owner decision 6.2; 3.2.1).
   */
  commercial?: boolean;
}

export interface ValidationPoint {
  id: string;
  labelKey: StringKey;
  /** Live figures that evidence this point. Empty means the app cannot measure it. */
  metrics: PointMetric[];
  /**
   * Set when the point cannot be fully evidenced even with working queries, and
   * says exactly why. Forces the honest answer into the data model.
   */
  caveatKey?: StringKey;
}

export interface PocPillar {
  id: PillarId;
  titleKey: StringKey;
  /** The ROI opportunity as the customer would phrase it. */
  roiKey: StringKey;
  points: ValidationPoint[];
}

export const POC_PILLARS: readonly PocPillar[] = [
  {
    id: 'resilience',
    titleKey: 'pillar.resilience.title',
    roiKey: 'pillar.resilience.roi',
    points: [
      {
        id: 'problems',
        labelKey: 'pillar.resilience.p1',
        metrics: [
          {
            id: 'detected',
            labelKey: 'pillar.m.problemsDetected',
            queryId: 'prob.summary',
            reduce: sumOf('problems'),
            unit: 'count',
          },
          {
            id: 'categories',
            labelKey: 'pillar.m.problemCategories',
            queryId: 'prob.summary',
            reduce: distinctOf('event.category'),
            unit: 'count',
          },
          {
            id: 'open',
            labelKey: 'pillar.m.problemsOpen',
            queryId: 'prob.exposure',
            reduce: firstOf('activeProblems'),
            unit: 'count',
          },
        ],
      },
      {
        id: 'root-cause',
        labelKey: 'pillar.resilience.p2',
        metrics: [
          {
            id: 'entities',
            labelKey: 'pillar.m.entitiesAttached',
            queryId: 'prob.topentities.total',
            reduce: firstOf('entities'),
            unit: 'count',
          },
          {
            id: 'top-entity',
            labelKey: 'pillar.m.mostAffected',
            queryId: 'prob.topentities',
            reduce: topName('affected'),
            unit: 'text',
          },
        ],
        // Davis attaches affected and related entities; this app never infers a
        // cause the platform did not indicate.
        caveatKey: 'pillar.resilience.p2.caveat',
      },
      {
        id: 'impact',
        labelKey: 'pillar.resilience.p3',
        metrics: [
          {
            id: 'concentration',
            labelKey: 'pillar.m.problemsOnTopEntity',
            queryId: 'prob.topentities',
            reduce: maxOf('problems'),
            unit: 'count',
          },
          {
            id: 'services',
            labelKey: 'pillar.m.servicesMeasured',
            queryId: 'svc.ranking.total',
            reduce: firstOf('services'),
            unit: 'count',
          },
        ],
        // Service impact is measurable; user impact needs RUM, which is not usable.
        caveatKey: 'pillar.resilience.p3.caveat',
      },
      {
        id: 'alert-noise',
        labelKey: 'pillar.resilience.p4',
        metrics: [
          {
            id: 'patterns',
            labelKey: 'pillar.m.recurringPatterns',
            queryId: 'prob.recurrent.total',
            reduce: firstOf('patterns'),
            unit: 'count',
          },
          {
            id: 'worst',
            labelKey: 'pillar.m.topRecurrence',
            queryId: 'prob.recurrent.total',
            reduce: firstOf('worst'),
            unit: 'count',
          },
        ],
        caveatKey: 'pillar.resilience.p4.caveat',
      },
      {
        id: 'availability',
        labelKey: 'pillar.resilience.p5',
        metrics: [
          {
            id: 'mttr',
            labelKey: 'pillar.m.mttr',
            queryId: 'prob.mttx',
            reduce: (records) => {
              // Weighted mean across categories, so a rare category with a long
              // MTTR cannot dominate a simple average of averages.
              let weightedNs = 0;
              let problems = 0;
              for (const record of records) {
                const count = Number(record['problems'] ?? 0);
                const mttr = Number(record['mttrNs'] ?? 0);
                if (Number.isFinite(count) && Number.isFinite(mttr) && count > 0) {
                  weightedNs += mttr * count;
                  problems += count;
                }
              }
              return problems === 0 ? null : weightedNs / problems;
            },
            unit: 'duration-ns',
            kind: 'derived',
            derivationKey: 'pillar.m.mttr.calc',
          },
          {
            id: 'resolved',
            labelKey: 'pillar.m.problemsResolved',
            queryId: 'prob.mttx',
            reduce: sumOf('problems'),
            unit: 'count',
          },
        ],
      },
    ],
  },
  {
    id: 'productivity',
    titleKey: 'pillar.productivity.title',
    roiKey: 'pillar.productivity.roi',
    points: [
      {
        id: 'technologies',
        labelKey: 'pillar.productivity.p1',
        metrics: [
          {
            id: 'technologies',
            labelKey: 'pillar.m.technologies',
            queryId: 'proc.technologies',
            reduce: distinctTechnologyFamilies,
            unit: 'count',
          },
          {
            id: 'instances',
            labelKey: 'pillar.m.processInstances',
            queryId: 'cov.inventory',
            reduce: inventoryCount('Process instances'),
            unit: 'count',
          },
          {
            id: 'serviceTypes',
            labelKey: 'pillar.m.serviceTypes',
            queryId: 'svc.breakdown',
            reduce: distinctOf('serviceType'),
            unit: 'count',
          },
        ],
      },
      {
        id: 'auto-discovery',
        labelKey: 'pillar.productivity.p2',
        metrics: [
          {
            id: 'hosts',
            labelKey: 'pillar.m.hosts',
            queryId: 'cov.inventory',
            reduce: inventoryCount('Hosts'),
            unit: 'count',
          },
          {
            id: 'services',
            labelKey: 'pillar.m.services',
            queryId: 'cov.inventory',
            reduce: inventoryCount('Services'),
            unit: 'count',
          },
          {
            id: 'processes',
            labelKey: 'pillar.m.processes',
            queryId: 'cov.inventory',
            reduce: inventoryCount('Process instances'),
            unit: 'count',
          },
        ],
      },
      {
        // Replaced "production vs pre-production", which this app has no way to
        // tell apart. An unmeasurable point on a value pillar is worse than no
        // point at all: it invites the audience to discount the ones that are
        // measured. Service topology is both measurable and the stronger claim.
        id: 'dependencies',
        labelKey: 'pillar.productivity.p3',
        metrics: [
          {
            id: 'mapped',
            labelKey: 'pillar.m.servicesMapped',
            queryId: 'svc.topology.total',
            reduce: firstOf('services'),
            unit: 'count',
          },
          {
            id: 'datastores',
            labelKey: 'pillar.m.dataStores',
            queryId: 'svc.topology.total',
            reduce: firstOf('vendors'),
            unit: 'count',
          },
        ],
      },
    ],
  },
  {
    id: 'cost',
    titleKey: 'pillar.cost.title',
    roiKey: 'pillar.cost.roi',
    points: [
      {
        id: 'automated-install',
        labelKey: 'pillar.cost.p1',
        metrics: [
          {
            id: 'hosts',
            labelKey: 'pillar.m.hostsInstrumented',
            queryId: 'cov.hosts.breakdown',
            reduce: sumOf('hosts'),
            unit: 'count',
          },
          {
            id: 'platforms',
            labelKey: 'pillar.m.osFamilies',
            queryId: 'cov.hosts.breakdown',
            reduce: distinctOf('osType'),
            unit: 'count',
          },
        ],
        caveatKey: 'pillar.cost.p1.caveat',
      },
      {
        id: 'full-stack',
        labelKey: 'pillar.cost.p2',
        metrics: [
          {
            id: 'fullstack-share',
            labelKey: 'pillar.m.fullStackShare',
            queryId: 'cov.hosts.breakdown',
            reduce: percentWhere('monitoringMode', ['FULL_STACK'], 'hosts'),
            unit: 'percent',
            kind: 'derived',
            derivationKey: 'pillar.m.fullStackShare.calc',
          },
          {
            id: 'fullstack-hosts',
            labelKey: 'pillar.m.fullStackHosts',
            queryId: 'cov.hosts.breakdown',
            reduce: sumWhere('monitoringMode', ['FULL_STACK'], 'hosts'),
            unit: 'count',
          },
        ],
      },
      {
        id: 'integrations',
        labelKey: 'pillar.cost.p3',
        metrics: [
          {
            id: 'workflows',
            labelKey: 'pillar.m.workflows',
            queryId: 'auto.workflows.total',
            reduce: firstOf('workflows'),
            unit: 'count',
          },
          {
            id: 'executions',
            labelKey: 'pillar.m.workflowRuns',
            queryId: 'auto.workflows.total',
            reduce: firstOf('executions'),
            unit: 'count',
          },
          {
            id: 'capabilities',
            labelKey: 'pillar.m.capabilities',
            queryId: 'cons.capabilities',
            reduce: countRecords,
            unit: 'count',
            commercial: true,
          },
        ],
      },
      {
        // Replaced "automatic agent upgrade". That is native OneAgent behaviour
        // once it is installed and configured, so listing it as unevidenced
        // understated the platform rather than being honest about it. Full
        // request capture is a genuine differentiator and is measurable here.
        id: 'no-sampling',
        labelKey: 'pillar.cost.p4',
        metrics: [
          {
            id: 'requests',
            labelKey: 'pillar.m.requestsCaptured',
            queryId: 'svc.totals',
            reduce: firstOf('totalRequests'),
            unit: 'count',
          },
          {
            id: 'failures',
            labelKey: 'pillar.m.failuresCaptured',
            queryId: 'svc.totals',
            reduce: firstOf('totalFailures'),
            unit: 'count',
          },
        ],
      },
    ],
  },
  {
    id: 'agility',
    titleKey: 'pillar.agility.title',
    roiKey: 'pillar.agility.roi',
    points: [
      {
        // Was "user experience and backend performance", which could never be
        // fully evidenced because it bundled RUM into a point that is otherwise
        // measurable. Split: this half is measured, the RUM half has its own
        // point below and states its own gap.
        id: 'service-latency',
        labelKey: 'pillar.agility.p1',
        metrics: [
          {
            id: 'requests',
            labelKey: 'pillar.m.requestsCaptured',
            queryId: 'svc.totals',
            reduce: firstOf('totalRequests'),
            unit: 'count',
          },
          {
            id: 'responseTime',
            labelKey: 'pillar.m.avgResponse',
            queryId: 'svc.ranking.total',
            // Request-weighted over every service with traffic (computed in the query), so a
            // low-traffic slow service does not set the headline latency for the estate and the
            // 50 busiest are not mistaken for all of them.
            reduce: firstOf('weightedResponseUs'),
            unit: 'microseconds',
            kind: 'derived',
            derivationKey: 'pillar.m.avgResponse.calc',
          },
        ],
      },
      {
        id: 'sessions',
        labelKey: 'pillar.agility.p2',
        metrics: [
          {
            id: 'sessions',
            labelKey: 'pillar.m.sessions',
            queryId: 'rum.sessions',
            reduce: sumOf('sessions'),
            unit: 'count',
          },
          {
            id: 'types',
            labelKey: 'pillar.m.sessionTypes',
            queryId: 'rum.sessions',
            reduce: distinctOf('userType'),
            unit: 'count',
          },
        ],
      },
      {
        id: 'conversion',
        labelKey: 'pillar.agility.p3',
        metrics: [
          {
            id: 'eventTypes',
            labelKey: 'pillar.m.businessEventTypes',
            queryId: 'biz.events.total',
            reduce: firstOf('types'),
            unit: 'count',
          },
          {
            id: 'events',
            labelKey: 'pillar.m.businessEvents',
            queryId: 'biz.events.total',
            reduce: firstOf('events'),
            unit: 'count',
          },
        ],
        caveatKey: 'pillar.agility.p3.caveat',
      },
    ],
  },
];

/** Every catalog query any pillar depends on, deduplicated. */
export const PILLAR_QUERY_IDS: readonly CatalogId[] = [
  ...new Set(
    POC_PILLARS.flatMap((pillar) =>
      pillar.points.flatMap((point) => point.metrics.map((metric) => metric.queryId)),
    ),
  ),
];

/** The queries a given set of selected pillars needs. Nothing else is run. */
export function queriesForPillars(selected: readonly PillarId[]): Set<CatalogId> {
  const ids = new Set<CatalogId>();
  for (const pillar of POC_PILLARS) {
    if (!selected.includes(pillar.id)) continue;
    for (const point of pillar.points) {
      for (const metric of point.metrics) ids.add(metric.queryId);
    }
  }
  return ids;
}

/**
 * Evidence status before any query has run, derived from the recorded validation
 * of each backing query.
 *
 * This is the fallback the printable report uses, and the value shown while live
 * queries are still in flight. It answers "could this point be evidenced in the
 * environment where the catalog was validated", not "was it evidenced here".
 */
export function statusFor(point: ValidationPoint): EvidenceStatus {
  if (point.metrics.length === 0) return 'not-evidenced';

  const outcomes = point.metrics.map((metric) => getQuery(metric.queryId).validation.outcome);
  const working = outcomes.filter((outcome) => outcome === 'ok').length;

  if (working === 0) return 'not-evidenced';
  if (working < outcomes.length || point.caveatKey !== undefined) return 'partial';
  return 'evidenced';
}

export interface PillarCoverage {
  pillar: PocPillar;
  evidenced: number;
  partial: number;
  notEvidenced: number;
  total: number;
}

export function coverageFor(
  pillar: PocPillar,
  statusOf: (point: ValidationPoint) => EvidenceStatus = statusFor,
): PillarCoverage {
  const statuses = pillar.points.map(statusOf);
  return {
    pillar,
    evidenced: statuses.filter((status) => status === 'evidenced').length,
    partial: statuses.filter((status) => status === 'partial').length,
    notEvidenced: statuses.filter((status) => status === 'not-evidenced').length,
    total: statuses.length,
  };
}

export function pillarById(id: PillarId): PocPillar | undefined {
  return POC_PILLARS.find((pillar) => pillar.id === id);
}
