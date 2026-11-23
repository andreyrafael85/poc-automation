import { documentsClient } from '@dynatrace-sdk/client-document';
import { queryExecutionClient } from '@dynatrace-sdk/client-query';

import { TOKEN, VALIDATED_DQL } from '../dashboard/blueprints';
import { DQL, logoMarkdown, markdownText } from '../dashboard/pocDashboard';
import { getQuery, type CatalogId } from '../../queries/catalog';
import { isSafeImageDataUrl } from '../../utils/logo';

/**
 * 3.6.7 — two more kits of the PoC Builder (the owner: "Seguir com a 3.6.7 com suas recomendações"; the 3.6.6 proposal):
 *
 * - the investigation notebook: the order an engineer investigates in — what is open, what repeats, which services fail,
 *   the recent log errors, the hosts at their ceiling, the workloads that restart, the vulnerabilities — each a section
 *   that runs a catalog query exactly as the app runs it (its own window and scan ceiling; rule 9);
 * - the PoC launchpad: the environment's start page for this PoC — the customer's logo, one line on what it is, and
 *   cards to the dashboards and the notebook the PoC created and to the app's own pages.
 *
 * Both are documents (`document:documents:write`, already declared — no new scope), created or updated only by the SE's
 * click (rule 10), and joined to the PoC's register.
 */

type StepVisual = 'table' | 'categoricalBarChart' | 'lineChart' | 'barChart' | 'singleValue' | 'honeycomb';

/**
 * 3.7.2 — the investigation notebook after the owner's SRE microservices notebook: chapters on the golden signals (status,
 * traffic, latency, errors, saturation), then problems, logs, Kubernetes and security; each section with its chart chosen
 * the way the platform's notebooks write it (a single value, a health map, lines with their fields, bars with their axes) and
 * the result of its run kept in the section, so the notebook opens with its charts drawn.
 */
export interface NotebookStep {
  /** Its title: `dash2.tile.<key>` (the dashboards' own titles). */
  key: string;
  chapter: NotebookChapter;
  /** A catalog entry (rule 9) … */
  queryId?: CatalogId;
  /** … or a validated dashboard query (`VALIDATED_DQL` / the PoC dashboard's `DQL`, each with its validation record). */
  dql?: string;
  /** Lines added after the query (the dashboards' own tails). */
  tail?: readonly string[];
  visual: StepVisual;
  /** A single value's field, a chart's value field. */
  field?: string;
  /** A chart's category (bars) or series name (lines). */
  by?: string;
}

export type NotebookChapter = 'status' | 'traffic' | 'latency' | 'failures' | 'saturation' | 'problems' | 'logs' | 'kubernetes' | 'security';
export const NOTEBOOK_CHAPTERS: readonly NotebookChapter[] = ['status', 'traffic', 'latency', 'failures', 'saturation', 'problems', 'logs', 'kubernetes', 'security'];

