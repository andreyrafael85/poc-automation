import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { useTranslation } from '../../i18n/useTranslation';
import { localizeSentinel } from '../../utils/sentinels';
import { CHART_PALETTE } from '../../design/palette';
import { decimal } from '../../utils/activeLocale';

export interface ShareSegment {
  key: string;
  /** Already-translated segment label. */
  label: string;
  value: number;
  /** Pre-formatted value (already localised). */
  display: string;
}

interface ShareBarProps {
  segments: readonly ShareSegment[];
  /** Accessible name (already translated). */
  ariaLabel: string;
}

/**
 * A single 100%-stacked share bar with a ranked legend — for "how the whole
 * splits".
 *
 * The bar reads the proportions at a glance; the legend below gives every
 * segment its label, its figure and its share, in order, so no segment is
 * identifiable by colour alone. Only the bar is an image: the legend stays a real
 * list, because it is where a screen-reader user reads the data. Colours come from the categorical role palette,
 * and a hairline separates neighbouring segments.
 */
export const ShareBar = ({ segments, ariaLabel }: ShareBarProps) => {
  const { t } = useTranslation();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const colors = CHART_PALETTE.category;
  const ranked = [...segments].sort((a, b) => b.value - a.value);

  return (
    <div className="pvs-share">
      <div className="pvs-share__bar" role="img" aria-label={ariaLabel}>
        {ranked.map((segment, index) => (
          <div
            key={segment.key}
            className="pvs-share__seg"
            title={`${localizeSentinel(segment.label, t)}: ${segment.display}`}
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: colors[index % colors.length],
            }}
          />
        ))}
      </div>

      <ul className="pvs-legend-list">
        {ranked.map((segment, index) => {
          const share = (segment.value / total) * 100;
          return (
            <li key={segment.key} className="pvs-legend-list__row">
              <span
                className="pvs-swatch"
                aria-hidden="true"
                style={{ background: colors[index % colors.length] }}
              />
              <Text className="pvs-legend-list__name pvs-truncate" title={localizeSentinel(segment.label, t)}>
                {localizeSentinel(segment.label, t)}
              </Text>
              <Text className="pvs-legend-list__value">{segment.display}</Text>
              <Text className="pvs-legend-list__share">{decimal(share, 1)}%</Text>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
