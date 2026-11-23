import React, { useId } from 'react';

import { svgId } from './family';

const W = 120;
const H = 34;
const PAD = 3;

export interface SpectrumSparkProps {
  /** The series behind a number, oldest first. Two points or more, or nothing is drawn. */
  points: readonly number[];
  /** What the line shows, for assistive technology (already translated). Without one it is decoration. */
  label?: string;
}

/**
 * A sparkline with a gradient area in the nearest `data-spectrum` family (3.2.1 `KpiHero`, shared
 * from 3.2.3 by `ValueCard`). The line keeps its width however wide the card gets, and a flat
 * series is drawn through the middle, not along the floor: it is not a zero.
 */
export const SpectrumSpark = ({ points, label }: SpectrumSparkProps) => {
  const id = useId();
  if (points.length < 2) return null;
  const area = svgId(id, 'area');
  const line = svgId(id, 'line');
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const stepX = W / (points.length - 1);
  const y = (value: number) => (span === 0 ? H / 2 : PAD + (H - 2 * PAD) * (1 - (value - min) / span));
  const coords = points.map((value, index) => ({ x: index * stepX, y: y(value) }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1] ?? { x: 0, y: H / 2 };

  return (
    <svg
      className="pvs-kpi__spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    >
      <defs>
        <linearGradient id={area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="pvs-sp-area-top" />
          <stop offset="1" className="pvs-sp-area-bottom" />
        </linearGradient>
        {/* User-space units: a flat line has an empty bounding box, and a bounding-box gradient on it would not paint. */}
        <linearGradient id={line} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
          <stop offset="0" className="pvs-sp-stop-from" />
          <stop offset="1" className="pvs-sp-stop-to" />
        </linearGradient>
      </defs>
      <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#${area})`} stroke="none" />
      <path d={path} className="pvs-kpi__spark-line" stroke={`url(#${line})`} vectorEffect="non-scaling-stroke" />
      <path d={`M${last.x.toFixed(1)},${last.y.toFixed(1)}h0`} className="pvs-kpi__spark-dot" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
