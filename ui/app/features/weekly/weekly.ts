import { v374Strings } from '../../i18n/v374';
import { CAUSE_NOT_NAMED, getQuery, type CatalogId } from '../../queries/catalog';
import { num, str, type GrailRecord } from '../../utils/records';
import { queryServiceRunner, withResults, type NotebookContent, type NotebookRunner } from '../builder/pocDocuments';
import { buildWeeklyNotebook, notebookLink } from './weeklyNotebook';
import { TRIAGE_RULE, mdBlocks, mdText, triageDuration, type QueryWindow, type TriageLanguage, type TriageQuery } from '../triage/triage';

/**
 * 3.7.4 — "PoC Automation · Weekly", the app's second workflow action (the owner: "Resumo semanal da PoC por e-mail … algo
 * robusto … com as atualizações e diferenças da semana"). A scheduled workflow (Mondays) hands it the customer's name and the
 * language; it reads — through the app's catalog, with the workflow actor's own permissions — the problems of the last seven
 * days against the seven before (how many, closed, still open, the MTTR, the share closed with a named root cause), what
 * repeated most and the services that failed most, and returns a subject and a summary in sections for the e-mail. Every
 * figure comes from Grail; a read that fails leaves its part out and says so (rule 8). Pure: the action wires the query.
 */

export interface WeeklyInput {
  customer?: string;
  /** 3.7.6: the PoC's "Environment overview and SLOs" dashboard, when the PoC Builder created it (a document id). */
  dashboardId?: string;
  language?: string;
  /** 3.7.7: "off" leaves the week's report notebook out (it is written by default). */
  notebook?: string;
}

export interface WeeklyDeps {
  query: TriageQuery;
  environmentUrl: string;
  appId: string;
  now?: number;
  /** 3.7.7: writes the week's report notebook (shared with the tenant's users); its document id. Absent, no notebook. */
  writeNotebook?: (content: NotebookContent, name: string) => Promise<string>;
  /** 3.7.7: runs each notebook section once, so the notebook opens drawn (the query service by default). */
  runNotebook?: NotebookRunner;
}

export interface WeekFigures {
  problems: number | null;
  open: number | null;
  closed: number | null;
  mttrNs: number | null;
  rootCausePct: number | null;
}

export interface WeeklyResult {
  subject: string;
  summary: string;
  thisWeek: WeekFigures;
  lastWeek: WeekFigures;
  recurring: { name: string; occurrences: number; rootCause: string | null }[];
  failing: { name: string; failurePct: number; requests: number }[];
  /** The environment's address (3.7.6: the e-mail no longer links the app — the customer has no access to it). */
  appLink: string;
  /** 3.7.6: the platform pages the e-mail links (the Problems app, and the PoC's overview dashboard when there is one). */
  links: { problems: string; dashboard: string | null; notebook?: string | null };
  /** 3.7.6: the week's sections, before the links — the e-mail puts Dynatrace Assist's reading between the two. */
  body: string;
  /** 3.7.6: the links and the footer, which close the e-mail. */
  closing: string;
}

/** Lines each list shows. */
export const WEEKLY_SHOWN = 5;
const DAY_MS = 24 * 3600 * 1000;

type WeeklyKey = keyof typeof v374Strings;

