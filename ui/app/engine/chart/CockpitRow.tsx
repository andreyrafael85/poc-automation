import React from 'react';

import './chart.css';

export interface CockpitRowProps {
  children: React.ReactNode;
  /** `even` gives the second tile more room (a ranked list beside the Assist). */
  split?: 'wide' | 'even';
  /** `start` keeps each tile at its own height (two tiles of very different heights). */
  align?: 'stretch' | 'start';
  'data-testid'?: string;
}

/**
 * One cockpit row (3.3.10): the page's main visual beside the Dynatrace Assist, as on the
 * Overview. A tile that has nothing to show is passed as `false`/`null` and dropped, and a row
 * left with one tile draws it at full width instead of leaving an empty column.
 */
export const CockpitRow = ({ children, split = 'wide', align = 'stretch', 'data-testid': testId }: CockpitRowProps) => {
  const tiles = React.Children.toArray(children);
  if (tiles.length === 0) return null;
  if (tiles.length === 1) return <>{tiles[0]}</>;
  return (
    <div className="pvs-cockpit-row" data-split={split === 'even' ? 'even' : undefined} data-align={align === 'start' ? 'start' : undefined} data-testid={testId}>
      {tiles}
    </div>
  );
};
