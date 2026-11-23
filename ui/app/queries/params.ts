import type { CatalogEntry, CatalogParamSpec, CatalogParamValue, CatalogParamValues } from './types';

/**
 * Parameterised catalog entries (TD-08, 3.3.2).
 *
 * Until 3.3.1 three places built DQL at run time outside the catalog (the RCA trail's callers, the
 * incident's logs and the evidence of the real-prints deck), because an id only known once Davis
 * answered had to reach the text. They are now catalog entries whose `dql` is a fixed template;
 * this module is the only code that turns a template into a query:
 *
 *  - every declared parameter must be given, and nothing else may be;
 *  - each value passes the strict validator of its kind (anchored patterns, entity type, list
 *    bounds) — a value that fails produces a refusal, never a query;
 *  - the validated value is quoted as a DQL string literal (`quoteDqlString`) and only then
 *    replaces its `{{name}}` placeholder.
 *
 * The validators admit only `[A-Z0-9_-]` and digits, so the quoting never changes a valid value:
 * the rendered text is byte-identical to what the 3.3.1 builders produced, which keeps their live
 * validations (2026-10-05) true. It is defence in depth, not the guard.
 */

/** An entity id as the platform writes it: an upper-case type, a dash, 16 upper-case hex digits. */
export const ENTITY_ID_PATTERN = /^([A-Z][A-Z0-9_]*)-[0-9A-F]{16}$/;

/** A Davis `event.id` (`1495944828232761706_1790117520000V2`). Its number is never a time. */
export const EVENT_ID_PATTERN = /^-?\d{1,20}_\d{13}V2$/;

/** `{{name}}` in a template. Names are identifiers; nothing else between the braces is a placeholder. */
const PLACEHOLDER = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;

/** No id the platform writes is longer than this; a longer string is refused before any pattern runs. */
const MAX_VALUE_LENGTH = 64;

export type ParamRefusalReason =
  /** A declared parameter was not given. */
  | 'missing'
  /** A value was given for a parameter the entry does not declare (or for an entry without parameters). */
  | 'unexpected'
  /** A list was given where a single value is expected, or the other way round. */
  | 'wrong-type'
  /** The value is empty, too long, or does not match its kind (quotes, pipes, newlines, names…). */
  | 'invalid'
  /** A list item is an entity of a type the parameter does not accept. */
  | 'wrong-entity-type'
  /** A list below its `minItems` (an empty list included). */
  | 'too-few'
  /** A list above its `maxItems`. */
  | 'too-many'
  /** The template names a placeholder the entry does not declare. */
  | 'template'
  /** The window is missing, unreadable, reversed or longer than the entry allows. */
  | 'window';

export interface ParamRefusal {
  /** The parameter that was refused (`window` for the window). */
  param: string;
  reason: ParamRefusalReason;
}

export type RenderResult = { ok: true; dql: string } | { ok: false; refusal: ParamRefusal };

/**
 * A DQL double-quoted string literal. Backslashes and quotes are escaped; a control character
 * (newline, tab, NUL…) is refused outright, because no validated value can contain one.
 */
export function quoteDqlString(value: string): string {
  // eslint-disable-next-line no-control-regex -- the control range is exactly what is refused
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error('A DQL parameter cannot contain a control character.');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** The entity type of a valid id (`SERVICE`), or null for anything that is not one. */
function entityTypeOf(value: string): string | null {
  const match = ENTITY_ID_PATTERN.exec(value);
  return match === null ? null : (match[1] ?? null);
}

function checkSingle(spec: CatalogParamSpec, value: unknown): ParamRefusalReason | null {
  if (typeof value !== 'string') return 'wrong-type';
  if (value.length === 0 || value.length > MAX_VALUE_LENGTH) return 'invalid';
  if (spec.kind === 'eventId') return EVENT_ID_PATTERN.test(value) ? null : 'invalid';
  const type = entityTypeOf(value);
  if (type === null) return 'invalid';
  if (spec.entityType !== undefined && type !== spec.entityType) return 'wrong-entity-type';
  return null;
}

/** The validation of one value against its spec: null when it may reach the query. */
export function validateParam(spec: CatalogParamSpec, value: CatalogParamValue | undefined): ParamRefusalReason | null {
  if (value === undefined) return 'missing';
  if (spec.kind !== 'entityIdList') return Array.isArray(value) ? 'wrong-type' : checkSingle(spec, value);
  if (!Array.isArray(value)) return 'wrong-type';
  if (value.length < Math.max(1, spec.minItems)) return 'too-few';
  if (value.length > spec.maxItems) return 'too-many';
  for (const item of value) {
    const reason = checkSingle({ kind: 'entityId', entityType: spec.entityType, description: spec.description }, item);
    if (reason !== null) return reason;
  }
  return null;
}

function renderValue(spec: CatalogParamSpec, value: CatalogParamValue): string {
  if (spec.kind === 'entityIdList') return (value as readonly string[]).map(quoteDqlString).join(spec.separator);
  return quoteDqlString(value as string);
}

/** The placeholder names a template uses, in order of first appearance. */
export function placeholdersOf(template: string): string[] {
  return [...new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? ''))];
}

const own = (values: object, key: string) => Object.prototype.hasOwnProperty.call(values, key);

/**
 * The query an entry runs with these values, or the refusal that stops it. An entry without
 * parameters returns its own text unchanged, and refuses any value it is given.
 */
export function renderCatalogDql(entry: Pick<CatalogEntry, 'dql' | 'params'>, values?: CatalogParamValues | null): RenderResult {
  const given = values ?? {};
  const specs = entry.params ?? {};
  for (const key of Object.keys(given)) {
    if (!own(specs, key)) return { ok: false, refusal: { param: key, reason: 'unexpected' } };
  }
  const rendered = new Map<string, string>();
  for (const [name, spec] of Object.entries(specs)) {
    const value = own(given, name) ? given[name] : undefined;
    const reason = validateParam(spec, value);
    if (reason !== null) return { ok: false, refusal: { param: name, reason } };
    rendered.set(name, renderValue(spec, value as CatalogParamValue));
  }
  for (const name of placeholdersOf(entry.dql)) {
    if (!rendered.has(name)) return { ok: false, refusal: { param: name, reason: 'template' } };
  }
  return { ok: true, dql: entry.dql.replace(PLACEHOLDER, (_, name: string) => rendered.get(name) as string) };
}

/** The rendered text, or null when the values are refused: for pure builders that only need the text. */
export function renderOrNull(entry: Pick<CatalogEntry, 'dql' | 'params'>, values?: CatalogParamValues | null): string | null {
  const result = renderCatalogDql(entry, values);
  return result.ok ? result.dql : null;
}

/**
 * A stable key for a set of values, so a hook can memoise on it while callers rebuild their arrays
 * on every render. Only own string / string-array values are kept; the order of keys is fixed.
 */
export function paramsKey(values?: CatalogParamValues | null): string {
  if (values === undefined || values === null) return '';
  const keys = Object.keys(values).sort();
  return JSON.stringify(keys.map((key) => [key, values[key]]));
}
