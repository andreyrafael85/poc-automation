import Colors from '@dynatrace/strato-design-tokens/colors';
import { isSafeImageDataUrl } from '../../utils/logo';
import { documentsClient } from '@dynatrace-sdk/client-document';

import { getQuery, type CatalogId } from '../../queries/catalog';
import { quoteDqlString } from '../../queries/params';

/**
 * The "Value of the PoC" dashboard (3.2.5, milestone M5).
 *
 * Built only when the SE clicks "Create on the tenant" in Settings — never at deploy, never on its
 * own — from catalog queries that are already validated, and from none that carries licensing,
 * consumption or price: the dashboard sells the PoC by what it measured. The document is the
 * SE's, private unless the SE shares it read-only with the environment; updating it replaces the
 * same document (optimistic locking on its version) instead of adding a copy.
 *
 * The content follows the Dashboards app's document format, version 21 (tiles keyed by id, a
 * 24-column layout, a default timeframe), as found in dashboards exported from the platform.
 *
 * 3.2.6: the owner found the first version "too simple" — eight plain tiles. It is now laid out like
 * the field dashboards SEs build by hand: a header that says who, when and what question it
 * answers; the objectives as a table, pillar by pillar, with their verdict; numbered sections with
 * emoji headers; status-coloured single values over the charts and tables; and a closing block
 * with the next steps. Sections the tenant did not prove (real users, security, automation) are
 * left out. Still nothing commercial, and still only created by the SE's own click.
 */

export const DASHBOARD_VERSION = 21;
/** The dashboard's default window: the PoC's working week. */
export const DASHBOARD_TIMEFRAME = { from: 'now()-7d', to: 'now()' } as const;

export type DashboardVisualization = 'table' | 'categoricalBarChart' | 'singleValue' | 'lineChart' | 'areaChart' | 'barChart' | 'donutChart' | 'honeycomb';

/** The sections of the dashboard, in reading order (3.2.6). */
export type DashboardSectionId = 'estate' | 'problems' | 'services' | 'experience' | 'security' | 'automation' | 'coverage';

export const DASHBOARD_SECTIONS: readonly DashboardSectionId[] = ['estate', 'problems', 'services', 'experience', 'security', 'automation', 'coverage'];

/** The sections a tenant has to prove before they are drawn; the others are always there. */
export type DashboardEvidence = 'experience' | 'security' | 'automation' | 'kubernetes' | 'synthetic';

/** How a single value is coloured: by status bands, the platform's own status colours. */
export interface SingleValueRule {
  field: string;
  /** `lower`: green under `good`, amber from it, red from `bad`. `higher`: the other way round. `none`: no colour. */
  better: 'lower' | 'higher' | 'none';
  good?: number;
  bad?: number;
}

export interface DashboardTilePlan {
  /** Stable key: the tile's i18n title is `dash2.tile.<key>`. */
  key: string;
  /** A section of the blueprint the tile belongs to (`DashboardSectionId` for "Value of the PoC"). */
  section: string;
  /** A catalog query, as the app runs it. */
  queryId?: CatalogId;
  /** …or a dashboard query, validated on the validation tenant (2026-10-05). */
  dql?: string;
  /** Lines appended to the catalog query (a projection or a sum of its own fields). */
  tail?: readonly string[];
  visualization: DashboardVisualization;
  w: number;
  h: number;
  singleValue?: SingleValueRule;
  /** 3.7.1: visualization settings of the tile's own (a honeycomb's mapping and colours, a table's colour rules…). */
  settings?: Readonly<Record<string, unknown>>;
}

/**
 * Dashboard queries that are not in the catalog (3.2.6), each run live on the validation tenant
 * on 2026-10-05 over 7 days: entity counts (0 bytes), the problem KPIs in one pass (2,507 problems,
 * 20 root-caused, 85 active, MTTR 10.6 h; 0 bytes), problems by start in 6-hour bins
 * (`makeTimeseries` on `event.start`), and the services' golden signals with the response time
 * in milliseconds.
 */
