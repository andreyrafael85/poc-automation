import { assumed } from '../config/assumptions';
import { decimal } from './activeLocale';

/**
 * Timeframe helpers.
 *
 * Relative windows are resolved to ISO timestamps here so they can travel as the
 * `defaultTimeframeStart` / `defaultTimeframeEnd` request fields. A timeframe is
 * never interpolated into DQL text.
 */

const RELATIVE_PATTERN = /^now-(\d+)(m|h|d|w)$/;

const UNIT_MS = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
} as const;

export interface ResolvedTimeframe {
  startIso: string;
  endIso: string;
  /** Human-readable window shown next to every figure, in English. */
  label: string;
  /**
   * The relative expression this window came from, e.g. `now-24h`.
   *
   * Kept so the UI can translate the window label instead of printing the
   * English one inside a Portuguese sentence.
   */
  expression: string;
}

/**
 * Resolves a `now-<n><unit>` expression against a reference instant.
 *
 * Only this exact shape is accepted. Anything else throws rather than silently
 * widening the window, because an accidentally huge timeframe is both a cost and
 * a correctness problem.
 */
export function resolveRelative(expression: string, label: string, now: Date = new Date()): ResolvedTimeframe {
  const match = RELATIVE_PATTERN.exec(expression);
  if (!match) {
    throw new Error(
      `Unsupported relative timeframe "${expression}". Expected the form now-<number><m|h|d|w>.`,
    );
  }
  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_MS;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Relative timeframe "${expression}" must use a positive amount.`);
  }
  const end = now.getTime();
  const start = end - amount * UNIT_MS[unit];
  return {
    startIso: new Date(start).toISOString(),
    endIso: new Date(end).toISOString(),
    label,
    expression,
  };
}

/**
 * Presets offered by the app. Conservative by design: 24 h is the default.
 *
 * 30 days is the widest window, and it exists because a downloadable report
 * needs it. It carries a cost warning: the problem history is the most expensive
 * table this app reads, and scan volume scales roughly linearly with the window.
 */
export const TIMEFRAME_PRESETS = [
  { expression: 'now-1h', labelKey: 'timeframe.now-1h', costWarning: false },
  { expression: 'now-6h', labelKey: 'timeframe.now-6h', costWarning: false },
  { expression: 'now-24h', labelKey: 'timeframe.now-24h', costWarning: false },
  { expression: 'now-7d', labelKey: 'timeframe.now-7d', costWarning: false },
  { expression: 'now-30d', labelKey: 'timeframe.now-30d', costWarning: true },
] as const;

/** Widest window the app will report over, stated as a hard boundary. */
export const MAX_REPORT_DAYS = assumed('windows.maxReportDays');

export function hasCostWarning(expression: string): boolean {
  return TIMEFRAME_PRESETS.find((preset) => preset.expression === expression)?.costWarning ?? false;
}

/** Whole days covered by a resolved window, used to enforce the report bound. */
export function windowDays(timeframe: ResolvedTimeframe): number {
  const start = new Date(timeframe.startIso).getTime();
  const end = new Date(timeframe.endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return (end - start) / 86_400_000;
}

export type TimeframePresetExpression = (typeof TIMEFRAME_PRESETS)[number]['expression'];

export const DEFAULT_TIMEFRAME: TimeframePresetExpression = 'now-24h';

/** Formats a nanosecond duration, the unit Grail uses for event durations. */
export function formatNanos(nanos: number | null | undefined): string {
  if (nanos === null || nanos === undefined || !Number.isFinite(nanos)) return '—';
  const ms = nanos / 1_000_000;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 90) return `${decimal(seconds, 1)} s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${decimal(minutes, 1)} min`;
  return `${decimal(minutes / 60, 1)} h`;
}

/** Formats a microsecond duration, the unit of dt.service.request.response_time. */
export function formatMicros(micros: number | null | undefined): string {
  if (micros === null || micros === undefined || !Number.isFinite(micros)) return '—';
  return formatNanos(micros * 1000);
}

/** Byte formatter using decimal units, matching how Grail reports billed bytes. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log10(Math.abs(bytes)) / 3), units.length - 1);
  const scaled = bytes / 1000 ** exponent;
  return `${decimal(scaled, scaled >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
