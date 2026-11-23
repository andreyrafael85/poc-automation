import React from 'react';

import { MeterBarChart, Sparkline } from '@dynatrace/strato-components/charts';
import Colors from '@dynatrace/strato-design-tokens/colors';
import { Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useQuietPlotSvgs, WhenSized } from './mode';
import { StratoArc } from './StratoArc';
import { useTranslation } from '../../i18n/useTranslation';
import { isUnavailable, UNAVAILABLE_LABEL_KEY, type Fact } from '../../models/provenance';

/**
 * Ratios and splits on the platform's meters (3.4.18, D-09/D-13/D-29, DN-6).
 *
 * `StratoGauge` — (3.6.2: an arc of segments, `StratoArc`; was the platform's `GaugeChart`) without glow, its name and one line under it, and the evidence badge; the glowing
 *   rings of 3.2 (`GaugeRing`) are what the owner called "the old shell". A ratio that was not measured draws no arc:
 *   a dash and the reason (rule 8).
 * `StratoSplit` — a `MultiMeterBarChart`: the measured parts of one whole (the estate by layer, the services by
 *   failure band), each part a count the query returned, never a trend.
 * `StratoMeter` — a `MeterBarChart`: a part of a whole (closed of all problems), with optional review lines.
 */

export const ACCENT = Colors.Charts.CategoricalVivid.Color01.Default;

export interface StratoGaugeProps {
  label: string;
  fact: Fact<number | string | null>;
  /** The ratio, 0–100. */
  value: number | null;
  caption?: string;
  color?: string;
  formatter?: (value: number) => string;
  /** Lower bounds of the status bands, e.g. `[{ value: 0, color: warning }, { value: 95, color: ideal }]`. */
  bands?: readonly { value: number; color: string }[];
  height?: number;
  testId?: string;
}

export const StratoGauge = ({ label, fact, value, caption, color = ACCENT, formatter, bands, height = 130, testId }: StratoGaugeProps) => {
  const { t } = useTranslation();
  const missing = isUnavailable(fact) || value === null;
  const reason =
    fact.provenance in UNAVAILABLE_LABEL_KEY ? t(UNAVAILABLE_LABEL_KEY[fact.provenance as keyof typeof UNAVAILABLE_LABEL_KEY]) : t('tl.notMeasured');
  const format = formatter ?? ((v: number) => `${Math.round(v)} %`);

  return (
    <div
      className="pvs-sgauge"
      data-pvs-chart="gauge"
      data-pvs-state={missing ? 'unavailable' : 'ready'}
      data-value={missing ? undefined : format(value)}
      data-testid={testId}
    >
      <div className="pvs-sgauge__dial" style={{ height }}>
        {missing ? (
          <span className="pvs-sgauge__dash" role="img" aria-label={`${label}: ${reason}`}>
            —
          </span>
        ) : (
          // 3.6.2 (v6): the app's arc of segments in place of the platform's GaugeChart; the reading is the app's text.
          <div className="pvs-sgauge__arc" role="img" aria-label={`${label}: ${format(value)}`} style={{ height }}>
            <StratoArc value={value} color={color} bands={bands} />
            <span className="pvs-sgauge__reading" aria-hidden="true">
              {format(value)}
            </span>
          </div>
        )}
      </div>
      <Text textStyle="base-emphasized" className="pvs-sgauge__label">
        {label}
      </Text>
      {(missing || caption !== undefined) && (
        <Text textStyle="small" className="pvs-sgauge__caption">
          {missing ? reason : caption}
        </Text>
      )}
      <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
    </div>
  );
};

/**
 * The bare dial (3.5.0): an arc with the reading the app formatted in its centre — for the app's `GaugeRing`, which keeps
 * its own label, caption, spoken reading and evidence around it. 3.6.2 (v6): the app's arc of segments (`StratoArc`), no
 * longer the platform's GaugeChart.
 */
export const StratoDial = ({ value, color = ACCENT }: { value: number; reading?: string; height?: number; color?: string }) => (
  <StratoArc value={Math.max(0, Math.min(100, value))} color={color} />
);

export interface StratoSplitPart {
  label: string;
  value: number;
  color?: string;
}

/** The Categorical Vivid colours, in the order the platform's split bars use them. */
const VIVID_TICKS = Array.from({ length: 10 }, (_, index) => `var(--dt-colors-charts-categorical-vivid-color-${String(index + 1).padStart(2, '0')}-default)`);

