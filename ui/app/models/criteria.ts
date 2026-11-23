import type { QueryOutcome } from '../hooks/useCatalogQuery';
import type { StringKey } from '../i18n/strings';
import type { CatalogId } from '../queries/catalog';
import { num, ratio, str, type GrailRecord } from '../utils/records';
import type { PillarId } from './pillars';
import type { CriterionOperator, SuccessCriterion } from './pocPlan';

/**
 * Success criteria, measured (3.2.5, milestone M5).
 *
 * Each metric a criterion can name is a figure this app already reads, from the same catalog
 * query and with the same rule as the page that shows it, so "objective met" on the PoC Timeline
 * is the number on the screen. A criterion is judged only from a query that answered: a
 * permission gap or a failed read is "not read", never "not met".
 */

export const CRITERION_METRIC_IDS = [
  'coverage.categories',
  'services.traced',
  'services.healthy',
  'problems.mttr',
  'problems.open',
  'problems.closed',
  'problems.recurring',
  'automation.workflows',
  'security.critical',
  'experience.users',
] as const;

export type CriterionMetricId = (typeof CRITERION_METRIC_IDS)[number];

export type CriterionUnit = 'percent' | 'count' | 'hours';

export interface CriterionMetric {
  id: CriterionMetricId;
  labelKey: StringKey;
  queryId: CatalogId;
  unit: CriterionUnit;
  /** Which way is good: the operator a new criterion starts with. */
  better: 'higher' | 'lower';
  /** The value pillar the figure proves, unless the SE ties the objective to another (3.2.6). */
  pillar: PillarId;
  /** The figure, from the query's records; null when the records do not carry it. */
  read: (records: readonly GrailRecord[]) => number | null;
}

/** The eight entity categories the coverage figure is measured against (the Overview's). */
const CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;

const first = (field: string) => (records: readonly GrailRecord[]) => num(records[0], field);

export const CRITERION_METRICS: Record<CriterionMetricId, CriterionMetric> = {
  'coverage.categories': {
    id: 'coverage.categories',
    pillar: 'productivity',
    labelKey: 'crit.m.coverage',
    queryId: 'cov.inventory',
    unit: 'percent',
    better: 'higher',
    read: (records) => {
      if (records.length === 0) return null;
      const covered = CATEGORIES.filter((category) => (num(records.find((record) => str(record, 'category') === category), 'value') ?? 0) > 0).length;
      return (covered / CATEGORIES.length) * 100;
    },
  },
  'services.traced': { id: 'services.traced', pillar: 'productivity', labelKey: 'crit.m.servicesTraced', queryId: 'svc.ranking.total', unit: 'count', better: 'higher', read: first('services') },
  'services.healthy': {
    id: 'services.healthy',
    pillar: 'agility',
    labelKey: 'crit.m.servicesHealthy',
    queryId: 'svc.ranking.total',
    unit: 'percent',
    better: 'higher',
    read: (records) => {
      const services = num(records[0], 'services');
      const above = num(records[0], 'aboveOnePct');
      return services === null || above === null || services === 0 ? null : ((services - above) / services) * 100;
    },
  },
  'problems.mttr': {
    id: 'problems.mttr',
    pillar: 'resilience',
    labelKey: 'crit.m.mttr',
    queryId: 'prob.mttx',
    unit: 'hours',
    better: 'lower',
    read: (records) => {
      // Weighted across categories, as the Executive summary does (`summariseMttr`).
      const problems = records.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
      const totalNs = records.reduce((total, record) => total + (num(record, 'totalNs') ?? 0), 0);
      return problems > 0 ? totalNs / problems / 3_600_000_000_000 : null;
    },
  },
  'problems.open': { id: 'problems.open', pillar: 'resilience', labelKey: 'crit.m.open', queryId: 'prob.exposure', unit: 'count', better: 'lower', read: first('activeProblems') },
  'problems.closed': {
    id: 'problems.closed',
    pillar: 'resilience',
    labelKey: 'crit.m.closed',
    queryId: 'prob.summary',
    unit: 'percent',
    better: 'higher',
    read: (records) => {
      const total = records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
      const active = records.filter((record) => str(record, 'event.status') === 'ACTIVE').reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
      return ratio(total - active, total)?.percent ?? null;
    },
  },
  'problems.recurring': { id: 'problems.recurring', pillar: 'cost', labelKey: 'crit.m.recurring', queryId: 'prob.recurrent.total', unit: 'count', better: 'lower', read: first('patterns') },
  'automation.workflows': { id: 'automation.workflows', pillar: 'cost', labelKey: 'crit.m.workflows', queryId: 'auto.workflows.total', unit: 'count', better: 'higher', read: first('workflows') },
  'security.critical': {
    id: 'security.critical',
    pillar: 'resilience',
    labelKey: 'crit.m.critical',
    queryId: 'sec.posture',
    unit: 'count',
    better: 'lower',
    read: (records) =>
      records.length === 0
        ? null
        : records.filter((record) => str(record, 'level') === 'CRITICAL').reduce((sum, record) => sum + (num(record, 'vulnerabilities') ?? 0), 0),
  },
  'experience.users': { id: 'experience.users', pillar: 'agility', labelKey: 'crit.m.users', queryId: 'rum.audience.total', unit: 'count', better: 'higher', read: first('users') },
};

