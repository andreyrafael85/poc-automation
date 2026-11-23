import { v370Strings } from '../../i18n/v370';
import { getQuery, renderQuery } from '../../queries/catalog';
import { renderOrNull } from '../../queries/params';
import type { CatalogId } from '../../queries/catalog';
import {
  buildProblemLink,
  incidentFromRecord,
  incidentLogsQuery,
  incidentLogWindow,
  summariseIncidentLogs,
  type IncidentLogs,
  type RcaIncident,
} from '../../models/rca';
import { buildRootCallersDql, summariseRootCallers, type RootCaller } from '../../models/trailLinks';
import type { GrailRecord } from '../../utils/records';

/**
 * 3.7.0 — the PoC triage workflow action (the owner: "seguir com a ação customizada na próxima release", after the
 * Workflows guides he sent: a custom action reaches the platform through its SDK with the workflow actor's own
 * permissions). Handed a problem's event id by the workflow's problem trigger, it reads — through the app's own catalog,
 * the queries the RCA page reads (rule 9) — the problem, its error and warning logs around the incident and who calls its
 * root cause, and returns them with a summary the workflow's e-mail sends. Every figure comes from Grail; nothing is
 * estimated (rule 8). This module is pure: the action wires the platform's query client into `runTriage`.
 */

export type TriageLanguage = 'en' | 'pt-BR';

export interface TriageInput {
  problemId?: string;
  language?: string;
}

export interface QueryWindow {
  startIso: string;
  endIso: string;
}

/** Runs one catalog query over a window, within the entry's own ceilings; the records, or a thrown error. */
export type TriageQuery = (id: CatalogId, dql: string, window: QueryWindow) => Promise<GrailRecord[]>;

export interface TriageDeps {
  query: TriageQuery;
  /** The environment's URL (`https://….apps.dynatrace.com`), for the links. */
  environmentUrl: string;
  appId: string;
  now?: number;
}

export interface TriageResult {
  found: boolean;
  problem: {
    id: string;
    displayId: string;
    name: string;
    category: string;
    status: string;
    rootCause: string | null;
    affectedCount: number;
  } | null;
  logs: { total: number; errors: number; signatures: { signature: string; count: number }[] } | null;
  callers: RootCaller[];
  subject: string;
  /** The whole summary (3.7.0–3.7.5 e-mails read it; kept for workflows already saved). */
  summary: string;
  /** 3.7.6: the problem's sections, before the links — the e-mail puts Dynatrace Assist's reading between the two. */
  body: string;
  /** 3.7.6: the links and the footer, which close the e-mail. */
  closing: string;
  problemLink: string | null;
  appLink: string;
}

/** Signatures, callers and affected names the summary lists (the rest is counted, never dropped silently). */
export const TRIAGE_SHOWN = 5;

const DAY_MS = 24 * 3600 * 1000;

export function triageLanguage(value: string | undefined): TriageLanguage {
  return value === 'pt-BR' ? 'pt-BR' : 'en';
}

type TriageKey = keyof typeof v370Strings;

/** One of the action's own texts, its `{placeholders}` filled. */
export function triageText(key: TriageKey, language: TriageLanguage, params: Record<string, string | number> = {}): string {
  const template = v370Strings[key][language];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

const formatCount = (value: number, language: TriageLanguage) => new Intl.NumberFormat(language).format(value);

/** 3.7.2: a duration in hours and minutes (`1 h 12 min`, `45 min`); null when not measured. */
export function triageDuration(ns: number | null): string | null {
  if (ns === null || !Number.isFinite(ns) || ns < 0) return null;
  const minutes = Math.round(ns / 60_000_000_000);
  const hours = Math.floor(minutes / 60);
  return hours === 0 ? `${minutes} min` : `${hours} h ${minutes % 60} min`;
}

/** 3.7.2: a start time the e-mail shows in UTC (`2026-11-22 21:30 UTC`). */
export function triageTime(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * 3.7.7 (the owner: "remover todos os emojis… algo mais formal ao cliente"): the e-mail is Markdown — the Workflows e-mail
 * action renders headings, bold, lists, tables, links and rules, but no HTML and no image, so the formal look comes from
 * Markdown, not from icons. The rule between the e-mail's parts has blank lines around it (a `---` right under a line of
 * text would turn that line into a heading).
 */
export const TRIAGE_RULE = '\n\n---\n\n';

/** Characters that would change a Markdown line (a name or a log line is text, never markup). */
export function mdText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/([\\`*_[\]|<>#])/g, '\\$1').trim();
}

/** A log signature as inline code (a backtick inside it becomes a quote, so the code span stays whole). */
export function mdCode(value: string): string {
  return `\`${value.replace(/\s+/g, ' ').replace(/`/g, "'").trim()}\``;
}

