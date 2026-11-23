import { num, str, type GrailRecord } from '../utils/records';

/**
 * Problem arrivals over time, from `prob.timeline` (`bin(event.start, 6h)`).
 *
 * The query returns only the bins in which some problem began. A bin it does not return is not
 * unknown: the query looked and no problem started then, so it is a measured zero. Drawing the
 * returned rows side by side (as the 3.2.0 wrap-up trend did) closes those gaps up, and an
 * average over them counts only the busy periods.
 *
 * The series is a fixed run of bins ending at the bin that holds `endMs`. Rows for problems that
 * began before it (a problem active in the window may have started weeks earlier) fall outside
 * the run and are left out, which the captions say.
 */

export const ARRIVAL_BIN_MS = 6 * 60 * 60 * 1000;
/** Seven days of six-hour bins. */
export const ARRIVAL_BINS = 28;

export interface ArrivalBin {
  /** Start of the bin, epoch ms (Grail bins align to multiples of the interval since the epoch). */
  start: number;
  count: number;
}

export function arrivalSeries(
  records: readonly GrailRecord[],
  endMs: number,
  bins: number = ARRIVAL_BINS,
): ArrivalBin[] {
  const last = Math.floor(endMs / ARRIVAL_BIN_MS) * ARRIVAL_BIN_MS;
  const first = last - (bins - 1) * ARRIVAL_BIN_MS;
  const counts = new Map<number, number>();
  for (const record of records) {
    const at = Date.parse(str(record, 'interval') ?? '');
    if (!Number.isFinite(at)) continue;
    const start = Math.floor(at / ARRIVAL_BIN_MS) * ARRIVAL_BIN_MS;
    if (start < first || start > last) continue;
    counts.set(start, (counts.get(start) ?? 0) + (num(record, 'problems') ?? 0));
  }
  return Array.from({ length: bins }, (_, index) => {
    const start = first + index * ARRIVAL_BIN_MS;
    return { start, count: counts.get(start) ?? 0 };
  });
}

/** The busiest bin, or `null` when no problem began in the run. */
export function peakOf(series: readonly ArrivalBin[]): ArrivalBin | null {
  let peak: ArrivalBin | null = null;
  for (const bin of series) if (bin.count > 0 && (peak === null || bin.count > peak.count)) peak = bin;
  return peak;
}

export interface CalendarDay {
  /** Local midnight of the day, epoch ms. */
  date: number;
  /** One entry per period column; `null` where that period is outside the run (first/last day). */
  cells: (ArrivalBin | null)[];
  total: number;
}

export interface ArrivalCalendar {
  /** Local start hour of each six-hour column, ascending (e.g. 3, 9, 15, 21 in UTC−3). */
  periods: number[];
  days: CalendarDay[];
  /** The largest single cell, for the colour scale. */
  max: number;
  total: number;
  peak: ArrivalBin | null;
  busiestDay: CalendarDay | null;
}

/**
 * The same run of bins laid out as a calendar: one row per local day, one column per six-hour
 * period, so a reader can see both which day and which time of day problems start. Bins align to
 * the epoch in UTC; in the viewer's time zone they start at the same local hours every day, which
 * become the columns. A period of the first or last day that falls outside the run is `null`, not a
 * zero: nothing was asked about it.
 */
export function arrivalCalendar(series: readonly ArrivalBin[]): ArrivalCalendar {
  const localDay = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const periods = [...new Set(series.map((bin) => new Date(bin.start).getHours()))].sort((a, b) => a - b);
  const byDay = new Map<number, CalendarDay>();
  for (const bin of series) {
    const date = localDay(bin.start);
    let day = byDay.get(date);
    if (day === undefined) {
      day = { date, cells: periods.map(() => null), total: 0 };
      byDay.set(date, day);
    }
    day.cells[periods.indexOf(new Date(bin.start).getHours())] = bin;
    day.total += bin.count;
  }
  const days = [...byDay.values()].sort((a, b) => a.date - b.date);
  const busiestDay = days.reduce<CalendarDay | null>((best, day) => (day.total > 0 && (best === null || day.total > best.total) ? day : best), null);
  return {
    periods,
    days,
    max: Math.max(0, ...series.map((bin) => bin.count)),
    total: series.reduce((sum, bin) => sum + bin.count, 0),
    peak: peakOf(series),
    busiestDay,
  };
}

export interface ArrivalChange {
  /** Average arrivals per bin over the first and the second half of the run. */
  firstAvg: number;
  secondAvg: number;
  /** Positive when arrivals fell, negative when they rose, rounded to whole percent. */
  fallPct: number;
}

/**
 * How arrivals moved between the first and the second half of the run (3.2.3, the Executive
 * summary's "what changed"; the deck states the same line). Every bin counts, the quiet ones as
 * the zeros they are. `null` when the first half had no arrival to compare against.
 */
export function arrivalChange(series: readonly ArrivalBin[]): ArrivalChange | null {
  const half = Math.floor(series.length / 2);
  if (half === 0) return null;
  const avg = (bins: readonly ArrivalBin[]) => bins.reduce((sum, bin) => sum + bin.count, 0) / bins.length;
  const firstAvg = avg(series.slice(0, half));
  const secondAvg = avg(series.slice(half));
  if (firstAvg <= 0) return null;
  return { firstAvg, secondAvg, fallPct: Math.round(((firstAvg - secondAvg) / firstAvg) * 100) };
}
