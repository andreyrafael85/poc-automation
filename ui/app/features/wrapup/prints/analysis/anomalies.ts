import { entityType } from '../../../../utils/deepLinks';
import { THRESHOLDS } from '../constants';
import { incidentAnchorMs } from '../evidence/windows';
import { printText } from '../text';
import type { Anomaly, AnalysisCtx, AnomalySeverity, EvidencePack, K8sCapacity, MinuteSeries, ShotSlot } from '../types';
import { formatCount, formatPct, formatRatio, readOf, sourced } from './sourced';

export type { Anomaly, AnomalyRuleId, AnomalySeverity } from '../types';

/** A tenant name inside a headline pill (D8b) is cut to this, so the pill stays ≤ 60 characters. */
const HEADLINE_NAME_MAX = 24;

/**
 * The detector of the real-prints deck (3.2.7, spec §4.6): only the rules that feed a finding.
 *
 * Each rule is a comparison against a threshold of `THRESHOLDS` — a run of minutes at 100 %
 * failures, throughput below a fifth of its baseline, a p90 ten times its usual, Core Web Vitals
 * past Google's goals, reservation without use, a log cascade, a root cause that keeps coming
 * back. The baseline of the incident rules is the 30 minutes of W before its anchor (the first
 * correlated event); a per-minute ratio only counts minutes with enough requests (`MIN_REQ`), and
 * a partial read never feeds a rule that a missing row could invert (D11). The signal helpers are
 * exported, so the narrative cites the same numbers the detector judged.
 */

// ------------------------------------------------------------------ series helpers

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] as number) : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/** The instant of bin `index` of a series. */
export function isoAt(series: MinuteSeries, index: number): string {
  return new Date(Date.parse(series.startIso) + index * series.stepMs).toISOString();
}

export interface Baseline {
  value: number | null;
  points: number;
  /** Fewer than `baselineMinPoints` before the anchor: the median of the whole window ("linha de base: janela toda"). */
  wholeWindow: boolean;
}

/** The median of the non-null bins before `anchorMs`; the whole series' median when too few. */
export function baselineOf(series: MinuteSeries, anchorMs: number): Baseline {
  const start = Date.parse(series.startIso);
  const before: number[] = [];
  const all: number[] = [];
  series.values.forEach((value, index) => {
    if (value === null) return;
    all.push(value);
    if (start + index * series.stepMs < anchorMs) before.push(value);
  });
  if (before.length >= THRESHOLDS.baselineMinPoints) return { value: median(before), points: before.length, wholeWindow: false };
  return { value: median(all), points: all.length, wholeWindow: true };
}

/** The anchor of the pack's W (its start + 30 min); the series' own start + 30 min without one. */
export function anchorFor(pack: Pick<EvidencePack, 'windows'>, series: MinuteSeries): number {
  const incident = pack.windows.incident;
  return incident !== undefined ? incidentAnchorMs(incident) : Date.parse(series.startIso) + 30 * 60_000;
}

export interface SeriesRun {
  from: number;
  to: number;
  minutes: number;
  fromIso: string;
  toIso: string;
}

/** Consecutive bins where `flag` holds; the longest (the first on a tie). */
export function longestRun(series: MinuteSeries, flag: (index: number) => boolean): SeriesRun | null {
  let best: { from: number; to: number } | null = null;
  let start = -1;
  for (let index = 0; index <= series.values.length; index += 1) {
    const on = index < series.values.length && flag(index);
    if (on && start < 0) start = index;
    if (!on && start >= 0) {
      if (best === null || index - 1 - start > best.to - best.from) best = { from: start, to: index - 1 };
      start = -1;
    }
  }
  if (best === null) return null;
  return { ...best, minutes: best.to - best.from + 1, fromIso: isoAt(series, best.from), toIso: isoAt(series, best.to) };
}

/** `MIN_REQ`: a per-minute ratio counts a minute only with at least this many requests. */
export function minRequestsGuard(baselineRequests: number | null): number {
  return Math.max(THRESHOLDS.minRequestsPerMinute, THRESHOLDS.minRequestsShareOfBaseline * (baselineRequests ?? 0));
}