/** Blocks of Markdown, a blank line between them. */
export const mdBlocks = (blocks: readonly string[]): string => blocks.filter((block) => block !== '').join('\n\n');

/**
 * The summary the e-mail sends, in sections (3.7.1; Markdown since 3.7.7): the problem, its root cause, how far it reached,
 * the logs around it, who calls the root cause and the links. Pure.
 */
export function triageSummary(
  incident: RcaIncident,
  logs: IncidentLogs | null,
  callers: readonly RootCaller[],
  links: { problem: string | null; app: string },
  language: TriageLanguage,
): string {
  const parts = triageSummaryParts(incident, logs, callers, links, language);
  return `${parts.body}${TRIAGE_RULE}${parts.closing}`;
}

/**
 * 3.7.6 (the owner: "a parte de LINKS e Lido pela ação… tem que ser os dois últimos"): the summary in two parts — the
 * problem's sections, then the links and the footer — so the e-mail can put Dynatrace Assist's reading between them. Pure.
 */
export function triageSummaryParts(
  incident: RcaIncident,
  logs: IncidentLogs | null,
  callers: readonly RootCaller[],
  links: { problem: string | null; app: string },
  language: TriageLanguage,
): { body: string; closing: string } {
  const t = (key: TriageKey, params: Record<string, string | number> = {}) => triageText(key, language, params);
  const n = (value: number) => formatCount(value, language);
  const blocks: string[] = [];
  const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join('\n');
  blocks.push(t('triage.head', { name: mdText(incident.name), id: incident.displayId }));
  // 3.7.8 (the owner: "conseguimos caprichar pouco mais?"): a callout with the gist, then the facts as a table. Markdown has no
  // colour; state reads as a plain symbol and a word (● open, ○ closed), never an emoji.
  const open = incident.status === 'ACTIVE';
  const began = triageTime(incident.startIso);
  const lasted = triageDuration(incident.durationNs);
  const root = incident.rootCauseName === null ? t('triage.subjectNoRoot') : `**${mdText(incident.rootCauseName)}**`;
  blocks.push(`> ${t('triage.gist', { state: t(open ? 'triage.state.open' : 'triage.state.closed'), root, count: n(incident.affectedCount) })}`);
  const k8s = [incident.clusters[0], incident.namespaces[0], incident.workloads[0]].filter((part): part is string => part !== undefined && part !== '');
  const facts: [string, string][] = [
    [t('triage.f.category'), mdText(incident.category)],
    [t('triage.f.status'), t(open ? 'triage.state.open' : 'triage.state.closed')],
  ];
  if (began !== null) facts.push([t('triage.f.began'), began]);
  if (lasted !== null) facts.push([t(open ? 'triage.f.openFor' : 'triage.f.lasted'), lasted]);
  facts.push([t('triage.f.root'), incident.rootCauseName === null ? t('triage.subjectNoRoot') : mdText(incident.rootCauseName)]);
  facts.push([t('triage.f.reach'), t(incident.affectedCount === 1 ? 'triage.f.reachOne' : 'triage.f.reachMany', { count: n(incident.affectedCount) })]);
  if (k8s.length > 0) facts.push([t('triage.f.k8s'), k8s.map(mdText).join(' / ')]);
  blocks.push([`| ${t('triage.f.field')} | ${t('triage.f.value')} |`, '| :--- | :--- |', ...facts.map(([field, value]) => `| **${field}** | ${value} |`)].join('\n'));

  blocks.push(t('triage.sec.root'));
  blocks.push(incident.rootCauseName === null ? t('triage.noRoot') : t('triage.root', { root: `**${mdText(incident.rootCauseName)}**` }));

  blocks.push(t(incident.affectedCount === 1 ? 'triage.sec.reachOne' : 'triage.sec.reach', { count: n(incident.affectedCount) }));
  const reached = incident.affectedNames.slice(0, TRIAGE_SHOWN).map(mdText);
  const more = incident.affectedCount - Math.min(incident.affectedNames.length, TRIAGE_SHOWN);
  if (more > 0) reached.push(t('triage.more', { more: n(more) }));
  if (reached.length > 0) blocks.push(list(reached));

  blocks.push(t('triage.sec.logs'));
  if (logs === null || !logs.hasRows) {
    blocks.push(t('triage.logsNone'));
  } else {
    blocks.push(t('triage.logs', { total: n(logs.total), errors: n(logs.errors) }));
    const rows = logs.signatures.slice(0, TRIAGE_SHOWN).map((row) => `| ${n(row.count)} | ${mdCode(row.signature).replace(/\|/g, '\\|')} |`);
    if (rows.length > 0) blocks.push([`| ${t('triage.l.count')} | ${t('triage.l.signature')} |`, '| ---: | :--- |', ...rows].join('\n'));
  }

  if (callers.length > 0 && incident.rootCauseName !== null) {
    blocks.push(t('triage.sec.callers', { root: mdText(incident.rootCauseName) }));
    blocks.push(
      [
        `| ${t('triage.c.caller')} | ${t('triage.c.failures')} | ${t('triage.c.requests')} |`,
        '| :--- | ---: | ---: |',
        ...callers
          .slice(0, TRIAGE_SHOWN)
          .map((caller) => `| ${mdText(caller.name)} | ${caller.failures === null ? '—' : n(caller.failures)} | ${caller.requests === null ? '—' : n(caller.requests)} |`),
      ].join('\n'),
    );
  }

  const linkLines: string[] = [];
  if (links.problem !== null) linkLines.push(t('triage.openProblem', { link: links.problem }));
  linkLines.push(t('triage.openApp', { link: links.app }));
  const closing = mdBlocks([t('triage.sec.links'), list(linkLines), t('triage.footer')]);
  return { body: mdBlocks(blocks), closing };
}

