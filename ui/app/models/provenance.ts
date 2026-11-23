/**
 * Provenance model.
 *
 * Implements the non-negotiable rule of this app: every number, statement and
 * conclusion carries where it came from, so the audience can always tell an
 * observation apart from an interpretation.
 *
 * This is deliberately expressed in the type system rather than as a naming
 * convention: a KPI cannot be rendered without declaring its provenance,
 * because `KpiTile` requires a `Fact<T>`.
 */

/** How a displayed value came to exist. Never widen this union casually. */
export type Provenance =
  /** Measured by the platform and read back verbatim from Grail. */
  | 'observed'
  /** Deterministic arithmetic over observed values (ratios, sums, deltas). */
  | 'derived'
  /** A lower bound: the read stopped early (scan limit) or a list reached its limit, so the real figure is at least this. */
  | 'partial'
  /** A count the platform itself reports as an estimate, with no exact source behind it. */
  | 'platform-estimate'
  /** Calculated from assumptions the reader can see and change (rates, baselines): a projection, not a measurement. */
  | 'projection'
  /** Suggested action. Not a finding. */
  | 'recommendation'
  /** Plausible reading of the data that still needs validation. */
  | 'hypothesis'
  /** The capability exists but is not configured in this environment. */
  | 'not-configured'
  /** The capability is configured but produced no telemetry in scope. */
  | 'no-telemetry'
  /** The signed-in identity lacks the scope required to read the source. */
  | 'no-permission'
  /** The query is still running: there is no answer yet, which is not an answer of "nothing". */
  | 'loading'
  /** The query failed for a reason other than permission: the value could not be read. */
  | 'failed';

export type Confidence = 'high' | 'medium' | 'low';

/**
 * Traceability anchor. Every fact must be reducible to one of these so a
 * technical reviewer can re-run the exact query behind a slide.
 */
export interface EvidenceRef {
  /** Stable id in the DQL catalog (see `queries/catalog.ts`). */
  queryId: string;
  /** Grail table or entity type actually read. */
  source: string;
  /** Buckets explicitly addressed, when the query scopes them. */
  buckets?: readonly string[];
  /** Human-readable analysis window, e.g. "last 24 h". */
  timeframe: string;
  /** ISO timestamp of when this app read the value. */
  collectedAt?: string;
}

/**
 * A value plus its epistemic status. The unit is carried alongside the number
 * because a figure without a unit is not evidence.
 */
export interface Fact<T> {
  value: T;
  provenance: Provenance;
  confidence: Confidence;
  /** Unit of `value` as reported by the source. Required for any quantity. */
  unit?: string;
  evidence?: EvidenceRef;
  /** Caveat shown next to the value. Use for anything the audience must know. */
  note?: string;
}

/** Absence of a value is itself information, and must not read as a zero. */
export type Unavailable = Fact<null> & {
  provenance: 'not-configured' | 'no-telemetry' | 'no-permission' | 'loading' | 'failed';
  /** What would have to change for this to become available. */
  requirement?: string;
};

/**
 * Why a value is missing, as dictionary keys.
 *
 * These used to be English strings. They are rendered by every tile in the app,
 * so a customer reading a Portuguese screen saw *"Requires additional
 * configuration or source"* under a translated label. The scanner never caught
 * it because `models/` was outside its scope until 0.7.0 — a string does not
 * become safe by being one function call away from the JSX.
 */
export const UNAVAILABLE_LABEL_KEY = {
  'not-configured': 'prov.unavailable.not-configured',
  'no-telemetry': 'prov.unavailable.no-telemetry',
  loading: 'prov.unavailable.loading',
  failed: 'prov.unavailable.failed',
  'no-permission': 'prov.unavailable.no-permission',
} as const satisfies Record<Unavailable['provenance'], string>;

/**
 * Dictionary keys for each provenance class.
 *
 * Holds keys rather than text, so the badge translates at render time and the
 * same `Fact` reads correctly in either language. How a class *looks* — its tone,
 * icon and border — lives in one place only: `engine/evidence.tsx`.
 */