// ------------------------------------------------------------------ services (D1, D3, D4, D5a)

export interface ServiceSignals {
  id: string;
  name: string;
  baseline: Baseline;
  /** D1: requests ≥ 5 and failures ≥ requests, minute after minute. */
  outage: (SeriesRun & { failed: number; total: number; baselineFailures: number | null }) | null;
  /** D3: requests ≤ 20 % of the baseline for ≥ 2 minutes (baseline ≥ 50/min). */
  collapse: (SeriesRun & { min: number; minIso: string; dropPct: number }) | null;
  /** D4: ≥ 2 minutes with no data point (baseline ≥ 50/min). */
  gap: SeriesRun | null;
  /** The worst-minute p90 against the baseline p90 (ms); `spike` when D5a holds. */
  p90: { baselineMs: number; worstMs: number; worstIso: string; ratio: number; spike: boolean } | null;
}

export function serviceSignals(service: NonNullable<EvidencePack['services']>[number], anchorMs: number): ServiceSignals {
  const { requests, failures, p90Us } = service;
  const baseline = baselineOf(requests, anchorMs);
  const base = baseline.value;

  const outageRun = longestRun(requests, (index) => {
    const req = requests.values[index] ?? null;
    const fail = failures.values[index] ?? null;
    return req !== null && fail !== null && req >= THRESHOLDS.outageMinRequests && fail >= req;
  });
  let outage: ServiceSignals['outage'] = null;
  if (outageRun !== null) {
    let failed = 0;
    let total = 0;
    for (let index = outageRun.from; index <= outageRun.to; index += 1) {
      failed += failures.values[index] ?? 0;
      total += requests.values[index] ?? 0;
    }
    outage = { ...outageRun, failed, total, baselineFailures: baselineOf(failures, anchorMs).value };
  }

  let collapse: ServiceSignals['collapse'] = null;
  if (base !== null && base >= THRESHOLDS.collapseMinBaseline) {
    const limit = THRESHOLDS.collapseShare * base;
    const run = longestRun(requests, (index) => {
      const req = requests.values[index] ?? null;
      return req !== null && req <= limit;
    });
    if (run !== null && run.minutes >= THRESHOLDS.collapseMinRun) {
      let minIndex = run.from;
      for (let index = run.from; index <= run.to; index += 1) if ((requests.values[index] ?? Infinity) < (requests.values[minIndex] ?? Infinity)) minIndex = index;
      const min = requests.values[minIndex] ?? 0;
      collapse = { ...run, min, minIso: isoAt(requests, minIndex), dropPct: 100 * (1 - min / base) };
    }
  }

  let gap: SeriesRun | null = null;
  if (base !== null && base >= THRESHOLDS.gapMinBaseline) {
    const run = longestRun(requests, (index) => requests.values[index] === null);
    if (run !== null && run.minutes >= THRESHOLDS.gapMinRun) gap = run;
  }

  let p90: ServiceSignals['p90'] = null;
  const p90Base = baselineOf(p90Us, anchorMs).value;
  let worstIndex = -1;
  p90Us.values.forEach((value, index) => {
    if (value !== null && (worstIndex < 0 || value > (p90Us.values[worstIndex] ?? -Infinity))) worstIndex = index;
  });
  if (p90Base !== null && p90Base > 0 && worstIndex >= 0) {
    const baselineMs = p90Base / 1000;
    const worstMs = (p90Us.values[worstIndex] ?? 0) / 1000;
    const ratio = worstMs / baselineMs;
    p90 = { baselineMs, worstMs, worstIso: isoAt(p90Us, worstIndex), ratio, spike: ratio >= THRESHOLDS.p90SpikeRatio && worstMs >= THRESHOLDS.p90SpikeMinMs };
  }
  return { id: service.id, name: service.name, baseline, outage, collapse, gap, p90 };
}

// ------------------------------------------------------------------ frontend (D6, D7)

export type Verdict = 'good' | 'warn' | 'bad';