/**
 * Where a criterion stands:
 * - `met` / `not-met` — measured, and the target is (not) reached;
 * - `measuring` — its query is still running;
 * - `not-read` — the query did not answer (permission, failure, partial read) or the figure is absent;
 * - `no-target` — a measured criterion without a target yet;
 * - `manual-*` — assessed by people.
 */
export type CriterionStatus = 'met' | 'not-met' | 'measuring' | 'not-read' | 'no-target' | 'manual-met' | 'manual-not-met' | 'manual-pending';

export interface CriterionResult {
  criterion: SuccessCriterion;
  metric: CriterionMetric | null;
  value: number | null;
  status: CriterionStatus;
  /** How far towards the target, 0–100 (100 when met); null when not measurable. */
  progressPct: number | null;
}

export function meets(value: number, operator: CriterionOperator, target: number): boolean {
  return operator === '>=' ? value >= target : value <= target;
}

/**
 * Progress towards a target: the share reached for "at least" (value ÷ target), the share of the
 * excess removed for "at most" (target ÷ value). Never above 100, and 100 only when met.
 */
export function progressTowards(value: number, operator: CriterionOperator, target: number): number {
  if (meets(value, operator, target)) return 100;
  if (operator === '>=') return target <= 0 ? 0 : Math.max(0, Math.min(99, (value / target) * 100));
  return value <= 0 ? 0 : Math.max(0, Math.min(99, (target / value) * 100));
}

export function evaluateCriterion(criterion: SuccessCriterion, records: readonly GrailRecord[], outcome: QueryOutcome | null): CriterionResult {
  if (criterion.metric === 'manual') {
    const status: CriterionStatus = criterion.manualStatus === 'met' ? 'manual-met' : criterion.manualStatus === 'not-met' ? 'manual-not-met' : 'manual-pending';
    return { criterion, metric: null, value: null, status, progressPct: criterion.manualStatus === 'met' ? 100 : null };
  }
  const metric = CRITERION_METRICS[criterion.metric];
  if (outcome === 'loading') return { criterion, metric, value: null, status: 'measuring', progressPct: null };
  // Only an answered query is evidence; an empty answer means zero for a count, nothing otherwise.
  const answered = outcome === 'ok' || outcome === 'empty';
  const value = answered ? metric.read(records) ?? (outcome === 'empty' && metric.unit === 'count' ? 0 : null) : null;
  if (value === null) return { criterion, metric, value: null, status: 'not-read', progressPct: null };
  if (criterion.target === null) return { criterion, metric, value, status: 'no-target', progressPct: null };
  const met = meets(value, criterion.operator, criterion.target);
  return { criterion, metric, value, status: met ? 'met' : 'not-met', progressPct: progressTowards(value, criterion.operator, criterion.target) };
}

/**
 * The pillar an objective proves: the one the SE tied it to, else its metric's own; a manual
 * objective without one belongs to none (3.2.6).
 */
export function criterionPillar(criterion: SuccessCriterion): PillarId | null {
  if (criterion.pillar !== undefined && criterion.pillar !== null) return criterion.pillar;
  return criterion.metric === 'manual' ? null : CRITERION_METRICS[criterion.metric].pillar;
}

/** The first metric that proves a pillar: what "Add an objective" on a pillar card starts with. */
export function suggestedMetric(pillar: PillarId): CriterionMetricId {
  return CRITERION_METRIC_IDS.find((id) => CRITERION_METRICS[id].pillar === pillar) ?? 'coverage.categories';
}

/** The catalog queries a list of criteria needs. */
export function criteriaQueries(criteria: readonly SuccessCriterion[]): Set<CatalogId> {
  return new Set(criteria.flatMap((criterion) => (criterion.metric === 'manual' ? [] : [CRITERION_METRICS[criterion.metric].queryId])));
}

/** Met / assessed, for the headline ("3 of 5 objectives proven"). */
export function criteriaScore(results: readonly CriterionResult[]): { met: number; total: number } {
  return {
    met: results.filter((result) => result.status === 'met' || result.status === 'manual-met').length,
    total: results.length,
  };
}
