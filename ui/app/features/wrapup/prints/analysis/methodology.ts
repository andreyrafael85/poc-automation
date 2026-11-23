import { PRINT_BUDGET } from '../deck/budget';
import { printText } from '../text';
import type { AnalysisCtx, EvidenceBundle, ExecutedQuery, I18nText, MethodologyContent, PrintRecord, ShotPlan } from '../types';
import { formatCount, formatDayTime, formatDecimal, formatInstant, windowText } from './sourced';

/**
 * The methodology page of the real-prints deck (3.2.7, spec §5.1, G5): which screens were captured
 * and how, every query behind the numbers with its window, records and the bytes Grail reports, and
 * the transparency gaps. The Customer profile names the environment generically (never the tenant
 * host). The DQL appendix pages are built by the deck from the analyses' own executed text.
 */

/** Bytes as Grail reports them ('1,2 GB'); null when the platform did not say. */
export function formatBytes(bytes: number, ctx: Pick<AnalysisCtx, 'locale'>): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${formatDecimal(value, ctx.locale, unit === 0 ? 0 : 1)} ${units[unit] ?? 'B'}`;
}

/** A methodology cell that holds tenant text is cut to this. */
const TENANT_CELL_MAX = 80;

const VIA_KEY = { companion: 'prt.via.companion', 'tab-capture': 'prt.via.tabCapture', manual: 'prt.via.manual' } as const;

/**
 * The executed queries in the order the methodology lists them (3.2.7 final review D3): the ones the
 * deck cites first, in the order it cites them (its appendix cards, then the numbers on its slides),
 * then the rest in the order they ran. A query that ran more than once keeps its runs together.
 */
export function methodologyOrder(executed: readonly ExecutedQuery[], cited: readonly string[]): ExecutedQuery[] {
  const rank = new Map<string, number>();
  for (const id of cited) if (!rank.has(id)) rank.set(id, rank.size);
  const rankOf = (query: ExecutedQuery) => rank.get(query.id) ?? rank.size;
  return executed
    .map((query, index) => ({ query, index }))
    .sort((a, b) => rankOf(a.query) - rankOf(b.query) || a.index - b.index)
    .map(({ query }) => query);
}

/**
 * "17 executadas entre 12:00 UTC e 12:58 UTC"; when the first and the last read show the same
 * minute, "17 executadas às 12:00 UTC" (3.2.7 final review D4) — or, on different days, the day
 * names both ends.
 */
function readsText(count: number, first: string | undefined, last: string | undefined, ctx: AnalysisCtx): string {
  if (first === undefined || last === undefined) return ctx.t('prt.meth.dql.value', { count: String(count), from: '—', to: '—' });
  const from = formatInstant(first, ctx.locale, ctx.timeZone);
  const to = formatInstant(last, ctx.locale, ctx.timeZone);
  if (from !== to) return ctx.t('prt.meth.dql.value', { count: String(count), from, to });
  const fromDay = formatDayTime(first, ctx.locale, ctx.timeZone);
  const toDay = formatDayTime(last, ctx.locale, ctx.timeZone);
  return fromDay === toDay ? ctx.t('prt.meth.dql.at', { count: String(count), at: from }) : ctx.t('prt.meth.dql.value', { count: String(count), from: fromDay, to: toDay });
}

export function methodologyFor(
  executed: readonly ExecutedQuery[],
  prints: readonly PrintRecord[],
  gaps: readonly I18nText[],
  ctx: AnalysisCtx,
  opts: { tenantHost?: string | null; cited?: readonly string[] } = {},
): MethodologyContent {
  const vias = [...new Set(prints.map((print) => print.source))].map((source) => ctx.t(VIA_KEY[source]));
  const verified = prints.filter((print) => print.identity === 'anchor').length;
  const reads = executed.map((query) => query.readAtIso).filter((iso): iso is string => iso !== null).sort();
  const first = reads[0];
  const last = reads[reads.length - 1];
  const scope = [
    { label: ctx.t('prt.meth.env'), value: ctx.profile === 'customer' ? ctx.t('prt.meth.envCustomer') : (opts.tenantHost ?? '—') },
    { label: ctx.t('prt.meth.captures'), value: ctx.t('prt.meth.captures.value', { count: String(prints.length), verified: String(verified), via: vias.length === 0 ? '—' : vias.join(' + ') }) },
    { label: ctx.t('prt.meth.dql'), value: readsText(executed.length, first, last, ctx) },
    { label: ctx.t('prt.meth.profile'), value: ctx.t(ctx.profile === 'customer' ? 'profile.customer' : 'profile.se') },
  ];
  const ordered = methodologyOrder(executed, opts.cited ?? []);
  const listed = ordered.length > PRINT_BUDGET.methodRows ? ordered.slice(0, PRINT_BUDGET.methodRows - 1) : ordered;
  const unlisted = ordered.length - listed.length;
  // Screen titles and gap lines carry tenant names (a service, a cluster): redacted for the profile here.
  const tenant = (text: string) => printText(text, TENANT_CELL_MAX, ctx.profile);
  const identity = (print: PrintRecord) => (print.identity === 'anchor' ? ctx.t('prt.deck.identity.anchor') : print.identity === 'se-confirmed' ? ctx.t('prt.deck.identity.confirmed') : '—');
  return {
    title: ctx.t('prt.meth.title'),
    scope,
    printsTitle: ctx.t('prt.meth.printsTitle'),
    printHeaders: [ctx.t('prt.meth.h.screen'), ctx.t('prt.meth.h.captured'), ctx.t('prt.meth.h.via'), ctx.t('prt.meth.h.link'), ctx.t('prt.meth.h.identity')],
    prints: prints
      .slice(0, PRINT_BUDGET.methodRows)
      .map((print) => [
        tenant(ctx.t(print.titleText.key, print.titleText.params)),
        formatDayTime(print.capturedAtIso, ctx.locale, ctx.timeZone),
        ctx.t(VIA_KEY[print.source]),
        ctx.t(`prt.ev.${print.linkEvidence}`),
        identity(print),
      ]),
    queriesTitle: ctx.t('prt.meth.queriesTitle'),
    queryHeaders: [ctx.t('prt.meth.h.query'), ctx.t('prt.meth.h.window'), ctx.t('prt.meth.h.records'), ctx.t('prt.meth.h.read')],
    queries: [
      ...listed.map((query) => [
        query.id,
        query.window === null ? '—' : windowText(query.window, ctx),
        // A failed read counted nothing: a dash, never "0" (absent is not zero).
        query.outcome === 'no-permission' ? ctx.t('prt.meth.noPermission') : query.outcome === 'error' ? '—' : formatCount(query.records, ctx.locale),
        query.scannedBytes === null ? ctx.t('prt.meth.readUnknown') : formatBytes(query.scannedBytes, ctx),
      ]),
      // The rows left out are counted, never dropped in silence: the table holds `methodRows` rows, this line included.
      ...(unlisted > 0 ? [[ctx.t('prt.meth.queriesMore', { count: String(unlisted) }), '', '', '']] : []),
    ],
    gapsTitle: ctx.t('prt.meth.gapsTitle'),
    gaps: gaps.slice(0, PRINT_BUDGET.gaps).map((gap) => ctx.t(gap.key, Object.fromEntries(Object.entries(gap.params).map(([name, value]) => [name, tenant(value)])))),
    note: ctx.t('prt.meth.note'),
  };
}

/**
 * The transparency lines this deck owes its reader: spans are not read; security only under the
 * SE's identity; a host link not yet opened here; an incident without logs; Davis and RUM counting
 * users differently. Most specific first, so the four that fit are the ones that matter.
 */
export function methodologyGaps(plan: ShotPlan, bundle: EvidenceBundle): I18nText[] {
  const gaps: I18nText[] = [];
  const packOf = (kind: string) => {
    const slot = plan.slots.find((item) => item.kind === kind);
    return slot === undefined ? undefined : bundle[slot.id];
  };
  const logs = packOf('logs-errors');
  const cluster = plan.incident?.clusters[0];
  if (logs?.logs?.incidentLogCount === 0 && cluster !== undefined) gaps.push({ key: 'prt.meth.gap.logs', params: { cluster } });
  const problem = packOf('problem');
  const rum = problem?.frontend?.problem?.users ?? null;
  const davis = problem?.problem?.davisUsers ?? null;
  if (rum !== null && davis !== null && rum !== davis) gaps.push({ key: 'prt.meth.gap.users', params: {} });
  if (packOf('vulnerabilities')?.security === undefined) gaps.push({ key: 'prt.meth.gap.security', params: {} });
  if (plan.slots.some((slot) => slot.kind === 'host' && slot.included)) gaps.push({ key: 'prt.meth.gap.host', params: {} });
  gaps.push({ key: 'prt.meth.gap.spans', params: {} });
  return gaps;
}
