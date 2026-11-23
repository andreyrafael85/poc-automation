import { num, str, type GrailRecord } from '../../utils/records';

/**
 * Platform adoption over time (3.4.7, owner's review of 3.4.6: "um gráfico de linha com picos de acessos" and
 * more detail). Two catalog reads of the same browser audit events the page already counts:
 *
 *  - `adopt.platform.trend` — distinct users and actions per day (UTC days);
 *  - `adopt.platform.hours` — actions per hour, folded here into weekday × hour in the viewer's own time zone.
 *
 * Both are bounded by the window (at most 31 and 720 rows), never cut, so every total here is exact. A day or an
 * hour without a row had no browser activity in a read that succeeded — that is a measured zero, and it is drawn
 * as one; a read that failed draws nothing.
 */

export interface DayUse {
  /** `YYYY-MM-DD` (UTC). */
  day: string;
  users: number;
  actions: number;
}

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Every day from `startIso` to `endIso` (UTC, inclusive), with the days the read returned and zeros between. */
export function toDailySeries(records: readonly GrailRecord[], startIso: string, endIso: string): DayUse[] {
  const byDay = new Map<string, DayUse>();
  for (const record of records) {
    const raw = str(record, 'day');
    if (raw === null) continue;
    const day = raw.slice(0, 10);
    byDay.set(day, { day, users: num(record, 'users') ?? 0, actions: num(record, 'actions') ?? 0 });
  }
  const start = Date.parse(`${startIso.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${endIso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  const out: DayUse[] = [];
  for (let at = start; at <= end; at += DAY_MS) {
    const day = isoDay(at);
    out.push(byDay.get(day) ?? { day, users: 0, actions: 0 });
  }
  return out;
}

export interface TrendSummary {
  days: number;
  activeDays: number;
  peakActions: DayUse | null;
  peakUsers: DayUse | null;
  /** Average actions on weekdays and on weekend days with or without activity (UTC calendar), null when none. */
  weekdayAvg: number | null;
  weekendAvg: number | null;
  totalActions: number;
}

export function summariseTrend(series: readonly DayUse[]): TrendSummary {
  const weekday: number[] = [];
  const weekend: number[] = [];
  let peakActions: DayUse | null = null;
  let peakUsers: DayUse | null = null;
  for (const entry of series) {
    const dow = new Date(`${entry.day}T00:00:00Z`).getUTCDay();
    (dow === 0 || dow === 6 ? weekend : weekday).push(entry.actions);
    if (entry.actions > 0 && (peakActions === null || entry.actions > peakActions.actions)) peakActions = entry;
    if (entry.users > 0 && (peakUsers === null || entry.users > peakUsers.users)) peakUsers = entry;
  }
  const avg = (values: number[]) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    days: series.length,
    activeDays: series.filter((entry) => entry.actions > 0).length,
    peakActions,
    peakUsers,
    weekdayAvg: avg(weekday),
    weekendAvg: avg(weekend),
    totalActions: series.reduce((sum, entry) => sum + entry.actions, 0),
  };
}

/** Weekday (0 = Sunday … 6 = Saturday) × hour (0–23) → actions, in the viewer's time zone. */
export type HourGrid = number[][];

export function toHourGrid(records: readonly GrailRecord[], offsetMinutes: number = new Date().getTimezoneOffset()): HourGrid {
  const grid: HourGrid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const record of records) {
    const raw = str(record, 'hour');
    const actions = num(record, 'actions');
    if (raw === null || actions === null) continue;
    const at = Date.parse(raw);
    if (!Number.isFinite(at)) continue;
    // `getTimezoneOffset` is minutes behind UTC (São Paulo: 180), so local = UTC − offset.
    const local = new Date(at - offsetMinutes * 60_000);
    const row = grid[local.getUTCDay()];
    if (row !== undefined) row[local.getUTCHours()] = (row[local.getUTCHours()] ?? 0) + actions;
  }
  return grid;
}

export interface GridPeak {
  weekday: number;
  hour: number;
  actions: number;
}

export function gridPeak(grid: HourGrid): GridPeak | null {
  let peak: GridPeak | null = null;
  grid.forEach((row, weekday) =>
    row.forEach((actions, hour) => {
      if (actions > 0 && (peak === null || actions > peak.actions)) peak = { weekday, hour, actions };
    }),
  );
  return peak;
}

/** The share of actions inside the working hours (08:00–18:59, Monday to Friday) in the viewer's time zone. */
export function workingHoursShare(grid: HourGrid): number | null {
  let inside = 0;
  let total = 0;
  grid.forEach((row, weekday) =>
    row.forEach((actions, hour) => {
      total += actions;
      if (weekday >= 1 && weekday <= 5 && hour >= 8 && hour <= 18) inside += actions;
    }),
  );
  return total === 0 ? null : (inside / total) * 100;
}

// ------------------------------------------------------------------ areas of the platform

export type PlatformArea = 'analytics' | 'infrastructure' | 'applications' | 'logs' | 'experience' | 'ai' | 'automation' | 'security' | 'platform' | 'other' | 'custom';

export const AREA_ORDER: readonly PlatformArea[] = ['analytics', 'infrastructure', 'applications', 'logs', 'experience', 'ai', 'automation', 'security', 'platform', 'other', 'custom'];

/** Prefixes of Dynatrace app ids (after `dynatrace.`) by area; first match wins. */
const AREA_RULES: readonly [PlatformArea, readonly string[]][] = [
  ['ai', ['davis', 'genai', 'copilot', 'intelligence']],
  ['analytics', ['dashboards', 'notebooks', 'investigations', 'queries', 'launchpad', 'reports']],
  ['automation', ['automations', 'workflows', 'site.reliability', 'srg', 'slo', 'service.level']],
  ['security', ['security', 'vulnerabilit', 'threat', 'kspm', 'attack', 'compliance']],
  ['experience', ['synthetic', 'frontend', 'rum', 'web', 'mobile', 'session', 'users', 'experience']],
  ['logs', ['logs', 'log.']],
  ['applications', ['services', 'distributedtracing', 'tracing', 'profiling', 'database', 'queues', 'messaging']],
  ['infrastructure', ['infraops', 'hosts', 'kubernetes', 'clouds', 'aws', 'azure', 'gcp', 'extensions', 'network', 'discovery', 'smartscape']],
  ['platform', ['hub', 'settings', 'openpipeline', 'iam', 'account', 'tokens', 'segments', 'storage', 'learn']],
];

export function areaOf(app: string, custom: boolean): PlatformArea {
  if (custom) return 'custom';
  const id = app.replace(/^dynatrace\./, '');
  for (const [area, prefixes] of AREA_RULES) if (prefixes.some((prefix) => id.startsWith(prefix))) return area;
  return 'other';
}

export interface AreaUse {
  area: PlatformArea;
  actions: number;
  apps: number;
  /** The most users of one app in the area: distinct users are not additive, so this is a floor, said as such. */
  usersAtLeast: number;
}

/** Sums actions by area over the full list of apps (the read is bounded by the apps installed, never cut). */
export function byArea(apps: readonly { app: string; actions: number; users: number; custom: boolean }[]): AreaUse[] {
  const out = new Map<PlatformArea, AreaUse>();
  for (const entry of apps) {
    const area = areaOf(entry.app, entry.custom);
    const current = out.get(area) ?? { area, actions: 0, apps: 0, usersAtLeast: 0 };
    current.actions += entry.actions;
    current.apps += 1;
    current.usersAtLeast = Math.max(current.usersAtLeast, entry.users);
    out.set(area, current);
  }
  return [...out.values()].sort((a, b) => b.actions - a.actions);
}
