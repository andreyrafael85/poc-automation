import { num, parseTechnology, str, type GrailRecord } from '../utils/records';

/**
 * Reducers that turn a catalog query's records into the one figure a validation
 * point is claiming.
 *
 * Kept pure and free of React so each one can be unit tested against fabricated
 * records. That matters more here than anywhere else in the app: these numbers
 * are what a pillar uses to say "this was proven", so a reducer that quietly
 * returns zero instead of null would manufacture evidence.
 *
 * The distinction every reducer honours: **null means not measured**, and zero
 * means measured as zero. A pillar renders those two very differently.
 */

export type MetricUnit =
  | 'count'
  | 'percent'
  | 'duration-ns'
  | 'bytes'
  | 'microseconds'
  | 'text';

export type Reducer = (records: GrailRecord[]) => number | string | null;

/** Number of records the query returned. Always measurable, even at zero. */
export const countRecords: Reducer = (records) => records.length;

/**
 * Distinct technology families (Java, Node.js, ...) in a `proc.technologies` result, whose rows
 * are one per type, edition and version. Counting the rows would count every version again.
 */
export const distinctTechnologyFamilies: Reducer = (records) => {
  const families = new Set<string>();
  for (const record of records) {
    const type = parseTechnology(str(record, 'softwareTechnologies'))?.type;
    if (typeof type === 'string' && type !== '') families.add(type);
  }
  return families.size === 0 && records.length === 0 ? null : families.size;
};

/** Sum of a numeric field. Null when no record carries the field at all. */
export const sumOf =
  (field: string): Reducer =>
  (records) => {
    let total = 0;
    let seen = false;
    for (const record of records) {
      const value = num(record, field);
      if (value !== null) {
        total += value;
        seen = true;
      }
    }
    return seen ? total : null;
  };

/** Largest value of a numeric field. */
export const maxOf =
  (field: string): Reducer =>
  (records) => {
    let best: number | null = null;
    for (const record of records) {
      const value = num(record, field);
      if (value !== null && (best === null || value > best)) best = value;
    }
    return best;
  };

/** The field on the first record. Used for scalar-shaped queries. */
export const firstOf =
  (field: string): Reducer =>
  (records) => {
    const first = records[0];
    return first === undefined ? null : num(first, field);
  };

/** Distinct non-null values of a string field. */
export const distinctOf =
  (field: string): Reducer =>
  (records) => {
    const seen = new Set<string>();
    for (const record of records) {
      const value = str(record, field);
      if (value !== null && value !== '') seen.add(value);
    }
    return seen.size === 0 && records.length === 0 ? null : seen.size;
  };

/** Sum of `field` across records whose `keyField` matches one of `values`. */
export const sumWhere =
  (keyField: string, values: readonly string[], field: string): Reducer =>
  (records) => {
    const wanted = new Set(values.map((value) => value.toLowerCase()));
    let total = 0;
    let seen = false;
    for (const record of records) {
      const key = str(record, keyField);
      if (key === null || !wanted.has(key.toLowerCase())) continue;
      const value = num(record, field);
      if (value !== null) {
        total += value;
        seen = true;
      }
    }
    // A query that returned rows but none matching is a measured zero.
    return seen ? total : records.length > 0 ? 0 : null;
  };

/** The `value` column of `cov.inventory` for one category. */
export const inventoryCount =
  (category: string): Reducer =>
  (records) => {
    const row = records.find((record) => str(record, 'category') === category);
    return row === undefined ? null : num(row, 'value');
  };

/** Share of `numerator` in the total of `denominator`, as a percentage. */
export const percentOf =
  (numerator: string, denominator: string): Reducer =>
  (records) => {
    let top = 0;
    let bottom = 0;
    for (const record of records) {
      top += num(record, numerator) ?? 0;
      bottom += num(record, denominator) ?? 0;
    }
    if (bottom === 0) return null;
    return (top * 100) / bottom;
  };

/**
 * Share of records matching `values` on `keyField`, weighted by `weightField`.
 *
 * Used for "how many hosts are full-stack": the answer is a proportion of a
 * measured total, not a count of rows.
 */
export const percentWhere =
  (keyField: string, values: readonly string[], weightField: string): Reducer =>
  (records) => {
    const wanted = new Set(values.map((value) => value.toLowerCase()));
    let matched = 0;
    let total = 0;
    for (const record of records) {
      const weight = num(record, weightField) ?? 0;
      total += weight;
      const key = str(record, keyField);
      if (key !== null && wanted.has(key.toLowerCase())) matched += weight;
    }
    if (total === 0) return null;
    return (matched * 100) / total;
  };

/** The string field of the highest-ranked record, for "worst offender" figures. */
export const topName =
  (field: string): Reducer =>
  (records) => {
    const first = records[0];
    if (first === undefined) return null;
    return str(first, field);
  };
