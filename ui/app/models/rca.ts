import { assumed } from '../config/assumptions';
import { renderQuery } from '../queries/catalog';
import { INCIDENT_LOG_MAX_IDS, INCIDENT_LOG_MAX_MS, INCIDENT_SIGNATURE_LIMIT } from '../queries/catalogTemplates';
import { bool, num, str, type GrailRecord } from '../utils/records';
import { redactText, stripControlChars } from '../utils/sanitize';

/**
 * Root-cause analysis model — the "War Room" data.
 *
 * Turns the measured `dt.davis.problems` feed into a single, richly-detailed
 * incident: the most impactful problem of the window (root-caused first, then by
 * breadth of affected entities, then by duration), with the Davis root-cause
 * entity, the affected/related entity trail, the Kubernetes context and the
 * markdown RCA narrative Davis wrote. Nothing is invented — a field the platform
 * did not populate is simply absent, and a window with no problems yields an
 * honest empty state. The selection rule is deterministic, so the page behaves
 * the same on any tenant the app is deployed to.
 */

/** Reads a string-array field from a Grail record (Davis returns real arrays). */
function strArray(record: GrailRecord | undefined, field: string): string[] {
  if (record === undefined) return [];
  const value = record[field];
  if (!Array.isArray(value)) return typeof value === 'string' && value !== '' ? [value] : [];
  return value.filter((item): item is string => typeof item === 'string' && item !== '');
}

export interface RcaIncident {
  displayId: string;
  name: string;
  category: string;
  status: string;
  severity: number | null;
  impactLevels: string[];
  affectedNames: string[];
  affectedTypes: string[];
  relatedNames: string[];
  affectedIds: string[];
  relatedIds: string[];
  rootCauseName: string | null;
  rootCauseId: string | null;
  eventId: string | null;
  startIso: string | null;
  endIso: string | null;
  durationNs: number | null;
  affectedCount: number;
  clusters: string[];
  namespaces: string[];
  workloads: string[];
  /** The markdown RCA narrative Davis produced, verbatim. */
  description: string | null;
}

export interface RcaKpi {
  total: number | null;
  rootCaused: number | null;
  active: number | null;
  resolved: number | null;
  avgAffected: number | null;
}

export interface RcaLogRow {
  namespace: string;
  errors: number;
  warnings: number;
  /** True when this namespace is one the selected incident touched. */
  matchesIncident: boolean;
}

/** Daily series (oldest → newest) behind the KPI sparklines. */
export interface RcaTrend {
  opened: number[];
  rootCaused: number[];
  avgAffected: number[];
}

/** A top error-log signature (first-line pattern) and how often it occurred. */
export interface RcaErrorSig {
  signature: string;
  count: number;
}

/** A Davis problem category and its count over the window. */
export interface RcaCatMix {
  category: string;
  count: number;
}

export interface RcaSummary {
  hasData: boolean;
  incident: RcaIncident | null;
  /** The next few impactful incidents, for a "major incidents" list. */
  others: RcaIncident[];
  kpi: RcaKpi;
  logs: RcaLogRow[];
  totalErrors: number;
  totalWarnings: number;
  trend: RcaTrend;
  /** Top error-log signatures in the environment (24h). */
  errorSignatures: RcaErrorSig[];
  /** Davis problem mix by category over the window. */
  categoryMix: RcaCatMix[];
  windowDays: number;
}

/** A parsed block of the Davis markdown narrative, for structured rendering. */
export type RcaNarrativeBlock =
  | { kind: 'heading' | 'label' | 'bullet' | 'text' | 'code'; text: string }
  /** A markdown table: a header row and body rows of plain cell text. */
  | { kind: 'table'; header: string[]; rows: string[][] };

/** `| a | b |` → ['a', 'b']; bold markers are dropped like everywhere else in the narrative. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.replace(/\*\*/g, '').trim());
}

/** `| --- | :---: |` — the row that makes the line above it a table header. */
const TABLE_SEPARATOR = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

/** 3.7.0: one problem record (the fields of rca.top / triage.problem) as an incident — also read by the PoC triage action. */
export function incidentFromRecord(record: GrailRecord): RcaIncident {
  return toIncident(record);
}

