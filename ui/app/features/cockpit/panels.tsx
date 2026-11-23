import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { IntelligenceMark } from '../../components/IntelligenceMark';
import { ChartFrame } from '../../components/ChartFrame';
import { BarList } from '../../components/viz/BarList';
import { assumed } from '../../config/assumptions';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { RankedBars, type RankedBar } from '../../engine/chart/RankedBars';
import { RingRankPanel } from '../../engine/chart/RingRankPanel';
import { statusAgainst } from '../../engine/chart/status';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { useTranslation } from '../../i18n/useTranslation';
import { CAPACITY_THRESHOLDS, capacityTotals, toHostCapacity } from '../../models/capacity';
import { ARRIVAL_BIN_MS, arrivalSeries } from '../../models/problemTimeline';
import { StratoDonut, StratoTimeseries } from '../../engine/strato';
import { summariseRum } from '../../models/rum';
import { CAPACITY_LIST_LIMIT } from '../../queries/catalog';
import { decimal } from '../../utils/activeLocale';
import { num, str } from '../../utils/records';
import { formatMicros } from '../../utils/time';
import { ErrorRateMeter } from '../experience/ErrorRateMeter';
import { problemCategoryLabel } from '../problems/categoryLabel';

/**
 * The cockpit panels of 3.3.10–3.3.14 as components of their own (3.3.15): each reads its catalog
 * queries itself, so the page and the Tech Wrapup capture draw the very same panel. `useDql` keys its
 * cache by request, so a page and a capture reading the same query share one read.
 *
 * Each returns `null` when its data did not answer; nothing is drawn from a zero that was not
 * measured (rule 8).
 */

/** How many of the slowest services the bars show (3.3.10). */
export const SLOWEST_TOP = 8;
/** How many of the restarting workloads the bars show (3.3.10). */
export const RESTART_TOP = 8;
/** How many of the hosts at or near their ceiling the list names (3.3.14). */
export const AT_RISK_TOP = 6;
/** How many problem categories the mix names before folding the rest into "other" (3.3.11). */
export const CATEGORY_TOP = 5;

/**
 * Services — the slowest of the busiest services against the response-time line of the assumptions
 * registry (3.3.10). A top of the ranked list (the 50 busiest), never summed; the exact count of
 * services with traffic sits beside it.
 */
export const SlowestServices = () => {
  const { t, formatNumber, tWindow } = useTranslation();
  const scope = useQueryScope();
  const ranking = useCatalogQuery('svc.ranking', scope);
  const totals = useCatalogQuery('svc.ranking.total', scope);
  if (ranking.outcome !== 'ok') return null;

  const latencyLineMs = assumed('services.latency.attention');
  const latencyWarnShare = assumed('services.latency.good') / latencyLineMs;
  const listed = ranking.records.length;
  const timed = ranking.records
    .map((record) => ({ name: str(record, 'name') ?? str(record, 'serviceId') ?? '—', us: num(record, 'avgResponseTimeUs') }))
    .filter((service): service is { name: string; us: number } => service.us !== null)
    .sort((a, b) => b.us - a.us);
  const bars: RankedBar[] = timed.slice(0, SLOWEST_TOP).map((service, index) => ({
    key: `${service.name}-${index}`,
    label: service.name,
    value: service.us / 1000,
    display: formatMicros(service.us),
    status: statusAgainst(service.us / 1000, latencyLineMs, latencyWarnShare),
  }));
  if (bars.length === 0) return null;
  const serviceCount = totals.outcome === 'ok' ? num(totals.records[0], 'services') : null;

  return (
    <ChartFrame
      role="exposure"
      title={t('cockpit.svc.latency.title')}
      provenance={ranking.provenance}
      evidence={ranking.evidence}
      windowLabel={tWindow(ranking.timeframe.label)}
      trailing={
        <span className="pvs-caption">
          {serviceCount === null
            ? t('cockpit.ranked.topOf', { shown: formatNumber(bars.length), listed: formatNumber(listed) })
            : t('cockpit.ranked.topOfTotal', { shown: formatNumber(bars.length), listed: formatNumber(listed), total: formatNumber(serviceCount) })}
        </span>
      }
    >
      <RankedBars
        items={bars}
        line={{ value: latencyLineMs, label: t('cockpit.svc.latency.line', { value: formatMicros(latencyLineMs * 1000) }) }}
        ariaLabel={t('cockpit.svc.latency.title')}
        format={(ms) => formatMicros(ms * 1000)}
      />
    </ChartFrame>
  );
};

