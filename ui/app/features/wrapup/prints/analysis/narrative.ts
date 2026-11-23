import type { StringKey } from '../../../../i18n/strings';
import { ROOT_CALLER_LIMIT } from '../../../../models/trailLinks';
import { entityType } from '../../../../utils/deepLinks';
import { PRINT_BUDGET } from '../deck/budget';
import type { AnalysisVisual } from '../deck/slides';
import type {
  AnalysisContent,
  AnalysisCtx,
  AnalysisFinding,
  AnalysisKpi,
  Anomaly,
  AnomalyRuleId,
  CrossLink,
  CrossLinkId,
  EvidencePack,
  EvidenceQueryId,
  EvidenceWindow,
  ExecutedQuery,
  IncidentSnapshot,
  MinuteSeries,
  ShotSlot,
  Sourced,
  WindowKind,
} from '../types';
import { THRESHOLDS } from '../constants';
import {
  anchorFor,
  blastOf,
  capacitySignals,
  cascadeOf,
  churnSignals,
  endpointSignals,
  frontendSignals,
  headlineOf,
  hostSignals,
  isoAt,
  recurrenceSignals,
  serviceSignals,
  severityRank,
  subjectIdOf,
  vitalVerdict,
  type ServiceSignals,
  type Verdict,
} from './anomalies';
import { frontendEvent, linkFrom, tenantName } from './crossLinks';
import { formatClock, formatCount, noEventsOf, readOf, sourceFooter, sourced, windowText, type SourcedUnit } from './sourced';

/**
 * The analytic reading of one shot ("Leitura analítica", 3.2.7, spec §4.8): up to four KPIs, one
 * chart with the exact DQL that ran, three comparison findings, why it matters and two
 * recommendations — all translated, every number a `Sourced` value with its window.
 *
 * Findings are comparisons (a ratio, a share, a distance to a threshold, before and after), never a
 * verdict; each records the facts it prints, so the deck's number lint can check that every digit
 * on the slide came from a measured value. The three strongest are kept: by the severity of the
 * anomaly they cite (a cross-link counts as high), plain comparisons last, then in their order here. No analysis
 * slide when no required query was read, or fewer than two KPIs resolve.
 */

type Fact = Sourced<number | string>;

interface Candidate {
  key: StringKey;
  params: Record<string, Fact>;
  basis: AnomalyRuleId | CrossLinkId | null;
  /** Appended sentence (the D4 clause of f.p90). */
  suffix?: { key: StringKey; params: Record<string, Fact> };
}

interface Draft {
  kpis: AnalysisKpi[];
  visual: AnalysisVisual | null;
  visualQuery: { id: EvidenceQueryId | 'sec.posture'; windowKind?: WindowKind } | null;
  findings: Candidate[];
  matters: StringKey;
  reco: { key: StringKey; params: Record<string, string> }[];
}

const RULE_SEVERITY: Readonly<Record<AnomalyRuleId, Anomaly['severity']>> = {
  D1: 'critical',
  D3: 'high',
  D4: 'medium',
  D5a: 'high',
  D6: 'medium',
  D7: 'high',
  D8a: 'medium',
  D8b: 'medium',
  D9: 'medium',
  D11: 'medium',
  D13: 'high',
  D14: 'info',
  D15: 'critical',
  D16: 'medium',
  D17: 'info',
  D18: 'medium',
};

const isRule = (basis: AnomalyRuleId | CrossLinkId): basis is AnomalyRuleId => basis.startsWith('D');

/** Lower is stronger: the cited anomaly's severity (as detected), a cross-link as "high", a plain comparison last. */
function strength(basis: Candidate['basis'], anomalies: readonly Anomaly[]): number {
  if (basis === null) return 4;
  if (!isRule(basis)) return severityRank('high');
  const found = anomalies.find((anomaly) => anomaly.rule === basis);
  return severityRank(found?.severity ?? RULE_SEVERITY[basis]);
}

function render(candidate: Candidate, ctx: AnalysisCtx): AnalysisFinding {
  // Inline plurals (`{count|…|…}`) read the display too: only "1" is singular.
  const text = (key: StringKey, params: Record<string, Fact>) => ctx.t(key, Object.fromEntries(Object.entries(params).map(([name, fact]) => [name, fact.display])));
  let out = text(candidate.key, candidate.params);
  const facts = Object.values(candidate.params);
  if (candidate.suffix !== undefined) {
    const extra = `${out} ${text(candidate.suffix.key, candidate.suffix.params)}`;
    if (extra.length <= PRINT_BUDGET.finding) {
      out = extra;
      facts.push(...Object.values(candidate.suffix.params));
    }
  }
  return { text: out, facts, basis: candidate.basis };
}

// ------------------------------------------------------------------ small builders

function queryOf(pack: EvidencePack, id: EvidenceQueryId | 'sec.posture', windowKind?: WindowKind): ExecutedQuery | null {
  return pack.queries.find((query) => query.id === id && (windowKind === undefined || query.window?.kind === windowKind)) ?? null;
}

function makeFact(pack: EvidencePack, ctx: AnalysisCtx) {
  return (value: number | string | null, source: Sourced['source'], queryId: EvidenceQueryId | 'sec.posture', window: EvidenceWindow | null, unit?: SourcedUnit): Fact => {
    const read = readOf(pack, queryId);
    return sourced<number | string>(value, source, queryId, window, ctx, { ...(unit === undefined ? {} : { unit }), partial: read.partial, collectedAtIso: read.collectedAtIso });
  };
}

function kpi(label: string, value: Fact, ctx: AnalysisCtx, pack: EvidencePack, status?: Verdict): AnalysisKpi {
  const noEvents = value.window?.kind === 'incident' && noEventsOf(pack);
  return { label, value, ...(status === undefined ? {} : { status }), footer: sourceFooter(value, ctx, { noEvents }) };
}

/** The problem window as Davis states it (start … end, or the events window's end while open). */
function problemSpan(pack: EvidencePack): EvidenceWindow | null {
  const problem = pack.problem;
  if (problem === undefined) return pack.windows.problem ?? null;
  const end = problem.endIso ?? pack.windows.events?.endIso ?? problem.startIso;
  return { kind: 'problem', startIso: problem.startIso, endIso: end, source: 'derived', minutes: Math.round((Date.parse(end) - Date.parse(problem.startIso)) / 60_000) };
}

type RootKind = 'database' | 'service' | 'host';

export function rootKindOf(rootId: string | null, pack: Pick<EvidencePack, 'callers' | 'topology'>): RootKind {
  if (entityType(rootId) === 'HOST') return 'host';
  const type = pack.callers?.rootType ?? pack.topology?.blast?.rootType ?? null;
  return type === 'DATABASE_SERVICE' ? 'database' : 'service';
}

/** Minutes a zoomed chart keeps on each side of what it is about (3.2.7 review UX-M3). */
const ZOOM_PAD_MIN = 15;

/**
 * The minutes a chart is about: from 15 min before the first highlighted minute or marker to 15 min
 * after the last one, when that is at most half the series; else the whole series. A 5-minute
 * outage in a 7-hour incident window drew as a few pixels at the plot's edge, with every marker
 * rule on top of the other (3.2.7 review UX-M3).
 */
export function chartFocus(series: Pick<MinuteSeries, 'startIso' | 'stepMs'>, length: number, highlight: (index: number) => boolean, markers: readonly string[]): { from: number; to: number; zoomed: boolean } {
  const whole = { from: 0, to: Math.max(0, length - 1), zoomed: false };
  const start = Date.parse(series.startIso);
  if (length === 0 || !(series.stepMs > 0) || !Number.isFinite(start)) return whole;
  const marked = markers.map((iso) => Math.floor((Date.parse(iso) - start) / series.stepMs)).filter((index) => Number.isFinite(index) && index >= 0 && index < length);
  const lit = Array.from({ length }, (_, index) => index).filter((index) => highlight(index));
  const about = [...lit, ...marked];
  if (about.length === 0) return whole;
  const pad = Math.max(1, Math.round((ZOOM_PAD_MIN * 60_000) / series.stepMs));
  const from = Math.max(0, Math.min(...about) - pad);
  const to = Math.min(length - 1, Math.max(...about) + pad);
  return (to - from + 1) * 2 <= length ? { from, to, zoomed: true } : whole;
}