function toIncident(record: GrailRecord): RcaIncident {
  return {
    displayId: str(record, 'displayId') ?? '—',
    name: str(record, 'name') ?? '—',
    category: str(record, 'category') ?? '—',
    status: str(record, 'status') ?? '—',
    severity: num(record, 'severity'),
    impactLevels: strArray(record, 'impact'),
    affectedNames: strArray(record, 'affectedNames'),
    affectedTypes: strArray(record, 'affectedTypes'),
    relatedNames: strArray(record, 'relatedNames'),
    affectedIds: strArray(record, 'affectedIds'),
    relatedIds: strArray(record, 'relatedIds'),
    rootCauseName: str(record, 'rootCauseName'),
    rootCauseId: str(record, 'rootCauseId'),
    eventId: str(record, 'eventId'),
    startIso: str(record, 'start'),
    endIso: str(record, 'end'),
    durationNs: num(record, 'durationNs'),
    affectedCount: num(record, 'affectedCount') ?? strArray(record, 'affectedNames').length,
    clusters: strArray(record, 'cluster'),
    namespaces: strArray(record, 'namespace'),
    workloads: strArray(record, 'workload'),
    description: str(record, 'description'),
  };
}

export function summariseRca(
  topRecords: readonly GrailRecord[],
  kpiRecords: readonly GrailRecord[],
  logRecords: readonly GrailRecord[],
  windowDays = 15,
  trendRecords: readonly GrailRecord[] = [],
  sigRecords: readonly GrailRecord[] = [],
  catRecords: readonly GrailRecord[] = [],
  options: {
    /**
     * The window `rca.trend` was read over. When given, a daily bin that starts before the window
     * or ends after it is partial and left out (Q7, 3.2.3): a partial today made every sparkline
     * "fall" at its end, and a partial first day made it "rise" at its start.
     */
    trendWindow?: { startMs: number; endMs: number };
  } = {},
): RcaSummary {
  const incidents = topRecords.map(toIncident);
  const incident = incidents[0] ?? null;
  const others = incidents.slice(1, 6);

  const kpiRow = kpiRecords[0];
  const kpi: RcaKpi = {
    total: num(kpiRow, 'total'),
    rootCaused: num(kpiRow, 'rootCaused'),
    active: num(kpiRow, 'active'),
    resolved: num(kpiRow, 'resolved'),
    avgAffected: num(kpiRow, 'avgAffected'),
  };

  const incidentNamespaces = new Set((incident?.namespaces ?? []).map((n) => n.toLowerCase()));
  const logs: RcaLogRow[] = logRecords
    .map((record) => {
      const namespace = str(record, 'namespace') ?? '—';
      return {
        namespace,
        errors: num(record, 'errors') ?? 0,
        warnings: num(record, 'warnings') ?? 0,
        matchesIncident: incidentNamespaces.has(namespace.toLowerCase()),
      };
    })
    .filter((row) => row.errors > 0 || row.warnings > 0);
  const totalErrors = logs.reduce((sum, row) => sum + row.errors, 0);
  const totalWarnings = logs.reduce((sum, row) => sum + row.warnings, 0);

  // Keep the last 7 complete daily points.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const window = options.trendWindow;
  const completeDays =
    window === undefined || !Number.isFinite(window.startMs) || !Number.isFinite(window.endMs)
      ? trendRecords
      : trendRecords.filter((row) => {
          const day = Date.parse(str(row, 'day') ?? '');
          return !Number.isFinite(day) || (day >= window.startMs && day + DAY_MS <= window.endMs);
        });
  const series = (field: string): number[] => completeDays.map((row) => num(row, field) ?? 0).slice(-assumed('windows.trendDays'));
  const trend: RcaTrend = {
    opened: series('opened'),
    rootCaused: series('rootCaused'),
    avgAffected: series('avgAffected'),
  };

  const errorSignatures: RcaErrorSig[] = sigRecords
    .map((row) => ({ signature: str(row, 'signature') ?? '', count: num(row, 'count') ?? 0 }))
    .filter((row) => row.signature !== '' && row.count > 0);
  const categoryMix: RcaCatMix[] = catRecords
    .map((row) => ({ category: str(row, 'category') ?? '—', count: num(row, 'count') ?? 0 }))
    .filter((row) => row.count > 0);

  return {
    hasData: incident !== null,
    incident,
    others,
    kpi,
    logs,
    totalErrors,
    totalWarnings,
    trend,
    errorSignatures,
    categoryMix,
    windowDays,
  };
}

/**
 * Best-effort localization of the templated Dynatrace Intelligence narrative.
 *
 * The platform writes the problem description in the tenant's Davis language
 * (often English). These patterns translate the common templated sentences to
 * Portuguese while preserving every measured number; a line that matches no
 * pattern is left as the platform wrote it (honest, never invented).
 */
