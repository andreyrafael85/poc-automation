import React from 'react';

import './chart.css';

export interface HourHeatmapProps {
  /** Weekday (0 = Sunday … 6 = Saturday) × hour (0–23) → count. */
  grid: readonly (readonly number[])[];
  /** The weekday names, Sunday first, already translated. */
  weekdays: readonly string[];
  caption: string;
  /** "{count} actions on {weekday} at {hour}h", already translated by the caller. */
  cellLabel: (count: number, weekday: string, hour: number) => string;
  /** The words at the ends of the legend ("less", "more"). */
  legend: { less: string; more: string };
}

/** Monday first, as a working week reads. */
const ROW_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * When the platform is used (3.4.7, Platform adoption): weekdays × hours of the day as a heat map, one hue from
 * light to dark by the count (a sequential scale, never a rainbow), an hour without activity left neutral. Every
 * cell names its count, weekday and hour on hover, and a table for assistive technology lists every hour with
 * activity, so the colour never carries the number alone.
 */
export const HourHeatmap = ({ grid, weekdays, caption, cellLabel, legend }: HourHeatmapProps) => {
  const max = Math.max(1, ...grid.flat());
  // 3.7.5 (v6): the busiest hour is outlined in the menu's turquoise over neutral tones (as the problem calendar).
  const peak = Math.max(0, ...grid.flat());
  return (
    <div className="pvs-whenmap-wrap">
      {/* The grid is drawn for the eye; the same counts are in the table below for assistive technology. */}
      <table className="pvs-whenmap" aria-hidden="true">
        <thead>
          <tr>
            <th scope="col" className="pvs-whenmap__corner" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th key={hour} scope="col" className="pvs-whenmap__hour">
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_ORDER.map((weekday) => (
            <tr key={weekday}>
              <th scope="row" className="pvs-whenmap__day">
                {weekdays[weekday]}
              </th>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = grid[weekday]?.[hour] ?? 0;
                const label = cellLabel(count, weekdays[weekday] ?? '', hour);
                return (
                  <td
                    key={hour}
                    className="pvs-whenmap__cell"
                    data-empty={count === 0 ? 'true' : undefined}
                    data-peak={peak > 0 && count === peak ? 'true' : undefined}
                    style={{ '--pvs-heat': (count / max).toFixed(3) } as React.CSSProperties}
                    title={label}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pvs-sr-only">
        <table>
          <caption>{caption}</caption>
          <tbody>
            {ROW_ORDER.map((weekday) => (
              <tr key={weekday}>
                <th scope="row">{weekdays[weekday]}</th>
                <td>
                  {(grid[weekday] ?? [])
                    .map((count, hour) => ({ count, hour }))
                    .filter((cell) => cell.count > 0)
                    .map((cell) => cellLabel(cell.count, weekdays[weekday] ?? '', cell.hour))
                    .join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pvs-whenmap__legend" aria-hidden="true">
        <span>{legend.less}</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((step) => (
          <span key={step} className="pvs-whenmap__swatch" style={{ '--pvs-heat': String(step) } as React.CSSProperties} />
        ))}
        <span>{legend.more}</span>
      </div>
    </div>
  );
};
