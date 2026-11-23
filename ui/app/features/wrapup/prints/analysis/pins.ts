import type { StringKey } from '../../../../i18n/strings';
import type { CapturePin } from '../../spec';
import { PRINT_BUDGET } from '../deck/budget';
import { PIN_OFFSET_PX, PRINT_SPACE, THRESHOLDS } from '../constants';
import { FAILED_ENDPOINTS_ROWS, SERVICE_SCREEN_ENDPOINTS } from '../evidence/builders';
import type { AnalysisCtx, CrossCheck, EvidencePack, PrintPin, PrintRecord, Rect, ShotSlot, Sourced } from '../types';
import { anchorFor, churnSignals, frontendSignals, recurrenceSignals, serviceSignals, subjectIdOf } from './anomalies';
import { tenantName } from './crossLinks';
import { firstEventPerSource, hubLabels, rootKindOf } from './narrative';
import { formatCount, formatDecimal, formatInstant, formatMs, formatPct, formatRatio, sourced, windowLabel, windowText } from './sourced';

/**
 * The numbered pins of a print and their legend (3.2.7, spec §5.6): where each pin sits on the real
 * screen, and the line that says what it shows, with the number read over the screen's window.
 *
 * A pin snaps to the on-screen label the companion found (the first of ≤ 3 hits inside its zone);
 * without one it takes the layout's measured fallback ("posição estimada"), except a `variable`
 * pin, which only appears when anchored or placed by the SE. A pin whose legend needs a number
 * that was not read is dropped — a legend never prints a gap. Two pins closer than 72 px (0.34 in
 * on the slide) are pulled apart. Where the screen showed a number with a Grail counterpart (the
 * problem's users, the logs' records) the legend states whether they agree, never reconciling them.
 *
 * The layout template (anchors, zones, fallbacks, legend keys) is the planner's `LAYOUTS[layout]`
 * (`plan/pinTemplates.ts`); it is passed in, so this module reads only the fields it needs.
 */

export interface PinTemplateLike {
  n: number;
  /** Fallback position, fractions of the 1720×1080 crop. */
  x: number;
  y: number;
  anchor: { key: string; zone: { x0: number; y0: number; x1: number; y1: number }; place: 'left' | 'right' | 'above' | 'below'; offsetPx: number } | null;
  stability: 'chrome' | 'stable' | 'variable' | 'estimated';
  legendKey: StringKey;
}

export interface PinLayoutLike {
  pins: readonly PinTemplateLike[];
}

/** Two pin centres closer than this (print px) overlap on the slide (0.34 in = 310,896 EMU at the image's width). */
export const PIN_MIN_GAP_PX = 72;
const PIN_NUDGE_TRIES = 3;
const PIN_INSET_PX = 16;
const DEFAULT_OFFSET_PX = PIN_OFFSET_PX;

const clampX = (x: number) => Math.min(PRINT_SPACE.width - PIN_INSET_PX, Math.max(PIN_INSET_PX, x));
const clampY = (y: number) => Math.min(PRINT_SPACE.height - PIN_INSET_PX, Math.max(PIN_INSET_PX, y));

/** The pin centre beside an anchor hit: left/right of it, or above/below it, `offsetPx` away, 16 px inside the print. */
export function placeBeside(rect: Rect, place: NonNullable<PinTemplateLike['anchor']>['place'], offsetPx = DEFAULT_OFFSET_PX): { x: number; y: number } {
  switch (place) {
    case 'left':
      return { x: clampX(rect.x - offsetPx), y: clampY(rect.y + rect.h / 2) };
    case 'right':
      return { x: clampX(rect.x + rect.w + offsetPx), y: clampY(rect.y + rect.h / 2) };
    case 'below':
      return { x: clampX(rect.x + rect.w / 2), y: clampY(rect.y + rect.h + offsetPx) };
    case 'above':
      return { x: clampX(rect.x + rect.w / 2), y: clampY(rect.y - offsetPx) };
  }
}

