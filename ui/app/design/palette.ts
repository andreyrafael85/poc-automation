import Colors from '@dynatrace/strato-design-tokens/colors';

/**
 * The app's visual language, in one place.
 *
 * ## Why this exists
 *
 * Charts were being coloured chart-by-chart. Each one picked whatever Strato
 * defaulted to, so a viewer moving between tabs saw the same kind of quantity
 * drawn in a different colour every time, and no colour meant anything. Scattered
 * charts with unrelated palettes read as a pile of widgets rather than one
 * analysis.
 *
 * The fix is to colour by **what the chart is measuring**, not by where it
 * happens to sit. Every ranked count in the app is the same blue ramp, every
 * duration is petrol, every throughput is turquoise. After two tabs the audience
 * has learned the language without being told it.
 *
 * ## Why tokens and not hex
 *
 * Every value here resolves to a Strato CSS custom property, so the palette
 * follows the user's light or dark theme and stays consistent with the rest of
 * the Dynatrace UI. Hardcoding hex would look correct in one theme and wrong in
 * the other, and would drift from the platform on the next Strato release.
 *
 * ## Colour discipline
 *
 * Amber and red are reserved for a measurement that genuinely is a problem in
 * the customer's estate. They are never used for "this app could not read it",
 * for a scope statement, or for a headline. A customer reading red concludes
 * their environment is on fire; that conclusion has to be earned.
 */

/** Strato's tone vocabulary, used by Chip, Container and HealthIndicator. */
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'critical';

/**
 * Semantic tones. Prefer these over literal tone strings at call sites, so a
 * change of policy is one edit rather than a search.
 */
export const PALETTE = {
  /** A genuinely good measured result. */
  good: 'success',
  /** Informational context. The default for anything that is not a fault. */
  info: 'primary',
  /** Absence of a conclusion: not measured, not in scope, not permitted. */
  absent: 'neutral',
  /** A measured condition in the estate that is worth reviewing. */
  review: 'warning',
  /** A measured fault. Reserved. */
  fault: 'critical',
} as const satisfies Record<string, Tone>;

const seq = Colors.Charts.Sequential;

/** Reads a sequential ramp from light to dark, `count` stops. */
function ramp(family: Record<string, { Default: string }>, count: number): string[] {
  const keys = Object.keys(family)
    .filter((key) => key.startsWith('Color'))
    .sort();
  if (keys.length === 0) return [];

  // Skip the darkest one or two stops: at chart scale they read as black and
  // lose the sense of a ramp.
  const usable = keys.slice(1);
  const step = Math.max(1, Math.floor(usable.length / count));
  const picked: string[] = [];
  for (let index = 0; index < usable.length && picked.length < count; index += step) {
    const key = usable[index];
    if (key !== undefined) picked.push(family[key]!.Default);
  }
  return picked;
}

/**
 * What a chart is measuring.
 *
 * Choosing a role is the only colour decision a page makes. Everything else
 * follows from it, which is what keeps the tabs coherent.
 */
export type ChartRole =
  /** A ranked count: top entities, recurrence, restarts, occurrences. */
  | 'magnitude'
  /** Unordered kinds: problem categories, service types, severities. */
  | 'category'
  /** Elapsed time: MTTR, response time, age. */
  | 'duration'
  /** Throughput: requests, records, executions. */
  | 'volume'
  /** Something measured that is worth reviewing. Uses amber deliberately. */
  | 'exposure';

/**
 * Colour ramps per role, resolved from design tokens.
 *
 * Six stops each: enough for a top-10 chart to stay legible, few enough that
 * neighbouring bars remain distinguishable.
 */
export const CHART_PALETTE: Record<ChartRole, string[]> = {
  magnitude: ramp(seq.Blue, 6),
  // 3.4.16 (design proposal D-01): Categorical Vivid, the platform's newer categorical palette (tokens 1.7.0+) — the
  // one Dynatrace dashboards use and the most robust under colour-vision deficiency of those measured (§3 of
  // docs/v3.4/PROPOSTA-DESIGN-STRATO-3.18.md); in its own order, never cycled past six (a seventh kind is "Other").
  category: [
    Colors.Charts.CategoricalVivid.Color01.Default,
    Colors.Charts.CategoricalVivid.Color02.Default,
    Colors.Charts.CategoricalVivid.Color03.Default,
    Colors.Charts.CategoricalVivid.Color04.Default,
    Colors.Charts.CategoricalVivid.Color05.Default,
    Colors.Charts.CategoricalVivid.Color06.Default,
  ],
  duration: ramp(seq.Petrol, 6),
  volume: ramp(seq.Turquoise, 6),
  exposure: ramp(seq.Orange, 6),
};

