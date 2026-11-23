import React from 'react';

import type { ArrivalCalendar } from '../../models/problemTimeline';
import type { SpectrumFamily } from './family';

export interface HeatCalendarProps {
  calendar: ArrivalCalendar;
  /** The table's caption: what is counted, over which run (already translated). */
  caption: string;
  /** Header of the day column (already translated). */
  dayHeader: string;
  /** Header of the per-day total column (already translated). */
  totalHeader: string;
  /** "Sat 27/09" for a local midnight. */
  dayLabel: (ms: number) => string;
  /** "03h–09h" for a local start hour. */
  periodLabel: (hour: number) => string;
  /** Tooltip and accessible text of one cell (already translated). */
  cellLabel: (day: string, period: string, count: number) => string;
  /** Shown in a period outside the run (first/last day): not a zero, nothing was asked. */
  outsideLabel: string;
  legendLow: string;
  legendHigh: string;
  /** Formats a count for the locale. */
  format: (value: number) => string;
  family?: SpectrumFamily;
}

/**
 * When problems start, as a calendar (3.2.2): a row per day, a column per six-hour period in the
 * viewer's time zone, the count printed in every cell over a wash as strong as the count is against
 * the busiest cell, and each day's total with a bar. It replaces the 3.2.1 strip of 28 unlabelled
 * cells, which showed rhythm but not where or how much.
 *
 * It is a real table: a screen reader walks it by day and period, and the numbers are text, never
 * only colour. The wash is a solid colour mixed in CSS (no image), so the harness measures the
 * contrast of every number; the family and the 55 % ceiling keep it at 4.5:1 or better in all four
 * Strato themes.
 */
export const HeatCalendar = ({
  calendar,
  caption,
  dayHeader,
  totalHeader,
  dayLabel,
  periodLabel,
  cellLabel,
  outsideLabel,
  legendLow,
  legendHigh,
  format,
  family = 'pink-purple',
}: HeatCalendarProps) => {
  const busiestTotal = Math.max(0, ...calendar.days.map((day) => day.total));
  return (
    <div className="pvs-stack" style={{ '--pvs-gap': 'var(--pvs-gap-tight)' } as React.CSSProperties} data-spectrum={family}>
      <div className="pvs-heatcal__scroll">
        <table className="pvs-heatcal">
          <caption className="pvs-sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{dayHeader}</th>
              {calendar.periods.map((hour) => (
                <th key={hour} scope="col">
                  {periodLabel(hour)}
                </th>
              ))}
              <th scope="col">{totalHeader}</th>
            </tr>
          </thead>
          <tbody>
            {calendar.days.map((day) => {
              const name = dayLabel(day.date);
              const isBusiest = calendar.busiestDay !== null && day.date === calendar.busiestDay.date;
              return (
                <tr key={day.date} data-busiest={isBusiest ? 'true' : undefined}>
                  <th scope="row">{name}</th>
                  {day.cells.map((bin, index) => {
                    const hour = calendar.periods[index] as number;
                    if (bin === null) {
                      return (
                        <td key={hour} className="pvs-heatcal__out" title={outsideLabel}>
                          <span aria-hidden="true">·</span>
                          <span className="pvs-sr-only">{outsideLabel}</span>
                        </td>
                      );
                    }
                    const level = calendar.max > 0 ? bin.count / calendar.max : 0;
                    const label = cellLabel(name, periodLabel(hour), bin.count);
                    return (
                      <td
                        key={hour}
                        className="pvs-heatcal__cell"
                        data-peak={calendar.peak !== null && bin.start === calendar.peak.start ? 'true' : undefined}
                        title={label}
                        style={{ '--pvs-heat': level.toFixed(3) } as React.CSSProperties}
                      >
                        {format(bin.count)}
                      </td>
                    );
                  })}
                  <td className="pvs-heatcal__total">
                    <span className="pvs-heatcal__bar" aria-hidden="true">
                      <span style={{ width: `${busiestTotal > 0 ? (day.total / busiestTotal) * 100 : 0}%` }} />
                    </span>
                    <span className="pvs-heatcal__sum">{format(day.total)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pvs-heatcal__legend" aria-hidden="true">
        <span>{legendLow}</span>
        <span className="pvs-heatcal__ramp" />
        <span>{legendHigh}</span>
      </div>
    </div>
  );
};
