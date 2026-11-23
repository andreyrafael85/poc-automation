import { useMemo } from 'react';

import { useQueryScope, useStudio } from '../../config/StudioContext';
import { useTranslation } from '../../i18n/useTranslation';
import { useCatalogQuery, type CatalogQueryResult } from '../../hooks/useCatalogQuery';
import { derived, observed, unavailable, type Fact } from '../../models/provenance';
import {
  POC_PILLARS,
  queriesForPillars,
  type EvidenceStatus,
  type PillarId,
  type PocPillar,
  type PointMetric,
  type ValidationPoint,
} from '../../models/pillars';
import { useCommercialVisible } from '../../components/SeOnly';

/**
 * Measures the selected value pillars against this tenant.
 *
 * A pillar used to be a static card: four bullet points and a chip whose colour
 * came from a validation recorded in a different environment on a different day.
 * That framed the engagement but proved nothing — the audience saw the same
 * screen whether the tenant had 400 problems or none.
 *
 * This hook replaces that with measurement. Every validation point names the
 * figures that evidence it, this runs those queries over the active window, and
 * the point's status is derived from what actually came back.
 *
 * ## Cost
 *
 * Only the queries the *selected* pillars need are enabled. React's rules of
 * hooks force a fixed call list, so every pillar query is declared here and the
 * unselected ones are switched off with `enabled: false`, which skips the fetch
 * entirely. Results are shared with the domain pages through the query cache, so
 * a pillar figure and the page it links to never scan twice.
 */

/** One measured figure behind a validation point. */
export interface MetricReading {
  metric: PointMetric;
  fact: Fact<number | string | null>;
  /** Raw reduced value, before formatting. Null when not measured. */
  value: number | string | null;
}

export interface PointEvidence {
  point: ValidationPoint;
  status: EvidenceStatus;
  readings: MetricReading[];
  /** Scopes the platform said were missing, if any query was refused. */
  missingScopes: string[];
}

export interface PillarEvidence {
  pillar: PocPillar;
  points: PointEvidence[];
  evidenced: number;
  partial: number;
  notEvidenced: number;
  measuring: number;
  total: number;
}

export interface PillarEvidenceState {
  pillars: PillarEvidence[];
  isLoading: boolean;
  /** Query ids that were refused or errored, so the UI can name the gap. */
  unavailable: string[];
}

/**
 * Status for one point, from what the platform actually returned.
 *
 * The order of these checks is the honesty policy in code:
 *
 *   - no metrics at all      -> not evidenced, and it says so rather than hiding
 *   - anything still running -> measuring, never a premature conclusion
 *   - a refusal              -> not evidenced; a permission gap is not a result
 *   - no value came back     -> not evidenced; absence of data is not proof
 *   - a stated caveat        -> partial, even when every number arrived
 *   - some values missing    -> partial
 *   - everything measured    -> evidenced
 */
export function statusFromReadings(
  point: ValidationPoint,
  readings: MetricReading[],
  outcomes: CatalogQueryResult['outcome'][],
): EvidenceStatus {
  if (point.metrics.length === 0) return 'not-evidenced';
  if (outcomes.some((outcome) => outcome === 'loading')) return 'measuring';
  if (outcomes.some((outcome) => outcome === 'no-permission')) return 'not-evidenced';

  const measured = readings.filter((reading) => reading.value !== null);
  if (measured.length === 0) return 'not-evidenced';

  if (point.caveatKey !== undefined) return 'partial';
  if (measured.length < readings.length) return 'partial';
  if (outcomes.some((outcome) => outcome !== 'ok')) return 'partial';
  return 'evidenced';
}