/**
 * Kubernetes — workloads without restarts beside the workloads that restart most (3.3.10 + 3.3.14).
 * The ring is two aggregates (`k8s.inventory` and `k8s.restarts.total`); the bars are a top of the
 * capped list against the per-workload restart line of the assumptions registry.
 */
export const StableWorkloads = () => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const inventory = useCatalogQuery('k8s.inventory', scope);
  const restarts = useCatalogQuery('k8s.restarts', scope);
  const restartTotals = useCatalogQuery('k8s.restarts.total', scope);
  if (restarts.outcome !== 'ok') return null;

  const restartLine = assumed('findings.restarts.min');
  const rows = restarts.records
    .map((record) => ({ workload: str(record, 'workload') ?? '—', cluster: str(record, 'cluster') ?? '—', total: num(record, 'total') }))
    .filter((row): row is { workload: string; cluster: string; total: number } => row.total !== null && row.total > 0);
  const bars: RankedBar[] = [...rows]
    .sort((a, b) => b.total - a.total)
    .slice(0, RESTART_TOP)
    .map((row, index) => ({
      key: `${row.workload}-${row.cluster}-${index}`,
      label: row.workload,
      value: row.total,
      display: formatNumber(row.total),
      status: statusAgainst(row.total, restartLine),
    }));
  if (bars.length === 0) return null;

  const restarting = restartTotals.outcome === 'ok' ? num(restartTotals.records[0], 'workloads') : null;
  const workloadCount = inventory.outcome === 'ok' ? num(inventory.records.find((record) => str(record, 'kind') === 'workloads'), 'value') : null;
  const stablePct =
    workloadCount !== null && workloadCount > 0 && restarting !== null && restarting <= workloadCount ? ((workloadCount - restarting) / workloadCount) * 100 : null;

  return (
    <RingRankPanel
      data-testid="k8s-ringrank"
      title={t('cockpit.k8s.restarts.title')}
      caption={
        restarting === null
          ? t('cockpit.k8s.restarts.topOf', { shown: formatNumber(bars.length), listed: formatNumber(rows.length) })
          : t('cockpit.k8s.restarts.topOfTotal', { shown: formatNumber(bars.length), listed: formatNumber(rows.length), total: formatNumber(restarting) })
      }
      provenance={restarts.provenance}
      evidence={restarts.evidence}
      ring={{
        family: 'blue-turquoise',
        value: stablePct,
        valueDisplay: stablePct === null ? undefined : `${formatDecimal(stablePct, 1)}%`,
        label: t('ringrank.k8s.label'),
        caption: workloadCount === null ? undefined : t('ringrank.k8s.caption', { count: formatNumber(workloadCount) }),
        ariaLabel: t('ringrank.k8s.aria'),
        missingLabel: t('tl.notMeasured'),
        fact: factFrom(restartTotals, stablePct === null ? null : Number(stablePct.toFixed(1)), { calculation: t('ringrank.k8s.calc'), unit: '%' }),
      }}
    >
      <RankedBars
        items={bars}
        line={{ value: restartLine, label: t('cockpit.k8s.restarts.line', { count: formatNumber(restartLine) }) }}
        ariaLabel={t('cockpit.k8s.restarts.title')}
        format={(count) => formatNumber(Math.round(count))}
      />
    </RingRankPanel>
  );
};

/**
 * Infrastructure — the share of measured hosts below the review line at peak, from the exact
 * aggregate, beside the hosts at or near their ceiling, worst first (3.3.14).
 */
