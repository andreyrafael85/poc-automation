/**
 * DQL catalog contract.
 *
 * Every query in this app is a catalog entry. Nothing queries Grail outside of
 * `queries/catalog.ts`, which keeps three promises enforceable:
 *
 *  1. No DQL is ever assembled from user input (windows travel as request fields
 *     such as `defaultTimeframeStart`, never as string concatenation). An entry that
 *     needs an id (TD-08, 3.3.2) declares it as a typed parameter: the value is checked
 *     by a strict validator and quoted before it fills a `{{name}}` placeholder of a
 *     fixed template, and a value that fails never produces a query.
 *  2. Every query has a recorded execution against a real environment before it
 *     is allowed to back a visualization.
 *  3. Cost is a first-class property, not an afterthought.
 */

export type QueryShape = 'scalar' | 'table' | 'timeseries';

export type Domain =
  | 'coverage'
  | 'problems'
  | 'topology'
  | 'services'
  | 'infrastructure'
  | 'cloud'
  | 'kubernetes'
  | 'processes'
  | 'logs'
  | 'consumption'
  | 'automation'
  | 'security'
  | 'experience'
  | 'business'
  | 'competitor';

/**
 * Result of executing a query against a real environment. Recorded by hand from
 * `QUERY_EXECUTION_EVENT`, which is the platform's own accounting of the query -
 * not this app's estimate of it.
 */
export interface ValidationRecord {
  /** ISO date of the validation run. */
  validatedOn: string;
  /** Environment id the query was validated in. Never a full tenant URL. */
  environmentId: string;
  /** Wall-clock duration reported by the platform, when captured. */
  durationMs: number | null;
  /** On-demand bytes scanned, as billed. `0` means the query scans no Grail data. */
  scannedBytesOnDemand: number | null;
  /** Records delivered during validation. Documents the expected result size. */
  records: number;
  outcome: 'ok' | 'empty' | 'no-permission';
  notes?: string;
}

/** Request-level guards. These are Grail API fields, not DQL text. */
export interface RequestGuards {
  /** Hard ceiling on scanned data. Reaching it is a UI state, not "no data". */
  scanLimitGbytes?: number;
  maxResultRecords?: number;
  fetchTimeoutSeconds?: number;
}

/**
 * How a query is scoped in time. `global` follows the app's timeframe selector;
 * a relative window pins queries whose meaning depends on a specific range; an anchored
 * window (3.2.5) follows the PoC's own start date from Settings — `poc` from that day to now,
 * `poc-day0` that first day alone — and the query does not run until a start date is set.
 */
export type TimeframePolicy =
  | 'global'
  | { relative: string; label: string }
  | { anchor: 'poc' | 'poc-day0'; label: string }
  | CallerWindowPolicy;

/**
 * TD-08 (3.3.2): the reading screen computes the absolute window (the incident's padded window, a
 * screenshot's window, the problem's) and passes it to `useCatalogQuery`. `maxMs` is the longest
 * window the query may read: a longer one is refused, never run. `label` is a dictionary key.
 */
export interface CallerWindowPolicy {
  caller: true;
  maxMs: number;
  label: string;
}

/**
 * A typed parameter of a catalog entry (TD-08). Each kind has one strict validator in
 * `queries/params.ts`; the validated value is quoted as a DQL string literal before it replaces
 * `{{name}}` in the template. Nothing but these kinds can reach DQL text.
 */
export type CatalogParamSpec =
  /** A Davis `event.id` (`1495944828232761706_1790117520000V2`). */
  | { kind: 'eventId'; description: string }
  /** An entity id (`SERVICE-0123456789ABCDEF`), optionally of one entity type only. */
  | { kind: 'entityId'; entityType?: string; description: string }
  /** A bounded list of entity ids, rendered quoted and joined by `separator`. */
  | { kind: 'entityIdList'; entityType?: string; minItems: number; maxItems: number; separator: ',' | ', '; description: string };

export type CatalogParamValue = string | readonly string[];
export type CatalogParamValues = Readonly<Record<string, CatalogParamValue>>;

export interface CatalogEntry {
  id: string;
  domain: Domain;
  /** What decision this query supports. If you cannot state it, drop the query. */
  purpose: string;
  /** The DQL text, or (with `params`) a fixed template whose `{{name}}` placeholders take the validated values. */
  dql: string;
  /** TD-08: the typed parameters of a template entry. Absent for every fixed query. */
  params?: Readonly<Record<string, CatalogParamSpec>>;
  shape: QueryShape;
  /** Strato component intended to render this shape. */
  visualization: string;
  /** Scope the signed-in identity must hold. Drives the no-permission state. */
  requiredScope: string;
  timeframe: TimeframePolicy;
  guards?: RequestGuards;
  validation: ValidationRecord;
}

export type Catalog = Readonly<Record<string, CatalogEntry>>;
