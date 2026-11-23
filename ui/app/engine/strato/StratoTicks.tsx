import React from 'react';

/**
 * 3.5.9 (v6, wave 2): "x of y" as segment bars — a row of small ticks, as many filled as the share of `value` in `max`
 * rounds to. A mark inside a `StratoKpi`, like `StratoMeter`: the card writes the figures; the ticks are read aloud
 * once ("1,435 of 1,474"). A share that is not measured draws nothing (rule 8).
 */
export interface StratoTicksProps {
  value: number | null;
  max: number | null;
  /** What the ticks count, for assistive technology ("Problems closed"). */
  name: string;
  /** The text read aloud ("1,435 of 1,474"). */
  reading: string;
  ticks?: number;
  color?: string;
}

/** How many of `ticks` are filled for `value` of `max`: at least one for any positive value, all only at the whole. */
export function filledTicks(value: number, max: number, ticks: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  if (value >= max) return ticks;
  return Math.min(ticks - 1, Math.max(1, Math.round((value / max) * ticks)));
}

export const StratoTicks = ({ value, max, name, reading, ticks = 24, color }: StratoTicksProps) => {
  if (value === null || max === null || !(max > 0)) return null;
  const on = filledTicks(value, max, ticks);
  return (
    <div
      className="pvs-sticks"
      role="img"
      aria-label={`${name}: ${reading}`}
      data-pvs-chart="ticks"
      style={{ '--pvs-ticks': ticks, ...(color === undefined ? {} : { '--pvs-ticks-color': color }) } as React.CSSProperties}
    >
      {Array.from({ length: ticks }, (_, index) => (
        <span key={index} className="pvs-sticks__tick" data-on={index < on ? 'true' : 'false'} />
      ))}
    </div>
  );
};