/** The first of a key's hits (by hit order) whose centre lies inside the zone. */
export function anchorHit(record: Pick<PrintRecord, 'anchors'>, anchor: NonNullable<PinTemplateLike['anchor']>): Rect | null {
  const hits = record.anchors.filter((item) => item.key === anchor.key).sort((a, b) => a.hit - b.hit);
  for (const { rect } of hits) {
    const cx = (rect.x + rect.w / 2) / PRINT_SPACE.width;
    const cy = (rect.y + rect.h / 2) / PRINT_SPACE.height;
    if (cx >= anchor.zone.x0 && cx <= anchor.zone.x1 && cy >= anchor.zone.y0 && cy <= anchor.zone.y1) return rect;
  }
  return null;
}

/**
 * The overlap guard: a pin closer than 72 px to an earlier one moves down 72 px, at most three
 * times, and is dropped if it still collides (or would leave the print).
 */
export function separatePins<T extends { x: number; y: number }>(pins: readonly T[]): T[] {
  const kept: T[] = [];
  for (const pin of pins) {
    let y = pin.y;
    let tries = 0;
    const collides = (at: number) => kept.some((other) => Math.hypot(other.x - pin.x, other.y - at) < PIN_MIN_GAP_PX);
    while (collides(y) && tries < PIN_NUDGE_TRIES) {
      y += PIN_MIN_GAP_PX;
      tries += 1;
    }
    if (!collides(y) && y <= PRINT_SPACE.height - PIN_INSET_PX) kept.push({ ...pin, y });
  }
  return kept;
}

/** Screen and Grail side by side: equal within 1 % → "conferido no Grail"; otherwise both, as different measures. */
export function crossCheck(anchorKey: string, screen: Sourced<number>, grail: Sourced<number>, ctx: AnalysisCtx): CrossCheck {
  const s = screen.value;
  const g = grail.value;
  const agree = s !== null && g !== null && Math.abs(s - g) <= 0.01 * Math.max(Math.abs(g), 1);
  return { anchorKey, screen, grail, agree, text: agree ? ctx.t('prt.an.agree') : ctx.t('prt.an.differ', { screen: screen.display, grail: grail.display }) };
}

// ------------------------------------------------------------------ legend params, per key

/** Every legend a pin can carry; the builder map below is typed on it, so a key without a builder does not compile. */
export const PIN_LEGEND_KEYS = [
  'prt.pin.problem.header',
  'prt.pin.problem.impact',
  'prt.pin.problem.frontend',
  'prt.pin.problem.root',
  'prt.pin.problem.signals',
  'prt.pin.problem.path',
  'prt.pin.problem.events',
  'prt.pin.problem.automation',
  'prt.pin.service.callerName',
  'prt.pin.service.rootName',
  'prt.pin.service.failingName',
  'prt.pin.service.health',
  'prt.pin.service.rt',
  'prt.pin.service.rtPlain',
  'prt.pin.service.throughput',
  'prt.pin.service.outage',
  'prt.pin.service.failVsEnv',
  'prt.pin.service.endpoints',
  'prt.pin.frontend.name',
  'prt.pin.frontend.vitals',
  'prt.pin.frontend.errors',
  'prt.pin.frontend.users',
  'prt.pin.frontend.actions',
  'prt.pin.frontend.cwv',
  'prt.pin.k8s.selected',
  'prt.pin.k8s.health',
  'prt.pin.k8s.cpu',
  'prt.pin.k8s.memory',
  'prt.pin.k8s.workloads',
  'prt.pin.logs.filter',
  'prt.pin.logs.chart',
  'prt.pin.logs.records',
  'prt.pin.logs.message',
  'prt.pin.logs.columns',
  'prt.pin.failed.filter',
  'prt.pin.failed.series',
  'prt.pin.failed.list',
  'prt.pin.failed.top',
  'prt.pin.topo.view',
  'prt.pin.topo.nodes',
  'prt.pin.topo.hide',
  'prt.pin.topo.hub',
  'prt.pin.topo.root',
  'prt.pin.topo.window',
  'prt.pin.vulns.total',
  'prt.pin.vulns.score',
  'prt.pin.vulns.assessment',
  'prt.pin.vulns.advisor',
  'prt.pin.vulns.type',
  'prt.pin.vulns.runtime',
  'prt.pin.host.cpu',
  'prt.pin.host.mem',
  'prt.pin.host.processes',
  'prt.pin.host.problems',
  'prt.pin.k8s.overview',
] as const satisfies readonly StringKey[];
export type PinLegendKey = (typeof PIN_LEGEND_KEYS)[number];


