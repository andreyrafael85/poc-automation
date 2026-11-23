import {
  assumed,
  readingHighIsGood,
  readingLowIsGood,
  readingReaches,
  type AssumptionId,
  type Reading,
} from '../../config/assumptions';
import type { PocParameters } from '../../config/StudioContext';
import { EMPTY_BASELINE, type BaselineModel } from '../../config/StudioContext';
import { pluralKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { summarisePosture } from '../../models/security';
import { summariseRum } from '../../models/rum';
import { summariseCompetitors } from '../../models/competitor';
import { capacityTotals, toHostCapacity } from '../../models/capacity';
import { CAPACITY_LIST_LIMIT } from '../../queries/catalog';
import { summariseCloud, PROVIDER_META, type CloudProvider } from '../../models/cloud';
import { summariseCloudServices } from '../../models/cloudServices';
import { summariseRca } from '../../models/rca';
import { CLOUD_LOGOS } from '../../models/cloudLogos';
import { arrivalSeries } from '../../models/problemTimeline';
import { toQualityRows } from '../../models/logQuality';
import {
  EMPTY_COST_MODEL,
  formatHours,
  formatMoney,
  isCostConfigured,
  isDowntimeConfigured,
  nanosToHours,
  type CostModel,
} from '../../models/cost';
import { isDynatraceTechnology, num, parseTechnology, str, type GrailRecord } from '../../utils/records';
import { formatBytes, formatNanos } from '../../utils/time';
import type { WrapupModel, WrapupSection, WrapupKpi, KpiStatus } from './deck';
import { PRODUCT_LOGOS } from './productLogos';
import { problemCategoryLabel } from '../problems/categoryLabel';
import { decimal } from '../../utils/activeLocale';

/**
 * Assembles the Tech Wrapup deck model from what the PoC actually measured.
 *
 * The narrative is unapologetically a Sales Engineer's value story — every line
 * frames a Dynatrace strength — but every *number* is read from the tenant, and
 * a section with no measured data is dropped rather than staged. Technical
 * domains come first (Problems → Infrastructure → … → Digital Experience →
 * Competitor), then the business finish (Overview → Executive → ROI), then a
 * strong close, mirroring the official technical-wrap-up format.
 */

export interface QueryLike {
  records: readonly GrailRecord[];
  outcome: string;
  /** The window the query was read over, when known (a `CatalogQueryResult` carries it). */
  timeframe?: { endIso: string };
}

export type WrapupResults = Record<string, QueryLike>;

export interface WrapupContext {
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
  params: PocParameters;
  /** Operator-supplied cost rates, for the executive and ROI money story. */
  costModel: CostModel;
  /** Operator "before Dynatrace" estimates, for the ROI comparison. */
  baseline: BaselineModel;
  /**
   * Whether licensing, DPS, consumption and priced material may be in the deck. The customer
   * profile (`false`, the default of every export) cuts the consumption section and every money
   * figure and hint; the SE profile keeps them. Licensing and cost are validation material for the
   * SE, a commercial conversation that belongs after the PoC.
   */
  commercial: boolean;
  windowLabel: string;
  generatedAtLabel: string;
  /** Full name of the logged-in Dynatrace user (SE), or null. */
  seName: string | null;
  /** White Dynatrace logo data URL for the deck. */
  dtLogo: string;
  /** Optional customer logo data URL. */
  customerLogo: string | null;
  /** Natural aspect ratio (w/h) of the customer logo. */
  customerLogoAspect: number | null;
  /** Optional partner logo data URL, for co-branding. */
  partnerLogo: string | null;
  /** Natural aspect ratio (w/h) of the partner logo. */
  partnerLogoAspect: number | null;
}

const ENTITY_CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;

const dash = '—';

function ok(result: QueryLike | undefined): boolean {
  return result !== undefined && result.outcome === 'ok';
}

function categoryValue(inventory: QueryLike | undefined, category: string): number | null {
  if (!ok(inventory)) return null;
  return num(inventory!.records.find((record) => str(record, 'category') === category), 'value');
}

export function buildWrapupModel(results: WrapupResults, ctx: WrapupContext): WrapupModel {
  const { t, formatNumber } = ctx;
  // The customer profile sees no rate and no baseline, so no figure in the deck can be priced.
  const costModel = ctx.commercial ? ctx.costModel : EMPTY_COST_MODEL;
  const baseline = ctx.commercial ? ctx.baseline : EMPTY_BASELINE;
  const kpi = (label: string, value: string, opts?: { status?: KpiStatus; emoji?: string }): WrapupKpi => ({
    label,
    value,
    ...(opts?.status !== undefined ? { status: opts.status } : {}),
    ...(opts?.emoji !== undefined ? { emoji: opts.emoji } : {}),
  });
  // Traffic-light status of a figure against two lines from the assumptions registry, so the deck
  // and the app judge the same number the same way. `band`: up to the first line is good (lower is
  // better). `bandReaches`: reaching the first line needs attention, the second is poor. `bandHigh`:
  // at or above the first line is good (higher is better).
  const status = (reading: Reading | null): KpiStatus | undefined =>
    reading === null ? undefined : reading === 'good' ? 'good' : reading === 'attention' ? 'warn' : 'bad';
  const band = (value: number | null, good: AssumptionId, attention: AssumptionId): KpiStatus | undefined =>
    status(readingLowIsGood(value, assumed(good), assumed(attention)));
  const bandReaches = (value: number | null, first: AssumptionId, second: AssumptionId): KpiStatus | undefined =>
    status(readingReaches(value, assumed(first), assumed(second)));
  const bandHigh = (value: number | null, good: AssumptionId, attention: AssumptionId): KpiStatus | undefined =>
    status(readingHighIsGood(value, assumed(good), assumed(attention)));
  const nfmt = (value: number | null, unit = ''): string =>
    value === null ? dash : `${formatNumber(value)}${unit === '' ? '' : ' ' + unit}`;

  const inventory = results['cov.inventory'];
  const buckets = results['cov.buckets'];
  const problems = results['prob.summary'];
  const mttx = results['prob.mttx'];
  const exposure = results['prob.exposure'];
  // 3.7.3: the hours and the money of the exposure count only problems with a named root cause.
  const exposureRca = results['prob.exposure.rca'];
  const mttxRca = results['prob.mttx.rca'];
  const timeline = results['prob.timeline'];
  const topEntities = results['prob.topentities'];
  const recurrent = results['prob.recurrent.total'];
  const serviceTotals = results['svc.totals'];
  const serviceRanking = results['svc.ranking'];
  const technologies = results['proc.technologies'];
  const capacityTotal = results['infra.capacity.total'];
  const capacity = results['infra.capacity'];
  const capacityExact = results['infra.capacity.summary'];
  const k8sRestarts = results['k8s.restarts'];
  const k8sRestartTotals = results['k8s.restarts.total'];
  const k8sPressureTotals = results['k8s.pressure.total'];
  const logs = results['log.ingest'];
  const logQuality = results['log.quality'];
  const advisor = results['cons.advisor'];
  const vulnerabilities = results['sec.posture'];
  const rumScore = results['rum.scorecard'];
  const rumVitals = results['rum.webvitals'];
  const agents = results['comp.agents'];

  // -------- shared measured values --------
  const entities = ENTITY_CATEGORIES.reduce<number | null>((total, category) => {
    const value = categoryValue(inventory, category);
    return value === null ? total : (total ?? 0) + value;
  }, null);
  const coveredTypes = ok(inventory)
    ? ENTITY_CATEGORIES.filter((category) => (categoryValue(inventory, category) ?? 0) > 0).length
    : null;
  const coveragePct = coveredTypes === null ? null : Math.round((coveredTypes / ENTITY_CATEGORIES.length) * 100);

  const totalProblems = ok(problems)
    ? problems!.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0)
    : null;
  const activeProblems = ok(problems)
    ? problems!.records
        .filter((record) => str(record, 'event.status') === 'ACTIVE')
        .reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0)
    : null;
  const closurePct =
    totalProblems !== null && totalProblems > 0 && activeProblems !== null
      ? Math.round(((totalProblems - activeProblems) / totalProblems) * 100)
      : null;

  const mttxRows = ok(mttx)
    ? mttx!.records.map((record) => ({
        category: str(record, 'event.category') ?? 'Uncategorised',
        problems: num(record, 'problems') ?? 0,
        mttrNs: num(record, 'mttrNs'),
        totalNs: num(record, 'totalNs') ?? 0,
      }))
    : [];
  const resolvedCount = mttxRows.reduce((sum, row) => sum + row.problems, 0);
  const resolvedTotalNs = mttxRows.reduce((sum, row) => sum + row.totalNs, 0);
  const overallMttrNs = resolvedCount > 0 ? resolvedTotalNs / resolvedCount : null;
  const recurring = ok(recurrent) ? num(recurrent!.records[0], 'patterns') : null;
  // Patterns that repeat often enough to be worth a workflow: the figure the automation claims use.
  const automationCandidates = ok(recurrent) ? num(recurrent!.records[0], 'candidates') : null;

  // -------- operational exposure & cost (business finish) --------
  const exposureRow = ok(exposure) ? exposure!.records[0] : undefined;
  const activeOpenProblems = num(exposureRow, 'activeProblems');
  const totalOpenNs = ok(exposureRca) ? num(exposureRca!.records[0], 'totalOpenNs') : null;
  const oldestOpenNs = num(exposureRow, 'oldestOpenNs');
  const openHours = nanosToHours(totalOpenNs);
  // Availability problem-time only (with a named root cause), for the downtime half of the exposure.
  const availabilityNs = ok(mttxRca)
    ? mttxRca!.records
        .filter((record) => (str(record, 'event.category') ?? '').toUpperCase() === 'AVAILABILITY')
        .reduce((sum, record) => sum + (num(record, 'totalNs') ?? 0), 0)
    : 0;
  const availabilityHours = availabilityNs > 0 ? nanosToHours(availabilityNs) : null;
  const money = (value: number) => formatMoney(value, costModel.currencyLabel);
  const costConfigured = isCostConfigured(costModel);
  const downtimeConfigured = isDowntimeConfigured(costModel);
  const operationalCost =
    costConfigured && openHours !== null ? openHours * costModel.ratePerHour! : null;
  const downtimeCost =
    downtimeConfigured && availabilityHours !== null
      ? availabilityHours * costModel.downtimeRatePerHour!
      : null;
  const combinedExposure =
    operationalCost === null && downtimeCost === null ? null : (operationalCost ?? 0) + (downtimeCost ?? 0);

  // -------- baseline "before Dynatrace" comparison (operator estimates) --------
  const actualMttrHours = nanosToHours(overallMttrNs);
  const manualMttrHours = baseline.manualMttrHours;
  const mttrSpeedup =
    manualMttrHours !== null && actualMttrHours !== null && actualMttrHours > 0 ? manualMttrHours / actualMttrHours : null;
  const mttrHoursSaved =
    manualMttrHours !== null && actualMttrHours !== null && manualMttrHours > actualMttrHours
      ? (manualMttrHours - actualMttrHours) * resolvedCount
      : null;

  const technical: WrapupSection[] = [];
  const business: WrapupSection[] = [];

  // ============================ TECHNICAL ============================

  // 1. Problems & Dynatrace Intelligence
  if (ok(problems) || ok(mttx)) {
    const mttrHours = overallMttrNs === null ? null : overallMttrNs / 3_600_000_000_000;
    const closedStatus: KpiStatus | undefined =
      bandHigh(closurePct, 'problems.closed.good', 'problems.closed.attention');
    const kpis: WrapupKpi[] = [];
    if (totalProblems !== null) kpis.push(kpi(t('tw.problems.k.detected'), formatNumber(totalProblems), { emoji: '🔍' }));
    if (closurePct !== null) kpis.push(kpi(t('tw.problems.k.closed'), `${closurePct}%`, { status: closedStatus, emoji: '✅' }));
    if (overallMttrNs !== null) kpis.push(kpi(t('tw.problems.k.mttr'), formatNanos(overallMttrNs), { status: band(mttrHours, 'problems.mttr.good', 'problems.mttr.attention'), emoji: '⏱️' }));
    if (activeProblems !== null) kpis.push(kpi(t('tw.exec.k.open'), formatNumber(activeProblems), { status: band(activeProblems, 'problems.open.good', 'problems.open.attention'), emoji: '🚨' }));
    if (recurring !== null) kpis.push(kpi(t('tw.problems.k.recurring'), formatNumber(recurring), { emoji: '🔁' }));

    const slowest = mttxRows
      .filter((row) => row.mttrNs !== null)
      .sort((a, b) => (b.mttrNs ?? 0) - (a.mttrNs ?? 0))[0];
    const topEnts = ok(topEntities)
      ? topEntities!.records
          .map((record) => ({ name: str(record, 'affected') ?? dash, problems: num(record, 'problems') ?? 0 }))
          .filter((entry) => entry.problems > 0)
          .slice(0, 3)
      : [];

    // Alert distribution by category — what kind of problems the estate raised,
    // not a "problems appeared after Dynatrace" timeline.
    const categoryBars = ok(problems)
      ? (() => {
          const agg = new Map<string, number>();
          for (const record of problems!.records) {
            const category = str(record, 'event.category') ?? 'Uncategorised';
            agg.set(category, (agg.get(category) ?? 0) + (num(record, 'problems') ?? 0));
          }
          return [...agg.entries()]
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
        })()
      : [];

    // Whether the environment settled over the window, for a positive narrative line.
    // The arrivals per 6 h over the pinned 7 days, with the periods in which no problem began
    // counted as the zeros they are. Up to 3.2.0 the returned rows were averaged as they came,
    // so the quiet periods were missing and the halves compared only their busy periods.
    const timelineEnd = (() => {
      if (!ok(timeline)) return null;
      const end = Date.parse(timeline!.timeframe?.endIso ?? '');
      if (Number.isFinite(end)) return end;
      const latest = Math.max(...timeline!.records.map((record) => Date.parse(str(record, 'interval') ?? '')).filter(Number.isFinite));
      return Number.isFinite(latest) ? latest : null;
    })();
    const timelinePoints = timelineEnd === null ? [] : arrivalSeries(timeline!.records, timelineEnd).map((bin) => bin.count);
    const halfLen = Math.floor(timelinePoints.length / 2);
    const avgOf = (arr: number[]) => (arr.length > 0 ? arr.reduce((sum, value) => sum + value, 0) / arr.length : null);
    const firstAvg = halfLen > 0 ? avgOf(timelinePoints.slice(0, halfLen)) : null;
    const secondAvg = halfLen > 0 ? avgOf(timelinePoints.slice(halfLen)) : null;
    const dropPct =
      firstAvg !== null && secondAvg !== null && firstAvg > 0 ? Math.round(((firstAvg - secondAvg) / firstAvg) * 100) : null;

    const narrative = [t('tw.problems.n1'), t('tw.problems.n2')];
    // 3.3.16 (owner: "contexto e riqueza"): the slide opens on what its capture reads — the leading
    // category's share of every problem (the aggregate), and the window's mean per 6 hours.
    const leadCategory = categoryBars[0];
    const meanPer6h = avgOf(timelinePoints);
    if (leadCategory !== undefined && totalProblems !== null && totalProblems > 0)
      narrative.unshift(
        t(meanPer6h === null ? 'tw.lead.problems' : 'tw.lead.problemsMean', {
          category: problemCategoryLabel(leadCategory.label, t),
          share: `${formatNumber(Math.round((leadCategory.value / totalProblems) * 1000) / 10)}%`,
          total: formatNumber(totalProblems),
          mean: meanPer6h === null ? '' : formatNumber(Math.round(meanPer6h * 10) / 10),
        }),
      );
    if (topEnts.length > 0)
      narrative.push(t('tw.problems.i.topentity', { name: topEnts[0]!.name, count: formatNumber(topEnts[0]!.problems) }));
    if (slowest?.mttrNs != null)
      narrative.push(t('tw.problems.i.slowest', { category: slowest.category, dur: formatNanos(slowest.mttrNs) }));
    if (dropPct !== null && dropPct >= assumed('problems.trend.min')) narrative.push(t('tw.problems.i.improving', { pct: String(dropPct) }));

    const assist: string[] = [];
    if (closurePct !== null && closurePct >= assumed('problems.closed.attention')) assist.push(t('tw.problems.assist.auto', { pct: String(closurePct) }));
    if (topEnts.length > 0) assist.push(t('tw.problems.assist.concentration', { name: topEnts[0]!.name, count: formatNumber(topEnts[0]!.problems) }));
    if (slowest?.mttrNs != null) assist.push(t('tw.problems.assist.slow', { category: slowest.category }));
    if (recurring !== null && recurring > 0) assist.push(t('tw.problems.assist.recurring', { count: formatNumber(recurring) }));

    technical.push({
      id: 'problems',
      title: t('tw.problems.title'),
      subtitle: t('tw.problems.subtitle'),
      logo: PRODUCT_LOGOS.davis,
      highlight: closurePct !== null ? { value: `${closurePct}%`, caption: t('tw.problems.hi'), status: closedStatus, emoji: '✅' } : undefined,
      narrative,
      kpis,
      bars: categoryBars.length > 0 ? { title: t('tw.problems.bars'), items: categoryBars } : undefined,
      assist: assist.length > 0 ? assist : undefined,
    });
  }

  // 1b. Root-cause analysis — the single deepest incident, taken to its cause.
  const rca = summariseRca(results['rca.top']?.records ?? [], [], [], 15);
  if (rca.incident !== null) {
    const inc = rca.incident;
    const rcaKpis: WrapupKpi[] = [
      kpi(t('tw.rca.k.incident'), inc.displayId, { emoji: '🚨' }),
      kpi(t('tw.rca.k.rootCause'), inc.rootCauseName ?? dash, { emoji: '🎯' }),
      kpi(t('tw.rca.k.affected'), formatNumber(inc.affectedCount), { emoji: '🕸️' }),
    ];
    if (inc.durationNs !== null) rcaKpis.push(kpi(t('tw.rca.k.duration'), formatNanos(inc.durationNs), { emoji: '⏱️' }));
    const scopeLabel = inc.namespaces.join(', ') || inc.clusters.join(', ') || (inc.category !== '—' ? inc.category : dash);
    rcaKpis.push(kpi(t('tw.rca.k.scope'), scopeLabel, { emoji: '☸️' }));
    const rcaNarrative = [t('tw.rca.n1'), t('tw.rca.n2', { name: inc.name, category: inc.category })];
    if (inc.rootCauseName !== null)
      rcaNarrative.push(t('tw.rca.i.rootCause', { rc: inc.rootCauseName, count: formatNumber(inc.affectedCount) }));
    if (inc.namespaces.length > 0)
      rcaNarrative.push(t('tw.rca.i.scope', { ns: inc.namespaces.join(', '), cluster: inc.clusters.join(', ') || dash }));
    const rcaAssist: string[] = [];
    if (inc.rootCauseName !== null) rcaAssist.push(t('tw.rca.a1', { rc: inc.rootCauseName }));
    rcaAssist.push(t('tw.rca.a2'));
    rcaAssist.push(t('tw.rca.a3'));
    technical.push({
      id: 'rca',
      title: t('tw.rca.title'),
      subtitle: t('tw.rca.subtitle'),
      logo: PRODUCT_LOGOS.davis,
      highlight: { value: inc.rootCauseName ?? inc.displayId, caption: t('tw.rca.hi'), status: 'bad', emoji: '🎯' },
      narrative: rcaNarrative,
      kpis: rcaKpis,
      table:
        inc.affectedNames.length > 0
          ? { title: t('tw.rca.table'), headers: [t('tw.rca.h.entity')], rows: inc.affectedNames.slice(0, 6).map((name) => [name]) }
          : undefined,
      assist: rcaAssist,
    });
  }

  // 2. Infrastructure (hosts + capacity only; cloud is its own section)
  const hosts = categoryValue(inventory, 'Hosts');
  const capTotal = ok(capacityTotal) ? capacityTotal!.records[0] : undefined;
  const cores = num(capTotal, 'totalCores');
  const memBytes = num(capTotal, 'totalMemBytes');
  const capSummary =
    ok(capacityExact) || ok(capacity)
      ? capacityTotals(
          ok(capacityExact) ? capacityExact!.records[0] : undefined,
          toHostCapacity(ok(capacity) ? [...capacity!.records] : []),
          CAPACITY_LIST_LIMIT,
        )
      : null;
  if (hosts !== null || cores !== null) {
    const kpis: WrapupKpi[] = [];
    if (hosts !== null) kpis.push(kpi(t('metric.hosts'), formatNumber(hosts), { emoji: '🖥️' }));
    if (cores !== null) kpis.push(kpi(t('tw.infra.k.cores'), formatNumber(cores), { emoji: '⚙️' }));
    if (memBytes !== null) kpis.push(kpi(t('tw.infra.k.memory'), formatBytes(memBytes), { emoji: '🧮' }));
    if (capSummary?.memoryUtilisationPct != null)
      kpis.push(kpi(t('tw.infra.k.utilisation'), `${Math.round(capSummary.memoryUtilisationPct)}%`, { status: bandReaches(capSummary.memoryUtilisationPct, 'capacity.pressured', 'capacity.saturated'), emoji: '📊' }));
    if (capSummary?.reclaimableMemoryBytes != null)
      kpis.push(kpi(t('tw.infra.k.reclaimable'), formatBytes(capSummary.reclaimableMemoryBytes), { status: 'good', emoji: '♻️' }));
    const infraNarrative = [t('tw.infra.n1'), t('tw.infra.n2')];
    // 3.3.16: what the ring + ranking reads — hosts below the line at peak, from the exact aggregate.
    if (capSummary != null && capSummary.exact && capSummary.hosts - capSummary.unknown > 0) {
      const measuredHosts = capSummary.hosts - capSummary.unknown;
      const atRisk = capSummary.saturated + capSummary.pressured;
      infraNarrative.unshift(
        t(atRisk > 0 ? 'tw.lead.infra' : 'tw.lead.infraAll', {
          pct: `${formatNumber(Math.round(((capSummary.balanced + capSummary.oversized) / measuredHosts) * 1000) / 10)}%`,
          hosts: formatNumber(measuredHosts),
          line: String(assumed('capacity.pressured')),
          atRisk: formatNumber(atRisk),
        }),
      );
    }
    if (capSummary != null && (capSummary.saturated > 0 || capSummary.pressured > 0))
      infraNarrative.push(t('tw.infra.i.saturated', { sat: formatNumber(capSummary.saturated), pres: formatNumber(capSummary.pressured) }));
    if (capSummary?.oversized != null && capSummary.oversized > 0)
      infraNarrative.push(t('tw.infra.i.oversized', { count: formatNumber(capSummary.oversized) }));
    const capClasses = capSummary
      ? {
          labels: [t('tw.infra.cls.saturated'), t('tw.infra.cls.pressured'), t('tw.infra.cls.balanced'), t('tw.infra.cls.oversized')],
          values: [capSummary.saturated, capSummary.pressured, capSummary.balanced, capSummary.oversized],
        }
      : null;
    const infraAssist: string[] = [];
    if (capSummary != null && capSummary.saturated > 0) infraAssist.push(t('tw.infra.assist.saturated', { count: formatNumber(capSummary.saturated) }));
    if (capSummary?.reclaimableMemoryBytes != null && capSummary.reclaimableMemoryBytes > 0)
      infraAssist.push(t('tw.infra.assist.reclaim', { mem: formatBytes(capSummary.reclaimableMemoryBytes), count: formatNumber(capSummary.oversized) }));
    infraAssist.push(t('tw.infra.assist.baseline'));
    technical.push({
      id: 'infrastructure',
      title: t('tw.infra.title'),
      subtitle: t('tw.infra.subtitle'),
      logo: PRODUCT_LOGOS.infra,
      highlight: {
        value: capSummary?.reclaimableMemoryBytes != null && capSummary.reclaimableMemoryBytes > 0 ? formatBytes(capSummary.reclaimableMemoryBytes) : nfmt(hosts),
        caption: t('tw.infra.hi'),
        status: capSummary?.reclaimableMemoryBytes != null && capSummary.reclaimableMemoryBytes > 0 ? 'good' : undefined,
        emoji: '♻️',
      },
      narrative: infraNarrative,
      kpis,
      assist: infraAssist,
      pie: capClasses != null && capClasses.values.some((value) => value > 0) ? { title: t('tw.infra.pie'), data: capClasses } : undefined,
    });
  }

  // 2b. Cloud observability — the multi-cloud footprint and monitored services.
  const cloudView = summariseCloud(results['cloud.hosts']?.records ?? []);
  const cloudSvc = summariseCloudServices(results['cloud.services']?.records ?? []);
  if (cloudView.totalHosts > 0 || cloudSvc.serviceFamilyCount > 0) {
    const providers = cloudView.providers.filter((row) => row.hosts > 0);
    const providerLogos: string[] = providers
      .filter((row) => row.provider !== 'Other')
      .map((row) => CLOUD_LOGOS[row.provider as Exclude<CloudProvider, 'Other'>] as string);
    const cloudKpis: WrapupKpi[] = [];
    if (cloudView.totalHosts > 0) cloudKpis.push(kpi(t('tw.cloud.k.hosts'), formatNumber(cloudView.totalHosts), { emoji: '☁️' }));
    cloudKpis.push(kpi(t('tw.cloud.k.providers'), formatNumber(cloudView.providerCount), { emoji: '🌐' }));
    if (cloudSvc.serviceFamilyCount > 0) cloudKpis.push(kpi(t('tw.cloud.k.services'), formatNumber(cloudSvc.serviceFamilyCount), { emoji: '🧩' }));
    if (cloudSvc.totalResources > 0) cloudKpis.push(kpi(t('tw.cloud.k.resources'), formatNumber(cloudSvc.totalResources), { emoji: '📦' }));
    const cloudNarrative = [t('tw.cloud.n1', { providers: providers.map((row) => PROVIDER_META[row.provider].short).join(' / ') || '—' })];
    if (cloudSvc.topServices.length > 0)
      cloudNarrative.push(t('tw.cloud.n2', { list: cloudSvc.topServices.slice(0, 5).map((service) => service.family).join(', ') }));
    cloudNarrative.push(t('tw.cloud.n3'));
    const cloudAssist: string[] = [];
    if (providers.length > 0) cloudAssist.push(t('tw.cloud.a1', { top: PROVIDER_META[providers[0]!.provider].short, hosts: formatNumber(providers[0]!.hosts) }));
    if (cloudSvc.serviceFamilyCount > 0) cloudAssist.push(t('tw.cloud.a2', { families: formatNumber(cloudSvc.serviceFamilyCount) }));
    technical.push({
      id: 'cloud',
      title: t('tw.cloud.title'),
      subtitle: t('tw.cloud.subtitle'),
      logo: PRODUCT_LOGOS.infra,
      providerLogos,
      highlight: {
        value: cloudSvc.serviceFamilyCount > 0 ? formatNumber(cloudSvc.serviceFamilyCount) : formatNumber(cloudView.totalHosts),
        caption: cloudSvc.serviceFamilyCount > 0 ? t('tw.cloud.hiServices') : t('tw.cloud.hiHosts'),
        emoji: '☁️',
      },
      narrative: cloudNarrative,
      kpis: cloudKpis,
      assist: cloudAssist.length > 0 ? cloudAssist : undefined,
      pie:
        providers.length > 0
          ? { title: t('tw.cloud.pie'), data: { labels: providers.map((row) => PROVIDER_META[row.provider].short), values: providers.map((row) => row.hosts) } }
          : undefined,
      table:
        cloudSvc.topServices.length > 0
          ? {
              title: t('tw.cloud.table'),
              headers: [t('tw.cloud.h.service'), t('tw.cloud.h.provider'), t('tw.cloud.h.resources')],
              rows: cloudSvc.topServices.slice(0, 6).map((service) => [service.family, PROVIDER_META[service.provider].short, formatNumber(service.resources)]),
            }
          : undefined,
    });
  }

  // 3. Kubernetes (only when the estate actually runs it)
  const clusters = categoryValue(inventory, 'Kubernetes clusters');
  const workloads = categoryValue(inventory, 'Kubernetes workloads');
  if ((clusters ?? 0) > 0 || (workloads ?? 0) > 0) {
    const restartRows = ok(k8sRestarts)
      ? k8sRestarts!.records.map((record) => ({ workload: str(record, 'workload') ?? dash, total: num(record, 'total') ?? 0 }))
      : [];
    // Totals are counted in the queries over every workload; the rows only name the worst.
    const totalRestarts = ok(k8sRestartTotals) ? num(k8sRestartTotals!.records[0], 'restarts') ?? 0 : 0;
    const totalOom = ok(k8sPressureTotals) ? num(k8sPressureTotals!.records[0], 'oomKills') ?? 0 : 0;
    const totalThrottled = ok(k8sPressureTotals) ? num(k8sPressureTotals!.records[0], 'throttled') ?? 0 : 0;
    const k8sKpis: WrapupKpi[] = [
      kpi(t('tw.k8s.k.clusters'), nfmt(clusters), { emoji: '☸️' }),
      kpi(t('tw.k8s.k.workloads'), nfmt(workloads), { emoji: '📦' }),
    ];
    if (totalRestarts > 0) k8sKpis.push(kpi(t('tw.k8s.k.restarts'), formatNumber(totalRestarts), { status: band(totalRestarts, 'services.restarts.good', 'services.restarts.attention'), emoji: '🔄' }));
    if (totalOom > 0) k8sKpis.push(kpi(t('tw.k8s.k.oom'), formatNumber(totalOom), { status: 'bad', emoji: '💥' }));
    if (totalThrottled > 0) k8sKpis.push(kpi(t('tw.k8s.k.throttled'), formatNumber(totalThrottled), { status: 'warn', emoji: '🐢' }));
    const k8sNarrative = [t('tw.k8s.n1'), t('tw.k8s.n2')];
    // 3.3.16: what the ring + ranking reads — workloads without restarts (two aggregates) and, when
    // the list holds every restarting workload, how many pass the per-workload line.
    const restarting = ok(k8sRestartTotals) ? num(k8sRestartTotals!.records[0], 'workloads') : null;
    if (workloads !== null && workloads > 0 && restarting !== null && restarting <= workloads) {
      const line = assumed('findings.restarts.min');
      const listed = restartRows.filter((row) => row.total > 0);
      const params = {
        pct: `${formatNumber(Math.round(((workloads - restarting) / workloads) * 1000) / 10)}%`,
        workloads: formatNumber(workloads),
        restarting: formatNumber(restarting),
        above: formatNumber(listed.filter((row) => row.total > line).length),
        line: String(line),
      };
      k8sNarrative.unshift(t(listed.length >= restarting && restarting > 0 ? 'tw.lead.k8sAbove' : 'tw.lead.k8s', params));
    }
    if (restartRows.length > 0 && restartRows[0]!.total > 0)
      k8sNarrative.push(t('tw.k8s.i.restarts', { workload: restartRows[0]!.workload, count: formatNumber(restartRows[0]!.total) }));
    if (totalOom > 0) k8sNarrative.push(t('tw.k8s.i.oom', { count: formatNumber(totalOom) }));
    const k8sAssist: string[] = [];
    if (restartRows.length > 0 && restartRows[0]!.total > 0)
      k8sAssist.push(t('tw.k8s.assist.restarts', { workload: restartRows[0]!.workload, count: formatNumber(restartRows[0]!.total) }));
    if (totalOom > 0) k8sAssist.push(t('tw.k8s.assist.oom', { count: formatNumber(totalOom) }));
    if (totalThrottled > 0) k8sAssist.push(t('tw.k8s.assist.throttle', { count: formatNumber(totalThrottled) }));
    if (k8sAssist.length === 0) k8sAssist.push(t('tw.k8s.assist.topology'));
    const restartBars = restartRows
      .filter((row) => row.total > 0)
      .slice(0, 6)
      .map((row) => ({ label: row.workload, value: row.total }));
    technical.push({
      id: 'kubernetes',
      title: t('tw.k8s.title'),
      subtitle: t('tw.k8s.subtitle'),
      logo: PRODUCT_LOGOS.platform,
      highlight: { value: totalRestarts > 0 ? formatNumber(totalRestarts) : nfmt(workloads), caption: totalRestarts > 0 ? t('tw.k8s.hiRestarts') : t('tw.k8s.hi'), status: totalRestarts > 0 ? band(totalRestarts, 'services.restarts.good', 'services.restarts.attention') : undefined, emoji: '🔄' },
      narrative: k8sNarrative,
      kpis: k8sKpis,
      bars: restartBars.length > 0 ? { title: t('tw.k8s.bars'), items: restartBars } : undefined,
      assist: k8sAssist,
    });
  }

  // 4. Services & tracing
  const svcRow = ok(serviceTotals) ? serviceTotals!.records[0] : undefined;
  const requests = num(svcRow, 'totalRequests');
  const failures = num(svcRow, 'totalFailures');
  const failureRate = num(svcRow, 'failureRatePct');
  if (requests !== null) {
    const svcRows = ok(serviceRanking)
      ? serviceRanking!.records.map((record) => ({
          name: str(record, 'name') ?? dash,
          requests: num(record, 'totalRequests') ?? 0,
          failures: num(record, 'totalFailures') ?? 0,
          failureRatePct: num(record, 'failureRatePct'),
          respMs: (() => {
            const us = num(record, 'avgResponseTimeUs');
            return us === null ? null : us / 1000;
          })(),
        }))
      : [];
    const servicesCount = categoryValue(inventory, 'Services');
    const slowest = [...svcRows].filter((row) => row.respMs !== null).sort((a, b) => (b.respMs ?? 0) - (a.respMs ?? 0))[0];
    const worstFailing = [...svcRows]
      .filter((row) => row.failures > 0 && row.requests > 500)
      .sort((a, b) => (b.failureRatePct ?? 0) - (a.failureRatePct ?? 0))[0];
    const svcKpis: WrapupKpi[] = [
      kpi(t('tw.svc.k.requests'), nfmt(requests), { emoji: '📈' }),
      kpi(t('tw.svc.k.failures'), nfmt(failures), { status: failures !== null && failures > 0 ? 'warn' : 'good', emoji: '❌' }),
      kpi(t('tw.svc.k.failureRate'), failureRate === null ? dash : `${decimal(failureRate, 2)}%`, { status: band(failureRate, 'services.failure.good', 'services.failure.attention'), emoji: '⚠️' }),
    ];
    if (servicesCount !== null) svcKpis.push(kpi(t('tw.svc.k.services'), formatNumber(servicesCount), { emoji: '🧩' }));
    if (slowest?.respMs != null) svcKpis.push(kpi(t('tw.svc.k.slowest'), `${formatNumber(Math.round(slowest.respMs))} ms`, { status: band(slowest.respMs, 'services.latency.good', 'services.latency.attention'), emoji: '🐢' }));
    const svcNarrative = [t('tw.svc.n1'), t('tw.svc.n2')];
    if (worstFailing !== undefined)
      svcNarrative.push(t('tw.svc.i.worstFail', { name: worstFailing.name, pct: decimal(worstFailing.failureRatePct ?? 0, 2) }));
    // 3.3.16: what the bars read — the slowest of the busiest services and how many pass the line.
    if (slowest?.respMs != null) {
      const lineMs = assumed('services.latency.attention');
      const above = svcRows.filter((row) => row.respMs !== null && row.respMs > lineMs).length;
      svcNarrative.unshift(
        t(above > 0 ? 'tw.lead.svc' : 'tw.lead.svcNone', {
          listed: formatNumber(svcRows.length),
          name: slowest.name,
          ms: formatNumber(Math.round(slowest.respMs)),
          above: formatNumber(above),
          line: lineMs >= 1000 ? `${formatNumber(lineMs / 1000)} s` : `${formatNumber(lineMs)} ms`,
        }),
      );
    }
    const failBars = [...svcRows]
      .filter((row) => row.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 6)
      .map((row) => ({ label: row.name, value: row.failures }));
    const volumeBars = [...svcRows].sort((a, b) => b.requests - a.requests).slice(0, 6).map((row) => ({ label: row.name, value: row.requests }));
    const bars = failBars.length > 0 ? { title: t('tw.svc.barsFail'), items: failBars } : volumeBars.length > 0 ? { title: t('tw.svc.barsVol'), items: volumeBars } : undefined;
    const svcAssist: string[] = [];
    if (worstFailing !== undefined) svcAssist.push(t('tw.svc.assist.worst', { name: worstFailing.name, pct: decimal(worstFailing.failureRatePct ?? 0, 2) }));
    if (slowest?.respMs != null) svcAssist.push(t('tw.svc.assist.slow', { name: slowest.name, ms: formatNumber(Math.round(slowest.respMs)) }));
    svcAssist.push(t('tw.svc.assist.slo'));
    technical.push({
      id: 'services',
      title: t('tw.svc.title'),
      subtitle: t('tw.svc.subtitle'),
      logo: PRODUCT_LOGOS.purepath,
      highlight: { value: nfmt(requests), caption: t('tw.svc.hi'), emoji: '🔬' },
      narrative: svcNarrative,
      kpis: svcKpis,
      assist: svcAssist,
      bars,
    });
  }

  // 5. Technologies
  if (ok(technologies)) {
    const techAgg = new Map<string, number>();
    for (const record of technologies!.records) {
      const type = parseTechnology(str(record, 'softwareTechnologies'))?.type;
      if (type === undefined || type === null || isDynatraceTechnology(type)) continue;
      techAgg.set(type, (techAgg.get(type) ?? 0) + (num(record, 'instances') ?? 0));
    }
    const bars = [...techAgg.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    const instances = [...techAgg.values()].reduce((sum, value) => sum + value, 0);
    technical.push({
      id: 'technologies',
      title: t('tw.tech.title'),
      subtitle: t('tw.tech.subtitle'),
      logo: PRODUCT_LOGOS.oneagent,
      highlight: { value: formatNumber(techAgg.size), caption: t('tw.tech.hi') },
      narrative: [t('tw.tech.n1'), t('tw.tech.n2')],
      kpis: [
        kpi(t('tw.tech.k.families'), formatNumber(techAgg.size)),
        kpi(t('tw.tech.k.instances'), formatNumber(instances)),
      ],
      bars: bars.length > 0 ? { title: t('tw.tech.bars'), items: bars } : undefined,
    });
  }

  // 6. Logs
  if (ok(logs) || ok(logQuality)) {
    const bytesFor = (type: string) =>
      ok(logs) ? num(logs!.records.find((record) => str(record, 'event.type')?.includes(type)), 'bytes') : null;
    const ingested = ok(logs)
      ? logs!.records
          .filter((record) => str(record, 'event.type')?.includes('Ingest'))
          .reduce((sum, record) => sum + (num(record, 'bytes') ?? 0), 0)
      : 0;
    const queried = bytesFor('Query');
    // `log.quality` is grouped by status and bucket since 3.2.3 (every readable bucket): the buckets
    // are added up per status first, the way the Logs page does it.
    const logRows = ok(logQuality)
      ? toQualityRows(logQuality!.records).map((row) => ({
          status: row.status.toUpperCase(),
          total: row.total ?? 0,
          withService: row.withService ?? 0,
        }))
      : [];
    const logTotal = logRows.reduce((sum, row) => sum + row.total, 0);
    const statusCount = (needle: string) =>
      logRows.filter((row) => row.status.includes(needle)).reduce((sum, row) => sum + row.total, 0);
    const errorLogs = statusCount('ERROR') + statusCount('SEVERE') + statusCount('CRITICAL');
    const warnLogs = statusCount('WARN');
    const withServiceTotal = logRows.reduce((sum, row) => sum + row.withService, 0);
    const enrichedPct = logTotal > 0 ? Math.round((withServiceTotal / logTotal) * 100) : null;
    if (ingested > 0 || (queried ?? 0) > 0 || logTotal > 0) {
      const logKpis: WrapupKpi[] = [];
      if (ingested > 0) logKpis.push(kpi(t('tw.logs.k.ingested'), formatBytes(ingested), { emoji: '📥' }));
      if (queried !== null && queried > 0) logKpis.push(kpi(t('tw.logs.k.queried'), formatBytes(queried), { emoji: '🔎' }));
      if (logTotal > 0) logKpis.push(kpi(t('tw.logs.k.records'), formatNumber(logTotal), { emoji: '📄' }));
      if (errorLogs > 0) logKpis.push(kpi(t('tw.logs.k.errors'), formatNumber(errorLogs), { status: 'bad', emoji: '🔴' }));
      if (warnLogs > 0) logKpis.push(kpi(t('tw.logs.k.warnings'), formatNumber(warnLogs), { status: 'warn', emoji: '🟡' }));
      const logNarrative = [t('tw.logs.n1'), t('tw.logs.n2')];
      if (errorLogs > 0 || warnLogs > 0)
        logNarrative.push(t('tw.logs.i.severity', { errors: formatNumber(errorLogs), warns: formatNumber(warnLogs) }));
      if (enrichedPct !== null)
        logNarrative.push(t('tw.logs.i.enriched', { pct: String(enrichedPct) }));
      const logPie =
        logRows.length > 0
          ? {
              labels: [...logRows].sort((a, b) => b.total - a.total).slice(0, 5).map((row) => row.status),
              values: [...logRows].sort((a, b) => b.total - a.total).slice(0, 5).map((row) => row.total),
            }
          : null;
      const logAssist: string[] = [];
      if (errorLogs > 0) logAssist.push(t('tw.logs.assist.errors', { errors: formatNumber(errorLogs) }));
      if (enrichedPct !== null) logAssist.push(t('tw.logs.assist.enriched', { pct: String(enrichedPct) }));
      logAssist.push(t('tw.logs.assist.route'));
      technical.push({
        id: 'logs',
        title: t('tw.logs.title'),
        subtitle: t('tw.logs.subtitle'),
        logo: PRODUCT_LOGOS.loganalytics,
        highlight: { value: ingested > 0 ? formatBytes(ingested) : formatNumber(logTotal), caption: ingested > 0 ? t('tw.logs.hi') : t('tw.logs.hiRecords'), emoji: '📄' },
        narrative: logNarrative,
        kpis: logKpis,
        assist: logAssist,
        pie: logPie != null && logPie.values.some((value) => value > 0) ? { title: t('tw.logs.pie'), data: logPie } : undefined,
      });
    }
  }

  // 7. Consumption efficiency: how Grail bills the data scanned is a commercial conversation, so the
  //    customer profile leaves the whole section out.
  if (ctx.commercial && ok(advisor)) {
    const consRows = advisor!.records.map((record) => ({
      table: str(record, 'table') ?? dash,
      executions: num(record, 'executions') ?? 0,
      scanned: num(record, 'scannedOnDemandBytes') ?? 0,
      avgMs: num(record, 'avgDurationMs') ?? 0,
      delivered: num(record, 'deliveredRecords') ?? 0,
    }));
    const tablesCount = consRows.length;
    const queries = consRows.reduce((sum, row) => sum + row.executions, 0);
    const scanned = consRows.reduce((sum, row) => sum + row.scanned, 0);
    const delivered = consRows.reduce((sum, row) => sum + row.delivered, 0);
    const weightedMs = consRows.reduce((sum, row) => sum + row.avgMs * row.executions, 0);
    const avgMs = queries > 0 ? weightedMs / queries : null;
    const ranked = [...consRows].sort((a, b) => b.scanned - a.scanned);
    const topTable = ranked[0];
    const topSharePct = topTable !== undefined && scanned > 0 ? Math.round((topTable.scanned / scanned) * 100) : null;
    const consKpis: WrapupKpi[] = [
      kpi(t('tw.cons.k.tables'), formatNumber(tablesCount), { emoji: '🗂️' }),
      kpi(t('tw.cons.k.queries'), formatNumber(queries), { emoji: '🔍' }),
      kpi(t('tw.cons.k.scanned'), formatBytes(scanned), { emoji: '💾' }),
    ];
    if (delivered > 0) consKpis.push(kpi(t('tw.cons.k.records'), formatNumber(delivered), { emoji: '📤' }));
    if (avgMs !== null) consKpis.push(kpi(t('tw.cons.k.avgTime'), `${formatNumber(Math.round(avgMs))} ms`, { status: band(avgMs, 'services.consumer.good', 'services.consumer.attention'), emoji: '⏱️' }));
    const consNarrative = [t('tw.cons.n1'), t('tw.cons.n2')];
    if (topTable !== undefined && topTable.scanned > 0)
      consNarrative.push(t('tw.cons.i.top', { table: topTable.table, bytes: formatBytes(topTable.scanned), queries: formatNumber(topTable.executions) }));
    if (topSharePct !== null && topSharePct > 0)
      consNarrative.push(t('tw.cons.i.share', { pct: String(topSharePct), table: topTable!.table }));
    const consAssist: string[] = [];
    if (topTable !== undefined && topSharePct !== null && topSharePct >= assumed('findings.tableShare.min'))
      consAssist.push(t('tw.cons.assist.top', { table: topTable.table, pct: String(topSharePct) }));
    consAssist.push(t('tw.cons.assist.efficient', { scanned: formatBytes(scanned), queries: formatNumber(queries) }));
    if (delivered > 0) consAssist.push(t('tw.cons.assist.records', { records: formatNumber(delivered) }));
    const consTable = ranked
      .filter((row) => row.scanned > 0)
      .slice(0, 6)
      .map((row) => [row.table, formatNumber(row.executions), formatBytes(row.scanned)]);
    technical.push({
      id: 'consumption',
      title: t('tw.cons.title'),
      subtitle: t('tw.cons.subtitle'),
      logo: PRODUCT_LOGOS.grail,
      highlight: { value: formatBytes(scanned), caption: t('tw.cons.hi'), status: 'good', emoji: '💾' },
      narrative: consNarrative,
      kpis: consKpis,
      table:
        consTable.length > 0
          ? { title: t('tw.cons.tableTitle'), headers: [t('tw.cons.h.table'), t('tw.cons.h.queries'), t('tw.cons.h.scanned')], rows: consTable }
          : undefined,
      assist: consAssist,
    });
  }

  // 8. Security & runtime risk
  if (ok(vulnerabilities)) {
    const vuln = summarisePosture(vulnerabilities!.records);
    const secAssist: string[] = [];
    if (vuln.actNowCount > 0) secAssist.push(t('tw.sec.assist.actNow', { count: formatNumber(vuln.actNowCount) }));
    const topTech = vuln.byTechnology[0];
    if (topTech !== undefined) secAssist.push(t('tw.sec.assist.tech', { tech: topTech.technology, count: formatNumber(topTech.count) }));
    if (vuln.bySeverity.CRITICAL > 0) secAssist.push(t('tw.sec.assist.critical', { count: formatNumber(vuln.bySeverity.CRITICAL) }));
    const sevPie = {
      labels: [t('p.sec.sev.critical'), t('p.sec.sev.high'), t('p.sec.sev.medium'), t('p.sec.sev.low')],
      values: [vuln.bySeverity.CRITICAL, vuln.bySeverity.HIGH, vuln.bySeverity.MEDIUM, vuln.bySeverity.LOW],
    };
    technical.push({
      id: 'security',
      title: t('tw.sec.title'),
      subtitle: t('tw.sec.subtitle'),
      logo: PRODUCT_LOGOS.appsec,
      highlight: { value: formatNumber(vuln.total), caption: t('tw.sec.hi'), status: vuln.bySeverity.CRITICAL > 0 ? 'bad' : vuln.bySeverity.HIGH > 0 ? 'warn' : 'good', emoji: '🛡️' },
      narrative: [t('tw.sec.n1'), t('tw.sec.n2'), t('tw.sec.n3')],
      kpis: [
        kpi(t('tw.sec.k.open'), formatNumber(vuln.total), { emoji: '🛡️' }),
        kpi(t('p.sec.sev.critical'), formatNumber(vuln.bySeverity.CRITICAL), { status: vuln.bySeverity.CRITICAL > 0 ? 'bad' : 'good', emoji: '🔴' }),
        kpi(t('p.sec.sev.high'), formatNumber(vuln.bySeverity.HIGH), { status: vuln.bySeverity.HIGH > 0 ? 'warn' : 'good', emoji: '🟠' }),
        kpi(t('p.sec.sev.medium'), formatNumber(vuln.bySeverity.MEDIUM), { status: vuln.bySeverity.MEDIUM > 0 ? 'warn' : 'good', emoji: '🟡' }),
        kpi(t('tw.sec.k.actNow'), formatNumber(vuln.actNowCount > 0 ? vuln.actNowCount : vuln.bySeverity.CRITICAL + vuln.bySeverity.HIGH), { status: vuln.actNowCount > 0 || vuln.bySeverity.CRITICAL > 0 ? 'bad' : vuln.bySeverity.HIGH > 0 ? 'warn' : 'good', emoji: '⚡' }),
      ],
      pie: sevPie.values.some((value) => value > 0) ? { title: t('p.sec.v2.severityTitle'), data: sevPie } : undefined,
      assist: secAssist.length > 0 ? secAssist : undefined,
    });
  }

  // 9. Digital experience
  const rum = summariseRum(rumScore ? [...rumScore.records] : [], rumVitals ? [...rumVitals.records] : []);
  if (rum.hasData) {
    const dxAssist: string[] = [];
    if (rum.worstInp !== null && rum.worstInp > 200)
      dxAssist.push(t('tw.dx.assist.inp', { ms: formatNumber(Math.round(rum.worstInp)) }));
    if (rum.overallErrorRatePct !== null && rum.overallErrorRatePct > 0)
      dxAssist.push(t('tw.dx.assist.errors', { pct: String(rum.overallErrorRatePct) }));
    const topApps = [...rum.apps].sort((a, b) => (b.requests ?? 0) - (a.requests ?? 0)).slice(0, 5);
    const dxKpis: WrapupKpi[] = [
      kpi(t('tw.dx.k.requests'), formatNumber(rum.totalRequests), { emoji: '🌐' }),
      kpi(t('tw.dx.k.actions'), formatNumber(rum.totalActions), { emoji: '👆' }),
      kpi(t('tw.dx.k.errorRate'), rum.overallErrorRatePct === null ? dash : `${rum.overallErrorRatePct}%`, { status: band(rum.overallErrorRatePct, 'experience.error.good', 'experience.error.attention'), emoji: '⚠️' }),
      kpi(t('tw.dx.k.inp'), rum.worstInp === null ? dash : `${formatNumber(Math.round(rum.worstInp))} ms`, { status: bandReaches(rum.worstInp, 'experience.inp.good', 'experience.inp.poor'), emoji: '⏱️' }),
      kpi(t('tw.dx.k.poorApps'), formatNumber(rum.poorInpApps), { status: rum.poorInpApps > 0 ? 'warn' : 'good', emoji: '👀' }),
    ];
    const dxNarrative = [t('tw.dx.n1'), t('tw.dx.n2')];
    // 3.3.16: what the ring + ranking reads — requests without a front-end error and the worst app.
    const worstApp = [...rum.apps].filter((app) => app.errorRatePct !== null).sort((a, b) => (b.errorRatePct ?? 0) - (a.errorRatePct ?? 0))[0];
    if (rum.overallErrorRatePct !== null && worstApp !== undefined)
      dxNarrative.unshift(
        t('tw.lead.dx', {
          // One decimal, as the ring on the captured panel reads it.
          pct: `${formatNumber(Math.round((100 - rum.overallErrorRatePct) * 10) / 10)}%`,
          requests: formatNumber(rum.totalRequests),
          name: worstApp.name,
          rate: `${formatNumber(worstApp.errorRatePct ?? 0)}%`,
        }),
      );
    if (topApps.length > 0)
      dxNarrative.push(t('tw.dx.i.top', { name: topApps[0]!.name, requests: formatNumber(topApps[0]!.requests ?? 0) }));
    if (rum.poorInpApps > 0) dxNarrative.push(t('tw.dx.i.poor', { count: formatNumber(rum.poorInpApps) }));
    const dxTable =
      topApps.length > 0
        ? {
            title: t('tw.dx.tableTitle'),
            headers: [t('tw.dx.h.app'), t('tw.dx.h.access'), t('tw.dx.h.inp'), t('tw.dx.h.error')],
            rows: topApps.map((app) => [
              app.name,
              app.requests === null ? dash : formatNumber(app.requests),
              app.inp === null ? dash : `${formatNumber(Math.round(app.inp))} ms`,
              app.errorRatePct === null ? dash : `${app.errorRatePct}%`,
            ]),
          }
        : undefined;
    technical.push({
      id: 'experience',
      title: t('tw.dx.title'),
      subtitle: t('tw.dx.subtitle'),
      logo: PRODUCT_LOGOS.dex,
      highlight:
        rum.worstInp !== null
          ? { value: `${formatNumber(Math.round(rum.worstInp))} ms`, caption: t('tw.dx.hi'), status: bandReaches(rum.worstInp, 'experience.inp.good', 'experience.inp.poor'), emoji: '👤' }
          : { value: formatNumber(rum.totalRequests), caption: t('tw.dx.hiAlt'), emoji: '👤' },
      narrative: dxNarrative,
      kpis: dxKpis,
      table: dxTable,
      assist: dxAssist.length > 0 ? dxAssist : undefined,
    });
  }

  // 10. Competitor overlap (only when found)
  const comp = summariseCompetitors(agents ? [...agents.records] : []);
  if (comp.totalAgents > 0) {
    technical.push({
      id: 'competitor',
      title: t('tw.comp.title'),
      subtitle: t('tw.comp.subtitle'),
      logo: PRODUCT_LOGOS.oneagent,
      highlight: { value: formatNumber(comp.totalAgents), caption: t('tw.comp.hi') },
      narrative: [t('tw.comp.n1'), t('tw.comp.n2')],
      kpis: [
        kpi(t('tw.comp.k.agents'), formatNumber(comp.totalAgents)),
        kpi(t('tw.comp.k.tools'), formatNumber(comp.vendors.length)),
      ],
      bars: {
        title: t('tw.comp.bars'),
        items: comp.vendors.map((vendor) => ({ label: vendor.vendor, value: vendor.count })),
      },
    });
  }

  // ============================ BUSINESS ============================

  // 11. Overview — the estate at a glance, richer than a bare headcount.
  const distinctTech = ok(technologies)
    ? new Set(
        technologies!.records
          .map((record) => parseTechnology(str(record, 'softwareTechnologies'))?.type)
          .filter((type): type is string => type !== undefined && type !== null && !isDynatraceTechnology(type)),
      ).size
    : null;
  const readableSources = ok(buckets)
    ? buckets!.records.filter((record) => str(record, 'hasAccess') === 'true' || record.hasAccess === true).length
    : null;
  const overviewKpis: WrapupKpi[] = [
    kpi(t('tw.overview.k.entities'), nfmt(entities), { emoji: '📦' }),
    kpi(t('tw.overview.k.coverage'), coveragePct === null ? dash : `${coveragePct}%`, { emoji: '🎯' }),
  ];
  if (distinctTech !== null) overviewKpis.push(kpi(t('tw.overview.k.tech'), formatNumber(distinctTech), { emoji: '🧩' }));
  if (readableSources !== null) overviewKpis.push(kpi(t('tw.overview.k.sources'), formatNumber(readableSources), { emoji: '🗄️' }));
  overviewKpis.push(kpi(t('tw.overview.k.active'), nfmt(activeProblems), { status: band(activeProblems, 'problems.open.good', 'problems.open.attention'), emoji: '🚨' }));
  const inventoryBars = ok(inventory)
    ? ENTITY_CATEGORIES.map((category) => ({ label: t(`tw.cat.${category}` as Parameters<typeof t>[0]), value: categoryValue(inventory, category) ?? 0 }))
        .filter((bar) => bar.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];
  const overviewNarrative = [t('tw.overview.n1'), t('tw.overview.n2')];
  if (coveredTypes !== null)
    overviewNarrative.push(t('tw.overview.i.coverage', { covered: String(coveredTypes), total: String(ENTITY_CATEGORIES.length) }));
  if (distinctTech !== null && distinctTech > 0)
    overviewNarrative.push(t('tw.overview.i.tech', { count: formatNumber(distinctTech) }));
  const overviewAssist: string[] = [];
  overviewAssist.push(t('tw.overview.assist.scope', { entities: nfmt(entities), pct: coveragePct === null ? dash : `${coveragePct}%`, tech: distinctTech === null ? dash : formatNumber(distinctTech) }));
  if (totalProblems !== null)
    overviewAssist.push(t('tw.overview.assist.problems', { total: nfmt(totalProblems), pct: closurePct === null ? dash : `${closurePct}%`, active: nfmt(activeProblems) }));
  if (combinedExposure !== null) overviewAssist.push(t('tw.overview.assist.value', { amount: money(Math.round(combinedExposure)) }));
  overviewAssist.push(t('tw.overview.assist.next'));
  business.push({
    id: 'overview',
    title: t('tw.overview.title'),
    subtitle: t('tw.overview.subtitle'),
    logo: PRODUCT_LOGOS.platform,
    highlight: { value: nfmt(entities), caption: t('tw.overview.hi'), emoji: '📦' },
    narrative: overviewNarrative,
    kpis: overviewKpis,
    assist: overviewAssist,
    bars: inventoryBars.length > 0 ? { title: t('tw.overview.bars'), items: inventoryBars } : undefined,
  });

  // 12. Executive — MTTR, open exposure and its cost, when a rate was supplied.
  const mttrHoursExec = overallMttrNs === null ? null : overallMttrNs / 3_600_000_000_000;
  const exposureHoursValue = totalOpenNs !== null ? openHours : resolvedTotalNs > 0 ? nanosToHours(resolvedTotalNs) : null;
  const execKpis: WrapupKpi[] = [
    kpi(t('tw.exec.k.mttr'), overallMttrNs === null ? dash : formatNanos(overallMttrNs), { status: band(mttrHoursExec, 'problems.mttr.good', 'problems.mttr.attention'), emoji: '⏱️' }),
    kpi(t('tw.exec.k.open'), nfmt(activeOpenProblems), { status: band(activeOpenProblems, 'problems.open.good', 'problems.open.attention'), emoji: '🚨' }),
    kpi(t('tw.exec.k.exposure'), exposureHoursValue === null ? dash : formatHours(exposureHoursValue), { emoji: '⏳' }),
    kpi(t('tw.exec.k.closed'), closurePct === null ? dash : `${closurePct}%`, { status: bandHigh(closurePct, 'problems.closed.good', 'problems.closed.attention'), emoji: '✅' }),
  ];
  if (operationalCost !== null) execKpis.push(kpi(t('tw.exec.k.cost'), money(Math.round(operationalCost)), { status: 'warn', emoji: '💰' }));
  if (mttrSpeedup !== null) execKpis.push(kpi(t('tw.exec.k.speedup'), `${decimal(mttrSpeedup, 1)}×`, { status: 'good', emoji: '🚀' }));
  const execNarrative = [t('tw.exec.n1'), t('tw.exec.n2')];
  if (mttrSpeedup !== null && manualMttrHours !== null)
    execNarrative.push(t('tw.exec.i.mttr', { x: decimal(mttrSpeedup, 1), manual: formatHours(manualMttrHours) }));
  if (oldestOpenNs !== null) execNarrative.push(t('tw.exec.i.oldest', { dur: formatNanos(oldestOpenNs) }));
  if (combinedExposure !== null) execNarrative.push(t('tw.exec.i.cost', { amount: money(Math.round(combinedExposure)) }));
  else if (ctx.commercial) execNarrative.push(t('tw.exec.i.noCost'));
  const execTable =
    combinedExposure !== null
      ? {
          title: t('tw.exec.costTitle'),
          headers: [t('tw.exec.h.item'), t('tw.exec.h.hours'), t('tw.exec.h.cost')],
          rows: [
            [t('tw.exec.row.response'), openHours === null ? dash : formatHours(openHours), operationalCost === null ? dash : money(Math.round(operationalCost))],
            [t('tw.exec.row.downtime'), availabilityHours === null ? dash : formatHours(availabilityHours), downtimeCost === null ? dash : money(Math.round(downtimeCost))],
            [t('tw.exec.row.total'), dash, money(Math.round(combinedExposure))],
          ],
        }
      : undefined;
  const execAssist: string[] = [];
  if (combinedExposure !== null) execAssist.push(t('tw.exec.assist.exposure', { amount: money(Math.round(combinedExposure)) }));
  if (activeOpenProblems !== null && activeOpenProblems > 0) execAssist.push(t('tw.exec.assist.open', { count: formatNumber(activeOpenProblems) }));
  if (mttrSpeedup !== null) execAssist.push(t('tw.exec.assist.mttr', { x: decimal(mttrSpeedup, 1) }));
  execAssist.push(t('tw.exec.assist.automate'));
  business.push({
    id: 'executive',
    title: t('tw.exec.title'),
    subtitle: t('tw.exec.subtitle'),
    logo: PRODUCT_LOGOS.davis,
    highlight:
      combinedExposure !== null
        ? { value: money(Math.round(combinedExposure)), caption: t('tw.exec.hiCost'), status: 'warn', emoji: '💰' }
        : { value: overallMttrNs === null ? dash : formatNanos(overallMttrNs), caption: t('tw.exec.hi'), status: band(mttrHoursExec, 'problems.mttr.good', 'problems.mttr.attention'), emoji: '⏱️' },
    narrative: execNarrative,
    kpis: execKpis,
    assist: execAssist,
    table: execTable,
  });

  // 13. ROI — consolidation, automation readiness and the value at stake.
  const automationReady = automationCandidates;
  const toolingSaving =
    baseline.annualCostPerAgent !== null && comp.totalAgents > 0
      ? comp.totalAgents * baseline.annualCostPerAgent
      : null;
  const roiKpis: WrapupKpi[] = [
    kpi(t('tw.roi.k.coverage'), nfmt(entities), { emoji: '📦' }),
    kpi(t('tw.roi.k.detection'), nfmt(totalProblems), { emoji: '🔍' }),
    kpi(t('tw.roi.k.resolution'), closurePct === null ? dash : `${closurePct}%`, { status: bandHigh(closurePct, 'problems.closed.good', 'problems.closed.attention'), emoji: '✅' }),
    kpi(t('tw.roi.k.automation'), nfmt(automationReady), { emoji: '🤖' }),
  ];
  if (combinedExposure !== null) roiKpis.push(kpi(t('tw.roi.k.exposure'), money(Math.round(combinedExposure)), { status: 'warn', emoji: '💸' }));
  if (toolingSaving !== null) roiKpis.push(kpi(t('tw.roi.k.saving'), `${money(Math.round(toolingSaving))}/yr`, { status: 'good', emoji: '💰' }));
  else if (comp.totalAgents > 0) roiKpis.push(kpi(t('tw.roi.k.consolidation'), formatNumber(comp.totalAgents), { emoji: '🧰' }));
  const roiNarrative = [t('tw.roi.n1'), t('tw.roi.n2')];
  if (toolingSaving !== null)
    roiNarrative.push(t('tw.roi.i.saving', { agents: t(pluralKey('common.competitorAgentsCount', comp.totalAgents), { n: formatNumber(comp.totalAgents) }), amount: money(Math.round(toolingSaving)) }));
  else if (comp.totalAgents > 0)
    roiNarrative.push(t('tw.roi.i.consolidation', { agents: t(pluralKey('common.competitorAgentsCount', comp.totalAgents), { n: formatNumber(comp.totalAgents) }), tools: t(pluralKey('common.toolsCount', comp.vendors.length), { n: formatNumber(comp.vendors.length) }) }));
  if (mttrHoursSaved !== null) roiNarrative.push(t('tw.roi.i.mttr', { hours: formatHours(mttrHoursSaved) }));
  if (combinedExposure !== null) roiNarrative.push(t('tw.roi.i.value', { amount: money(Math.round(combinedExposure)) }));
  if (automationReady !== null && automationReady > 0)
    roiNarrative.push(t('tw.roi.i.automation', { count: formatNumber(automationReady) }));
  business.push({
    id: 'roi',
    title: t('tw.roi.title'),
    subtitle: t('tw.roi.subtitle'),
    logo: PRODUCT_LOGOS.automation,
    highlight:
      toolingSaving !== null
        ? { value: `${money(Math.round(toolingSaving))}/yr`, caption: t('tw.roi.hiSaving'), status: 'good', emoji: '💰' }
        : combinedExposure !== null
          ? { value: money(Math.round(combinedExposure)), caption: t('tw.roi.hiValue'), status: 'good', emoji: '💰' }
          : { value: closurePct === null ? nfmt(automationReady) : `${closurePct}%`, caption: t('tw.roi.hi'), status: 'good', emoji: '🚀' },
    narrative: roiNarrative,
    kpis: roiKpis,
  });

  return {
    customerName: ctx.params.customerName,
    engagementName: ctx.params.engagementName,
    windowLabel: ctx.windowLabel,
    generatedAtLabel: ctx.generatedAtLabel,
    seName: ctx.seName,
    dtLogo: ctx.dtLogo,
    customerLogo: ctx.customerLogo,
    customerLogoAspect: ctx.customerLogoAspect,
    partnerName: ctx.params.partnerName,
    partnerLogo: ctx.partnerLogo,
    partnerLogoAspect: ctx.partnerLogoAspect,
    platformLogos: [
      PRODUCT_LOGOS.davis,
      PRODUCT_LOGOS.grail,
      PRODUCT_LOGOS.smartscape,
      PRODUCT_LOGOS.oneagent,
      PRODUCT_LOGOS.purepath,
      PRODUCT_LOGOS.appengine,
      PRODUCT_LOGOS.automation,
      PRODUCT_LOGOS.dql,
    ],
    agenda: [...technical, ...business].map((section) => section.title),
    why: [t('tw.why.b1'), t('tw.why.b2'), t('tw.why.b3'), t('tw.why.b4'), t('tw.why.b5'), t('tw.why.b6')],
    strings: {
      title: t('tw.deck.title'),
      subtitle: ctx.params.customerName === '' ? t('tw.deck.subtitle') : t('tw.deck.subtitleNamed', { customer: ctx.params.customerName }),
      tagline: t('tw.deck.tagline'),
      preparedBy: t('tw.deck.preparedBy'),
      agendaTitle: t('tw.agenda.title'),
      whyTitle: t('tw.why.title'),
      whySubtitle: t('tw.why.subtitle'),
      assistLabel: t('tw.assist.label'),
      partnerLabel: t('tw.partner.label'),
      technicalDivider: t('tw.divider.technical'),
      technicalKicker: t('tw.divider.technicalKicker'),
      businessDivider: t('tw.divider.business'),
      businessKicker: t('tw.divider.businessKicker'),
      closingTitle: t('tw.close.title'),
      closingBullets: [t('tw.close.b1'), t('tw.close.b2'), t('tw.close.b3'), t('tw.close.b4')],
      footer: t('tw.close.footer'),
      measured: t('tw.measured'),
      confidential: t('tw.confidential'),
    },
    technical,
    business,
  };
}

