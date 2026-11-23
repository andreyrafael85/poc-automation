import React, { useState } from 'react';

import './chart.css';

export interface RadialBar {
  key: string;
  /** The axis name, on one line. */
  label: string;
  /** 0–100; null = not read (a dashed track, never a zero). */
  value: number | null;
  /** The value as printed ("100%"), on the second line with `band`. */
  display: string;
  /** The word the value is read with ("Excellent"), already translated. */
  band?: string;
  /** The spectrum family of the axis: its bar and its outer arc. */
  family: 'blue' | 'purple' | 'orange' | 'turquoise' | 'pink-purple' | 'moss' | 'blue-turquoise';
}

export interface RadialBarsProps {
  bars: readonly RadialBar[];
  ariaLabel: string;
  /** The figure in the centre (the index) and its two lines of words. */
  centre?: { value: string; label: string; band?: string };
  /** "Rings at 25, 50, 75 and 100", already translated. */
  ringsLabel?: string;
}

const W = 900;
const H = 640;
const CX = W / 2;
const CY = H / 2;
const R0 = 88;
const R = 210;
const ARC = R + 14;
const LABEL_R = R + 46;
const GAP = 0.08; // radians between sectors
/** The bar takes this share of its sector's angle, so each reads as a bar on its own track, never a pie slice. */
const BAR_SHARE = 0.56;

const polar = (radius: number, angle: number) => ({ x: CX + radius * Math.sin(angle), y: CY - radius * Math.cos(angle) });

/** A ring sector (annular wedge) from `r1` to `r2`, between two angles (clockwise from 12 o'clock). */
const wedge = (r1: number, r2: number, a1: number, a2: number) => {
  const large = a2 - a1 > Math.PI ? 1 : 0;
  const p1 = polar(r2, a1);
  const p2 = polar(r2, a2);
  const p3 = polar(r1, a2);
  const p4 = polar(r1, a1);
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${r2},${r2} 0 ${large} 1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)} L${p3.x.toFixed(1)},${p3.y.toFixed(1)} A${r1},${r1} 0 ${large} 0 ${p4.x.toFixed(1)},${p4.y.toFixed(1)} Z`;
};

const arc = (radius: number, a1: number, a2: number) => {
  const large = a2 - a1 > Math.PI ? 1 : 0;
  const p1 = polar(radius, a1);
  const p2 = polar(radius, a2);
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${radius},${radius} 0 ${large} 1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
};

/**
 * Coverage by domain as radial bars (3.4.10, the owner's reference images): one sector per domain, its bar growing
 * from the centre to its share (rings at 25, 50, 75 and 100 %), the domain's hue on the bar and on an arc at the
 * rim, the index in the centre. Each label keeps its two lines whole — the name, then "100% · Excellent" — so a
 * name never breaks. A domain not read keeps a dashed track and says so, never a zero. Hovering a sector lifts it
 * and quiets the others; the figures are in a table for assistive technology and keyboard readers, so the sectors
 * stay out of the tab order (a focusable group with no name nor indicator fails the keyboard check).
 */
export const RadialBars = ({ bars, ariaLabel, centre, ringsLabel }: RadialBarsProps) => {
  const [active, setActive] = useState<string | null>(null);
  if (bars.length === 0) return null;
  const step = (2 * Math.PI) / bars.length;
  return (
    <figure className="pvs-rbars" data-active={active === null ? undefined : 'true'}>
      <svg viewBox={`0 0 ${W} ${H}`} className="pvs-rbars__svg" role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
        {[25, 50, 75, 100].map((ring) => (
          <circle key={ring} className="pvs-rbars__ring" data-full={ring === 100 ? 'true' : undefined} cx={CX} cy={CY} r={R0 + ((R - R0) * ring) / 100} />
        ))}
        {bars.map((bar, index) => {
          const a1 = index * step - step / 2 + GAP / 2;
          const a2 = index * step + step / 2 - GAP / 2;
          const mid = index * step;
          const value = bar.value === null ? null : Math.max(0, Math.min(100, bar.value));
          const outer = value === null ? R0 : R0 + ((R - R0) * value) / 100;
          const half = ((a2 - a1) * BAR_SHARE) / 2;
          const label = polar(LABEL_R, mid);
          const tick = polar(ARC + 6, mid);
          const elbow = polar(LABEL_R - 12, mid);
          const sin = Math.sin(mid);
          const anchor = Math.abs(sin) < 0.25 ? 'middle' : sin > 0 ? 'start' : 'end';
          const top = Math.cos(mid) > 0.5;
          const bottom = Math.cos(mid) < -0.5;
          const dyName = top ? -26 : bottom ? 14 : -6;
          return (
            <g
              key={bar.key}
              className="pvs-rbars__sector"
              data-spectrum={bar.family}
              data-active={active === bar.key ? 'true' : undefined}
              data-unread={value === null ? 'true' : undefined}
              onMouseEnter={() => setActive(bar.key)}
            >
              <title>{`${bar.label}: ${bar.display}${bar.band === undefined ? '' : ` · ${bar.band}`}`}</title>
              <path className="pvs-rbars__track" d={wedge(R0, R, a1, a2)} />
              {value !== null && value > 0 && <path className="pvs-rbars__bar" d={wedge(R0 + 4, outer, mid - half, mid + half)} />}
              <path className="pvs-rbars__rim" d={arc(ARC, a1, a2)} />
              <polyline className="pvs-rbars__leader" points={`${tick.x.toFixed(1)},${tick.y.toFixed(1)} ${elbow.x.toFixed(1)},${elbow.y.toFixed(1)}`} />
              <text className="pvs-rbars__name" x={label.x} y={label.y + dyName} textAnchor={anchor}>
                {bar.label}
              </text>
              <text className="pvs-rbars__value" x={label.x} y={label.y + dyName + 23} textAnchor={anchor}>
                <tspan className="pvs-rbars__pct">{bar.display}</tspan>
                {bar.band !== undefined && <tspan className="pvs-rbars__band">{`  ${bar.band}`}</tspan>}
              </text>
            </g>
          );
        })}
        <circle className="pvs-rbars__hub" cx={CX} cy={CY} r={R0 - 6} />
        {centre !== undefined && (
          <g className="pvs-rbars__centre">
            <text x={CX} y={CY - 22} textAnchor="middle" className="pvs-rbars__centre-label">
              {centre.label}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" className="pvs-rbars__centre-value">
              {centre.value}
            </text>
            {centre.band !== undefined && (
              <text x={CX} y={CY + 38} textAnchor="middle" className="pvs-rbars__centre-band">
                {centre.band}
              </text>
            )}
          </g>
        )}
      </svg>
      {ringsLabel !== undefined && <figcaption className="pvs-rbars__rings-label">{ringsLabel}</figcaption>}
      <div className="pvs-sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.key}>
                <th scope="row">{bar.label}</th>
                <td>{`${bar.display}${bar.band === undefined ? '' : ` · ${bar.band}`}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
