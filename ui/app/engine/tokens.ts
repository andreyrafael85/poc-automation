import Borders from '@dynatrace/strato-design-tokens/borders';
import BoxShadows from '@dynatrace/strato-design-tokens/box-shadows';
import Colors from '@dynatrace/strato-design-tokens/colors';
import Easings from '@dynatrace/strato-design-tokens/easings';
import Spacings from '@dynatrace/strato-design-tokens/spacings';
import Timings from '@dynatrace/strato-design-tokens/timings';

import type { Tone } from '../design/palette';

/**
 * Value Evidence Experience — design tokens for the app.
 *
 * ## What this file is
 *
 * The only place where the app decides *which* Strato token plays *which* role.
 * Components and the engine stylesheet never reach for a colour, a radius or a
 * duration on their own: they ask for a role here (`TONE.warning.container`,
 * `MOTION.quick`) and the role resolves to an official token. When Strato ships a
 * new release, or the app changes its mind about a role, it changes in one file.
 *
 * ## Why not a parallel palette
 *
 * Every value is a Strato design token, so it follows the user's light/dark
 * theme and the platform's own visual refresh without a second palette to
 * maintain. `design/palette.ts` still owns the *chart* language (colour by what a
 * chart measures); this file owns the *surface* language (what a card, a rail, a
 * callout and a focus ring look like).
 *
 * Decoration never carries meaning: tone here is semantic, and the engine pairs
 * every semantic colour with an icon, a label or a border style, so no meaning is
 * ever conveyed by colour alone.
 */

/** The five steps of the Strato spacing scale this app uses, and nothing else. */
export const SPACE = {
  /** Between elements inside one card. */
  tight: Spacings.Size8,
  /** Between cards in a group. */
  group: Spacings.Size16,
  /** Between sections of a page. */
  section: Spacings.Size24,
  /** Between narrative blocks (story stages) of a long page. */
  chapter: Spacings.Size40,
} as const;

/**
 * The same four steps as plain numbers, for the Strato layout props that take a
 * pixel number (`gap`, `padding`). Each equals the matching `Spacings.Size*`
 * token; the engine stylesheet uses the token itself.
 */
export const SPACE_PX = {
  tight: 8,
  group: 16,
  section: 24,
  chapter: 40,
} as const;

export const RADIUS = {
  surface: Borders.Radius.Surface.Default,
  surfaceSubdued: Borders.Radius.Surface.Subdued,
  container: Borders.Radius.Container.Default,
  containerSubdued: Borders.Radius.Container.Subdued,
} as const;

export const BORDER = {
  width: Borders.Width.Default,
  widthEmphasized: Borders.Width.Emphasized,
  styleSolid: Borders.Style.Default,
  styleDashed: Borders.Style.Dashed,
} as const;

export const SHADOW = {
  rest: BoxShadows.Surface.Flat.Rest,
  hover: BoxShadows.Surface.Flat.Hover,
  raised: BoxShadows.Surface.Raised.Rest,
} as const;

/**
 * Motion. Short, consistent and never decorative: movement acknowledges an
 * interaction (hover, focus, a value settling) and is switched off entirely under
 * `prefers-reduced-motion` by the engine stylesheet.
 */
export const MOTION = {
  quick: Timings.Fast.Quick,
  base: Timings.Fast.Default,
  settle: Timings.Base.Default,
  ease: Easings.FastInSlowOut,
} as const;

export const SURFACE = {
  base: Colors.Background.Base.Default,
  surface: Colors.Background.Surface.Default,
  subdued: Colors.Background.Container.Neutral.Subdued,
  muted: Colors.Background.Container.Neutral.Default,
  border: Colors.Border.Neutral.Default,
  borderSubdued: Colors.Border.Neutral.Subdued,
  text: Colors.Text.Neutral.Default,
  textSubdued: Colors.Text.Neutral.Subdued,
  textOnAccent: Colors.Text.Neutral.OnAccent.Default,
} as const;

interface ToneTokens {
  /** Text and icon colour for this tone, on a surface. */
  text: string;
  /** Hairline border. */
  border: string;
  /** Strong border, used for rails and focus. */
  borderAccent: string;
  /** Soft fill for a callout or chip body. */
  container: string;
  /** Slightly stronger fill. */
  containerEmphasized: string;
  /** Solid accent fill (a rail, a progress bar). */
  accent: string;
}

/**
 * Semantic tones resolved from Strato tokens.
 *
 * Amber (`warning`) and red (`critical`) remain reserved, exactly as in
 * `design/palette.ts`: they mark a measured condition worth reviewing or a
 * measured fault, never "the app could not read it" and never a headline.
 */
export const TONE: Record<Tone, ToneTokens> = {
  neutral: {
    text: Colors.Text.Neutral.Default,
    border: Colors.Border.Neutral.Default,
    borderAccent: Colors.Border.Neutral.Accent,
    container: Colors.Background.Container.Neutral.Default,
    containerEmphasized: Colors.Background.Container.Neutral.Emphasized,
    accent: Colors.Background.Container.Neutral.Accent,
  },
  primary: {
    text: Colors.Text.Primary.Default,
    border: Colors.Border.Primary.Default,
    borderAccent: Colors.Border.Primary.Accent,
    container: Colors.Background.Container.Primary.Default,
    containerEmphasized: Colors.Background.Container.Primary.Emphasized,
    accent: Colors.Background.Container.Primary.Accent,
  },
  success: {
    text: Colors.Text.Success.Default,
    border: Colors.Border.Success.Default,
    borderAccent: Colors.Border.Success.Accent,
    container: Colors.Background.Container.Success.Default,
    containerEmphasized: Colors.Background.Container.Success.Emphasized,
    accent: Colors.Background.Container.Success.Accent,
  },
  warning: {
    text: Colors.Text.Warning.Default,
    border: Colors.Border.Warning.Default,
    borderAccent: Colors.Border.Warning.Accent,
    container: Colors.Background.Container.Warning.Default,
    containerEmphasized: Colors.Background.Container.Warning.Emphasized,
    accent: Colors.Background.Container.Warning.Accent,
  },
  critical: {
    text: Colors.Text.Critical.Default,
    border: Colors.Border.Critical.Default,
    borderAccent: Colors.Border.Critical.Accent,
    container: Colors.Background.Container.Critical.Default,
    containerEmphasized: Colors.Background.Container.Critical.Emphasized,
    accent: Colors.Background.Container.Critical.Accent,
  },
};

/**
 * Viewport breakpoints, mirroring `Breakpoints.Max.*` from the design tokens.
 *
 * A CSS `@media` query cannot read a custom property, so the engine stylesheet
 * repeats these two numbers. `engine.test.ts` fails if they ever drift from the
 * token defaults, which is what keeps the repetition honest.
 */
export const BREAKPOINT = {
  /** Tablet and below. The navigation becomes a drawer; two-column layouts stack. */
  tablet: 960,
  /** Mobile. Tables scroll, figures stack, controls condense. */
  mobile: 640,
} as const;