const NARRATIVE_PT: readonly (readonly [RegExp, string])[] = [
  [/^The problem affects (\d+) entities overall\.?$/i, 'O problema afeta $1 entidades no total.'],
  [/^A root-cause was detected\.?$/i, 'Uma causa raiz foi detectada'],
  [/^Following entities were affected by the problem:?$/i, 'As seguintes entidades foram afetadas pelo problema:'],
  [/^Service,\s*(.+)$/i, 'Serviço, $1'],
  [/^Info:\s*Unexpected high service load$/i, 'Info: Carga de serviço inesperadamente alta'],
  [/^Info:\s*Unexpected low service load$/i, 'Info: Carga de serviço inesperadamente baixa'],
  [/^Unexpected high service load$/i, 'Carga de serviço inesperadamente alta'],
  [/^Unexpected low service load$/i, 'Carga de serviço inesperadamente baixa'],
  [/^The service has experienced an unexpected increase in load to (.+?) req\/min within the last 30 minutes, surpassing the normal operating baseline \((.+?) req\/min\)\.?$/i, 'O serviço teve um aumento inesperado de carga para $1 req/min nos últimos 30 minutos, superando a linha de base normal ($2 req/min).'],
  [/^The service has experienced an unexpected decrease in load to (.+?) req\/min within the last 30 minutes, falling below the normal operating baseline \((.+?) req\/min\)\.?$/i, 'O serviço teve uma queda inesperada de carga para $1 req/min nos últimos 30 minutos, ficando abaixo da linha de base normal ($2 req/min).'],
  [/^Slowdown:\s*Response time degradation$/i, 'Lentidão: Degradação do tempo de resposta'],
  [/^Response time degradation$/i, 'Degradação do tempo de resposta'],
  [/^The current response time \((.+?)\) exceeds the auto-detected baseline \((.+?)\) by (.+?) ?%\.?$/i, 'O tempo de resposta atual ($1) excede a linha de base autodetectada ($2) em $3 %.'],
  [/^Endpoint (.+?) has a slowdown\.?$/i, 'O endpoint $1 apresenta lentidão.'],
  [/^\.\.\.\s*and (\d+) more affected entit(?:y|ies)\.?$/i, '... e mais $1 entidade(s) afetada(s).'],
  [/^\.\.\.\s*and (\d+) more\.?$/i, '... e mais $1.'],
];

function localizeNarrativeLine(text: string, locale: string): string {
  if (locale !== 'pt-BR') return text;
  for (const [pattern, replacement] of NARRATIVE_PT) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return text;
}

/**
 * Parses the Dynatrace Intelligence markdown RCA narrative into simple blocks
 * for a safe, token-styled render (no raw HTML), localizing each line to the
 * active locale. Handles the shapes it emits: `#` and `**bold**` headings,
 * `Info:` labels, `-` bullets, pipe tables and fenced code. Inline `code` stays in the
 * text and is drawn by the renderer.
 */
export function parseRcaNarrative(markdown: string | null, locale = 'en'): RcaNarrativeBlock[] {
  if (markdown === null || markdown.trim() === '') return [];
  const blocks: RcaNarrativeBlock[] = [];
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim();
    if (line === '') continue;

    // A fenced block is code, verbatim: never parsed as headings, bullets or text.
    if (line.startsWith('```')) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        body.push(lines[index] ?? '');
        index += 1;
      }
      const text = body.join('\n').replace(/\s+$/, '');
      if (text !== '') blocks.push({ kind: 'code', text });
      continue;
    }

    // A table is a pipe row followed by a separator row; the pipe rows after it are its body.
    if (line.startsWith('|') && TABLE_SEPARATOR.test((lines[index + 1] ?? '').trim())) {
      const header = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        rows.push(tableCells(lines[index] ?? ''));
        index += 1;
      }
      index -= 1;
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    const clean = line.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    if (clean === '') continue;
    if (/^#+\s/.test(line)) {
      blocks.push({ kind: 'heading', text: localizeNarrativeLine(clean, locale) });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ kind: 'bullet', text: localizeNarrativeLine(clean.replace(/^[-*]\s*/, ''), locale) });
    } else if (/^(\*\*)?[A-Za-z][^:]{0,40}:(\*\*)?$/.test(line) || /^\*\*.+\*\*$/.test(line)) {
      blocks.push({ kind: 'label', text: localizeNarrativeLine(clean.replace(/:$/, ''), locale) });
    } else {
      blocks.push({ kind: 'text', text: localizeNarrativeLine(clean, locale) });
    }
  }
  return blocks;
}

/**
 * Builds the deep-link to the problem in the Problems app, relative to the
 * `/ui/apps/` base (the page resolves that base from the current URL so it is
 * always the tenant, never the app's own path). Carries the window and a filter
 * on the display id, so the link opens exactly this problem.
 */
