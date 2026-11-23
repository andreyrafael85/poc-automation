import {
  ApproximateIcon,
  IdeaIcon,
  HelpIcon,
  LineDashedIcon,
  LockIcon,
  RefreshIcon,
  PendingIcon,
  PercentIcon,
  RangeIcon,
  UnavailableIcon,
  ViewIcon,
  WarningFailedIcon,
} from '@dynatrace/strato-icons';

import type { Tone } from '../design/palette';
import { PROVENANCE_META, type Provenance } from '../models/provenance';
import type { StringKey } from '../i18n/strings';

/**
 * Evidence classes — how the app tells a measurement from an interpretation.
 *
 * v2 already carried the distinction in the type system (`Provenance`), but drew
 * it as a coloured word. A colour-only distinction fails for anyone who cannot
 * tell the hues apart, and it fails on a greyscale printout. So every class gets
 * **three** independent channels:
 *
 *   1. an **icon** with a distinct silhouette,
 *   2. a **text label** (always rendered),
 *   3. a **border treatment** on the card that carries it — solid for what was
 *      observed or calculated, dashed for what is an approximation, an
 *      assumption or an absence.
 *
 * Colour is a fourth, redundant channel. It follows the app's colour discipline:
 * amber/red are reserved for a measured condition in the customer's estate, so
 * "the app could not read this" (`no-permission`) is neutral with a lock, never
 * critical. (v2 mapped it to `critical`, contradicting its own DESIGN-LANGUAGE;
 * v3.1 corrects that.)
 */

/** Every Strato icon shares one component type; this names it. */
export type IconComponent = typeof ViewIcon;

export type EvidenceFamily =
  /** Observed or calculated from observed values. */
  | 'measured'
  /** An approximation, a suggestion, a reading that still needs validation. */
  | 'interpreted'
  /** No value to show, and the reason is part of the content. */
  | 'unavailable';

export type EvidenceBorder = 'solid' | 'dashed';

/** How a class looks. Its words live in `PROVENANCE_META`, so they are defined once. */
interface EvidenceStyle {
  family: EvidenceFamily;
  tone: Tone;
  border: EvidenceBorder;
  Icon: IconComponent;
}

export interface EvidenceClass extends EvidenceStyle {
  provenance: Provenance;
  /** Dictionary key for the short label shown on the chip. */
  labelKey: StringKey;
  /** Dictionary key for the sentence shown in the overlay. */
  descriptionKey: StringKey;
}

/**
 * 3.4.16 (design proposal D-24, the pattern "Status and health"): provenance is not health. Until 3.4.15 an observed
 * figure wore the success green and a ✓, and the interpreted classes the warning yellow — so "41 active problems ✓"
 * read as praise and an estimate as an alert. Every class is now neutral in tone; the icon, the word and the dashed
 * edge carry the class, and green / yellow / red are left to measured health alone. A recommendation keeps the
 * primary tone (it is an action, not a reading) with the idea icon; "no telemetry" uses the platform's "unavailable".
 */
const STYLE: Record<Provenance, EvidenceStyle> = {
  observed: { family: 'measured', tone: 'neutral', border: 'solid', Icon: ViewIcon },
  derived: { family: 'measured', tone: 'neutral', border: 'solid', Icon: PercentIcon },
  // The three kinds of "not a direct read", each with an icon and a word of its own.
  partial: { family: 'interpreted', tone: 'neutral', border: 'dashed', Icon: RangeIcon },
  'platform-estimate': { family: 'interpreted', tone: 'neutral', border: 'dashed', Icon: ApproximateIcon },
  projection: { family: 'interpreted', tone: 'neutral', border: 'dashed', Icon: LineDashedIcon },
  recommendation: { family: 'interpreted', tone: 'primary', border: 'solid', Icon: IdeaIcon },
  hypothesis: { family: 'interpreted', tone: 'neutral', border: 'dashed', Icon: HelpIcon },
  'not-configured': { family: 'unavailable', tone: 'neutral', border: 'dashed', Icon: PendingIcon },
  'no-telemetry': { family: 'unavailable', tone: 'neutral', border: 'dashed', Icon: UnavailableIcon },
  'no-permission': { family: 'unavailable', tone: 'neutral', border: 'dashed', Icon: LockIcon },
  // A query in flight and a query that failed are *not knowing*, not a finding: neutral and
  // dashed like every absence. A failed read is a limit of the review, so it is not red.
  loading: { family: 'unavailable', tone: 'neutral', border: 'dashed', Icon: RefreshIcon },
  failed: { family: 'unavailable', tone: 'neutral', border: 'dashed', Icon: WarningFailedIcon },
};

/**
 * The registry — the one place that says how each provenance class looks.
 * `engine.test.ts` asserts that every `Provenance` has an entry, that no two
 * classes share an icon, and that colour is never the only channel.
 */
export const EVIDENCE = Object.fromEntries(
  (Object.keys(STYLE) as Provenance[]).map((provenance) => [
    provenance,
    {
      provenance,
      ...STYLE[provenance],
      labelKey: PROVENANCE_META[provenance].labelKey,
      descriptionKey: PROVENANCE_META[provenance].descriptionKey,
    },
  ]),
) as Record<Provenance, EvidenceClass>;

/** Provenance classes in the order a legend should list them. */
export const EVIDENCE_ORDER: readonly Provenance[] = [
  'observed',
  'derived',
  'partial',
  'platform-estimate',
  'projection',
  'recommendation',
  'hypothesis',
  'not-configured',
  'no-telemetry',
  'no-permission',
  'loading',
  'failed',
];

/**
 * The `data-evidence` attribute a card carries, so the stylesheet can draw the
 * dashed border. Absent for a firm fact, which keeps the default solid edge; the
 * three "unavailable" classes collapse into one.
 */
export function evidenceAttribute(
  provenance: Provenance,
): 'estimated' | 'hypothesis' | 'unavailable' | undefined {
  if (EVIDENCE[provenance].family === 'unavailable') return 'unavailable';
  // The three approximations share one dashed border; the stylesheet keys on the family name.
  if (provenance === 'partial' || provenance === 'platform-estimate' || provenance === 'projection') return 'estimated';
  if (provenance === 'hypothesis') return 'hypothesis';
  return undefined;
}
