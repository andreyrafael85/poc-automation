/**
 * engine/strato (3.4.18) — the platform's own charts behind the app's rules.
 *
 * Pages draw numbers and charts through these wrappers, never `@dynatrace/strato-components/charts` directly: each
 * takes a measured value with its `Fact` (or the rows a query returned), draws the evidence, refuses what rules 7 and
 * 8 forbid (a capped list summed, an absence shown as zero) and switches the platform's interactions off in a capture
 * or a print. Plan: `docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md` §4; guide: `docs/design-guide/01`.
 */

import './strato.css';

export { StratoModeProvider, useInteractive, useStratoMode, type StratoMode } from './mode';
export { StratoKpi, StratoKpiRow, type KpiDelta, type StratoKpiProps } from './StratoKpi';
export { StratoTimeseries, toTimeseries, type StratoSeriesPoint, type StratoTimeseriesProps } from './StratoTimeseries';
export { StratoDonut, type StratoDonutProps, type StratoDonutSlice } from './StratoDonut';
export { STATUS_COLOR, StratoBars, StratoTopList, type StatusTone, type StratoBarRow, type StratoBarsProps } from './StratoBars';
export { ACCENT, allocateTicks, StratoDial, StratoGauge, StratoMeter, StratoSpark, StratoSplit, type StratoGaugeProps, type StratoSplitPart } from './StratoGauge';
export { ARC_SEGMENTS, segmentPath, StratoArc, type StratoArcProps } from './StratoArc';
export { filledTicks, StratoTicks, type StratoTicksProps } from './StratoTicks';
export { goalScale, goalTone, StratoGoal, type GoalTone, type StratoGoalProps } from './StratoGoal';
