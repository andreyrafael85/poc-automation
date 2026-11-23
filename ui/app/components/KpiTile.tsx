import React from 'react';

import type { Tone } from '../design/palette';
import type { Fact } from '../models/provenance';
import { FactTile } from './FactTile';
import type { SpectrumFamily } from './spectrum/family';

/**
 * A KPI cannot be rendered without a `Fact`, and a `Fact` cannot exist without a
 * provenance. That is the whole point of this component: it makes the
 * traceability rule structural rather than aspirational.
 *
 * When a fact carries no value, the tile renders the reason - never a zero.
 * See `FactTile` for the contract and for why the figure is not a chart.
 */

export interface KpiTileProps {
  label: string;
  fact: Fact<number | string | null>;
  /** Pre-formatted display value. Falls back to the raw value. */
  display?: string;
  /** Secondary line under the number: a denominator, a share, a comparison. */
  detail?: string;
  /** Informational by default — a count is not good or bad news. */
  tone?: Tone;
  /** Spectrum family of an untoned tile (3.2.3). */
  family?: SpectrumFamily;
}

export const KpiTile = ({ label, fact, display, detail, tone, family }: KpiTileProps) => (
  <FactTile label={label} fact={fact} display={display} detail={detail} tone={tone} size="lg" showSource family={family} />
);
