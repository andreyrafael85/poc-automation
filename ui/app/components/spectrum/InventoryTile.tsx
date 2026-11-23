import React from 'react';

import { StratoKpi } from '../../engine/strato';
import { isUnavailable, type Fact } from '../../models/provenance';
import type { SpectrumFamily } from './family';

export interface InventoryTileProps {
  label: string;
  /** A Strato functional icon or a `BrandGlyph`, drawn on the family's tile. Decorative. */
  icon: React.ReactNode;
  fact: Fact<number | string | null>;
  /** Pre-formatted value. Falls back to the raw value. */
  display?: string;
  /** A secondary line under the value: a denominator, a remainder ("3 not readable"). */
  detail?: string;
  /**
   * A measured condition stated by the caller's rule (a front-end error rate above 1 %). Tints
   * the figure and draws an edge; an inventory count has none.
   */
  status?: 'warning' | 'critical';
  family?: SpectrumFamily;
  /**
   * 3.3.9: the icon on the name's line and no "window · query" caption — the panel states it
   * once for the row (Overview inventory, owner's review of 3.3.8: one line for every tile). The
   * evidence badge stays on every tile.
   */
  compact?: boolean;
}


/**
 * One line of the monitored inventory: what it is (icon and word), how many, and where the
 * count came from ("Last 24 hours · cov.inventory" and the evidence badge).
 *
 * The contract is `FactTile`'s: an unavailable count is a dash with its reason, on a neutral
 * tile and a dashed edge, never a zero.
 */
export const InventoryTile = ({ label, icon, fact, display, detail, compact = false }: InventoryTileProps) => {
  // As before 3.5.1: only an unavailable fact is missing; without a formatted `display` the fact's own value is shown
  // (the Executive's front-end error rate passes "0.95%" as the fact).
  const missing = isUnavailable(fact) || (display === undefined && (fact.value === null || fact.value === undefined));
  // 3.5.1 (Strato native, wave 3): the app's one KPI anatomy, compact — the platform's SingleValue with the entity's
  // functional icon, the detail line and the evidence badge. A count that was not measured is a dash and its reason.
  return (
    <StratoKpi
      size="sm"
      className={compact ? 'pvs-inv-tile pvs-inv-tile--compact' : 'pvs-inv-tile'}
      label={label}
      badge={icon}
      fact={fact}
      value={missing ? null : (display ?? String(fact.value))}
      caption={detail}
    />
  );
};