/**
 * A `columns` chart from per-minute series: at most the budget's 90 points (when W is longer, each
 * column is the worst minute of its bucket, so the unit stays "per minute" and a peak is never
 * diluted), the problem as a band, markers at given instants. When what the chart is about (the
 * highlighted minutes and the markers) covers at most half the series, it zooms on it
 * (`chartFocus`) and takes `zoomTitle`; a problem band wholly outside the zoom is not drawn.
 */
function columnsOf(
  series: MinuteSeries,
  values: (number | null)[],
  highlight: (index: number) => boolean,
  band: { startIso: string; endIso: string | null } | null,
  markers: string[],
  title: string,
  unit: string,
  ctx: AnalysisCtx,
  zoomTitle: string = title,
): Extract<AnalysisVisual, { kind: 'columns' }> {
  const focus = chartFocus(series, values.length, highlight, markers);
  const kept = values.slice(focus.from, focus.to + 1);
  const size = Math.max(1, Math.ceil(kept.length / PRINT_BUDGET.columns));
  const start = Date.parse(series.startIso);
  const rawIndexOf = (iso: string) => Math.floor((Date.parse(iso) - start) / series.stepMs);
  const indexOf = (iso: string) => Math.floor((rawIndexOf(iso) - focus.from) / size);
  const points: { label: string; value: number | null; highlight: boolean }[] = [];
  for (let from = 0; from < kept.length; from += size) {
    const slice = kept.slice(from, from + size);
    const measured = slice.filter((value): value is number => value !== null);
    points.push({
      label: formatClock(isoAt(series, focus.from + from), ctx.locale, ctx.timeZone),
      value: measured.length === 0 ? null : Math.max(...measured),
      highlight: slice.some((_, offset) => highlight(focus.from + from + offset)),
    });
  }
  const last = points.length - 1;
  const clamp = (index: number) => Math.min(last, Math.max(0, index));
  const max = points.reduce((best, point) => Math.max(best, point.value ?? 0), 0);
  // Zoomed, a band that ends before the first kept minute or starts after the last one is not on this chart.
  const bandOutside =
    band !== null && focus.zoomed && (rawIndexOf(band.startIso) > focus.to || (band.endIso !== null && rawIndexOf(band.endIso) < focus.from));
  return {
    kind: 'columns',
    title: focus.zoomed ? zoomTitle : title,
    unit,
    points,
    band: band === null || bandOutside ? null : { from: clamp(indexOf(band.startIso)), to: band.endIso === null ? last : clamp(indexOf(band.endIso)), label: ctx.t('prt.an.viz.band') },
    markers: markers
      .map((iso) => ({ at: indexOf(iso), label: formatClock(iso, ctx.locale, ctx.timeZone) }))
      .filter((marker) => marker.at >= 0 && marker.at <= last),
    maxLabel: formatCount(max, ctx.locale),
  };
}

const inRun = (run: { from: number; to: number } | null) => (index: number) => run !== null && index >= run.from && index <= run.to;

// ------------------------------------------------------------------ per kind

function problemDraft(slot: ShotSlot, pack: EvidencePack, ctx: AnalysisCtx): Draft | null {
  const incident = slot.incident;
  const problem = pack.problem;
  if (problem === undefined || incident === null) return null;
  const fact = makeFact(pack, ctx);
  const span = problemSpan(pack);
  const kpis: AnalysisKpi[] = [];
  if (problem.eventCount !== null) kpis.push(kpi(ctx.t('prt.an.kpi.events'), fact(problem.eventCount, 'davis', 'ev.problem.events', span), ctx, pack));
  if (problem.endIso !== null) {
    const minutes = Math.round((Date.parse(problem.endIso) - Date.parse(problem.startIso)) / 60_000);
    kpis.push(kpi(ctx.t('prt.an.kpi.duration', { id: incident.displayId }), fact(minutes, 'davis', 'ev.problem.events', span, 'min'), ctx, pack));
  }
  const users = usersFact(pack, ctx);
  if (users !== null) kpis.push(kpi(ctx.t(users.label), users.fact, ctx, pack));
  if (pack.recurrence?.anchorProblems != null) {
    kpis.push(kpi(ctx.t('prt.an.kpi.recurrence'), fact(pack.recurrence.anchorProblems, 'dql', 'ev.problem.recurrence', pack.windows.recurrence ?? null), ctx, pack));
  }

  const rootId = incident.rootCauseId;
  const W = pack.windows.incident ?? null;
  const rootName = tenantName(incident.rootCauseName ?? rootId, ctx);
  let visual: AnalysisVisual | null = null;
  const services = pack.services ?? [];
  const first = services[0];
  if (first !== undefined) {
    const sums = first.failures.values.map((_, index) => {
      const values = services.map((service) => service.failures.values[index] ?? null).filter((value): value is number => value !== null);
      return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
    });
    const outages = services.map((service) => serviceSignals(service, anchorFor(pack, service.requests)).outage);
    const markers = firstEventPerSource(pack).map((event) => event.startIso);
    visual = columnsOf(
      first.failures,
      sums,
      (index) => outages.some((run) => inRun(run)(index)),
      problem,
      markers,
      ctx.t('prt.an.viz.failuresPerMin', { name: rootName }),
      ctx.t('prt.an.viz.unitFailures'),
      ctx,
      ctx.t('prt.an.viz.failuresPerMinZoom', { name: rootName }),
    );
  }

  const findings: Candidate[] = [];
  const sigs = services.map((service) => serviceSignals(service, anchorFor(pack, service.requests)));
  const rootSig = sigs.find((sig) => sig.id === rootId && sig.outage !== null) ?? sigs.find((sig) => sig.outage !== null);
  if (rootSig?.outage != null) findings.push(outageCandidate(rootSig, pack, ctx, W));
  const recurrence = pack.recurrence === undefined ? null : recurrenceSignals(pack.recurrence, rootId);
  if (recurrence?.fires === true && recurrence.rank === 1 && recurrence.next !== null && recurrence.ratio !== null) {
    const window = pack.windows.recurrence ?? null;
    findings.push({
      key: 'prt.an.f.recurrence',
      basis: 'D13',
      params: {
        id: fact(incident.displayId, 'davis', 'ev.problem.events', span),
        root: fact(rootName, 'dql', 'ev.problem.recurrence', window),
        count: fact(recurrence.count, 'dql', 'ev.problem.recurrence', window),
        ratio: fact(recurrence.ratio, 'dql', 'ev.problem.recurrence', window, 'ratio'),
        second: fact(tenantName(recurrence.next.name, ctx), 'dql', 'ev.problem.recurrence', window),
        secondCount: fact(recurrence.next.problems, 'dql', 'ev.problem.recurrence', window),
      },
    });
  }
  const chain = chainCandidate(slot, pack, ctx);
  if (chain !== null) findings.push(chain);
  const usersFinding = usersCandidate(pack, ctx);
  if (usersFinding !== null) findings.push(usersFinding);

  const kind = rootKindOf(rootId, pack);
  const reco: Draft['reco'] = [
    kind === 'database'
      ? { key: 'prt.an.reco.dbReview', params: { root: rootName } }
      : kind === 'host'
        ? { key: 'prt.an.reco.hostReview', params: { host: rootName } }
        : { key: 'prt.an.reco.serviceReview', params: { root: rootName } },
    { key: 'prt.an.reco.workflow', params: {} },
  ];
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.service.minutes' }, findings, matters: 'prt.an.matters.problem', reco };
}

/**
 * Users during the problem: "RUM · Davis" ("30 · 52"), or one of the two alone. The label names the
 * source that produced the value, so a Davis-only number is never read as RUM users (3.2.7 review).
 */
function usersFact(pack: EvidencePack, ctx: AnalysisCtx): { fact: Fact; label: StringKey } | null {
  const rum = pack.frontend?.problem?.users ?? null;
  const davis = pack.problem?.davisUsers ?? null;
  const fact = makeFact(pack, ctx);
  if (rum !== null && davis !== null) {
    return { fact: fact(`${formatCount(rum, ctx.locale)} · ${formatCount(davis, ctx.locale)}`, 'rum', 'ev.frontend.summary', pack.windows.problem ?? problemSpan(pack)), label: 'prt.an.kpi.users' };
  }
  if (davis !== null) return { fact: fact(davis, 'davis', 'ev.problem.events', problemSpan(pack)), label: 'prt.an.kpi.usersDavis' };
  if (rum !== null) return { fact: fact(rum, 'rum', 'ev.frontend.summary', pack.windows.problem ?? null), label: 'prt.an.kpi.usersRum' };
  return null;
}