/** Google's Core Web Vitals goals: good up to the first threshold, poor past the second. */
export function vitalVerdict(kind: 'lcpMs' | 'inpMs' | 'cls', value: number): Verdict {
  const [good, poor] = THRESHOLDS.vitals[kind];
  return value <= good ? 'good' : value <= poor ? 'warn' : 'bad';
}

export interface FrontendSignals {
  baselineErrors: number | null;
  peak: number | null;
  peakIso: string | null;
  /** Peak over the baseline median; null when the baseline is 0. */
  ratio: number | null;
  /** D7: peak ≥ 3× the baseline and ≥ 10 errors per minute. */
  spike: boolean;
  /** The highest errors per 100 requests among the minutes that pass `MIN_REQ`. */
  per100: { value: number; iso: string; requests: number } | null;
  guard: number;
}

/** Errors per 100 requests, minute by minute, skipping minutes below `MIN_REQ` (a 10-request minute never peaks). */
export function per100Peak(requests: MinuteSeries, errors: MinuteSeries, guard: number): FrontendSignals['per100'] {
  let best: FrontendSignals['per100'] = null;
  requests.values.forEach((req, index) => {
    const err = errors.values[index] ?? null;
    if (req === null || err === null || req < guard || req <= 0) return;
    const value = (100 * err) / req;
    if (best === null || value > best.value) best = { value, iso: isoAt(requests, index), requests: req };
  });
  return best;
}

export function frontendSignals(minutes: { requests: MinuteSeries; errors: MinuteSeries }, anchorMs: number): FrontendSignals {
  const baselineErrors = baselineOf(minutes.errors, anchorMs).value;
  let peakIndex = -1;
  minutes.errors.values.forEach((value, index) => {
    if (value !== null && (peakIndex < 0 || value > (minutes.errors.values[peakIndex] ?? -Infinity))) peakIndex = index;
  });
  const peak = peakIndex < 0 ? null : (minutes.errors.values[peakIndex] ?? null);
  const ratio = peak !== null && baselineErrors !== null && baselineErrors > 0 ? peak / baselineErrors : null;
  // A spike is a multiple of the usual: with no errors before the anomaly there is no ratio to state
  // (the headline and the finding print one), so D7 needs a measured, non-zero baseline.
  const spike = peak !== null && ratio !== null && peak >= THRESHOLDS.feErrorSpikeMin && ratio >= THRESHOLDS.feErrorSpikeRatio;
  const guard = minRequestsGuard(baselineOf(minutes.requests, anchorMs).value);
  return { baselineErrors, peak, peakIso: peakIndex < 0 ? null : isoAt(minutes.errors, peakIndex), ratio, spike, per100: per100Peak(minutes.requests, minutes.errors, guard), guard };
}

// ------------------------------------------------------------------ Kubernetes (D8a, D8b, D9)

export interface CapacitySignals {
  memReqOfAlloc: number | null;
  memUsedOfReq: number | null;
  cpuReqOfAlloc: number | null;
  cpuUsedOfReq: number | null;
  memoryIdle: boolean;
  cpuIdle: boolean;
}

const share = (part: number | null, whole: number | null) => (part === null || whole === null || whole <= 0 ? null : part / whole);

export function capacitySignals(capacity: K8sCapacity): CapacitySignals {
  const memReqOfAlloc = share(capacity.memReqGiB, capacity.memAllocGiB);
  const memUsedOfReq = share(capacity.memUsedGiB, capacity.memReqGiB);
  const cpuReqOfAlloc = share(capacity.cpuReq, capacity.cpuAlloc);
  const cpuUsedOfReq = share(capacity.cpuUsed, capacity.cpuReq);
  const { memReservedIdle, cpuReservedIdle } = THRESHOLDS;
  return {
    memReqOfAlloc,
    memUsedOfReq,
    cpuReqOfAlloc,
    cpuUsedOfReq,
    memoryIdle: memReqOfAlloc !== null && memUsedOfReq !== null && memReqOfAlloc >= memReservedIdle.reqOfAlloc && memUsedOfReq <= memReservedIdle.usedOfReq,
    cpuIdle: cpuReqOfAlloc !== null && cpuUsedOfReq !== null && cpuReqOfAlloc >= cpuReservedIdle.reqOfAlloc && cpuUsedOfReq <= cpuReservedIdle.usedOfReq,
  };
}

