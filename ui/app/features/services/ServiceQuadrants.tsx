import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { ChartFrame } from '../../components/ChartFrame';
import { assumed } from '../../config/assumptions';
import { useQueryScope } from '../../config/StudioContext';
import { Stack } from '../../engine';
import { STATUS_COLOR, type StatusTone } from '../../engine/strato';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import {
  FAILURE_TICKS,
  failureDomain,
  latencyDomain,
  serviceQuadrants,
  type Quadrant,
  type QuadrantPoint,
} from '../../models/serviceQuadrants';
import { decimal } from '../../utils/activeLocale';
import { num } from '../../utils/records';
import { formatMicros } from '../../utils/time';

const TONE: Record<Quadrant, StatusTone> = { both: 'critical', slow: 'warning', failing: 'warning', within: 'good' };
const NAME: Record<Quadrant, StringKey> = {
  both: 'svc.quad.both',
  slow: 'svc.quad.slow',
  failing: 'svc.quad.failing',
  within: 'svc.quad.within',
};
/** How many services of the "look first" quadrant are named on the chart. */
const NAMED = 5;

const G = { width: 960, height: 440, left: 78, right: 24, top: 28, bottom: 52 } as const;

/**
 * 3.5.4 — Services → "Quadrants": the busiest services as points before the two review lines (visual proposal v4).
 * Drawn by the app (the platform's XYChart has no per-point size nor a vertical line): failure rate on a square-root
 * axis, response time on a log axis, area by requests; the quadrant in the "Status and health" tones, named in words
 * and counted; the "look first" services named on the chart; a table for screen readers with every point.
 */
