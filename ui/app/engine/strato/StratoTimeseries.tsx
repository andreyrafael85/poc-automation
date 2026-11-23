import React from 'react';

import { TimeseriesChart, type Timeseries } from '@dynatrace/strato-components/charts';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import Colors from '@dynatrace/strato-design-tokens/colors';

import { useTranslation } from '../../i18n/useTranslation';
import { usePrintWidth, useQuietPlotSvgs, useStratoMode, WhenSized } from './mode';

/**
 * A series over time on the platform's `TimeseriesChart` (3.4.18, D-07): crosshair, tooltip, zoom, pan and "Download
 * data" on screen; none of them in a capture or a print. A bin the query did not return stays a gap (`gapPolicy`
 * 'gap'), never a zero (rule 8). The mean is a derived line, drawn as a neutral threshold and named as such — never
 * data. One unit per chart (the platform draws one axis per unit).
 */

export interface StratoSeriesPoint {
  start: number;
  end: number;
  value: number | null;
}

export interface StratoTimeseriesProps {
  /** One series per name; points in time order. A `null` value is left out (a gap). */
  series: readonly { name: string; points: readonly StratoSeriesPoint[]; color?: string }[];
  variant?: 'area' | 'line' | 'bar';
  height?: number;
  /** A derived reference line (the window's mean), drawn neutral with its own label. */
  reference?: { value: number; label: string };
  /** A review line (a target or a ceiling), drawn in the warning tone with its label. */
  line?: { value: number; label: string };
  formatter?: (value: number) => string;
  /** Width in px on a printed page (the canvas does not follow the page; DN-8). */
  printWidth?: number;
  ariaLabel: string;
  /**
   * 3.5.9 (v6): a period selector over the points already read — the last 24 h, 7 d or 30 d of the series when it spans
   * more, and the whole read. It narrows what is drawn, never what is read (no new query); on screen only.
   */
  periods?: boolean;
}

const HOUR = 3_600_000;
const PERIODS = [
  { key: '24h', ms: 24 * HOUR },
  { key: '7d', ms: 7 * 24 * HOUR },
  { key: '30d', ms: 30 * 24 * HOUR },
] as const;

/** The periods worth offering for a series: those shorter than what was read (by a margin), then the whole read. */
export function periodOptions(start: number, end: number): { key: string; ms: number | null }[] {
  const span = end - start;
  if (!(span > 0)) return [];
  const shorter = PERIODS.filter((period) => period.ms < span * 0.9).map((period) => ({ key: period.key, ms: period.ms }));
  return shorter.length === 0 ? [] : [...shorter, { key: 'all', ms: null }];
}

/** The points of a series within the last `ms` of `end` (a bin is kept when it ends inside the period). */
export function slicePoints(points: readonly StratoSeriesPoint[], end: number, ms: number | null): StratoSeriesPoint[] {
  return ms === null ? [...points] : points.filter((point) => point.end > end - ms);
}

export const toTimeseries = (name: string, points: readonly StratoSeriesPoint[]): Timeseries => ({
  name,
  datapoints: points
    .filter((point): point is StratoSeriesPoint & { value: number } => point.value !== null)
    .map((point) => ({ start: new Date(point.start), end: new Date(point.end), value: point.value })),
});

export const StratoTimeseries = ({ series, variant = 'area', height = 280, reference, line, formatter, printWidth = 600, ariaLabel, periods = false }: StratoTimeseriesProps) => {
  const mode = useStratoMode();
  const still = mode !== 'screen';
  const plot = React.useRef<HTMLDivElement>(null);
  useQuietPlotSvgs(plot);
  const fixedWidth = usePrintWidth(plot, printWidth);
  const all = series.flatMap((entry) => entry.points);
  const first = all.reduce((least, point) => Math.min(least, point.start), Number.POSITIVE_INFINITY);
  const last = all.reduce((most, point) => Math.max(most, point.end), Number.NEGATIVE_INFINITY);
  const options = periods && !still && Number.isFinite(first) && Number.isFinite(last) ? periodOptions(first, last) : [];
  const [period, setPeriod] = React.useState<string>('all');
  const chosen = options.find((option) => option.key === period) ?? { key: 'all', ms: null };
  const data = series.map((entry) => toTimeseries(entry.name, slicePoints(entry.points, last, chosen.ms)));
  const colored = series.filter((entry) => entry.color !== undefined);

  return (
    <div ref={plot} className="pvs-sts" data-pvs-chart="timeseries" data-pvs-state={data.some((entry) => entry.datapoints.length > 0) ? 'ready' : 'unavailable'}>
      {options.length > 0 && <PeriodSelector options={options} chosen={chosen} onChange={setPeriod} />}
      {/* 3.5.3: inside a tab not shown yet (Services, Infrastructure, Dynatrace Intelligence) it draws once it has a width. */}
      <WhenSized minHeight={mode === 'print' ? Math.min(height, 220) : height}>
      <TimeseriesChart
        data={colored.length === 0 ? data : undefined}
        variant={variant}
        height={mode === 'print' ? Math.min(height, 220) : height}
        width={fixedWidth}
        colorPalette="categorical-vivid"
        gapPolicy="gap"
        curve={variant === 'bar' ? undefined : 'smooth'}
        pointsDisplay={variant === 'area' ? 'never' : undefined}
        aria-label={ariaLabel}
      >
        {colored.length > 0 &&
          series.map((entry, index) => {
            const ts = data[index] as Timeseries;
            if (variant === 'line') return <TimeseriesChart.Line key={entry.name} data={ts} color={entry.color} />;
            if (variant === 'bar') return <TimeseriesChart.Bar key={entry.name} data={ts} color={entry.color} />;
            return <TimeseriesChart.Area key={entry.name} data={ts} color={entry.color} />;
          })}
        <TimeseriesChart.YAxis min={0} formatter={formatter} />
        <TimeseriesChart.Legend hidden={series.length < 2} />
        <TimeseriesChart.Tooltip variant={series.length > 1 ? 'shared' : 'single'} />
        {reference !== undefined && (
          <TimeseriesChart.ThresholdIndicator data={{ value: reference.value }} color={Colors.Text.Neutral.Subdued} label={reference.label} strokeOnly />
        )}
        {line !== undefined && (
          <TimeseriesChart.ThresholdIndicator data={{ value: line.value }} color={Colors.Charts.Status.Warning.Default} label={line.label} strokeOnly />
        )}
        {still && <TimeseriesChart.Toolbar hidden />}
        {still && <TimeseriesChart.Zoom disabled />}
        {still && <TimeseriesChart.Pan disabled />}
      </TimeseriesChart>
      </WhenSized>
    </div>
  );
};

/** The period selector (3.5.9): mounted only when there is a period to offer, so a chart without one needs no app context. */
const PeriodSelector = ({ options, chosen, onChange }: { options: readonly { key: string; ms: number | null }[]; chosen: { key: string; ms: number | null }; onChange: (key: string) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="pvs-sts__periods">
      <ToggleButtonGroup name="pvs-period" value={chosen.key} onChange={(value: string) => onChange(value)} aria-label={t('v6.period.aria')}>
        {options.map((option) => (
          <ToggleButtonGroup.Item key={option.key} value={option.key}>
            {t(`v6.period.${option.key}` as Parameters<typeof t>[0])}
          </ToggleButtonGroup.Item>
        ))}
      </ToggleButtonGroup>
      {chosen.ms !== null && <span className="pvs-caption">{t('v6.period.note')}</span>}
    </div>
  );
};