export function buildProblemLink(eventId: string | null, displayId: string | null, windowDays = 15): string | null {
  if (eventId === null || eventId === '') return null;
  const params = new URLSearchParams({ from: `now()-${windowDays}d`, to: 'now()' });
  if (displayId !== null && displayId !== '' && displayId !== '—') params.set('filters', `ID = ${displayId}`);
  return `dynatrace.davis.problems/problem/${encodeURIComponent(eventId)}?${params.toString()}`;
}

/**
 * An entity id as the platform writes it (`SERVICE-0123456789ABCDEF`). The incident's ids are the
 * only values that reach the incident-logs query, so anything else is dropped before it can
 * (3.2.3, Q6); since TD-08 (3.3.2) the catalog's validator checks them again before rendering.
 */
export const ENTITY_ID = /^[A-Z][A-Z0-9_]*-[0-9A-F]{16}$/;

/** The entity-scope DQL filter of the Logs-app deep link (`buildLogsLink`), or null when no valid ids. */
function incidentEntityScope(incident: RcaIncident): string | null {
  const ids = [...incident.affectedIds, ...incident.relatedIds].filter((id) => ENTITY_ID.test(id));
  if (ids.length === 0) return null;
  const services = incident.affectedIds.filter((id) => ENTITY_ID.test(id) && id.startsWith('SERVICE-'));
  const idArray = ids.map((id) => `"${id}"`).join(',');
  // DQL entity-selector grammar (not a secret); high-entropy literal is expected.
  /* eslint-disable noSecrets/no-secrets */
  const pgSelector =
    services.length > 0
      ? ` or in(dt.entity.process_group, classicEntitySelector("""type(PROCESS_GROUP), toRelationship.isServiceOfProcessGroup(entityId(${services
          .map((id) => `"${id}"`)
          .join(',')}))"""))`
      : '';
  /* eslint-enable noSecrets/no-secrets */
  return `in(dt.source_entity, array(${idArray}))${pgSelector}`;
}

/** How many message signatures the incident-logs query lists (the totals row is extra), and its longest window. */
export { INCIDENT_LOG_MAX_MS, INCIDENT_SIGNATURE_LIMIT };

/** A content signature from the incident's own error/warn logs, and its count. */
export interface IncidentLogSig {
  signature: string;
  count: number;
}

export interface IncidentLogs {
  /** Distinct error-log message signatures with content (top first). */
  signatures: IncidentLogSig[];
  total: number;
  errors: number;
  warnings: number;
  /** True when the incident's entities produced any error/warn log in the window. */
  hasRows: boolean;
  /** True when at least one of those logs carried a text message. */
  hasContent: boolean;
}

/**
 * The padded window (ISO) for the incident's logs: start−25 min … end+15 min, never longer than
 * six hours. A problem still open, or one that lasted days, used to read logs up to now — the
 * most expensive query of the app, outside every catalog guard. The first six hours are where
 * the cause shows; the link beside the panel opens the full window in the platform.
 */
export function incidentLogWindow(incident: RcaIncident | null, now = Date.now()): { startIso: string; endIso: string } {
  const startMs = incident?.startIso != null ? new Date(incident.startIso).getTime() : NaN;
  const endMs = incident?.endIso != null ? new Date(incident.endIso).getTime() : NaN;
  const start = Number.isNaN(startMs) ? now - 2 * 3600 * 1000 : startMs - 25 * 60 * 1000;
  const padded = Number.isNaN(endMs) ? now : endMs + 15 * 60 * 1000;
  const end = Math.min(padded, start + INCIDENT_LOG_MAX_MS, now);
  return { startIso: new Date(start).toISOString(), endIso: new Date(Math.max(end, start)).toISOString() };
}

/** The catalog entry and values of an incident's logs query (TD-08, 3.3.2). */
export interface IncidentLogsQuery {
  id: 'rca.incident.logs' | 'rca.incident.logs.services';
  params: { entityIds: string[]; serviceIds?: string[] };
  /**
   * More ids than the entry takes (`INCIDENT_LOG_MAX_IDS`): the read covers the first ones in
   * Davis's order, so its counts are a floor (review 3.3.2 #6). Until 3.3.1 there was no ceiling.
   */
  truncated: boolean;
}

/**
 * Which catalog entry reads this incident's own error/warn logs, with which ids: the affected and
 * related entity ids that are well-formed, and — when any affected entity is a service — the
 * process groups of those services too (`rca.incident.logs.services`). Null when the incident
 * exposes no entity id to scope to.
 */