export function usePillarEvidence(enabled = true): PillarEvidenceState {
  const scope = useQueryScope();
  const { selectedPillars } = useStudio();
  const { t } = useTranslation();

  const needed = useMemo(() => queriesForPillars(selectedPillars), [selectedPillars]);
  const on = (id: Parameters<typeof needed.has>[0]) => ({
    ...scope,
    enabled: enabled && needed.has(id),
  });

  // Fixed hook list. Adding a pillar query means adding a line here; the
  // `PILLAR_QUERY_IDS` test asserts the two never drift.
  const results: Partial<Record<string, CatalogQueryResult>> = {
    'prob.summary': useCatalogQuery('prob.summary', on('prob.summary')),
    'prob.exposure': useCatalogQuery('prob.exposure', on('prob.exposure')),
    'prob.topentities': useCatalogQuery('prob.topentities', on('prob.topentities')),
    'prob.topentities.total': useCatalogQuery('prob.topentities.total', on('prob.topentities.total')),
    'prob.recurrent.total': useCatalogQuery('prob.recurrent.total', on('prob.recurrent.total')),
    'prob.mttx': useCatalogQuery('prob.mttx', on('prob.mttx')),
    'svc.ranking.total': useCatalogQuery('svc.ranking.total', on('svc.ranking.total')),
    'svc.breakdown': useCatalogQuery('svc.breakdown', on('svc.breakdown')),
    'svc.topology.total': useCatalogQuery('svc.topology.total', on('svc.topology.total')),
    'svc.totals': useCatalogQuery('svc.totals', on('svc.totals')),
    'proc.technologies': useCatalogQuery('proc.technologies', on('proc.technologies')),
    'cov.inventory': useCatalogQuery('cov.inventory', on('cov.inventory')),
    'cov.hosts.breakdown': useCatalogQuery('cov.hosts.breakdown', on('cov.hosts.breakdown')),
    'auto.workflows.total': useCatalogQuery('auto.workflows.total', on('auto.workflows.total')),
    'cons.capabilities': useCatalogQuery('cons.capabilities', on('cons.capabilities')),
    'rum.sessions': useCatalogQuery('rum.sessions', on('rum.sessions')),
    'biz.events.total': useCatalogQuery('biz.events.total', on('biz.events.total')),
  };

  const commercialVisible = useCommercialVisible();
  const selected = POC_PILLARS.filter((pillar) => selectedPillars.includes(pillar.id));

  const pillars: PillarEvidence[] = selected.map((pillar) => {
    const points: PointEvidence[] = pillar.points.map((point) => {
      const outcomes: CatalogQueryResult['outcome'][] = [];
      const missingScopes = new Set<string>();

      // Billing-derived metrics are SE material: with "Commercial data" off they are not listed.
      const visibleMetrics = point.metrics.filter((metric) => commercialVisible || metric.commercial !== true);
      const readings: MetricReading[] = visibleMetrics.map((metric) => {
        const result = results[metric.queryId];
        if (result === undefined) {
          // Unreachable while the drift test passes; treated as unmeasured
          // rather than thrown, because a presentation must not crash.
          return { metric, value: null, fact: unavailable('not-configured') };
        }

        outcomes.push(result.outcome);
        for (const missing of result.missingScopes) missingScopes.add(missing);

        const value = result.outcome === 'ok' ? metric.reduce(result.records) : null;

        if (value === null) {
          // The reason matters: a refused query and an empty one are different
          // statements about the environment, and the badge says which.
          const reason =
            result.outcome === 'no-permission'
              ? 'no-permission'
              : result.outcome === 'error' || result.outcome === 'scan-limit'
                ? 'not-configured'
                : 'no-telemetry';
          return {
            metric,
            value: null,
            fact: { ...unavailable(reason, undefined, result.evidence) },
          };
        }

        return {
          metric,
          value,
          fact:
            metric.kind === 'derived'
              ? derived(value, result.evidence, t(metric.derivationKey ?? 'pillar.m.derived'))
              : observed(value, result.evidence),
        };
      });

      return {
        point,
        status: statusFromReadings(point, readings, outcomes),
        readings,
        missingScopes: [...missingScopes],
      };
    });

    const count = (status: EvidenceStatus) =>
      points.filter((entry) => entry.status === status).length;

    return {
      pillar,
      points,
      evidenced: count('evidenced'),
      partial: count('partial'),
      notEvidenced: count('not-evidenced'),
      measuring: count('measuring'),
      total: points.length,
    };
  });

  const active = [...needed].map((id) => results[id]).filter((r): r is CatalogQueryResult => r !== undefined);

  return {
    pillars,
    isLoading: active.some((result) => result.isLoading),
    unavailable: active
      .filter((result) => result.outcome === 'no-permission' || result.outcome === 'error')
      .map((result) => result.entry.id),
  };
}

export type { PillarId };
