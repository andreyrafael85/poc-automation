import React from 'react';

import { ChartFrame } from '../../components/ChartFrame';
import { HeatCalendar } from '../../components/spectrum';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { ActionTable, type ActionRow } from '../../engine/chart/ActionTable';
import { AssistCard } from '../../engine/chart/AssistCard';
import { STATUS_RANK, statusAgainst } from '../../engine/chart/status';
import { StratoBars, StratoDonut, type StatusTone, type StratoBarRow } from '../../engine/strato';
import { ProblemArrivals } from './panels';
import { assumed } from '../../config/assumptions';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { estateLayers } from './estateLayers';
import { useTranslation } from '../../i18n/useTranslation';
import { CAPACITY_THRESHOLDS, summariseCapacityRow, toHostCapacity } from '../../models/capacity';
import { arrivalCalendar, arrivalSeries } from '../../models/problemTimeline';
import { num, str } from '../../utils/records';
import { formatBytes } from '../../utils/time';

/**
 * The Overview's cockpit (3.3.7, the owner's "parte gráfica incrível"): the reference dashboard's
 * three rows, drawn by the chart engine from catalog queries the app already reads.
 *
 * 1. When problems begin, 7 days in 6-hour bins, with the window's mean drawn dashed (a derived
 *    line, never data) · the monitored estate by layer, its total in the centre.
 * 2. The services with the highest failure rate against the 1 % review line — a top of the
 *    busiest services, never summed, with the exact total beside it · the same 7 days as a
 *    calendar (day × 6-hour block), the "when does it hurt" view.
 * 3. Where to act first: services above (or close to) the 1 % line and hosts at their capacity
 *    ceiling, worst first · the Dynatrace Assist card with the measured fact behind it —
 *    reclaimable memory, never money (rule 6).
 *
 * A panel whose query did not answer is left out; nothing is drawn from a zero that was not
 * measured.
 */

const FAILURE_LINE_PCT = 1;
const RANKED_TOP = 8;
const ACTION_ROWS = 5;