type Params = Record<string, string>;
type Builder = () => Params | null;

/** All-or-nothing: a legend whose params are not all known is no legend. */
function all(params: Record<string, string | null | undefined>): Params | null {
  for (const value of Object.values(params)) if (value === null || value === undefined) return null;
  return params as Params;
}

function legendBuilders(record: PrintRecord, slot: ShotSlot, pack: EvidencePack | null, ctx: AnalysisCtx): Readonly<Record<PinLegendKey, Builder>> {
  const { locale, timeZone } = ctx;
  const n = (value: number | null | undefined) => (value === null || value === undefined ? null : formatCount(value, locale));
  const pct = (value: number | null | undefined) => (value === null || value === undefined ? null : formatPct(value, locale));
  const ms = (value: number | null | undefined) => (value === null || value === undefined ? null : formatMs(value, locale));
  const at = (iso: string | null | undefined) => (iso === null || iso === undefined ? null : formatInstant(iso, locale, timeZone));
  const name = (text: string | null | undefined) => (text === null || text === undefined ? null : tenantName(text, ctx, 50));
  const incident = slot.incident ?? record.incident;
  const subjectId = pack === null ? null : subjectIdOf(pack, slot);
  const problem = pack?.problem;
  const services = pack?.services ?? [];
  const screen = pack?.serviceScreen;
  const vitals = pack?.frontend?.screen ?? pack?.frontend?.incident ?? pack?.frontend?.problem ?? null;
  const rootKind = pack === null ? 'service' : rootKindOf(incident?.rootCauseId ?? null, pack);
  const kindText = ctx.t(rootKind === 'database' ? 'prt.kind.database' : rootKind === 'host' ? 'prt.kind.host' : 'prt.kind.service');
  const durationMin = problem?.endIso != null ? Math.round((Date.parse(problem.endIso) - Date.parse(problem.startIso)) / 60_000) : null;
  const events = pack === null ? [] : firstEventPerSource(pack);
  const rootEvents = problem?.events.filter((event) => event.sourceId === incident?.rootCauseId) ?? [];
  const feEvent = events.find((event) => /^APPLICATION-/.test(event.sourceId));
  const feSignals = pack?.frontend?.minutes !== undefined ? frontendSignals(pack.frontend.minutes, anchorFor(pack, pack.frontend.minutes.errors)) : null;
  const recurrence = pack?.recurrence === undefined ? null : recurrenceSignals(pack.recurrence, incident?.rootCauseId ?? null);
  const subjectService = services.find((service) => service.id === subjectId);
  const subjectSig = subjectService === undefined || pack === null ? null : serviceSignals(subjectService, anchorFor(pack, subjectService.requests));
  const failingRow = pack?.failing?.rows.find((row) => row.id === subjectId);
  const capacity = pack?.k8s?.capacity ?? null;
  const churn = pack?.k8s?.churn == null ? null : churnSignals(pack.k8s.churn);
  const logs = pack?.logs;
  const top3 = logs === undefined ? null : [...logs.signatures].sort((a, b) => b.occurrences - a.occurrences).slice(0, 3);
  const failed = pack?.failed;
  const topFailed = failed === undefined ? undefined : [...failed.rows].sort((a, b) => b.failures - a.failures)[0];
  const topology = pack?.topology;
  const security = pack?.security;
  const host = pack?.host;
  const ratioText = (value: number | null | undefined) => (value === null || value === undefined ? null : formatRatio(value, locale));
  const share = (part: number | null | undefined, whole: number | null | undefined) => (part == null || whole == null || whole <= 0 ? null : (100 * part) / whole);
  // A count of a query's top list is a floor once the list is full (its LIMIT): "(pelo menos)".
  const listed = (count: number | null | undefined, rows: number | null | undefined, limit: number) => {
    if (count == null || count <= 0) return null;
    const text = formatCount(count, locale);
    return rows != null && rows >= limit ? ctx.t('prt.src.atLeast', { value: text }) : text;
  };

  return {
    'prt.pin.problem.header': () =>
      all({ id: incident?.displayId, category: incident?.category, severity: problem?.severity ?? null, duration: n(durationMin), start: at(problem?.startIso) }),
    'prt.pin.problem.impact': () => all({ rum: n(pack?.frontend?.problem?.users), sessions: n(pack?.frontend?.problem?.sessions), davis: n(problem?.davisUsers), events: n(problem?.eventCount) }),
    'prt.pin.problem.frontend': () => all({ frontend: name(feEvent?.sourceName ?? slot.chosen?.entityName), peak: n(feSignals?.peak), at: at(feSignals?.peakIso) }),
    'prt.pin.problem.root': () => all({ root: name(incident?.rootCauseName), kind: kindText, count: n(recurrence?.count) }),
    'prt.pin.problem.signals': () => {
      const first = rootEvents[0];
      // "{lead} min before the frontend event": only when the cause's first event really came first.
      const leadMin = first !== undefined && feEvent !== undefined ? Math.round((Date.parse(feEvent.startIso) - Date.parse(first.startIso)) / 60_000) : null;
      const lead = leadMin !== null && leadMin > 0 ? leadMin : null;
      const categories = [...new Set(rootEvents.map((event) => event.category))].join(', ');
      return all({ count: n(rootEvents.length > 0 ? rootEvents.length : null), categories: categories === '' ? null : categories, start: at(first?.startIso), lead: n(lead) });
    },
    'prt.pin.problem.path': () => all({ root: name(incident?.rootCauseName) }),
    // 3.5.7: what the screen itself shows; no number of its own.
    'prt.pin.problem.events': () => all({}),
    'prt.pin.problem.automation': () => all({}),
    'prt.pin.service.callerName': () => all({ name: name(subjectService?.name ?? slot.chosen?.entityName), kind: kindText, root: name(incident?.rootCauseName), id: incident?.displayId, failures: n(pack?.callers?.rows.find((row) => row.id === subjectId)?.failures) }),
    'prt.pin.service.rootName': () => all({ name: name(subjectService?.name ?? slot.chosen?.entityName), id: incident?.displayId }),
    'prt.pin.service.failingName': () => all({ name: name(failingRow?.name ?? slot.chosen?.entityName), ratio: ratioText(failingRow?.timesEnv), window: pack?.windows.global === undefined ? null : windowText(pack.windows.global, ctx) }),
    'prt.pin.service.health': () => all({ failures: n(screen?.failures), requests: n(screen?.requests), rate: pct(share(screen?.failures, screen?.requests)), minutes: n(screen?.timeframeMinutes) }),
    'prt.pin.service.rt': () => all({ avg: ms(screen?.avgMs), median: ms(screen?.p50Ms), ratio: ratioText(screen?.avgMs != null && screen.p50Ms != null && screen.p50Ms > 0 ? screen.avgMs / screen.p50Ms : null) }),
    'prt.pin.service.rtPlain': () => all({ avg: ms(screen?.avgMs), median: ms(screen?.p50Ms) }),
    'prt.pin.service.throughput': () => all({ perMin: n(screen === undefined || screen.timeframeMinutes <= 0 ? null : Math.round(screen.requests / screen.timeframeMinutes)) }),
    'prt.pin.service.outage': () => all({ minutes: n(subjectSig?.outage?.minutes), from: at(subjectSig?.outage?.fromIso), to: at(subjectSig?.outage?.toIso) }),
    'prt.pin.service.failVsEnv': () => all({ rate: pct(failingRow?.failurePct), envRate: pct(pack?.failing?.envRate == null ? null : 100 * pack.failing.envRate) }),
    'prt.pin.service.endpoints': () => {
      const slowest = screen === undefined ? undefined : [...screen.endpoints].sort((a, b) => (b.p50Ms ?? -1) - (a.p50Ms ?? -1))[0];
      return all({ count: listed(screen?.endpoints.filter((row) => row.requests > 0).length, screen?.endpoints.length, SERVICE_SCREEN_ENDPOINTS), slowest: name(slowest?.endpoint), median: ms(slowest?.p50Ms) });
    },
    'prt.pin.frontend.name': () => all({ frontend: name(slot.chosen?.entityName), requests: n(pack?.frontend?.screen?.requests), minutes: n(pack?.frontend?.screen?.timeframeMinutes) }),
    'prt.pin.frontend.vitals': () =>
      all({ lcp: ms(vitals?.lcpMs), cls: vitals?.cls == null ? null : formatDecimal(vitals.cls, locale, 3), inp: ms(vitals?.inpMs), ratio: ratioText(vitals?.inpMs == null ? null : vitals.inpMs / THRESHOLDS.vitals.inpMs[0]) }),
    'prt.pin.frontend.errors': () => {
      const s = pack?.frontend?.screen;
      const per100 = s?.errors != null && s.requests != null && s.requests > 0 ? (100 * s.errors) / s.requests : null;
      return all({ errorRate: per100 === null ? null : formatCount(Math.round(per100 * 100) / 100, locale) });
    },
    'prt.pin.frontend.users': () => all({ users: n(pack?.frontend?.screen?.users), sessions: n(pack?.frontend?.screen?.sessions) }),
    'prt.pin.frontend.actions': () => all({ actionTime: ms(vitals?.actionP75Ms) }),
    'prt.pin.frontend.cwv': () =>
      all({ lcp: ms(vitals?.lcpMs), cls: vitals?.cls == null ? null : formatDecimal(vitals.cls, locale, 3), inp: ms(vitals?.inpMs) }),
    'prt.pin.k8s.selected': () => {
      if (slot.subject.kind !== 'k8s-cluster') return null;
      const role = slot.subject.incidentBound && incident !== null ? ctx.t('prt.pin.k8s.role.incident', { id: incident.displayId }) : ctx.t('prt.pin.k8s.role.pressure');
      return all({ cluster: name(slot.subject.clusterName), role });
    },
    'prt.pin.k8s.health': () => all({ cpu: pct(share(capacity?.cpuReq, capacity?.cpuAlloc)), mem: pct(share(capacity?.memReqGiB, capacity?.memAllocGiB)) }),
    'prt.pin.k8s.cpu': () =>
      all({
        used: capacity?.cpuUsed == null ? null : sourced(capacity.cpuUsed, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'cores' }).display,
        req: capacity?.cpuReq == null ? null : sourced(capacity.cpuReq, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'cores' }).display,
        pct: pct(share(capacity?.cpuUsed, capacity?.cpuReq)),
        alloc: capacity?.cpuAlloc == null ? null : sourced(capacity.cpuAlloc, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'cores' }).display,
      }),
    'prt.pin.k8s.memory': () =>
      all({
        used: capacity?.memUsedGiB == null ? null : sourced(capacity.memUsedGiB, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'gib' }).display,
        req: capacity?.memReqGiB == null ? null : sourced(capacity.memReqGiB, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'gib' }).display,
        pct: pct(share(capacity?.memUsedGiB, capacity?.memReqGiB)),
        alloc: capacity?.memAllocGiB == null ? null : sourced(capacity.memAllocGiB, 'dql', 'ev.k8s.capacity', null, ctx, { unit: 'gib' }).display,
      }),
    'prt.pin.k8s.workloads': () => all({ restarts: n(churn?.total), oom: n(churn?.oom), top: name(churn?.top?.workload) }),
    'prt.pin.logs.filter': () => all({ count: n(logs?.totalErrors), minutes: n(pack?.windows.screen?.minutes) }),
    'prt.pin.logs.chart': () => ({}),
    'prt.pin.logs.records': () => all({ count: n(logs?.totalErrors) }),
    'prt.pin.logs.message': () => all({ top: n(top3?.[0]?.occurrences), share: pct(share(top3?.reduce((sum, row) => sum + row.occurrences, 0), logs?.totalErrors)) }),
    'prt.pin.logs.columns': () => ({}),
    'prt.pin.failed.filter': () => all({ count: n(failed?.totalFailures), minutes: n(pack?.windows.screen?.minutes) }),
    'prt.pin.failed.series': () => all({ rate: pct(share(failed?.totalFailures, failed?.totalRequests)) }),
    'prt.pin.failed.list': () => all({ count: listed(failed?.rows.length, failed?.rows.length, FAILED_ENDPOINTS_ROWS) }),
    'prt.pin.failed.top': () => all({ endpoint: name(topFailed?.endpoint), service: name(topFailed?.name), count: n(topFailed?.failures), share: pct(share(topFailed?.failures, failed?.totalFailures)) }),
    'prt.pin.topo.view': () => all({ services: n(topology?.services) }),
    'prt.pin.topo.nodes': () => all({ isolated: n(topology?.isolated) }),
    'prt.pin.topo.hide': () => ({}),
    'prt.pin.topo.hub': () => {
      const hub = topology?.hubs[0];
      return all({ hub: hub === undefined ? null : (hubLabels(topology?.hubs ?? [], ctx)[0] ?? null), degree: n(hub?.degree) });
    },
    'prt.pin.topo.root': () => all({ root: name(incident?.rootCauseName), count: n(topology?.blast?.hop1Ids.length) }),
    'prt.pin.topo.window': () => all({ window: pack?.windows.screen === undefined ? null : windowLabel(pack.windows.screen, locale, timeZone) }),
    'prt.pin.vulns.total': () => all({ open: n(security?.open) }),
    'prt.pin.vulns.score': () => all({ critical: n(security?.critical), high: n(security?.high) }),
    'prt.pin.vulns.assessment': () => all({ count: n(security?.actNow) }),
    'prt.pin.vulns.advisor': () => ({}),
    'prt.pin.vulns.type': () => {
      const tech = security?.byTechnology[0];
      return all({ tech: name(tech?.label), share: pct(share(tech?.value, security === undefined ? null : security.critical + security.high)) });
    },
    'prt.pin.vulns.runtime': () => ({}),
    'prt.pin.host.cpu': () => all({ avg: pct(host?.cpuAvg), peak: pct(host?.cpuPeak) }),
    'prt.pin.host.mem': () => all({ avg: pct(host?.memAvg) }),
    'prt.pin.host.processes': () => ({}),
    'prt.pin.host.problems': () => all({ count: n(pack?.recurrence?.rank.find((row) => row.id === host?.id)?.problems) }),
    // Not measured by the evidence engine (cluster count): the pin is dropped.
    'prt.pin.k8s.overview': () => null,
  };
}