/**
 * How many of `ticks` each part takes: proportional by largest remainder, at least one for every part above zero (when
 * there are fewer parts than ticks), always `ticks` in all. Pure.
 */
export function allocateTicks(values: readonly number[], ticks: number): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!(total > 0) || ticks <= 0) return values.map(() => 0);
  const positive = values.filter((value) => value > 0).length;
  const floor = positive <= ticks ? 1 : 0;
  const raw = values.map((value) => (value > 0 ? (value / total) * ticks : 0));
  const counts = raw.map((share, index) => ((values[index] ?? 0) > 0 ? Math.max(floor, Math.floor(share)) : 0));
  let left = ticks - counts.reduce((sum, count) => sum + count, 0);
  const order = raw.map((share, index) => ({ index, rest: share - Math.floor(share) })).sort((a, b) => b.rest - a.rest);
  for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length) {
    const entry = order[k];
    if (entry !== undefined && (values[entry.index] ?? 0) > 0) {
      counts[entry.index] = (counts[entry.index] ?? 0) + 1;
      left -= 1;
    }
  }
  while (left < 0) {
    // Taking a tick back from the largest part keeps every part above zero visible.
    const largest = counts.reduce((best, count, index) => (count > (counts[best] ?? 0) ? index : best), 0);
    counts[largest] = (counts[largest] ?? 0) - 1;
    left += 1;
  }
  return counts;
}

/**
 * A split of a total (3.6.0, owner: "o formato de mini barras … repassado aos demais com as cores diferenciando os
 * dados"): a row of small ticks, each part taking its share of them in its own colour (Categorical Vivid by default, or
 * the part's colour). The parts and their values are read aloud once. Was the platform's `MultiMeterBarChart` (3.4.18).
 */
export const StratoSplit = ({ parts, ariaLabel, ticks = 24 }: { parts: readonly StratoSplitPart[]; ariaLabel: string; ticks?: number }) => {
  const shown = parts.filter((part) => part.value > 0);
  if (shown.length === 0) return null;
  const counts = allocateTicks(
    shown.map((part) => part.value),
    ticks,
  );
  const cells = shown.flatMap((part, index) => Array.from({ length: counts[index] ?? 0 }, () => part.color ?? VIVID_TICKS[index % VIVID_TICKS.length]));
  return (
    <div
      className="pvs-ssplit pvs-sticks"
      role="img"
      aria-label={`${ariaLabel}: ${shown.map((part) => `${part.label} ${part.value}`).join(', ')}`}
      data-pvs-chart="split"
      style={{ '--pvs-ticks': cells.length } as React.CSSProperties}
    >
      {cells.map((color, index) => (
        <span key={index} className="pvs-sticks__tick" data-on="true" style={{ background: color }} />
      ))}
    </div>
  );
};

export const StratoMeter = ({
  value,
  max,
  name,
  color = ACCENT,
  lines,
}: {
  value: number;
  max: number;
  name: string;
  color?: string;
  lines?: readonly { value: number; color: string; name: string }[];
}) => (
  <WhenSized className="pvs-smeter">
    <MeterBarChart value={value} min={0} max={max} size="size8" color={color} name={name}>
      {lines?.map((line) => <MeterBarChart.ThresholdIndicator key={line.value} value={line.value} color={line.color} name={line.name} />)}
      <MeterBarChart.Toolbar hidden />
    </MeterBarChart>
  </WhenSized>
);

/**
 * A small line under a number (3.5.2): the platform's Sparkline over the series the number came from, oldest first.
 * Only a measured series — never a decorative one; the spoken label says what it is.
 */
export const StratoSpark = ({ points, label, color = ACCENT }: { points: readonly number[]; label: string; color?: string }) => {
  const plot = React.useRef<HTMLDivElement>(null);
  useQuietPlotSvgs(plot);
  if (points.length < 2) return null;
  const HOUR = 3_600_000;
  const data = { name: label, datapoints: points.map((value, index) => ({ start: new Date(index * HOUR), end: new Date((index + 1) * HOUR), value })) };
  return (
    <div ref={plot} className="pvs-sspark" role="img" aria-label={label}>
      <WhenSized>
        <Sparkline data={data} variant="area" height={32} color={color} gapPolicy="gap">
          <Sparkline.YAxis min={0} />
        </Sparkline>
      </WhenSized>
    </div>
  );
};

