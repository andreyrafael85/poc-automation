import { num, type GrailRecord } from '../utils/records';

/**
 * Time series read from Grail `timeseries` / `makeTimeseries` records (3.2.3).
 *
 * A record carries `timeframe: {start, end}`, `interval` (nanoseconds, as a string) and one array
 * per series, aligned to `start + i × interval`. A `null` in the array is a bin the platform did
 * not fill (no data point), which is not a zero: it is kept as `null` and drawn as a gap.
 *
 * `convertQueryResultToTimeseries` (Strato) needs the raw result with field types; the Spectrum
 * area charts read the records the catalog hook already parsed, so they do it here, once, tested.
 */

export interface SeriesPoint {
  /** Start of the bin, epoch ms. */
  t: number;
  /** The value of the bin; `null` when the platform reported no value for it. */
  v: number | null;
}

/** The bin width of a timeseries record in milliseconds, or `null` when it is not readable. */
export function intervalMs(record: GrailRecord | undefined): number | null {
  const ns = num(record, 'interval');
  return ns === null || ns <= 0 ? null : ns / 1_000_000;
}

/** Reads one series of a timeseries record. Empty when the record or the field is not there. */
export function seriesOf(record: GrailRecord | undefined, field: string): SeriesPoint[] {
  if (record === undefined) return [];
  const values = record[field];
  const frame = record.timeframe as { start?: unknown } | undefined;
  const start = typeof frame?.start === 'string' ? Date.parse(frame.start) : NaN;
  const step = intervalMs(record);
  if (!Array.isArray(values) || !Number.isFinite(start) || step === null) return [];
  return values.map((raw, index) => {
    const value = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    return { t: start + index * step, v: value === null || !Number.isFinite(value) ? null : value };
  });
}

/**
 * Combines two aligned series bin by bin (a failure rate from failures and requests). A bin where
 * either side is missing, or where `combine` returns `null`, is missing in the result.
 */
export function combineSeries(
  a: readonly SeriesPoint[],
  b: readonly SeriesPoint[],
  combine: (left: number, right: number) => number | null,
): SeriesPoint[] {
  return a.map((point, index) => {
    const other = b[index];
    if (other === undefined || point.v === null || other.v === null || other.t !== point.t) return { t: point.t, v: null };
    return { t: point.t, v: combine(point.v, other.v) };
  });
}

/** Scales every value (microseconds to milliseconds, bytes to GiB). */
export function scaleSeries(points: readonly SeriesPoint[], factor: number): SeriesPoint[] {
  return points.map((point) => ({ t: point.t, v: point.v === null ? null : point.v * factor }));
}

export interface SeriesStats {
  /** Bins with a value. */
  measured: number;
  min: number | null;
  max: number | null;
  /** Mean over the bins with a value. */
  mean: number | null;
  /** Sum over the bins with a value (a count over the window, for count series). */
  sum: number | null;
  /** The last bin with a value. */
  last: SeriesPoint | null;
  /** The bin with the largest value (the first one, on a tie). */
  peak: SeriesPoint | null;
}

export function seriesStats(points: readonly SeriesPoint[]): SeriesStats {
  let measured = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;
  let last: SeriesPoint | null = null;
  let peak: SeriesPoint | null = null;
  for (const point of points) {
    if (point.v === null) continue;
    measured += 1;
    sum += point.v;
    min = min === null ? point.v : Math.min(min, point.v);
    if (max === null || point.v > max) {
      max = point.v;
      peak = point;
    }
    last = point;
  }
  return {
    measured,
    min,
    max,
    mean: measured === 0 ? null : sum / measured,
    sum: measured === 0 ? null : sum,
    last,
    peak,
  };
}

/**
 * A round ceiling for an axis: the smallest of 1, 2, 2.5 or 5 × 10ⁿ at or above `value`, so the
 * gridlines fall on numbers a reader can say aloud. Zero or less gives 1.
 */
export function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * base >= value - 1e-9 * base) return step * base;
  }
  return 10 * base;
}
