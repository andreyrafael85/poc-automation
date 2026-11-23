import { num, str, type GrailRecord } from '../utils/records';

/**
 * Detects when the entity model itself is unavailable.
 *
 * ## Why this exists
 *
 * On 2026-09-01 the validation environment began returning **zero** for every
 * entity query — `fetch dt.entity.host`, `dt.entity.service`,
 * `dt.entity.process_group_instance` and the rest — across every timeframe,
 * while metrics, events and bucket metadata continued to work normally. Host CPU
 * was still reporting 12%, service metrics still returned 151,000 requests, and
 * `describe dt.entity.host` dropped from 104 fields to 3.
 *
 * The hosts were plainly still monitored. The entity model was simply not
 * answering.
 *
 * Without this check the app renders a confident "0 hosts", which is the single
 * most damaging thing it could say: it converts an environment condition into an
 * apparent measurement that the customer's estate is empty. A zero that is really
 * an outage must never look like a zero that is really a measurement.
 *
 * ## How the two cases are told apart
 *
 * A genuine zero is selective. A real environment might have 0 mobile
 * applications while having 67 hosts. When *every* category reports zero at once,
 * that is the entity model failing, not an empty estate — nobody runs a Dynatrace
 * environment with no hosts, no services and no processes while metrics flow.
 */

export type EntityModelState = 'available' | 'unavailable' | 'unknown';

export interface EntityModelDiagnosis {
  state: EntityModelState;
  /** Categories that reported a non-zero count. */
  populatedCategories: string[];
  /** Categories that reported exactly zero. */
  zeroCategories: string[];
  /** Shown to the user when the model is unavailable. */
  explanation: string | null;
}

const UNAVAILABLE_EXPLANATION =
  'Every entity category returned zero at once. Metrics and events from this environment are still ' +
  'arriving normally, so this is the entity model not answering rather than an environment with ' +
  'nothing in it. Counts are therefore reported as not measured, not as zero. Inventory, topology ' +
  'and technology sections depend on this model and will stay empty until it recovers; the ' +
  'metric-based and problem-based sections are unaffected.';

/**
 * Diagnoses the entity model from an inventory result.
 *
 * @param records rows from `cov.inventory`, each `{ category, value }`
 */
export function diagnoseEntityModel(records: readonly GrailRecord[]): EntityModelDiagnosis {
  if (records.length === 0) {
    return {
      state: 'unknown',
      populatedCategories: [],
      zeroCategories: [],
      explanation: null,
    };
  }

  const populatedCategories: string[] = [];
  const zeroCategories: string[] = [];

  for (const record of records) {
    const category = str(record, 'category');
    const value = num(record, 'value');
    if (category === null || value === null) continue;
    if (value > 0) populatedCategories.push(category);
    else zeroCategories.push(category);
  }

  // No usable rows at all: say nothing rather than guess.
  if (populatedCategories.length === 0 && zeroCategories.length === 0) {
    return { state: 'unknown', populatedCategories, zeroCategories, explanation: null };
  }

  if (populatedCategories.length === 0) {
    return {
      state: 'unavailable',
      populatedCategories,
      zeroCategories,
      explanation: UNAVAILABLE_EXPLANATION,
    };
  }

  return { state: 'available', populatedCategories, zeroCategories, explanation: null };
}

/**
 * True when a single category's zero should be read as a real measurement.
 *
 * Only meaningful when the model as a whole is answering. "Zero mobile
 * applications" is a finding; "zero hosts because nothing responded" is not.
 */
export function isMeasuredZero(diagnosis: EntityModelDiagnosis): boolean {
  return diagnosis.state === 'available';
}
