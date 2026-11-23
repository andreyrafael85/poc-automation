import React from 'react';

import {
  GuideIcon,
  HelpIcon,
  InformationIcon,
  LineDashedIcon,
  PendingIcon,
  WarningIcon,
} from '@dynatrace/strato-icons';

import type { IconComponent } from './evidence';

/**
 * A callout names the *status* of a statement, not just its content.
 *
 * The brief for v3.1 is that a reader must be able to tell, at a glance and
 * without reading closely, a measurement from an estimate, an assumption, a
 * limitation, a recommendation and something still pending. `Provenance` covers
 * that for a **number**; a callout covers it for a **sentence** (a caveat under a
 * chart, a scope statement, the premise behind a cost).
 *
 * Each kind has its own icon and, for the kinds that are not firm facts, a dashed
 * border — so the difference survives greyscale and does not rely on hue.
 *
 * A callout is a `role="note"` (named by its title), not an `<aside>`: a page can
 * carry many of them, and each `aside` would be another landmark in the screen
 * reader's list.
 *
 * Callouts are quiet on purpose. None of them is amber or red: those colours are
 * reserved for a measured condition in the customer's estate, and a limitation of
 * *this review* is not one.
 */

export type CalloutKind =
  | 'note'
  | 'assumption'
  | 'estimate'
  | 'limitation'
  | 'recommendation'
  | 'pending';

const ICON: Record<CalloutKind, IconComponent> = {
  note: InformationIcon,
  assumption: HelpIcon,
  estimate: LineDashedIcon,
  limitation: WarningIcon,
  recommendation: GuideIcon,
  pending: PendingIcon,
};

/** Kinds that are not firm facts get a dashed edge. */
const DASHED: ReadonlySet<CalloutKind> = new Set(['assumption', 'estimate', 'limitation', 'pending']);

export interface CalloutProps {
  kind?: CalloutKind;
  /** Already translated. The kind's name ("Assumption", "Limitation"…). */
  title?: string;
  children: React.ReactNode;
  id?: string;
}

export const Callout = ({ kind = 'note', title, children, id }: CalloutProps) => {
  const Icon = ICON[kind];
  return (
    <div
      role="note"
      className="pvs-callout"
      data-kind={kind}
      data-style={DASHED.has(kind) ? 'dashed' : undefined}
      id={id}
      aria-label={title}
    >
      <span className="pvs-callout__icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="pvs-callout__body">
        {title !== undefined && <p className="pvs-callout__title">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};
