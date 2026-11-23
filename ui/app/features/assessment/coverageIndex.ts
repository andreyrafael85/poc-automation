import { assumed } from '../../config/assumptions';

/**
 * The observable-coverage index of the Assessment (3.4.0, proposal §C2, owner's decision D-C1).
 *
 * It measures **what Dynatrace can observe** in this environment, never how healthy it is — health
 * and risk are the findings, kept apart. Each domain is a ratio of two exact counts from aggregate
 * catalog queries; the index is the weighted mean of the domains that were **measured and apply**:
 *
 *     s_d   = numerator_d / denominator_d            (0 ≤ s_d ≤ 1)
 *     index = 100 × Σ (w_d × s_d) / Σ w_d            (over measured, applicable domains only)
 *     reach = Σ w_d (measured) / Σ w_d (applicable)  (how much of the assessment itself was read)
 *
 * A domain that was not read (no permission, failed, still loading) leaves the denominator instead
 * of counting as zero (rule 8); a domain with nothing to observe (no cluster, no web application)
 * does not apply. With less than `assessment.minWeight` % of the applicable weight measured there is
 * no number at all. A ratio above 1 (two reads that disagree) is a failed reading, never cut to 100 %.
 *
 * Kept free of React so every rule of the formula is unit tested.
 */

export type DomainId = 'infra' | 'apm' | 'logs' | 'k8s' | 'experience' | 'business';

export const DOMAIN_ORDER: readonly DomainId[] = ['infra', 'apm', 'logs', 'k8s', 'experience', 'business'];

/** Why a domain has no share. `incoherent` = numerator above denominator (reads that disagree). */
export type DomainGap = 'loading' | 'no-permission' | 'failed' | 'no-telemetry' | 'partial' | 'incoherent';

export type DomainState =
  | { kind: 'measured'; numerator: number; denominator: number; share: number; presence?: boolean }
  | { kind: 'not-applicable' }
  | { kind: 'unavailable'; reason: DomainGap };

export interface DomainReading {
  id: DomainId;
  state: DomainState;
  /** Catalog ids the numerator and denominator come from. */
  queryIds: readonly string[];
}

export interface DomainScore extends DomainReading {
  weight: number;
  /** `weight × share`, the domain's part of the index; null when it is not in the index. */
  contribution: number | null;
}

export interface CoverageIndex {
  /** 0–100, rounded; null when too little of the applicable weight was measured. */
  value: number | null;
  measuredWeight: number;
  applicableWeight: number;
  /** Share of the applicable weight that was measured, 0–1; null when no domain applies. */
  reach: number | null;
  /** Why there is no value. */
  missing: 'loading' | 'insufficient' | 'nothing-applies' | null;
  domains: DomainScore[];
}

export const DOMAIN_WEIGHT: Readonly<Record<DomainId, number>> = {
  infra: assumed('assessment.weight.infra'),
  apm: assumed('assessment.weight.apm'),
  logs: assumed('assessment.weight.logs'),
  k8s: assumed('assessment.weight.k8s'),
  experience: assumed('assessment.weight.experience'),
  business: assumed('assessment.weight.business'),
};

/** The outcome of one catalog read, as far as a domain needs to know it. */
export type ReadOutcome = 'loading' | 'ok' | 'empty' | 'no-permission' | 'scan-limit' | 'error' | 'refused';

/** The first read that keeps a domain from being measured, in the order that explains it best. */
function gapOf(outcomes: readonly ReadOutcome[]): DomainGap | null {
  if (outcomes.includes('no-permission')) return 'no-permission';
  if (outcomes.includes('error') || outcomes.includes('refused')) return 'failed';
  if (outcomes.includes('loading')) return 'loading';
  // A scan limit stopped a read early: the counts are a lower bound, so the domain leaves the index.
  if (outcomes.includes('scan-limit')) return 'partial';
  return null;
}

/**
 * A domain from two exact counts. `denominator === 0` means there is nothing to observe (the domain
 * does not apply); a null count with the reads answered means the source holds no such data.
 */
export function ratioDomain(
  numerator: number | null,
  denominator: number | null,
  outcomes: readonly ReadOutcome[],
): DomainState {
  const gap = gapOf(outcomes);
  if (gap !== null) return { kind: 'unavailable', reason: gap };
  if (denominator === 0) return { kind: 'not-applicable' };
  if (numerator === null || denominator === null) return { kind: 'unavailable', reason: 'no-telemetry' };
  if (numerator < 0 || denominator < 0) return { kind: 'unavailable', reason: 'failed' };
  if (numerator > denominator) return { kind: 'unavailable', reason: 'incoherent' };
  return { kind: 'measured', numerator, denominator, share: numerator / denominator };
}

/** A presence domain (business events): read at all → 1 when any was captured, 0 when none. */
export function presenceDomain(count: number | null, outcomes: readonly ReadOutcome[]): DomainState {
  const gap = gapOf(outcomes);
  if (gap !== null) return { kind: 'unavailable', reason: gap };
  if (count === null) return { kind: 'unavailable', reason: 'no-telemetry' };
  const present = count > 0;
  return { kind: 'measured', numerator: present ? 1 : 0, denominator: 1, share: present ? 1 : 0, presence: true };
}

export function computeIndex(readings: readonly DomainReading[]): CoverageIndex {
  const domains: DomainScore[] = readings.map((reading) => {
    const weight = DOMAIN_WEIGHT[reading.id];
    const contribution = reading.state.kind === 'measured' ? weight * reading.state.share : null;
    return { ...reading, weight, contribution };
  });
  const applicable = domains.filter((domain) => domain.state.kind !== 'not-applicable');
  const measured = applicable.filter((domain) => domain.state.kind === 'measured');
  const applicableWeight = applicable.reduce((sum, domain) => sum + domain.weight, 0);
  const measuredWeight = measured.reduce((sum, domain) => sum + domain.weight, 0);
  const reach = applicableWeight === 0 ? null : measuredWeight / applicableWeight;

  const loading = applicable.some((domain) => domain.state.kind === 'unavailable' && domain.state.reason === 'loading');
  let missing: CoverageIndex['missing'] = null;
  if (applicableWeight === 0) missing = 'nothing-applies';
  else if (reach !== null && reach * 100 < assumed('assessment.minWeight')) missing = loading ? 'loading' : 'insufficient';

  const value =
    missing === null && measuredWeight > 0
      ? Math.round((100 * measured.reduce((sum, domain) => sum + (domain.contribution ?? 0), 0)) / measuredWeight)
      : null;
  return { value, measuredWeight, applicableWeight, reach, missing: value === null && missing === null ? 'insufficient' : missing, domains };
}
