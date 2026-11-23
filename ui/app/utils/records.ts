/**
 * Safe access to Grail result records.
 *
 * Grail returns numbers as strings for 64-bit fields (counts arrive as `"67"`),
 * arrays for multi-valued entity attributes, and `null` for absent attributes.
 * Reading those shapes with plain property access is how a dashboard ends up
 * displaying "NaN" or, worse, a silent zero where data was actually missing.
 *
 * Every accessor here distinguishes "absent" from "zero".
 */

export type GrailRecord = Record<string, unknown>;

/**
 * Reads a numeric field. Returns `null` when the field is absent or unparseable,
 * never `0`, so callers cannot accidentally render a gap as a measurement.
 */
export function num(record: GrailRecord | undefined, field: string): number | null {
  if (!record) return null;
  const raw = record[field];
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Reads a string field, trimming and normalising empty values to `null`. */
export function str(record: GrailRecord | undefined, field: string): string | null {
  if (!record) return null;
  const raw = record[field];
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return null;
}

/** Reads a boolean field. Grail may deliver these as real booleans or strings. */
export function bool(record: GrailRecord | undefined, field: string): boolean | null {
  if (!record) return null;
  const raw = record[field];
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/**
 * Reads a multi-valued field. Entity attributes such as `affected_entity_names`
 * arrive as arrays; single values are normalised into a one-element list so
 * callers do not need to branch.
 */
export function list(record: GrailRecord | undefined, field: string): string[] {
  if (!record) return [];
  const raw = record[field];
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string | number => item !== null && item !== undefined && item !== '')
      .map((item) => String(item));
  }
  const single = str(record, field);
  return single === null ? [] : [single];
}

/**
 * Parses the `type:X,edition:Y,version:Z` encoding used by
 * `softwareTechnologies`. Literal `null` segments mean "not reported" and are
 * preserved as `null`, not as the string "null".
 */
export interface Technology {
  type: string;
  edition: string | null;
  version: string | null;
}

export function parseTechnology(raw: string | null): Technology | null {
  if (raw === null) return null;
  const parts = raw.split(',');
  const fields: Record<string, string> = {};
  for (const part of parts) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    fields[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  const type = fields.type;
  if (!type || type === 'null') return null;
  const normalise = (value: string | undefined) => (!value || value === 'null' ? null : value);
  return { type, edition: normalise(fields.edition), version: normalise(fields.version) };
}

/**
 * True for Dynatrace's own agent/runtime, which auto-discovery reports as a
 * process technology. It is not a finding about the customer's stack, so it is
 * excluded wherever discovered technologies are counted or shown.
 */
export function isDynatraceTechnology(type: string | null | undefined): boolean {
  return type !== null && type !== undefined && /dynatrace|oneagent/i.test(type);
}

/**
 * Percentage of a whole, returned with its denominator so the UI can show both.
 * A percentage without a denominator is not evidence.
 */
export interface Ratio {
  numerator: number;
  denominator: number;
  percent: number;
}

export function ratio(numerator: number | null, denominator: number | null): Ratio | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return { numerator, denominator, percent: (numerator / denominator) * 100 };
}

/** The pieces of a ratio's text that depend on the language. */
export interface RatioFormat {
  decimal: (value: number, digits: number) => string;
  count: (value: number) => string;
  /** "of" / "de", for "153 of 1,594,208". */
  of: string;
}

/** Defaults to English; the app passes the active locale's formatters (`useTranslation().formatRatio`). */
const ENGLISH: RatioFormat = {
  decimal: (value, digits) => value.toFixed(digits),
  count: (value) => value.toLocaleString('en-US'),
  of: 'of',
};

export function formatRatio(value: Ratio | null, digits = 1, format: RatioFormat = ENGLISH): string {
  if (value === null) return '—';
  return `${format.decimal(value.percent, digits)}% (${format.count(value.numerator)} ${format.of} ${format.count(value.denominator)})`;
}