const V = VALIDATED_DQL;
export const NOTEBOOK_STEPS: readonly NotebookStep[] = [
  { key: 'serviceHealth', chapter: 'status', dql: V.serviceHealth.dql, visual: 'honeycomb', field: 'status', by: 'entity.name' },
  { key: 'problemsActive', chapter: 'status', dql: DQL.problemKpis, visual: 'singleValue', field: 'active' },
  { key: 'sre.successPct', chapter: 'status', dql: V.successPct.dql, visual: 'singleValue', field: 'successPct' },
  { key: 'serviceThroughput', chapter: 'traffic', dql: V.serviceThroughput.dql, visual: 'barChart', field: 'requests', by: 'name' },
  { key: 'p50', chapter: 'latency', dql: V.responsePercentiles.dql, visual: 'singleValue', field: 'p50Ms' },
  { key: 'p90', chapter: 'latency', dql: V.responsePercentiles.dql, visual: 'singleValue', field: 'p90Ms' },
  { key: 'responseTime', chapter: 'latency', dql: DQL.responseTime, visual: 'lineChart', field: 'responseTimeMs' },
  { key: 'serviceFailureRate', chapter: 'failures', dql: V.serviceFailureRate.dql, visual: 'lineChart', field: 'failurePct', by: 'name' },
  { key: 'svcRanking', chapter: 'failures', queryId: 'svc.ranking', visual: 'table' },
  { key: 'infra.cpuTop', chapter: 'saturation', dql: V.cpuTop.dql, visual: 'lineChart', field: 'cpu', by: 'host' },
  { key: 'infra.memoryTop', chapter: 'saturation', dql: V.memoryTop.dql, visual: 'lineChart', field: 'memory', by: 'host' },
  { key: 'processCpu', chapter: 'saturation', dql: V.processCpu.dql, visual: 'lineChart', field: 'cpu', by: 'name' },
  { key: 'nb.problemList', chapter: 'problems', queryId: 'prob.list', visual: 'table' },
  { key: 'problemMix', chapter: 'problems', queryId: 'prob.summary', visual: 'categoricalBarChart', field: 'problems', by: 'event.category' },
  { key: 'sre.recurring', chapter: 'problems', queryId: 'prob.recurrent', visual: 'table' },
  {
    key: 'logPatterns',
    chapter: 'logs',
    queryId: 'log.errors.grouped',
    tail: ['| fieldsAdd origin = coalesce(service, workload, bucket)', '| fields last, origin, message, count, hosts'],
    visual: 'table',
  },
  { key: 'sre.logQuality', chapter: 'logs', queryId: 'log.quality', visual: 'table' },
  { key: 'nb.restarts', chapter: 'kubernetes', queryId: 'k8s.restarts', visual: 'categoricalBarChart', field: 'total', by: 'workload' },
  { key: 'secPosture', chapter: 'security', queryId: 'sec.posture', visual: 'table' },
];

export const NOTEBOOK_TIMEFRAME = { from: 'now()-24h', to: 'now()' } as const;

/** 3.7.3: section heights after the owner's resized notebook (2026-11-23). */
export const SECTION_HEIGHT: Readonly<Record<StepVisual, number>> = {
  singleValue: 160,
  honeycomb: 160,
  lineChart: 220,
  barChart: 220,
  categoricalBarChart: 260,
  table: 260,
};

interface QuerySettings {
  maxResultRecords: number;
  defaultScanLimitGbytes: number;
  maxResultMegaBytes: number;
  defaultSamplingRatio: number;
  enableSampling: false;
}

/** The result a notebook section keeps of its last run (as the platform's notebooks write it). */
export interface SectionResult {
  code: 200;
  value: { records: unknown[]; metadata: unknown; types: unknown };
  notifications: unknown[];
  querySettings: QuerySettings;
  dateTime: string;
  input: { value: string; timeframe: { from: string; to: string } };
}

export interface NotebookSection {
  id: string;
  type: 'markdown' | 'dql';
  markdown?: string;
  title?: string;
  showTitle?: boolean;
  showInput?: boolean;
  /** 3.7.3: the section's height in pixels, as the owner sized his copy (a figure 160, a chart 220, a table 260). */
  height?: number;
  state?: {
    input: { value: string; timeframe: { from: string; to: string } };
    visualization: StepVisual;
    visualizationSettings: Record<string, unknown> & { autoSelectVisualization: false };
    querySettings: QuerySettings;
    state?: 'success';
    result?: SectionResult;
  };
}

export interface NotebookContent {
  version: '7';
  defaultTimeframe: { from: string; to: string };
  sections: NotebookSection[];
}

export interface NotebookWords {
  title: string;
  intro: string;
  logo?: { src: string; alt: string };
  chapter: (key: NotebookChapter, index: number) => { title: string; why: string };
  tile: (key: string) => string;
  footer: string;
}

/** A catalog window as a notebook timeframe (`now-7d` → `now()-7d`); `undefined` for the notebook's own. */
export function sectionTimeframe(queryId: CatalogId): { from: string; to: string } | undefined {
  const timeframe = getQuery(queryId).timeframe;
  if (typeof timeframe !== 'object' || !('relative' in timeframe)) return undefined;
  return { from: timeframe.relative.replace(/^now-/, 'now()-'), to: 'now()' };
}

