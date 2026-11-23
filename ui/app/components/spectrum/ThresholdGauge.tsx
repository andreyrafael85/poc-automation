import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { filledTicks } from '../../engine/strato/StratoTicks';
import { CheckmarkIcon, CriticalIcon, SyncOffIcon, WarningIcon } from '@dynatrace/strato-icons';

export type GaugeRating = 'good' | 'needs-improvement' | 'poor' | 'no-data';

export interface ThresholdGaugeProps {
  /** The reading; `null` when it was not observed (a dashed dial and a dash, never a "good"). */
  value: number | null;
  /** The reading formatted for the locale, without its unit. */
  display: string;
  unit?: string;
  /** Name of the measure (already translated). */
  label: string;
  /** Upper bound of "good" and of "needs improvement", in the reading's unit (published thresholds). */
  good: number;
  poor: number;
  /** End of the dial. Readings beyond it sit at the end, still printed as they are. */
  max: number;
  rating: GaugeRating;
  /** The rating's word (already translated). */
  ratingLabel: string;
  /** The two thresholds as printed under the dial ("2.5 s", "4 s"). */
  goodLabel: string;
  poorLabel: string;
}

const CX = 100;
const CY = 100;
const R = 78;

/** A point on the half circle, from the left end (share 0) over the top to the right end (share 1). */
function at(share: number, radius = R): { x: number; y: number } {
  const angle = Math.PI - Math.min(1, Math.max(0, share)) * Math.PI;
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

/** Where a threshold's label sits: just outside the arc, as a share of the drawing. */
function tickAt(share: number): React.CSSProperties {
  const point = at(share, R + 17);
  return { left: `${((point.x / 200) * 100).toFixed(1)}%`, top: `${((point.y / 116) * 100).toFixed(1)}%` };
}

/** 3.6.2 (v6): the half dial as segments — the same arc of segments as every other dial of the app. */
export const VITAL_SEGMENTS = 24;
const SEG_GAP = 0.012; // of the half circle

function segment(index: number, count = VITAL_SEGMENTS): string {
  const a = at(index / count + SEG_GAP / 2);
  const b = at((index + 1) / count - SEG_GAP / 2);
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${R},${R} 0 0 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}

const ICON: Record<GaugeRating, React.ReactNode> = {
  good: <CheckmarkIcon aria-hidden="true" />,
  'needs-improvement': <WarningIcon aria-hidden="true" />,
  poor: <CriticalIcon aria-hidden="true" />,
  'no-data': <SyncOffIcon aria-hidden="true" />,
};

/**
 * One Core Web Vital on a half dial (3.2.3, wave V4): the three published zones along the arc
 * (good, needs improvement, poor), the reading drawn from zero to where it falls, and the rating
 * as an icon and a word beneath. The zones are the platform's status colours; the rating is a
 * measured condition against a published threshold, so it may carry one. The reading and the
 * rating are text, the dial announces both, and an unobserved vital is a dashed dial with a dash.
 */
export const ThresholdGauge = ({
  value,
  display,
  unit,
  label,
  good,
  poor,
  max,
  rating,
  ratingLabel,
  goodLabel,
  poorLabel,
}: ThresholdGaugeProps) => {
  const observed = value !== null && Number.isFinite(value) && rating !== 'no-data';
  const share = observed ? Math.min(1, Math.max(0, value / max)) : 0;
  const goodShare = good / max;
  const poorShare = poor / max;
  const lit = observed ? filledTicks(share * 100, 100, VITAL_SEGMENTS) : 0;
  const spoken = observed ? `${label}: ${display}${unit === undefined ? '' : ` ${unit}`}, ${ratingLabel}` : `${label}: ${ratingLabel}`;

  return (
    <figure className="pvs-tgauge" data-rating={rating}>
      <div className="pvs-tgauge__dial" role="img" aria-label={spoken}>
        <svg className="pvs-tgauge__svg" viewBox="0 0 200 116" aria-hidden="true" focusable="false" data-lit={lit}>
          {/* 3.6.2 (v6): the three published zones as segments in their status colour, lit up to the reading. */}
          {Array.from({ length: VITAL_SEGMENTS }, (_, index) => {
            const middle = (index + 0.5) / VITAL_SEGMENTS;
            const zone = middle <= goodShare ? 'good' : middle <= poorShare ? 'needs-improvement' : 'poor';
            return (
              <path
                key={index}
                d={segment(index)}
                className="pvs-tgauge__seg"
                data-zone={observed ? zone : undefined}
                data-on={index < lit ? 'true' : 'false'}
                data-missing={observed ? undefined : 'true'}
              />
            );
          })}
        </svg>
        <p className="pvs-tgauge__reading" data-missing={observed ? undefined : 'true'} aria-hidden="true">
          <span className="pvs-tgauge__number">{observed ? display : '—'}</span>
          {observed && unit !== undefined && <span className="pvs-tgauge__unit">{unit}</span>}
        </p>
        <span className="pvs-tgauge__tick" data-at="good" style={tickAt(goodShare)} aria-hidden="true">
          {goodLabel}
        </span>
        <span className="pvs-tgauge__tick" data-at="poor" style={tickAt(poorShare)} aria-hidden="true">
          {poorLabel}
        </span>
      </div>
      <figcaption className="pvs-tgauge__caption">
        <Text className="pvs-tgauge__label">{label}</Text>
        <span className="pvs-tgauge__rating">
          {ICON[rating]}
          {ratingLabel}
        </span>
      </figcaption>
    </figure>
  );
};
