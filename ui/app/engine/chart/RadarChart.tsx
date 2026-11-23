import React from 'react';

import './chart.css';

export interface RadarAxis {
  key: string;
  label: string;
  /** 0–100; null = not read (drawn as a hollow mark at the centre, never as a zero). */
  value: number | null;
  /** The value as printed ("82%", "not read"). */
  display: string;
}

const SIZE = 480;
const CENTRE = SIZE / 2;
const RADIUS = 140;
const RINGS = [20, 40, 60, 80, 100];

/** Where an axis label sits: just outside the 100 % ring. */
const labelPoint = (angle: number) => ({ x: CENTRE + (RADIUS + 22) * Math.sin(angle), y: CENTRE - (RADIUS + 22) * Math.cos(angle) });

/** Breaks a long label into lines of about `width` characters at spaces, so a side label never runs into the page beside the chart. */
export const wrapLabel = (label: string, width = 14): string[] => {
  const lines: string[] = [];
  for (const word of label.split(' ')) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + ' ' + word).length <= width) lines[last] = `${lines[last]} ${word}`;
    else lines.push(word);
  }
  return lines;
};

const point = (angle: number, value: number) => {
  const r = (Math.max(0, Math.min(100, value)) / 100) * RADIUS;
  return { x: CENTRE + r * Math.sin(angle), y: CENTRE - r * Math.cos(angle) };
};

/**
 * A radar of measured shares (3.4.3, the owner's "Coverage by capability" example): one spoke per axis,
 * rings every 20 %, the polygon joining only what was measured. An axis not read keeps its spoke dashed
 * and a hollow mark, so a gap never draws as a dip to zero. The figures are also in a table for assistive
 * technology and on the axis labels, so the shape never carries a number alone.
 */
export const RadarChart = ({ axes, ariaLabel }: { axes: readonly RadarAxis[]; ariaLabel: string }) => {
  if (axes.length < 3) return null;
  const step = (2 * Math.PI) / axes.length;
  const measured = axes
    .map((axis, index) => ({ axis, angle: index * step }))
    .filter((entry): entry is { axis: RadarAxis & { value: number }; angle: number } => entry.axis.value !== null);
  const polygon = measured.map(({ axis, angle }) => point(angle, axis.value)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <figure className="pvs-radar">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel} className="pvs-radar__svg">
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            className="pvs-radar__ring"
            points={axes
              .map((_, index) => point(index * step, ring))
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ')}
          />
        ))}
        {axes.map((axis, index) => {
          const end = point(index * step, 100);
          return <line key={axis.key} className="pvs-radar__spoke" data-unread={axis.value === null ? 'true' : undefined} x1={CENTRE} y1={CENTRE} x2={end.x} y2={end.y} />;
        })}
        {measured.length >= 3 && <polygon className="pvs-radar__area" points={polygon} />}
        {axes.map((axis, index) => {
          const p = point(index * step, axis.value ?? 0);
          return <circle key={axis.key} className="pvs-radar__mark" data-unread={axis.value === null ? 'true' : undefined} cx={p.x} cy={p.y} r={5} />;
        })}
        {axes.map((axis, index) => {
          const angle = index * step;
          const p = labelPoint(angle);
          const anchor = Math.abs(Math.sin(angle)) < 0.2 ? 'middle' : Math.sin(angle) > 0 ? 'start' : 'end';
          return (
            <text key={axis.key} className="pvs-radar__label" x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle">
              {wrapLabel(axis.label).map((line, row, lines) => (
                <tspan key={row} x={p.x} dy={row === 0 ? `${(Math.cos(angle) < -0.5 ? -0.2 : -0.6 - (lines.length - 1) * 1.1).toFixed(1)}em` : '1.1em'}>
                  {line}
                </tspan>
              ))}
              <tspan x={p.x} dy="1.2em" className="pvs-radar__value">
                {axis.display}
              </tspan>
            </text>
          );
        })}
      </svg>
      <table className="pvs-sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {axes.map((axis) => (
            <tr key={axis.key}>
              <th scope="row">{axis.label}</th>
              <td>{axis.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
