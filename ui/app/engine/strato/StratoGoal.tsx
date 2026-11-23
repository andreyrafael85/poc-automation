import React from 'react';

/**
 * 3.6.0 (v6, the goal bar of wave 2): a value against its review line — a track, the value's fill in its status tone
 * (within the line, up to the attention line, above it) and a mark at the line. The line is the assumptions registry's
 * (a convention of this app, never an agreed target, said so in its label). A value not measured draws nothing (rule 8).
 */
export interface StratoGoalProps {
  value: number | null;
  /** The review line (within it is good). */
  line: number;
  /** A second, higher line (above it is critical); optional. */
  attention?: number;
  /** What the bar measures, for assistive technology. */
  name: string;
  /** The text read aloud and shown under the bar ("1 % line (convention)"). */
  lineLabel: string;
}

export type GoalTone = 'good' | 'warning' | 'critical';

/** The tone of a value against its lines. */
export function goalTone(value: number, line: number, attention?: number): GoalTone {
  if (value <= line) return 'good';
  if (attention === undefined || value <= attention) return 'warning';
  return 'critical';
}

/** The bar's scale: the larger of the value and the top line, with room above. */
export function goalScale(value: number, line: number, attention?: number): number {
  return Math.max(value, attention ?? line * 2) * 1.1;
}

export const StratoGoal = ({ value, line, attention, name, lineLabel }: StratoGoalProps) => {
  if (value === null || !Number.isFinite(value) || !(line > 0)) return null;
  const scale = goalScale(value, line, attention);
  const pct = (part: number) => `${Math.min(100, Math.max(0, (part / scale) * 100)).toFixed(2)}%`;
  const tone = goalTone(value, line, attention);
  return (
    <div className="pvs-sgoal" role="img" aria-label={`${name}: ${lineLabel}`} data-pvs-chart="goal" data-tone={tone}>
      <div className="pvs-sgoal__track">
        <span className="pvs-sgoal__fill" style={{ width: pct(value) }} />
        <span className="pvs-sgoal__line" style={{ left: pct(line) }} />
      </div>
      <span className="pvs-sgoal__label" aria-hidden="true">
        {lineLabel}
      </span>
    </div>
  );
};
