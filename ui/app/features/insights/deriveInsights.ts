/**
 * Derives improvement opportunities from live signals.
 *
 * Rules this module obeys:
 *   - an insight is only produced when the signal that justifies it is present
 *   - effort and impact are qualitative, because no data here supports a number
 *   - no financial saving, MTTR reduction or percentage gain is ever asserted:
 *     that requires a methodology and a baseline the customer has to provide
 *   - every insight names the query that produced its evidence
 *
 * Kept free of React so it can be unit tested against fabricated signals.
 */

import type { Confidence } from '../../models/provenance';
import { translate, type StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { decimal } from '../../utils/activeLocale';
import { assumed } from '../../config/assumptions';

/**
 * Stable category ids.
 *
 * Ids rather than display strings, so switching language cannot change control
 * flow: `Roadmap` routes on `security` and `coverage`, and that must keep
 * working when the label reads "Segurança".
 */
export type InsightCategory =
  | 'coverage'
  | 'reliability'
  | 'performance'
  | 'capacity'
  | 'data-quality'
  | 'security'
  | 'automation'
  | 'governance'
  | 'consumption'
  | 'experience';

export const CATEGORY_KEY: Record<InsightCategory, StringKey> = {
  coverage: 'f.insight.cat.coverage',
  reliability: 'f.insight.cat.reliability',
  performance: 'f.insight.cat.performance',
  capacity: 'f.insight.cat.capacity',
  'data-quality': 'f.insight.cat.dataQuality',
  security: 'f.insight.cat.security',
  automation: 'f.insight.cat.automation',
  governance: 'f.insight.cat.governance',
  consumption: 'f.insight.cat.consumption',
  experience: 'f.insight.cat.experience',
};

export type Qualitative = 'low' | 'medium' | 'high';

export interface Insight {
  id: string;
  title: string;
  category: InsightCategory;
  /** What was measured. States the number and its window. */
  observation: string;
  /** Catalog query ids backing the observation. */
  evidence: string[];
  /** Entity, workload or source the observation applies to. */
  subject: string;
  /** What could follow if nothing changes. Phrased as a possibility. */
  consequence: string;
  recommendation: string;
  effort: Qualitative;
  impact: Qualitative;
  confidence: Confidence;
  /** What must be true or decided before acting. */
  dependencies: string;
  /** In-app route for drill-down. */
  drilldown: string;
}

/** Signals the pages collect and hand to this module. */
export interface InsightSignals {
  /** Distinct problem patterns with their occurrence counts, highest first. */
  recurringProblems: { name: string; occurrences: number; category: string }[];
  /** Workloads with container restarts, highest first. */
  restartingWorkloads: { workload: string; cluster: string; restarts: number }[];
  /** Workloads reporting OOM kills or throttling. */
  pressuredWorkloads: { workload: string; cluster: string; oomKills: number; throttled: number }[];
  /** Services above a failure-rate threshold. */
  failingServices: { name: string; failureRatePct: number }[];
  /** Share of log records carrying service context, 0-100, or null if unknown. */
  logServiceContextPct: number | null;
  /** Share of log records with no severity, 0-100, or null if unknown. */
  logUnclassifiedPct: number | null;
  /** Buckets holding no records at all. */
  emptyBuckets: string[];
  /** Buckets the identity cannot read. */
  unreadableBuckets: string[];
  /** Workflows whose final state is ERROR. */
  failingWorkflows: { title: string; executions: number }[];
  /** Exact count of workloads with OOM kills or throttling (`k8s.pressure.total`); null when unread. */
  pressuredWorkloadsTotal: number | null;
  /** Exact failing workflows and failed runs (`auto.workflows.total`); null when unread. */
  failingWorkflowsTotal: { workflows: number; failedRuns: number } | null;
  /** Tables ranked by bytes scanned per delivered record, worst first. */
  inefficientTables: { table: string; bytesPerRecord: number; scannedBytes: number }[];
  /** True when the security table could not be read. */
  securityUnreadable: boolean;
  /** True when session data is unreadable or empty. */
  experienceUnavailable: boolean;
  /** Window the signals were measured over. */
  windowLabel: string;
  /** Window of the recurrence query, which is pinned rather than global. */
  recurringWindowLabel: string;
}

/**
 * The slice of the translation API this module needs.
 *
 * Passed in rather than pulled from a hook so the function stays pure and
 * testable, and so an opportunity written in Portuguese reads as Portuguese all
 * the way through — including its numbers.
 */
export type InsightText = Pick<Translation, 't' | 'formatNumber'>;

/**
 * English fallback, used when no locale is supplied.
 *
 * Resolves against the real dictionary rather than echoing the key back: a
 * caller that forgets to pass the active translation gets readable English, not
 * `f.insight.security.rec` in front of a customer.
 */
export const EN_TEXT: InsightText = {
  t: (key, params) => translate(key, 'en', params),
  formatNumber: (value, options) => value.toLocaleString('en-GB', options),
};

const formatBytesShort = (bytes: number, formatNumber: InsightText['formatNumber']): string => {
  if (bytes >= 1_000_000_000_000) return `${decimal(bytes / 1_000_000_000_000, 2)} TB`;
  if (bytes >= 1_000_000_000) return `${decimal(bytes / 1_000_000_000, 2)} GB`;
  if (bytes >= 1_000_000) return `${decimal(bytes / 1_000_000, 1)} MB`;
  return `${formatNumber(bytes)} B`;
};

export function deriveInsights(
  signals: InsightSignals,
  text: InsightText = EN_TEXT,
): Insight[] {
  const insights: Insight[] = [];
  const window = signals.windowLabel;
  const { t, formatNumber } = text;

  // --- Automation from recurrence ----------------------------------------
  const topPattern = signals.recurringProblems[0];
  if (topPattern !== undefined && topPattern.occurrences >= assumed('findings.pattern.min')) {
    insights.push({
      id: 'automate-recurring-problem',
      title: t('f.insight.recurring.title', { name: topPattern.name }),
      category: 'automation',
      observation: t('f.insight.recurring.obs', {
        name: topPattern.name,
        count: formatNumber(topPattern.occurrences),
        window: signals.recurringWindowLabel,
        category: topPattern.category,
      }),
      evidence: ['prob.recurrent'],
      subject: topPattern.name,
      consequence: t('f.insight.recurring.cons'),
      recommendation: t('f.insight.recurring.rec'),
      effort: 'medium',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.recurring.dep'),
      drilldown: '/problems',
    });
  }

  // --- Kubernetes stability ----------------------------------------------
  const topRestart = signals.restartingWorkloads[0];
  if (topRestart !== undefined && topRestart.restarts >= assumed('findings.restarts.min')) {
    insights.push({
      id: 'stabilise-restarting-workload',
      title: t('f.insight.restart.title', { name: topRestart.workload }),
      category: 'reliability',
      observation: t('f.insight.restart.obs', {
        count: formatNumber(topRestart.restarts),
        window,
        workload: topRestart.workload,
        cluster: topRestart.cluster,
      }),
      evidence: ['k8s.restarts'],
      subject: `${topRestart.cluster} / ${topRestart.workload}`,
      consequence: t('f.insight.restart.cons'),
      recommendation: t('f.insight.restart.rec'),
      effort: 'medium',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.restart.dep'),
      drilldown: '/kubernetes',
    });
  }

  // The count comes from the aggregate over every workload; the 25-row list only names examples.
  const pressured = signals.pressuredWorkloads.filter(
    (workload) => workload.oomKills > 0 || workload.throttled > 0,
  );
  const pressuredCount = signals.pressuredWorkloadsTotal;
  if (pressuredCount !== null && pressuredCount > 0) {
    insights.push({
      id: 'review-resource-limits',
      title: t('f.insight.limits.title', { count: pressuredCount }),
      category: 'capacity',
      observation: t('f.insight.limits.obs', { count: pressuredCount, window }),
      evidence: ['k8s.pressure.total', 'k8s.pressure'],
      subject: pressured
        .slice(0, 3)
        .map((workload) => workload.workload)
        .join(', '),
      consequence: t('f.insight.limits.cons'),
      recommendation: t('f.insight.limits.rec'),
      effort: 'low',
      impact: 'medium',
      confidence: 'medium',
      dependencies: t('f.insight.limits.dep'),
      drilldown: '/kubernetes',
    });
  }

  // --- Service reliability -----------------------------------------------
  const worstService = signals.failingServices[0];
  if (worstService !== undefined) {
    insights.push({
      id: 'investigate-failing-service',
      title: t('f.insight.service.title', { name: worstService.name }),
      category: 'reliability',
      observation: t('f.insight.service.obs', {
        name: worstService.name,
        rate: decimal(worstService.failureRatePct, 2),
        window,
      }),
      evidence: ['svc.ranking'],
      subject: worstService.name,
      consequence: t('f.insight.service.cons'),
      recommendation: t('f.insight.service.rec'),
      effort: 'low',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.service.dep'),
      drilldown: '/services',
    });
  }

  // --- Log quality --------------------------------------------------------
  if (signals.logServiceContextPct !== null && signals.logServiceContextPct < assumed('findings.logContext.low')) {
    insights.push({
      id: 'enrich-log-context',
      title: t('f.insight.title.logContext'),
      category: 'data-quality',
      observation: t('f.insight.logContext.obs', {
        pct: decimal(signals.logServiceContextPct, 2),
      }),
      evidence: ['log.quality'],
      subject: t('f.insight.logContext.subject'),
      consequence: t('f.insight.logContext.cons'),
      recommendation: t('f.insight.logContext.rec'),
      effort: 'medium',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.logContext.dep'),
      drilldown: '/logs',
    });
  }

  if (signals.logUnclassifiedPct !== null && signals.logUnclassifiedPct > assumed('findings.unclassified.high')) {
    insights.push({
      id: 'classify-log-severity',
      title: t('f.insight.title.logSeverity'),
      category: 'data-quality',
      observation: t('f.insight.logSeverity.obs', { pct: decimal(signals.logUnclassifiedPct, 1) }),
      evidence: ['log.quality', 'log.sfm'],
      subject: t('f.insight.logContext.subject'),
      consequence: t('f.insight.logSeverity.cons'),
      recommendation: t('f.insight.logSeverity.rec'),
      effort: 'medium',
      impact: 'medium',
      confidence: 'high',
      dependencies: t('f.insight.logSeverity.dep'),
      drilldown: '/logs',
    });
  }

  // --- Governance ---------------------------------------------------------
  if (signals.emptyBuckets.length > 0) {
    insights.push({
      id: 'consolidate-empty-buckets',
      title: t('f.insight.emptyBuckets.title', { count: signals.emptyBuckets.length }),
      category: 'governance',
      observation: t('f.insight.emptyBuckets.obs', {
        count: signals.emptyBuckets.length,
        list: signals.emptyBuckets.slice(0, 5).join(', '),
        more: signals.emptyBuckets.length > 5 ? t('f.insight.emptyBuckets.more') : '',
      }),
      evidence: ['cov.buckets'],
      subject: t('f.insight.emptyBuckets.subject'),
      consequence: t('f.insight.emptyBuckets.cons'),
      recommendation: t('f.insight.emptyBuckets.rec'),
      effort: 'low',
      impact: 'low',
      confidence: 'medium',
      dependencies: t('f.insight.emptyBuckets.dep'),
      drilldown: '/coverage',
    });
  }

  if (signals.unreadableBuckets.length > 0) {
    insights.push({
      id: 'resolve-access-gaps',
      title: t('f.insight.access.title', { count: signals.unreadableBuckets.length }),
      category: 'coverage',
      observation: t('f.insight.access.obs', { count: signals.unreadableBuckets.length }),
      evidence: ['cov.buckets'],
      subject: signals.unreadableBuckets.slice(0, 4).join(', '),
      consequence: t('f.insight.access.cons'),
      recommendation: t('f.insight.access.rec'),
      effort: 'low',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.access.dep'),
      drilldown: '/coverage',
    });
  }

  // --- Automation reliability --------------------------------------------
  // Counts from `auto.workflows.total`; the ranked list (40 rows) only supplies the names.
  const failing = signals.failingWorkflowsTotal;
  if (failing !== null && failing.workflows > 0) {
    insights.push({
      id: 'fix-failing-workflows',
      title: t('f.insight.workflows.title', { count: failing.workflows }),
      category: 'automation',
      observation: t('f.insight.workflows.obs', {
        runs: formatNumber(failing.failedRuns),
        window,
        count: failing.workflows,
        list: signals.failingWorkflows
          .slice(0, 3)
          .map((workflow) => workflow.title)
          .join(', '),
      }),
      evidence: ['auto.workflows.total', 'auto.workflows'],
      subject: signals.failingWorkflows.map((workflow) => workflow.title).slice(0, 3).join(', '),
      consequence: t('f.insight.workflows.cons'),
      recommendation: t('f.insight.workflows.rec'),
      effort: 'low',
      impact: 'medium',
      confidence: 'high',
      dependencies: t('f.insight.workflows.dep'),
      drilldown: '/automation',
    });
  }

  // --- Consumption --------------------------------------------------------
  const worstTable = signals.inefficientTables[0];
  if (worstTable !== undefined && worstTable.bytesPerRecord > 1_000_000) {
    insights.push({
      id: 'improve-query-efficiency',
      title: t('f.insight.queryCost.title', { table: worstTable.table }),
      category: 'consumption',
      observation: t('f.insight.queryCost.obs', {
        table: worstTable.table,
        scanned: formatBytesShort(worstTable.scannedBytes, formatNumber),
        window,
        perRecord: formatBytesShort(worstTable.bytesPerRecord, formatNumber),
      }),
      evidence: ['cons.advisor'],
      subject: worstTable.table,
      consequence: t('f.insight.queryCost.cons'),
      recommendation: t('f.insight.queryCost.rec'),
      effort: 'low',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.queryCost.dep'),
      drilldown: '/consumption',
    });
  }

  // --- Declared gaps ------------------------------------------------------
  if (signals.securityUnreadable) {
    insights.push({
      id: 'enable-security-visibility',
      title: t('f.insight.title.securityScope'),
      category: 'security',
      observation: t('f.insight.security.obs'),
      evidence: ['sec.posture'],
      subject: 'security.events',
      consequence: t('f.insight.security.cons'),
      recommendation: t('f.insight.security.rec'),
      effort: 'low',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.security.dep'),
      drilldown: '/security',
    });
  }

  if (signals.experienceUnavailable) {
    insights.push({
      id: 'instrument-user-journey',
      title: t('f.insight.title.rumJourney'),
      category: 'experience',
      observation: t('f.insight.rum.obs'),
      evidence: ['rum.sessions', 'cov.buckets'],
      subject: t('f.insight.rum.subject'),
      consequence: t('f.insight.rum.cons'),
      recommendation: t('f.insight.rum.rec'),
      effort: 'medium',
      impact: 'high',
      confidence: 'high',
      dependencies: t('f.insight.rum.dep'),
      drilldown: '/experience',
    });
  }

  return insights;
}

/** Orders insights by impact first, then by ascending effort. */
export function prioritise(insights: Insight[]): Insight[] {
  const rank: Record<Qualitative, number> = { high: 3, medium: 2, low: 1 };
  return [...insights].sort((a, b) => {
    const byImpact = rank[b.impact] - rank[a.impact];
    if (byImpact !== 0) return byImpact;
    return rank[a.effort] - rank[b.effort];
  });
}