export const DQL = {
  hosts: 'fetch dt.entity.host\n| summarize hosts = count()',
  services: 'fetch dt.entity.service\n| summarize services = count()',
  processes: 'fetch dt.entity.process_group_instance\n| summarize processes = count()',
  webApps: 'fetch dt.entity.application\n| summarize webApps = count()',
  problemKpis: [
    'fetch dt.davis.problems',
    '| filter not dt.davis.is_duplicate',
    '| summarize total = count(), rootCaused = countIf(isNotNull(root_cause_entity_name)),',
    '    active = countIf(event.status == "ACTIVE"), closed = countIf(event.status == "CLOSED"),',
    '    resolvedNs = sum(if(event.status == "CLOSED", resolved_problem_duration))',
    '| fieldsAdd rootCausePct = round(100.0 * rootCaused / total, decimals: 1),',
    '    mttrHours = round(toDouble(resolvedNs) / closed / 3600000000000.0, decimals: 1)',
  ].join('\n'),
  problemTimeline: [
    'fetch dt.davis.problems',
    '| filter not dt.davis.is_duplicate',
    '| makeTimeseries {problems = count(), rootCaused = countIf(isNotNull(root_cause_entity_name))}, time: event.start, interval: 6h',
  ].join('\n'),
  golden: [
    'timeseries { requests = sum(dt.service.request.count), failures = sum(dt.service.request.failure_count) }, interval: 1h',
  ].join('\n'),
  responseTime: [
    'timeseries { rt = avg(dt.service.request.response_time) }, interval: 1h',
    '| fieldsAdd responseTimeMs = rt[] / 1000',
    '| fields timeframe, interval, responseTimeMs',
  ].join('\n'),
} as const;

