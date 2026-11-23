import React from 'react';

import { StratoTimeseries } from '../strato';
import './chart.css';

export interface DailyPoint {
  /** `YYYY-MM-DD`. */
  day: string;
  value: number;
}

export interface DailyLineProps {
  points: readonly DailyPoint[];
  /** The measure's name ("Active users"), already translated; it titles the chart and the table. */
  label: string;
  /** Formats a value for the axis, the peak and the tooltip. */
  format: (value: number) => string;
  /** Formats a day for the axis and the tooltip (short, e.g. "23/10"). */
  formatDay: (day: string) => string;
  /** "Peak: {value} on {day}", already translated by the caller. */
  peakLabel: (value: string, day: string) => string;
  /** The spectrum family of the line. */
  family?: 'blue' | 'turquoise' | 'purple' | 'orange' | 'pink-purple';
  height?: number;
  /** The drawing's own width; 480 when two charts sit side by side (3.4.8), so the text keeps its size. */
  width?: number;
}

/**
 * One measure per day as a line (3.4.7, Platform adoption): a 2 px line over a soft area, weekends shaded so the
 * working rhythm reads at a glance, the peak marked and labelled, three recessive grid lines, and a crosshair with
 * the day's value on hover or focus. Two measures of different scale are never put on two axes: the page draws
 * one chart per measure, stacked on the same days. The values are also in a table for assistive technology.
 */
const DAY_MS = 86_400_000;

export const DailyLine = ({ points, label, format, formatDay, peakLabel, height = 150 }: DailyLineProps) => {
  if (points.length < 2) return null;
  // 3.5.1 (Strato native, wave 3; D-07): the platform's TimeseriesChart, one point a day (UTC days; a day without
  // activity is the zero the query counted). The peak is the app's text above the chart.
  const peakIndex = points.reduce((best, point, index) => (point.value > (points[best]?.value ?? -1) ? index : best), 0);
  const peak = points[peakIndex];
  const series = points.map((point) => {
    const start = Date.parse(`${point.day}T00:00:00Z`);
    return { start, end: start + DAY_MS, value: point.value };
  });
  return (
    <div className="pvs-daily" data-testid="daily-line">
      {peak !== undefined && <p className="pvs-caption pvs-daily__peak">{peakLabel(format(peak.value), formatDay(peak.day))}</p>}
      <StratoTimeseries series={[{ name: label, points: series }]} variant="line" height={Math.max(height, 180)} formatter={format} ariaLabel={label} />
      <div className="pvs-sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {points.map((point) => (
              <tr key={point.day}>
                <th scope="row">{point.day}</th>
                <td>{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
