import React, { useId, useRef, useState } from 'react';

import { niceCeiling, seriesStats, type SeriesPoint } from '../../models/series';
import { svgId, type SpectrumFamily } from './family';

export interface SpectrumAreaProps {
  points: readonly SeriesPoint[];
  family?: SpectrumFamily;
  /** What the chart shows (already translated). The summary of the series is appended for assistive technology. */
  label: string;
  /** Formats a value with its unit ("1.2k req", "184 ms", "0.42%"). */
  format: (value: number) => string;
  /** Formats the start of a bin for the tooltip ("Sat 04/10 14:00"). */
  formatTime: (ms: number) => string;
  /** Formats an axis tick, shorter than the tooltip ("14h", "Sat 04"). Defaults to `formatTime`. */
  formatTick?: (ms: number) => string;
  /** Spoken summary, e.g. "peak {peak} at {time}" (already translated, with the values filled in). */
  summary?: string;
  /** Plot height in px. */
  height?: number;
  /**
   * 3.3.7: horizontal reference lines drawn dashed over the series — the window's mean, a PoC
   * criterion, a review line. A reference is never data: it carries its own words and is drawn
   * in a dashed stroke (`.pvs-area__ref`, `engine/spectrum.css`), never in the series' solid line.
   */
  references?: readonly AreaReference[];
}

export interface AreaReference {
  value: number;
  /** What the line is ("Mean of the window: 32"), already translated. */
  label: string;
  /** `goal` for a target or criterion, `mean` for a statistic of the series itself. */
  kind?: 'goal' | 'mean';
}

const VIEW_W = 1000;
const VIEW_H = 100;
const X_TICKS = 5;

/** Contiguous runs of measured bins: a missing bin breaks the line instead of being drawn as a zero. */
function runs(points: readonly SeriesPoint[]): { index: number; v: number }[][] {
  const out: { index: number; v: number }[][] = [];
  let current: { index: number; v: number }[] = [];
  points.forEach((point, index) => {
    if (point.v === null) {
      if (current.length > 0) out.push(current);
      current = [];
    } else current.push({ index, v: point.v });
  });
  if (current.length > 0) out.push(current);
  return out;
}

/**
 * A time series as a Spectrum area (3.2.3, wave V4): one chart per unit, so requests, failures and
 * response time never share an axis again (on 3.2.1 the failures, three orders of magnitude below
 * the requests, sat on the floor and read as zero).
 *
 * The axis starts at zero and ends at a round number; gridlines carry their value as text; the
 * busiest bin is marked with its value; a missing bin is a gap, never a zero. Pointing at the plot
 * (mouse, pen or touch) shows the bin, its time and its value. The plot announces what it shows
 * and its summary to assistive technology. Print draws it flat.
 */
