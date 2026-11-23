import type { StringKey } from '../../../../i18n/strings';
import { PIN_OFFSET_PX, PRINT_SPACE } from '../constants';
import type { AnchorSpec, LayoutKey, Rect } from '../types';

/**
 * Where the numbered pins of a real print go, page by page (3.2.7, spec §5.6), and how a print
 * proves it shows the right entity (§3.5).
 *
 * Each platform page the planner links to has a layout here: the on-screen labels the companion
 * looks for (the English platform UI), the zone each label must fall in, the fallback position of
 * every pin as a fraction of the 1720×1080 crop (measured on the reference captures of 2026-09-30),
 * the legend key of each pin and the lupa region. The planner turns a layout into the `anchors` of
 * a shot, resolving the placeholders (`{entityName}`, `{displayId}`…) from the chosen entity; the
 * evidence engine places the pins on the real print from these templates (`analysis/pins.ts`).
 *
 * The `identity` anchor is the proof that the screen shows the planned entity: the companion's
 * landing check ('ok') only proves which app opened. A layout without one (host, free) needs the
 * SE's confirmation instead.
 */

/** Values a template's `match` can name instead of a fixed text; resolved per shot by the planner. */
export type AnchorFact = 'entityName' | 'displayId' | 'clusterName' | 'firstRootEventName' | 'frontendName' | 'rootName' | 'hubName';

/** The facts known for one shot; a null or missing fact drops that match text (and an anchor left with none). */
export type AnchorFacts = Partial<Record<AnchorFact, string | null>>;

