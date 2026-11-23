import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { useTranslation } from '../../i18n/useTranslation';
import { localizeSentinel } from '../../utils/sentinels';
import { accentFor, type ChartRole } from '../../design/palette';
import { StratoMeter } from '../../engine/strato';
import type { SpectrumFamily } from '../spectrum/family';

export interface BarListItem {
  key: string;
  /** Already-translated row label (e.g. a category or a technology name). */
  label: string;
  /** Numeric value that sizes the bar. */
  value: number;
  /** Pre-formatted value shown at the right (already localised). */
  display: string;
  /** A glyph before the name: a brand mark or a functional icon. Decorative; the name says it. */
  icon?: React.ReactNode;
}

interface BarListProps {
  items: readonly BarListItem[];
  /** Accessible name (already translated). */
  ariaLabel: string;
  /**
   * What the bars measure. Selects the colour from `design/palette`, so the same
   * kind of quantity is the same colour on every page.
   */
  role?: ChartRole;
  /** Rank number beside each row, on by default. */
  ranked?: boolean;
}

/**
 * The Spectrum family each role paints its bars with (3.2.3), next to the role's solid palette
 * colour, which stays underneath for print and forced colours. Same role, same paint, everywhere.
 */
export const ROLE_FAMILY: Record<ChartRole, SpectrumFamily> = {
  magnitude: 'blue',
  category: 'pink-purple',
  duration: 'blue-turquoise',
  volume: 'turquoise',
  exposure: 'orange',
};

/**
 * A ranked horizontal bar list — for "which are the biggest, in order".
 *
 * Each row names the item, draws a solid bar proportional to the largest value,
 * and prints the figure. Unlike a treemap the label is always legible and the
 * ranking unambiguous. Values arrive pre-formatted, so the component never
 * decides what a number means. A long name is truncated visually and kept whole in
 * `title` and in the accessible text.
 */
export const BarList = ({ items, ariaLabel, role = 'magnitude', ranked = true }: BarListProps) => {
  const { t } = useTranslation();
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 0) || 1;
  const fill = accentFor(role);

  return (
    <ul className="pvs-bars" aria-label={ariaLabel} data-spectrum={ROLE_FAMILY[role]}>
      {items.map((item, index) => {
        const label = localizeSentinel(item.label, t);
        const pct = Math.max(2, (item.value / max) * 100);
        return (
          <li key={item.key} className="pvs-bars__row">
            {ranked && (
              <span className="pvs-bars__rank" aria-hidden="true">
                {index + 1}
              </span>
            )}
            <div className="pvs-bars__main">
              <div className="pvs-bars__line">
                <span className="pvs-bars__who">
                  {item.icon !== undefined && (
                    <span className="pvs-bars__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <Text className="pvs-bars__name pvs-truncate" title={label}>
                    {label}
                  </Text>
                </span>
                <Text className="pvs-bars__value">{item.display}</Text>
              </div>
              {/* 3.5.1 (Strato native, wave 3): the bar is the platform's MeterBarChart on the list's own scale; the
                  name, the value and the rank stay the app's text (read by assistive technology, the prints and the
                  Tech Wrapup's pins). */}
              <div className="pvs-bars__track pvs-bars__track--strato" aria-hidden="true" data-pct={pct.toFixed(1)}>
                <StratoMeter value={Math.max(item.value, 0)} max={max} name={label} color={fill} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