type ChurnRow = NonNullable<NonNullable<EvidencePack['k8s']>['churn']>['rows'][number];

export interface ChurnSignals {
  total: number | null;
  /** OOM kills of the listed workloads (a floor: the query lists the top five). */
  oom: number;
  top: ChurnRow | null;
  second: ChurnRow | null;
  top2Share: number | null;
  /** The workload with the most OOM kills. */
  oomLeader: ChurnRow | null;
  severity: AnomalySeverity | null;
}

export function churnSignals(churn: NonNullable<NonNullable<EvidencePack['k8s']>['churn']>): ChurnSignals {
  const rows = [...churn.rows].sort((a, b) => b.restarts - a.restarts);
  const top = rows[0] ?? null;
  const second = rows[1] ?? null;
  const oom = rows.reduce((sum, row) => sum + (row.oom ?? 0), 0);
  const oomLeader = rows.filter((row) => (row.oom ?? 0) > 0).sort((a, b) => (b.oom ?? 0) - (a.oom ?? 0))[0] ?? null;
  const top2Share = churn.total !== null && churn.total > 0 && top !== null ? (top.restarts + (second?.restarts ?? 0)) / churn.total : null;
  let severity: AnomalySeverity | null = null;
  if (oom >= THRESHOLDS.oomHigh) severity = 'high';
  else if ((top?.restarts ?? 0) >= THRESHOLDS.restartsMedium) severity = 'medium';
  else if (top2Share !== null && top2Share >= THRESHOLDS.churnTop2Share) severity = 'info';
  return { total: churn.total, oom, top, second, top2Share, oomLeader, severity };
}

// ------------------------------------------------------------------ logs (D11, D17)

/** D11: ≥ 3 top signatures with the same count (± 1 %): one failure written several times. */
export function cascadeOf(logs: NonNullable<EvidencePack['logs']>): { k: number; count: number; share: number | null } | null {
  let best: { k: number; count: number } | null = null;
  for (const anchor of logs.signatures) {
    if (anchor.occurrences <= 0) continue;
    const k = logs.signatures.filter((other) => Math.abs(other.occurrences - anchor.occurrences) <= THRESHOLDS.cascadeTolerance * anchor.occurrences).length;
    if (k >= THRESHOLDS.cascadeK && (best === null || k * anchor.occurrences > best.k * best.count)) best = { k, count: anchor.occurrences };
  }
  if (best === null) return null;
  return { ...best, share: logs.totalErrors !== null && logs.totalErrors > 0 ? (best.k * best.count) / logs.totalErrors : null };
}

// ------------------------------------------------------------------ recurrence (D13)

export interface RecurrenceSignals {
  count: number;
  rank: number;
  next: { id: string; name: string; problems: number } | null;
  ratio: number | null;
  fires: boolean;
}

/**
 * D13. The rank is counted by id when the root id is known, else as 1 + the roots with strictly
 * more problems (ties share the rank).
 */
export function recurrenceSignals(recurrence: NonNullable<EvidencePack['recurrence']>, rootId: string | null): RecurrenceSignals | null {
  const count = recurrence.anchorProblems;
  if (count === null) return null;
  const self = (rootId !== null ? recurrence.rank.find((row) => row.id === rootId) : undefined) ?? (rootId === null ? recurrence.rank.find((row) => row.problems === count) : undefined);
  const rank = self !== undefined ? recurrence.rank.indexOf(self) + 1 : 1 + recurrence.rank.filter((row) => row.problems > count).length;
  const others = recurrence.rank.filter((row) => row !== self && row.id !== rootId);
  const next = rank === 1 ? (others[0] ?? null) : (recurrence.rank[0] ?? null);
  const ratio = rank === 1 && next !== null && next.problems > 0 ? count / next.problems : null;
  return { count, rank, next, ratio, fires: count >= THRESHOLDS.recurrenceMin };
}