const LEGEND_KEYS: ReadonlySet<string> = new Set(PIN_LEGEND_KEYS);
const isLegendKey = (key: StringKey): key is PinLegendKey => LEGEND_KEYS.has(key);

/** The legend key a template pin uses for this shot: the service pins vary with the role and the measured tail. */
function legendKeyFor(template: PinTemplateLike, slot: ShotSlot, pack: EvidencePack | null): StringKey {
  const key = template.legendKey;
  const role = slot.subject.kind === 'service' ? slot.subject.role : null;
  if (key === 'prt.pin.service.callerName' || key === 'prt.pin.service.failingName' || key === 'prt.pin.service.rootName') {
    return role === 'failing' ? 'prt.pin.service.failingName' : role === 'root' ? 'prt.pin.service.rootName' : 'prt.pin.service.callerName';
  }
  if (key === 'prt.pin.service.rt' || key === 'prt.pin.service.rtPlain') {
    const screen = pack?.serviceScreen;
    const tail = screen?.avgMs != null && screen.p50Ms != null && screen.p50Ms > 0 ? screen.avgMs / screen.p50Ms : null;
    return tail !== null && tail >= THRESHOLDS.longTailRatio ? 'prt.pin.service.rt' : 'prt.pin.service.rtPlain';
  }
  if (key === 'prt.pin.service.outage' || key === 'prt.pin.service.failVsEnv') return role === 'failing' ? 'prt.pin.service.failVsEnv' : 'prt.pin.service.outage';
  return key;
}