/** The tiles, in reading order. Each section starts on a row of its own, under its header. */
export const DASHBOARD_TILES: readonly DashboardTilePlan[] = [
  // 🗺️ the estate under observation
  { key: 'hosts', section: 'estate', dql: DQL.hosts, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'hosts', better: 'none' } },
  { key: 'services', section: 'estate', dql: DQL.services, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'services', better: 'none' } },
  { key: 'processes', section: 'estate', dql: DQL.processes, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'processes', better: 'none' } },
  { key: 'webApps', section: 'estate', dql: DQL.webApps, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'webApps', better: 'none' } },
  { key: 'inventory', section: 'estate', queryId: 'cov.inventory', visualization: 'categoricalBarChart', w: 24, h: 6 },
  // 🧠 problems and their root causes
  { key: 'problemsActive', section: 'problems', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'active', better: 'lower', good: 1, bad: 10 } },
  { key: 'problemsTotal', section: 'problems', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'total', better: 'none' } },
  { key: 'rootCausePct', section: 'problems', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'rootCausePct', better: 'none' } },
  { key: 'mttrHours', section: 'problems', dql: DQL.problemKpis, visualization: 'singleValue', w: 6, h: 3, singleValue: { field: 'mttrHours', better: 'lower', good: 4, bad: 24 } },
  { key: 'problemTimeline', section: 'problems', dql: DQL.problemTimeline, visualization: 'lineChart', w: 24, h: 5 },
  { key: 'problemMix', section: 'problems', queryId: 'prob.summary', visualization: 'categoricalBarChart', w: 12, h: 6 },
  { key: 'mttx', section: 'problems', queryId: 'prob.mttx', visualization: 'table', w: 12, h: 6 },
  { key: 'topEntities', section: 'problems', queryId: 'prob.topentities', visualization: 'table', w: 24, h: 6 },
  // ⚡ services
  { key: 'svcTraffic', section: 'services', queryId: 'svc.ranking.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'services', better: 'none' } },
  { key: 'svcAboveOne', section: 'services', queryId: 'svc.ranking.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'aboveOnePct', better: 'lower', good: 1, bad: 5 } },
  {
    key: 'svcResponse',
    section: 'services',
    queryId: 'svc.ranking.total',
    tail: ['| fieldsAdd responseMs = round(weightedResponseUs / 1000, decimals: 0)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'responseMs', better: 'lower', good: 300, bad: 1000 },
  },
  { key: 'golden', section: 'services', dql: DQL.golden, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'responseTime', section: 'services', dql: DQL.responseTime, visualization: 'lineChart', w: 12, h: 5 },
  { key: 'svcRanking', section: 'services', queryId: 'svc.ranking', visualization: 'table', w: 24, h: 7 },
  // 🖥️ digital experience (only when real users were measured)
  { key: 'rumScorecard', section: 'experience', queryId: 'rum.scorecard', visualization: 'table', w: 12, h: 6 },
  { key: 'rumVitals', section: 'experience', queryId: 'rum.webvitals', visualization: 'table', w: 12, h: 6 },
  // 🛡️ security (only when the posture could be read)
  {
    key: 'secTotal',
    section: 'security',
    queryId: 'sec.posture',
    tail: ['| summarize total = sum(vulnerabilities)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'total', better: 'lower', good: 1, bad: 1 },
  },
  {
    key: 'secActNow',
    section: 'security',
    queryId: 'sec.posture',
    tail: ['| summarize actNow = sum(actNow)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'actNow', better: 'lower', good: 1, bad: 1 },
  },
  {
    key: 'secExploitable',
    section: 'security',
    queryId: 'sec.posture',
    tail: ['| summarize exploitable = sum(exploitable)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'exploitable', better: 'lower', good: 1, bad: 10 },
  },
  { key: 'secPosture', section: 'security', queryId: 'sec.posture', visualization: 'table', w: 24, h: 6 },
  // 🤖 automation (only when workflows ran)
  { key: 'wfCount', section: 'automation', queryId: 'auto.workflows.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'workflows', better: 'none' } },
  { key: 'wfExecutions', section: 'automation', queryId: 'auto.workflows.total', visualization: 'singleValue', w: 8, h: 3, singleValue: { field: 'executions', better: 'none' } },
  {
    key: 'wfSuccess',
    section: 'automation',
    queryId: 'auto.workflows.total',
    tail: ['| fieldsAdd successPct = round(100.0 * succeeded / executions, decimals: 1)'],
    visualization: 'singleValue',
    w: 8,
    h: 3,
    singleValue: { field: 'successPct', better: 'higher', good: 95, bad: 80 },
  },
  // 🧩 coverage and technologies
  { key: 'technologies', section: 'coverage', queryId: 'proc.technologies', visualization: 'table', w: 24, h: 6 },
];

interface MarkdownTile {
  type: 'markdown';
  title: string;
  content: string;
}

interface ColorRule {
  value: number;
  comparator: '≥' | '<';
  field: string;
  colorMode: 'custom-color';
  customColor: { Default: string };
  type: 'double';
}

interface DataTile {
  type: 'data';
  title: string;
  query: string;
  visualization: DashboardVisualization;
  visualizationSettings: {
    autoSelectVisualization: false;
    singleValue?: {
      labelMode: 'none';
      recordField: string;
      prefixIcon: string;
      sparklineSettings?: { isVisible: false };
      trend: { isVisible: false; isRelative?: false };
      isIconVisible?: boolean;
      colorThresholdTarget?: 'background';
    };
    coloring?: { colorRules: readonly unknown[] };
    [setting: string]: unknown;
  };
  querySettings: {
    maxResultRecords: number;
    defaultScanLimitGbytes: number;
    maxResultMegaBytes: number;
    defaultSamplingRatio: number;
    enableSampling: false;
  };
  davis: { davisVisualization: { isAvailable: true } };
}

/** 3.7.1: an SLO the PoC created, drawn by the platform's own SLO tile. */
interface SloTile {
  type: 'slo';
  title: string;
  input: string;
  /** 3.7.2: the dashboards app refuses an SLO tile without its columns and options (the owner's overview, 3.7.1). */
  visualizationSettings: { columns: readonly SloColumn[]; options: { showLabels: boolean; colorizeBackground: boolean } };
}

export type SloColumn = 'status' | 'errorBudget' | 'target' | 'evaluationPeriod';

/** 3.7.2: the settings of an SLO tile as the dashboards app writes them (read from an SLO tile made in its editor on the lab). */
export const SLO_TILE_SETTINGS: SloTile['visualizationSettings'] = {
  columns: ['status', 'errorBudget', 'target', 'evaluationPeriod'],
  options: { showLabels: true, colorizeBackground: false },
};

/** 3.7.2 — the owner's resized dashboard ("Operação e confiabilidade", 2026-11-22) as rules for every section. */
export const TILE_HEIGHT = { single: 2, chart: 5, table: 6, honeycomb: 4, honeycombWithFigures: 3 } as const;

interface Placed<T> {
  plan: T;
  x: number;
  /** Rows below the section's banner. */
  dy: number;
  w: number;
  h: number;
}

const kindOf = (visualization: DashboardVisualization) =>
  visualization === 'singleValue' ? 'single' : visualization === 'honeycomb' ? 'honeycomb' : visualization === 'table' ? 'table' : 'chart';

/** `n` widths that fill the 24 columns (the first ones a column wider when 24 does not divide). */
export function rowWidths(n: number): number[] {
  const base = Math.floor(24 / n);
  return Array.from({ length: n }, (_, index) => base + (index < 24 - base * n ? 1 : 0));
}

/**
 * 3.7.2: a section's tiles laid out after the owner's own resize of the SRE dashboard — the figures first, in rows of up to
 * six at height 2; a health map with up to three figures beside it in one row of height 3; then the charts and tables in the
 * blueprint's order, two to a row at half width (a chart 5 high, a table 6, a pair as high as its taller one), the one left
 * over across the whole width.
 */
export function arrangeSection<T extends { visualization: DashboardVisualization }>(plans: readonly T[]): Placed<T>[] {
  const out: Placed<T>[] = [];
  let dy = 0;
  const singles = plans.filter((plan) => kindOf(plan.visualization) === 'single');
  const combs = plans.filter((plan) => kindOf(plan.visualization) === 'honeycomb');
  let rest = plans.filter((plan) => kindOf(plan.visualization) !== 'single');
  if (combs.length === 1 && singles.length >= 1 && singles.length <= 3) {
    const comb = combs[0] as T;
    const h = TILE_HEIGHT.honeycombWithFigures;
    out.push({ plan: comb, x: 0, dy, w: 12, h });
    const w = 12 / singles.length;
    singles.forEach((plan, index) => out.push({ plan, x: 12 + index * w, dy, w, h }));
    dy += h;
    rest = rest.filter((plan) => plan !== comb);
  } else {
    const rows = Math.ceil(singles.length / 6);
    for (let row = 0; row < rows; row += 1) {
      const perRow = Math.ceil(singles.length / rows);
      const chunk = singles.slice(row * perRow, (row + 1) * perRow);
      const widths = rowWidths(chunk.length);
      let x = 0;
      chunk.forEach((plan, index) => {
        const w = widths[index] ?? 4;
        out.push({ plan, x, dy, w, h: TILE_HEIGHT.single });
        x += w;
      });
      dy += TILE_HEIGHT.single;
    }
  }
  const heightOf = (plan: T) => TILE_HEIGHT[kindOf(plan.visualization) as 'chart' | 'table' | 'honeycomb'];
  for (let index = 0; index < rest.length; index += 2) {
    const left = rest[index] as T;
    const right = rest[index + 1];
    if (right === undefined) {
      out.push({ plan: left, x: 0, dy, w: 24, h: heightOf(left) });
      dy += heightOf(left);
    } else {
      const h = Math.max(heightOf(left), heightOf(right));
      out.push({ plan: left, x: 0, dy, w: 12, h }, { plan: right, x: 12, dy, w: 12, h });
      dy += h;
    }
  }
  return out;
}

export interface DashboardDocument {
  version: number;
  variables: never[];
  tiles: Record<string, MarkdownTile | DataTile | SloTile>;
  layouts: Record<string, { x: number; y: number; w: number; h: number }>;
  settings: { defaultTimeframe: { enabled: true; value: { from: string; to: string } } };
  annotations: never[];
}

/**
 * A query pinned to another window than the dashboard's carries that window in its own text
 * (`fetch security.events, from: now()-30m`), so the tile reads what the app reads. Only a query
 * with a single `fetch` is pinned this way; any other follows the dashboard's window.
 */
export function pinWindow(dql: string, relative: string | null): string {
  if (relative === null || relative === 'now-7d') return dql;
  const fetches = dql.match(/\bfetch\s+[\w.]+/g) ?? [];
  if (fetches.length !== 1) return dql;
  const amount = relative.replace(/^now-/, '');
  return dql.replace(/^fetch\s+([\w.]+)/, `fetch $1, from: now()-${amount}`);
}

/** One objective of the PoC plan, as the dashboard's table lists it. */
export interface DashboardGoal {
  pillar: string;
  text: string;
  target: string;
  measured: string;
  status: 'met' | 'not-met' | 'open';
}

export interface DashboardWords {
  /** "Value of the PoC — Acme". */
  title: string;
  /**
   * 3.6.6 (the owner: the customer's logo in the top-left corner of every dashboard the PoC creates): a raster data URL
   * the app already validated and reduced (`dashboardLogo.ts`), drawn in a markdown tile of its own beside the header.
   */
  logo?: { src: string; alt: string };
  /**
   * 3.8.1 (the owner: "ao selecionar a cor nas configurações o dashboard além da logo … ter o padrão de cores do cliente"): the
   * customer's brand colour (Settings → Customer's brand colour) on every section banner; absent (the "Default" tone), each
   * dashboard keeps its own banner colour.
   */
  banner?: string;
  /** The opening paragraph: engagement, window, provenance. */
  intro: string;
  /** "Customer: … · Start: … · Day 12" — label/value pairs, already translated. */
  facts?: readonly { label: string; value: string }[];
  /** "This dashboard answers: …" */
  question?: string;
  /** The objectives heading, and one line per objective (kept for a plan without pillars). */
  objectivesTitle: string;
  objectives: string[];
  /** 3.2.6: the objectives as a table, pillar by pillar, with their live verdict at creation. */
  goals?: readonly DashboardGoal[];
  goalHeaders?: readonly [string, string, string, string, string];
  goalStatus?: Readonly<Record<DashboardGoal['status'], string>>;
  /** "Snapshot of 5 Oct 2026 — update it from the app." */
  snapshot?: string;
  /** The heading of each section, with its emoji. */
  sectionTitle?: (section: string, index: number) => string;
  /** What to do next, as bullets under the footer heading. */
  nextTitle?: string;
  next?: readonly string[];
  /** Closing note. */
  footer: string;
  /** The title of each tile, already translated. */
  tileTitle: (key: string) => string;
  /** The sections the tenant proved; the others are left out ("only what the estate proves"). */
  evidence?: ReadonlySet<DashboardEvidence>;
  /** 3.7.1: the SLOs the PoC created (id and name), for a blueprint with an SLO section; none yet → `sloNone`. */
  slos?: readonly { id: string; name: string; kind?: string }[];
  sloNone?: string;
}

/** Escapes Markdown control characters in text that came from Settings. */
export function markdownText(text: string): string {
  return text.replace(/[\\`*_{}[\]<>()#+\-.!|]/g, (char) => `\\${char}`);
}

const STATUS_COLOUR = {
  ideal: 'var(--dt-colors-charts-status-ideal-default)',
  warning: 'var(--dt-colors-charts-status-warning-default)',
  critical: 'var(--dt-colors-charts-status-critical-default)',
} as const;

const rule = (field: string, value: number, colour: keyof typeof STATUS_COLOUR): ColorRule => ({
  value,
  comparator: '≥',
  field,
  colorMode: 'custom-color',
  customColor: { Default: STATUS_COLOUR[colour] },
  type: 'double',
});

/** Status colours of a single value, highest threshold first (the first rule that matches wins). */
export function colourRules(spec: SingleValueRule): ColorRule[] {
  if (spec.better === 'none' || spec.good === undefined) return [];
  const bad = spec.bad ?? spec.good;
  if (spec.better === 'lower') {
    return bad > spec.good ? [rule(spec.field, bad, 'critical'), rule(spec.field, spec.good, 'warning'), rule(spec.field, 0, 'ideal')] : [rule(spec.field, spec.good, 'critical'), rule(spec.field, 0, 'ideal')];
  }
  return [rule(spec.field, spec.good, 'ideal'), rule(spec.field, bad, 'warning'), rule(spec.field, 0, 'critical')];
}

const SECTION_EVIDENCE: Partial<Record<string, DashboardEvidence>> = {
  experience: 'experience',
  security: 'security',
  automation: 'automation',
};

const GOAL_EMOJI: Record<DashboardGoal['status'], string> = { met: '✅', 'not-met': '❌', open: '⏳' };

/** The logo as a markdown image (the alt text without the characters that would end it). */
export function logoMarkdown(logo: { src: string; alt: string }): string {
  const alt = logo.alt.replace(/[[\]\\]/g, '').trim() || 'Logo';
  return `![${alt}](${logo.src})`;
}

function headerMarkdown(words: DashboardWords): string {
  const lines = [`# 🚀 ${markdownText(words.title)}`, ''];
  if (words.facts !== undefined && words.facts.length > 0) {
    lines.push(words.facts.map((fact) => `**${markdownText(fact.label)}:** ${markdownText(fact.value)}`).join(' · '), '');
  }
  lines.push(markdownText(words.intro));
  if (words.question !== undefined) lines.push('', `> 💡 ${markdownText(words.question)}`);
  return lines.join('\n');
}

function goalsMarkdown(words: DashboardWords): { content: string; rows: number } {
  const title = `## 🎯 ${markdownText(words.objectivesTitle)}`;
  const goals = words.goals ?? [];
  if (goals.length > 0 && words.goalHeaders !== undefined) {
    const [pillar, goal, target, measured, status] = words.goalHeaders.map(markdownText);
    const table = [
      `| ${pillar} | ${goal} | ${target} | ${measured} | ${status} |`,
      '|---|---|---|---|---|',
      ...goals.map(
        (row) =>
          `| ${markdownText(row.pillar)} | ${markdownText(row.text)} | ${markdownText(row.target)} | ${markdownText(row.measured)} | ${GOAL_EMOJI[row.status]} ${markdownText(words.goalStatus?.[row.status] ?? row.status)} |`,
      ),
    ];
    const snapshot = words.snapshot === undefined ? [] : ['', `_${markdownText(words.snapshot)}_`];
    return { content: [title, '', ...table, ...snapshot].join('\n'), rows: goals.length };
  }
  const list = words.objectives.length === 0 ? [] : ['', ...words.objectives.map((line) => `- ${markdownText(line)}`)];
  return { content: [title, ...list].join('\n'), rows: words.objectives.length };
}

/**
 * What a dashboard is made of (3.3.4): its sections in order, its tiles, the evidence each optional
 * section needs, and whether it opens on the PoC's objectives. "Value of the PoC" is one; the three
 * specialty dashboards (SRE/DevOps, Cloud & Infra, Experience & business) are the others
 * (`blueprints.ts`).
 */
export interface DashboardBlueprint {
  id: string;
  sections: readonly string[];
  tiles: readonly DashboardTilePlan[];
  sectionEvidence: Readonly<Partial<Record<string, DashboardEvidence>>>;
  /** The objectives table under the header (the PoC dashboard); the specialty ones skip it. */
  goals: boolean;
  /** 3.7.1: the Strato icon of each section's banner (the Dynatrace-style coloured section header). */
  icons?: Readonly<Partial<Record<string, string>>>;
  /** 3.7.1: the banner colour (a categorical chart token), one per dashboard. */
  banner?: string;
  /** 3.7.1: the section drawn from the SLOs the PoC created (SLO tiles), if any. */
  sloSection?: string;
  /** 3.7.3: only the first SLO of each of these kinds (the Experience dashboard shows the main availability and performance). */
  sloKinds?: readonly string[];
  /** 3.7.1: the dashboard's own default window (logs read the last 2 hours; the rest 7 days). */
  timeframe?: { from: string; to: string };
}

/** 3.7.1: the banner colour when a blueprint names none — the steel blue of the platform's own dashboards. */
export const BANNER_DEFAULT = Colors.Charts.CategoricalThemed.BlueSteel.Color05.Default;

/** 3.7.1: a section heading as the platform's dashboards draw it — a one-line single value on a coloured band, with an icon. */
export function sectionBanner(heading: string, icon: string, colour: string): DataTile {
  return {
    type: 'data',
    title: '',
    query: `data record(a = ${quoteDqlString(heading)})`,
    visualization: 'singleValue',
    visualizationSettings: {
      autoSelectVisualization: false,
      singleValue: { labelMode: 'none', recordField: 'a', prefixIcon: icon, isIconVisible: true, colorThresholdTarget: 'background', trend: { isVisible: false } },
      coloring: { colorRules: [{ value: '', comparator: '!=', field: 'a', colorMode: 'custom-color', customColor: { Default: colour } }] },
    },
    querySettings: { maxResultRecords: 1, defaultScanLimitGbytes: 1, maxResultMegaBytes: 1, defaultSamplingRatio: 10, enableSampling: false },
    davis: { davisVisualization: { isAvailable: true } },
  };
}

/** The heading a section banner carries, or null for any other tile (tests and the Builder's preview read it). */
export function bannerHeading(tile: DashboardDocument['tiles'][string]): string | null {
  if (tile.type !== 'data') return null;
  const match = /^data record\(a = "((?:[^"\\]|\\.)*)"\)$/.exec(tile.query);
  const quoted = match?.[1];
  return quoted === undefined ? null : quoted.replace(/\\(.)/g, '$1');
}

export const POC_BLUEPRINT: DashboardBlueprint = {
  id: 'poc',
  sections: DASHBOARD_SECTIONS,
  tiles: DASHBOARD_TILES,
  sectionEvidence: SECTION_EVIDENCE,
  goals: true,
};

export function buildPocDashboard(words: DashboardWords): DashboardDocument {
  return buildDashboard(POC_BLUEPRINT, words);
}

/** A dashboard document from a blueprint: header, (objectives), its sections, what to do next. */
export function buildDashboard(blueprint: DashboardBlueprint, words: DashboardWords): DashboardDocument {
  const tiles: DashboardDocument['tiles'] = {};
  const layouts: DashboardDocument['layouts'] = {};
  let y = 0;
  let id = 0;
  const place = (tile: MarkdownTile | DataTile | SloTile, w: number, h: number, x = 0) => {
    tiles[String(id)] = tile;
    layouts[String(id)] = { x, y, w, h };
    id += 1;
  };

  // The header: who, when, the question this dashboard answers.
  // 3.7.2: three rows, as the owner sized it (a row more for the PoC dashboard's facts).
  const headerHeight = 3 + (words.facts !== undefined && words.facts.length > 0 ? 1 : 0);
  const logo = words.logo !== undefined && isSafeImageDataUrl(words.logo.src) ? words.logo : undefined;
  if (logo !== undefined) {
    // The customer's logo in the top-left corner, the header beside it (3.6.6).
    place({ type: 'markdown', title: '', content: logoMarkdown(logo) }, 4, headerHeight);
    place({ type: 'markdown', title: '', content: headerMarkdown(words) }, 20, headerHeight, 4);
  } else {
    place({ type: 'markdown', title: '', content: headerMarkdown(words) }, 24, headerHeight);
  }
  y += headerHeight;

  // The objectives, pillar by pillar.
  if (blueprint.goals) {
    const goals = goalsMarkdown(words);
    const goalsHeight = Math.min(10, 2 + Math.ceil(goals.rows * 0.75) + (words.snapshot === undefined ? 0 : 1));
    place({ type: 'markdown', title: '', content: goals.content }, 24, goalsHeight);
    y += goalsHeight;
  }

  let sectionIndex = blueprint.goals ? 1 : 0;
  for (const section of blueprint.sections) {
    const needs = blueprint.sectionEvidence[section];
    if (needs !== undefined && words.evidence !== undefined && !words.evidence.has(needs)) continue;
    const plans = blueprint.tiles.filter((plan) => plan.section === section);
    const isSlo = blueprint.sloSection === section;
    if (plans.length === 0 && !isSlo) continue;
    sectionIndex += 1;
    const heading = words.sectionTitle === undefined ? section : words.sectionTitle(section, sectionIndex);
    place(sectionBanner(heading, blueprint.icons?.[section] ?? 'BarChartGroupedIcon', words.banner ?? blueprint.banner ?? BANNER_DEFAULT), 24, 1);
    y += 1;

    // 3.7.1: the SLOs the PoC created, each on the platform's own SLO tile, three to a row; none yet → a note.
    if (isSlo) {
      const all = words.slos ?? [];
      const kinds = blueprint.sloKinds;
      const slos =
        kinds === undefined ? all : kinds.flatMap((kind) => all.filter((slo) => slo.kind === kind).slice(0, 1));
      // 3.7.3: up to three to a row, the row filled (two SLOs take half each).
      const perRow = Math.min(3, Math.max(1, slos.length));
      const sloWidth = 24 / perRow;
      if (slos.length === 0) {
        place({ type: 'markdown', title: '', content: `_${markdownText(words.sloNone ?? '')}_` }, 24, 2);
        y += 2;
      }
      slos.forEach((slo, index) => {
        place({ type: 'slo', title: slo.name, input: slo.id, visualizationSettings: SLO_TILE_SETTINGS }, sloWidth, 4, (index % perRow) * sloWidth);
        if (index % perRow === perRow - 1 || index === slos.length - 1) y += 4;
      });
    }

    let sectionHeight = 0;
    for (const { plan, x, dy, w, h } of arrangeSection(plans)) {
      const entry = plan.queryId === undefined ? null : getQuery(plan.queryId);
      const relative = entry !== null && entry.timeframe !== 'global' && 'relative' in entry.timeframe ? entry.timeframe.relative : null;
      const base = entry === null ? (plan.dql ?? '') : pinWindow(entry.dql, relative);
      const query = plan.tail === undefined ? base : [base, ...plan.tail].join('\n');
      const singleValue = plan.singleValue;
      const rules = singleValue === undefined ? [] : colourRules(singleValue);
      tiles[String(id)] = {
        type: 'data',
        title: words.tileTitle(plan.key),
        query,
        visualization: plan.visualization,
        visualizationSettings: {
          autoSelectVisualization: false,
          ...(singleValue === undefined
            ? {}
            : {
                singleValue: {
                  labelMode: 'none' as const,
                  recordField: singleValue.field,
                  prefixIcon: '' as const,
                  sparklineSettings: { isVisible: false as const },
                  trend: { isVisible: false as const, isRelative: false as const },
                },
              }),
          ...(rules.length === 0 ? {} : { coloring: { colorRules: rules } }),
          ...(plan.settings ?? {}),
        },
        querySettings: {
          maxResultRecords: Math.min(entry?.guards?.maxResultRecords ?? 1000, 1000),
          // The app's own ceiling for the query, so the dashboard never costs more than the app.
          defaultScanLimitGbytes: entry?.guards?.scanLimitGbytes ?? 5,
          maxResultMegaBytes: 1,
          defaultSamplingRatio: 10,
          enableSampling: false,
        },
        davis: { davisVisualization: { isAvailable: true } },
      };
      layouts[String(id)] = { x, y: y + dy, w, h };
      id += 1;
      sectionHeight = Math.max(sectionHeight, dy + h);
    }
    y += sectionHeight;
  }

  // What to do next, and where the figures come from.
  const next = words.next ?? [];
  const nextBlock = next.length === 0 ? [] : [`## 🧭 ${markdownText(words.nextTitle ?? '')}`, '', ...next.map((line) => `- ${markdownText(line)}`), ''];
  place({ type: 'markdown', title: '', content: [...nextBlock, `📌 ${markdownText(words.footer)}`].join('\n') }, 24, 2 + (next.length === 0 ? 0 : 1 + next.length));

  return {
    version: DASHBOARD_VERSION,
    variables: [],
    tiles,
    layouts,
    settings: { defaultTimeframe: { enabled: true, value: { ...(blueprint.timeframe ?? DASHBOARD_TIMEFRAME) } } },
    annotations: [],
  };
}

export type DashboardFailure = 'forbidden' | 'missing' | 'conflict' | 'error';

/** What went wrong, from a document-service error. */
export function classifyDashboardError(error: unknown): DashboardFailure {
  const candidate = error as { response?: { status?: number }; status?: number; body?: { error?: { code?: number } }; message?: string } | null;
  const status = candidate?.response?.status ?? candidate?.status ?? candidate?.body?.error?.code;
  if (status === 401 || status === 403 || /scope|forbidden|not authori[sz]ed|permission/i.test(candidate?.message ?? '')) return 'forbidden';
  if (status === 404) return 'missing';
  if (status === 409 || /optimistic|version/i.test(candidate?.message ?? '')) return 'conflict';
  return 'error';
}

const blobOf = (content: DashboardDocument) => new Blob([JSON.stringify(content)], { type: 'application/json' });

/** Creates the dashboard on the tenant; returns its document id. */
export async function createPocDashboard(content: DashboardDocument, name: string, shared: boolean): Promise<string> {
  const metadata = await documentsClient.createDocument({ body: { name, type: 'dashboard', content: blobOf(content), isPrivate: !shared } });
  return metadata.id;
}

/** Replaces the content (and name, visibility) of the dashboard this app created. */
export async function updatePocDashboard(id: string, content: DashboardDocument, name: string, shared: boolean): Promise<void> {
  const metadata = await documentsClient.getDocumentMetadata({ id });
  await documentsClient.updateDocument({ id, optimisticLockingVersion: metadata.version, body: { name, content: blobOf(content), isPrivate: !shared } });
}
