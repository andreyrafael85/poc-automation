import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import type { Tone } from '../../design/palette';
import { SURFACE, TONE } from '../../engine';

interface HealthRingProps {
  /** 0–100. `null` renders the "not measured" ring — a dash, never a zero. */
  value: number | null;
  /** Label under the ring (already translated). */
  label: string;
  /** Optional one-line reading under the label (already translated). */
  caption?: string;
  /** The number to print in the middle (already formatted/translated). */
  valueDisplay?: string;
  /** Colours the arc. Informational by default; amber/red only for a measured condition. */
  tone?: Tone;
  size?: number;
  /** Accessible name (already translated). */
  ariaLabel: string;
}

/**
 * A radial gauge for one percentage.
 *
 * The arc is a single solid stroke from a design token over a neutral track —
 * v2's neon gradient and glow are gone. The value is printed in the centre as
 * text, so the ring is never the only carrier of the number.
 *
 * When `value` is `null` the track is dashed and the centre shows a dash. That is
 * the app's rule that absence is never drawn as zero, and the dashed edge means
 * it survives greyscale. Motion on the arc is a CSS transition, switched off by
 * `prefers-reduced-motion` in the stylesheet.
 */
export const HealthRing = ({
  value,
  label,
  caption,
  valueDisplay,
  tone = 'primary',
  size = 132,
  ariaLabel,
}: HealthRingProps) => {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const measured = value !== null && Number.isFinite(value);
  const pct = measured ? Math.max(0, Math.min(100, value)) : 0;
  const dash = (pct / 100) * circumference;

  return (
    <div className="pvs-ring" role="img" aria-label={ariaLabel}>
      <div className="pvs-ring__dial" style={{ width: size, height: size }}>
        <svg className="pvs-ring__svg" width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={SURFACE.border}
            strokeWidth={stroke}
            strokeDasharray={measured ? undefined : '4 8'}
          />
          {measured && (
            <circle
              className="pvs-ring__arc"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={TONE[tone].borderAccent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          )}
        </svg>
        <div className="pvs-ring__value" style={{ fontSize: size * 0.24 }}>
          {measured ? (valueDisplay ?? String(Math.round(pct))) : '—'}
        </div>
      </div>
      <Text className="pvs-ring__label">{label}</Text>
      {caption && <Text className="pvs-caption">{caption}</Text>}
    </div>
  );
};