export function weeklyText(key: WeeklyKey, language: TriageLanguage, params: Record<string, string | number> = {}): string {
  const template = v374Strings[key][language];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

const language = (value: string | undefined): TriageLanguage => (value === 'pt-BR' ? 'pt-BR' : 'en');

async function read(deps: WeeklyDeps, id: CatalogId, window: QueryWindow, log: (line: string) => void): Promise<GrailRecord[] | null> {
  try {
    return await deps.query(id, getQuery(id).dql, window);
  } catch (error) {
    log(`${id} not read: ${String(error)}`);
    return null;
  }
}

/** One week's figures from the problem reads (null where a read did not answer). Pure. */
export function weekFigures(summary: GrailRecord[] | null, mttx: GrailRecord[] | null, mttxRca: GrailRecord[] | null): WeekFigures {
  const problems = summary === null ? null : summary.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const open = summary === null ? null : summary.filter((record) => str(record, 'event.status') === 'ACTIVE').reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const closed = mttx === null ? null : mttx.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const totalNs = mttx === null ? 0 : mttx.reduce((total, record) => total + (num(record, 'totalNs') ?? 0), 0);
  const mttrNs = closed === null || closed === 0 ? null : totalNs / closed;
  const withRoot = mttxRca === null ? null : mttxRca.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const rootCausePct = withRoot === null || closed === null || closed === 0 ? null : Math.round((100 * withRoot) / closed);
  return { problems, open, closed, mttrNs, rootCausePct };
}

/** "+12 %", "−3", "=" against the week before; "" when either side was not measured. */
export function change(now: number | null, before: number | null, measure: 'count' | 'percent'): string {
  if (now === null || before === null) return '';
  const delta = now - before;
  if (delta === 0) return '=';
  if (measure === 'percent' && before !== 0) return `${delta > 0 ? '+' : '−'}${Math.abs(Math.round((100 * delta) / before))} %`;
  return `${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta))}`;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The summary the e-mail sends, in sections between rules (as the triage's). Pure. */
export function weeklySummary(result: WeeklyParts, customer: string, lang: TriageLanguage, from: string, to: string): string {
  const parts = weeklySummaryParts(result, customer, lang, from, to);
  return `${parts.body}${TRIAGE_RULE}${parts.closing}`;
}

type WeeklyParts = Omit<WeeklyResult, 'subject' | 'summary' | 'body' | 'closing'>;

/** A document id the PoC Builder kept (a UUID-like id; anything else is not linked). */
const DOCUMENT_ID = /^[A-Za-z0-9-]{8,80}$/;

/**
 * 3.7.6 (the owner: the links and the footer last, Dynatrace Assist before them; and no link to the app — "o cliente não
 * terá acesso ao App"): the summary in two parts. The links are platform pages the customer's users open: the Problems app
 * and, when the PoC Builder created it, the PoC's overview dashboard. Pure.
 */
export function weeklySummaryParts(result: WeeklyParts, customer: string, lang: TriageLanguage, from: string, to: string): { body: string; closing: string } {
  const t = (key: WeeklyKey, params: Record<string, string | number> = {}) => weeklyText(key, lang, params);
  const n = (value: number | null) => (value === null ? '—' : new Intl.NumberFormat(lang).format(value));
  const pct = (value: number | null) => (value === null ? '—' : `${value}%`);
  const { thisWeek, lastWeek } = result;
  // 3.7.7 (the owner: "rico em markdown, sem emojis"): the week as tables, a row per figure, the week before beside it.
  const row = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;
  const table = (heads: readonly string[], align: readonly ('l' | 'r')[], rows: readonly (readonly string[])[]) =>
    [row(heads), row(align.map((side) => (side === 'r' ? '---:' : ':---'))), ...rows.map(row)].join('\n');
  const points = (now: number | null, before: number | null) => {
    if (now === null || before === null) return '—';
    const delta = Math.round(now - before);
    if (delta === 0) return `= ${t('weekly.same')}`;
    return `${delta > 0 ? '▲' : '▼'} ${t('weekly.points', { sign: delta > 0 ? '+' : '−', n: Math.abs(delta) })} · ${t(delta > 0 ? 'weekly.better' : 'weekly.worse')}`;
  };
  // 3.7.8 (the owner: "conseguimos caprichar pouco mais?"): Markdown has no colour, so a change reads as an arrow and a word —
  // ▲ / ▼ and "better" / "worse" where fewer or more is better — and the week's gist opens as a callout.
  const trend = (now: number | null, before: number | null, measure: 'count' | 'percent', better: 'lower' | 'higher' | null) => {
    const text = change(now, before, measure);
    if (text === '' || now === null || before === null) return '—';
    if (text === '=') return `= ${t('weekly.same')}`;
    const arrow = now > before ? '▲' : '▼';
    const word = better === null ? '' : ` · ${t((now < before) === (better === 'lower') ? 'weekly.better' : 'weekly.worse')}`;
    return `${arrow} ${text}${word}`;
  };
  const blocks: string[] = [t('weekly.head', { customer: mdText(customer) }), t('weekly.period', { from, to })];
  blocks.push(`> ${t('weekly.problems', { n: n(thisWeek.problems), change: change(thisWeek.problems, lastWeek.problems, 'count') || '—', mttr: triageDuration(thisWeek.mttrNs) ?? '—' })}`);

  blocks.push(t('weekly.sec.problems'));
  blocks.push(
    table(
      [t('weekly.col.indicator'), t('weekly.col.thisWeek'), t('weekly.col.before'), t('weekly.col.change')],
      ['l', 'r', 'r', 'r'],
      [
        [t('weekly.row.problems'), n(thisWeek.problems), n(lastWeek.problems), trend(thisWeek.problems, lastWeek.problems, 'count', 'lower')],
        [t('weekly.closedOpen'), n(thisWeek.closed), n(lastWeek.closed), trend(thisWeek.closed, lastWeek.closed, 'count', null)],
        [t('weekly.row.open'), n(thisWeek.open), n(lastWeek.open), trend(thisWeek.open, lastWeek.open, 'count', 'lower')],
        [t('weekly.mttr'), triageDuration(thisWeek.mttrNs) ?? '—', triageDuration(lastWeek.mttrNs) ?? '—', trend(thisWeek.mttrNs, lastWeek.mttrNs, 'percent', 'lower')],
        [t('weekly.rootCause'), pct(thisWeek.rootCausePct), pct(lastWeek.rootCausePct), points(thisWeek.rootCausePct, lastWeek.rootCausePct)],
      ],
    ),
  );

  blocks.push(t('weekly.sec.recurring'));
  blocks.push(
    result.recurring.length === 0
      ? t('weekly.none')
      : table(
          [t('weekly.col.problem'), t('weekly.col.occurrences'), t('weekly.col.rootCause')],
          ['l', 'r', 'l'],
          result.recurring.map((item) => [mdText(item.name), n(item.occurrences), item.rootCause === null ? t('weekly.notNamed') : mdText(item.rootCause)]),
        ),
  );

  blocks.push(t('weekly.sec.failing'));
  if (result.failing.length === 0) blocks.push(t('weekly.none'));
  else {
    blocks.push(
      table(
        [t('weekly.col.service'), t('weekly.col.failed'), t('weekly.col.requests')],
        ['l', 'r', 'r'],
        result.failing.map((item) => [mdText(item.name), `${new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(item.failurePct)}%`, n(item.requests)]),
      ),
    );
    blocks.push(`_${t('weekly.failing')}_`);
  }

  const linkLines: string[] = [];
  if ((result.links.notebook ?? null) !== null) linkLines.push(`- ${t('weekly.linkNotebook', { link: result.links.notebook ?? '' })}`);
  linkLines.push(`- ${t('weekly.linkProblems', { link: result.links.problems })}`);
  if (result.links.dashboard !== null) linkLines.push(`- ${t('weekly.linkDashboard', { link: result.links.dashboard })}`);
  return { body: mdBlocks(blocks), closing: mdBlocks([t('weekly.sec.links'), linkLines.join('\n'), t('weekly.footer')]) };
}

/** The week's reads, then the summary. Nothing is estimated; a read that fails leaves its part out. */
export async function runWeekly(input: WeeklyInput, deps: WeeklyDeps, log: (line: string) => void = () => undefined): Promise<WeeklyResult> {
  const lang = language(input.language);
  const customer = (input.customer ?? '').trim().slice(0, 120) || 'PoC';
  const now = deps.now ?? Date.now();
  const thisWindow = { startIso: new Date(now - 7 * DAY_MS).toISOString(), endIso: new Date(now).toISOString() };
  const lastWindow = { startIso: new Date(now - 14 * DAY_MS).toISOString(), endIso: thisWindow.startIso };
  const environment = deps.environmentUrl.replace(/\/+$/, '');
  const appLink = environment;
  const dashboardId = (input.dashboardId ?? '').trim();
  const links = {
    problems: `${environment}/ui/apps/dynatrace.davis.problems/`,
    dashboard: DOCUMENT_ID.test(dashboardId) ? `${environment}/ui/apps/dynatrace.dashboards/dashboard/${dashboardId}` : null,
  };

  const week = async (window: QueryWindow) =>
    weekFigures(await read(deps, 'prob.summary', window, log), await read(deps, 'prob.mttx', window, log), await read(deps, 'prob.mttx.rca', window, log));
  const thisWeek = await week(thisWindow);
  const lastWeek = await week(lastWindow);

  const recurrentRows = (await read(deps, 'prob.recurrent', thisWindow, log)) ?? [];
  const recurring = recurrentRows.slice(0, WEEKLY_SHOWN).map((record) => {
    const cause = str(record, 'rootCause');
    return { name: str(record, 'event.name') ?? '—', occurrences: num(record, 'occurrences') ?? 0, rootCause: cause === null || cause === CAUSE_NOT_NAMED ? null : cause };
  });
  const rankingRows = (await read(deps, 'svc.ranking', thisWindow, log)) ?? [];
  const failing = rankingRows
    .map((record) => ({ name: str(record, 'name') ?? '—', failurePct: num(record, 'failureRatePct') ?? 0, requests: num(record, 'totalRequests') ?? 0 }))
    .filter((row) => row.failurePct > 0 && row.requests >= 100)
    .sort((a, b) => b.failurePct - a.failurePct)
    .slice(0, WEEKLY_SHOWN);

  const from = isoDay(now - 7 * DAY_MS);
  const to = isoDay(now);
  let base: WeeklyParts = { thisWeek, lastWeek, recurring, failing, appLink, links };

  // 3.7.7: the week's report notebook — the same tables, then the platform's charts over the same week. A failure leaves
  // the link out and the e-mail goes on.
  if (deps.writeNotebook !== undefined && (input.notebook ?? 'on') !== 'off') {
    try {
      const t = (key: WeeklyKey) => weeklyText(key, lang);
      const tables = weeklySummaryParts(base, customer, lang, from, to).body;
      const drawn = await withResults(
        buildWeeklyNotebook(tables, thisWindow, {
          titles: { mix: t('weekly.nb.mix'), recurring: t('weekly.nb.recurring'), responseTime: t('weekly.nb.responseTime'), failureRate: t('weekly.nb.failureRate'), services: t('weekly.nb.services') },
          chartsNote: t('weekly.nb.chartsNote'),
          footer: t('weekly.nb.footer'),
        }),
        deps.runNotebook ?? queryServiceRunner,
        now,
      );
      const id = await deps.writeNotebook(drawn, weeklyText('weekly.nb.name', lang, { customer, day: to }));
      base = { ...base, links: { ...links, notebook: notebookLink(environment, id) } };
      log(`notebook written: ${id}`);
    } catch (error) {
      log(`notebook not written: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const parts = weeklySummaryParts(base, customer, lang, from, to);
  return {
    ...base,
    subject: weeklyText('weekly.subject', lang, {
      customer,
      problems: thisWeek.problems === null ? '—' : new Intl.NumberFormat(lang).format(thisWeek.problems),
      mttr: triageDuration(thisWeek.mttrNs) ?? '—',
    }),
    summary: `${parts.body}${TRIAGE_RULE}${parts.closing}`,
    body: parts.body,
    closing: parts.closing,
  };
}
