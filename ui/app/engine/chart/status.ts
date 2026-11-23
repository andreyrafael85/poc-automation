/**
 * The status of a measured value against a review line (3.3.7, the chart engine).
 *
 * A status is a reading of a number against a line someone stated — the 1 % failure line, a
 * memory ceiling, a PoC criterion — never a colour picked for looks. It always travels with its
 * word (`STATUS_LABEL`) so colour never carries the meaning alone.
 */

export type ChartStatus = 'critical' | 'warning' | 'good';

/** Above the line is critical; within `warnShare` of it (default: from half the line) is a warning. */
export function statusAgainst(value: number, line: number, warnShare = 0.5): ChartStatus {
  if (!(line > 0)) return 'good';
  if (value > line) return 'critical';
  if (value >= line * warnShare) return 'warning';
  return 'good';
}

/** Highest first, so a list ordered by status reads "act on these first". */
export const STATUS_RANK: Record<ChartStatus, number> = { critical: 0, warning: 1, good: 2 };

export const STATUS_LABEL = {
  critical: 'chart.status.critical',
  warning: 'chart.status.warning',
  good: 'chart.status.good',
} as const;
