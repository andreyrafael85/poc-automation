import React from 'react';

import { PALETTE, type Tone } from '../design/palette';
import type { Fact } from '../models/provenance';
import { FactTile } from './FactTile';
import type { SpectrumFamily } from './spectrum/family';

/**
 * A large, scannable metric with a stated status.
 *
 * Takes a `Fact`, so it cannot render a number without a provenance, and an
 * unavailable fact renders its reason rather than a zero. `status` is
 * presentational only: it is never derived from a threshold this app invented —
 * callers pass it based on a stated rule, or omit it. Warning and fault tint the
 * figure and draw an edge; good and neutral are quiet, because a green wash on
 * every healthy number turns a dashboard into noise.
 */

export interface StatTileProps {
  label: string;
  fact: Fact<number | string | null>;
  /** Pre-formatted display value. Falls back to the raw value. */
  display?: string;
  /** Secondary line: context, denominator, or the calculation used. */
  detail?: string;
  status?: 'ideal' | 'good' | 'neutral' | 'warning' | 'critical';
  /** Renders the value smaller, for tiles carrying long text. */
  compact?: boolean;
  /** Spectrum family of an untoned tile (3.2.3). */
  family?: SpectrumFamily;
}

const STATUS_TONE: Record<NonNullable<StatTileProps['status']>, Tone> = {
  critical: PALETTE.fault,
  warning: PALETTE.review,
  ideal: PALETTE.good,
  good: PALETTE.good,
  neutral: PALETTE.absent,
};

export const StatTile = ({ label, fact, display, detail, status, compact, family }: StatTileProps) => (
  <FactTile
    label={label}
    fact={fact}
    display={display}
    detail={detail}
    tone={status === undefined ? PALETTE.absent : STATUS_TONE[status]}
    size={compact === true ? 'lg' : 'xl'}
    family={family}
  />
);