// ------------------------------------------------------------------ topology (D14)

export function blastOf(topology: NonNullable<EvidencePack['topology']>): { hop1: number; hop2: number; apps: number; upstream: number; fires: boolean } | null {
  const blast = topology.blast;
  if (blast === null) return null;
  const hop1 = blast.hop1Ids.length;
  const hop2 = blast.hop2Ids.filter((id) => !blast.hop1Ids.includes(id)).length;
  const upstream = hop1 + hop2;
  return { hop1, hop2, apps: blast.apps.length, upstream, fires: upstream >= THRESHOLDS.blastMin };
}

// ------------------------------------------------------------------ failing service (D18)

export interface EndpointSignals {
  row: NonNullable<EvidencePack['failing']>['rows'][number];
  top: NonNullable<EvidencePack['failing']>['endpoints'][number];
  topShare: number;
  worst: NonNullable<EvidencePack['failing']>['endpoints'][number];
  /** The worst endpoint's rate over the service's. */
  worstRatio: number | null;
  fires: boolean;
}

export function endpointSignals(failing: NonNullable<EvidencePack['failing']>, serviceId: string | null): EndpointSignals | null {
  const row = failing.rows.find((item) => item.id === serviceId) ?? (serviceId === null ? failing.rows[0] : undefined);
  const top = [...failing.endpoints].sort((a, b) => b.failures - a.failures)[0];
  const worst = [...failing.endpoints].sort((a, b) => b.failurePct - a.failurePct || b.failures - a.failures)[0];
  if (row === undefined || top === undefined || worst === undefined || row.failures <= 0) return null;
  const topShare = top.failures / row.failures;
  const worstRatio = row.failurePct > 0 ? worst.failurePct / row.failurePct : null;
  return { row, top, topShare, worst, worstRatio, fires: topShare >= THRESHOLDS.endpointShare || (worstRatio !== null && worstRatio >= THRESHOLDS.endpointRateRatio) };
}

// ------------------------------------------------------------------ host (D16)

export function hostSignals(host: NonNullable<EvidencePack['host']>): { ratio: number | null; hot: boolean } {
  const { hotHost } = THRESHOLDS;
  const ratio = host.cpuAvg !== null && host.fleetMedianCpu !== null && host.fleetMedianCpu > 0 ? host.cpuAvg / host.fleetMedianCpu : null;
  const busy = (host.cpuAvg ?? 0) >= hotHost.cpuAvg || (host.cpuPeak ?? 0) >= hotHost.cpuPeak;
  return { ratio, hot: busy && ratio !== null && ratio >= hotHost.fleetRatio };
}

// ------------------------------------------------------------------ the detector

const SEVERITY_RANK: Readonly<Record<AnomalySeverity, number>> = { critical: 0, high: 1, medium: 2, info: 3 };

/** Strongest first: severity, then ratio. */
export function compareAnomalies(a: Anomaly, b: Anomaly): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.ratio ?? 0) - (a.ratio ?? 0);
}

export function severityRank(severity: AnomalySeverity): number {
  return SEVERITY_RANK[severity];
}

/** The entity a shot shows: from its slot, else from its id (`${kind}--${lower-cased entity id}`, spec §3.8). */
export function subjectIdOf(pack: Pick<EvidencePack, 'shotId'>, slot?: Pick<ShotSlot, 'subject'> | null): string | null {
  const subject = slot?.subject;
  if (subject !== undefined) {
    if (subject.kind === 'service') return subject.serviceId;
    if (subject.kind === 'frontend') return subject.frontendId;
    if (subject.kind === 'k8s-cluster') return subject.clusterId;
    if (subject.kind === 'host') return subject.hostId;
    return null;
  }
  const match = /--([a-z][a-z0-9_]*-[0-9a-f]{16})$/.exec(pack.shotId);
  const id = match?.[1]?.toUpperCase() ?? null;
  return entityType(id) === null ? null : id;
}

