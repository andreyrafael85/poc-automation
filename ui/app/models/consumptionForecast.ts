import { assumed } from '../config/assumptions';
import { seriesOf } from './series';
import type { GrailRecord } from '../utils/records';
import { str } from '../utils/records';

/**
 * Consumption by capability and its projection (3.2.5, milestone M5) — SE only.
 *
 * Read from the platform's own billing usage events (`cons.daily`), one series per capability in
 * its own unit. The projection is a straight line through the complete days (today is partial
 * and left out), rolled forward 30 and 365 days: volume only, labelled as a projection, with no
 * seasonality. Money is not computed here.
 */

export type ConsumptionUnit =
  | 'gibHours'
  | 'hostHours'
  | 'podHours'
  | 'containerHours'
  | 'sessions'
  | 'requests'
  | 'actions'
  | 'invocations'
  | 'dataPoints'
  | 'bytes'
  | 'bytesRetained'
  | 'events';

/** The unit each capability bills in (validated on the lab tenant, 2026-10-05). */
export function capabilityUnit(capability: string): ConsumptionUnit {
  if (/ - Retain$/.test(capability)) return 'bytesRetained';
  if (/ - (Ingest & Process|Query)$/.test(capability)) return capability.startsWith('Metrics') ? 'dataPoints' : 'bytes';
  switch (capability) {
    case 'Full-Stack Monitoring':
    case 'Runtime Vulnerability Analytics':
    case 'Runtime Application Protection':
      return 'gibHours';
    case 'Infrastructure Monitoring':
      return 'hostHours';
    case 'Kubernetes Platform Monitoring':
      return 'podHours';
    case 'Code Monitoring':
      return 'containerHours';
    case 'Real User Monitoring':
      return 'sessions';
    case 'HTTP Monitor':
      return 'requests';
    case 'Browser Monitor or Clickpath':
      return 'actions';
    default:
      return capability.startsWith('AppEngine Functions') ? 'invocations' : 'events';
  }
}

/** Least-squares line through `values` (x = 0, 1, …). */
export function linearFit(values: readonly number[]): { slope: number; intercept: number } | null {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, x) => {
    numerator += (x - meanX) * (value - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = denominator === 0 ? 0 : numerator / denominator;
  return { slope, intercept: meanY - slope * meanX };
}

/** The sum of the line over the next `days` days, never below zero on any day. */
export function projectForward(fit: { slope: number; intercept: number }, fromX: number, days: number): number {
  let total = 0;
  for (let x = fromX; x < fromX + days; x += 1) total += Math.max(0, fit.intercept + fit.slope * x);
  return total;
}

/** The minimum of complete days a projection is drawn from (assumption registry). */
export const MIN_PROJECTION_DAYS = assumed('windows.projectionMinDays');

export interface CapabilityConsumption {
  capability: string;
  unit: ConsumptionUnit;
  /** Daily usage over the complete days, oldest first. */
  daily: number[];
  /** Today so far (partial). */
  today: number | null;
  /** Mean of the last seven complete days. */
  last7Avg: number | null;
  /** Change of the daily usage over the window, % (from the fitted line, first day to last). */
  trendPct: number | null;
  /** Projected usage over the next 30 and 365 days; null below the minimum of complete days. */
  next30: number | null;
  next365: number | null;
}

/**
 * Per capability, from the `cons.daily` records. Retained bytes are summed snapshots (one per hour
 * and bucket), so a day's figure is divided by 24 to read as the bytes held that day on average.
 */
export function summariseConsumption(records: readonly GrailRecord[]): CapabilityConsumption[] {
  const rows: CapabilityConsumption[] = [];
  for (const record of records) {
    const capability = str(record, 'event.type');
    if (capability === null) continue;
    const unit = capabilityUnit(capability);
    const points = seriesOf(record, unit === 'events' ? 'events' : 'amount');
    if (points.length === 0) continue;
    const values = points.map((point) => {
      const value = point.v ?? 0;
      return unit === 'bytesRetained' ? value / 24 : value;
    });
    const daily = values.slice(0, -1);
    const today = values.length > 0 ? (values[values.length - 1] ?? null) : null;
    const last7 = daily.slice(-7);
    const fit = daily.length >= MIN_PROJECTION_DAYS ? linearFit(daily) : null;
    const startValue = fit === null ? null : fit.intercept;
    const endValue = fit === null ? null : fit.intercept + fit.slope * (daily.length - 1);
    rows.push({
      capability,
      unit,
      daily,
      today,
      last7Avg: last7.length === 0 ? null : last7.reduce((sum, value) => sum + value, 0) / last7.length,
      trendPct: startValue === null || endValue === null || startValue <= 0 ? null : ((endValue - startValue) / startValue) * 100,
      next30: fit === null ? null : projectForward(fit, daily.length, 30),
      next365: fit === null ? null : projectForward(fit, daily.length, 365),
    });
  }
  // Largest relative footprint first is meaningless across units; the order is by name, stable.
  return rows.sort((a, b) => a.capability.localeCompare(b.capability));
}