const EMPTY = (subject: string, summary: string, appLink: string): TriageResult => ({
  found: false,
  problem: null,
  logs: null,
  callers: [],
  subject,
  summary,
  body: summary,
  closing: '',
  problemLink: null,
  appLink,
});

/**
 * The triage: the problem by its event id, then — scoped to the incident — its logs and the callers of its root cause.
 * A read that fails leaves its part out of the summary and says so in the log; it never invents a figure.
 */
export async function runTriage(input: TriageInput, deps: TriageDeps, log: (line: string) => void = () => undefined): Promise<TriageResult> {
  const language = triageLanguage(input.language);
  const now = deps.now ?? Date.now();
  const base = deps.environmentUrl.replace(/\/+$/, '');
  const appLink = `${base}/ui/apps/${deps.appId}/rca`;
  const problemId = (input.problemId ?? '').trim();
  const problemDql = renderOrNull(getQuery('triage.problem'), { problemId });
  if (problemDql === null) {
    return EMPTY(triageText('triage.subjectMissing', language), triageText('triage.invalidId', language, { id: problemId === '' ? '—' : problemId }), appLink);
  }
  const day = { startIso: new Date(now - DAY_MS).toISOString(), endIso: new Date(now).toISOString() };
  const records = await deps.query('triage.problem', problemDql, day);
  const record = records[0];
  if (record === undefined) {
    return EMPTY(triageText('triage.subjectMissing', language), triageText('triage.notFound', language, { id: problemId }), appLink);
  }
  const incident = incidentFromRecord(record);
  const window = incidentLogWindow(incident, now);

  let logs: IncidentLogs | null = null;
  const logsQuery = incidentLogsQuery(incident);
  if (logsQuery !== null) {
    const dql = renderQuery(logsQuery.id, logsQuery.params);
    if (dql !== null) {
      try {
        logs = summariseIncidentLogs(await deps.query(logsQuery.id, dql, window));
      } catch (error) {
        log(`logs not read: ${String(error)}`);
      }
    }
  }

  let callers: RootCaller[] = [];
  const callersDql = buildRootCallersDql(incident.rootCauseId);
  if (callersDql !== null) {
    try {
      callers = summariseRootCallers(await deps.query('rca.callers', callersDql, window)).callers;
    } catch (error) {
      log(`callers not read: ${String(error)}`);
    }
  }

  const relative = buildProblemLink(incident.eventId, incident.displayId);
  const problemLink = relative === null ? null : `${base}/ui/apps/${relative}`;
  const parts = triageSummaryParts(incident, logs, callers, { problem: problemLink, app: appLink }, language);
  const summary = `${parts.body}${TRIAGE_RULE}${parts.closing}`;
  return {
    found: true,
    problem: {
      id: incident.eventId ?? problemId,
      displayId: incident.displayId,
      name: incident.name,
      category: incident.category,
      status: incident.status,
      rootCause: incident.rootCauseName,
      affectedCount: incident.affectedCount,
    },
    logs: logs === null ? null : { total: logs.total, errors: logs.errors, signatures: logs.signatures.slice(0, TRIAGE_SHOWN) },
    callers: callers.slice(0, TRIAGE_SHOWN),
    subject: triageText('triage.subject', language, {
      id: incident.displayId,
      name: incident.name,
      root: incident.rootCauseName ?? triageText('triage.subjectNoRoot', language),
    }),
    summary,
    body: parts.body,
    closing: parts.closing,
    problemLink,
    appLink,
  };
}
