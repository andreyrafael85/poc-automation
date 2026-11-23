import React from 'react';

import { Surface } from '@dynatrace/strato-components/layouts';

import type { Tone } from '../design/palette';
import type { Provenance } from '../models/provenance';
import { evidenceAttribute } from './evidence';
import { TONE } from './tokens';

/**
 * The one container of the app.
 *
 * Replaces v2's `GlassPanel`. Where that was a translucent, blurred, shadowed
 * card with a neon rule, this is Strato's own `Surface` — flat, hairline-bordered,
 * theme-correct — plus the three things the engine adds on top:
 *
 *  - **tone**, passed straight through to `Surface`'s `color`, so a card that
 *    carries a measured condition is tinted by the platform's own container
 *    colours rather than by a colour this app invented;
 *  - **rail**, a 2px edge in the tone's accent, for a card that must stand out
 *    without becoming a saturated block;
 *  - **evidence**, which draws the card's border as dashed when what it holds is
 *    an approximation or an absence — a distinction that survives greyscale.
 *
 * `onActivate` makes the whole card a control. Unlike v2's click-on-a-div, it is
 * focusable, announced as a button and operable with Enter and Space.
 */

export type PanelPadding = 'none' | 'compact' | 'default' | 'roomy';

export interface PanelProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color' | 'onClick' | 'children'> {
  tone?: Tone;
  pad?: PanelPadding;
  /** Draw an accent edge in the tone's colour. Ignored when the edge tone is neutral. */
  rail?: boolean;
  /** Edge tone when it should differ from the fill tone (a quiet card with a measured-condition edge). */
  railTone?: Tone;
  /** The provenance of what the panel holds; draws the dashed border when due. */
  evidence?: Provenance;
  /** Renders the panel as an operable control. */
  onActivate?: () => void;
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  children?: React.ReactNode;
}

export const Panel = ({
  tone = 'neutral',
  pad = 'default',
  rail = false,
  railTone,
  evidence,
  onActivate,
  as = 'div',
  className,
  style,
  children,
  onKeyDown,
  ...rest
}: PanelProps) => {
  const interactive = onActivate !== undefined;
  const edgeTone = railTone ?? tone;
  const hasRail = rail && edgeTone !== 'neutral';
  const merged: React.CSSProperties = {
    ...(hasRail ? ({ '--pvs-rail-color': TONE[edgeTone].borderAccent } as React.CSSProperties) : {}),
    ...style,
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (!interactive || event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };

  const Element = Surface as React.ElementType;

  return (
    <Element
      as={as}
      color={tone === 'neutral' ? undefined : tone}
      elevation="flat"
      {...rest}
      className={['pvs-panel', className].filter(Boolean).join(' ')}
      style={merged}
      data-pad={pad}
      data-rail={hasRail ? 'true' : undefined}
      data-evidence={evidence !== undefined ? evidenceAttribute(evidence) : undefined}
      data-interactive={interactive ? 'true' : undefined}
      role={interactive ? 'button' : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Element>
  );
};