/** The screen numbers of a legend with a Grail counterpart: the problem's users, the logs' records. */
function counterpart(key: StringKey, pack: EvidencePack | null, ctx: AnalysisCtx): Sourced<number> | null {
  if (pack === null) return null;
  if (key === 'prt.pin.problem.impact' && pack.frontend?.problem?.users != null) return sourced(pack.frontend.problem.users, 'rum', 'ev.frontend.summary', pack.windows.problem ?? null, ctx);
  if (key === 'prt.pin.logs.records' && pack.logs?.totalErrors != null) return sourced(pack.logs.totalErrors, 'dql', 'ev.logs.errors', pack.windows.screen ?? null, ctx);
  return null;
}

interface Placed {
  n: number;
  x: number;
  y: number;
  origin: PrintPin['origin'];
  anchorKey?: string;
  legend: string;
}

/**
 * The pins of a print in print-space pixels, from the layout: anchored where the label was found,
 * else the fallback (never for a `variable` pin; since 3.5.5 also on a letterboxed image), legend resolved, pins
 * without a legend dropped, overlaps separated. Seeds `PrintRecord.pins` for the editor.
 */
export function placePins(record: PrintRecord, slot: ShotSlot, pack: EvidencePack | null, ctx: AnalysisCtx, layout: PinLayoutLike): PrintPin[] {
  return placed(record, slot, pack, ctx, layout).map(({ n, x, y, origin, anchorKey }) => ({ n, x, y, origin, ...(anchorKey === undefined ? {} : { anchorKey }) }));
}