function usersCandidate(pack: EvidencePack, ctx: AnalysisCtx): Candidate | null {
  const summary = pack.frontend?.problem;
  const davis = pack.problem?.davisUsers ?? null;
  if (summary === undefined || summary.users === null || summary.sessions === null || davis === null || davis === summary.users) return null;
  const fact = makeFact(pack, ctx);
  const window = pack.windows.problem ?? null;
  return {
    key: 'prt.an.f.users',
    basis: null,
    params: {
      rum: fact(summary.users, 'rum', 'ev.frontend.summary', window),
      sessions: fact(summary.sessions, 'rum', 'ev.frontend.summary', window),
      davis: fact(davis, 'davis', 'ev.problem.events', problemSpan(pack)),
    },
  };
}

/** The first event of each source, in time order (the chain of D8: when each anomaly started). */
export function firstEventPerSource(pack: Pick<EvidencePack, 'problem'>): NonNullable<EvidencePack['problem']>['events'] {
  const seen = new Set<string>();
  const out: NonNullable<EvidencePack['problem']>['events'] = [];
  for (const event of [...(pack.problem?.events ?? [])].sort((a, b) => Date.parse(a.startIso) - Date.parse(b.startIso))) {
    if (seen.has(event.sourceId)) continue;
    seen.add(event.sourceId);
    out.push(event);
  }
  return out;
}

function chainCandidate(slot: ShotSlot, pack: EvidencePack, ctx: AnalysisCtx): Candidate | null {
  const incident = slot.incident;
  const events = firstEventPerSource(pack);
  const rootEvent = events.find((event) => event.sourceId === incident?.rootCauseId);
  const frontend = events.find((event) => entityType(event.sourceId) === 'APPLICATION');
  const mid = events.find((event) => event !== rootEvent && event !== frontend);
  if (incident === null || rootEvent === undefined || frontend === undefined || mid === undefined || pack.problem === undefined) return null;
  const fact = makeFact(pack, ctx);
  const window = pack.windows.events ?? null;
  const starts = [rootEvent, mid, frontend].map((event) => Date.parse(event.startIso));
  const minutes = Math.round((Math.max(...starts) - Math.min(...starts)) / 60_000);
  const at = (iso: string) => fact(iso, 'davis', 'ev.problem.events', window, 'instant');
  const name = (text: string | null, fallback: string) => fact(tenantName(text ?? fallback, ctx), 'davis', 'ev.problem.events', window);
  return {
    key: 'prt.an.f.chain',
    basis: null,
    params: {
      root: name(incident.rootCauseName ?? rootEvent.sourceName, rootEvent.sourceId),
      rootAt: at(rootEvent.startIso),
      mid: name(mid.sourceName, mid.sourceId),
      midAt: at(mid.startIso),
      frontend: name(frontend.sourceName, frontend.sourceId),
      frontendAt: at(frontend.startIso),
      minutes: fact(minutes, 'davis', 'ev.problem.events', window),
      events: fact(pack.problem.eventCount ?? pack.problem.events.length, 'davis', 'ev.problem.events', window),
    },
  };
}

function outageCandidate(sig: ServiceSignals, pack: EvidencePack, ctx: AnalysisCtx, W: EvidenceWindow | null): Candidate {
  const fact = makeFact(pack, ctx);
  const outage = sig.outage as NonNullable<ServiceSignals['outage']>;
  const dql = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.service.minutes', W, unit);
  return {
    key: 'prt.an.f.outage',
    basis: 'D1',
    params: {
      from: dql(outage.fromIso, 'instant'),
      to: dql(outage.toIso, 'instant'),
      name: dql(tenantName(sig.name, ctx)),
      minutes: dql(outage.minutes),
      failed: dql(outage.failed),
      total: dql(outage.total),
      baseline: dql(outage.baselineFailures ?? 0),
    },
  };
}

function rootCauseDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const incident = slot.incident;
  const subjectId = subjectIdOf(pack, slot);
  const rootId = incident?.rootCauseId ?? null;
  const fact = makeFact(pack, ctx);
  const W = pack.windows.incident ?? null;
  const services = pack.services ?? [];
  const sig = (id: string | null) => {
    const service = services.find((item) => item.id === id);
    return service === undefined ? null : serviceSignals(service, anchorFor(pack, service.requests));
  };
  const rootSig = sig(rootId);
  const subjectSig = sig(subjectId);
  const subject = services.find((item) => item.id === subjectId);
  const rootName = tenantName(incident?.rootCauseName ?? rootSig?.name ?? rootId, ctx);
  const subjectName = tenantName(subject?.name ?? slot.chosen?.entityName ?? subjectId, ctx);
  const dql = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.service.minutes', W, unit);

  const kpis: AnalysisKpi[] = [];
  if (rootSig !== null) {
    kpis.push(kpi(ctx.t('prt.an.kpi.outage', { name: rootName }), dql(rootSig.outage?.minutes ?? 0, 'min'), ctx, pack));
    const service = services.find((item) => item.id === rootId);
    const measured = service?.requests.values.filter((value): value is number => value !== null) ?? [];
    const base = rootSig.baseline.value;
    if (measured.length > 0 && base !== null && base > 0) kpis.push(kpi(ctx.t('prt.an.kpi.drop'), dql(100 * (1 - Math.min(...measured) / base), 'pct'), ctx, pack));
  }
  const callers = pack.callers;
  const totalCallerFailures = callers?.rows.reduce((sum, row) => sum + (row.failures ?? 0), 0) ?? 0;
  const topCaller = callers?.rows[0];
  if (topCaller !== undefined && topCaller.failures !== null && totalCallerFailures > 0) {
    kpis.push(
      kpi(
        ctx.t('prt.an.kpi.callerShare', { caller: tenantName(topCaller.name, ctx, 30) }),
        fact((100 * topCaller.failures) / totalCallerFailures, 'dql', 'ev.incident.callers', W, 'pct'),
        ctx,
        pack,
      ),
    );
  }
  // A number inside a KPI label is a measured value too (registered for the number lint).
  if (subjectSig?.p90 != null) kpis.push(kpi(ctx.t('prt.an.kpi.p90Worst', { usual: dql(subjectSig.p90.baselineMs, 'ms').display }), dql(subjectSig.p90.worstMs, 'ms'), ctx, pack));

  let visual: AnalysisVisual | null = null;
  let visualQuery: Draft['visualQuery'] = null;
  if (subject !== undefined && subject.failures.values.some((value) => value !== null)) {
    const outage = subjectSig?.outage ?? null;
    visual = columnsOf(
      subject.failures,
      subject.failures.values,
      inRun(outage),
      pack.problem ?? null,
      [],
      ctx.t('prt.an.viz.failuresPerMin', { name: subjectName }),
      ctx.t('prt.an.viz.unitFailures'),
      ctx,
      ctx.t('prt.an.viz.failuresPerMinZoom', { name: subjectName }),
    );
    visualQuery = { id: 'ev.service.minutes' };
  } else if (callers !== undefined && callers.rows.length > 0) {
    visual = {
      kind: 'table',
      title: ctx.t('prt.an.viz.callers', { root: rootName }),
      headers: [ctx.t('prt.an.viz.h.caller'), ctx.t('prt.an.viz.h.failures'), ctx.t('prt.an.viz.h.requests')],
      rows: callers.rows
        .slice(0, PRINT_BUDGET.tableRows)
        .map((row) => [tenantName(row.name, ctx, PRINT_BUDGET.tableCell), row.failures === null ? '—' : formatCount(row.failures, ctx.locale), row.requests === null ? '—' : formatCount(row.requests, ctx.locale)]),
    };
    visualQuery = { id: 'ev.incident.callers' };
  }

  const findings: Candidate[] = [];
  if (rootSig?.collapse != null && rootSig.outage !== null && rootSig.baseline.value !== null) {
    findings.push({
      key: 'prt.an.f.collapse',
      basis: 'D1',
      params: {
        root: dql(rootName),
        base: dql(rootSig.baseline.value),
        min: dql(rootSig.collapse.min),
        at: dql(rootSig.collapse.minIso, 'instant'),
        minutes: dql(rootSig.outage.minutes),
        from: dql(rootSig.outage.fromIso, 'instant'),
        to: dql(rootSig.outage.toIso, 'instant'),
      },
    });
  } else if (rootSig?.outage != null) {
    findings.push(outageCandidate(rootSig, pack, ctx, W));
  }
  const x1 = linkFrom(links, 'X1', slot.id);
  if (topCaller !== undefined && topCaller.failures !== null && totalCallerFailures > 0 && callers?.rootType === 'DATABASE_SERVICE') {
    const callerFact = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.incident.callers', W, unit);
    findings.push({
      key: 'prt.an.f.callerShare',
      basis: x1 === null ? null : 'X1',
      params: x1?.facts ?? {
        caller: callerFact(tenantName(topCaller.name, ctx)),
        share: callerFact((100 * topCaller.failures) / totalCallerFailures, 'pct'),
        root: callerFact(rootName),
        failures: callerFact(topCaller.failures),
        total: callerFact(totalCallerFailures),
      },
    });
  }
  if (subjectSig?.p90?.spike === true) {
    const p90 = subjectSig.p90;
    const gap = subjectSig.gap;
    findings.push({
      key: 'prt.an.f.p90',
      basis: 'D5a',
      params: { name: dql(subjectName), worst: dql(p90.worstMs, 'ms'), ratio: dql(p90.ratio, 'ratio'), usual: dql(p90.baselineMs, 'ms') },
      ...(gap === null
        ? {}
        : { suffix: { key: 'prt.an.f.gap', params: { name: dql(subjectName), minutes: dql(gap.minutes), from: dql(gap.fromIso, 'instant'), to: dql(gap.toIso, 'instant') } } }),
    });
  }
  const endpoints = [...(pack.endpoints ?? [])].filter((row) => row.serviceId === subjectId).sort((a, b) => b.failures - a.failures);
  const [e1, e2] = endpoints;
  const subjectFailures = subject?.totals.failures ?? 0;
  if (e1 !== undefined && e2 !== undefined && subjectFailures > 0 && e1.failures + e2.failures > 0) {
    const endpointFact = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.service.endpoints', W, unit);
    findings.push({
      key: 'prt.an.f.endpoints',
      basis: null,
      params: {
        first: endpointFact(tenantName(e1.endpoint, ctx)),
        second: endpointFact(tenantName(e2.endpoint, ctx)),
        share: endpointFact((100 * (e1.failures + e2.failures)) / subjectFailures, 'pct'),
        name: endpointFact(subjectName),
      },
    });
  }
  const kind = rootKindOf(rootId, pack);
  const reco: Draft['reco'] = [];
  if (slot.subject.kind === 'service' && slot.subject.role === 'root-caller') reco.push({ key: 'prt.an.reco.timeouts', params: { caller: subjectName, root: rootName } });
  if (e1 !== undefined) reco.push({ key: 'prt.an.reco.alertEndpoint', params: { endpoint: tenantName(e1.endpoint, ctx) } });
  if (reco.length < 2) reco.push(kind === 'database' ? { key: 'prt.an.reco.dbReview', params: { root: rootName } } : { key: 'prt.an.reco.serviceReview', params: { root: rootName } });
  return { kpis, visual, visualQuery, findings, matters: kind === 'database' ? 'prt.an.matters.rootDb' : 'prt.an.matters.rootSvc', reco };
}

