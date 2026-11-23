import React from 'react';

import './chart.css';

export interface HorizonColumn {
  key: string;
  /** "Now", "Next", "Later", already translated. */
  title: string;
  /** What the horizon is for, one line. */
  intent: string;
  /** "3 items", already translated. */
  countLabel: string;
  items: readonly { key: string; title: string }[];
}

/**
 * The roadmap at a glance (3.3.20, Roadmap on the chart engine): the three horizons side by side,
 * each with its count and the titles it holds, joined by one track — the order to act in before
 * the detail cards. Neutral on purpose: a horizon is a time window, never a severity.
 */
export const HorizonStrip = ({ columns, label }: { columns: readonly HorizonColumn[]; label: string }) => {
  if (columns.every((column) => column.items.length === 0)) return null;
  return (
    <ol className="pvs-horizons" aria-label={label}>
      {columns.map((column, index) => (
        <li key={column.key} className="pvs-horizons__column">
          <div className="pvs-horizons__head">
            <span className="pvs-horizons__step" aria-hidden="true">
              {index + 1}
            </span>
            <div className="pvs-horizons__titles">
              <span className="pvs-horizons__title">{column.title}</span>
              <span className="pvs-horizons__intent">{column.intent}</span>
            </div>
            <span className="pvs-horizons__count">{column.countLabel}</span>
          </div>
          <ul className="pvs-horizons__items">
            {column.items.map((item) => (
              <li key={item.key} className="pvs-horizons__item" title={item.title}>
                {item.title}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
};