export function incidentLogsQuery(incident: RcaIncident | null): IncidentLogsQuery | null {
  if (incident === null) return null;
  // Within the ceiling the list stays exactly as 3.3.1 built it (the text is pinned byte for byte);
  // past it, duplicates go first, then the read keeps the first ids in Davis's order.
  const fit = (ids: string[]) => (ids.length <= INCIDENT_LOG_MAX_IDS ? ids : [...new Set(ids)].slice(0, INCIDENT_LOG_MAX_IDS));
  const allEntityIds = [...incident.affectedIds, ...incident.relatedIds].filter((id) => ENTITY_ID.test(id));
  if (allEntityIds.length === 0) return null;
  const allServiceIds = incident.affectedIds.filter((id) => ENTITY_ID.test(id) && id.startsWith('SERVICE-'));
  const entityIds = fit(allEntityIds);
  const serviceIds = fit(allServiceIds);
  const truncated = new Set(entityIds).size < new Set(allEntityIds).size || new Set(serviceIds).size < new Set(allServiceIds).size;
  return serviceIds.length > 0
    ? { id: 'rca.incident.logs.services', params: { entityIds, serviceIds }, truncated }
    : { id: 'rca.incident.logs', params: { entityIds }, truncated };
}

/**
 * The DQL that summarises this incident's own error/warn logs by content signature — the
 * service/database errors behind the problem — as the catalog renders it. Null when the incident
 * exposes no entity ids to scope to, or the catalog refuses them (more ids than the entry allows).
 */
export function buildIncidentLogsDql(incident: RcaIncident | null): string | null {
  const query = incidentLogsQuery(incident);
  return query === null ? null : renderQuery(query.id, query.params);
}

/** Turns the incident-logs query records into a display-ready summary. */
export function summariseIncidentLogs(records: readonly GrailRecord[]): IncidentLogs {
  // The query returns the most frequent signatures plus one row, tagged `isTotal`, counted over
  // every error/warn log of the incident. The signatures are a top list and never summed: a
  // high-cardinality message prefix leaves most logs outside the top eight.
  const totalRow = records.find((record) => bool(record, 'isTotal') === true);
  const rows = records
    .filter((record) => bool(record, 'isTotal') !== true)
    .map((record) => ({
      sig: str(record, 'sig') ?? '',
      count: num(record, 'count') ?? 0,
      errors: num(record, 'errors') ?? 0,
    }));
  const total = totalRow === undefined ? rows.reduce((sum, row) => sum + row.count, 0) : num(totalRow, 'count') ?? 0;
  const errors =
    totalRow === undefined ? rows.reduce((sum, row) => sum + row.errors, 0) : num(totalRow, 'errors') ?? 0;
  const signatures = rows
    .filter((row) => row.sig.trim() !== '' && row.count > 0)
    // The first line of a raw log can carry an e-mail, a token, an IP or a tenant URL, and these
    // signatures reach the RCA page and the customer deck. Redacted here, once, for both (3.2.1).
    .map((row) => ({ signature: redactText(stripControlChars(row.sig)), count: row.count }));
  return { signatures, total, errors, warnings: total - errors, hasRows: total > 0, hasContent: signatures.length > 0 };
}

/**
 * Builds the deep-link to the Logs app scoped to exactly the incident's affected
 * and related entities (the same entity-scoped query the native problem Logs tab
 * runs), padded around the incident window. Returns a path relative to the
 * `/ui/apps/` base, or null when the platform gave us no entity ids to scope to.
 */
export function buildLogsLink(incident: RcaIncident | null): string | null {
  if (incident === null || incident.eventId === null) return null;
  const scope = incidentEntityScope(incident);
  if (scope === null) return null;
  const query = `fetch logs\n| filter ${scope}\n| filter status == "ERROR" OR status == "WARN"\n| sort timestamp desc`;
  const startMs = incident.startIso !== null ? new Date(incident.startIso).getTime() : NaN;
  const endMs = incident.endIso !== null ? new Date(incident.endIso).getTime() : NaN;
  const from = Number.isNaN(startMs) ? 'now()-2h' : new Date(startMs - 25 * 60 * 1000).toISOString();
  const to = Number.isNaN(endMs) ? 'now()' : new Date(endMs + 15 * 60 * 1000).toISOString();
  const state = {
    'dt.query': query,
    'dt.problem': { 'event.id': incident.eventId },
    'dt.timeframe': { from, to },
    analysisMode: 'logs',
    version: 2,
    showDqlEditor: true,
    facetsCollapse: true,
    tableConfig: { columns: ['timestamp', 'status', 'Log message'], columnAttributes: { tableLineWrap: true } },
  };
  return `dynatrace.logs/#${encodeURIComponent(JSON.stringify(state))}`;
}
