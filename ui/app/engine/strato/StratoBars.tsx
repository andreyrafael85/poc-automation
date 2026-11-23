import React from 'react';

import { CategoricalBarChart, TopList } from '@dynatrace/strato-components/charts';
import Colors from '@dynatrace/strato-design-tokens/colors';

import { usePrintWidth, useQuietPlotSvgs, useStratoMode, WhenSized } from './mode';

/**
 * Rankings on the platform's charts (3.4.18, D-08/D-29).
 *
 * `StratoBars` — a horizontal `CategoricalBarChart`: the name on the category axis (long service names stay readable),
 * the review line as a threshold, each bar in the platform's "Status and health" tone when it carries a verdict
 * (above the line, close to it, within it). `StratoTopList` — the platform's `TopList` for short names, kept in the
 * query's order. Both draw a top N; the caller names it "top N of M" beside the chart and never sums it (rule 7).
 */

export type StatusTone = 'ideal' | 'good' | 'neutral' | 'warning' | 'critical';

export const STATUS_COLOR: Record<StatusTone, string> = {
  ideal: Colors.Charts.Status.Ideal.Default,
  good: Colors.Charts.Status.Good.Default,
  neutral: Colors.Charts.Status.Neutral.Default,
  warning: Colors.Charts.Status.Warning.Default,
  critical: Colors.Charts.Status.Critical.Default,
};

export interface StratoBarRow {
  label: string;
  value: number;
  tone?: StatusTone;
}

export interface StratoBarsProps {
  rows: readonly StratoBarRow[];
  /** The review line, with its label (a warning-tone threshold). */
  line?: { value: number; label: string };
  formatter?: (value: number) => string;
  /** Height in px; by default 34 px a row. */
  height?: number;
  /** Widest category label, in px. */
  labelWidth?: number;
  ariaLabel: string;
}

export const StratoBars = ({ rows, line, formatter, height, labelWidth = 180, ariaLabel }: StratoBarsProps) => {
  const mode = useStratoMode();
  const plot = React.useRef<HTMLDivElement>(null);
  useQuietPlotSvgs(plot);
  const printWidth = usePrintWidth(plot, 600);
  const data = rows.map((row) => ({ category: row.label, value: row.value, ...(row.tone === undefined ? {} : { color: STATUS_COLOR[row.tone] }) }));

  return (
    <div ref={plot} className="pvs-sbars" data-pvs-chart="bars" data-pvs-state={data.length > 0 ? 'ready' : 'unavailable'}>
      <WhenSized minHeight={height ?? Math.max(160, rows.length * 34 + 48)}>
      <CategoricalBarChart
        data={data}
        layout="horizontal"
        height={height ?? Math.max(160, rows.length * 34 + 48)}
        width={printWidth}
        colorPalette="categorical-vivid"
        aria-label={ariaLabel}
      >
        <CategoricalBarChart.Legend hidden />
        <CategoricalBarChart.CategoryAxis maxSize={labelWidth} />
        <CategoricalBarChart.ValueAxis min={0} formatter={formatter} />
        {line !== undefined && (
          <CategoricalBarChart.ThresholdIndicator data={{ value: line.value }} color={Colors.Charts.Status.Warning.Default} label={line.label} strokeOnly />
        )}
        {mode !== 'screen' && <CategoricalBarChart.Toolbar hidden />}
      </CategoricalBarChart>
      </WhenSized>
    </div>
  );
};

export interface StratoTopListProps {
  rows: readonly { label: string; value: number }[];
  formatter?: (value: number) => string;
  ariaLabel: string;
}

export const StratoTopList = ({ rows, formatter, ariaLabel }: StratoTopListProps) => {
  const plot = React.useRef<HTMLDivElement>(null);
  useQuietPlotSvgs(plot);
  return (
  <div ref={plot} className="pvs-stoplist" data-pvs-chart="toplist" data-pvs-state={rows.length > 0 ? 'ready' : 'unavailable'}>
    <TopList
      data={rows.map((row) => ({ label: row.label, value: row.value }))}
      labelAccessor="label"
      valueAccessor="value"
      valueFormatter={formatter}
      comparator={() => 0}
      height={Math.max(100, rows.length * 25)}
      colorPalette="categorical-vivid"
      aria-label={ariaLabel}
    />
  </div>
  );
};
