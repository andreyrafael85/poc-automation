import { assumed } from '../config/assumptions';
import { num, str, type GrailRecord } from '../utils/records';
import { seriesOf, type SeriesPoint } from './series';

/**
 * The PoC Timeline's baseline (3.2.5, milestone M5), reconstructed from Grail instead of from
 * snapshots: the entity model answers "what existed on Day 0" for a past window, and problems are
 * binned by the day they began. Nothing here is stored; every figure is read again on demand and
 * says which day it was read for.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The categories compared Day 0 → today (the Overview's, minus the ones a PoC rarely moves). */
export const BASELINE_CATEGORIES = ['Hosts', 'Services', 'Process instances', 'Kubernetes workloads', 'Web applications', 'Synthetic monitors'] as const;

export type BaselineCategory = (typeof BASELINE_CATEGORIES)[number];

export interface CategoryDelta {
  category: BaselineCategory;
  day0: number | null;
  today: number | null;
  /** today − day0, when both were read. */
  delta: number | null;
}

const countOf = (records: readonly GrailRecord[], category: string): number | null =>
  records.length === 0 ? null : num(records.find((record) => str(record, 'category') === category), 'value');

/** Day 0 against today, per category. A category missing from either read is not compared. */
export function inventoryDeltas(day0: readonly GrailRecord[], today: readonly GrailRecord[]): CategoryDelta[] {
  return BASELINE_CATEGORIES.map((category) => {
    const before = countOf(day0, category);
    const now = countOf(today, category);
    return { category, day0: before, today: now, delta: before === null || now === null ? null : now - before };
  });
}

export interface ProblemDay {
  /** UTC midnight of the day, ms. */
  day: number;
  opened: number;
  closed: number;
  /** Total time to resolve of the problems that began that day and are closed, ns. */
  closedNs: number;
  rootCaused: number;
}

/**
 * The days of the PoC, from the start date to today, with the problems that began on each. A day
 * with no problem is a zero, not a gap (the query returns only days that had one); days before the
 * start date — a problem active in the window can have begun earlier — are dropped.
 */
export function problemDays(records: readonly GrailRecord[], startDate: string, now: Date = new Date()): ProblemDay[] {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  if (!Number.isFinite(start) || start > today) return [];
  const byDay = new Map<number, ProblemDay>();
  for (const record of records) {
    const raw = str(record, 'day');
    const day = raw === null ? Number.NaN : Date.parse(raw);
    if (!Number.isFinite(day) || day < start || day > today) continue;
    byDay.set(day, {
      day,
      opened: num(record, 'opened') ?? 0,
      closed: num(record, 'closedCount') ?? 0,
      closedNs: num(record, 'closedNs') ?? 0,
      rootCaused: num(record, 'rootCaused') ?? 0,
    });
  }
  const days: ProblemDay[] = [];
  for (let day = start; day <= today; day += DAY_MS) days.push(byDay.get(day) ?? { day, opened: 0, closed: 0, closedNs: 0, rootCaused: 0 });
  return days;
}

export interface PeriodFigures {
  days: number;
  /** Problems that began per day, on average. */
  perDay: number;
  /** Mean time to resolve of the problems that began in the period and closed, hours. */
  mttrHours: number | null;
  closed: number;
}

export interface WeekComparison {
  /** Length of each compared period, days (7 once the PoC is two weeks old; less before). */
  span: number;
  first: PeriodFigures;
  latest: PeriodFigures;
  /** Change of the daily problem rate, %, latest against first (negative = fewer). */
  perDayChangePct: number | null;
  /** Change of MTTR, %, latest against first (negative = faster). */
  mttrChangePct: number | null;
}

function figures(days: readonly ProblemDay[]): PeriodFigures {
  const opened = days.reduce((sum, day) => sum + day.opened, 0);
  const closed = days.reduce((sum, day) => sum + day.closed, 0);
  const closedNs = days.reduce((sum, day) => sum + day.closedNs, 0);
  return { days: days.length, perDay: days.length === 0 ? 0 : opened / days.length, mttrHours: closed > 0 ? closedNs / closed / 3_600_000_000_000 : null, closed };
}

const change = (before: number | null, after: number | null): number | null =>
  before === null || after === null || before === 0 ? null : ((after - before) / before) * 100;

/**
 * The first days of the PoC against the latest complete ones (today is partial and left out).
 * The two periods never overlap: seven days each once there are fourteen complete days, half of the
 * complete days each before that, and no comparison below four complete days.
 */
export function compareWeeks(days: readonly ProblemDay[], now: Date = new Date()): WeekComparison | null {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const complete = days.filter((day) => day.day < today);
  if (complete.length < 4) return null;
  const span = Math.min(assumed('windows.pocCompareDays'), Math.floor(complete.length / 2));
  const first = figures(complete.slice(0, span));
  const latest = figures(complete.slice(-span));
  return {
    span,
    first,
    latest,
    perDayChangePct: change(first.perDay, latest.perDay),
    mttrChangePct: change(first.mttrHours, latest.mttrHours),
  };
}

export interface PocMilestone {
  kind: 'kickoff' | 'first-root-cause' | 'first-automation' | 'today' | 'planned-end';
  /** UTC midnight of the day, ms. */
  day: number;
  /** Where it falls between the first and the last milestone, 0–1. */
  position: number;
}

/**
 * The milestones the data can date: the kick-off (the start date), the first problem Davis traced
 * to a root cause, the first automation (3.2.6, `firstAutomationDay`), today, and the planned end.
 * Nothing is placed that the data cannot date.
 */