const RATING_KEY: Readonly<Record<Verdict, StringKey>> = { good: 'prt.an.rating.good', warn: 'prt.an.rating.warn', bad: 'prt.an.rating.bad' };
/** Metric names, not prose (they read the same in every language). */
const VITAL_NAME = { lcp: 'LCP', inp: 'INP', cls: 'CLS' } as const;

/** Position on the good | attention | poor ruler (40 / 30 / 30 %). */
export function rulerPosition(value: number, [good, poor]: readonly [number, number]): number {
  if (value <= good) return (0.4 * value) / good;
  if (value <= poor) return 0.4 + (0.3 * (value - good)) / (poor - good);
  return Math.min(1, 0.7 + (0.3 * (value - poor)) / poor);
}

function frontendDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const frontend = pack.frontend;
  if (frontend === undefined || slot.subject.kind !== 'frontend') return null;
  const fact = makeFact(pack, ctx);
  const subject = slot.subject;
  const vitalsKind: WindowKind = frontend.screen !== undefined ? 'screen' : frontend.incident !== undefined ? 'incident' : 'problem';
  const vitals = frontend.screen ?? frontend.incident ?? frontend.problem ?? null;
  const vitalsWindow = pack.windows[vitalsKind] ?? null;
  const rum = (value: number | string, window: EvidenceWindow | null, unit?: SourcedUnit, id: EvidenceQueryId = 'ev.frontend.summary') => fact(value, 'rum', id, window, unit);
  const kpis: AnalysisKpi[] = [];
  const inpVerdict = vitals?.inpMs != null ? vitalVerdict('inpMs', vitals.inpMs) : null;
  const lcpVerdict = vitals?.lcpMs != null ? vitalVerdict('lcpMs', vitals.lcpMs) : null;
  if (vitals?.inpMs != null && inpVerdict !== null) kpis.push(kpi(ctx.t('prt.an.kpi.inp', { rating: ctx.t(RATING_KEY[inpVerdict]) }), rum(vitals.inpMs, vitalsWindow, 'ms'), ctx, pack, inpVerdict));
  if (vitals?.lcpMs != null && lcpVerdict !== null) kpis.push(kpi(ctx.t('prt.an.kpi.lcp', { rating: ctx.t(RATING_KEY[lcpVerdict]) }), rum(vitals.lcpMs, vitalsWindow, 'ms'), ctx, pack, lcpVerdict));
  const W = pack.windows.incident ?? null;
  const signals = subject.incidentBound && frontend.minutes !== undefined ? frontendSignals(frontend.minutes, anchorFor(pack, frontend.minutes.errors)) : null;
  if (signals !== null && signals.peak !== null) {
    const base = signals.baselineErrors === null ? '—' : rum(signals.baselineErrors, W, 'count', 'ev.frontend.minutes').display;
    kpis.push(kpi(ctx.t('prt.an.kpi.errPeak', { base }), rum(signals.peak, W, 'count', 'ev.frontend.minutes'), ctx, pack));
  } else if (vitals !== null && vitals.errors !== null && vitals.requests !== null && vitals.requests > 0) {
    kpis.push(kpi(ctx.t('prt.an.kpi.errPer100'), rum((100 * vitals.errors) / vitals.requests, vitalsWindow, 'per100'), ctx, pack));
  }
  const users = usersFact(pack, ctx);
  if (users !== null) kpis.push(kpi(ctx.t(users.label), users.fact, ctx, pack));

  const event = frontendEvent({ [pack.shotId]: pack }, subject.applicationId);
  let visual: AnalysisVisual | null = null;
  let visualQuery: Draft['visualQuery'] = null;
  if (signals !== null && frontend.minutes !== undefined) {
    const peakIndex = signals.peakIso === null ? -1 : Math.round((Date.parse(signals.peakIso) - Date.parse(frontend.minutes.errors.startIso)) / frontend.minutes.errors.stepMs);
    visual = columnsOf(
      frontend.minutes.errors,
      frontend.minutes.errors.values,
      (index) => signals.spike && index === peakIndex,
      pack.problem ?? null,
      event === null ? [] : [event.startIso],
      ctx.t('prt.an.viz.errorsPerMin'),
      ctx.t('prt.an.viz.unitErrors'),
      ctx,
      ctx.t('prt.an.viz.errorsPerMinZoom'),
    );
    visualQuery = { id: 'ev.frontend.minutes' };
  } else if (vitals !== null) {
    const items: Extract<AnalysisVisual, { kind: 'ruler' }>['items'] = [];
    const ruler = (label: string, value: number | null, kind: 'lcpMs' | 'inpMs' | 'cls', unit: SourcedUnit) => {
      if (value === null) return;
      items.push({ label, display: rum(value, vitalsWindow, unit).display, position: rulerPosition(value, THRESHOLDS.vitals[kind]), verdict: vitalVerdict(kind, value) });
    };
    ruler(VITAL_NAME.lcp, vitals.lcpMs, 'lcpMs', 'ms');
    ruler(VITAL_NAME.inp, vitals.inpMs, 'inpMs', 'ms');
    ruler(VITAL_NAME.cls, vitals.cls, 'cls', 'score');
    if (items.length > 0) {
      visual = { kind: 'ruler', title: ctx.t('prt.an.viz.vitals'), items };
      visualQuery = { id: 'ev.frontend.summary', windowKind: vitalsKind };
    }
  }

  const findings: Candidate[] = [];
  if (vitals?.inpMs != null && inpVerdict !== 'good' && vitals.lcpMs !== null) {
    findings.push({
      key: 'prt.an.f.inp',
      basis: 'D6',
      params: { inp: rum(vitals.inpMs, vitalsWindow, 'ms'), ratio: rum(vitals.inpMs / THRESHOLDS.vitals.inpMs[0], vitalsWindow, 'ratio'), lcp: rum(vitals.lcpMs, vitalsWindow, 'ms') },
    });
  } else if (vitals !== null && vitals.lcpMs !== null && vitals.inpMs !== null && vitals.cls !== null && inpVerdict === 'good' && lcpVerdict === 'good' && vitalVerdict('cls', vitals.cls) === 'good') {
    findings.push({ key: 'prt.an.f.vitalsGood', basis: null, params: { lcp: rum(vitals.lcpMs, vitalsWindow, 'ms'), inp: rum(vitals.inpMs, vitalsWindow, 'ms'), cls: rum(vitals.cls, vitalsWindow, 'score') } });
  }
  const x3 = linkFrom(links, 'X3', slot.id);
  const eventAt = x3?.facts.eventAt ?? (event === null ? null : fact(event.startIso, 'davis', 'ev.problem.events', pack.windows.events ?? null, 'instant'));
  if (signals?.spike === true && signals.peak !== null && signals.peakIso !== null && signals.baselineErrors !== null && eventAt != null) {
    const minutesFact = (value: number | string, unit?: SourcedUnit) => rum(value, W, unit, 'ev.frontend.minutes');
    findings.push({
      key: 'prt.an.f.errSpike',
      basis: 'D7',
      params: {
        peak: minutesFact(signals.peak),
        at: minutesFact(signals.peakIso, 'instant'),
        ratio: minutesFact(signals.ratio ?? signals.peak, 'ratio'),
        base: minutesFact(signals.baselineErrors),
        eventAt,
      },
    });
  }
  const usersFinding = usersCandidate(pack, ctx);
  if (usersFinding !== null) findings.push(usersFinding);
  const reco: Draft['reco'] = [];
  if (inpVerdict !== null && inpVerdict !== 'good') reco.push({ key: 'prt.an.reco.inp', params: {} });
  reco.push({ key: 'prt.an.reco.sloVitals', params: {} });
  return { kpis, visual, visualQuery, findings, matters: 'prt.an.matters.frontend', reco };
}

