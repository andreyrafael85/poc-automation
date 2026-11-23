import { LOCALE_TAG, type Locale, type StringKey } from '../../../../i18n/strings';
import type { AnalysisCtx, EvidencePack, EvidenceQueryId, EvidenceWindow, PrintRecord, SourceKind, Sourced } from '../types';

/**
 * Provenance and formatting of every number in the real-prints deck (3.2.7, spec §4.9).
 *
 * A number reaches an analysis, a legend or a story only as a `Sourced` value: its display already
 * formatted in the deck's locale, its source (DQL, Davis, RUM, the screen, the app), the query it
 * came from, the window it was read over and whether the read was partial ("(pelo menos)"). The
 * KPI footer and the window labels are built here too, so "DQL · incidente 22/09 22:14–23:24 UTC"
 * reads the same on every slide. Instants are shown in the deck's zone with its short name
 * (`timeZoneName`), so a legend time matches the screen it sits on.
 */

/** How a value displays; `score` is a unitless fraction (CLS, up to 3 decimals), `instant` an ISO time shown as 'HH:mm' + zone, `text` a name as given. */
export type SourcedUnit = 'count' | 'ms' | 's' | 'pct' | 'ratio' | 'per100' | 'gib' | 'cores' | 'min' | 'score' | 'instant' | 'text';

export interface SourcedOptions {
  partial?: boolean;
  estimate?: boolean;
  unit?: SourcedUnit;
  /** When the value was read (`ExecutedQuery.readAtIso`). */
  collectedAtIso?: string | null;
}

const tagOf = (locale: Locale) => LOCALE_TAG[locale];

/** A valid IANA zone, or UTC (an unknown zone would make `Intl` throw in front of the customer). */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (typeof timeZone !== 'string' || timeZone === '') return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** A number in the locale with between `min` and `max` decimals. */
export function formatDecimal(value: number, locale: Locale, max: number, min = 0): string {
  return new Intl.NumberFormat(tagOf(locale), { minimumFractionDigits: min, maximumFractionDigits: max }).format(value);
}

/** A count: whole numbers grouped ("12.344" / "12,344"); a fraction keeps one decimal ("621,5"). */
export function formatCount(value: number, locale: Locale): string {
  return formatDecimal(value, locale, Number.isInteger(value) ? 0 : 1);
}

/** ≥ 10 → '27×' (whole); < 10 → '3,0×' (pt-BR) / '3.0×' (en), one decimal. */
export function formatRatio(x: number, locale: Locale): string {
  // Decided on the shown value, so 9.96 reads "10×", never "10,0×".
  const tenth = Math.round(x * 10) / 10;
  return tenth >= 10 ? `${formatDecimal(Math.round(x), locale, 0)}×` : `${formatDecimal(tenth, locale, 1, 1)}×`;
}

/** A percentage given in percent: '2,8 %' (pt-BR) / '2.8%' (en); two decimals below 1 % ('0,28 %'). */
export function formatPct(value: number, locale: Locale): string {
  const digits = Math.abs(value) < 1 && value !== 0 ? 2 : 1;
  const text = formatDecimal(value, locale, digits);
  return locale === 'pt-BR' ? `${text} %` : `${text}%`;
}

/**
 * A duration given in milliseconds: '5,61 ms' below 10, '51,7 ms' below 100, '4.979 ms' below 10 s;
 * from 10 s on in seconds ('20,7 s', '117 s'), and from 10 min on in minutes ('12,5 min') — never
 * '116.597 ms' for a p90 of two minutes (3.2.7 review UX-L4).
 */
export function formatMs(value: number, locale: Locale): string {
  const abs = Math.abs(value);
  if (abs >= 600_000) return `${formatDecimal(value / 60_000, locale, 1)} min`;
  if (abs >= 10_000) return `${formatDecimal(value / 1000, locale, abs < 99_950 ? 1 : 0)} s`;
  const digits = abs < 10 ? 2 : abs < 100 ? 1 : 0;
  return `${formatDecimal(value, locale, digits)} ms`;
}

function parts(iso: string, locale: Locale, timeZone: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return {};
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat(tagOf(locale), { ...options, timeZone: safeTimeZone(timeZone) }).formatToParts(date)) out[part.type] = part.value;
  return out;
}