export const HostsAtCeiling = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const capacity = useCatalogQuery('infra.capacity', scope);
  const capacityExact = useCatalogQuery('infra.capacity.summary', scope);
  const hosts = toHostCapacity(capacity.records);
  const view = capacityTotals(capacityExact.records[0], hosts, CAPACITY_LIST_LIMIT);
  const capacityRead = capacityExact.outcome === 'ok' || capacity.outcome === 'ok';
  if (!capacityRead || view.hosts === 0) return null;

  const line = CAPACITY_THRESHOLDS.pressuredPct;
  const measuredHosts = view.hosts - view.unknown;
  const withinPct = view.exact && measuredHosts > 0 ? ((view.balanced + view.oversized) / measuredHosts) * 100 : null;
  const atRiskCount = view.saturated + view.pressured;
  const atRisk = hosts
    .filter((host) => host.classification === 'saturated' || host.classification === 'pressured')
    .map((host) => {
      const memory = (host.peakMemPct ?? -1) >= (host.peakCpuPct ?? -1);
      return { host, memory, peak: (memory ? host.peakMemPct : host.peakCpuPct) ?? 0 };
    })
    .sort((a, b) => b.peak - a.peak)
    .slice(0, AT_RISK_TOP);

  return (
    <RingRankPanel
      data-testid="infra-ringrank"
      title={t('ringrank.infra.title')}
      caption={atRisk.length > 0 ? t('ringrank.infra.topOf', { shown: formatNumber(atRisk.length), total: formatNumber(atRiskCount), line }) : undefined}
      provenance={capacity.provenance}
      evidence={capacity.evidence}
      ring={{
        family: 'turquoise',
        value: withinPct,
        valueDisplay: withinPct === null ? undefined : `${decimal(withinPct, 1)}%`,
        label: t('ringrank.infra.label', { line }),
        caption: withinPct === null ? undefined : t('ringrank.infra.caption', { count: formatNumber(measuredHosts) }),
        ariaLabel: t('ringrank.infra.aria', { line }),
        missingLabel: t('tl.notMeasured'),
        fact: factFrom(capacityExact, withinPct === null ? null : Number(withinPct.toFixed(1)), { calculation: t('ringrank.infra.calc', { line }), unit: '%' }),
      }}
    >
      {atRisk.length === 0 ? (
        <Text>{t('ringrank.infra.none', { line })}</Text>
      ) : (
        <BarList
          role="exposure"
          ariaLabel={t('ringrank.infra.title')}
          items={atRisk.map(({ host, memory, peak }) => ({
            key: host.hostId,
            label: host.name,
            value: peak,
            display: t(memory ? 'ringrank.infra.rowMem' : 'ringrank.infra.rowCpu', { pct: decimal(peak, 0) }),
          }))}
        />
      )}
    </RingRankPanel>
  );
};

/**
 * Digital experience — requests without a front-end error (the complement of the measured error
 * rate) beside every application's error rate on one absolute scale (3.3.14).
 */
export const FrontendErrors = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const scorecard = useCatalogQuery('rum.scorecard', scope);
  const webvitals = useCatalogQuery('rum.webvitals', scope);
  if (scorecard.outcome !== 'ok') return null;
  const summary = summariseRum(scorecard.records, webvitals.records);
  if (!summary.hasData || summary.apps.length === 0) return null;
  const cleanPct = summary.overallErrorRatePct === null ? null : Math.max(0, 100 - summary.overallErrorRatePct);

  return (
    <RingRankPanel
      data-testid="dx-ringrank"
      title={t('p.dx2.errors.title')}
      caption={t('p.dx3.err.subtitle')}
      provenance={scorecard.provenance}
      evidence={scorecard.evidence}
      ring={{
        family: 'turquoise',
        value: cleanPct,
        // One decimal in the ring so it fits on the slide; the badge keeps the exact share.
        valueDisplay: cleanPct === null ? undefined : `${formatNumber(Math.round(cleanPct * 10) / 10)}%`,
        label: t('ringrank.dx.label'),
        caption: t('ringrank.dx.caption', { count: formatNumber(summary.totalRequests) }),
        ariaLabel: t('ringrank.dx.aria'),
        missingLabel: t('tl.notMeasured'),
        fact: factFrom(scorecard, cleanPct === null ? null : Number(cleanPct.toFixed(2)), { calculation: t('ringrank.dx.calc'), unit: '%' }),
      }}
    >
      <ErrorRateMeter apps={summary.apps} />
    </RingRankPanel>
  );
};

/**
 * Dynatrace Intelligence — problems by category from the aggregate (`prob.summary` counts every
 * problem by category and status; nothing capped is summed), the top five named (3.3.11).
 */