/** A region of the crop, as fractions (0..1); a hit counts when its centre lies inside. */
export interface Zone {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PinTemplate {
  /** 3.5.7: up to 8 — a layout may offer more pins than a slide draws (`PRINT_BUDGET.pins`); the ones found win. */
  n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** Fallback position, fractions of the 1720×1080 crop ("posição estimada" in the editor). */
  x: number;
  y: number;
  anchor: {
    /** The manifest anchor key; 'identity' when the pin sits on the identity label. */
    key: string;
    match: readonly (string | { fact: AnchorFact })[];
    zone: Zone;
    place: 'left' | 'right' | 'above' | 'below';
    offsetPx: number;
  } | null;
  /** chrome: no anchor, fixed by the platform chrome; variable: shown only when anchored or placed by the SE; estimated: never measured on a reference crop. */
  stability: 'chrome' | 'stable' | 'variable' | 'estimated';
  /** The default legend; `analysis/pins.ts` swaps the service variants by the subject's role. */
  legendKey: StringKey;
  /** Facts the legend needs (documentation for `analysis/pins.ts`); 'a|b' is satisfied by either. */
  needs: readonly string[];
}

export interface LayoutTemplate {
  key: LayoutKey;
  /** The platform app's name, for the caption ("Tela real · {app} · …"). */
  appLabelKey: StringKey;
  pins: readonly PinTemplate[];
  identity: {
    match: 'entityName' | 'displayId' | 'clusterName' | 'frontendName' | 'literal';
    /** The text when `match` is 'literal'. */
    literal?: string;
    /** More texts that also prove the screen (any one is enough). */
    alternatives?: readonly string[];
    zone: Zone;
  } | null;
  /** The lupa region (fractions, ≤ 520 px wide) and the pin it magnifies. */
  lupa: { x: number; y: number; w: number; h: number; pin: number } | null;
  /** The window the screen shows when its own label was not read (minutes). */
  screenWindowFallbackMin: number | null;
  screenWindowSource: 'url' | 'layout-default' | 'unknown';
  /** '2026-09-30' for layouts measured on reference crops; null = never seen. */
  measuredOn: string | null;
}

/** The manifest key of the identity anchor. */
export const IDENTITY_KEY = 'identity';

/** The widest lupa region, in print pixels. */
export const LUPA_MAX_PX = 520;

/** Longest text sent to the companion as an anchor match (an entity name, an event name). */
const MATCH_MAX = 120;

const MEASURED = '2026-09-30';
/** Pixels between a pin's centre and the label it sits beside (its radius on the slide plus a gap). */
const OFFSET = PIN_OFFSET_PX;

/*
 * Which side of its label a pin takes: never the side where the platform prints the number the
 * label names (3.2.7 final review, D1: pins set 'below' a tile label covered its value). A tile
 * (Experience Vitals, Kubernetes, the service header) prints its value under the label, aligned
 * to its left edge, so the pin goes to the label's left; a table's column header has its first row
 * under it, so the pin goes above. The problem page prints its count before the label on the same
 * line ("30 Users"), so that pin stays below. `NUMBER_UNDER_LABEL` lists the labels with a number
 * under them, so a test can hold every one of those pins clear of it.
 */

/** Anchor keys whose label has its number printed under it: a tile's value, a column's first row (`prints.analysis.test.ts`). */
export const NUMBER_UNDER_LABEL: Readonly<Partial<Record<LayoutKey, readonly string[]>>> = {
  'services.details': ['health'],
  'vitals.web': ['inp', 'errorRate', 'sessions'],
  'k8s.cluster': ['monitoring', 'cpu', 'memory'],
  'vulns.list': ['score', 'assessment', 'type'],
};

const zone = (x0: number, y0: number, x1: number, y1: number): Zone => ({ x0, y0, x1, y1 });
const ANYWHERE = zone(0, 0, 1, 1);
const fact = (name: AnchorFact) => ({ fact: name });

type Place = NonNullable<PinTemplate['anchor']>['place'];

function pin(
  n: PinTemplate['n'],
  x: number,
  y: number,
  anchor: { key: string; match: readonly (string | { fact: AnchorFact })[]; zone: Zone; place: Place } | null,
  legendKey: StringKey,
  needs: readonly string[] = [],
  stability: PinTemplate['stability'] = anchor === null ? 'chrome' : 'stable',
): PinTemplate {
  return { n, x, y, anchor: anchor === null ? null : { ...anchor, offsetPx: OFFSET }, stability, legendKey, needs };
}

export const LAYOUTS: Readonly<Record<LayoutKey, LayoutTemplate>> = {
  'problems.detail': {
    key: 'problems.detail',
    appLabelKey: 'prt.app.problems',
    pins: [
      pin(1, 0.395, 0.092, { key: IDENTITY_KEY, match: [fact('displayId')], zone: zone(0, 0, 1, 0.12), place: 'right' }, 'prt.pin.problem.header', ['duration']),
      pin(2, 0.355, 0.131, { key: 'users', match: ['Users'], zone: zone(0, 0.1, 1, 0.16), place: 'below' }, 'prt.pin.problem.impact', ['rumUsers|davisUsers']),
      pin(3, 0.209, 0.342, { key: 'frontend', match: [fact('frontendName')], zone: zone(0, 0.3, 0.5, 0.4), place: 'right' }, 'prt.pin.problem.frontend', ['feErrorPeak']),
      pin(4, 0.6, 0.24, { key: 'rootCause', match: ['Root cause'], zone: zone(0.5, 0.2, 1, 0.27), place: 'right' }, 'prt.pin.problem.root', ['root']),
      pin(5, 0.84, 0.361, { key: 'signals', match: [fact('firstRootEventName')], zone: zone(0.5, 0.33, 1, 0.42), place: 'left' }, 'prt.pin.problem.signals', ['firstRootEvent']),
      pin(6, 0.512, 0.497, { key: 'path', match: ['Visual resolution path'], zone: zone(0.5, 0.45, 1, 0.55), place: 'left' }, 'prt.pin.problem.path', ['root']),
      // 3.5.7 (owner: "slide 4 do problema está rico de informações na captura de tela mais somente 2 pins"): what a
      // screen added by hand always shows — the events grouped in the problem and the remediation it triggered.
      pin(7, 0.49, 0.112, { key: 'events', match: ['Events'], zone: zone(0.25, 0.08, 0.75, 0.17), place: 'below' }, 'prt.pin.problem.events'),
      pin(8, 0.49, 0.878, { key: 'automation', match: ['Automation and remediation'], zone: zone(0.4, 0.75, 1, 1), place: 'left' }, 'prt.pin.problem.automation'),
    ],
    identity: { match: 'displayId', zone: zone(0, 0, 1, 0.12) },
    lupa: { x: 0.334, y: 0.112, w: 0.28, h: 0.038, pin: 2 },
    screenWindowFallbackMin: 120,
    screenWindowSource: 'layout-default',
    measuredOn: MEASURED,
  },
  'services.details': {
    key: 'services.details',
    appLabelKey: 'prt.app.services',
    pins: [
      // 3.5.6: the zones cover the details with and without the service list at the left (the owner's two screens):
      // the four request panels sit two by two under the health chips, the endpoints below them.
      pin(1, 0.483, 0.128, { key: IDENTITY_KEY, match: [fact('entityName')], zone: zone(0.1, 0, 1, 0.16), place: 'right' }, 'prt.pin.service.callerName'),
      pin(2, 0.549, 0.176, { key: 'health', match: ['Throughput'], zone: zone(0, 0.12, 1, 0.19), place: 'left' }, 'prt.pin.service.health', ['screenTotals']),
      pin(3, 0.387, 0.297, { key: 'responseTime', match: ['Response time'], zone: zone(0, 0.21, 0.5, 0.33), place: 'left' }, 'prt.pin.service.rt', ['avg', 'p50']),
      pin(4, 0.714, 0.297, { key: 'throughput', match: ['Throughput'], zone: zone(0.45, 0.21, 1, 0.33), place: 'left' }, 'prt.pin.service.throughput', ['perMin']),
      pin(5, 0.378, 0.534, { key: 'failureRate', match: ['Failure rate'], zone: zone(0, 0.4, 0.5, 0.57), place: 'left' }, 'prt.pin.service.outage'),
      pin(6, 0.384, 0.775, { key: 'endpoints', match: ['Endpoints'], zone: zone(0, 0.6, 0.6, 0.8), place: 'left' }, 'prt.pin.service.endpoints', ['endpoints']),
    ],
    // The service list on the left also shows the name, hence the zone.
    identity: { match: 'entityName', zone: zone(0.1, 0, 1, 0.16) },
    lupa: { x: 0.309, y: 0.111, w: 0.231, h: 0.079, pin: 2 },
    screenWindowFallbackMin: 30,
    screenWindowSource: 'layout-default',
    measuredOn: MEASURED,
  },
  'vitals.web': {
    key: 'vitals.web',
    appLabelKey: 'prt.app.vitals',
    pins: [
      pin(1, 0.267, 0.112, { key: IDENTITY_KEY, match: [fact('frontendName')], zone: zone(0, 0, 1, 0.14), place: 'right' }, 'prt.pin.frontend.name', ['screenRequests']),
      pin(2, 0.3, 0.3, { key: 'inp', match: ['INP'], zone: zone(0, 0.27, 1, 0.32), place: 'left' }, 'prt.pin.frontend.vitals', ['lcp', 'inp']),
      pin(3, 0.593, 0.329, { key: 'errorRate', match: ['Error rate'], zone: zone(0, 0.27, 1, 0.36), place: 'left' }, 'prt.pin.frontend.errors', ['per100']),
      pin(4, 0.83, 0.329, { key: 'sessions', match: ['Active sessions'], zone: zone(0, 0.27, 1, 0.36), place: 'left' }, 'prt.pin.frontend.users', ['users']),
      pin(5, 0.18, 0.517, { key: 'actions', match: ['User action duration'], zone: zone(0, 0.48, 1, 0.55), place: 'right' }, 'prt.pin.frontend.actions', ['actionP75']),
      pin(6, 0.125, 0.85, { key: 'cwv', match: ['Core web vitals'], zone: zone(0, 0.8, 1, 1), place: 'right' }, 'prt.pin.frontend.cwv', ['ratings']),
    ],
    identity: { match: 'frontendName', zone: zone(0, 0, 1, 0.14) },
    lupa: { x: 0.145, y: 0.278, w: 0.285, h: 0.069, pin: 2 },
    screenWindowFallbackMin: 120,
    screenWindowSource: 'layout-default',
    measuredOn: MEASURED,
  },
  'k8s.cluster': {
    key: 'k8s.cluster',
    appLabelKey: 'prt.app.kubernetes',
    pins: [
      pin(1, 0.027, 0.197, null, 'prt.pin.k8s.overview', ['clusterCount']),
      pin(2, 0.227, 0.321, { key: 'cluster', match: [fact('clusterName')], zone: zone(0, 0.3, 0.5, 0.45), place: 'right' }, 'prt.pin.k8s.selected'),
      // 3.5.6: the zones cover the cluster's details beside the list (x ≥ 0.5) and full width (the owner's screen):
      // the health chips under the name, the utilisation panels below them (never the chip of the same word).
      pin(3, 0.797, 0.204, { key: 'monitoring', match: ['Monitoring'], zone: zone(0.2, 0.08, 1, 0.24), place: 'left' }, 'prt.pin.k8s.health', ['capacity']),
      pin(4, 0.565, 0.401, { key: 'cpu', match: ['CPU'], zone: zone(0, 0.24, 1, 0.43), place: 'left' }, 'prt.pin.k8s.cpu', ['capacity']),
      pin(5, 0.734, 0.401, { key: 'memory', match: ['Memory'], zone: zone(0.2, 0.24, 1, 0.43), place: 'left' }, 'prt.pin.k8s.memory', ['capacity']),
      pin(6, 0.608, 0.746, { key: 'workloads', match: ['Workloads'], zone: zone(0, 0.5, 1, 1), place: 'left' }, 'prt.pin.k8s.workloads', ['churn']),
    ],
    identity: { match: 'clusterName', zone: zone(0, 0, 1, 0.2) },
    lupa: { x: 0.527, y: 0.384, w: 0.301, h: 0.151, pin: 4 },
    screenWindowFallbackMin: 30,
    screenWindowSource: 'layout-default',
    measuredOn: MEASURED,
  },
  'tracing.failedList': {
    key: 'tracing.failedList',
    appLabelKey: 'prt.app.tracing',
    // Estimated: the reference capture was a trace, not this list; the probe settles the address.
    pins: [
      pin(1, 0.192, 0.074, { key: IDENTITY_KEY, match: ['Request status'], zone: zone(0, 0, 1, 0.1), place: 'right' }, 'prt.pin.failed.filter', ['totals'], 'estimated'),
      pin(2, 0.09, 0.15, { key: 'series', match: ['Requests'], zone: zone(0, 0.12, 1, 0.2), place: 'right' }, 'prt.pin.failed.series', ['envRate'], 'estimated'),
      pin(3, 0.225, 0.41, { key: 'list', match: ['requests'], zone: zone(0, 0.38, 1, 0.46), place: 'right' }, 'prt.pin.failed.list', ['rows'], 'estimated'),
      pin(4, 0.175, 0.463, { key: 'endpoint', match: ['Endpoint'], zone: zone(0, 0.44, 1, 0.49), place: 'right' }, 'prt.pin.failed.top', ['rows'], 'estimated'),
    ],
    identity: { match: 'literal', literal: 'Request status', zone: zone(0, 0, 1, 0.1) },
    lupa: null,
    screenWindowFallbackMin: 120,
    screenWindowSource: 'layout-default',
    measuredOn: null,
  },
  'logs.filter': {
    key: 'logs.filter',
    appLabelKey: 'prt.app.logs',
    pins: [
      pin(1, 0.166, 0.074, { key: 'filter', match: ['status'], zone: zone(0, 0, 1, 0.1), place: 'right' }, 'prt.pin.logs.filter', ['totalErrors']),
      pin(2, 0.074, 0.126, { key: 'chart', match: ['Timeseries'], zone: zone(0, 0, 1, 0.16), place: 'right' }, 'prt.pin.logs.chart'),
      pin(3, 0.237, 0.352, { key: 'records', match: ['records'], zone: zone(0, 0.33, 1, 0.4), place: 'right' }, 'prt.pin.logs.records', ['totalErrors']),
      pin(4, 0.3, 0.41, { key: 'message', match: ['Log message'], zone: zone(0, 0.39, 1, 0.43), place: 'right' }, 'prt.pin.logs.message', ['signatures']),
      pin(5, 0.84, 0.352, { key: 'columns', match: ['columns hidden'], zone: zone(0.7, 0, 1, 1), place: 'left' }, 'prt.pin.logs.columns'),
    ],
    identity: { match: 'literal', literal: 'status = ERROR', zone: zone(0, 0, 1, 0.1) },
    lupa: null,
    screenWindowFallbackMin: 120,
    screenWindowSource: 'url',
    measuredOn: MEASURED,
  },
  'smartscape.services': {
    key: 'smartscape.services',
    appLabelKey: 'prt.app.smartscape',
    pins: [
      pin(1, 0.36, 0.081, { key: IDENTITY_KEY, match: ['Service dependency graph'], zone: zone(0, 0, 0.4, 1), place: 'right' }, 'prt.pin.topo.view', ['services']),
      pin(2, 0.349, 0.267, { key: 'nodes', match: ['Nodes'], zone: zone(0, 0, 0.4, 1), place: 'right' }, 'prt.pin.topo.nodes', ['isolated']),
      pin(3, 0.294, 0.21, { key: 'hide', match: ['Hide unconnected nodes'], zone: zone(0, 0, 0.4, 1), place: 'right' }, 'prt.pin.topo.hide'),
      // The hub and the root move with the graph: shown only when anchored or placed by the SE.
      pin(4, 0.675, 0.5, { key: 'hub', match: [fact('hubName')], zone: zone(0.35, 0, 1, 1), place: 'above' }, 'prt.pin.topo.hub', ['hub'], 'variable'),
      pin(5, 0.675, 0.5, { key: 'root', match: [fact('rootName')], zone: zone(0.35, 0, 1, 1), place: 'above' }, 'prt.pin.topo.root', ['blast'], 'variable'),
      pin(6, 0.882, 0.12, { key: 'window', match: ['Last 2 hours'], zone: zone(0.7, 0, 1, 0.15), place: 'left' }, 'prt.pin.topo.window'),
    ],
    identity: { match: 'literal', literal: 'Service dependency graph', zone: zone(0, 0, 0.4, 1) },
    lupa: { x: 0.174, y: 0.25, w: 0.173, h: 0.171, pin: 2 },
    screenWindowFallbackMin: 120,
    screenWindowSource: 'url',
    measuredOn: MEASURED,
  },
  'vulns.list': {
    key: 'vulns.list',
    appLabelKey: 'prt.app.vulnerabilities',
    pins: [
      pin(1, 0.174, 0.194, { key: 'total', match: ['vulnerabilities detected'], zone: ANYWHERE, place: 'right' }, 'prt.pin.vulns.total', ['security']),
      // 3.5.6: with a vulnerability open, the score is explained at the bottom of its panel.
      pin(2, 0.33, 0.34, { key: 'score', match: ['Dynatrace Security Score', 'Dynatrace security score calculation'], zone: zone(0, 0.27, 1, 1), place: 'above' }, 'prt.pin.vulns.score', ['security']),
      pin(3, 0.456, 0.34, { key: 'assessment', match: ['Dynatrace Assessment'], zone: zone(0, 0.27, 1, 0.36), place: 'above' }, 'prt.pin.vulns.assessment', ['security']),
      pin(4, 0.096, 0.255, { key: 'advisor', match: ['Security Advisor'], zone: ANYWHERE, place: 'right' }, 'prt.pin.vulns.advisor'),
      pin(5, 0.565, 0.33, { key: 'type', match: ['Vulnerability type'], zone: zone(0, 0.27, 1, 0.36), place: 'above' }, 'prt.pin.vulns.type', ['byTechnology']),
      pin(6, 0.858, 0.077, { key: 'runtime', match: ['Vulnerability analytics enabled'], zone: ANYWHERE, place: 'left' }, 'prt.pin.vulns.runtime'),
    ],
    identity: { match: 'literal', literal: 'vulnerabilities detected', alternatives: ['Vulnerabilities'], zone: zone(0, 0, 1, 0.25) },
    lupa: { x: 0.009, y: 0.31, w: 0.3, h: 0.06, pin: 2 },
    screenWindowFallbackMin: 30,
    screenWindowSource: 'url',
    measuredOn: MEASURED,
  },
  // The SE places the pins (legends `prt.pin.host.*` or their own text) and confirms the screen.
  'infraops.host': {
    key: 'infraops.host',
    appLabelKey: 'prt.app.infraops',
    pins: [],
    identity: null,
    lupa: null,
    screenWindowFallbackMin: 120,
    screenWindowSource: 'layout-default',
    measuredOn: null,
  },
  free: {
    key: 'free',
    appLabelKey: 'prt.app.free',
    pins: [],
    identity: null,
    lupa: null,
    screenWindowFallbackMin: 120,
    screenWindowSource: 'layout-default',
    measuredOn: null,
  },
};

/** A fact as a match text: trimmed and cut, or null when unknown. */
function factText(facts: AnchorFacts, name: AnchorFact): string | null {
  const value = facts[name];
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text === '' || text === '—' ? null : text.slice(0, MATCH_MAX);
}

function identityTexts(layout: LayoutTemplate, facts: AnchorFacts): string[] {
  const identity = layout.identity;
  if (identity === null) return [];
  const texts = identity.match === 'literal' ? [identity.literal ?? null] : [factText(facts, identity.match)];
  return [...texts, ...(identity.alternatives ?? [])].filter((text): text is string => text !== null && text !== '');
}

/**
 * The anchors of a shot (`pvs.shotlist.v1`): the identity anchor first, then each pin's label, the
 * placeholders resolved from the shot's facts. Pins on the same key share one anchor; a match
 * whose fact is unknown is dropped, and so is an anchor left with no text.
 */
export function resolveAnchors(layoutKey: LayoutKey, facts: AnchorFacts): AnchorSpec[] {
  const layout = LAYOUTS[layoutKey];
  const byKey = new Map<string, string[]>();
  const add = (key: string, texts: readonly string[]) => {
    const list = byKey.get(key) ?? [];
    for (const text of texts) if (!list.includes(text)) list.push(text);
    byKey.set(key, list);
  };
  add(IDENTITY_KEY, identityTexts(layout, facts));
  for (const template of layout.pins) {
    if (template.anchor === null) continue;
    const texts = template.anchor.match
      .map((item) => (typeof item === 'string' ? item : factText(facts, item.fact)))
      .filter((text): text is string => text !== null);
    add(template.anchor.key, texts);
  }
  return [...byKey.entries()].filter(([, match]) => match.length > 0).map(([key, match]) => ({ key, match }));
}

/** True when a hit's centre lies inside the zone (hits are print-space rectangles). */
export function insideZone(rect: Rect, area: Zone): boolean {
  const cx = (rect.x + rect.w / 2) / PRINT_SPACE.width;
  const cy = (rect.y + rect.h / 2) / PRINT_SPACE.height;
  return cx >= area.x0 && cx <= area.x1 && cy >= area.y0 && cy <= area.y1;
}

/**
 * The identity result of a captured print: true when any of the ≤ 3 hits of the identity anchor
 * lies inside the layout's identity zone ("Tela verificada · {nome} visível"). A layout without an
 * identity anchor (host, free) is never verified this way: the SE confirms it.
 */
export function identityFound(layoutKey: LayoutKey, anchors: readonly { key: string; rect: Rect }[]): boolean {
  const identity = LAYOUTS[layoutKey].identity;
  if (identity === null) return false;
  return anchors.some((anchor) => anchor.key === IDENTITY_KEY && insideZone(anchor.rect, identity.zone));
}

/** The layout's lupa region in print pixels (the default focus of a new print), or null. */
export function defaultFocus(layoutKey: LayoutKey): Rect | null {
  const lupa = LAYOUTS[layoutKey].lupa;
  if (lupa === null) return null;
  return {
    x: Math.round(lupa.x * PRINT_SPACE.width),
    y: Math.round(lupa.y * PRINT_SPACE.height),
    w: Math.round(lupa.w * PRINT_SPACE.width),
    h: Math.round(lupa.h * PRINT_SPACE.height),
  };
}