export const SpectrumArea = ({
  points,
  family = 'turquoise',
  label,
  format,
  formatTime,
  formatTick,
  summary,
  height = 168,
  references = [],
}: SpectrumAreaProps) => {
  const reactId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const stats = seriesStats(points);
  if (points.length < 2 || stats.max === null) return null;

  const top = niceCeiling(Math.max(stats.max, ...references.map((reference) => reference.value)));
  const yOf = (value: number) => VIEW_H - (Math.max(0, value) / top) * VIEW_H;
  const xOf = (index: number) => (index / (points.length - 1)) * VIEW_W;
  const pct = (index: number) => (index / (points.length - 1)) * 100;

  const area = svgId(reactId, 'area');
  const line = svgId(reactId, 'line');
  const segments = runs(points);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) => share * top);
  const tickLabel = formatTick ?? formatTime;
  const xTicks = Array.from({ length: X_TICKS }, (_, step) => Math.round((step / (X_TICKS - 1)) * (points.length - 1)));
  const peakIndex = stats.peak === null ? -1 : points.indexOf(stats.peak);

  const pick = (clientX: number) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (box === undefined || box.width <= 0) return;
    const share = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    setActive(Math.round(share * (points.length - 1)));
  };

  const shown = active === null ? undefined : points[active];
  const spoken = `${label}. ${summary ?? ''} ${references.map((reference) => reference.label).join('. ')}`.trim();

  return (
    <div className="pvs-area" data-spectrum={family} style={{ '--pvs-area-h': `${height}px` } as React.CSSProperties}>
      <div className="pvs-area__y" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className="pvs-area__ytick" style={{ top: `${(yOf(tick) / VIEW_H) * 100}%` }}>
            {format(tick)}
          </span>
        ))}
      </div>
      <div
        ref={plotRef}
        className="pvs-area__plot"
        role="img"
        aria-label={spoken}
        onPointerMove={(event) => pick(event.clientX)}
        onPointerDown={(event) => pick(event.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <svg className="pvs-area__svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={area} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="pvs-sp-area-top" />
              <stop offset="1" className="pvs-sp-area-bottom" />
            </linearGradient>
            <linearGradient id={line} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VIEW_W} y2="0">
              <stop offset="0" className="pvs-sp-stop-from" />
              <stop offset="1" className="pvs-sp-stop-to" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={VIEW_W}
              y1={yOf(tick)}
              y2={yOf(tick)}
              className={tick === 0 ? 'pvs-area__base' : 'pvs-area__grid'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {references.map((reference) => (
            <line
              key={`ref-${reference.label}`}
              x1={0}
              x2={VIEW_W}
              y1={yOf(reference.value)}
              y2={yOf(reference.value)}
              className="pvs-area__ref"
              data-kind={reference.kind ?? 'goal'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {segments.map((run) => {
            const first = run[0] as { index: number; v: number };
            const last = run[run.length - 1] as { index: number; v: number };
            const path = run.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.index).toFixed(1)},${yOf(p.v).toFixed(2)}`).join(' ');
            return (
              <React.Fragment key={first.index}>
                {run.length > 1 && (
                  <path
                    d={`${path} L${xOf(last.index).toFixed(1)},${VIEW_H} L${xOf(first.index).toFixed(1)},${VIEW_H} Z`}
                    fill={`url(#${area})`}
                    stroke="none"
                  />
                )}
                <path d={run.length > 1 ? path : `${path} h0.01`} className="pvs-area__line" stroke={`url(#${line})`} vectorEffect="non-scaling-stroke" />
              </React.Fragment>
            );
          })}
        </svg>
        {references.map((reference) => (
          <span
            key={`ref-label-${reference.label}`}
            className="pvs-area__ref-label"
            data-kind={reference.kind ?? 'goal'}
            style={{ top: `${(yOf(reference.value) / VIEW_H) * 100}%` }}
            aria-hidden="true"
          >
            {reference.label}
          </span>
        ))}
        {peakIndex >= 0 && stats.peak !== null && stats.peak.v !== null && (
          <span
            className="pvs-area__peak"
            data-edge={pct(peakIndex) > 80 ? 'end' : pct(peakIndex) < 20 ? 'start' : undefined}
            style={{ left: `${pct(peakIndex)}%`, top: `${(yOf(stats.peak.v) / VIEW_H) * 100}%` }}
            aria-hidden="true"
          >
            <span className="pvs-area__peak-label">{format(stats.peak.v)}</span>
          </span>
        )}
        {shown !== undefined && active !== null && (
          <>
            <span className="pvs-area__cursor" style={{ left: `${pct(active)}%` }} aria-hidden="true" />
            {shown.v !== null && (
              <span className="pvs-area__dot" style={{ left: `${pct(active)}%`, top: `${(yOf(shown.v) / VIEW_H) * 100}%` }} aria-hidden="true" />
            )}
            <span className="pvs-area__tip" data-edge={pct(active) > 70 ? 'end' : undefined} style={{ left: `${pct(active)}%` }} aria-hidden="true">
              <span className="pvs-area__tip-time">{formatTime(shown.t)}</span>
              <span className="pvs-area__tip-value">{shown.v === null ? '—' : format(shown.v)}</span>
            </span>
          </>
        )}
      </div>
      <div className="pvs-area__x" aria-hidden="true">
        {xTicks.map((index, step) => (
          <span
            key={`${index}-${step}`}
            className="pvs-area__xtick"
            data-align={step === 0 ? 'start' : step === X_TICKS - 1 ? 'end' : undefined}
            style={{ left: `${pct(index)}%` }}
          >
            {tickLabel((points[index] as SeriesPoint).t)}
          </span>
        ))}
      </div>
    </div>
  );
};
