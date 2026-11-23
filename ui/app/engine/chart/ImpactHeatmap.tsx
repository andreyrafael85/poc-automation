import React from 'react';

import type { MatrixItem, MatrixLevel } from './ImpactEffortMatrix';
import './chart.css';

export type HeatZone = 'quickWins' | 'strategic' | 'fillIns' | 'reconsider' | 'plan';

export interface ImpactHeatmapProps {
  items: readonly MatrixItem[];
  labels: {
    impact: string;
    effort: string;
    level: Record<MatrixLevel, string>;
    /** The name of each zone, already translated. */
    zone: Record<HeatZone, string>;
    /** One line on what to do with a zone ("Do first"), already translated. */
    hint: Record<HeatZone, string>;
    /** "{count} actions" for a cell, already translated by the caller. */
    count: (count: number) => string;
    /** "+{count} more", already translated by the caller. */
    more: (count: number) => string;
    /** The legend under the map, already translated. */
    legend: string;
  };
  caption: string;
}

const IMPACT_ROWS: readonly MatrixLevel[] = ['high', 'medium', 'low'];
const EFFORT_COLS: readonly MatrixLevel[] = ['low', 'medium', 'high'];
const SHOWN = 3;

export const zoneOf = (impact: MatrixLevel, effort: MatrixLevel): HeatZone => {
  if (impact === 'high' && effort === 'low') return 'quickWins';
  if (impact === 'high' && effort === 'high') return 'strategic';
  if (impact === 'low' && effort === 'low') return 'fillIns';
  if (impact === 'low' && effort === 'high') return 'reconsider';
  return 'plan';
};

/**
 * Impact × effort as a heat map (3.4.3, redrawn in 3.4.5 at the owner's request: "pode ser mais claro e
 * objetivo"). Nine cells; each says its zone and what to do with it (quick wins: do first; strategic: plan as a
 * project; plan; fill-ins; reconsider), the number of actions in large type, and the first actions by their
 * number and title as in the actions table. The zone sets the hue, the count its strength — and both are also
 * in words, so the colour never carries them alone. A real table, so it reads row by row.
 */
export const ImpactHeatmap = ({ items, labels, caption }: ImpactHeatmapProps) => {
  if (items.length === 0) return null;
  const counts = IMPACT_ROWS.flatMap((impact) => EFFORT_COLS.map((effort) => items.filter((item) => item.impact === impact && item.effort === effort).length));
  const max = Math.max(1, ...counts);
  return (
    <div className="pvs-heat-wrap">
      <table className="pvs-heat">
        <caption className="pvs-sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="pvs-heat__corner">
              <span className="pvs-heat__axis-name">{labels.impact} ↓</span>
              <span className="pvs-heat__axis-name">{labels.effort} →</span>
            </th>
            {EFFORT_COLS.map((effort) => (
              <th key={effort} scope="col" className="pvs-heat__axis">
                {labels.effort}: {labels.level[effort]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IMPACT_ROWS.map((impact) => (
            <tr key={impact}>
              <th scope="row" className="pvs-heat__axis pvs-heat__axis--row">
                {labels.impact}: {labels.level[impact]}
              </th>
              {EFFORT_COLS.map((effort) => {
                const cell = items.filter((item) => item.impact === impact && item.effort === effort);
                const zone = zoneOf(impact, effort);
                return (
                  <td
                    key={effort}
                    className="pvs-heat__cell"
                    data-zone={zone}
                    data-empty={cell.length === 0 ? 'true' : undefined}
                    style={{ '--pvs-heat': (cell.length / max).toFixed(2) } as React.CSSProperties}
                  >
                    <span className="pvs-heat__top">
                      <span className="pvs-heat__zone">{labels.zone[zone]}</span>
                      <span className="pvs-heat__count" aria-hidden="true">
                        {cell.length}
                      </span>
                    </span>
                    <span className="pvs-heat__hint">{labels.hint[zone]}</span>
                    <span className="pvs-sr-only">{labels.count(cell.length)}</span>
                    {cell.length > 0 && (
                      <ul className="pvs-heat__items">
                        {cell.slice(0, SHOWN).map((item) => (
                          <li key={item.key} className="pvs-heat__item" title={item.title}>
                            <span className="pvs-heat__rank">{item.rank}</span>
                            <span className="pvs-heat__title">{item.title}</span>
                          </li>
                        ))}
                        {cell.length > SHOWN && <li className="pvs-heat__more">{labels.more(cell.length - SHOWN)}</li>}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pvs-heat__legend">{labels.legend}</p>
    </div>
  );
};
