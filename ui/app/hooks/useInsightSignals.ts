import { useQueryScope, useStudio } from '../config/StudioContext';
import { useTranslation } from '../i18n/useTranslation';
import { useCatalogQuery } from './useCatalogQuery';
import type { InsightSignals } from '../features/insights/deriveInsights';
import { bool, num, ratio, str } from '../utils/records';

/**
 * Collects the live signals that the insight and roadmap pages reason over.
 *
 * These are synthesis pages the user navigates to deliberately, so running the
 * full signal set here is appropriate. Results are shared with the domain pages
 * through the query cache, keyed on query text plus window, so revisiting a page
 * does not re-scan.
 */

export interface InsightSignalsState {
  signals: InsightSignals;
  isLoading: boolean;
  /** Query ids that failed, so the pages can say what the synthesis is missing. */
  unavailable: string[];
}

export function useInsightSignals(enabled = true): InsightSignalsState {
  const scope = useQueryScope();
  const { timeframeLabel } = useStudio();
  const { tWindow } = useTranslation();
  const options = { ...scope, enabled };

  const recurring = useCatalogQuery('prob.recurrent', options);
  const restarts = useCatalogQuery('k8s.restarts', options);
  const pressure = useCatalogQuery('k8s.pressure', options);
  const services = useCatalogQuery('svc.ranking', options);
  const logs = useCatalogQuery('log.quality', options);
  const buckets = useCatalogQuery('cov.buckets', options);
  const workflows = useCatalogQuery('auto.workflows', options);
  // Exact totals for the counts the insights state; the ranked lists above only supply names.
  const workflowTotals = useCatalogQuery('auto.workflows.total', options);
  const pressureTotals = useCatalogQuery('k8s.pressure.total', options);
  const queryCost = useCatalogQuery('cons.advisor', options);
  const security = useCatalogQuery('sec.posture', options);
  const sessions = useCatalogQuery('rum.sessions', options);

  const all = [
    recurring,
    restarts,
    pressure,
    services,
    logs,
    buckets,
    workflows,
    workflowTotals,
    pressureTotals,
    queryCost,
    security,
    sessions,
  ];

  const logTotals = logs.records.reduce<{ total: number; withService: number; unclassified: number }>(
    (totals, record) => ({
      total: totals.total + (num(record, 'total') ?? 0),
      withService: totals.withService + (num(record, 'withService') ?? 0),
      unclassified:
        totals.unclassified + (str(record, 'status') === 'NONE' ? (num(record, 'total') ?? 0) : 0),
    }),
    { total: 0, withService: 0, unclassified: 0 },
  );

  const serviceContext = ratio(logTotals.withService, logTotals.total);
  const unclassified = ratio(logTotals.unclassified, logTotals.total);

  const sessionBuckets = buckets.records.filter((record) => str(record, 'table') === 'user.sessions');
  const sessionsReadable = sessionBuckets.some((record) => bool(record, 'hasAccess') === true);
  const sessionRecords = sessionBuckets.reduce(
    (total, record) => total + (num(record, 'records') ?? 0),
    0,
  );

  const signals: InsightSignals = {
    recurringProblems: recurring.records.map((record) => ({
      name: str(record, 'event.name') ?? 'Unnamed',
      occurrences: num(record, 'occurrences') ?? 0,
      category: str(record, 'event.category') ?? 'Uncategorised',
    })),

    restartingWorkloads: restarts.records.map((record) => ({
      workload: str(record, 'workload') ?? 'Not reported',
      cluster: str(record, 'cluster') ?? 'Not reported',
      restarts: num(record, 'total') ?? 0,
    })),

    pressuredWorkloads: pressure.records.map((record) => ({
      workload: str(record, 'workload') ?? 'Not reported',
      cluster: str(record, 'cluster') ?? 'Not reported',
      oomKills: num(record, 'totalOom') ?? 0,
      // 3.2.3 (Q9): throttled CPU as a share of the CPU limit; the average throttled millicores
      // when the workload sets no limit. Either way, above zero means it was throttled.
      throttled: num(record, 'throttledPct') ?? num(record, 'throttledAvg') ?? 0,
    })),

    // The 1% line is a review convention chosen for this app, not a platform
    // threshold and not an agreed service objective.
    failingServices: services.records
      .map((record) => ({
        name: str(record, 'name') ?? 'Unnamed service',
        failureRatePct: num(record, 'failureRatePct') ?? 0,
      }))
      .filter((service) => service.failureRatePct > 1)
      .sort((a, b) => b.failureRatePct - a.failureRatePct),

    logServiceContextPct: serviceContext === null ? null : serviceContext.percent,
    logUnclassifiedPct: unclassified === null ? null : unclassified.percent,

    emptyBuckets: buckets.records
      .filter((record) => num(record, 'records') === 0)
      .map((record) => str(record, 'name') ?? '—'),

    unreadableBuckets: buckets.records
      .filter((record) => bool(record, 'hasAccess') === false)
      .map((record) => str(record, 'name') ?? '—'),

    failingWorkflows: workflows.records
      .filter((record) => str(record, 'state') === 'ERROR')
      .map((record) => ({
        title: str(record, 'title') ?? 'Untitled workflow',
        executions: num(record, 'executions') ?? 0,
      }))
      .sort((a, b) => b.executions - a.executions),

    inefficientTables: queryCost.records
      .map((record) => ({
        table: str(record, 'table') ?? 'Not reported',
        bytesPerRecord: num(record, 'bytesPerDeliveredRecord') ?? 0,
        scannedBytes: num(record, 'scannedOnDemandBytes') ?? 0,
      }))
      .filter((table) => table.scannedBytes > 0)
      .sort((a, b) => b.bytesPerRecord - a.bytesPerRecord),

    securityUnreadable: security.outcome === 'no-permission',

    // Either problem is disqualifying on its own.
    experienceUnavailable: !sessionsReadable || sessionRecords < 100,

    pressuredWorkloadsTotal:
      pressureTotals.outcome === 'ok' ? (num(pressureTotals.records[0] ?? {}, 'workloads') ?? 0) : null,

    failingWorkflowsTotal:
      workflowTotals.outcome === 'ok'
        ? {
            workflows: num(workflowTotals.records[0] ?? {}, 'failingWorkflows') ?? 0,
            failedRuns: num(workflowTotals.records[0] ?? {}, 'failed') ?? 0,
          }
        : null,

    // Display-ready: `timeframeLabel` is a dictionary key (`timeframe.now-24h`), and the
    // insight text interpolates this field verbatim.
    windowLabel: tWindow(timeframeLabel),
    // The recurrence query is pinned to its own window; describing it with the global one put
    // "in the last 24 hours" next to a 7-day count (3.2.1).
    recurringWindowLabel: tWindow(recurring.timeframe.label),
  };

  return {
    signals,
    isLoading: all.some((result) => result.isLoading),
    unavailable: all
      .filter((result) => result.outcome === 'no-permission' || result.outcome === 'error')
      .map((result) => result.entry.id),
  };
}
