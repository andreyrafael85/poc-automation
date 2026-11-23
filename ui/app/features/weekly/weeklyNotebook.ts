import { DQL } from '../dashboard/pocDashboard';
import { VALIDATED_DQL } from '../dashboard/blueprints';
import { SECTION_HEIGHT, stepQuery, stepVisualization, type NotebookContent, type NotebookSection, type NotebookStep } from '../builder/pocDocuments';
import { getQuery } from '../../queries/catalog';
import type { QueryWindow } from '../triage/triage';

/**
 * 3.7.7 — the weekly report as a Dynatrace notebook (the owner approved the 3.7.6 proposal: "AI Observability e o notebook
 * semanal"). The weekly action writes, every Monday, a notebook "PoC weekly report — <customer> — <day>": the week's tables
 * (the same Markdown the e-mail sends), then charts drawn by the platform over that same week — an absolute timeframe, so the
 * notebook keeps describing its week when it is opened later — each section a catalog entry or a validated dashboard query
 * (rule 9), its result kept so it opens drawn. A notebook is shareable with the customer's users of the tenant, which a PDF
 * from a workflow cannot be (no binary output, no attachment).
 */

export interface WeeklyNotebookWords {
  /** The sections' titles, in order: by category, what repeated, response time, failure rate, services. */
  titles: { mix: string; recurring: string; responseTime: string; failureRate: string; services: string };
  /** One line under the tables: the charts read the same week. */
  chartsNote: string;
  footer: string;
}

/** The sections after the tables, in reading order (each a catalog entry or a validated dashboard query). */
export const WEEKLY_NOTEBOOK_STEPS: readonly (NotebookStep & { slot: keyof WeeklyNotebookWords['titles'] })[] = [
  { key: 'problemMix', slot: 'mix', chapter: 'problems', queryId: 'prob.summary', visual: 'categoricalBarChart', field: 'problems', by: 'event.category' },
  { key: 'sre.recurring', slot: 'recurring', chapter: 'problems', queryId: 'prob.recurrent', visual: 'table' },
  { key: 'responseTime', slot: 'responseTime', chapter: 'latency', dql: DQL.responseTime, visual: 'lineChart', field: 'responseTimeMs' },
  { key: 'serviceFailureRate', slot: 'failureRate', chapter: 'failures', dql: VALIDATED_DQL.serviceFailureRate.dql, visual: 'lineChart', field: 'failurePct', by: 'name' },
  { key: 'svcRanking', slot: 'services', chapter: 'failures', queryId: 'svc.ranking', visual: 'table' },
];

/** The weekly report notebook over one week (absolute). Pure. */
export function buildWeeklyNotebook(tables: string, week: QueryWindow, words: WeeklyNotebookWords): NotebookContent {
  const timeframe = { from: week.startIso, to: week.endIso };
  const sections: NotebookSection[] = [{ id: '1', type: 'markdown', markdown: `${tables}\n\n_${words.chartsNote}_` }];
  for (const step of WEEKLY_NOTEBOOK_STEPS) {
    const entry = step.queryId === undefined ? null : getQuery(step.queryId);
    sections.push({
      id: String(sections.length + 1),
      type: 'dql',
      title: words.titles[step.slot],
      showTitle: true,
      showInput: false,
      height: SECTION_HEIGHT[step.visual],
      state: {
        input: { value: stepQuery(step), timeframe: { ...timeframe } },
        visualization: step.visual,
        visualizationSettings: stepVisualization(step),
        querySettings: {
          maxResultRecords: Math.min(entry?.guards?.maxResultRecords ?? 1000, 1000),
          defaultScanLimitGbytes: entry?.guards?.scanLimitGbytes ?? 5,
          maxResultMegaBytes: 1,
          defaultSamplingRatio: 10,
          enableSampling: false,
        },
      },
    });
  }
  sections.push({ id: String(sections.length + 1), type: 'markdown', markdown: `_${words.footer}_` });
  return { version: '7', defaultTimeframe: { ...timeframe }, sections };
}

/** A document id the platform returned (anything else is not linked). */
const DOCUMENT_ID = /^[A-Za-z0-9-]{8,80}$/;

/** The notebook's address on the tenant, or null for an id that is not a document id. */
export function notebookLink(environmentUrl: string, id: string): string | null {
  return DOCUMENT_ID.test(id) ? `${environmentUrl.replace(/\/+$/, '')}/ui/apps/dynatrace.notebooks/notebook/${id}` : null;
}
