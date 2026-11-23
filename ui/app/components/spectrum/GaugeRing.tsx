import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { StratoDial } from '../../engine/strato';

import { isUnavailable, type Fact } from '../../models/provenance';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { type SpectrumFamily } from './family';

export interface GaugeRingProps {
  /** 0–100. `null` draws the "not measured" ring: a dashed track and a dash, never a zero. */
  value: number | null;
  /** The number printed in the middle, already formatted ("88%"). */
  valueDisplay?: string;
  /** Name of the measure under the ring (already translated). */
  label: string;
  /** One line saying what the share is of (already translated). */
  caption?: string;
  /** What the dial is called for assistive technology; the reading is appended to it. */
  ariaLabel: string;
  /** Spoken in place of the reading when the value was not measured (already translated). */
  missingLabel: string;
  family?: SpectrumFamily;
  /** Where the share came from. Draws the evidence badge under the caption. */
  fact?: Fact<number | string | null>;
}


/**
 * A share drawn as a ring: the "Value Spectrum" successor of `HealthRing`.
 *
 * The arc carries a gradient of its family, a contained glow and a knob at its tip, and it
 * draws itself in once (not under "reduce motion", not in print). Everything that matters is
 * also text: the reading sits in the middle as real text, the dial announces label and
 * reading together, and an unmeasured share is a dashed track with a dash, so an absence
 * never reads as 0 %.
 */
export const GaugeRing = ({
  value,
  valueDisplay,
  label,
  caption,
  ariaLabel,
  missingLabel,
  family = 'blue-turquoise',
  fact,
}: GaugeRingProps) => {
  const measured = value !== null && Number.isFinite(value) && !(fact !== undefined && isUnavailable(fact));
  const pct = measured ? Math.max(0, Math.min(100, value)) : 0;
  const reading = measured ? (valueDisplay ?? `${Math.round(pct)}%`) : '—';

  // 3.5.0 (Strato native, wave 2; DN-6): the ring is the platform's GaugeChart — no gradient, no glow, no knob. The
  // classes, the dial's spoken reading and the reading as text stay, so every page, print and capture that reads them
  // keeps working; an unmeasured share still draws no arc, only a dash and the reason.
  return (
    <figure className="pvs-gauge" data-spectrum={family} data-pvs-chart="gauge" data-pvs-state={measured ? 'ready' : 'unavailable'} data-value={measured ? reading : undefined}>
      <div className="pvs-gauge__dial" role="img" aria-label={`${ariaLabel}: ${measured ? reading : missingLabel}`}>
        {measured ? (
          <div className="pvs-gauge__arc">
            <StratoDial value={pct} />
            {/* The reading is the app's text over the dial, the same on screen and on paper. */}
            <span className="pvs-gauge__reading" aria-hidden="true">
              {reading}
            </span>
          </div>
        ) : (
          <p className="pvs-gauge__value" data-missing="true" aria-hidden="true">
            {reading}
          </p>
        )}
      </div>
      <figcaption className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-2)', alignItems: 'center' } as React.CSSProperties}>
        <Text className="pvs-gauge__label">{label}</Text>
        {caption !== undefined && <Text className="pvs-gauge__caption">{caption}</Text>}
        {fact !== undefined && (
          <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
        )}
      </figcaption>
    </figure>
  );
};
