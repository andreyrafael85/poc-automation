import React from 'react';

import type { Tone } from '../../design/palette';
import { TONE } from '../../engine';

interface SparklineProps {
  /** The series to draw, oldest → newest. Needs at least two points. */
  points: number[];
  /** Informational by default. Direction is context, never a verdict. */
  tone?: Tone;
  width?: number;
  height?: number;
  /** Accessible description (already translated). */
  ariaLabel?: string;
}

/**
 * A micro-trend — a tiny, axis-less line over the last few readings.
 *
 * Decoration that carries *direction*, never a verdict: min–max normalised so the
 * shape reads even for flat series, with a soft area fill and a dot on the latest
 * point. It states nothing a `Fact` does not already; it only shows which way the
 * number is going. Without an `ariaLabel` it is hidden from assistive technology
 * rather than announced as an unnamed image.
 */
export const Sparkline = ({ points, tone = 'primary', width = 104, height = 26, ariaLabel }: SparklineProps) => {
  if (points.length < 2) return null;

  const padY = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((value, index) => ({
    x: index * stepX,
    y: padY + (height - 2 * padY) * (1 - (value - min) / span),
  }));

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;
  const color = TONE[tone].borderAccent;
  const last = coords[coords.length - 1]!;

  return (
    <svg
      className="pvs-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel === undefined ? undefined : 'img'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined ? true : undefined}
    >
      <path d={area} fill={`color-mix(in srgb, ${color} 14%, transparent)`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.4} fill={color} />
    </svg>
  );
};