/**
 * Every section the Tech Wrapup can carry (3.3.2), in the deck's order. `tests/captureRegistry.test.tsx`
 * checks this list against the sections `buildWrapupModel` builds and against the capture registry:
 * every section that is not commercial has a panel of the app to photograph.
 */
export const DECK_SECTION_IDS = [
  'problems',
  'rca',
  'infrastructure',
  'cloud',
  'kubernetes',
  'services',
  'technologies',
  'logs',
  'consumption',
  'security',
  'experience',
  'competitor',
  // 3.4.10 (F-02): built by `assessmentSection.ts` from the Assessment's own reading, after the objectives.
  'assessment',
  'overview',
  'executive',
  'roi',
] as const;

/**
 * The sections that are commercial as a whole: they appear only in the SE profile, and no capture of
 * the app is ever taken for them (AGENTS.md rule 6).
 */
export const COMMERCIAL_SECTION_IDS: readonly (typeof DECK_SECTION_IDS)[number][] = ['consumption'];

/** The catalog query ids the Tech Wrapup reads. */
export const WRAPUP_QUERY_IDS = [
  'cov.inventory',
  'cov.buckets',
  'prob.summary',
  'prob.mttx',
  'prob.exposure',
  'prob.mttx.rca',
  'prob.exposure.rca',
  'prob.timeline',
  'prob.recurrent.total',
  'prob.topentities',
  'rca.top',
  'svc.totals',
  'svc.ranking',
  'proc.technologies',
  'infra.capacity.total',
  'infra.capacity',
  'infra.capacity.summary',
  'k8s.restarts',
  'k8s.restarts.total',
  'k8s.pressure',
  'k8s.pressure.total',
  'log.ingest',
  'log.quality',
  'cons.advisor',
  'sec.posture',
  'rum.scorecard',
  'rum.webvitals',
  'comp.agents',
  'cloud.hosts',
  'cloud.services',
] as const;