function placed(record: PrintRecord, slot: ShotSlot, pack: EvidencePack | null, ctx: AnalysisCtx, layout: PinLayoutLike): Placed[] {
  const builders = legendBuilders(record, slot, pack, ctx);
  const out: Placed[] = [];
  for (const template of [...layout.pins].sort((a, b) => a.n - b.n)) {
    const key = legendKeyFor(template, slot, pack);
    const params = isLegendKey(key) ? builders[key]() : null;
    if (params === null || params === undefined) continue;
    const hit = template.anchor === null ? null : anchorHit(record, template.anchor);
    let position: { x: number; y: number };
    let origin: PrintPin['origin'];
    if (hit !== null && template.anchor !== null) {
      position = placeBeside(hit, template.anchor.place, template.anchor.offsetPx);
      origin = 'anchor';
    } else {
      // 3.5.5: a letterboxed print (`partial`) also gets the layout's estimated spots — the SE confirms or moves
      // each one before the print can be approved (`approvalBlockers`), so no screen leaves without its pins.
      if (template.stability === 'variable') continue;
      position = { x: clampX(template.x * PRINT_SPACE.width), y: clampY(template.y * PRINT_SPACE.height) };
      origin = 'template';
    }
    out.push({ n: template.n, ...position, origin, ...(template.anchor === null ? {} : { anchorKey: template.anchor.key }), legend: ctx.t(key, params) });
  }
  return separatePins(out);
}

