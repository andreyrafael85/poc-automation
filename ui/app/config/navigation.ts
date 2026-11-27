/**
 * Navigation map.
 *
 * The flat list of pages, each with its label. How they are *grouped and ordered*
 * for a viewer is `STORY_STAGES`, below: seven stages along the arc of a PoC (nine until 3.8.0).
 * Sections whose data is unavailable stay in the navigation and declare the gap on
 * the page itself, because hiding them would let a permission problem read as a
 * clean result.
 */

import type { StringKey } from '../i18n/strings';

export interface NavigationSection {
  route: string;
  /** English label, used as the fallback and for tests. */
  label: string;
  /** Translation key. Typed, so a new section without a translation will not compile. */
  labelKey: StringKey;
}

export const NAVIGATION: readonly NavigationSection[] = [
  { route: '/', label: 'Overview', labelKey: 'nav.overview' },
  { route: '/timeline', label: 'PoC timeline', labelKey: 'nav.timeline' },
  { route: '/executive', label: 'Executive summary', labelKey: 'nav.executive' },
  { route: '/coverage', label: 'Coverage', labelKey: 'nav.coverage' },
  { route: '/problems', label: 'Dynatrace Intelligence', labelKey: 'nav.aiInsights' },
  { route: '/rca', label: 'AIOps & RCA', labelKey: 'nav.rca' },
  { route: '/topology', label: 'Topology', labelKey: 'nav.topology' },
  { route: '/services', label: 'Services & tracing', labelKey: 'nav.services' },
  { route: '/infrastructure', label: 'Infrastructure', labelKey: 'nav.infrastructure' },
  { route: '/cloud', label: 'Cloud', labelKey: 'nav.cloud' },
  { route: '/kubernetes', label: 'Kubernetes', labelKey: 'nav.kubernetes' },
  { route: '/technologies', label: 'Technologies', labelKey: 'nav.technologies' },
  { route: '/logs', label: 'Logs & data quality', labelKey: 'nav.logs' },
  { route: '/adoption', label: 'Platform adoption', labelKey: 'nav.adoption' },
  { route: '/consumption', label: 'Consumption and events', labelKey: 'nav.consumption' },
  { route: '/licensing', label: 'Licensing', labelKey: 'nav.licensing' },
  { route: '/automation', label: 'Automation', labelKey: 'nav.automation' },
  // 3.7.7: the generative-AI apps of the environment, from the OpenTelemetry GenAI metrics.
  { route: '/ai-observability', label: 'AI Observability', labelKey: 'nav.aiObservability' },
  { route: '/business', label: 'Business events', labelKey: 'nav.business' },
  {
    route: '/security',
    label: 'Security',
    labelKey: 'nav.security',
  },
  {
    route: '/experience',
    label: 'Digital experience',
    labelKey: 'nav.experience',
  },
  { route: '/opportunities', label: 'Opportunities', labelKey: 'nav.opportunities' },
  { route: '/competitor', label: 'Competitor overlap', labelKey: 'nav.competitor' },
  { route: '/report', label: 'SE Report', labelKey: 'nav.report' },
  { route: '/value', label: 'Value & ROI', labelKey: 'nav.roi' },
  { route: '/settings', label: 'Settings', labelKey: 'nav.settings' },
  // 3.6.6: what the SE creates on the tenant for the PoC (dashboards first), one click per kit.
  { route: '/builder', label: 'PoC Builder', labelKey: 'nav.builder' },
];

/**
 * The story of a PoC, in seven stages (3.8.1; nine in 3.7.9–3.8.0).
 *
 * v3.1 reorders and regroups the same 25 pages along the arc a PoC actually
 * follows — context, objectives, coverage, discoveries, evidence, impact, value,
 * recommendations, next steps — so a viewer always knows where they are in the
 * argument. Nothing is added or removed, and no page's logic changes: the stage is
 * orientation only. `stageOf` and the pager are derived from this one table.
 *
 * The split between *Coverage* (what is monitored: inventory) and *Evidence*
 * (how it behaves: golden signals, capacity, restarts, log quality, automation)
 * keeps the first half of the story readable by an executive and puts the detail
 * an engineer will challenge in one place.
 */

export type StoryStageId =
  | 'context'
  | 'objectives'
  | 'coverage'
  | 'evidence'
  | 'value'
  // 3.6.6: the SE's and the partner's own work — Settings and the PoC builder — closes the menu.
  | 'manage'
  | 'recommendations';

export interface StoryStage {
  id: StoryStageId;
  labelKey: StringKey;
  blurbKey: StringKey;
  /** Routes of this stage, in reading order. */
  routes: readonly string[];
}

