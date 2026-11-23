import React from 'react';

import './chart.css';

export type MatrixLevel = 'low' | 'medium' | 'high';

export interface MatrixItem {
  key: string;
  /** Position in the prioritised list, shown as the chip's number (1 = act first). */
  rank: number;
  title: string;
  impact: MatrixLevel;
  effort: MatrixLevel;
}

export interface ImpactEffortMatrixProps {
  items: readonly MatrixItem[];
  /** Words for the axes and levels, already translated. */
  labels: { impact: string; effort: string; level: Record<MatrixLevel, string>; quickWins: string };
  /** The matrix as a whole, for assistive technology. */
  caption: string;
}

const IMPACT_ROWS: readonly MatrixLevel[] = ['high', 'medium', 'low'];
const EFFORT_COLS: readonly MatrixLevel[] = ['low', 'medium', 'high'];

/**
 * Impact × effort (3.3.20, Opportunities on the chart engine): every opportunity in the cell of its
 * impact and effort, numbered by its place in the prioritised list, the high-impact low-effort cell
 * marked "quick wins". Both axes are the qualitative judgement each rule already states
 * (`deriveInsights`), never a new number. A real table, so it reads row by row without the picture.
 */
export const ImpactEffortMatrix = ({ items, labels, caption }: ImpactEffortMatrixProps) => {
  if (items.length === 0) return null;
  return (
    <table className="pvs-matrix">
      <caption className="pvs-sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="pvs-matrix__corner">
            <span>{labels.impact}</span>
            <span aria-hidden="true">↓ · →</span>
            <span>{labels.effort}</span>
          </th>
          {EFFORT_COLS.map((effort) => (
            <th key={effort} scope="col" className="pvs-matrix__head">
              {labels.level[effort]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {IMPACT_ROWS.map((impact) => (
          <tr key={impact}>
            <th scope="row" className="pvs-matrix__head">
              {labels.level[impact]}
            </th>
            {EFFORT_COLS.map((effort) => {
              const cell = items.filter((item) => item.impact === impact && item.effort === effort);
              const quick = impact === 'high' && effort === 'low';
              return (
                <td key={effort} className="pvs-matrix__cell" data-quick={quick ? 'true' : undefined} data-empty={cell.length === 0 ? 'true' : undefined}>
                  {quick && <span className="pvs-matrix__tag">{labels.quickWins}</span>}
                  <ul className="pvs-matrix__list">
                    {cell.map((item) => (
                      <li key={item.key} className="pvs-matrix__item" title={item.title}>
                        <span className="pvs-matrix__rank">{item.rank}</span>
                        <span className="pvs-matrix__title">{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