/**
 * The palette to hand a Strato chart's `colorPalette` prop.
 *
 * Returns a plain array, which Strato treats as a `CustomColorPalette` and
 * cycles through in series order.
 */
export function paletteFor(role: ChartRole): string[] {
  return CHART_PALETTE[role];
}

/**
 * A **named** sequential palette per role, for continuous-value charts.
 *
 * A value-coloured chart (a numeric HoneycombChart, a TreeMap) builds a
 * continuous scale, not a per-series cycle. Handing it a plain array of colour
 * strings makes Strato try to attach range metadata to a string and throw
 * ("Cannot create property 'color' on string …"). These charts need a named
 * sequential palette instead. Kept here so colour still comes from one place and
 * the chart scanner (which looks for `paletteFor`) still recognises it.
 */
export function paletteForScale(
  role: ChartRole,
): 'blue' | 'categorical' | 'petrol' | 'turquoise' | 'orange' {
  const named = {
    magnitude: 'blue',
    category: 'categorical',
    duration: 'petrol',
    volume: 'turquoise',
    exposure: 'orange',
  } as const;
  return named[role];
}

/**
 * Capacity classes (`models/capacity.ts`) as colours. The verdict chip, the capacity bars and
 * the host map all read this one table, so a host at its ceiling is the same red everywhere.
 * Red is earned by a measured fault, amber by a condition worth reviewing; room to reclaim is
 * an opportunity (primary), and "not measured" is neutral.
 */
export const CAPACITY_COLOR: Record<'saturated' | 'pressured' | 'balanced' | 'oversized' | 'unknown', string> = {
  saturated: Colors.Border.Critical.Accent,
  pressured: Colors.Border.Warning.Accent,
  balanced: Colors.Border.Success.Accent,
  oversized: Colors.Border.Primary.Accent,
  unknown: Colors.Border.Neutral.Accent,
};

/**
 * Failure bands of a service (3.2.3, the Services honeycomb): no failure, under the 1 % line,
 * between the 1 % and 5 % lines, and above 5 % — the two review lines of the assumptions registry
 * (`services.failure.good` / `.attention`).
 *
 * 3.2.6 made it a traffic light (green, yellow under 1 %, orange, red). 3.4.16 (design proposal D-10, the owner's
 * order to follow the recommendations): the platform's "Status and health" scale — Ideal (green) for no failure,
 * Good (blue) under the 1 % line, Warning from 1 % and Critical from 5 % — so a page where most services sit under
 * the line no longer reads as a page of warnings; the band is always named in words beside the colour.
 */
export const FAILURE_BAND_COLOR: Record<'none' | 'under' | 'review' | 'high', string> = {
  none: Colors.Charts.Status.Ideal.Default,
  under: Colors.Charts.Status.Good.Default,
  review: Colors.Charts.Status.Warning.Default,
  high: Colors.Charts.Status.Critical.Default,
};

/** Log status colours of the platform (error, warning, info, none), for the log severity mix. */
export const LOG_STATUS_COLOR: Record<'ERROR' | 'WARN' | 'INFO' | 'NONE', string> = {
  ERROR: Colors.Charts.Logstatus.Error.Default,
  WARN: Colors.Charts.Logstatus.Warning.Default,
  INFO: Colors.Charts.Logstatus.Info.Default,
  NONE: Colors.Charts.Logstatus.None.Default,
};

/**
 * A categorical palette keyed by the displayed class names, for a chart coloured by class (a
 * categorical HoneycombChart). The colours still come from a table in this file.
 */
export function paletteForClasses<K extends string>(
  classes: readonly K[],
  name: (klass: K) => string,
  colors: Record<K, string>,
): Record<string, string> {
  return Object.fromEntries(classes.map((klass) => [name(klass), colors[klass]]));
}

/** Accent colour for a role, for a single-series chart or a highlight. */
export function accentFor(role: ChartRole): string {
  return CHART_PALETTE[role][0] ?? Colors.Charts.Categorical.Color01.Default;
}