function k8sDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const k8s = pack.k8s;
  if (k8s === undefined || slot.subject.kind !== 'k8s-cluster') return null;
  const fact = makeFact(pack, ctx);
  const screen = pack.windows.screen ?? null;
  const day = pack.windows.day ?? null;
  const cap = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.k8s.capacity', screen, unit);
  const kpis: AnalysisKpi[] = [];
  const capacity = k8s.capacity === null ? null : capacitySignals(k8s.capacity);
  if (capacity?.memReqOfAlloc != null) kpis.push(kpi(ctx.t('prt.an.kpi.memReqAlloc'), cap(100 * capacity.memReqOfAlloc, 'pct'), ctx, pack));
  if (capacity?.memUsedOfReq != null) kpis.push(kpi(ctx.t('prt.an.kpi.memUsedReq'), cap(100 * capacity.memUsedOfReq, 'pct'), ctx, pack));
  if (capacity?.cpuUsedOfReq != null) kpis.push(kpi(ctx.t('prt.an.kpi.cpuUsedReq'), cap(100 * capacity.cpuUsedOfReq, 'pct'), ctx, pack));
  const churn = k8s.churn === null ? null : churnSignals(k8s.churn);
  if (churn !== null && churn.total !== null) kpis.push(kpi(ctx.t('prt.an.kpi.restarts', { oom: fact(churn.oom, 'dql', 'ev.k8s.churn', day).display }), fact(churn.total, 'dql', 'ev.k8s.churn', day), ctx, pack));

  const clusterName = tenantName(slot.subject.clusterName, ctx);
  let visual: AnalysisVisual | null = null;
  if (k8s.capacity !== null) {
    const c = k8s.capacity;
    const rows: Extract<AnalysisVisual, { kind: 'capacity' }>['rows'] = [];
    const row = (label: string, used: number | null, requested: number | null, allocatable: number | null, unit: SourcedUnit) => {
      if (used === null || requested === null) return;
      const shown = [used, requested, allocatable].filter((value): value is number => value !== null).map((value) => cap(value, unit).display);
      rows.push({ label, used, requested, allocatable, display: shown.join(' / ') });
    };
    row(ctx.t('prt.an.viz.cpuRow'), c.cpuUsed, c.cpuReq, c.cpuAlloc, 'cores');
    row(ctx.t('prt.an.viz.memRow'), c.memUsedGiB, c.memReqGiB, c.memAllocGiB, 'gib');
    if (rows.length > 0) visual = { kind: 'capacity', title: ctx.t('prt.an.viz.capacity', { cluster: clusterName }), rows };
  }

  const findings: Candidate[] = [];
  // The incident's own clue first: among plain comparisons it outranks the cluster's balance.
  const x4 = linkFrom(links, 'X4', slot.id);
  if (x4 !== null) {
    findings.push({ key: 'prt.an.f.incidentRestart', basis: 'X4', params: { ...x4.facts } });
  } else if (slot.subject.incidentBound && slot.incident !== null && slot.incident.namespaces.length > 0) {
    const read = pack.queries.find((query) => query.id === 'ev.k8s.incidentRestarts');
    if (read !== undefined && (read.outcome === 'empty' || (read.outcome === 'ok' && k8s.incidentRestarts.length === 0))) {
      findings.push({ key: 'prt.an.f.noIncidentRestart', basis: null, params: { namespace: fact(tenantName(slot.incident.namespaces[0], ctx), 'dql', 'ev.k8s.incidentRestarts', pack.windows.incident ?? null) } });
    }
  }
  if (capacity !== null && capacity.memoryIdle && capacity.memReqOfAlloc !== null && capacity.memUsedOfReq !== null) {
    findings.push({ key: 'prt.an.f.reserved', basis: 'D8a', params: { reqPct: cap(100 * capacity.memReqOfAlloc, 'pct'), usedPct: cap(100 * capacity.memUsedOfReq, 'pct') } });
  } else if (capacity !== null && capacity.cpuIdle && capacity.cpuReqOfAlloc !== null && capacity.cpuUsedOfReq !== null) {
    findings.push({ key: 'prt.an.f.reservedCpu', basis: 'D8a', params: { reqPct: cap(100 * capacity.cpuReqOfAlloc, 'pct'), usedPct: cap(100 * capacity.cpuUsedOfReq, 'pct') } });
  } else if (capacity !== null && capacity.memUsedOfReq !== null && capacity.cpuUsedOfReq !== null && capacity.memUsedOfReq <= 1 && capacity.cpuUsedOfReq <= 1) {
    // "Balanced" only when neither reservation is idle (D8a) and neither is exceeded.
    findings.push({ key: 'prt.an.f.balanced', basis: null, params: { usedPct: cap(100 * capacity.memUsedOfReq, 'pct'), cpuPct: cap(100 * capacity.cpuUsedOfReq, 'pct') } });
  }
  const above = [...k8s.workloads].filter((row) => (row.memOfReqPct ?? 0) > 100).sort((a, b) => (b.memOfReqPct ?? 0) - (a.memOfReqPct ?? 0))[0];
  if (above?.memOfReqPct != null) {
    findings.push({ key: 'prt.an.f.aboveRequest', basis: 'D8b', params: { workload: fact(tenantName(above.name, ctx), 'dql', 'ev.k8s.workloads', screen), pct: fact(above.memOfReqPct, 'dql', 'ev.k8s.workloads', screen, 'pct') } });
  }
  if (churn !== null && churn.top !== null && churn.second !== null && churn.top2Share !== null && churn.total !== null && churn.severity !== null) {
    const c = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.k8s.churn', day, unit);
    findings.push({
      key: 'prt.an.f.churn',
      basis: 'D9',
      params: {
        share: c(100 * churn.top2Share, 'pct'),
        total: c(churn.total),
        first: c(tenantName(churn.top.workload, ctx)),
        second: c(tenantName(churn.second.workload, ctx)),
        oom: c(churn.top.oom ?? 0),
      },
    });
  }
  const reco: Draft['reco'] = [{ key: 'prt.an.reco.rightsize', params: {} }];
  if (churn?.oomLeader != null) reco.push({ key: 'prt.an.reco.oom', params: { workload: tenantName(churn.oomLeader.workload, ctx) } });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.k8s.capacity' }, findings, matters: 'prt.an.matters.k8s', reco };
}

function failingDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx, incident: IncidentSnapshot | null): Draft | null {
  const failing = pack.failing;
  if (failing === undefined) return null;
  const fact = makeFact(pack, ctx);
  const subjectId = subjectIdOf(pack, slot);
  const row = failing.rows.find((item) => item.id === subjectId);
  const global = pack.windows.global ?? null;
  const g = (value: number | string, unit?: SourcedUnit, id: EvidenceQueryId = 'ev.failing.services') => fact(value, 'dql', id, global, unit);
  const kpis: AnalysisKpi[] = [];
  if (row !== undefined) {
    kpis.push(kpi(ctx.t('prt.an.kpi.timesEnv'), g(row.timesEnv, 'ratio'), ctx, pack));
    kpis.push(kpi(ctx.t('prt.an.kpi.failures', { rate: g(row.failurePct, 'pct').display }), g(row.failures), ctx, pack));
    kpis.push(kpi(ctx.t('prt.an.kpi.excess'), g(row.excess), ctx, pack));
  }
  if (failing.events !== null) kpis.push(kpi(ctx.t('prt.an.kpi.davisEvents'), fact(failing.events.count, 'davis', 'ev.entity.events', pack.windows.day ?? null), ctx, pack));

  const conc = endpointSignals(failing, subjectId);
  const visual: AnalysisVisual | null =
    failing.endpoints.length === 0
      ? null
      : {
          kind: 'bars',
          title: ctx.t('prt.an.viz.endpoints', { window: global === null ? '—' : windowText(global, ctx) }),
          items: failing.endpoints.slice(0, PRINT_BUDGET.bars).map((endpoint) => ({
            label: tenantName(endpoint.endpoint, ctx, PRINT_BUDGET.barLabel),
            value: endpoint.failures,
            display: formatCount(endpoint.failures, ctx.locale),
            highlight: conc !== null && endpoint === conc.worst,
          })),
        };

  const name = tenantName(row?.name ?? slot.chosen?.entityName ?? subjectId, ctx);
  const findings: Candidate[] = [];
  if (row !== undefined && failing.envRate !== null) {
    findings.push({ key: 'prt.an.f.timesEnv', basis: null, params: { name: g(name), ratio: g(row.timesEnv, 'ratio'), rate: g(row.failurePct, 'pct'), envRate: g(100 * failing.envRate, 'pct') } });
  }
  if (conc?.fires === true && conc.worstRatio !== null) {
    const e = (value: number | string, unit?: SourcedUnit) => g(value, unit, 'ev.failing.endpoints');
    const p50 = conc.worst.p50Ms;
    findings.push({
      key: 'prt.an.f.endpointConc',
      basis: 'D18',
      params: {
        endpoint: e(tenantName(conc.top.endpoint, ctx)),
        share: e(100 * conc.topShare, 'pct'),
        worst: e(tenantName(conc.worst.endpoint, ctx)),
        worstRate: e(conc.worst.failurePct, 'pct'),
        ratio: e(conc.worstRatio, 'ratio'),
        median: p50 === null ? e('—') : p50 >= 1000 ? e(p50 / 1000, 's') : e(p50, 'ms'),
      },
    });
  }
  const x2 = linkFrom(links, 'X2', slot.id);
  if (x2 !== null) {
    findings.push({ key: 'prt.an.f.callerOfRoot', basis: 'X2', params: { ...x2.facts, ref: fact(x2.ref, 'app', 'ev.failing.services', null) } });
  } else if (incident !== null && subjectId !== null && offIncidentPath(subjectId, incident, pack)) {
    findings.push({ key: 'prt.an.f.independent', basis: null, params: { name: g(name), id: fact(incident.displayId, 'davis', 'ev.incident.callers', pack.windows.incident ?? null) } });
  }
  const reco: Draft['reco'] = [];
  if (conc !== null) reco.push({ key: 'prt.an.reco.worstEndpoint', params: { endpoint: tenantName(conc.worst.endpoint, ctx) } });
  reco.push({ key: 'prt.an.reco.sloService', params: { name } });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.failing.endpoints' }, findings, matters: 'prt.an.matters.failing', reco };
}

/**
 * "Not on the path of the incident" is a claim, so it needs proof, not the absence of the X2 link
 * (which also vanishes when the root-cause shot is not in the deck): the incident's callers were
 * read in full (fewer rows than the query's limit), the service is neither the root nor one of
 * them, and Davis did not mark it as affected.
 */
function offIncidentPath(serviceId: string, incident: IncidentSnapshot, pack: Pick<EvidencePack, 'callers' | 'queries'>): boolean {
  const callers = pack.callers;
  const read = pack.queries.find((query) => query.id === 'ev.incident.callers');
  if (callers === undefined || read?.outcome !== 'ok' || callers.rows.length >= ROOT_CALLER_LIMIT) return false;
  return serviceId !== incident.rootCauseId && !incident.affectedIds.includes(serviceId) && !callers.rows.some((row) => row.id === serviceId);
}

function failedDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const failed = pack.failed;
  if (failed === undefined) return null;
  const fact = makeFact(pack, ctx);
  const screen = pack.windows.screen ?? null;
  const d = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.failed.endpoints', screen, unit);
  const kpis: AnalysisKpi[] = [kpi(ctx.t('prt.an.kpi.failedTotal'), d(failed.totalFailures), ctx, pack)];
  if (failed.totalRequests > 0) kpis.push(kpi(ctx.t('prt.an.kpi.envRate'), d((100 * failed.totalFailures) / failed.totalRequests, 'pct'), ctx, pack));
  const byService = new Map<string, number>();
  for (const row of failed.rows) byService.set(row.serviceId, (byService.get(row.serviceId) ?? 0) + row.failures);
  const topService = [...byService.values()].sort((a, b) => b - a)[0];
  if (topService !== undefined && failed.totalFailures > 0) kpis.push(kpi(ctx.t('prt.an.kpi.topShare'), d((100 * topService) / failed.totalFailures, 'pct'), ctx, pack));
  const full = failed.rows.filter((row) => row.ratePct === 100 && row.requests >= 10);
  kpis.push(kpi(ctx.t('prt.an.kpi.fullEndpoints'), d(full.length), ctx, pack));

  const rows = [...failed.rows].sort((a, b) => b.failures - a.failures);
  const visual: AnalysisVisual | null =
    rows.length === 0
      ? null
      : {
          kind: 'bars',
          title: ctx.t('prt.an.viz.failedTop', { window: screen === null ? '—' : windowText(screen, ctx) }),
          items: rows.slice(0, PRINT_BUDGET.bars).map((row) => ({ label: tenantName(row.endpoint, ctx, PRINT_BUDGET.barLabel), value: row.failures, display: formatCount(row.failures, ctx.locale), highlight: row.ratePct === 100 })),
        };
  const findings: Candidate[] = [];
  const top = rows[0];
  if (top !== undefined && failed.totalFailures > 0) {
    findings.push({ key: 'prt.an.f.topShare', basis: null, params: { endpoint: d(tenantName(top.endpoint, ctx)), service: d(tenantName(top.name, ctx)), share: d((100 * top.failures) / failed.totalFailures, 'pct'), total: d(failed.totalFailures) } });
  }
  if (full.length > 0) {
    findings.push({ key: 'prt.an.f.fullEndpoints', basis: null, params: { count: d(full.length), names: d(full.map((row) => tenantName(row.endpoint, ctx, 40)).join(', ')) } });
  }
  const x7 = linkFrom(links, 'X7', slot.id);
  if (x7 !== null) findings.push({ key: 'prt.an.f.sameRoute', basis: 'X7', params: { ...x7.facts } });
  const reco: Draft['reco'] = [];
  if (top !== undefined) reco.push({ key: 'prt.an.reco.firstTarget', params: { endpoint: tenantName(top.endpoint, ctx) } });
  reco.push({ key: 'prt.an.reco.sloEndpoint', params: {} });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.failed.endpoints' }, findings, matters: 'prt.an.matters.failed', reco };
}

function logsDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx, incident: IncidentSnapshot | null): Draft | null {
  const logs = pack.logs;
  if (logs === undefined) return null;
  const fact = makeFact(pack, ctx);
  const screen = pack.windows.screen ?? null;
  const partial = readOf(pack, 'ev.logs.errors').partial;
  const d = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.logs.errors', screen, unit);
  const signatures = [...logs.signatures].sort((a, b) => b.occurrences - a.occurrences);
  const top = signatures[0];
  const kpis: AnalysisKpi[] = [];
  if (logs.totalErrors !== null) kpis.push(kpi(ctx.t('prt.an.kpi.errorLogs'), d(logs.totalErrors), ctx, pack));
  if (top !== undefined) kpis.push(kpi(ctx.t('prt.an.kpi.topSignature'), d(top.occurrences), ctx, pack));
  const top3 = signatures.slice(0, 3).reduce((sum, row) => sum + row.occurrences, 0);
  const top3Share = logs.totalErrors !== null && logs.totalErrors > 0 && signatures.length >= 3 ? (100 * top3) / logs.totalErrors : null;
  if (top3Share !== null && !partial) kpis.push(kpi(ctx.t('prt.an.kpi.top3'), d(top3Share, 'pct'), ctx, pack));
  if (top !== undefined) kpis.push(kpi(ctx.t('prt.an.kpi.origins'), d(top.origins), ctx, pack));

  const visual: AnalysisVisual | null =
    signatures.length === 0
      ? null
      : {
          kind: 'bars',
          title: ctx.t('prt.an.viz.signatures', { window: screen === null ? '—' : windowText(screen, ctx) }),
          items: signatures.slice(0, PRINT_BUDGET.bars).map((row) => ({ label: tenantName(row.signature, ctx, PRINT_BUDGET.barLabel), value: row.occurrences, display: d(row.occurrences).display, highlight: false })),
        };
  const findings: Candidate[] = [];
  const cascade = partial ? null : cascadeOf(logs);
  if (cascade !== null && cascade.share !== null) findings.push({ key: 'prt.an.f.cascade', basis: 'D11', params: { k: d(cascade.k), count: d(cascade.count), share: d(100 * cascade.share, 'pct') } });
  if (top3Share !== null && !partial && logs.totalErrors !== null) findings.push({ key: 'prt.an.f.top3', basis: null, params: { share: d(top3Share, 'pct'), total: d(logs.totalErrors) } });
  // The logs slot carries no incident of its own: the plan's (or the X9 link's facts) names it.
  const x9 = linkFrom(links, 'X9', slot.id);
  const cluster = incident?.clusters[0] ?? null;
  if (logs.incidentLogCount === 0) {
    if (x9 !== null) findings.push({ key: 'prt.an.f.coverage', basis: 'X9', params: { ...x9.facts } });
    else if (incident !== null && cluster !== null) {
      findings.push({ key: 'prt.an.f.coverage', basis: 'D17', params: { id: fact(incident.displayId, 'davis', 'ev.problem.events', null), cluster: fact(tenantName(cluster, ctx), 'davis', 'ev.problem.events', null) } });
    }
  }
  const recoCluster = x9?.facts.cluster?.display ?? (cluster === null ? null : tenantName(cluster, ctx));
  const reco: Draft['reco'] = [{ key: 'prt.an.reco.openpipeline', params: {} }];
  reco.push(logs.incidentLogCount === 0 && recoCluster !== null ? { key: 'prt.an.reco.enableLogs', params: { cluster: recoCluster } } : { key: 'prt.an.reco.alertApp', params: {} });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.logs.errors' }, findings, matters: 'prt.an.matters.logs', reco };
}

/** Hub labels told apart by id when two services share a name ("BrokerService ·41A4"). */
export function hubLabels(hubs: readonly { id: string; name: string }[], ctx: AnalysisCtx): string[] {
  const counts = new Map<string, number>();
  for (const hub of hubs) counts.set(hub.name, (counts.get(hub.name) ?? 0) + 1);
  return hubs.map((hub) => {
    const tag = /-([0-9A-F]{4})[0-9A-F]{12}$/.exec(hub.id)?.[1];
    const label = (counts.get(hub.name) ?? 0) > 1 && tag !== undefined ? `${hub.name} ·${tag}` : hub.name;
    return tenantName(label, ctx, PRINT_BUDGET.barLabel);
  });
}

function topologyDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const topology = pack.topology;
  if (topology === undefined) return null;
  const fact = makeFact(pack, ctx);
  const screen = pack.windows.screen ?? null;
  const blastFact = (value: number | string) => fact(value, 'dql', 'ev.topology.blast', screen);
  const hubsFact = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.topology.hubs', screen, unit);
  const blast = blastOf(topology);
  const x5 = linkFrom(links, 'X5', slot.id);
  const kpis: AnalysisKpi[] = [];
  if (blast !== null) {
    kpis.push(kpi(ctx.t('prt.an.kpi.upstream'), blastFact(blast.upstream), ctx, pack));
    kpis.push(kpi(ctx.t('prt.an.kpi.apps'), blastFact(blast.apps), ctx, pack));
  }
  const marked = x5?.facts.count;
  if (marked !== undefined) kpis.push(kpi(ctx.t('prt.an.kpi.onPath'), marked, ctx, pack));
  if (topology.services !== null) kpis.push(kpi(ctx.t('prt.an.kpi.services'), hubsFact(topology.services), ctx, pack));

  const labels = hubLabels(topology.hubs, ctx);
  const visual: AnalysisVisual | null =
    topology.hubs.length === 0
      ? null
      : {
          kind: 'bars',
          title: ctx.t('prt.an.viz.hubs'),
          items: topology.hubs.slice(0, PRINT_BUDGET.bars).map((hub, index) => ({ label: labels[index] ?? hub.name, value: hub.degree, display: formatCount(hub.degree, ctx.locale), highlight: index === 0 })),
        };
  const findings: Candidate[] = [];
  const rootName = tenantName(slot.incident?.rootCauseName ?? slot.incident?.rootCauseId, ctx);
  if (blast?.fires === true) {
    findings.push({ key: 'prt.an.f.blast', basis: 'D14', params: { root: blastFact(rootName), callers: blastFact(blast.hop1), entries: blastFact(blast.hop2), apps: blastFact(blast.apps) } });
  }
  if (x5 !== null) findings.push({ key: 'prt.an.f.predicted', basis: 'X5', params: { ...x5.facts } });
  if (topology.isolated !== null && topology.services !== null && topology.services > 0 && topology.isolated > 0) {
    findings.push({ key: 'prt.an.f.isolated', basis: null, params: { isolated: hubsFact(topology.isolated), services: hubsFact(topology.services), share: hubsFact((100 * topology.isolated) / topology.services, 'pct') } });
  }
  const reco: Draft['reco'] = [{ key: 'prt.an.reco.postmortem', params: {} }];
  if ((topology.isolated ?? 0) > 0) reco.push({ key: 'prt.an.reco.isolated', params: {} });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.topology.hubs' }, findings, matters: 'prt.an.matters.topo', reco };
}