/** 'HH:mm' in the zone (24 h), for chart axes. */
export function formatClock(iso: string, locale: Locale, timeZone: string): string {
  const p = parts(iso, locale, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return p.hour === undefined ? iso : `${p.hour}:${p.minute ?? '00'}`;
}

/** The zone's short name at that instant ('UTC', 'GMT-3'). */
export function zoneName(iso: string, locale: Locale, timeZone: string): string {
  return parts(iso, locale, timeZone, { hour: '2-digit', timeZoneName: 'short' }).timeZoneName ?? safeTimeZone(timeZone);
}

/** An instant: 'HH:mm' plus the zone's short name ('22:57 UTC'). */
export function formatInstant(iso: string, locale: Locale, timeZone: string): string {
  const clock = formatClock(iso, locale, timeZone);
  return clock === iso ? iso : `${clock} ${zoneName(iso, locale, timeZone)}`;
}

/** 'dd/MM' of an instant in the zone (the date of that instant, not a UTC calendar bin). */
function dayOf(iso: string, locale: Locale, timeZone: string): string {
  const p = parts(iso, locale, timeZone, { day: '2-digit', month: '2-digit' });
  return p.day === undefined ? '' : `${p.day}/${p.month ?? ''}`;
}

/** 'dd/MM HH:mm' plus the zone ('05/10 18:58 UTC'): when a print was captured. */
export function formatDayTime(iso: string, locale: Locale, timeZone: string): string {
  const day = dayOf(iso, locale, timeZone);
  return day === '' ? iso : `${day} ${formatInstant(iso, locale, timeZone)}`;
}

/** '22/09 22:14–23:24 UTC'; a window across midnight names both days ('22/09 21:57–23/09 00:09 UTC'). */
export function windowLabel(window: EvidenceWindow, locale: Locale, timeZone: string): string {
  const startDay = dayOf(window.startIso, locale, timeZone);
  const endDay = dayOf(window.endIso, locale, timeZone);
  const start = formatClock(window.startIso, locale, timeZone);
  const end = formatClock(window.endIso, locale, timeZone);
  const zone = zoneName(window.endIso, locale, timeZone);
  return startDay === endDay ? `${startDay} ${start}–${end} ${zone}` : `${startDay} ${start}–${endDay} ${end} ${zone}`;
}

/**
 * The window as a reader names it: "incidente 22/09 22:14–23:24 UTC", "problema …", "15 dias",
 * "janela da consulta: 30 min até 18:58 UTC", or "30 min observados na tela até …" when the
 * screen's own label was read. `noEvents`: W was anchored on the problem's start (B1 not ok).
 */
export function windowText(window: EvidenceWindow, ctx: AnalysisCtx, opts: { noEvents?: boolean } = {}): string {
  const range = windowLabel(window, ctx.locale, ctx.timeZone);
  switch (window.kind) {
    case 'incident':
      return ctx.t(opts.noEvents === true ? 'prt.win.noEvents' : 'prt.win.incident', { range });
    case 'problem':
      return ctx.t('prt.win.problem', { range });
    case 'screen': {
      const at = formatInstant(window.endIso, ctx.locale, ctx.timeZone);
      return ctx.t(window.source === 'screen-label' ? 'prt.win.screenObserved' : 'prt.win.screenDefault', { minutes: String(window.minutes), at });
    }
    case 'recurrence':
      return ctx.t('prt.win.recurrence');
    case 'day':
      return ctx.t('prt.win.day');
    case 'global':
    case 'events':
      return ctx.t('prt.win.app', { label: range });
  }
}

/**
 * W lacks its first event — it was anchored on the problem's start, and its label says "(sem
 * eventos)" — when the pack's problem read carried no event, or when that read (B1) was not ok
 * (refused, failed or empty), as `incidentWindow` then had no event to anchor on.
 */
export function noEventsOf(pack: Pick<EvidencePack, 'problem' | 'queries'> | null): boolean {
  if (pack === null) return false;
  if (pack.problem !== undefined) return pack.problem.events.length === 0;
  const read = pack.queries.find((query) => query.id === 'ev.problem.events');
  return read !== undefined && read.outcome !== 'ok' && read.outcome !== 'partial';
}

const SOURCE_KEY: Readonly<Record<SourceKind, StringKey>> = {
  dql: 'prt.src.dql',
  davis: 'prt.src.davis',
  rum: 'prt.src.rum',
  screen: 'prt.src.screen',
  app: 'prt.src.app',
};

/** "{source} · {window}", plus " · leitura parcial" when the read was partial (the KPI footer). */
export function sourceFooter(value: Pick<Sourced<unknown>, 'source' | 'window' | 'quality'>, ctx: AnalysisCtx, opts: { noEvents?: boolean } = {}): string {
  const window = value.window === null ? '—' : windowText(value.window, ctx, opts);
  const footer = ctx.t(SOURCE_KEY[value.source], { window });
  return value.quality === 'partial' ? `${footer} · ${ctx.t('prt.src.partial')}` : footer;
}

function displayOf(value: unknown, unit: SourcedUnit, ctx: AnalysisCtx): string {
  if (value === null || value === undefined) return '—';
  if (unit === 'instant' && typeof value === 'string') return formatInstant(value, ctx.locale, ctx.timeZone);
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const { locale } = ctx;
  switch (unit) {
    case 'count':
      return formatCount(value, locale);
    case 'ms':
      return formatMs(value, locale);
    case 's':
      return `${formatDecimal(value, locale, 1, 1)} s`;
    case 'pct':
      return formatPct(value, locale);
    case 'ratio':
      return formatRatio(value, locale);
    case 'per100':
      return ctx.t('prt.an.unit.per100', { value: formatDecimal(value, locale, 2) });
    case 'gib':
      return `${formatDecimal(value, locale, 1)} GiB`;
    case 'cores':
      return formatDecimal(value, locale, Math.abs(value) < 1 ? 2 : 1);
    case 'min':
      return `${formatCount(value, locale)} min`;
    case 'score':
      return formatDecimal(value, locale, 3);
    case 'instant':
    case 'text':
      return formatCount(value, locale);
  }
}

/**
 * A value with its provenance. The display is formatted by `unit` in the deck's locale; a partial
 * count reads "{n} (pelo menos)". Every value is also recorded in `ctx.numbers` for the number lint.
 */
export function sourced<T>(
  value: T | null,
  source: SourceKind,
  queryId: Sourced['queryId'],
  window: EvidenceWindow | null,
  ctx: AnalysisCtx,
  opts: SourcedOptions = {},
): Sourced<T> {
  const unit = opts.unit ?? (typeof value === 'number' ? 'count' : 'text');
  let display = displayOf(value, unit, ctx);
  if (opts.partial === true && value !== null && (unit === 'count' || unit === 'min')) display = ctx.t('prt.src.atLeast', { value: display });
  const out: Sourced<T> = {
    value,
    display,
    source,
    queryId,
    window,
    collectedAtIso: opts.collectedAtIso ?? null,
    quality: opts.partial === true ? 'partial' : opts.estimate === true ? 'estimate' : 'exact',
  };
  ctx.numbers.set(`${String(queryId)}#${ctx.numbers.size}`, out as Sourced<number | string>);
  return out;
}

/** How a pack's query was read: its window, whether partial, and when. */
export function readOf(pack: Pick<EvidencePack, 'queries'>, id: EvidenceQueryId | Sourced['queryId']): { partial: boolean; collectedAtIso: string | null } {
  const query = pack.queries.find((item) => item.id === id);
  return { partial: query?.outcome === 'partial', collectedAtIso: query?.readAtIso ?? null };
}

/** The deck's zone: the most common capture zone among the kept prints, else the viewer's own. */
export function deckTimeZone(prints: readonly Pick<PrintRecord, 'captureTimeZone'>[], viewer?: string): string {
  const counts = new Map<string, number>();
  for (const print of prints) {
    if (print.captureTimeZone === null || safeTimeZone(print.captureTimeZone) !== print.captureTimeZone) continue;
    counts.set(print.captureTimeZone, (counts.get(print.captureTimeZone) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [zone, count] of counts) if (best === null || count > (counts.get(best) ?? 0)) best = zone;
  return best ?? safeTimeZone(viewer ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
}