/**
 * The anomalies of one pack (§4.6), strongest first. `slot` names the shot's entity and incident
 * (the failing service of D18, the root of D13); without it they are read from the shot id and the
 * recurrence ranking.
 */
export function detectAnomalies(pack: EvidencePack, ctx: AnalysisCtx, slot?: Pick<ShotSlot, 'subject' | 'incident'> | null): Anomaly[] {
  const out: Anomaly[] = [];
  const add = (anomaly: Anomaly) => out.push(anomaly);
  const { locale } = ctx;

  const servicesRead = readOf(pack, 'ev.service.minutes');
  for (const service of pack.services ?? []) {
    const signals = serviceSignals(service, anchorFor(pack, service.requests));
    const W = pack.windows.incident ?? null;
    const dql = (value: number, unit: 'min' | 'pct' | 'ms' | 'count') => sourced(value, 'dql', 'ev.service.minutes', W, ctx, { unit, collectedAtIso: servicesRead.collectedAtIso });
    if (signals.outage !== null) {
      add({ rule: 'D1', shotId: pack.shotId, severity: 'critical', entityId: service.id, fromIso: signals.outage.fromIso, toIso: signals.outage.toIso, value: dql(signals.outage.minutes, 'min'), headline: { key: 'prt.anom.D1', params: { minutes: formatCount(signals.outage.minutes, locale) } } });
    }
    if (signals.collapse !== null && signals.baseline.value !== null) {
      add({
        rule: 'D3',
        shotId: pack.shotId,
        severity: 'high',
        entityId: service.id,
        fromIso: signals.collapse.fromIso,
        toIso: signals.collapse.toIso,
        value: dql(signals.collapse.dropPct, 'pct'),
        baseline: dql(signals.baseline.value, 'count'),
        headline: { key: 'prt.anom.D3', params: { pct: formatPct(signals.collapse.dropPct, locale) } },
      });
    }
    if (signals.gap !== null) {
      add({ rule: 'D4', shotId: pack.shotId, severity: 'medium', entityId: service.id, fromIso: signals.gap.fromIso, toIso: signals.gap.toIso, value: dql(signals.gap.minutes, 'min'), headline: { key: 'prt.anom.D4', params: { minutes: formatCount(signals.gap.minutes, locale) } } });
    }
    if (signals.p90?.spike === true) {
      add({
        rule: 'D5a',
        shotId: pack.shotId,
        severity: 'high',
        entityId: service.id,
        fromIso: signals.p90.worstIso,
        toIso: signals.p90.worstIso,
        value: dql(signals.p90.worstMs, 'ms'),
        baseline: dql(signals.p90.baselineMs, 'ms'),
        ratio: signals.p90.ratio,
        headline: { key: 'prt.anom.D5a', params: { ratio: formatRatio(signals.p90.ratio, locale) } },
      });
    }
  }

  const frontend = pack.frontend;
  const vitals = frontend?.screen ?? frontend?.incident ?? frontend?.problem ?? null;
  if (vitals !== null && vitals.inpMs !== null && frontend !== undefined) {
    const verdict = vitalVerdict('inpMs', vitals.inpMs);
    if (verdict !== 'good') {
      const window = frontend.screen !== undefined ? (pack.windows.screen ?? null) : frontend.incident !== undefined ? (pack.windows.incident ?? null) : (pack.windows.problem ?? null);
      const ratio = vitals.inpMs / THRESHOLDS.vitals.inpMs[0];
      add({
        rule: 'D6',
        shotId: pack.shotId,
        severity: verdict === 'bad' ? 'high' : 'medium',
        entityId: subjectIdOf(pack, slot),
        value: sourced(vitals.inpMs, 'rum', 'ev.frontend.summary', window, ctx, { unit: 'ms' }),
        ratio,
        headline: { key: 'prt.anom.D6', params: { ratio: formatRatio(ratio, locale) } },
      });
    }
  }
  if (frontend?.minutes !== undefined) {
    const signals = frontendSignals(frontend.minutes, anchorFor(pack, frontend.minutes.errors));
    if (signals.spike && signals.peak !== null && signals.peakIso !== null && signals.ratio !== null) {
      const W = pack.windows.incident ?? null;
      const ratio = signals.ratio;
      add({
        rule: 'D7',
        shotId: pack.shotId,
        severity: 'high',
        entityId: subjectIdOf(pack, slot),
        fromIso: signals.peakIso,
        toIso: signals.peakIso,
        value: sourced(signals.peak, 'rum', 'ev.frontend.minutes', W, ctx),
        ...(signals.baselineErrors === null ? {} : { baseline: sourced(signals.baselineErrors, 'rum', 'ev.frontend.minutes', W, ctx) }),
        ratio,
        headline: { key: 'prt.anom.D7', params: { ratio: formatRatio(ratio, locale) } },
      });
    }
  }

  const k8s = pack.k8s;
  if (k8s !== undefined) {
    const screen = pack.windows.screen ?? null;
    if (k8s.capacity !== null) {
      const capacity = capacitySignals(k8s.capacity);
      if (capacity.memoryIdle || capacity.cpuIdle) {
        const req = capacity.memoryIdle ? capacity.memReqOfAlloc : capacity.cpuReqOfAlloc;
        const used = capacity.memoryIdle ? capacity.memUsedOfReq : capacity.cpuUsedOfReq;
        add({
          rule: 'D8a',
          shotId: pack.shotId,
          severity: 'medium',
          entityId: subjectIdOf(pack, slot),
          value: sourced(100 * (req ?? 0), 'dql', 'ev.k8s.capacity', screen, ctx, { unit: 'pct' }),
          baseline: sourced(100 * (used ?? 0), 'dql', 'ev.k8s.capacity', screen, ctx, { unit: 'pct' }),
          // The memory headline only when memory is the idle reservation; CPU alone has its own words.
          headline: { key: capacity.memoryIdle ? 'prt.anom.D8a' : 'prt.anom.D8a.cpu', params: { req: formatPct(100 * (req ?? 0), locale), used: formatPct(100 * (used ?? 0), locale) } },
        });
      }
    }
    const above = [...k8s.workloads].filter((row) => (row.memOfReqPct ?? 0) > 100).sort((a, b) => (b.memOfReqPct ?? 0) - (a.memOfReqPct ?? 0))[0];
    if (above !== undefined) {
      // A workload name is tenant text: redacted for the profile and cut so the pill stays ≤ 60 characters.
      const workload = printText(above.name, HEADLINE_NAME_MAX, ctx.profile);
      add({ rule: 'D8b', shotId: pack.shotId, severity: 'medium', entityId: subjectIdOf(pack, slot), value: sourced(above.memOfReqPct, 'dql', 'ev.k8s.workloads', screen, ctx, { unit: 'pct' }), headline: { key: 'prt.anom.D8b', params: { workload } } });
    }
    if (k8s.churn !== null) {
      const churn = churnSignals(k8s.churn);
      const day = pack.windows.day ?? null;
      if (churn.severity !== null && churn.top !== null) {
        const oomKill = churn.oom >= THRESHOLDS.oomHigh;
        add({
          rule: 'D9',
          shotId: pack.shotId,
          severity: churn.severity,
          entityId: subjectIdOf(pack, slot),
          value: sourced(oomKill ? churn.oom : churn.top.restarts, 'dql', 'ev.k8s.churn', day, ctx),
          ...(churn.top2Share === null ? {} : { ratio: churn.top2Share }),
          headline: oomKill
            ? { key: 'prt.anom.D9', params: { oom: formatCount(churn.oom, locale) } }
            : { key: 'prt.anom.D9.restarts', params: { restarts: formatCount(churn.total ?? churn.top.restarts, locale) } },
        });
      }
    }
  }

  const logs = pack.logs;
  if (logs !== undefined) {
    const read = readOf(pack, 'ev.logs.errors');
    const cascade = read.partial ? null : cascadeOf(logs);
    if (cascade !== null) {
      add({ rule: 'D11', shotId: pack.shotId, severity: 'medium', entityId: null, value: sourced(cascade.k, 'dql', 'ev.logs.errors', pack.windows.screen ?? null, ctx), headline: { key: 'prt.anom.D11', params: { k: formatCount(cascade.k, locale) } } });
    }
    if (logs.incidentLogCount === 0) {
      add({ rule: 'D17', shotId: pack.shotId, severity: 'info', entityId: null, value: sourced(0, 'dql', 'ev.logs.errors', null, ctx), headline: { key: 'prt.anom.D17', params: {} } });
    }
  }

  if (pack.recurrence !== undefined) {
    const rootId = slot?.incident?.rootCauseId ?? null;
    const recurrence = recurrenceSignals(pack.recurrence, rootId);
    if (recurrence?.fires === true) {
      const partial = readOf(pack, 'ev.problem.recurrence').partial;
      add({
        rule: 'D13',
        shotId: pack.shotId,
        severity: recurrence.rank === 1 ? 'high' : 'medium',
        entityId: rootId,
        value: sourced(recurrence.count, 'dql', 'ev.problem.recurrence', pack.windows.recurrence ?? null, ctx, { partial }),
        ...(recurrence.ratio === null ? {} : { ratio: recurrence.ratio }),
        headline: { key: 'prt.anom.D13', params: { count: partial ? ctx.t('prt.src.atLeast', { value: formatCount(recurrence.count, locale) }) : formatCount(recurrence.count, locale) } },
      });
    }
  }

  if (pack.topology !== undefined) {
    const blast = blastOf(pack.topology);
    if (blast?.fires === true) {
      add({ rule: 'D14', shotId: pack.shotId, severity: 'info', entityId: null, value: sourced(blast.upstream, 'dql', 'ev.topology.blast', pack.windows.screen ?? null, ctx), headline: { key: 'prt.anom.D14', params: { count: formatCount(blast.upstream, locale) } } });
    }
  }

  if (pack.security !== undefined && pack.security.actNow > 0) {
    add({ rule: 'D15', shotId: pack.shotId, severity: 'critical', entityId: null, value: sourced(pack.security.actNow, 'app', 'sec.posture', pack.windows.global ?? null, ctx), headline: { key: 'prt.anom.D15', params: { count: formatCount(pack.security.actNow, locale) } } });
  }

  if (pack.host !== undefined) {
    const host = hostSignals(pack.host);
    if (host.hot && host.ratio !== null && pack.host.cpuAvg !== null) {
      add({
        rule: 'D16',
        shotId: pack.shotId,
        severity: 'medium',
        entityId: pack.host.id,
        value: sourced(pack.host.cpuAvg, 'dql', 'ev.host.cpu', pack.windows.screen ?? null, ctx, { unit: 'pct' }),
        ratio: host.ratio,
        headline: { key: 'prt.anom.D16', params: { ratio: formatRatio(host.ratio, locale) } },
      });
    }
  }

  if (pack.failing !== undefined) {
    const endpoints = endpointSignals(pack.failing, subjectIdOf(pack, slot));
    if (endpoints?.fires === true) {
      const global = pack.windows.global ?? null;
      add({
        rule: 'D18',
        shotId: pack.shotId,
        severity: 'medium',
        entityId: endpoints.row.id,
        value: sourced(100 * endpoints.topShare, 'dql', 'ev.failing.endpoints', global, ctx, { unit: 'pct' }),
        ...(endpoints.worstRatio === null ? {} : { ratio: endpoints.worstRatio }),
        headline: { key: 'prt.anom.D18', params: { share: formatPct(100 * endpoints.topShare, locale) } },
      });
    }
  }

  return out.sort(compareAnomalies);
}

/** The headline pill: the strongest anomaly's headline, translated; null when none fired. */
export function headlineOf(anomalies: readonly Anomaly[], ctx: AnalysisCtx): string | null {
  const top = [...anomalies].sort(compareAnomalies)[0];
  return top === undefined ? null : ctx.t(top.headline.key, top.headline.params);
}