export const ServiceQuadrants = () => {
  const { t, formatNumber, tWindow } = useTranslation();
  const scope = useQueryScope();
  const ranking = useCatalogQuery('svc.ranking', scope);
  const totals = useCatalogQuery('svc.ranking.total', scope);
  if (ranking.outcome !== 'ok') return null;

  const failurePct = assumed('services.failure.good');
  const latencyMs = assumed('services.latency.attention');
  const view = serviceQuadrants(ranking.records, failurePct, latencyMs);
  if (view.points.length === 0) return null;
  const serviceCount = totals.outcome === 'ok' ? num(totals.records[0], 'services') : null;

  const plotW = G.width - G.left - G.right;
  const plotH = G.height - G.top - G.bottom;
  const xMax = failureDomain(view.points, failurePct);
  const [yLow, yHigh] = latencyDomain(view.points, latencyMs);
  const x = (pct: number) => G.left + Math.sqrt(Math.max(0, pct) / xMax) * plotW;
  const y = (ms: number) => G.top + plotH - ((Math.log10(ms) - Math.log10(yLow)) / (Math.log10(yHigh) - Math.log10(yLow))) * plotH;
  const most = Math.max(...view.points.map((point) => point.requests));
  const r = (requests: number) => 4 + 14 * Math.sqrt(requests / most);
  const lineX = x(failurePct);
  const lineY = y(latencyMs);
  const yTicks: number[] = [];
  for (let value = yLow; value <= yHigh * 1.0001; value *= 10) yTicks.push(value);
  const xTicks = FAILURE_TICKS.filter((tick) => tick <= xMax);
  const pctLabel = (value: number) => `${decimal(value, value < 1 && value > 0 ? 1 : 0)}%`;
  const msLabel = (ms: number) => formatMicros(ms * 1000);
  // Largest first, so a small point is never hidden under a large one.
  const ordered = [...view.points].sort((a, b) => b.requests - a.requests);
  const named = view.points
    .filter((point) => point.quadrant === 'both')
    .sort((a, b) => b.requests - a.requests)
    .slice(0, NAMED);
  const pointLabel = (point: QuadrantPoint) =>
    t('svc.quad.point', {
      name: point.name,
      rate: pctLabel(point.failureRatePct),
      time: msLabel(point.responseMs),
      requests: formatNumber(point.requests),
      quadrant: t(NAME[point.quadrant]),
    });
  const corners: { quadrant: Quadrant; tx: number; ty: number; anchor: 'start' | 'end' }[] = [
    { quadrant: 'slow', tx: G.left + 8, ty: G.top + 14, anchor: 'start' },
    { quadrant: 'both', tx: G.width - G.right - 8, ty: G.top + 14, anchor: 'end' },
    { quadrant: 'within', tx: G.left + 8, ty: G.top + plotH - 8, anchor: 'start' },
    { quadrant: 'failing', tx: G.width - G.right - 8, ty: G.top + plotH - 8, anchor: 'end' },
  ];
  const shown = view.points.length;

  return (
    <ChartFrame
      role="exposure"
      title={t('svc.quad.title')}
      caption={t('svc.quad.caption', { failure: pctLabel(failurePct), latency: msLabel(latencyMs) })}
      provenance={ranking.provenance}
      evidence={ranking.evidence}
      windowLabel={tWindow(ranking.timeframe.label)}
      trailing={
        <span className="pvs-caption">
          {serviceCount === null
            ? t('svc.quad.topOf', { shown: formatNumber(shown) })
            : t('svc.quad.topOfTotal', { shown: formatNumber(shown), total: formatNumber(serviceCount) })}
        </span>
      }
    >
      <Stack gap="group">
        <ul className="pvs-quad__counts" aria-label={t('svc.quad.countsAria')}>
          {(['both', 'slow', 'failing', 'within'] as const).map((quadrant) => (
            <li key={quadrant} className="pvs-quad__count" data-quadrant={quadrant}>
              <span className="pvs-quad__swatch" style={{ background: STATUS_COLOR[TONE[quadrant]] }} aria-hidden="true" />
              <span className="pvs-quad__count-value">{formatNumber(view.counts[quadrant])}</span>
              <span className="pvs-quad__count-name">{t(NAME[quadrant])}</span>
            </li>
          ))}
        </ul>
        <div className="pvs-quad" data-pvs-chart="service-quadrants" data-pvs-state="ready">
          <svg className="pvs-quad__svg" viewBox={`0 0 ${G.width} ${G.height}`} role="img" aria-label={t('svc.quad.aria', { shown: formatNumber(shown), both: formatNumber(view.counts.both) })}>
            {/* The "look first" corner, washed in its tone. */}
            <rect x={lineX} y={G.top} width={G.width - G.right - lineX} height={Math.max(0, lineY - G.top)} className="pvs-quad__hot" style={{ fill: STATUS_COLOR.critical }} />
            {yTicks.map((tick) => (
              <g key={`y${tick}`} className="pvs-quad__grid">
                <line x1={G.left} x2={G.width - G.right} y1={y(tick)} y2={y(tick)} />
                <text x={G.left - 8} y={y(tick) + 4} textAnchor="end" className="pvs-quad__tick">
                  {msLabel(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((tick) => (
              <g key={`x${tick}`} className="pvs-quad__grid">
                <line x1={x(tick)} x2={x(tick)} y1={G.top} y2={G.top + plotH} />
                <text x={x(tick)} y={G.top + plotH + 18} textAnchor="middle" className="pvs-quad__tick">
                  {pctLabel(tick)}
                </text>
              </g>
            ))}
            <line className="pvs-quad__line" x1={lineX} x2={lineX} y1={G.top} y2={G.top + plotH} />
            <line className="pvs-quad__line" x1={G.left} x2={G.width - G.right} y1={lineY} y2={lineY} />
            <text x={lineX + 6} y={G.top + plotH - 24} className="pvs-quad__line-label">
              {t('svc.quad.failureLine', { value: pctLabel(failurePct) })}
            </text>
            <text x={G.width - G.right - 6} y={lineY - 6} textAnchor="end" className="pvs-quad__line-label">
              {t('svc.quad.latencyLine', { value: msLabel(latencyMs) })}
            </text>
            {corners.map((corner) => (
              <text key={corner.quadrant} x={corner.tx} y={corner.ty} textAnchor={corner.anchor} className="pvs-quad__corner">
                {`${t(NAME[corner.quadrant])} · ${formatNumber(view.counts[corner.quadrant])}`}
              </text>
            ))}
            <g aria-hidden="true">
              {ordered.map((point) => (
                <circle
                  key={`${point.id}-${point.name}`}
                  cx={x(point.failureRatePct)}
                  cy={y(point.responseMs)}
                  r={r(point.requests)}
                  className="pvs-quad__dot"
                  data-quadrant={point.quadrant}
                  style={{ fill: STATUS_COLOR[TONE[point.quadrant]] }}
                >
                  <title>{pointLabel(point)}</title>
                </circle>
              ))}
              {named.map((point) => (
                <text
                  key={`n-${point.id}-${point.name}`}
                  x={x(point.failureRatePct) + r(point.requests) + 4}
                  y={y(point.responseMs) + 4}
                  className="pvs-quad__name"
                  textAnchor={x(point.failureRatePct) > G.width - 200 ? 'end' : 'start'}
                  dx={x(point.failureRatePct) > G.width - 200 ? -2 * r(point.requests) - 8 : 0}
                >
                  {point.name}
                </text>
              ))}
            </g>
            <text x={G.left + plotW / 2} y={G.height - 8} textAnchor="middle" className="pvs-quad__axis">
              {t('svc.quad.xAxis')}
            </text>
            <text x={16} y={G.top + plotH / 2} textAnchor="middle" transform={`rotate(-90 16 ${G.top + plotH / 2})`} className="pvs-quad__axis">
              {t('svc.quad.yAxis')}
            </text>
          </svg>
          <div className="pvs-sr-only">
            <table>
              <caption>{t('svc.quad.title')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('common.service')}</th>
                  <th scope="col">{t('svc.quad.xAxis')}</th>
                  <th scope="col">{t('svc.quad.yAxis')}</th>
                  <th scope="col">{t('svc.quad.requests')}</th>
                  <th scope="col">{t('svc.quad.quadrant')}</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((point) => (
                  <tr key={`row-${point.id}-${point.name}`}>
                    <td>{point.name}</td>
                    <td>{pctLabel(point.failureRatePct)}</td>
                    <td>{msLabel(point.responseMs)}</td>
                    <td>{formatNumber(point.requests)}</td>
                    <td>{t(NAME[point.quadrant])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Text className="pvs-caption">
          {t('svc.quad.legend')}
          {view.untimed > 0 ? ` ${t('svc.quad.untimed', { n: formatNumber(view.untimed) })}` : ''}
        </Text>
      </Stack>
    </ChartFrame>
  );
};