export const ProblemMix = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const summary = useCatalogQuery('prob.summary', scope);
  if (summary.outcome !== 'ok') return null;
  const byCategory = new Map<string, number>();
  for (const record of summary.records) {
    const category = str(record, 'event.category');
    if (category !== null) byCategory.set(category, (byCategory.get(category) ?? 0) + (num(record, 'problems') ?? 0));
  }
  const total = summary.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  const ranked = [...byCategory.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const otherCount = ranked.slice(CATEGORY_TOP).reduce((sum, [, count]) => sum + count, 0);
  const segments = [
    ...ranked.slice(0, CATEGORY_TOP).map(([category, count]) => ({ key: category, label: problemCategoryLabel(category, t), value: count, display: formatNumber(count) })),
    ...(otherCount > 0 ? [{ key: 'others', label: t('cockpit.ai.mix.others'), value: otherCount, display: formatNumber(otherCount) }] : []),
  ];
  if (segments.length === 0) return null;
  return (
    // 3.4.16 (D-21): the categories are Dynatrace Intelligence's own classification — it carries the AI mark.
    <ChartFrame role="category" title={t('cockpit.ai.mix.title')} provenance={summary.provenance} evidence={summary.evidence} windowLabel={t('timeframe.pinned.7d')} trailing={<IntelligenceMark />}>
      <StratoDonut
        slices={segments.map((segment) => ({ label: segment.label, value: segment.value }))}
        ariaLabel={t('cockpit.ai.mix.title')}
        centerValue={formatNumber(total)}
        centerLabel={t('cockpit.ai.mix.center')}
        formatter={(value) => formatNumber(value)}
        shareFormatter={(percent) => `${formatNumber(Math.round(percent * 10) / 10)} %`}
      />
    </ChartFrame>
  );
};

/**
 * Dynatrace Intelligence — when problems begin, 7 days in 6-hour bins, with the window's mean
 * dashed: a derived line, never data (3.3.11). A bin the query did not return is a zero.
 */
export const ProblemArrivals = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const { resolvedTimeframe, locale } = useStudio();
  const timeline = useCatalogQuery('prob.timeline', scope);
  if (timeline.outcome !== 'ok') return null;
  const arrivals = arrivalSeries(timeline.records, Date.parse(resolvedTimeframe.endIso));
  if (arrivals.length < 2) return null;
  // 3.4.18: on the platform's TimeseriesChart (zoom, tooltip, "Download data" on screen). The peak and the window's
  // mean are written in text above the chart — the mean is derived, never data — and the capture's pins read them.
  const points = arrivals.map((bin) => ({ start: bin.start, end: bin.start + ARRIVAL_BIN_MS, value: bin.count }));
  const mean = arrivals.reduce((sum, bin) => sum + bin.count, 0) / arrivals.length;
  const peak = arrivals.reduce((best, bin) => (bin.count > best.count ? bin : best), arrivals[0] as (typeof arrivals)[number]);
  const at = new Date(peak.start).toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const meanText = t('cockpit.arrivals.mean', { value: formatNumber(Math.round(mean * 10) / 10) });
  return (
    <ChartFrame
      role="volume"
      title={t('cockpit.arrivals.title')}
      provenance={timeline.provenance}
      evidence={timeline.evidence}
      windowLabel={t('timeframe.pinned.7d')}
      trailing={
        <span className="pvs-caption pvs-arrivals__read" data-testid="cockpit-arrivals-peak">
          {peak.count > 0 && (
            <span className="pvs-arrivals__peak" data-pin={`${formatNumber(peak.count)} · ${at}`}>
              {t('cockpit.arrivals.peak', { count: formatNumber(peak.count), at })}
            </span>
          )}
          {peak.count > 0 && ' · '}
          <span className="pvs-arrivals__mean">{meanText}</span>
        </span>
      }
    >
      <StratoTimeseries
        series={[{ name: t('cockpit.arrivals.series'), points }]}
        ariaLabel={t('cockpit.arrivals.title')}
        formatter={(value) => formatNumber(Math.round(value))}
        height={300}
        reference={{ value: mean, label: meanText }}
        periods
      />
    </ChartFrame>
  );
};
