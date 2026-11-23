import { useCallback } from 'react';

import { useTranslation } from '../i18n/useTranslation';
import type { CatalogQueryResult } from './useCatalogQuery';
import { derived, observed, partial, unavailable, type Fact, type Unavailable } from '../models/provenance';

/**
 * Turns a query result into the `Fact` a summary tile needs.
 *
 * Every page that opens with a headline band was going to repeat the same six
 * lines: check the outcome, map a refusal onto `no-permission`, map an empty
 * result onto `no-telemetry`, keep a measured zero as a measurement, and attach
 * the evidence reference. Repeating that is how one page eventually renders a
 * bare zero, which is the defect this whole app exists to prevent.
 */

export type FactFrom = (
  result: CatalogQueryResult,
  value: number | string | null,
  options?: { note?: string; unit?: string; calculation?: string },
) => Fact<number | string | null>;

/**
 * The gap to show for a query that produced no usable value, chosen by what actually
 * happened to the query — not by the fact that the value is null.
 *
 * A page that builds `unavailable('no-telemetry', …)` whenever a number is missing
 * tells a customer "no telemetry" while the query is still running, "no telemetry"
 * after a refusal, and "no telemetry" after a failure. Those are three different
 * statements, and only one of them is a finding about the environment.
 *
 *   loading        → `loading`        (nothing is known yet)
 *   error          → `failed`         (the read failed; the value is unknown, not zero)
 *   no-permission  → `no-permission`
 *   anything else  → `fallback`       (the source answered and the value is absent)
 */
export function missingFact(
  result: Pick<CatalogQueryResult, 'outcome' | 'evidence'>,
  fallback: 'no-telemetry' | 'not-configured' = 'no-telemetry',
  requirement?: string,
): Unavailable {
  switch (result.outcome) {
    case 'loading':
      return unavailable('loading', undefined, result.evidence);
    case 'error':
      return unavailable('failed', undefined, result.evidence);
    case 'no-permission':
      return unavailable('no-permission', requirement, result.evidence);
    default:
      return unavailable(fallback, requirement, result.evidence);
  }
}

export function useSummaryFact(): FactFrom {
  const { t } = useTranslation();

  return useCallback(
    (result, value, options = {}) => {
    if (result.outcome === 'no-permission') {
      return unavailable(
        'no-permission',
        t('req.scope', { scope: result.entry.requiredScope }),
        result.evidence,
      );
    }
    if (result.outcome === 'loading' || result.outcome === 'error') {
      return missingFact(result);
    }
    // The scan limit stopped the query early: what came back is real but partial. It is
    // shown, labelled as an estimate, instead of being thrown away and called "not
    // configured" (which it is not).
    if (result.outcome === 'scan-limit') {
      return value === null
        ? missingFact(result)
        : partial(value, result.evidence, t('c.fact.scanLimitNote'), { unit: options.unit });
    }
    if (value === null) {
      return missingFact(result);
    }
    // A calculation is a calculation even when it is a simple ratio. Saying so
    // is cheaper than being challenged on it in front of a customer.
      return options.calculation === undefined
        ? observed(value, result.evidence, { note: options.note, unit: options.unit })
        : derived(value, result.evidence, options.calculation, { unit: options.unit });
    },
    [t],
  );
}
