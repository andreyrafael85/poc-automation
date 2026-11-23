import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { useTranslation } from '../../i18n/useTranslation';
import { localizeSentinel } from '../../utils/sentinels';
import { CHART_PALETTE } from '../../design/palette';
import { decimal } from '../../utils/activeLocale';

export interface DonutSegment {
  key: string;
  /** Already-translated segment label. */
  label: string;
  value: number;
  /** Pre-formatted value (already localised). */
  display: string;
}

interface DonutBreakdownProps {
  segments: readonly DonutSegment[];
  ariaLabel: string;
  /** Pre-formatted total shown in the centre. */
  centerDisplay: string;
  /** Already-translated caption under the total (e.g. "problems"). */
  centerLabel: string;
  size?: number;
  /** 3.7.5 (v6): the legend's column headers (name, count, share); without them the legend has no header row. */
  heads?: { name: string; count: string; share: string };
}

/** 3.7.5 (v6): ten micro-blocks show each slice's share in the legend, as the reference dashboards. */
export const DONUT_SHARE_BLOCKS = 10;

/**
 * A donut breakdown with a ranked legend — for "how the whole splits by share".
 *
 * The proportion is read from the ring; the legend gives every slice its label,
 * figure and percentage in order. Colours come from the categorical role palette
 * so the same kind of split looks the same across the app, and a hairline in the
 * surface colour separates slices. v2 printed a percentage on each large slice
 * over a text-shadow; that is dropped — the legend carries every share as text on
 * a plain background, which is both more legible and independent of slice colour.
 */
export const DonutBreakdown = ({
  segments,
  ariaLabel,
  centerDisplay,
  centerLabel,
  size = 200,
  heads,
}: DonutBreakdownProps) => {
  const { t } = useTranslation();
  const colors = CHART_PALETTE.category;
  const ranked = [...segments].sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, segment) => sum + segment.value, 0) || 1;

  const stroke = 26;
  const radius = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  // 3.2.3: a hairline of surface between slices (the slice keeps its measured length minus the
  // gap, never less than a sliver), so neighbours read apart without relying on hue.
  const gap = ranked.filter((segment) => segment.value > 0).length > 1 ? 2.5 : 0;

  let offset = 0;
  const arcs = ranked.map((segment, index) => {
    const share = segment.value / total;
    const length = share * circumference;
    const dash = Math.max(length > 0 ? 1 : 0, length - gap);
    const arc = {
      key: segment.key,
      color: colors[index % colors.length],
      dash,
      gap: circumference - dash,
      dashoffset: -offset,
    };
    offset += length;
    return arc;
  });

  return (
    <div className="pvs-donut">
      <div className="pvs-donut__dial" role="img" aria-label={ariaLabel} style={{ width: size, height: size }}>
        <svg className="pvs-donut__svg" width={size} height={size} aria-hidden="true">
          <circle className="pvs-donut__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              className="pvs-donut__arc"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.dashoffset}
            />
          ))}
        </svg>
        <div className="pvs-donut__center">
          <span className="pvs-donut__total" style={{ fontSize: size * 0.2 }}>
            {centerDisplay}
          </span>
          <Text className="pvs-caption">{centerLabel}</Text>
        </div>
      </div>

      <ul className="pvs-legend-list pvs-donut__legend" data-v6="true">
        {heads !== undefined && (
          <li className="pvs-donut__legend-head" aria-hidden="true">
            <span />
            <span>{heads.name}</span>
            <span>{heads.count}</span>
            <span>{heads.share}</span>
            <span>%</span>
          </li>
        )}
        {ranked.map((segment, index) => {
          const share = (segment.value / total) * 100;
          const lit = segment.value <= 0 ? 0 : share >= 100 ? DONUT_SHARE_BLOCKS : Math.min(DONUT_SHARE_BLOCKS - 1, Math.max(1, Math.round(share / 10)));
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
              <span className="pvs-donut__blocks" aria-hidden="true">
                {Array.from({ length: DONUT_SHARE_BLOCKS }, (_, block) => (
                  <span
                    key={block}
                    className="pvs-donut__block"
                    data-on={block < lit ? 'true' : undefined}
                    style={block < lit ? { background: colors[index % colors.length] } : undefined}
                  />
                ))}
              </span>
              <Text className="pvs-legend-list__share">{decimal(share, 1)}%</Text>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