function vulnsDraft(pack: EvidencePack, ctx: AnalysisCtx): Draft | null {
  const security = pack.security;
  if (security === undefined) return null;
  const fact = makeFact(pack, ctx);
  const window = pack.windows.global ?? null;
  const a = (value: number | string, unit?: SourcedUnit) => fact(value, 'app', 'sec.posture', window, unit);
  const kpis: AnalysisKpi[] = [
    kpi(ctx.t('prt.an.kpi.open'), a(security.open), ctx, pack),
    kpi(ctx.t('prt.an.kpi.critical'), a(security.critical), ctx, pack),
    kpi(ctx.t('prt.an.kpi.actNow'), a(security.actNow), ctx, pack),
    kpi(ctx.t('prt.an.kpi.twoSignals'), a(security.twoSignals), ctx, pack),
  ];
  const other = Math.max(0, security.open - security.critical - security.high);
  const visual: AnalysisVisual = {
    kind: 'bars',
    title: ctx.t('prt.an.viz.severity'),
    items: [
      { label: ctx.t('p.sec.sev.critical'), value: security.critical, display: formatCount(security.critical, ctx.locale), highlight: true },
      { label: ctx.t('p.sec.sev.high'), value: security.high, display: formatCount(security.high, ctx.locale), highlight: false },
      { label: ctx.t('prt.an.viz.otherSeverity'), value: other, display: formatCount(other, ctx.locale), highlight: false },
    ],
  };
  const findings: Candidate[] = [];
  if (security.open > 0) findings.push({ key: 'prt.an.f.critical', basis: null, params: { critical: a(security.critical), open: a(security.open), share: a((100 * security.critical) / security.open, 'pct') } });
  if (security.actNow > 0) findings.push({ key: 'prt.an.f.actNow', basis: 'D15', params: { count: a(security.actNow) } });
  const tech = security.byTechnology[0];
  const severe = security.critical + security.high;
  if (tech !== undefined && severe > 0) findings.push({ key: 'prt.an.f.topTech', basis: null, params: { tech: a(tenantName(tech.label, ctx)), share: a((100 * tech.value) / severe, 'pct') } });
  const reco: Draft['reco'] = [];
  if (tech !== undefined) reco.push({ key: 'prt.an.reco.patchTop', params: { tech: tenantName(tech.label, ctx) } });
  reco.push({ key: 'prt.an.reco.exposure', params: {} });
  return { kpis, visual, visualQuery: { id: 'sec.posture' }, findings, matters: 'prt.an.matters.vulns', reco };
}

function hostDraft(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx): Draft | null {
  const host = pack.host;
  if (host === undefined) return null;
  const fact = makeFact(pack, ctx);
  const screen = pack.windows.screen ?? null;
  const d = (value: number | string, unit?: SourcedUnit) => fact(value, 'dql', 'ev.host.cpu', screen, unit);
  const signals = hostSignals(host);
  const kpis: AnalysisKpi[] = [];
  if (host.cpuAvg !== null) kpis.push(kpi(ctx.t('prt.an.kpi.cpuAvg'), d(host.cpuAvg, 'pct'), ctx, pack));
  if (host.cpuPeak !== null) kpis.push(kpi(ctx.t('prt.an.kpi.cpuPeak'), d(host.cpuPeak, 'pct'), ctx, pack));
  if (signals.ratio !== null) kpis.push(kpi(ctx.t('prt.an.kpi.fleet'), d(signals.ratio, 'ratio'), ctx, pack));
  if (host.under10 !== null) kpis.push(kpi(ctx.t('prt.an.kpi.idleHosts'), d(host.under10), ctx, pack));
  const name = tenantName(host.name, ctx);
  const visual: AnalysisVisual | null =
    host.cpuAvg === null || host.fleetMedianCpu === null
      ? null
      : {
          kind: 'bars',
          title: ctx.t('prt.an.viz.hosts', { window: screen === null ? '—' : windowText(screen, ctx) }),
          items: [
            { label: tenantName(host.name, ctx, PRINT_BUDGET.barLabel), value: host.cpuAvg, display: d(host.cpuAvg, 'pct').display, highlight: true },
            { label: ctx.t('prt.an.viz.fleetMedian'), value: host.fleetMedianCpu, display: d(host.fleetMedianCpu, 'pct').display, highlight: false },
          ],
        };
  const findings: Candidate[] = [];
  if (signals.hot && signals.ratio !== null && host.cpuAvg !== null && host.fleetMedianCpu !== null) {
    findings.push({ key: 'prt.an.f.hotHost', basis: 'D16', params: { host: d(name), cpu: d(host.cpuAvg, 'pct'), ratio: d(signals.ratio, 'ratio'), median: d(host.fleetMedianCpu, 'pct') } });
  }
  const x6 = linkFrom(links, 'X6', slot.id);
  if (x6 !== null) findings.push({ key: 'prt.an.f.rootRank', basis: 'X6', params: { ...x6.facts } });
  if (host.under10 !== null && host.hosts !== null && host.under10 > 0) findings.push({ key: 'prt.an.f.idleFleet', basis: null, params: { count: d(host.under10), hosts: d(host.hosts) } });
  return { kpis, visual, visualQuery: visual === null ? null : { id: 'ev.host.cpu' }, findings, matters: 'prt.an.matters.host', reco: [{ key: 'prt.an.reco.hostReview', params: { host: name } }, { key: 'prt.an.reco.rightsizeHosts', params: {} }] };
}

// ------------------------------------------------------------------ entry point

function draftFor(slot: ShotSlot, pack: EvidencePack, links: readonly CrossLink[], ctx: AnalysisCtx, incident: IncidentSnapshot | null): Draft | null {
  switch (slot.kind) {
    case 'problem':
      return problemDraft(slot, pack, ctx);
    case 'root-cause':
      return rootCauseDraft(slot, pack, links, ctx);
    case 'frontend':
      return frontendDraft(slot, pack, links, ctx);
    case 'k8s-cluster':
      return k8sDraft(slot, pack, links, ctx);
    case 'failing-service':
      return failingDraft(slot, pack, links, ctx, incident);
    case 'failed-requests':
      return failedDraft(slot, pack, links, ctx);
    case 'logs-errors':
      return logsDraft(slot, pack, links, ctx, incident);
    case 'smartscape':
      return topologyDraft(slot, pack, links, ctx);
    case 'vulnerabilities':
      return vulnsDraft(pack, ctx);
    case 'host':
      return hostDraft(slot, pack, links, ctx);
    case 'custom':
      return null;
  }
}

/**
 * The analysis slide of a shot, or null (no slide) when none of its queries was read or fewer than
 * two KPIs resolve. `anomalies` are this pack's (`detectAnomalies`), `links` the deck's
 * (`buildCrossLinks`): a finding that stands on a link exists only while its target is in the deck.
 * `incident` is the plan's (`plan.incident`): the planner gives the logs and failing-service slots
 * none of their own, and their coverage and independence findings name it. It defaults to the
 * slot's.
 */
export function analysisFor(
  slot: ShotSlot,
  pack: EvidencePack,
  anomalies: readonly Anomaly[],
  links: readonly CrossLink[],
  ctx: AnalysisCtx,
  incident: IncidentSnapshot | null = slot.incident,
): AnalysisContent | null {
  if (!pack.queries.some((query) => query.outcome === 'ok' || query.outcome === 'partial')) return null;
  const draft = draftFor(slot, pack, links, ctx, slot.incident ?? incident);
  if (draft === null || draft.kpis.length < 2) return null;
  const own = anomalies.filter((anomaly) => anomaly.shotId === pack.shotId);
  const ranked = draft.findings
    .map((candidate, order) => ({ candidate, order, strength: strength(candidate.basis, own) }))
    .sort((a, b) => a.strength - b.strength || a.order - b.order)
    .slice(0, PRINT_BUDGET.findings);
  const query = draft.visualQuery === null ? null : queryOf(pack, draft.visualQuery.id, draft.visualQuery.windowKind);
  const window = query?.window ?? null;
  return {
    shotId: pack.shotId,
    kind: slot.kind,
    headline: headlineOf(own, ctx),
    kpis: draft.kpis.slice(0, PRINT_BUDGET.kpis),
    visual: draft.visual,
    dql: query?.dql ?? null,
    dqlSource:
      query === null
        ? null
        : { id: query.id, window, windowLine: window === null ? '—' : windowText(window, ctx, { noEvents: window.kind === 'incident' && noEventsOf(pack) }) },
    findings: ranked.map((item) => render(item.candidate, ctx)),
    matters: ctx.t(draft.matters),
    reco: draft.reco.slice(0, PRINT_BUDGET.reco).map((item) => ctx.t(item.key, item.params)),
    anomalies: [...new Set([...own].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).map((anomaly) => anomaly.rule))],
  };
}

/** The Customer-profile cut of an analysis for an unapproved print ("Prova por DQL", D12): no screen-sourced value. */
export function customerSafe(content: AnalysisContent): AnalysisContent {
  const safe = (fact: Fact) => fact.source !== 'screen';
  return {
    ...content,
    kpis: content.kpis.filter((item) => safe(item.value)),
    findings: content.findings.filter((finding) => finding.facts.every(safe)),
  };
}
