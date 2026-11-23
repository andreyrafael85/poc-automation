import React from 'react';

import { decimal } from '../../utils/activeLocale';

/**
 * 3.7.5 (v6, wave 4 — the honeycombs): a status hex map as the v6 reference dashboards draw one. Every item is one small
 * hexagon in its class's status colour, the classes laid out one after the other in the order given (the ones that call
 * for action first), so each class reads as a block of its own; a thin gap in the surface colour keeps the hexagons apart.
 * Beside it the legend is a short table — the class, how many, its share as ten micro-blocks and the percentage — so the
 * colour never carries the count alone. Drawn by the app in SVG: it scales with its block, prints as it is and needs no
 * measured width. Each hexagon names its item and class on hover; the counts are text in the legend for assistive
 * technology, and the whole map has one label.
 */
export interface HexClass<K extends string> {
  key: K;
  label: string;
  color: string;
}

export interface StatusHexMapProps<K extends string> {
  items: readonly { name: string; cls: K }[];
  classes: readonly HexClass<K>[];
  ariaLabel: string;
  /** Column headers of the legend: the class, the count and the share. */
  heads: { cls: string; count: string; share: string };
  /** Hexagons per row; the map wraps after it. */
  columns?: number;
}

/** The hexagons never grow past this scale of their drawn size, however wide the column (a few services stay small). */
export const HEX_MAX_SCALE = 1.5;

/** Ten micro-blocks per share, as the v6 donut legend. */
export const HEX_SHARE_BLOCKS = 10;

/** The lit micro-blocks for a share: at least one above zero, all ten only at the whole. */
export function shareBlocks(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  if (count >= total) return HEX_SHARE_BLOCKS;
  return Math.min(HEX_SHARE_BLOCKS - 1, Math.max(1, Math.round((count / total) * HEX_SHARE_BLOCKS)));
}

/** The items in the class order (unknown classes dropped), each with its row and column. Pure. */
export function hexLayout<K extends string>(items: readonly { name: string; cls: K }[], order: readonly K[], columns: number) {
  const sorted = order.flatMap((cls) => items.filter((item) => item.cls === cls));
  return sorted.map((item, index) => ({ ...item, row: Math.floor(index / columns), col: index % columns }));
}

const R = 10; // the hexagon's radius (pointy top)
const W = Math.sqrt(3) * R; // its width
const STEP_Y = 1.5 * R;

function hexPoints(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + (R - 1) * Math.cos(angle)).toFixed(2)},${(cy + (R - 1) * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

export function StatusHexMap<K extends string>({ items, classes, ariaLabel, heads, columns = 16 }: StatusHexMapProps<K>) {
  const order = classes.map((cls) => cls.key);
  const colorOf = new Map(classes.map((cls) => [cls.key, cls.color]));
  const labelOf = new Map(classes.map((cls) => [cls.key, cls.label]));
  const placed = hexLayout(items, order, columns);
  const rows = placed.length === 0 ? 0 : (placed[placed.length - 1]?.row ?? 0) + 1;
  const cols = Math.min(columns, Math.max(1, placed.length));
  const width = cols * W + W / 2 + 2;
  const height = rows === 0 ? 0 : (rows - 1) * STEP_Y + 2 * R + 2;
  const total = placed.length;
  const counts = classes.map((cls) => ({ ...cls, count: items.filter((item) => item.cls === cls.key).length })).filter((cls) => cls.count > 0);

  return (
    <div className="pvs-hexmap" data-pvs-chart="status-hex-map" role="group" aria-label={ariaLabel}>
      <svg
        className="pvs-hexmap__svg"
        style={{ maxWidth: `${Math.round(width * HEX_MAX_SCALE)}px` }}
        viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`} aria-hidden="true" preserveAspectRatio="xMinYMin meet">
        {placed.map((hex, index) => {
          const cx = 1 + W / 2 + hex.col * W + (hex.row % 2 === 1 ? W / 2 : 0);
          const cy = 1 + R + hex.row * STEP_Y;
          return (
            <polygon key={`${hex.name}-${index}`} className="pvs-hexmap__hex" points={hexPoints(cx, cy)} style={{ fill: colorOf.get(hex.cls) }} data-class={hex.cls}>
              <title>{`${hex.name} · ${labelOf.get(hex.cls) ?? ''}`}</title>
            </polygon>
          );
        })}
      </svg>
      <table className="pvs-hexmap__legend">
        <thead>
          <tr>
            <th scope="col">{heads.cls}</th>
            <th scope="col" className="pvs-hexmap__num">
              {heads.count}
            </th>
            <th scope="col">{heads.share}</th>
            <th scope="col" className="pvs-hexmap__num">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {counts.map((cls) => {
            const lit = shareBlocks(cls.count, total);
            return (
              <tr key={cls.key} data-class={cls.key}>
                <th scope="row">
                  <span className="pvs-hexmap__dot" style={{ background: cls.color }} aria-hidden="true" />
                  {cls.label}
                </th>
                <td className="pvs-hexmap__num">{decimal(cls.count, 0)}</td>
                <td>
                  <span className="pvs-hexmap__blocks" aria-hidden="true">
                    {Array.from({ length: HEX_SHARE_BLOCKS }, (_, i) => (
                      <span key={i} className="pvs-hexmap__block" data-on={i < lit ? 'true' : undefined} style={i < lit ? { background: cls.color } : undefined} />
                    ))}
                  </span>
                </td>
                <td className="pvs-hexmap__num">{total === 0 ? '—' : `${decimal((cls.count / total) * 100, 0)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