export function pocMilestones(
  startDate: string,
  endDate: string | null,
  days: readonly ProblemDay[],
  now: Date = new Date(),
  firstAutomation: number | null = null,
): PocMilestone[] {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const end = endDate === null ? null : Date.parse(`${endDate}T00:00:00.000Z`);
  const last = Math.max(today, end ?? today, start + DAY_MS);
  const at = (day: number) => Math.min(1, Math.max(0, (day - start) / (last - start)));
  const milestones: PocMilestone[] = [{ kind: 'kickoff', day: start, position: 0 }];
  const firstRoot = days.find((day) => day.rootCaused > 0);
  if (firstRoot !== undefined) milestones.push({ kind: 'first-root-cause', day: firstRoot.day, position: at(firstRoot.day) });
  if (firstAutomation !== null && firstAutomation >= start && firstAutomation <= today) {
    milestones.push({ kind: 'first-automation', day: firstAutomation, position: at(firstAutomation) });
  }
  milestones.push({ kind: 'today', day: today, position: at(today) });
  if (end !== null && Number.isFinite(end) && end > today) milestones.push({ kind: 'planned-end', day: end, position: at(end) });
  return milestones;
}

/** One mark on the track: every milestone of one day (on day 1 the kick-off is today). */
export interface TrackStop {
  day: number;
  position: number;
  kinds: PocMilestone['kind'][];
  /** The label row, 0 nearest the rail (3.2.6). */
  row: number;
}

/** Labels closer than this share no row (a fraction of the track; a label is ~140 px wide). */
export const TRACK_LABEL_GAP = 0.2;
export const TRACK_MAX_ROWS = 3;

/**
 * The milestones as marks: those of one day merge into one mark — two labels at one point were
 * drawn over each other (3.2.5, day 1) — and each mark takes the first row whose last label is far
 * enough behind it, or the row whose last label is farthest when none is.
 */
export function trackStops(milestones: readonly PocMilestone[]): TrackStop[] {
  const stops: TrackStop[] = [];
  for (const milestone of [...milestones].sort((a, b) => a.position - b.position)) {
    const same = stops.find((stop) => stop.day === milestone.day);
    if (same === undefined) stops.push({ day: milestone.day, position: milestone.position, kinds: [milestone.kind], row: 0 });
    else same.kinds.push(milestone.kind);
  }
  const lastInRow: number[] = [];
  for (const stop of stops) {
    let row = lastInRow.findIndex((last) => stop.position - last >= TRACK_LABEL_GAP);
    if (row < 0) row = lastInRow.length < TRACK_MAX_ROWS ? lastInRow.length : lastInRow.indexOf(Math.min(...lastInRow));
    lastInRow[row] = stop.position;
    stop.row = row;
  }
  return stops;
}

// ------------------------------------------------------------------ adoption (3.2.6)

/** The days of a daily series from the start date on, today (partial) flagged. */
function sinceStart(points: readonly SeriesPoint[], startDate: string, now: Date): { day: number; v: number | null; partial: boolean }[] {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  return points.filter((point) => point.t >= start && point.t <= today).map((point) => ({ day: point.t, v: point.v, partial: point.t === today }));
}

/**
 * The first day an automation succeeded during the PoC — only when none succeeded on its first
 * day: workflows that were already running before the PoC are not something it achieved.
 */
export function firstAutomationDay(signals: readonly GrailRecord[], startDate: string, now: Date = new Date()): number | null {
  const days = sinceStart(seriesOf(signals[0], 'succeeded'), startDate, now);
  if (days.length === 0 || (days[0]?.v ?? 0) > 0) return null;
  return days.find((day) => (day.v ?? 0) > 0)?.day ?? null;
}

export type AdoptionId = 'automation' | 'logs' | 'experience';

export interface AdoptionSignal {
  id: AdoptionId;
  /** Every day from the start date, oldest first (today partial, flagged). */
  days: { day: number; v: number | null; partial: boolean }[];
  /** Mean per day over the first and the latest complete days compared (as `compareWeeks`). */
  first: number | null;
  latest: number | null;
  /** latest against first, %; null when either is missing or the first is zero. */
  changePct: number | null;
  /** Days in each compared period (0 below four complete days: nothing compared). */
  span: number;
}

const meanOf = (values: readonly (number | null)[]): number | null => {
  const measured = values.filter((value): value is number => value !== null);
  return measured.length === 0 ? null : measured.reduce((sum, value) => sum + value, 0) / measured.length;
};

/** How the PoC is being adopted, day by day: automation runs, logs ingested, real-user actions. */
export function adoptionSignals(signals: readonly GrailRecord[], rum: readonly GrailRecord[], startDate: string, now: Date = new Date()): AdoptionSignal[] {
  const series: { id: AdoptionId; points: SeriesPoint[] }[] = [
    { id: 'automation', points: seriesOf(signals[0], 'executions') },
    { id: 'logs', points: seriesOf(signals[0], 'logBytes') },
    { id: 'experience', points: seriesOf(rum[0], 'actions') },
  ];
  return series
    .map(({ id, points }) => {
      const days = sinceStart(points, startDate, now);
      const complete = days.filter((day) => !day.partial);
      const span = complete.length < 4 ? 0 : Math.min(assumed('windows.pocCompareDays'), Math.floor(complete.length / 2));
      const first = span === 0 ? null : meanOf(complete.slice(0, span).map((day) => day.v));
      const latest = span === 0 ? null : meanOf(complete.slice(-span).map((day) => day.v));
      return { id, days, first, latest, changePct: change(first, latest), span };
    })
    .filter((signal) => signal.days.some((day) => (day.v ?? 0) > 0));
}
