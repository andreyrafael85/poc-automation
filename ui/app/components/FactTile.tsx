import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { PALETTE, type Tone } from '../design/palette';
import { Figure, Panel, type FigureSize } from '../engine';
import { isUnavailable, UNAVAILABLE_LABEL_KEY, type Fact } from '../models/provenance';
import { useTranslation } from '../i18n/useTranslation';
import { ProvenanceBadge } from './ProvenanceBadge';
import type { SpectrumFamily } from './spectrum/family';

/**
 * The one tile that carries a single measured number.
 *
 * `KpiTile` and `StatTile` were two components with the same contract and
 * near-identical bodies — a card, a label, a provenance badge, a figure, a detail
 * line — differing only in size and in whether the source line is printed.
 * Keeping both meant every fix had to be made twice. They are now thin wrappers
 * over this.
 *
 * ## The contract it enforces
 *
 * A tile cannot render without a `Fact`, and a `Fact` cannot exist without a
 * provenance, so traceability is a compiler guarantee. A measured zero renders as
 * `0`. A value that was not measured renders a dash and the *reason* — never a
 * zero — and the card is drawn with a dashed edge, so the difference survives
 * greyscale.
 *
 * ## Why the value is not a `SingleValue`
 *
 * `SingleValue` defaults to `height: 100%`, which resolves to zero inside a column
 * flex container with no fixed height, and the tile rendered everything except the
 * number. A `Figure` is plain text and cannot collapse.
 */

export interface FactTileProps {
  label: string;
  fact: Fact<number | string | null>;
  /** Pre-formatted display value. Falls back to the raw value. */
  display?: string;
  /** Secondary line under the number: a denominator, a share, a comparison. */
  detail?: string;
  /**
   * Colours the figure and draws an edge, for `success`, `warning` and `critical`.
   * Informational (`primary`, the default) draws nothing — a count of hosts is not
   * good or bad news, and colouring it as though it were is how a neutral inventory
   * starts reading as an alarm.
   */
  tone?: Tone;
  size?: FigureSize;
  /** Prints "window · query id" under the figure, so the number is traceable at a glance. */
  showSource?: boolean;
  /** Spectrum family of the edge, wash and numeral of an untoned tile (3.2.3). Identity, never a verdict. */
  family?: SpectrumFamily;
}

export const FactTile = ({
  label,
  fact,
  display,
  detail,
  tone = PALETTE.absent,
  size = 'lg',
  showSource = false,
  family = 'blue-turquoise',
}: FactTileProps) => {
  const missing = isUnavailable(fact);
  const { t, tWindow, formatNumber } = useTranslation();

  // Every unavailable class has its own reason; anything else is "not in scope".
  const reason =
    fact.provenance in UNAVAILABLE_LABEL_KEY
      ? t(UNAVAILABLE_LABEL_KEY[fact.provenance as keyof typeof UNAVAILABLE_LABEL_KEY])
      : t('c.tile.notInPocScope');

  // An unavailable value is always neutral: "not measured" must never inherit an
  // alarm colour. Informational (`primary`) is the default state of a count and gets
  // no treatment at all — blue ink reads as a link on the platform, and a page of
  // blue numbers says "clickable", not "informational". Only a good result, a
  // condition worth reviewing or a fault is drawn.
  const effectiveTone: Tone = missing || tone === 'primary' ? 'neutral' : tone;

  // A long text value (a category such as RESOURCE_CONTENTION) is not a number: one
  // step smaller keeps it on a line or two instead of towering over its neighbours.
  //
  // 3.3.0: a caller that passes no `display` used to get `String(value)`, which printed a raw
  // "6842" beside tiles that read "6.842" (owner's 3.2.7 round, §17-b). A measured number is now
  // always written in the active locale here, so no tile can forget the thousands separator; a
  // caller that needs another shape (a rounded figure, a share, a duration) still passes `display`.
  const shown = display ?? (typeof fact.value === 'number' ? formatNumber(fact.value) : String(fact.value));
  const fit: FigureSize = shown.length > 14 && size !== 'md' ? 'md' : size;
  // 3.2.3: an untoned tile wears the Spectrum skin (edge, wash, painted numeral, as `KpiHero`); a
  // toned one keeps the platform's tone and solid ink, so the skin never competes with a verdict.
  const toned = effectiveTone !== 'neutral';

  return (
    <Panel
      className="pvs-kpi"
      tone={effectiveTone}
      rail={false}
      data-tone={toned ? effectiveTone : undefined}
      evidence={fact.provenance}
      data-spectrum={family}
      data-missing={missing ? 'true' : undefined}
      data-toned={toned ? 'true' : undefined}
    >
      <span className="pvs-kpi__edge" aria-hidden="true" />
      <div className="pvs-tile">
        {/* 3.7.5 (v6): a toned tile shows its state as a dot before the label and in the figure, no coloured rail. */}
        <Text className="pvs-label pvs-tile__label">
          {toned && <span className="pvs-tile__dot" aria-hidden="true" />}
          {label}
        </Text>

        {missing ? (
          <>
            <Figure value="—" size={size} missing missingLabel={reason} />
            <Text className="pvs-caption">{reason}</Text>
            {'requirement' in fact && typeof fact.requirement === 'string' && (
              <Text className="pvs-caption">{fact.requirement}</Text>
            )}
          </>
        ) : (
          <>
            <Figure
              value={shown}
              unit={fact.unit}
              size={fit}
              tone={effectiveTone}
              ink={toned ? undefined : 'spectrum'}
            />
            {detail !== undefined && <Text className="pvs-caption">{detail}</Text>}
          </>
        )}

        {/* The evidence class always sits in the same place — the foot, beside the window
            and query it came from — so tiles in one row share a structure whatever the
            width of their label. */}
        <div className="pvs-tile__foot">
          <ProvenanceBadge
            provenance={fact.provenance}
            confidence={fact.confidence}
            evidence={fact.evidence}
            note={fact.note}
          />
          {showSource && !missing && fact.evidence !== undefined && (
            <Text className="pvs-caption">
              {tWindow(fact.evidence.timeframe)} · {fact.evidence.queryId}
            </Text>
          )}
        </div>
      </div>
    </Panel>
  );
};
