import React, { useId } from 'react';

import { HealthIndicator } from '@dynatrace/strato-components/content';
import { Text } from '@dynatrace/strato-components/typography';

import { svgId, type SpectrumFamily } from './family';

/** The five status rungs, worst first. A radar of statuses is ordinal: it never shows a score. */
export type RadarStatus = 'critical' | 'warning' | 'neutral' | 'good' | 'ideal';
const RUNG: Record<RadarStatus, number> = { critical: 1, warning: 2, neutral: 3, good: 4, ideal: 5 };
const RUNGS = 5;

export interface RadarAxis {
  id: string;
  /** The dimension's name (already translated). */
  label: string;
  /** `null` for a dimension whose source did not answer: no point is drawn for it. */
  status: RadarStatus | null;
  /** The status word, or "Not read" (already translated). */
  statusLabel: string;
}

export interface StatusRadarProps {
  axes: readonly RadarAxis[];
  /** The rung names, worst first: critical, warning, neutral, good, ideal (already translated). */
  rungLabels: readonly [string, string, string, string, string];
  /** What the chart shows (already translated). */
  label: string;
  family?: SpectrumFamily;
}

const CX = 180;
const CY = 170;
const R = 128;

const point = (index: number, count: number, radius: number) => {
  const angle = ((index / count) * 360 - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle), cos: Math.cos(angle) };
};

/** Splits a long name over two lines at the space nearest its middle. */
function lines(label: string): string[] {
  if (label.length <= 14 || !label.includes(' ')) return [label];
  const middle = label.length / 2;
  let best = -1;
  for (let index = label.indexOf(' '); index !== -1; index = label.indexOf(' ', index + 1)) {
    if (best === -1 || Math.abs(index - middle) < Math.abs(best - middle)) best = index;
  }
  return [label.slice(0, best), label.slice(best + 1)];
}

/**
 * A status profile: one axis per dimension, each placed on the rung of its status, beside the
 * same dimensions ranked worst first (3.2 "Value Spectrum", wave 3).
 *
 * The scale is ordinal and labelled with the status words, because the scorecard deliberately
 * has no scores: a percentage per dimension would be a number nobody measured. A dimension that
 * could not be read gets no point, and the ranking says "Not read" for it.
 */
export const StatusRadar = ({ axes, rungLabels, label, family = 'blue-turquoise' }: StatusRadarProps) => {
  const glow = svgId(useId(), 'radar');
  const count = axes.length;
  if (count < 3) return null;

  const measured = axes
    .map((axis, index) => ({ axis, index }))
    .filter((entry): entry is { axis: RadarAxis & { status: RadarStatus }; index: number } => entry.axis.status !== null);
  const polygon = measured
    .map(({ axis, index }) => point(index, count, (R * RUNG[axis.status]) / RUNGS))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const ranked = [...axes].sort((a, b) => (a.status === null ? 0 : RUNG[a.status]) - (b.status === null ? 0 : RUNG[b.status]));

  return (
    <div className="pvs-radar pvs-status-radar" data-spectrum={family}>
      <svg className="pvs-radar__svg" viewBox="-110 0 580 350" role="img" aria-label={label}>
        <defs>
          <radialGradient id={glow} cx="0.5" cy="0.5" r="0.6">
            <stop offset="0" className="pvs-sp-glow-centre" />
            <stop offset="1" className="pvs-sp-glow-edge" />
          </radialGradient>
        </defs>
        {Array.from({ length: RUNGS }, (_, rung) => (
          <polygon
            key={rung}
            className="pvs-radar__ring"
            points={axes
              .map((_, index) => point(index, count, (R * (rung + 1)) / RUNGS))
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ')}
          />
        ))}
        {rungLabels.map((rung, index) => {
          // 3.5.2: along the bisector of the first two axes, so a rung name never sits on an axis label.
          const at = point(0.5, count, (R * (index + 1)) / RUNGS);
          return (
            <text key={rung} x={(at.x + 4).toFixed(1)} y={(at.y + 3).toFixed(1)} className="pvs-radar__value" aria-hidden="true">
              {rung}
            </text>
          );
        })}
        {axes.map((axis, index) => {
          const end = point(index, count, R);
          const at = point(index, count, R + 16);
          const anchor = Math.abs(at.cos) < 0.2 ? 'middle' : at.cos > 0 ? 'start' : 'end';
          const parts = lines(axis.label);
          return (
            <g key={axis.id} aria-hidden="true">
              <line
                x1={CX}
                y1={CY}
                x2={end.x.toFixed(1)}
                y2={end.y.toFixed(1)}
                className="pvs-radar__axis"
                strokeDasharray={axis.status === null ? '3 4' : undefined}
              />
              <text x={at.x.toFixed(1)} y={(at.y - (parts.length - 1) * 6).toFixed(1)} textAnchor={anchor} className="pvs-radar__label">
                {parts.map((part, line) => (
                  <tspan key={line} x={at.x.toFixed(1)} dy={line === 0 ? 0 : 13}>
                    {part}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        {measured.length >= 3 && <polygon points={polygon} className="pvs-radar__area" fill={`url(#${glow})`} />}
        {measured.map(({ axis, index }) => {
          const p = point(index, count, (R * RUNG[axis.status]) / RUNGS);
          return <circle key={axis.id} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={5.5} className="pvs-radar__dot" data-status={axis.status} />;
        })}
      </svg>

      <ol className="pvs-rank">
        {ranked.map((axis) => (
          <li key={axis.id} className="pvs-rank__row" data-missing={axis.status === null ? 'true' : undefined} data-status={axis.status ?? undefined}>
            <Text>{axis.label}</Text>
            <span className="pvs-rank__track" aria-hidden="true">
              {axis.status !== null && <span className="pvs-rank__fill" style={{ display: 'block', width: `${(RUNG[axis.status] / RUNGS) * 100}%` }} />}
            </span>
            {/* 3.5.2: the rung as "n/5" — the position on the ordinal scale, never a percentage nobody measured. */}
            <span className="pvs-rank__value" aria-hidden="true">
              {axis.status === null ? '—' : `${RUNG[axis.status]}/${RUNGS}`}
            </span>
            <span className="pvs-cluster" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)', '--pvs-justify': 'flex-end' } as React.CSSProperties}>
              <HealthIndicator status={axis.status ?? 'neutral'} aria-hidden="true" />
              <Text>{axis.statusLabel}</Text>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
