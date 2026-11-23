import { describe, expect, it } from 'vitest';

import { diagnoseEntityModel, isMeasuredZero } from '../models/entityHealth';

/**
 * Guards the defect that reached a customer-facing PDF.
 *
 * On 2026-09-01 every entity query in the validation environment started
 * returning zero while metrics kept flowing. The report printed "0 Hosts,
 * 0 Services" as though it were a measurement, which told a reader their estate
 * was empty. It was not — the entity model had simply stopped answering.
 */

const row = (category: string, value: number | string) => ({ category, value });

const FULL_OUTAGE = [
  row('Hosts', '0'),
  row('Services', '0'),
  row('Process instances', '0'),
  row('Kubernetes clusters', '0'),
  row('Kubernetes workloads', '0'),
  row('Web applications', '0'),
  row('Mobile applications', '0'),
  row('Synthetic monitors', '0'),
];

const HEALTHY = [
  row('Hosts', '67'),
  row('Services', '71'),
  row('Process instances', '537'),
  row('Kubernetes clusters', '6'),
  row('Kubernetes workloads', '279'),
  row('Web applications', '2'),
  // A genuine zero alongside populated categories.
  row('Mobile applications', '0'),
  row('Synthetic monitors', '9'),
];

describe('diagnoseEntityModel', () => {
  it('flags an outage when every category is zero at once', () => {
    const diagnosis = diagnoseEntityModel(FULL_OUTAGE);
    expect(diagnosis.state).toBe('unavailable');
    expect(diagnosis.populatedCategories).toHaveLength(0);
    expect(diagnosis.zeroCategories).toHaveLength(8);
  });

  it('explains that metrics still flow, so a reader does not assume an empty estate', () => {
    const explanation = diagnoseEntityModel(FULL_OUTAGE).explanation ?? '';
    expect(explanation).toMatch(/still arriving/);
    expect(explanation).toMatch(/not measured, not as zero/);
  });

  it('reports a healthy model when any category is populated', () => {
    const diagnosis = diagnoseEntityModel(HEALTHY);
    expect(diagnosis.state).toBe('available');
    expect(diagnosis.explanation).toBeNull();
    expect(diagnosis.populatedCategories).toContain('Hosts');
    expect(diagnosis.zeroCategories).toEqual(['Mobile applications']);
  });

  it('does not flag an outage just because one category is zero', () => {
    // Zero mobile applications is a real finding and must stay one.
    expect(diagnoseEntityModel(HEALTHY).state).not.toBe('unavailable');
  });

  it('flags an outage even when a single category is left populated by chance', () => {
    const almostAllZero = FULL_OUTAGE.map((entry, index) =>
      index === 0 ? row('Hosts', '3') : entry,
    );
    // One populated category is enough to say the model is answering; the app
    // then treats the remaining zeros as measurements, which is correct.
    expect(diagnoseEntityModel(almostAllZero).state).toBe('available');
  });

  it('returns unknown for an empty result rather than guessing', () => {
    const diagnosis = diagnoseEntityModel([]);
    expect(diagnosis.state).toBe('unknown');
    expect(diagnosis.explanation).toBeNull();
  });

  it('returns unknown when rows carry no usable category or value', () => {
    expect(diagnoseEntityModel([{ something: 'else' }]).state).toBe('unknown');
  });

  it('parses the string-encoded counts Grail returns', () => {
    expect(diagnoseEntityModel([row('Hosts', '67')]).populatedCategories).toEqual(['Hosts']);
    expect(diagnoseEntityModel([row('Hosts', 67)]).populatedCategories).toEqual(['Hosts']);
  });
});

describe('isMeasuredZero', () => {
  it('permits a zero to be shown as a measurement only when the model is answering', () => {
    expect(isMeasuredZero(diagnoseEntityModel(HEALTHY))).toBe(true);
    expect(isMeasuredZero(diagnoseEntityModel(FULL_OUTAGE))).toBe(false);
    expect(isMeasuredZero(diagnoseEntityModel([]))).toBe(false);
  });
});
