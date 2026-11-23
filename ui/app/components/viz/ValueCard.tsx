import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import type { Tone } from '../../design/palette';
import { isUnavailable, type Fact, type Provenance } from '../../models/provenance';
import { Figure, Panel } from '../../engine';
import { ProvenanceBadge } from '../ProvenanceBadge';
import type { SpectrumFamily } from '../spectrum/family';
import { SpectrumSpark } from '../spectrum/SpectrumSpark';

export type TrendDirection = 'up' | 'down' | 'flat';

interface ValueCardProps {
  /** Small kicker above the value (already translated). */
  eyebrow: string;
  /** The headline value, already formatted (or an em-dash when not measured). */
  value: string;
  /** Optional unit printed next to the value (already translated). */
  unit?: string;
  /** One-line reading under the value (already translated). */
  caption?: string;
  /** Tints the card only to assert a measured condition. Neutral by default. */
  tone?: Tone;
  /**
   * A neutral movement note. Never coloured red — direction is context, not a
   * verdict.
   */
  trend?: { direction: TrendDirection; label: string };
  /** A short micro-trend drawn under the value. */
  sparkline?: number[];
  /** Accessible description for the sparkline (already translated). */
  sparklineLabel?: string;
  /**
   * What kind of statement the value is. A not-measured value is always drawn as
   * unavailable; pass `estimated` (or `hypothesis`) for a value that is measured
   * but approximate, so the card gets the dashed edge that says so.
   */
  evidence?: Provenance;
  /**
   * Where the number came from. When given, the card carries the evidence badge, draws
   * its edge from the fact's class, and shows a dash — never `value` — if the fact is
   * unavailable. Every headline number should pass one: a card without it states a figure
   * with no source, which is the thing this app exists to prevent.
   */
  fact?: Fact<number | string | null>;
  /** Makes the whole card an operable control. */
  onClick?: () => void;
  /** Spectrum family of the accent edge, the wash and the numeral (3.2.3). Identity, never a verdict. */
  family?: SpectrumFamily;
}

const ARROW: Record<TrendDirection, string> = { up: '↑', down: '↓', flat: '→' };

/**
 * A headline metric.
 *
 * The value is passed in pre-formatted, so this component never decides whether
 * something is measured — it only presents what a `Fact` already resolved. A dash
 * value is shown muted and the card is drawn with a dashed edge.
 *
 * 3.2.3 ("Value Spectrum", wave V4): the card wears the skin of `KpiHero` — an accent edge
 * (its own element: Strato's Surface owns the panel's pseudo-elements), a light wash and the
 * numeral painted in its family — which restyles at once every page that still used the 3.1
 * card (Experience, RCA, Competitors, Value & ROI). A card the caller tones for a measured
 * condition keeps the platform's tone and solid ink instead: the skin never hides a verdict.
 */
export const ValueCard = ({
  eyebrow,
  value,
  unit,
  caption,
  tone = 'neutral',
  trend,
  sparkline,
  sparklineLabel,
  evidence,
  fact,
  onClick,
  family = 'blue-turquoise',
}: ValueCardProps) => {
  const factMissing = fact !== undefined && isUnavailable(fact);
  const missing = value === '—' || factMissing;
  // An unavailable fact names its own class (loading, failed, no permission…); a bare dash
  // with no fact is "no telemetry", as before.
  const edge: Provenance | undefined = missing ? (factMissing ? fact.provenance : 'no-telemetry') : (fact?.provenance ?? evidence);
  const toned = !missing && tone !== 'neutral';
  return (
    <Panel
      className="pvs-kpi"
      tone={missing ? 'neutral' : tone}
      rail={toned}
      evidence={edge}
      onActivate={onClick}
      data-spectrum={family}
      data-missing={missing ? 'true' : undefined}
      data-toned={toned ? 'true' : undefined}
    >
      <span className="pvs-kpi__edge" aria-hidden="true" />
      <div className="pvs-valuecard">
        <div className="pvs-cluster" style={{ '--pvs-justify': 'space-between' } as React.CSSProperties}>
          <Text className="pvs-label">{eyebrow}</Text>
          {fact !== undefined && (
            <ProvenanceBadge
              provenance={fact.provenance}
              confidence={fact.confidence}
              evidence={fact.evidence}
              note={fact.note}
            />
          )}
        </div>
        <div className="pvs-cluster">
          <Figure
            value={missing ? '—' : value}
            unit={unit}
            // A seven-figure count at display size breaks across lines in a fifth of a page (3.2.3).
            size={value.length > 6 ? 'lg' : 'xl'}
            missing={missing}
            missingLabel={eyebrow}
            tone={tone}
            ink={toned ? undefined : 'spectrum'}
          />
          {trend && (
            <span className="pvs-valuecard__trend">
              <span aria-hidden="true">{ARROW[trend.direction]}</span> {trend.label}
            </span>
          )}
        </div>
        {caption && <Text className="pvs-caption">{caption}</Text>}
        {!missing && sparkline !== undefined && <SpectrumSpark points={sparkline} label={sparklineLabel} />}
      </div>
    </Panel>
  );
};