export const STORY_STAGES: readonly StoryStage[] = [
  // 3.6.6 (the owner: Settings moves to a stage of its own, with the page that creates things on the tenant).
  // 3.7.9 (the owner): nine stages — Coverage keeps the Coverage and Platform adoption pages; "Discoveries" and "Evidence"
  // become one stage, Evidence, with every page that read the environment; the Roadmap page left (its 30-60-90 action plan
  // is a tab of Opportunities).
  { id: 'context', labelKey: 'stage.context', blurbKey: 'stage.context.blurb', routes: ['/'] },
  { id: 'objectives', labelKey: 'stage.objectives', blurbKey: 'stage.objectives.blurb', routes: ['/timeline'] },
  { id: 'coverage', labelKey: 'stage.coverage', blurbKey: 'stage.coverage.blurb', routes: ['/coverage', '/adoption'] },
  {
    id: 'evidence',
    labelKey: 'stage.evidence',
    blurbKey: 'stage.evidence.blurb',
    routes: [
      '/problems',
      '/rca',
      '/services',
      '/infrastructure',
      '/kubernetes',
      '/cloud',
      '/topology',
      '/technologies',
      '/logs',
      '/experience',
      '/business',
      '/automation',
      '/ai-observability',
      '/security',
      '/competitor',
    ],
  },
  // 3.8.1 (the owner): seven stages — "Impact" and "Next steps" leave; the Executive summary opens Demonstrated value, and
  // Consumption and events and Licensing close Recommendations, after Opportunities.
  { id: 'value', labelKey: 'stage.value', blurbKey: 'stage.value.blurb', routes: ['/executive', '/value', '/report'] },
  {
    id: 'recommendations',
    labelKey: 'stage.recommendations',
    blurbKey: 'stage.recommendations.blurb',
    routes: ['/opportunities', '/consumption', '/licensing'],
  },
  { id: 'manage', labelKey: 'stage.manage', blurbKey: 'stage.manage.blurb', routes: ['/builder', '/settings'] },
];

/** Deep-technical routes hidden when executive mode is on. */
export const EXECUTIVE_HIDDEN_ROUTES: ReadonlySet<string> = new Set([
  // 3.6.6: the page with buttons that write to the tenant is never on screen in front of a customer.
  '/builder',
  // 3.6.8 (owner): executive mode shows the app's features to the customer, never its settings — with the builder gone
  // too, the whole tenth stage leaves the menu.
  '/settings',
  '/topology',
  '/services',
  '/infrastructure',
  '/kubernetes',
  '/technologies',
  '/logs',
  '/consumption',
  '/automation',
  '/ai-observability',
  '/business',
  '/security',
  '/experience',
]);

/**
 * Pages that carry licensing, DPS and consumption material. A customer must not see them, in the
 * app or in any export: they are shown only to a Sales Engineer (or a partner let in with the PoC
 * password). The switch that used to gate it was retired in 3.2.6: commercial data is native to
 * those two levels, and executive mode — the presentation mode — is what takes it away.
 */
export const SE_ONLY_ROUTES: ReadonlySet<string> = new Set(['/licensing', '/consumption']);

/**
 * What a viewer who is not an SE or a partner may open: the executive view of the PoC, read-only.
 * Everything else asks for the partner password.
 */
export const RESTRICTED_ROUTES: ReadonlySet<string> = new Set(['/', '/executive', '/timeline']);

/** Who is looking: the three things that decide which pages exist for them. */
export interface NavigationAudience {
  executiveMode: boolean;
  /** Licensing, DPS and cost material is switched on (SE or partner only). */
  commercialVisible: boolean;
  /** A viewer without access, in the read-only executive view. */
  restricted: boolean;
}

/** The audience before 3.2: executive mode only, nothing hidden for any other reason. */
const OPEN_AUDIENCE = (executiveMode: boolean): NavigationAudience => ({
  executiveMode,
  commercialVisible: true,
  restricted: false,
});

/** Whether a page is listed for this audience (navigation, story map, pager). */
export function isRouteVisible(route: string, audience: NavigationAudience): boolean {
  if (audience.restricted && !RESTRICTED_ROUTES.has(route)) return false;
  if (audience.executiveMode && EXECUTIVE_HIDDEN_ROUTES.has(route)) return false;
  if (!audience.commercialVisible && SE_ONLY_ROUTES.has(route)) return false;
  return true;
}

/**
 * Whether a page may be *opened* by URL. Executive mode only trims the list, as before; access
 * and commercial data decide who may actually see the page.
 */
export function isRouteBlocked(route: string, audience: Pick<NavigationAudience, 'commercialVisible' | 'restricted'>): boolean {
  if (audience.restricted && !RESTRICTED_ROUTES.has(route)) return true;
  if (!audience.commercialVisible && SE_ONLY_ROUTES.has(route)) return true;
  return false;
}

const SECTION_BY_ROUTE: ReadonlyMap<string, NavigationSection> = new Map(
  NAVIGATION.map((section) => [section.route, section]),
);

/** The stage a route belongs to, or `undefined` for a route outside the story. */
export function stageOf(route: string): { stage: StoryStage; position: number } | undefined {
  const index = STORY_STAGES.findIndex((stage) => stage.routes.includes(route));
  const stage = STORY_STAGES[index];
  return stage === undefined ? undefined : { stage, position: index + 1 };
}

/** The navigation entry for a route, if the route is part of the story. */
export function sectionFor(route: string): NavigationSection | undefined {
  return SECTION_BY_ROUTE.get(route);
}

/** Routes in story order, for this audience (a bare boolean means "executive mode, nothing else"). */
export function storyRoutes(audience: boolean | NavigationAudience): string[] {
  const who = typeof audience === 'boolean' ? OPEN_AUDIENCE(audience) : audience;
  return STORY_STAGES.flatMap((stage) => stage.routes).filter((route) => isRouteVisible(route, who));
}

/** The previous and next pages of the story, for the pager at the foot of a page. */
export function storyNeighbours(
  route: string,
  audience: boolean | NavigationAudience,
): { previous: NavigationSection | undefined; next: NavigationSection | undefined } {
  const order = storyRoutes(audience);
  const index = order.indexOf(route);
  if (index === -1) return { previous: undefined, next: undefined };
  const previous = order[index - 1];
  const next = order[index + 1];
  return {
    previous: previous === undefined ? undefined : SECTION_BY_ROUTE.get(previous),
    next: next === undefined ? undefined : SECTION_BY_ROUTE.get(next),
  };
}