/**
 * The deck's pins (fractions) and legend lines (same order, renumbered 1..k), plus the screen–Grail
 * cross-checks. The SE's own pins (`record.pins`) win when present: position, hidden flag and
 * legend override; the computed legend of the same pin number otherwise. ≤ 6 pins, ≤ 4 with the lupa.
 */
export function pinsFor(record: PrintRecord, slot: ShotSlot, pack: EvidencePack | null, ctx: AnalysisCtx, layout: PinLayoutLike): { pins: CapturePin[]; legend: string[]; notes: string[]; crossChecks: CrossCheck[] } {
  const computed = placed(record, slot, pack, ctx, layout);
  const byNumber = new Map(computed.map((pin) => [pin.n, pin]));
  // The SE's pins are taken where the SE left them: they were separated when seeded (`placePins`),
  // and a pin the SE moved is never nudged or dropped behind their back.
  const source: Placed[] =
    record.pins.length === 0
      ? computed
      : record.pins
          .filter((pin) => pin.hidden !== true)
          .sort((a, b) => a.n - b.n)
          .flatMap((pin) => {
            const legend = pin.labelOverride ?? byNumber.get(pin.n)?.legend;
            return legend === undefined ? [] : [{ n: pin.n, x: pin.x, y: pin.y, origin: pin.origin, ...(pin.anchorKey === undefined ? {} : { anchorKey: pin.anchorKey }), legend }];
          });
  const crossChecks: CrossCheck[] = [];
  const legendKeys = new Map(layout.pins.map((template) => [template.n, { key: legendKeyFor(template, slot, pack), anchorKey: template.anchor?.key ?? null }]));
  for (const [, { key, anchorKey }] of legendKeys) {
    if (anchorKey === null) continue;
    const grail = counterpart(key, pack, ctx);
    const numbers = record.screenNumbers.filter((item) => item.anchorKey === anchorKey).sort((a, b) => a.hit - b.hit)[0];
    const value = numbers?.values[0];
    if (grail === null || value === undefined) continue;
    const screen = sourced(value, 'screen', 'screen', null, ctx, { collectedAtIso: record.capturedAtIso });
    crossChecks.push(crossCheck(anchorKey, screen, grail, ctx));
  }
  const max = record.lupaOn && record.focus !== null ? PRINT_BUDGET.pinsWithZoom : PRINT_BUDGET.pins;
  // 3.5.5 (owner: pins placed automatically and right, without the SE): only a pin on a label the reading found
  // (`anchor`) or one the SE placed (`manual`) is drawn; a pin left at its layout's estimated spot never is — what it
  // would have said reaches the slide as an unnumbered line under the legend instead ("Também nesta tela").
  const drawn = source.filter((pin) => pin.origin !== 'template');
  const kept = drawn.slice(0, max);
  const notes = source.filter((pin) => pin.origin === 'template').map((pin) => pin.legend);
  return {
    notes,
    pins: kept.map((pin, index) => ({ n: index + 1, x: pin.x / PRINT_SPACE.width, y: pin.y / PRINT_SPACE.height, label: pin.legend })),
    legend: kept.map((pin) => {
      const check = pin.anchorKey === undefined ? undefined : crossChecks.find((item) => item.anchorKey === pin.anchorKey);
      return check === undefined ? pin.legend : `${pin.legend} (${check.text})`;
    }),
    crossChecks,
  };
}