/**
 * Vulnerability severity, ordered worst-first, with a token colour each.
 *
 * Severity is the one place a four-step red→blue scale carries meaning rather
 * than decoration, so it gets its own named colours instead of a role ramp. Since
 * 3.2.1 they are Strato's security risk-level chart colours, the ones the platform's
 * own security apps use, so a severity here looks like a severity there. All resolve
 * to Strato tokens, so the scale follows the theme like everything else.
 */
export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: Colors.Charts.SecurityRiskLevel.Critical.Default,
  HIGH: Colors.Charts.SecurityRiskLevel.High.Default,
  MEDIUM: Colors.Charts.SecurityRiskLevel.Medium.Default,
  LOW: Colors.Charts.SecurityRiskLevel.Low.Default,
};

/**
 * Core Web Vitals / experience rating colours.
 *
 * Green / amber / red is the one place a traffic-light scale is exactly right,
 * because a web vital is graded against a published threshold, not an opinion.
 * `no-data` stays neutral so a missing signal never reads as a pass or a fail.
 */
export const RATING_COLOR: Record<'good' | 'needs-improvement' | 'poor' | 'no-data', string> = {
  good: 'var(--dt-colors-text-success-default)',
  'needs-improvement': 'var(--dt-colors-text-warning-default)',
  poor: 'var(--dt-colors-text-critical-default)',
  'no-data': 'var(--dt-colors-text-neutral-subdued)',
};



/**
 * Tone for a chart's role chip.
 *
 * The chip is small and precise, which is exactly why it carries the colour
 * rather than the whole frame. Tinting an entire chart card by role looked
 * loud in review and, worse, put amber behind a chart that had found nothing
 * wrong. A coloured chip beside a neutral frame gives the same grouping signal
 * without shouting.
 */
export const ROLE_TONE: Record<ChartRole, Tone> = {
  magnitude: 'primary',
  category: 'neutral',
  duration: 'primary',
  volume: 'success',
  // The only role that maps onto amber, and only because "worth reviewing" is
  // what the role means.
  exposure: 'warning',
};

/**
 * Brand accent for the customer's own name.
 *
 * The engagement chip was always Dynatrace blue. For a customer whose brand is
 * orange — Itaú was the example given — a blue chip beside their orange logo
 * reads as someone else's app with their name pasted on it.
 *
 * These twelve are read from the Strato categorical and sequential token
 * families, so they follow the user's theme and stay inside the platform's own
 * colour space. Anything a customer picks here is decoration on their own name
 * and nothing else: it is deliberately not reachable from any tone that carries
 * meaning, so a brand choice can never make a finding look worse or better than
 * it is.
 */
export type BrandTone =
  | 'default'
  | 'blue'
  | 'orange'
  | 'red'
  | 'magenta'
  | 'pink'
  | 'purple'
  | 'petrol'
  | 'turquoise'
  | 'moss'
  | 'yellow'
  | 'brown'
  | 'grey';

const mid = (family: Record<string, { Default: string }>): string =>
  family['Color05']?.Default ?? family['Color04']?.Default ?? '';

export const BRAND_COLOR: Record<BrandTone, string> = {
  // `default` inherits the app's own accent rather than asserting a brand.
  default: Colors.Charts.Categorical.Color01.Default,
  blue: mid(seq.Blue),
  orange: mid(seq.Orange),
  red: mid(seq.Red),
  magenta: mid(seq.Magenta),
  pink: mid(seq.Pink),
  purple: mid(seq.Purple),
  petrol: mid(seq.Petrol),
  turquoise: mid(seq.Turquoise),
  moss: mid(seq.Moss),
  yellow: mid(seq.Yellow),
  brown: mid(seq.Brown),
  grey: mid(seq.Grey),
};

/** Order shown in the picker. `default` first, then warm to cool. */
export const BRAND_TONES: readonly BrandTone[] = [
  'default',
  'blue',
  'petrol',
  'turquoise',
  'moss',
  'yellow',
  'orange',
  'brown',
  'red',
  'pink',
  'magenta',
  'purple',
  'grey',
];

/**
 * Vertical rhythm.
 *
 * Pages were mixing gaps of 8, 12, 16 and 24 with no rule, which is the other
 * half of why the app read as scattered. These three values are the only ones a
 * page should use.
 */
export const RHYTHM = {
  /** Between elements inside one card. */
  tight: 8,
  /** Between cards in a group. */
  group: 16,
  /** Between sections of a page. */
  section: 24,
} as const;
