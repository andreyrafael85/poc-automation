import React from 'react';

import { useStratoMode } from './mode';
import { filledTicks } from './StratoTicks';

/**
 * 3.6.2 (v6; the owner: "os gauges serão reestilizados também … o atual está bem antigo, seja na Visão geral na parte
 * superior e outros que são iguais") — a share drawn as an arc of segments, the language of the v6 tick bars bent into
 * a dial: as many segments lit as the share rounds to (at least one for any share above zero, all only at the whole),
 * the rest a quiet track. Drawn by the app in SVG, so it prints and photographs exactly as on screen (the platform's
 * GaugeChart sized its centre from a screen measure). The reading is the caller's text over the arc; the arc itself is
 * decorative to assistive technology (the caller speaks the reading). On screen the lit segments come in once, one after
 * the other; never under reduced motion, in print or in a capture.
 */

export const ARC_SEGMENTS = 30;
const SWEEP = 240;
const START = 210; // degrees, counter-clockwise from 3 o'clock; the arc runs clockwise to -30°.
const GAP = 2.6;
const CX = 100;
const CY = 96;
const R = 78;
const WIDTH = 13;

const point = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return { x: CX + R * Math.cos(radians), y: CY - R * Math.sin(radians) };
};

/** The path of segment `index` of `count`, clockwise from the left end. Pure. */
export function segmentPath(index: number, count = ARC_SEGMENTS): string {
  const step = SWEEP / count;
  const from = START - index * step - GAP / 2;
  const to = START - (index + 1) * step + GAP / 2;
  const a = point(from);
  const b = point(to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export interface StratoArcProps {
  /** The share, 0–100. */
  value: number;
  color?: string;
  /** Lower bounds of coloured bands (a segment takes the band its middle falls in), e.g. status zones. */
  bands?: readonly { value: number; color: string }[];
  segments?: number;
}

export const StratoArc = ({ value, color = 'var(--dt-colors-charts-categorical-vivid-color-01-default)', bands, segments = ARC_SEGMENTS }: StratoArcProps) => {
  const animate = useStratoMode() === 'screen';
  const lit = filledTicks(Math.max(0, Math.min(100, value)), 100, segments);
  const colourAt = (index: number) => {
    if (bands === undefined || bands.length === 0) return color;
    const middle = ((index + 0.5) / segments) * 100;
    return [...bands].sort((a, b) => a.value - b.value).filter((band) => band.value <= middle).pop()?.color ?? color;
  };
  return (
    <svg className="pvs-sarc" viewBox="0 0 200 150" aria-hidden="true" focusable="false" data-pvs-arc={lit} data-animate={animate ? 'true' : undefined}>
      {Array.from({ length: segments }, (_, index) => (
        <path
          key={index}
          className="pvs-sarc__seg"
          d={segmentPath(index, segments)}
          strokeWidth={WIDTH}
          data-on={index < lit ? 'true' : 'false'}
          style={(index < lit ? { stroke: colourAt(index), '--pvs-seg': index } : undefined) as React.CSSProperties | undefined}
        />
      ))}
    </svg>
  );
};
