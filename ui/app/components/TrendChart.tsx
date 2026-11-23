import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope } from '../config/StudioContext';
import { Figure, Grid, Panel, Stack } from '../engine';
import { useCatalogQuery, type CatalogQueryResult } from '../hooks/useCatalogQuery';
import { useTranslation } from '../i18n/useTranslation';
import { seriesStats, type SeriesPoint } from '../models/series';
import type { CatalogId } from '../queries/catalog';
import type { GrailRecord } from '../utils/records';
import { ProvenanceBadge } from './ProvenanceBadge';
import { QueryStateBoundary } from './QueryStateBoundary';
import { useChartFormat } from './spectrum/chartFormat';
import type { SpectrumFamily } from './spectrum/family';
import { StratoTimeseries } from '../engine/strato';

/** The width of a bin: the step to the next point (or from the previous one, for the last). */
const binOf = (points: readonly SeriesPoint[], index: number): number => {
  const here = points[index];
  const next = points[index + 1] ?? null;
  const previous = points[index - 1] ?? null;
  if (here === undefined) return 0;
  if (next !== null) return next.t - here.t;
  if (previous !== null) return here.t - previous.t;
  return 3_600_000;
};

/**
 * A catalog timeseries query drawn as Spectrum area charts, one per unit (3.2.3, wave V4).
 *
 * Until 3.2.2 this drew every series of a query in one Strato line chart: on Services the
 * requests (hundreds of thousands per hour), the failures (tens) and the response time (in
 * microseconds) shared one axis, and the failures read as zero. Each series now gets its own
 * chart, its own axis and its own unit, and opens with the figure a reader asks for first: the
 * total of a count over the window, or the average of a rate.
 */

export interface TrendSeries {
  key: string;
  /** Title of the chart (already translated). */
  title: string;
  /** One line on what is measured (already translated). */
  caption?: string;
  /** The series, read from the query's records (see `models/series.ts`). */
  read: (records: GrailRecord[]) => SeriesPoint[];
  /** Formats a value with its unit. */
  format: (value: number) => string;
  family?: SpectrumFamily;
  /**
   * The opening figure: the window total of a count, the average of the bins, or a figure the
   * caller computes over the whole window (a failure rate is total failures over total requests,
   * not the average of the hourly rates).
   */
  headline: 'sum' | 'mean' | { label: string; value: (records: GrailRecord[]) => number | null };
}

export interface TrendChartProps {
  queryId: CatalogId;
  series: readonly TrendSeries[];
  enabled?: boolean;
  /** Plot height of each chart, in px. */
  height?: number;
  /** Narrowest a chart may get before the next one wraps under it. */
  minWidth?: number;
}

const TrendPanel = ({
  spec,
  result,
  height,
}: {
  spec: TrendSeries;
  result: CatalogQueryResult;
  height: number;
}) => {
  const { t } = useTranslation();
  const fmt = useChartFormat();
  const points = spec.read(result.records);
  const stats = seriesStats(points);
  const family = spec.family ?? 'turquoise';
  const first = points[0];
  const lastPoint = points[points.length - 1];
  const headline =
    spec.headline === 'sum' ? stats.sum : spec.headline === 'mean' ? stats.mean : spec.headline.value(result.records);
  const headlineLabel =
    spec.headline === 'sum' ? t('chart.stat.total') : spec.headline === 'mean' ? t('chart.stat.mean') : spec.headline.label;

  const summary =
    stats.peak !== null && stats.peak.v !== null && stats.last !== null && stats.last.v !== null && first !== undefined && lastPoint !== undefined
      ? t('chart.summary', {
          bins: points.length,
          from: fmt.binTime(first.t),
          to: fmt.binTime(lastPoint.t),
          peak: spec.format(stats.peak.v),
          time: fmt.binTime(stats.peak.t),
          last: spec.format(stats.last.v),
        })
      : undefined;

  return (
    // 3.5.0 (Strato native, wave 2; D-07): the platform's TimeseriesChart under the headline, peak and last figures the
    // app writes (and the Tech Wrapup pins read); a bin the query did not return stays a gap. No spectrum edge.
    <Panel as="article" pad="roomy" className="pvs-trend">
      <div className="pvs-stack">
        <div className="pvs-trend__head">
          <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-2)' } as React.CSSProperties}>
            <Heading level={5} as="h3">
              {spec.title}
            </Heading>
            {spec.caption !== undefined && <Text className="pvs-caption">{spec.caption}</Text>}
          </div>
          <ProvenanceBadge
            provenance={result.provenance}
            confidence={result.provenance === 'observed' ? 'high' : 'medium'}
            evidence={result.evidence}
          />
        </div>
        {stats.measured === 0 ? (
          <Text className="pvs-caption">{t('chart.empty')}</Text>
        ) : (
          <>
            <div className="pvs-trend__figures" data-spectrum={family}>
              <div className="pvs-trend__figure">
                <Text className="pvs-label">{headlineLabel}</Text>
                <Figure value={headline === null ? '—' : spec.format(headline)} size="lg" ink="spectrum" missing={headline === null} />
              </div>
              {stats.peak !== null && stats.peak.v !== null && (
                <div className="pvs-trend__figure">
                  <Text className="pvs-label">{t('chart.stat.peak')}</Text>
                  <Text className="pvs-trend__value">{spec.format(stats.peak.v)}</Text>
                  <Text className="pvs-caption">{fmt.binTime(stats.peak.t)}</Text>
                </div>
              )}
              {stats.last !== null && stats.last.v !== null && (
                <div className="pvs-trend__figure">
                  <Text className="pvs-label">{t('chart.stat.last')}</Text>
                  <Text className="pvs-trend__value">{spec.format(stats.last.v)}</Text>
                  <Text className="pvs-caption">{fmt.binTime(stats.last.t)}</Text>
                </div>
              )}
            </div>
            <StratoTimeseries
              series={[{ name: spec.title, points: points.map((point, index) => ({ start: point.t, end: point.t + binOf(points, index), value: point.v })) }]}
              ariaLabel={summary === undefined ? spec.title : `${spec.title}: ${summary}`}
              formatter={spec.format}
              height={Math.max(height, 180)}
              periods
            />
          </>
        )}
      </div>
    </Panel>
  );
};

export const TrendChart = ({ queryId, series, enabled = true, height = 168, minWidth = 320 }: TrendChartProps) => {
  const scope = useQueryScope();
  const result = useCatalogQuery(queryId, { ...scope, enabled });
  const { t, tWindow, formatTime } = useTranslation();

  return (
    <Stack gap="tight">
      <QueryStateBoundary result={result}>
        <Grid min={minWidth}>
          {series.map((spec) => (
            <TrendPanel key={spec.key} spec={spec} result={result} height={height} />
          ))}
        </Grid>
      </QueryStateBoundary>
      <Text className="pvs-caption">
        {t('c.chart.footer', { window: tWindow(result.timeframe.label), query: result.entry.id })}
        {result.evidence.collectedAt !== undefined ? t('c.read.at', { time: formatTime(result.evidence.collectedAt) }) : ''}
        {' · '}
        {t('chart.gaps')}
      </Text>
    </Stack>
  );
};