export const PROVENANCE_META = {
  observed: {
    labelKey: 'prov.observed',
    descriptionKey: 'prov.desc.observed',
  },
  derived: {
    labelKey: 'prov.derived',
    descriptionKey: 'prov.desc.derived',
  },
  partial: {
    labelKey: 'prov.partial',
    descriptionKey: 'prov.desc.partial',
  },
  'platform-estimate': {
    labelKey: 'prov.platform-estimate',
    descriptionKey: 'prov.desc.platform-estimate',
  },
  projection: {
    labelKey: 'prov.projection',
    descriptionKey: 'prov.desc.projection',
  },
  recommendation: {
    labelKey: 'prov.recommendation',
    descriptionKey: 'prov.desc.recommendation',
  },
  hypothesis: {
    labelKey: 'prov.hypothesis',
    descriptionKey: 'prov.desc.hypothesis',
  },
  'not-configured': {
    labelKey: 'prov.not-configured',
    descriptionKey: 'prov.desc.not-configured',
  },
  'no-telemetry': {
    labelKey: 'prov.no-telemetry',
    descriptionKey: 'prov.desc.no-telemetry',
  },
  'no-permission': {
    labelKey: 'prov.no-permission',
    descriptionKey: 'prov.desc.no-permission',
  },
  loading: {
    labelKey: 'prov.loading',
    descriptionKey: 'prov.desc.loading',
  },
  failed: {
    labelKey: 'prov.failed',
    descriptionKey: 'prov.desc.failed',
  },
} as const satisfies Record<
  Provenance,
  { labelKey: string; descriptionKey: string }
>;

export const CONFIDENCE_META = {
  high: { labelKey: 'conf.high', descriptionKey: 'conf.desc.high' },
  medium: { labelKey: 'conf.medium', descriptionKey: 'conf.desc.medium' },
  low: { labelKey: 'conf.low', descriptionKey: 'conf.desc.low' },
} as const satisfies Record<Confidence, { labelKey: string; descriptionKey: string }>;

/** True when a fact carries no value and must render as an explicit gap. */
export function isUnavailable<T>(fact: Fact<T>): fact is Fact<T> & Unavailable {
  return (
    fact.value === null ||
    fact.provenance === 'not-configured' ||
    fact.provenance === 'no-telemetry' ||
    fact.provenance === 'no-permission' ||
    fact.provenance === 'loading' ||
    fact.provenance === 'failed'
  );
}

/** Builds an observed fact. Use only for values read straight from Grail. */
export function observed<T>(
  value: T,
  evidence: EvidenceRef,
  extra: { unit?: string; confidence?: Confidence; note?: string } = {},
): Fact<T> {
  return {
    value,
    provenance: 'observed',
    confidence: extra.confidence ?? 'high',
    unit: extra.unit,
    note: extra.note,
    evidence,
  };
}

/** Builds a derived fact. `note` should state the calculation performed. */
export function derived<T>(
  value: T,
  evidence: EvidenceRef,
  note: string,
  extra: { unit?: string; confidence?: Confidence } = {},
): Fact<T> {
  return {
    value,
    provenance: 'derived',
    confidence: extra.confidence ?? 'high',
    unit: extra.unit,
    note,
    evidence,
  };
}

function approximate<T>(
  provenance: 'partial' | 'platform-estimate' | 'projection',
  value: T,
  evidence: EvidenceRef,
  note: string,
  extra: { unit?: string; confidence?: Confidence },
): Fact<T> {
  return { value, provenance, confidence: extra.confidence ?? 'medium', unit: extra.unit, note, evidence };
}

/**
 * Builds a partial fact: a value that was really read but is a lower bound, because the read
 * stopped early (a scan limit) or a list reached its limit. `note` says which.
 */
export function partial<T>(
  value: T,
  evidence: EvidenceRef,
  note: string,
  extra: { unit?: string; confidence?: Confidence } = {},
): Fact<T> {
  return approximate('partial', value, evidence, note, extra);
}

/**
 * Builds a platform-estimate fact: Dynatrace reports the figure itself as an estimate (unique
 * users, for one) and offers no exact alternative. `note` says so.
 */
export function platformEstimate<T>(
  value: T,
  evidence: EvidenceRef,
  note: string,
  extra: { unit?: string; confidence?: Confidence } = {},
): Fact<T> {
  return approximate('platform-estimate', value, evidence, note, extra);
}

/**
 * Builds a projection fact: arithmetic over assumptions the reader supplied or can see (a rate,
 * a baseline). `note` states the calculation and the assumption.
 */
export function projection<T>(
  value: T,
  evidence: EvidenceRef,
  note: string,
  extra: { unit?: string; confidence?: Confidence } = {},
): Fact<T> {
  return approximate('projection', value, evidence, note, extra);
}

/** Builds an explicit gap. Never substitute a zero for one of these. */
export function unavailable(
  provenance: Unavailable['provenance'],
  requirement?: string,
  evidence?: EvidenceRef,
): Unavailable {
  return {
    value: null,
    provenance,
    confidence: 'high',
    requirement,
    evidence,
    // No note baked in: the reason is a dictionary key resolved by the tile, so
    // the same fact reads correctly in either language.
  };
}