/** A step's query, as the app (or the dashboards) run it. */
export function stepQuery(step: NotebookStep): string {
  const base = step.queryId === undefined ? (step.dql ?? '') : getQuery(step.queryId).dql;
  return step.tail === undefined ? base : [base, ...step.tail].join('\n');
}

/** How a step draws, as the platform's notebooks write it (3.7.2: the owner's SRE notebook as the model). */
export function stepVisualization(step: NotebookStep): NonNullable<NotebookSection['state']>['visualizationSettings'] {
  const base = { autoSelectVisualization: false as const };
  switch (step.visual) {
    case 'singleValue':
      return {
        ...base,
        // 3.7.3: as the owner's copy has it — no autoscale (it drew the figure across the whole section).
        singleValue: { labelMode: 'none', recordField: step.field, prefixIcon: '', trend: { isVisible: false } },
      };
    case 'honeycomb':
      return {
        ...base,
        honeycomb: {
          shape: 'hexagon',
          legend: { hidden: false, position: 'auto' },
          displayedFields: [step.by],
          dataMappings: { value: step.field },
          truncationMode: 'middle',
          colorMode: 'custom-colors',
          customColors: [
            { id: 0, value: 'OK', comparator: '=', color: { Default: TOKEN.ok } },
            { id: 1, value: 'AVAILABILITY', comparator: '=', color: { Default: TOKEN.availability } },
            { id: 2, value: 'ERROR', comparator: '=', color: { Default: TOKEN.error } },
            { id: 3, value: 'SLOWDOWN', comparator: '=', color: { Default: TOKEN.slowdown } },
            { id: 4, value: 'RESOURCE_CONTENTION', comparator: '=', color: { Default: TOKEN.resource } },
          ],
        },
      };
    case 'categoricalBarChart':
      return {
        ...base,
        chartSettings: {
          categoricalBarChartSettings: {
            layout: 'horizontal',
            categoryAxis: [step.by],
            categoryAxisLabel: step.by,
            valueAxis: [step.field],
            valueAxisLabel: step.field,
            colorPaletteMode: 'multi-color',
            tooltipVariant: 'single',
          },
        },
      };
    case 'lineChart':
    case 'barChart':
      return {
        ...base,
        chartSettings: {
          gapPolicy: 'connect',
          fieldMapping: { timestamp: 'timeframe', leftAxisValues: [step.field], leftAxisDimensions: step.by === undefined ? [] : [step.by] },
        },
      };
    default:
      return { ...base, chartSettings: {} };
  }
}