export const OverviewCockpit = () => {
  const scope = useQueryScope();
  const { resolvedTimeframe, locale } = useStudio();
  const { t, formatNumber } = useTranslation();

  const timeline = useCatalogQuery('prob.timeline', scope);
  const inventory = useCatalogQuery('cov.inventory', scope);
  const ranking = useCatalogQuery('svc.ranking', scope);
  const rankingTotal = useCatalogQuery('svc.ranking.total', scope);
  const capacity = useCatalogQuery('infra.capacity', scope);
  const capacitySummary = useCatalogQuery('infra.capacity.summary', scope);

  const pct = (value: number) => `${formatNumber(Math.round(value * 10) / 10)} %`;

  // --- row 1: arrivals over time, and the estate by layer -----------------------------------
  const arrivals = timeline.outcome === 'ok' ? arrivalSeries(timeline.records, Date.parse(resolvedTimeframe.endIso)) : [];
  const points = arrivals;

  const { segments, estate } = estateLayers(inventory.records, inventory.outcome === 'ok', t, formatNumber);

  // --- row 2: failing services against the 1 % line, and the calendar ------------------------
  const services =
    ranking.outcome === 'ok'
      ? ranking.records
          .map((record) => ({ name: str(record, 'name') ?? str(record, 'serviceId') ?? '—', rate: num(record, 'failureRatePct') }))
          .filter((service): service is { name: string; rate: number } => service.rate !== null)
          .sort((a, b) => b.rate - a.rate)
      : [];
  // 3.4.18: each bar in the platform's "Status and health" tone of its failure band (D-10) — 5 % or more Critical,
  // from the 1 % line Warning, failures under it Good — named in words under the chart.
  const attention = assumed('services.failure.attention');
  const toneOf = (rate: number): StatusTone => (rate >= attention ? 'critical' : rate >= FAILURE_LINE_PCT ? 'warning' : rate > 0 ? 'good' : 'ideal');
  const bars: StratoBarRow[] = services.slice(0, RANKED_TOP).map((service) => ({ label: service.name, value: service.rate, tone: toneOf(service.rate) }));
  const withTraffic = num(rankingTotal.records[0], 'services');
  const calendar = arrivalCalendar(arrivals);
  const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}h`;

  // --- row 3: where to act first, and the Assist card -----------------------------------------
  const serviceRows: ActionRow[] = services
    .filter((service) => statusAgainst(service.rate, FAILURE_LINE_PCT) !== 'good')
    .slice(0, 3)
    .map((service, index) => ({
      key: `svc-${service.name}-${index}`,
      entity: service.name,
      signal: t('cockpit.act.failure'),
      share: Math.min(1, service.rate / (FAILURE_LINE_PCT * 4)),
      measured: pct(service.rate),
      versus: `${service.rate >= FAILURE_LINE_PCT ? '+' : '−'}${formatNumber(Math.round(Math.abs(service.rate - FAILURE_LINE_PCT) * 10) / 10)} pp`,
      status: statusAgainst(service.rate, FAILURE_LINE_PCT),
    }));
  const ceiling = CAPACITY_THRESHOLDS.saturatedPct;
  const hostRows: ActionRow[] =
    capacity.outcome === 'ok'
      ? toHostCapacity(capacity.records)
          .map((host) => {
            const memory = (host.peakMemPct ?? -1) >= (host.peakCpuPct ?? -1);
            const peak = memory ? host.peakMemPct : host.peakCpuPct;
            return { host, memory, peak };
          })
          .filter((entry): entry is { host: (typeof entry)['host']; memory: boolean; peak: number } => entry.peak !== null && entry.peak >= CAPACITY_THRESHOLDS.pressuredPct)
          .sort((a, b) => b.peak - a.peak)
          .slice(0, 3)
          .map(({ host, memory, peak }) => ({
            key: `host-${host.hostId}`,
            entity: host.name,
            signal: t(memory ? 'cockpit.act.memory' : 'cockpit.act.cpu'),
            share: peak / 100,
            measured: pct(peak),
            versus: `${peak >= ceiling ? '+' : '−'}${formatNumber(Math.round(Math.abs(peak - ceiling)))} pp`,
            status: peak >= ceiling ? 'critical' : 'warning',
          }))
      : [];
  const actions = [...serviceRows, ...hostRows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]).slice(0, ACTION_ROWS);

  const exact = summariseCapacityRow(capacitySummary.records[0]);
  const assist =
    capacitySummary.outcome === 'ok' && exact !== null && exact.hosts > 0
      ? {
          body: t('cockpit.assist.capacity', {
            saturated: formatNumber(exact.saturated),
            oversized: formatNumber(exact.oversized),
            hosts: formatNumber(exact.hosts),
          }),
          fact:
            exact.reclaimableMemoryBytes === null || exact.reclaimableMemoryBytes <= 0
              ? undefined
              : {
                  label: t('cockpit.assist.reclaimable', { oversized: formatNumber(exact.oversized) }),
                  value: formatBytes(exact.reclaimableMemoryBytes),
                  provenance: 'derived' as const,
                  evidence: capacitySummary.evidence,
                },
        }
      : null;

  const rowOne = points.length > 1 || segments.length > 0;
  const rowTwo = bars.length > 0 || calendar.total > 0;
  const rowThree = actions.length > 0 || assist !== null;

  return (
    <>
      {rowOne && (
        <div className="pvs-cockpit-row" data-testid="cockpit-row-1">
          {points.length > 1 && <ProblemArrivals />}
          {segments.length > 0 && (
            <ChartFrame role="category" title={t('cockpit.donut.title')} provenance={inventory.provenance} evidence={inventory.evidence}>
              <StratoDonut
                slices={segments.map((segment) => ({ label: segment.label, value: segment.value }))}
                ariaLabel={t('cockpit.donut.title')}
                centerValue={formatNumber(estate)}
                centerLabel={t('cockpit.donut.center')}
                formatter={(value) => formatNumber(value)}
                shareFormatter={(percent) => `${formatNumber(Math.round(percent * 10) / 10)} %`}
              />
            </ChartFrame>
          )}
        </div>
      )}

      {rowTwo && (
        <div className="pvs-cockpit-row" data-split="even" data-testid="cockpit-row-2">
          {bars.length > 0 && (
            <ChartFrame
              role="exposure"
              title={t('cockpit.ranked.title')}
              provenance={ranking.provenance}
              evidence={ranking.evidence}
              trailing={
                <span className="pvs-caption">
                  {withTraffic === null
                    ? t('cockpit.ranked.topOf', { shown: formatNumber(bars.length), listed: formatNumber(services.length) })
                    : t('cockpit.ranked.topOfTotal', { shown: formatNumber(bars.length), listed: formatNumber(services.length), total: formatNumber(withTraffic) })}
                </span>
              }
            >
              <StratoBars rows={bars} line={{ value: FAILURE_LINE_PCT, label: t('cockpit.ranked.line') }} formatter={pct} ariaLabel={t('cockpit.ranked.title')} />
              <span className="pvs-caption" data-testid="cockpit-ranked-bands">
                {t('cockpit.ranked.bands', { line: pct(FAILURE_LINE_PCT), attention: pct(attention) })}
              </span>
            </ChartFrame>
          )}
          {calendar.total > 0 && (
            <ChartFrame role="volume" title={t('cockpit.heat.title')} provenance={timeline.provenance} evidence={timeline.evidence} windowLabel={t('timeframe.pinned.7d')}>
              <HeatCalendar
                calendar={calendar}
                caption={t('cockpit.heat.title')}
                dayHeader={t('ai.heat.dayHeader')}
                totalHeader={t('ai.heat.totalHeader')}
                dayLabel={(ms) => new Date(ms).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                periodLabel={(hour) => `${hourLabel(hour)}–${hourLabel((hour + 6) % 24)}`}
                cellLabel={(day, period, count) => t('ai.heat.cell', { day, period, count: formatNumber(count) })}
                outsideLabel={t('ai.heat.outside')}
                legendLow={t('ai.heat.legendLow')}
                legendHigh={t('ai.heat.legendHigh', { max: formatNumber(calendar.max) })}
                format={formatNumber}
                family="pink-purple"
              />
            </ChartFrame>
          )}
        </div>
      )}

      {rowThree && (
        <div className="pvs-cockpit-row" data-testid="cockpit-row-3">
          {actions.length > 0 && (
            <ChartFrame role="exposure" title={t('cockpit.act.title')} provenance="derived" evidence={ranking.evidence} caption={t('cockpit.act.caption', { line: pct(FAILURE_LINE_PCT), ceiling: pct(ceiling) })}>
              <ActionTable
                rows={actions}
                caption={t('cockpit.act.title')}
                headers={{
                  entity: t('cockpit.act.entity'),
                  signal: t('cockpit.act.signal'),
                  measured: t('cockpit.act.measured'),
                  versus: t('cockpit.act.versus'),
                  status: t('cockpit.act.status'),
                }}
              />
            </ChartFrame>
          )}
          {assist !== null && <AssistCard title={t('cockpit.assist.title')} body={assist.body} fact={assist.fact} footnote={t('cockpit.assist.footnote')} />}
        </div>
      )}
    </>
  );
};

/** For tests: the review line the cockpit judges failure rates against. */
export const COCKPIT_FAILURE_LINE_PCT = FAILURE_LINE_PCT;
