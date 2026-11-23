import React from 'react';

import { CheckmarkIcon } from '@dynatrace/strato-icons';

import './chart.css';

export interface ReadinessItem {
  key: string;
  /** What is ready (or still to fill), already translated. */
  label: string;
  /** Where it is set or where it comes from ("Customer & engagement tab"), already translated. */
  where: string;
  done: boolean;
}

/**
 * A readiness list (3.3.21, Settings and Licensing on the chart engine): each item ticked or still
 * open, with the place it is set. The state is in the row's text ("ready" / "to fill"), never in
 * the icon or colour alone; open items keep a neutral mark — something still to fill in is a
 * step, not an alarm.
 */
export const ReadinessList = ({
  items,
  ariaLabel,
  doneLabel,
  openLabel,
}: {
  items: readonly ReadinessItem[];
  ariaLabel: string;
  doneLabel: string;
  openLabel: string;
}) => {
  if (items.length === 0) return null;
  return (
    <ul className="pvs-ready" aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.key} className="pvs-ready__item" data-done={item.done ? 'true' : 'false'}>
          <span className="pvs-ready__mark" aria-hidden="true">
            {item.done ? <CheckmarkIcon /> : null}
          </span>
          <span className="pvs-ready__text">
            <span className="pvs-ready__label">{item.label}</span>
            <span className="pvs-ready__where">{item.where}</span>
          </span>
          <span className="pvs-ready__state">{item.done ? doneLabel : openLabel}</span>
        </li>
      ))}
    </ul>
  );
};