/** The investigation notebook: the header, then per chapter its explanation and its sections. Pure. */
export function buildInvestigationNotebook(words: NotebookWords): NotebookContent {
  const logo = words.logo !== undefined && isSafeImageDataUrl(words.logo.src) ? `${logoMarkdown(words.logo)}\n\n` : '';
  const sections: NotebookSection[] = [{ id: '1', type: 'markdown', markdown: `${logo}# ${markdownText(words.title)}\n\n${markdownText(words.intro)}` }];
  NOTEBOOK_CHAPTERS.forEach((chapter, index) => {
    const steps = NOTEBOOK_STEPS.filter((step) => step.chapter === chapter);
    if (steps.length === 0) return;
    const text = words.chapter(chapter, index + 1);
    sections.push({ id: String(sections.length + 1), type: 'markdown', markdown: `## ${markdownText(text.title)}\n\n${markdownText(text.why)}` });
    for (const step of steps) {
      const entry = step.queryId === undefined ? null : getQuery(step.queryId);
      const timeframe = (step.queryId === undefined ? undefined : sectionTimeframe(step.queryId)) ?? { ...NOTEBOOK_TIMEFRAME };
      sections.push({
        id: String(sections.length + 1),
        type: 'dql',
        title: words.tile(step.key),
        showTitle: true,
        showInput: false,
        height: SECTION_HEIGHT[step.visual],
        state: {
          input: { value: stepQuery(step), timeframe },
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
  });
  sections.push({ id: String(sections.length + 1), type: 'markdown', markdown: `_${markdownText(words.footer)}_` });
  return { version: '7', defaultTimeframe: { ...NOTEBOOK_TIMEFRAME }, sections };
}

/** Runs one query over a window; its records, types and metadata, or null when it did not answer. */
export type NotebookRunner = (query: string, window: { startIso: string; endIso: string }, settings: QuerySettings) => Promise<SectionResult['value'] | null>;

const UNIT_MS: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `now()-24h` → the window it reads, ending `now`; 3.7.7: an absolute timeframe (ISO from and to, the weekly report) as it is. */
export function windowOf(timeframe: { from: string; to?: string }, now: number): { startIso: string; endIso: string } {
  const from = Date.parse(timeframe.from);
  const to = timeframe.to === undefined ? Number.NaN : Date.parse(timeframe.to);
  if (!Number.isNaN(from) && !Number.isNaN(to) && from < to) return { startIso: new Date(from).toISOString(), endIso: new Date(to).toISOString() };
  const match = /^now\(\)-(\d+)([mhd])$/.exec(timeframe.from);
  const span = match === null ? UNIT_MS['d'] ?? 0 : Number(match[1]) * (UNIT_MS[match[2] ?? 'd'] ?? 0);
  return { startIso: new Date(now - span).toISOString(), endIso: new Date(now).toISOString() };
}

/**
 * 3.7.2 (the owner: "o notebook ainda não veio com os gráficos"): runs each section once, at creation or update, and keeps
 * its result in the section — as a notebook keeps its last run — so it opens with its charts drawn; a section whose query
 * did not answer keeps no result (it runs when opened). The same queries the app reads, with their own ceilings.
 */
export async function withResults(content: NotebookContent, run: NotebookRunner, now = Date.now()): Promise<NotebookContent> {
  const sections = await Promise.all(
    content.sections.map(async (section) => {
      if (section.type !== 'dql' || section.state === undefined) return section;
      const state = section.state;
      try {
        const value = await run(state.input.value, windowOf(state.input.timeframe, now), state.querySettings);
        if (value === null) return section;
        const result: SectionResult = {
          code: 200,
          value,
          notifications: [],
          querySettings: state.querySettings,
          dateTime: new Date(now).toISOString(),
          input: { value: state.input.value, timeframe: state.input.timeframe },
        };
        return { ...section, state: { ...state, state: 'success' as const, result } };
      } catch {
        return section;
      }
    }),
  );
  return { ...content, sections };
}

/** The platform's query service as a `NotebookRunner` (the app user's own permissions; the scopes are already declared). */
export const queryServiceRunner: NotebookRunner = async (query, window, settings) => {
  const started = await queryExecutionClient.queryExecute({
    body: {
      query,
      defaultTimeframeStart: window.startIso,
      defaultTimeframeEnd: window.endIso,
      requestTimeoutMilliseconds: 15000,
      maxResultRecords: settings.maxResultRecords,
      defaultScanLimitGbytes: settings.defaultScanLimitGbytes,
    },
  });
  let result = started.result;
  for (let poll = 0; result === undefined && started.requestToken !== undefined && poll < 20; poll += 1) {
    const response = await queryExecutionClient.queryPoll({ requestToken: started.requestToken, requestTimeoutMilliseconds: 3000 });
    if (response.state === 'SUCCEEDED') result = response.result;
    else if (response.state !== 'RUNNING' && response.state !== 'NOT_STARTED') return null;
  }
  return result === undefined ? null : { records: result.records, metadata: result.metadata, types: result.types };
};

/**
 * 3.7.2 (the owner: the cards showed "Couldn't load image"): the launchpad lists its items as the platform's own launchpads
 * list notebooks and dashboards — a document opens by its id (`openDocument`), an app page by its address, with the app's
 * icon — so no item waits for a picture the app does not have.
 */
export interface LaunchpadItem {
  title: string;
  description: string;
  /** A document of this PoC (dashboard or notebook) … */
  documentId?: string;
  category?: 'dashboards' | 'notebooks';
  /** … or a page (the app's own). */
  url?: string;
}

export interface LaunchpadWords {
  title: string;
  intro: string;
  logo?: { src: string; alt: string };
  groups: readonly { heading: string; description: string; items: readonly LaunchpadItem[] }[];
  footer: string;
  /** The app icon an app page shows (the platform's registry address). */
  appIcon: string;
}

/**
 * 3.7.1: a block or card id in the shape the platform's launchpads use (a UUID), stable for one launchpad — the owner's
 * first launchpad was refused ("Launchpad structure is invalid … expected 1 at containerList.containers[0].horizontalLayoutWeight").
 */
export function launchpadId(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

type LaunchpadLink =
  | { id: string; type: 'doc'; title: string; action: { type: 'openDocument'; documentId: string }; icon: ''; categoryId: 'dashboards' | 'notebooks' }
  | { id: string; type: 'link'; title: string; description: string; action: { type: 'openExternalLink'; url: string }; icon: string };

type LaunchpadBlock =
  | { id: string; type: 'markdown'; properties: { expanded: true }; content: string }
  | {
      id: string;
      type: 'links';
      properties: { expanded: true };
      appearance: 'list';
      title: string;
      description: string;
      contentType: 'static';
      content: LaunchpadLink[];
    };

export interface LaunchpadContent {
  schemaVersion: 2;
  icon: 'default';
  background: 'default';
  containerList: { containers: { blocks: LaunchpadBlock[]; horizontalLayoutWeight: 1 }[] };
}

/** The PoC launchpad: the header with the logo, then a list of links per group (empty groups left out). Pure. */
export function buildPocLaunchpad(words: LaunchpadWords): LaunchpadContent {
  const logo = words.logo !== undefined && isSafeImageDataUrl(words.logo.src) ? `${logoMarkdown(words.logo)}\n\n` : '';
  const blocks: LaunchpadBlock[] = [
    { id: launchpadId(1), type: 'markdown', properties: { expanded: true }, content: `${logo}# ${markdownText(words.title)}\n\n${markdownText(words.intro)}` },
  ];
  let link = 0;
  for (const group of words.groups) {
    if (group.items.length === 0) continue;
    blocks.push({
      id: launchpadId(blocks.length + 1),
      type: 'links',
      properties: { expanded: true },
      appearance: 'list',
      title: group.heading,
      description: group.description,
      contentType: 'static',
      content: group.items.flatMap((item): LaunchpadLink[] => {
        link += 1;
        const id = launchpadId(1000 + link);
        if (item.documentId !== undefined) {
          return [{ id, type: 'doc', title: item.title, action: { type: 'openDocument', documentId: item.documentId }, icon: '', categoryId: item.category ?? 'dashboards' }];
        }
        if (item.url !== undefined) {
          return [{ id, type: 'link', title: item.title, description: item.description, action: { type: 'openExternalLink', url: item.url }, icon: words.appIcon }];
        }
        return [];
      }),
    });
  }
  blocks.push({ id: launchpadId(blocks.length + 1), type: 'markdown', properties: { expanded: true }, content: `_${markdownText(words.footer)}_` });
  return { schemaVersion: 2, icon: 'default', background: 'default', containerList: { containers: [{ blocks, horizontalLayoutWeight: 1 }] } };
}

export type PocDocumentType = 'notebook' | 'launchpad';

const blobOf = (content: unknown) => new Blob([JSON.stringify(content)], { type: 'application/json' });

/** Creates the document on the tenant; returns its id. */
export async function createPocDocument(type: PocDocumentType, content: NotebookContent | LaunchpadContent, name: string, shared: boolean): Promise<string> {
  const metadata = await documentsClient.createDocument({ body: { name, type, content: blobOf(content), isPrivate: !shared } });
  return metadata.id;
}

/** Replaces the content (and name, visibility) of a document this app created. */
export async function updatePocDocument(id: string, content: NotebookContent | LaunchpadContent, name: string, shared: boolean): Promise<void> {
  const metadata = await documentsClient.getDocumentMetadata({ id });
  await documentsClient.updateDocument({ id, optimisticLockingVersion: metadata.version, body: { name, content: blobOf(content), isPrivate: !shared } });
}
