import React from 'react';

import type { Tone } from '../design/palette';
import { TONE } from './tokens';

/**
 * A number, set the way evidence should be set.
 *
 * Tabular numerals (so a column of figures aligns and does not jitter as values
 * change), a unit that is always printed beside the value, and a measured/missing
 * distinction that is part of the component: a figure that was not measured
 * renders a dash, muted, with an accessible name that says *why* — never a zero.
 *
 * This replaces v2's gradient-clipped numbers. Gradient text has no solid ink, so
 * it printed invisibly on paper (v2 needed a print patch for it), fails
 * forced-colours mode, and gave a "good" and a "neutral" figure different
 * treatments for decoration only. A figure now has one treatment; tone changes
 * its colour only when the caller asserts a measured condition.
 *
 * Takes pre-formatted text. The component never decides what a number means.
 */

export type FigureSize = 'md' | 'lg' | 'xl';

export interface FigureProps {
  /** Already formatted for the active locale. */
  value: string;
  /** Printed beside the value. A quantity without a unit is not evidence. */
  unit?: string;
  size?: FigureSize;
  /** Colours the figure. Use only for a measured condition; default is neutral ink. */
  tone?: Tone;
  /** When true the value is rendered as a muted dash and `missingLabel` names why. */
  missing?: boolean;
  /** Accessible reason the figure is missing (already translated). */
  missingLabel?: string;
  /**
   * Paints the numeral with the gradient of the nearest `data-spectrum` family (3.2 "Value
   * Spectrum"). The solid ink stays underneath: print and forced colours fall back to it.
   */
  ink?: 'spectrum';
  id?: string;
}

/**
 * Gives a value somewhere to break that is not the middle of a word or of a number:
 * a `<wbr>` after each underscore (`RESOURCE_CONTENTION`) and after each thousands
 * separator (`91,113,158,730`). Without them a narrow tile broke "91,113,158,73 / 0".
 * `textContent` is unchanged, so tests, copy and assistive technology see the
 * original string.
 */
function breakable(value: string): React.ReactNode {
  const parts = value.split(/(?<=[_,])/);
  if (parts.length === 1) return value;
  return parts.flatMap((part, index) => (index < parts.length - 1 ? [part, <wbr key={index} />] : [part]));
}

export const Figure = ({
  value,
  unit,
  size = 'lg',
  tone,
  missing = false,
  missingLabel,
  ink,
  id,
}: FigureProps) => {
  const style: React.CSSProperties | undefined =
    tone !== undefined && tone !== 'neutral' && !missing ? { color: TONE[tone].text } : undefined;

  // A formatted value often already carries its unit ("1.23%", "6.9 h"); printing it
  // again gave "1.23% %". A bare quantity still gets the unit beside it.
  const showUnit = unit !== undefined && unit !== '' && !value.trimEnd().endsWith(unit);

  return (
    <p
      className="pvs-figure"
      data-size={size}
      data-missing={missing ? 'true' : undefined}
      data-ink={ink}
      style={style}
      id={id}
    >
      <span
        className="pvs-figure__value"
        // A dash alone is announced as "dash" or nothing; the label says why.
        aria-label={missing ? missingLabel : undefined}
      >
        {missing ? '—' : breakable(value)}
      </span>
      {!missing && showUnit && <span className="pvs-figure__unit">{unit}</span>}
    </p>
  );
};
