import React, { useEffect, useMemo, useRef } from 'react';

import { Heading } from '@dynatrace/strato-components/typography';

import { GaugeRing, KpiHero, ProviderMark, SeverityBar, StackMap, TechChips, useChartFormat } from '../../components/spectrum';
import type { ChartFormat } from '../../components/spectrum/chartFormat';
import { TrendChart, type TrendSeries } from '../../components/TrendChart';
import { BarList } from '../../components/viz/BarList';
import { DonutBreakdown } from '../../components/viz/DonutBreakdown';
import { MAX_CAPTURES_PER_SECTION, type CaptureChoice } from '../../config/persistence';
import { useQueryScope } from '../../config/StudioContext';
import { Cluster, Grid, Panel, Stack } from '../../engine';
import type { CatalogId } from '../../queries/catalog';
import { useCatalogQuery, type QueryOutcome } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { useRootCallersState } from '../../hooks/useTrailLinks';
import type { StringKey } from '../../i18n/strings';
import { useTranslation, type Translation } from '../../i18n/useTranslation';
import { PROVIDER_META, summariseCloud, type CloudProvider } from '../../models/cloud';
import { summariseCloudServices } from '../../models/cloudServices';
import { summariseCompetitors } from '../../models/competitor';
import { technologyBars, technologyChips, toTechnologyRows } from '../../models/technologies';
import { summariseMttr } from '../executive/verdict';
import { summariseRca } from '../../models/rca';
import { observed } from '../../models/provenance';
import { summarisePosture } from '../../models/security';
import { ConsolidationHero } from '../competitor/ConsolidationHero';
import { useStackNodes } from '../stack/useStackNodes';
import { ValueChain } from '../value/ValueChain';
import { useValueChain } from '../value/useValueChain';
import { useStoryNumbers } from '../executive/useStoryNumbers';
import { RcaTrail } from '../rca/RcaTrail';
import { logTrendSeries } from '../trends/trendSeries';
import { DTFLOW_FONT_CSS } from './fonts';
import { ProblemCalendarPanel, ProblemRingsPanel } from '../cockpit/aiPanels';
import { MaturityJourney } from '../assessment/MaturityJourney';
import { bandOf, radialBarsFor } from '../assessment/radar';
import { useAssessment } from '../assessment/useAssessment';
import { RadialBars } from '../../engine/chart/RadialBars';
import { FrontendErrors, HostsAtCeiling, ProblemArrivals, ProblemMix, SlowestServices, StableWorkloads } from '../cockpit/panels';
import { assumed } from '../../config/assumptions';
import { StratoModeProvider } from '../../engine/strato';
import { formatMicros } from '../../utils/time';
import type { CapturePin, DeckCapture } from './spec';

/**
 * Captures of the app for the SE deck (3.2.4, milestone M4).
 *
 * The deck used to redraw every chart in shapes; a customer then saw a slide that looked nothing
 * like the screen the SE had walked them through. Now a section's slide can carry a photograph of
 * the app's own panel — the very component the page renders, fed by the same catalog query — with
 * numbered pins on what matters and a line per pin saying what it shows.
 *
 * How: the panels are mounted on an off-screen stage at a fixed width, each one is photographed
 * once its query has settled (`html-to-image`: the DOM is cloned with its computed styles into an
 * SVG and drawn on a canvas, all in the browser), and the pins are measured on the live layout. A
 * panel that has no data, or that does not settle in time, is skipped: its slide keeps the drawn
 * chart. Nothing is uploaded anywhere.
 */

/**
 * Width a panel is laid out at for the photograph, CSS px. Narrow on purpose: on its slide the
 * picture is about 7.8 in wide, so 720 px puts the app's 12 px text at about 9 pt — readable on a
 * projector. A wider layout fits more but prints its words too small to read.
 */
export const CAPTURE_WIDTH = 720;
/** Device pixels per CSS pixel in the picture: sharp on a projector, light in the file. */
export const CAPTURE_PIXEL_RATIO = 1.5;
/** How long a panel must stay unchanged before it is photographed, ms. */
export const SETTLE_MS = 700;
/** How long the whole run may take before the panels still loading are skipped, ms. */
export const CAPTURE_TIMEOUT_MS = 45_000;

/** A numbered point of interest on a captured panel. */
export interface PinSpec {
  /** The element the pin points at, inside the panel. */
  find: (root: HTMLElement) => Element | null;
  /** What it shows; may read the element (a figure, a name). `null` drops the pin. */
  label: (element: Element) => string | null;
  /**
   * Where the pin sits, so it never hides what it points at: on the element's centre (default),
   * just outside its top-left corner (a figure, a sentence), or just under it (a chart's peak,
   * whose value is written above the marker).
   */
  at?: 'center' | 'top-left' | 'below' | 'right' | 'left' | 'inside-left';
  /** 3.5.6 ("How to read"): the technical reading and why it matters — a fixed sentence, already translated. */
  detail?: string;
  /** 3.5.6: the platform capability the pin demonstrates, already translated ("Davis · root cause"). */
  capability?: string;
}

/** What a registry entry needs to draw its panel: the app's language and its chart formats. */
export interface CaptureContext {
  t: T;
  fmt: ChartFormat;
}

/**
 * One panel the deck can photograph (3.3.2): a row of `CAPTURE_REGISTRY`. Adding a chart of the app
 * to the deck is one entry there — its section, a unique id, the label the SE picks it by, the
 * panel itself, when it counts as drawn, and its pins; `tests/captureRegistry.test.tsx` holds the
 * contract (every non-commercial deck section has one, ids unique, labels in both languages).
 */
export interface CaptureEntry {
  sectionId: string;
  /** Unique across the registry; kept in the SE's choice and with every stored picture. */
  captureId: string;
  /** What the SE picks the panel by, in the Tech Wrapup's capture choice. */
  label: StringKey;
  /** Layout width of the panel, CSS px (default `CAPTURE_WIDTH`). */
  width?: number;
  /** The app's own panel, fed by the same catalog queries as its page. */
  node: (context: CaptureContext) => React.ReactNode;
  /** True once the panel shows real data (not a loading, empty or refused state). */
  ready: (root: HTMLElement) => boolean;
  pins: (context: CaptureContext) => PinSpec[];
}

/** A registry entry resolved in the app's language: what the stage mounts and photographs. */
export interface CaptureTarget {
  sectionId: string;
  /** Unique among the targets of one run: the key of its picture in `CaptureOutcome.captures`. */
  captureId: string;
  label?: StringKey;
  /** The app's own panel for the section. */
  node: React.ReactNode;
  /** Layout width of the panel, CSS px (default `CAPTURE_WIDTH`). */
  width?: number;
  /** True once the panel shows real data (not a loading, empty or refused state). */
  ready: (root: HTMLElement) => boolean;
  pins: PinSpec[];
}

const text = (element: Element | null | undefined): string => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
const clamp = (value: number) => Math.min(0.97, Math.max(0.03, value));

/** A pin's radius on the captured panel, CSS px: the drawn marker is about this size on the slide. */
export const PIN_RADIUS = 15; // 3.5.6: was 11 — the slide draws the pin at about 30 px of the panel (`capturePinSize`).

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The boxes of every piece of text in the panel (an element with a text of its own, an SVG `<text>`):
 * what a pin must never cover (3.3.3, owner's 3.3.2 validation: a pin sat on the number it pointed at).
 */
export function textBoxes(root: HTMLElement, limit = 600): Box[] {
  const boxes: Box[] = [];
  for (const element of root.querySelectorAll('*')) {
    if (boxes.length >= limit) break;
    const own = [...element.childNodes].some((node) => node.nodeType === 3 && (node.textContent ?? '').trim() !== '');
    if (!own) continue;
    // 3.6.0: the words' own box — a block's box spans its line, and a pin beside the words would read as covering them.
    const r = textExtent(element) ?? element.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) boxes.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return boxes;
}

const hits = (x: number, y: number, radius: number, box: Box) =>
  x + radius > box.left && x - radius < box.right && y + radius > box.top && y - radius < box.bottom;

/**
 * Where a pin goes: its preferred spot when that covers no text and no other pin, else the first free
 * spot around the element it points at (outside each corner, then each side), else the preferred spot.
 */
export function placePin(preferred: { x: number; y: number }, target: Box, clear: readonly Box[], taken: readonly { x: number; y: number }[], radius = PIN_RADIUS, bounds?: Box): { x: number; y: number } {
  const gap = radius + 3;
  const cx = (target.left + target.right) / 2;
  const cy = (target.top + target.bottom) / 2;
  const candidates = [
    preferred,
    { x: target.left - gap, y: target.top - gap },
    { x: target.right + gap, y: target.top - gap },
    { x: target.left - gap, y: cy },
    { x: target.right + gap, y: cy },
    { x: target.left - gap, y: target.bottom + gap },
    { x: target.right + gap, y: target.bottom + gap },
    { x: cx, y: target.top - gap },
    { x: cx, y: target.bottom + gap },
  ];
  // 3.5.6: inside the panel too — a pin pushed past its edge was pulled back over the text it stood beside.
  const inside = (point: { x: number; y: number }) =>
    bounds === undefined || (point.x - radius >= bounds.left && point.x + radius <= bounds.right && point.y - radius >= bounds.top && point.y + radius <= bounds.bottom);
  const free = (point: { x: number; y: number }) =>
    inside(point) && !clear.some((box) => hits(point.x, point.y, radius, box)) && !taken.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < 2 * radius + 2);
  return candidates.find(free) ?? preferred;
}

/**
 * 3.5.6: the largest share of the panel a pin's target may cover. A pin points at a text the app wrote (a name, a
 * figure, a label); a target this large is a container — since the 3.5.x charts its pin fell on the panel's corner
 * (owner's validation of 3.5.5) — and the pin is dropped rather than drawn there.
 */
export const PIN_TARGET_MAX_SHARE = 0.25;

/** The box of an element's own words (a Range over its contents), or null when the browser cannot measure one. */
function textExtent(element: Element): DOMRect | null {
  if (element.tagName === 'TD' || typeof document === 'undefined' || typeof document.createRange !== 'function') return null;
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  } catch {
    return null;
  }
}

/** The pins of a panel, measured on its live layout, numbered in order; specs that find nothing are dropped. */
export function measurePins(root: HTMLElement, specs: readonly PinSpec[]): CapturePin[] {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return [];
  const clear = textBoxes(root);
  const taken: { x: number; y: number }[] = [];
  const pins: CapturePin[] = [];
  for (const spec of specs) {
    const element = spec.find(root);
    if (element === null) continue;
    const label = spec.label(element);
    if (label === null || label.trim() === '') continue;
    const outer = element.getBoundingClientRect();
    if (outer.width * outer.height > PIN_TARGET_MAX_SHARE * box.width * box.height) continue;
    // 3.6.0: beside a text, the box of the text itself (a heading's block spans the panel; its words do not).
    const r = textExtent(element) ?? outer;
    let x = r.left + r.width / 2;
    let y = r.top + r.height / 2;
    if (spec.at === 'left') {
      // 3.5.6: just before the text it points at, on its line.
      // 3.5.7: 8 px of air — a picture drawn small draws its pin larger than the stage measured it (`CAPTURE_PIN_MIN`).
      x = r.left - PIN_RADIUS - 8;
      y = r.top + r.height / 2;
    } else if (spec.at === 'inside-left') {
      // 3.5.7: inside a wide cell, at its left, clear of the figure centred in it (a heat map's cell).
      x = r.left + PIN_RADIUS + 3;
      y = r.top + r.height / 2;
    } else if (spec.at === 'top-left') {
      x = r.left - 10;
      y = r.top - 6;
    } else if (spec.at === 'below') {
      y = r.bottom + 18;
    } else if (spec.at === 'right') {
      // 3.4.12: beside the element, on its own line — in a dense table a corner sits on the row above.
      x = r.right + PIN_RADIUS + 8;
      y = r.top + r.height / 2;
    }
    // Inside a cell, the cell's own box is not a text to avoid (its figure is centred, away from the pin).
    const avoid = spec.at === 'inside-left' ? clear.filter((other) => !(other.left === r.left && other.top === r.top && other.right === r.right && other.bottom === r.bottom)) : clear;
    const placed = placePin({ x, y }, { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, avoid, taken, PIN_RADIUS, { left: box.left, top: box.top, right: box.right, bottom: box.bottom });
    taken.push(placed);
    pins.push({
      n: pins.length + 1,
      x: clamp((placed.x - box.left) / box.width),
      y: clamp((placed.y - box.top) / box.height),
      label: label.trim(),
      ...(spec.detail === undefined ? {} : { detail: spec.detail }),
      ...(spec.capability === undefined ? {} : { capability: spec.capability }),
    });
  }
  return pins;
}

/** `rgb(3, 12, 22)` / `rgba(…)` → `030C16`; anything else (a transparent page) → null. */
export function rgbToHex(color: string): string | null {
  const match = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(color.trim());
  if (match === null) return null;
  if (match[4] !== undefined && Number(match[4]) === 0) return null;
  return [match[1], match[2], match[3]].map((channel) => Number(channel).toString(16).padStart(2, '0').toUpperCase()).join('');
}

/**
 * The fonts embedded in each picture: the deck's own DT Flow faces, which the stage also lays its
 * panels out in (`.pvs-capture-stage` in `spectrum.css`), so every box is measured and painted in
 * the same face. Strato's own faces come from a CDN the picture cannot reach.
 */
export function captureFontCss(): string {
  return DTFLOW_FONT_CSS;
}

// ------------------------------------------------------------------ the panels

type T = Translation['t'];

/** Pins of a trend chart's band: its headline figure, its peak marker. */
function bandPin(t: T, band: number, part: 'headline' | 'peak'): PinSpec {
  // 3.5.0: the trend is the platform's TimeseriesChart (a canvas) under the figures the app writes; both pins read
  // those figures — the headline, and the peak with its time.
  const bandOf = (root: HTMLElement) => root.querySelectorAll('.pvs-trend')[band] ?? null;
  const series = (element: Element) => text(element.closest('.pvs-trend')?.querySelector('h3'));
  if (part === 'peak') {
    return {
      find: (root) => bandOf(root)?.querySelectorAll('.pvs-trend__figure')[1] ?? null,
      label: (element) => {
        const value = text(element.querySelector('.pvs-trend__value'));
        return value === '' ? null : t('cap.pin.peak', { series: series(element), value, time: text(element.querySelector('.pvs-caption')) });
      },
      at: 'below',
    };
  }
  return {
    find: (root) => bandOf(root)?.querySelector('.pvs-trend__figure') ?? null,
    label: (element) => {
      const value = text(element.querySelector('.pvs-figure__value'));
      return value === '' || value === '—' ? null : t('cap.pin.headline', { series: series(element), label: text(element.querySelector('.pvs-label')), value });
    },
    at: 'top-left',
  };
}

const hasArea = (root: HTMLElement) => root.querySelector('.pvs-trend [data-pvs-chart="timeseries"][data-pvs-state="ready"] canvas') !== null;

/**
 * One chart of a section's trend, photographed alone: its headline figure and its peak pinned. The
 * series is the page's own (`features/trends/trendSeries.ts`), picked by its key.
 */
function trendEntry(
  sectionId: string,
  captureId: string,
  label: StringKey,
  queryId: CatalogId,
  series: (context: CaptureContext) => readonly TrendSeries[],
  key: string,
): CaptureEntry {
  return {
    sectionId,
    captureId,
    label,
    node: (context) => {
      const one = series(context).find((candidate) => candidate.key === key);
      return one === undefined ? null : <TrendChart queryId={queryId} series={[one]} minWidth={240} />;
    },
    ready: hasArea,
    // 3.5.6: the three figures the app wrote over the chart, then the evidence.
    pins: ({ t }) => [
      { ...bandPin(t, 0, 'headline'), at: 'left', ...reading(t, 'cap.d.logs.total', 'logs') },
      { ...bandPin(t, 0, 'peak'), at: 'left', ...reading(t, 'cap.d.logs.peak', 'logs') },
      {
        find: (root) => root.querySelectorAll('.pvs-trend')[0]?.querySelectorAll('.pvs-trend__figure')[2] ?? null,
        label: (element) => {
          const value = text(element.querySelector('.pvs-trend__value'));
          return value === '' ? null : t('cap.pin.kpi', { label: text(element.querySelector('.pvs-label')), value });
        },
        at: 'left',
        ...reading(t, 'cap.d.logs.latest', 'logs'),
      },
      provenancePin(t, 0),
    ],
  };
}

/** A query still loading shows this, which the stage reads as "not settled yet". */
const Loading = () => <div role="status" />;

/**
 * 3.4.18: an app loader still on the panel. Strato's chart legends carry a hidden live region (`role="status"`) for
 * good — inside the app's chart wrappers (`[data-pvs-chart]`, engine/strato) that is not a loader, so it does not hold
 * the photograph back (plan §4.4).
 */
export const appStillLoading = (slot: Element): boolean =>
  [...slot.querySelectorAll('[role="status"]')].some((element) => element.closest('[data-pvs-chart]') === null);

/**
 * A query that failed, was refused or was cut by the scan limit shows this (review 3.3.2 #5): the
 * stage reads it as "not captured", never as "this read has no data" — an absence is not a zero, and
 * a refused scope is not an empty estate (rule 8).
 */
const Failed = () => <div data-capture-state="failed" />;

const FAILED_OUTCOMES: ReadonlySet<QueryOutcome> = new Set<QueryOutcome>(['no-permission', 'scan-limit', 'error', 'refused']);

/** True when any of these reads failed (as opposed to answering with nothing). */
const anyFailed = (...results: readonly { outcome: QueryOutcome }[]) => results.some((result) => FAILED_OUTCOMES.has(result.outcome));

/**
 * 3.3.15: the cockpit panels of 3.3.10–3.3.14, photographed as the page draws them
 * (`features/cockpit/panels.tsx`). Each wrapper only says "still loading" or "failed" to the stage;
 * the panel itself decides whether it has anything to show.
 */
const SlowestServicesCapture = () => {
  const scope = useQueryScope();
  const ranking = useCatalogQuery('svc.ranking', scope);
  const totals = useCatalogQuery('svc.ranking.total', scope);
  if (ranking.outcome === 'loading' || totals.outcome === 'loading') return <Loading />;
  if (anyFailed(ranking)) return <Failed />;
  return <SlowestServices />;
};

const StableWorkloadsCapture = () => {
  const scope = useQueryScope();
  const inventory = useCatalogQuery('k8s.inventory', scope);
  const restarts = useCatalogQuery('k8s.restarts', scope);
  const totals = useCatalogQuery('k8s.restarts.total', scope);
  if (inventory.outcome === 'loading' || restarts.outcome === 'loading' || totals.outcome === 'loading') return <Loading />;
  if (anyFailed(restarts)) return <Failed />;
  return <StableWorkloads />;
};

const HostsAtCeilingCapture = () => {
  const scope = useQueryScope();
  const capacity = useCatalogQuery('infra.capacity', scope);
  const summary = useCatalogQuery('infra.capacity.summary', scope);
  if (capacity.outcome === 'loading' || summary.outcome === 'loading') return <Loading />;
  if (anyFailed(capacity, summary)) return <Failed />;
  return <HostsAtCeiling />;
};

const FrontendErrorsCapture = () => {
  const scope = useQueryScope();
  const scorecard = useCatalogQuery('rum.scorecard', scope);
  const webvitals = useCatalogQuery('rum.webvitals', scope);
  if (scorecard.outcome === 'loading' || webvitals.outcome === 'loading') return <Loading />;
  if (anyFailed(scorecard)) return <Failed />;
  return <FrontendErrors />;
};

const ProblemArrivalsCapture = () => {
  const scope = useQueryScope();
  const timeline = useCatalogQuery('prob.timeline', scope);
  if (timeline.outcome === 'loading') return <Loading />;
  if (anyFailed(timeline)) return <Failed />;
  return <ProblemArrivals />;
};

/** 3.4.10: the new charts of the Dynatrace Intelligence page, the same components as on the page. */
const ProblemCalendarCapture = () => {
  const scope = useQueryScope();
  const timeline = useCatalogQuery('prob.timeline', scope);
  if (timeline.outcome === 'loading') return <Loading />;
  if (anyFailed(timeline)) return <Failed />;
  return <ProblemCalendarPanel />;
};

const ProblemRingsCapture = () => {
  const scope = useQueryScope();
  const summary = useCatalogQuery('prob.summary', scope);
  const recurrentTotal = useCatalogQuery('prob.recurrent.total', scope);
  if (summary.outcome === 'loading' || recurrentTotal.outcome === 'loading') return <Loading />;
  if (anyFailed(summary)) return <Failed />;
  return <ProblemRingsPanel />;
};

/** 3.4.10 (F-02): the Assessment's maturity journey and its coverage radar, as the page draws them. */
const AssessmentMaturityCapture = () => {
  const { t, formatNumber } = useTranslation();
  const assessment = useAssessment();
  if (assessment.isLoading) return <Loading />;
  if (anyFailed(assessment.reads.inventory)) return <Failed />;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('asm.mat.title')}
        </Heading>
        <MaturityJourney reading={assessment.maturity} t={t} formatNumber={formatNumber} compact />
      </Stack>
    </Panel>
  );
};

const AssessmentRadarCapture = () => {
  const { t } = useTranslation();
  const assessment = useAssessment();
  if (assessment.isLoading) return <Loading />;
  if (anyFailed(assessment.reads.inventory)) return <Failed />;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('asm.radar.title')}
        </Heading>
        <RadialBars
          bars={radialBarsFor(assessment.index, t)}
          ariaLabel={t('asm.radar.title')}
          centre={assessment.index.value === null ? undefined : { value: String(assessment.index.value), label: t('asm.radar.centre'), band: t(bandOf(assessment.index.value)) }}
        />
      </Stack>
    </Panel>
  );
};

const ProblemMixCapture = () => {
  const scope = useQueryScope();
  const summary = useCatalogQuery('prob.summary', scope);
  if (summary.outcome === 'loading') return <Loading />;
  if (anyFailed(summary)) return <Failed />;
  return <ProblemMix />;
};

/** The value of a ranked bar, without the status words read only by assistive technology. */
const rankedValue = (row: Element) => (row.querySelector('.pvs-ranked__value')?.childNodes[0]?.textContent ?? '').trim();

/** How many of the ranked rows sit above their review line, as a pin on the line's legend key. */
const aboveLinePin = (t: T, kind: 'slow' | 'restarts', line: () => string): PinSpec => ({
  find: (root) => root.querySelector('.pvs-ranked__legend .pvs-ranked__key'),
  label: (element) => {
    const rows = [...(element.closest('.pvs-ranked')?.querySelectorAll('.pvs-ranked__row') ?? [])];
    if (rows.length === 0) return null;
    const above = rows.filter((row) => row.getAttribute('data-status') === 'critical').length;
    const params = { count: String(above), shown: String(rows.length), line: line() };
    if (kind === 'slow') return t(above === 0 ? 'cap.pin.slowNone' : 'cap.pin.slowAbove', params);
    return t(above === 0 ? 'cap.pin.restartsNone' : 'cap.pin.restartsAbove', params);
  },
  at: 'top-left',
});

/**
 * RCA: the trail problem → root cause → affected entities of the most impactful incident. It waits
 * for the root's callers too (3.2.7): a database root is drawn as a database with the services that
 * call it only once they answer, so a slow callers query must not be photographed half drawn.
 */
const RcaPanel = () => {
  const scope = useQueryScope();
  const top = useCatalogQuery('rca.top', scope);
  const incident = useMemo(() => (top.outcome === 'loading' ? null : summariseRca(top.records, [], []).incident), [top.outcome, top.records]);
  const root = useRootCallersState(incident);
  if (top.outcome === 'loading' || root.pending) return <Loading />;
  if (anyFailed(top)) return <Failed />;
  if (incident === null) return null;
  return (
    <Panel pad="roomy">
      <RcaTrail incident={incident} callers={root.callers} />
    </Panel>
  );
};


/** Overview (3.2.6): the stack map, from the user to the infrastructure or the cloud. */
const StackPanel = () => {
  const scope = useQueryScope();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const stack = useStackNodes();
  if (inventory.outcome === 'loading') return <Loading />;
  if (anyFailed(inventory)) return <Failed />;
  return (
    <Panel pad="roomy">
      <StackMap nodes={stack.nodes} />
    </Panel>
  );
};

/** Value & ROI (3.2.6): the value chain — discover, detect, resolve, automate (and consolidate). */
const ChainPanel = () => {
  const scope = useQueryScope();
  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const chain = useValueChain();
  if (inventory.outcome === 'loading' || problems.outcome === 'loading') return <Loading />;
  if (anyFailed(inventory, problems)) return <Failed />;
  return (
    <Panel pad="roomy">
      <ValueChain links={chain} label="" />
    </Panel>
  );
};

const SEVERITY_LEVELS = [
  ['CRITICAL', 'critical', 'p.sec.sev.critical'],
  ['HIGH', 'high', 'p.sec.sev.high'],
  ['MEDIUM', 'medium', 'p.sec.sev.medium'],
  ['LOW', 'low', 'p.sec.sev.low'],
] as const;

/** Security (3.2.6): the open vulnerabilities in red, what to act on now and next, the severity mix. */
const SecurityPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const posture = useCatalogQuery('sec.posture', scope);
  if (posture.outcome === 'loading') return <Loading />;
  if (posture.outcome !== 'ok') return anyFailed(posture) ? <Failed /> : null;
  const summary = summarisePosture(posture.records);
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Grid min={200}>
          <KpiHero family="red" fact={observed(summary.total, posture.evidence)} eyebrow={t('p.sec.v2.total')} value={formatNumber(summary.total)} caption={t('p.sec.v2.totalCaption')} />
          <KpiHero family="orange" fact={observed(summary.actNowCount, posture.evidence)} eyebrow={t('p.sec.act.title')} value={formatNumber(summary.actNowCount)} caption={t('p.sec.act.caption')} />
          <KpiHero
            family="pink-purple"
            fact={observed(Math.max(0, summary.twoSignalsCount - summary.actNowCount), posture.evidence)}
            eyebrow={t('p.sec3.next.title')}
            value={formatNumber(Math.max(0, summary.twoSignalsCount - summary.actNowCount))}
            caption={t('p.sec3.pairs.title')}
          />
        </Grid>
        <SeverityBar
          label={t('p.sec.v2.shareAria')}
          segments={SEVERITY_LEVELS.map(([severity, level, key]) => ({
            level,
            count: summary.bySeverity[severity],
            label: t(key),
            display: formatNumber(summary.bySeverity[severity]),
          }))}
        />
      </Stack>
    </Panel>
  );
};

/** Competitor overlap (3.2.6): today's agents and tools → one OneAgent, one platform. */
const CompetitorPanel = () => {
  const scope = useQueryScope();
  const agents = useCatalogQuery('comp.agents', scope);
  if (agents.outcome === 'loading') return <Loading />;
  if (anyFailed(agents)) return <Failed />;
  const { vendors, totalAgents } = summariseCompetitors(agents.outcome === 'ok' ? agents.records : []);
  if (totalAgents === 0) return null;
  return <ConsolidationHero vendors={vendors} totalAgents={totalAgents} />;
};

/** Cloud (3.3.2): the hosts per cloud provider, the donut of the Cloud observability page. */
const CloudHostsPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const cloud = useCatalogQuery('cloud.hosts', scope);
  if (cloud.outcome === 'loading') return <Loading />;
  if (cloud.outcome !== 'ok') return anyFailed(cloud) ? <Failed /> : null;
  const view = summariseCloud(cloud.records);
  if (view.providers.length === 0) return null;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('p.cloud.distChartTitle')}
        </Heading>
        <DonutBreakdown
                heads={{ name: t('v6.legend.name'), count: t('v6.legend.count'), share: t('v6.hex.share') }}
          segments={view.providers.map((row) => ({ key: row.provider, label: PROVIDER_META[row.provider].short, value: row.hosts, display: formatNumber(row.hosts) }))}
          ariaLabel={t('p.cloud.distChartTitle')}
          centerDisplay={formatNumber(view.totalHosts)}
          centerLabel={t('p.cloud.band.hosts')}
        />
      </Stack>
    </Panel>
  );
};

const CLOUD_PROVIDERS: readonly CloudProvider[] = ['AWS', 'Azure', 'GCP', 'Other'];

/** Cloud (3.3.2): the monitored cloud services per provider, the page's newer per-provider bars. */
const CloudServicesPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const services = useCatalogQuery('cloud.services', scope);
  if (services.outcome === 'loading') return <Loading />;
  if (services.outcome !== 'ok') return anyFailed(services) ? <Failed /> : null;
  const svc = summariseCloudServices(services.records);
  if (svc.serviceFamilyCount === 0) return null;
  return (
    <Stack gap="group">
      <Heading level={5} as="h3">
        {t('p.cloud.svc.title')}
      </Heading>
      <Grid min={300}>
        {CLOUD_PROVIDERS.filter((provider) => svc.byProvider[provider].length > 0).map((provider) => (
          <Panel key={provider} as="article" pad="roomy">
            <Stack gap="group">
              <Cluster gap="tight">
                <ProviderMark provider={provider} size={40} decorative />
                <Heading level={5} as="h4">
                  {PROVIDER_META[provider].fullName}
                </Heading>
              </Cluster>
              <BarList
                role="magnitude"
                ariaLabel={t('p.cloud.svc.aria', { provider: PROVIDER_META[provider].short })}
                items={svc.byProvider[provider].slice(0, 10).map((service) => ({
                  key: service.family,
                  label: service.family,
                  value: service.resources,
                  display: formatNumber(service.resources),
                }))}
              />
            </Stack>
          </Panel>
        ))}
      </Grid>
    </Stack>
  );
};

/** Technologies (3.3.2): the busiest technology versions, the chart of the Processes & technologies page. */
const TechnologyBarsPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const technologies = useCatalogQuery('proc.technologies', scope);
  if (technologies.outcome === 'loading') return <Loading />;
  if (technologies.outcome !== 'ok') return anyFailed(technologies) ? <Failed /> : null;
  const bars = technologyBars(toTechnologyRows(technologies.records));
  if (bars.length === 0) return null;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('p.tech.chartTitle')}
        </Heading>
        <BarList
          role="magnitude"
          ariaLabel={t('p.tech.chartAria')}
          items={bars.map((row, index) => ({ key: `${row.name}-${index}`, label: row.name, value: row.value, display: formatNumber(row.value) }))}
        />
      </Stack>
    </Panel>
  );
};

/** Technologies (3.3.2): one chip per technology with its official glyph, the page's newer overview. */
const TechnologyChipsPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const technologies = useCatalogQuery('proc.technologies', scope);
  if (technologies.outcome === 'loading') return <Loading />;
  if (technologies.outcome !== 'ok') return anyFailed(technologies) ? <Failed /> : null;
  const chips = technologyChips(toTechnologyRows(technologies.records)).map(({ name, count }) => ({ name, display: formatNumber(count) }));
  if (chips.length === 0) return null;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('p.tech.chips.title')}
        </Heading>
        <TechChips items={chips} label={t('p.tech.chips.aria')} />
      </Stack>
    </Panel>
  );
};

/**
 * Executive (3.3.2): the mean time to resolve per problem category, the "resolution speed" chart of
 * the Executive summary. Durations only: the section's money figures never reach a picture.
 */
const MttrPanel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const mttx = useCatalogQuery('prob.mttx', scope);
  if (mttx.outcome === 'loading') return <Loading />;
  if (mttx.outcome !== 'ok') return anyFailed(mttx) ? <Failed /> : null;
  const rows = summariseMttr(mttx.records)
    .rows.filter((row) => row.mttrNs !== null)
    .map((row) => ({ category: row.category, value: Number(((row.mttrNs ?? 0) / 3_600_000_000_000).toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
  if (rows.length === 0) return null;
  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={5} as="h3">
          {t('exec.mttxTitle')}
        </Heading>
        <BarList
          role="duration"
          ariaLabel={t('exec.mttxAria')}
          items={rows.map((row) => ({ key: row.category, label: row.category, value: row.value, display: t('cap.value.hours', { value: formatNumber(row.value) }) }))}
        />
      </Stack>
    </Panel>
  );
};

/** Executive (3.3.2): the three rings that open the Executive summary — coverage, problems closed, healthy services. */
const RingsPanel = () => {
  const { t, formatNumber } = useTranslation();
  const story = useStoryNumbers();
  const factFrom = useSummaryFact();
  if ([story.inventory, story.problems, story.serviceTotals].some((result) => result.outcome === 'loading')) return <Loading />;
  if (anyFailed(story.inventory, story.problems, story.serviceTotals)) return <Failed />;
  if (story.coveragePct === null && story.closurePct === null && story.serviceHealthPct === null) return null;
  const percent = (value: number | null) => (value === null ? undefined : `${Math.round(value)}%`);
  return (
    <Panel pad="roomy">
      <Grid min={200}>
        <GaugeRing
          family="blue-turquoise"
          value={story.coveragePct}
          valueDisplay={percent(story.coveragePct)}
          label={t('cc.ring.coverage.label')}
          caption={t('cc.ring.coverage.caption')}
          ariaLabel={t('cc.ring.coverage.aria')}
          missingLabel={t('tl.notMeasured')}
          fact={factFrom(story.inventory, story.coveragePct === null ? null : Math.round(story.coveragePct), { calculation: t('cc.ring.coverage.calc'), unit: '%' })}
        />
        <GaugeRing
          family="turquoise"
          value={story.closurePct}
          valueDisplay={percent(story.closurePct)}
          label={t('cc.ring.health.label')}
          caption={t('cc.ring.health.captionWindow', { window: t('timeframe.pinned.7d') })}
          ariaLabel={t('cc.ring.health.aria')}
          missingLabel={t('tl.notMeasured')}
          fact={factFrom(story.problems, story.closurePct === null ? null : Math.round(story.closurePct), { calculation: t('cc.ring.health.calc'), unit: '%' })}
        />
        <GaugeRing
          family="pink-purple"
          value={story.serviceHealthPct}
          valueDisplay={percent(story.serviceHealthPct)}
          label={t('cc.ring.services.label')}
          caption={story.servicesWithTraffic === null ? undefined : t('cc.ring.services.caption', { count: formatNumber(story.servicesWithTraffic) })}
          ariaLabel={t('cc.ring.services.aria')}
          missingLabel={t('tl.notMeasured')}
          fact={factFrom(story.serviceTotals, story.serviceHealthPct === null ? null : Math.round(story.serviceHealthPct), { calculation: t('cc.ring.services.calc'), unit: '%' })}
        />
      </Grid>
    </Panel>
  );
};

const figureText = (element: Element | null | undefined) => text(element?.querySelector('.pvs-figure__value'));

/** A stack-map node in words: its name and its count ("Web applications 4 apps"). */
const stackNodeText = (element: Element) => [text(element.querySelector('.pvs-stackmap__name')), text(element.querySelector('.pvs-stackmap__count'))].filter((part) => part !== '').join(' ');

/** The node of a flow map, by position among the nodes, or the emphasised one. */
const nodeName = (element: Element) => text(element.querySelector('title'));

// ------------------------------------------------------------------ 3.5.6: pins on the app's own texts

type CapabilityKey = 'oneagent' | 'saturation' | 'grail' | 'provenance' | 'detection' | 'rootCause' | 'smartscape' | 'k8s' | 'tracing' | 'line' | 'cloud' | 'tech' | 'logs' | 'security' | 'rum' | 'platform' | 'assessment' | 'automation';

/** The reading of a pin in the "How to read" legend: a fixed sentence and the capability it shows. */
const reading = (t: T, detail: StringKey, capability: CapabilityKey): Pick<PinSpec, 'detail' | 'capability'> => ({
  detail: t(detail),
  capability: t(`cap.c.${capability}` as StringKey),
});

/** The `index`-th element matching `selector` (negative counts from the end). */
const nth =
  (selector: string, index = 0) =>
  (root: HTMLElement): Element | null => {
    const all = root.querySelectorAll(selector);
    return all[index < 0 ? all.length + index : index] ?? null;
  };

/** A ring's label under its dial, read with its value ("Hosts below 75% at peak: 85.5%"). */
const gaugePin = (t: T, index: number, detail: StringKey, capability: CapabilityKey): PinSpec => ({
  find: nth('.pvs-gauge__label', index),
  label: (element) => {
    const gauge = element.closest<HTMLElement>('.pvs-gauge');
    const value = gauge?.dataset.value ?? text(gauge?.querySelector('.pvs-gauge__reading'));
    const name = text(element);
    return value === '' || name === '' ? null : t('cap.pin.kpi', { label: name, value });
  },
  at: 'left',
  ...reading(t, detail, capability),
});

/** A bar of a `BarList`: its name and value, the pin just after the value. */
const barPin = (t: T, index: number, key: StringKey, detail: StringKey, capability: CapabilityKey, scope = ''): PinSpec => ({
  find: (root) => nth(`${scope} .pvs-bars__row`.trim(), index)(root)?.querySelector('.pvs-bars__value') ?? null,
  label: (element) => {
    const row = element.closest('.pvs-bars__row');
    const name = text(row?.querySelector('.pvs-bars__name'));
    const value = text(element);
    return name === '' || value === '' ? null : t(key, { name, value });
  },
  at: 'right',
  ...reading(t, detail, capability),
});

/** A row of `RankedBars` (drawn as rows in a capture): its name and value, the pin before the name. */
const rankedPin = (t: T, index: number, key: StringKey, detail: StringKey, capability: CapabilityKey): PinSpec => ({
  find: (root) => nth('.pvs-ranked__row', index)(root)?.querySelector('.pvs-ranked__label') ?? null,
  label: (element) => {
    const row = element.closest('.pvs-ranked__row');
    const name = text(element);
    const value = row === null ? '' : rankedValue(row);
    return name === '' || value === '' ? null : t(key, { name, value });
  },
  at: 'left',
  ...reading(t, detail, capability),
});

/** The evidence badge of a number: its class and the query it came from. */
const provenancePin = (t: T, index = 0): PinSpec => ({
  find: nth('.pvs-prov', index),
  label: (element) => {
    const kind = text(element);
    const query = (element as HTMLElement).dataset.query ?? '';
    if (kind === '') return null;
    return query === '' ? t('cap.pin2.provKind', { kind }) : t('cap.pin2.prov', { kind, query });
  },
  at: 'left',
  ...reading(t, 'cap.d.prov', 'provenance'),
});

/** A text the panel wrote (a caption, a heading), read as it is. */
const textPin = (t: T, find: (root: HTMLElement) => Element | null, detail: StringKey, capability: CapabilityKey, at: PinSpec['at'] = 'right'): PinSpec => ({
  find,
  label: (element) => text(element) || null,
  at,
  ...reading(t, detail, capability),
});

/** A heading of the panel (its title). */
const headingOf = (index = 0) => nth('h2, h3, h4', index);

/** A legend row of a donut: name, value and share, the pin after the share. */
const legendPin = (t: T, rowSelector: string, prefix: string, index: number, key: 'cap.pin.cloud.provider' | 'cap.pin.mix.top', detail: StringKey, capability: CapabilityKey): PinSpec => ({
  find: (root) => nth(rowSelector, index)(root)?.querySelector(`.${prefix}__share`) ?? null,
  label: (element) => {
    const row = element.closest(rowSelector);
    const name = text(row?.querySelector(`.${prefix}__name`));
    const value = text(row?.querySelector(`.${prefix}__value`));
    return name === '' || value === '' ? null : t(key, { name, value, share: text(element) });
  },
  at: 'right',
  ...reading(t, detail, capability),
});

/** A Strato gauge (`StratoGauge`): its label, read with the value the app formatted. */
const sgaugePin = (t: T, index: number, detail: StringKey, capability: CapabilityKey): PinSpec => ({
  find: nth('[data-pvs-chart="gauge"][data-pvs-state="ready"] .pvs-sgauge__label', index),
  label: (element) => {
    const value = element.closest<HTMLElement>('[data-pvs-chart="gauge"]')?.dataset.value ?? '';
    return value === '' ? null : t('cap.pin.kpi', { label: text(element), value });
  },
  at: 'left',
  ...reading(t, detail, capability),
});

/** A stack-map node (the overview's stack, the RCA trail). */
const nodePin = (t: T, find: (root: HTMLElement) => Element | null, label: (element: Element) => string | null, detail: StringKey, capability: CapabilityKey): PinSpec => ({
  find,
  label,
  at: 'top-left',
  ...reading(t, detail, capability),
});

/**
 * Every panel the deck can photograph (3.3.2), in the deck's order. The first entry of a section is
 * its default; the SE may pick up to two per section (`resolveCaptureChoice`). Consumption has none
 * on purpose: it is a commercial section (AGENTS.md rule 6), and so are the money figures of the
 * executive and ROI sections, which no panel here draws.
 */
export const CAPTURE_REGISTRY: readonly CaptureEntry[] = [
  // 3.4.10: the heat calendar opens the section — the slide already draws the arrivals as a chart, so the
  // picture adds what the slide cannot draw; the rings follow (owner's report on the Dynatrace Intelligence slide).
  {
    sectionId: 'problems',
    captureId: 'problems.calendar',
    label: 'cap.opt.problems.calendar',
    node: () => <ProblemCalendarCapture />,
    width: 1100,
    ready: (root) => root.querySelector('.pvs-heatcal__cell') !== null,
    // 3.5.7 (owner's validation of 3.5.6: "slide 5 está com pins 1 e 2 errados"): the busiest day's pin sits right
    // after its total (the number itself, not the wide cell), the busiest slot's pin inside its own cell, and the
    // panel's sentence carries the window's totals.
    pins: ({ t }) => {
      const value = (element: Element) => Number((element.textContent ?? '').replace(/[^0-9]/g, '')) || 0;
      const busiest = (selector: string) => (root: HTMLElement) =>
        [...root.querySelectorAll(selector)].reduce<Element | null>((best, element) => (best === null || value(element) > value(best) ? element : best), null);
      return [
        {
          find: busiest('.pvs-heatcal__sum'),
          label: (element) => {
            const day = text(element.closest('tr')?.querySelector('th'));
            const total = text(element);
            return total === '' ? null : t('cap.pin2.busiestDay', { day, value: total });
          },
          at: 'right',
          ...reading(t, 'cap.d.cal.busiest', 'detection'),
        },
        {
          find: busiest('.pvs-heatcal__cell'),
          label: (element) => {
            const cell = element as HTMLTableCellElement;
            const day = text(cell.closest('tr')?.querySelector('th'));
            const slot = text(cell.closest('table')?.querySelectorAll('thead th')[cell.cellIndex]);
            const count = text(cell);
            return count === '' || day === '' ? null : t('cap.pin2.cell', { day, slot, value: count });
          },
          at: 'inside-left',
          ...reading(t, 'cap.d.cal.cell', 'detection'),
        },
        textPin(t, (root) => headingOf()(root)?.nextElementSibling ?? null, 'cap.d.cal.summary', 'detection'),
        textPin(t, headingOf(), 'cap.d.cal.title', 'detection'),
      ];
    },
  },
  {
    sectionId: 'problems',
    captureId: 'problems.rings',
    label: 'cap.opt.problems.rings',
    node: () => <ProblemRingsCapture />,
    // 3.4.18: the value is the one the app formatted (`data-value`), never read off the dial. 3.6.2: the dial is the
    // app's arc of segments (`StratoArc`).
    ready: (root) => root.querySelector('[data-pvs-chart="gauge"][data-pvs-state="ready"] .pvs-sarc') !== null,
    // 3.5.6: each gauge's label under its dial, with the value the app formatted; then the evidence of the first.
    pins: ({ t }) => [
      sgaugePin(t, 0, 'cap.d.rings.closed', 'detection'),
      sgaugePin(t, 1, 'cap.d.rings.recurrence', 'automation'),
      sgaugePin(t, 2, 'cap.d.rings.open', 'detection'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'problems',
    captureId: 'problems.arrivals',
    label: 'cap.opt.problems.arrivals',
    node: () => <ProblemArrivalsCapture />,
    width: 900,
    // 3.4.18: the platform's TimeseriesChart draws on a canvas; the pins read the peak and the mean the app wrote above it.
    ready: (root) => root.querySelector('[data-pvs-chart="timeseries"][data-pvs-state="ready"] canvas') !== null,
    pins: ({ t }) => [
      {
        find: (root) => root.querySelector('.pvs-arrivals__peak'),
        label: (element) => {
          const value = (element as HTMLElement).dataset.pin ?? '';
          return value === '' ? null : t('cap.pin.arrivals.peak', { value });
        },
        // 3.5.6: beside the text that states the peak (under it, the pin fell inside the chart).
        at: 'left',
        ...reading(t, 'cap.d.arr.peak', 'detection'),
      },
      { find: (root) => root.querySelector('.pvs-arrivals__mean'), label: (element) => text(element) || null, at: 'left', ...reading(t, 'cap.d.arr.mean', 'detection') },
      textPin(t, headingOf(), 'cap.d.arr.title', 'detection'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'problems',
    captureId: 'problems.mix',
    label: 'cap.opt.problems.mix',
    node: () => <ProblemMixCapture />,
    // 3.4.18: the platform's DonutChart; the total and the two largest slices are read from the app's own legend.
    ready: (root) => root.querySelector('[data-pvs-chart="donut"][data-pvs-state="ready"] [data-dt-component="DonutChart"], [data-pvs-chart="donut"][data-pvs-state="ready"] svg') !== null,
    pins: ({ t }) => [
      {
        // 3.5.6: on the total the app wrote in the donut's centre, not on the centre block.
        find: (root) => root.querySelector('.pvs-sdonut__total'),
        label: (element) => {
          const value = text(element);
          return value === '' ? null : t('cap.pin.mix.total', { value });
        },
        at: 'left',
        ...reading(t, 'cap.d.mix.total', 'detection'),
      },
      legendPin(t, '.pvs-sdonut__row', 'pvs-sdonut', 0, 'cap.pin.mix.top', 'cap.d.mix.first', 'rootCause'),
      legendPin(t, '.pvs-sdonut__row', 'pvs-sdonut', 1, 'cap.pin.mix.top', 'cap.d.mix.next', 'detection'),
      legendPin(t, '.pvs-sdonut__row', 'pvs-sdonut', 2, 'cap.pin.mix.top', 'cap.d.mix.next', 'detection'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'rca',
    captureId: 'rca.trail',
    label: 'cap.opt.rca.trail',
    node: () => <RcaPanel />,
    // The trail is drawn 1,145 units wide; laid out narrower, its names would shrink with it.
    width: 1180,
    ready: (root) => root.querySelector('.pvs-stackmap__node') !== null,
    pins: ({ t }) => {
      const affected = (root: Element) => {
        const nodes = [...root.querySelectorAll('.pvs-stackmap__node')];
        const rootIndex = nodes.findIndex((node) => node.getAttribute('data-emphasis') === 'true');
        return rootIndex < 0 ? [] : nodes.slice(rootIndex + 1);
      };
      return [
        nodePin(t, (root) => root.querySelector('.pvs-stackmap__node'), (element) => t('cap.pin.rca.problem', { name: nodeName(element) }), 'cap.d.rca.problem', 'detection'),
        nodePin(t, (root) => root.querySelector('.pvs-stackmap__node[data-emphasis="true"]'), (element) => t('cap.pin.rca.root', { name: nodeName(element) }), 'cap.d.rca.root', 'rootCause'),
        // 3.5.7 (owner: "no slide 6 os pins 3 e 4 estão redundantes"): the first affected entity, read with how many
        // the trail draws, beside its own box; then who calls the root cause, with the failures measured, and where
        // in Kubernetes it ran.
        {
          find: (root) => affected(root)[0] ?? null,
          label: (element) => {
            const count = affected(element.closest('[data-capture]') ?? element.ownerDocument.body).length;
            return t('cap.pin2.affected', { name: nodeName(element), count: String(count) });
          },
          at: 'left',
          ...reading(t, 'cap.d.rca.count', 'smartscape'),
        },
        {
          find: (root) => root.querySelector('.pvs-tech-chip__link')?.parentElement?.querySelector('.pvs-tech-chip__count') ?? null,
          label: (element) => {
            const name = text(element.parentElement?.querySelector('.pvs-tech-chip__link'));
            const failures = text(element);
            return name === '' || failures === '' ? null : t('cap.pin2.caller', { name, value: failures });
          },
          at: 'right',
          ...reading(t, 'cap.d.rca.caller', 'tracing'),
        },
        {
          find: (root) => [...root.querySelectorAll('.pvs-label')].find((label) => label.nextElementSibling?.querySelector('.pvs-tech-chip__count') !== null && !label.nextElementSibling?.querySelector('.pvs-tech-chip__link')) ?? null,
          label: (element) => {
            // Each chip's name and kind as separate words ("k8s-cluster-a cluster"), not run together.
            const words = (chip: Element) => [...chip.querySelectorAll('span, a')].filter((part) => part.children.length === 0).map((part) => text(part)).filter((part) => part !== '').join(' ') || text(chip);
            const chips = [...(element.nextElementSibling?.children ?? [])].map(words).filter((part) => part !== '').slice(0, 3);
            return chips.length === 0 ? null : t('cap.pin2.k8s', { value: chips.join(' · ') });
          },
          at: 'left',
          ...reading(t, 'cap.d.rca.k8s', 'k8s'),
        },
      ];
    },
  },
  // One chart per section by default: the one its slide's findings speak about; the page's other
  // series as the second option.
  {
    sectionId: 'infrastructure',
    captureId: 'infrastructure.ceiling',
    label: 'cap.opt.infra.ceiling',
    node: () => <HostsAtCeilingCapture />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-gauge') !== null,
    // 3.5.6: five pins on the app's texts; the legend now takes the right column before the number tiles do.
    pins: ({ t }) => [
      gaugePin(t, 0, 'cap.d.infra.ring', 'oneagent'),
      barPin(t, 0, 'cap.pin2.row', 'cap.d.infra.top', 'saturation'),
      barPin(t, -1, 'cap.pin2.row', 'cap.d.infra.next', 'saturation'),
      textPin(t, (root) => root.querySelector('.pvs-bars')?.closest('.pvs-stack')?.querySelector(':scope > .pvs-caption, .pvs-caption') ?? null, 'cap.d.capped', 'grail'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'cloud',
    captureId: 'cloud.hosts',
    label: 'cap.opt.cloud.hosts',
    node: () => <CloudHostsPanel />,
    ready: (root) => root.querySelector('.pvs-donut__arc') !== null,
    pins: ({ t }) => [
      {
        find: (root) => root.querySelector('.pvs-donut__total'),
        label: (element) => {
          const value = text(element);
          return value === '' ? null : t('cap.pin.cloud.total', { value });
        },
        at: 'left',
        ...reading(t, 'cap.d.cloud.total', 'cloud'),
      },
      legendPin(t, '.pvs-legend-list__row', 'pvs-legend-list', 0, 'cap.pin.cloud.provider', 'cap.d.cloud.first', 'cloud'),
      legendPin(t, '.pvs-legend-list__row', 'pvs-legend-list', 1, 'cap.pin.cloud.provider', 'cap.d.cloud.next', 'cloud'),
      textPin(t, headingOf(), 'cap.d.cloud.title', 'oneagent'),
    ],
  },
  {
    sectionId: 'cloud',
    captureId: 'cloud.services',
    label: 'cap.opt.cloud.services',
    node: () => <CloudServicesPanel />,
    width: 1100,
    ready: (root) => root.querySelector('.pvs-bars__row') !== null,
    pins: ({ t }) => [
      textPin(t, headingOf(0), 'cap.d.cloud.svc', 'cloud'),
      textPin(t, (root) => root.querySelectorAll('article')[0]?.querySelector('h4') ?? null, 'cap.d.cloud.title', 'oneagent'),
      barPin(t, 0, 'cap.pin2.row', 'cap.d.cloud.svcTop', 'cloud', 'article:nth-of-type(1)'),
      barPin(t, 0, 'cap.pin2.row', 'cap.d.cloud.svcTop', 'cloud', 'article:nth-of-type(2)'),
      barPin(t, 0, 'cap.pin2.row', 'cap.d.cloud.svcTop', 'cloud', 'article:nth-of-type(3)'),
    ],
  },
  {
    sectionId: 'kubernetes',
    captureId: 'kubernetes.stable',
    label: 'cap.opt.k8s.stable',
    node: () => <StableWorkloadsCapture />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-gauge') !== null && root.querySelector('.pvs-ranked__row') !== null,
    pins: ({ t }) => [
      gaugePin(t, 0, 'cap.d.k8s.ring', 'k8s'),
      rankedPin(t, 0, 'cap.pin.restarts', 'cap.d.k8s.top', 'k8s'),
      { ...aboveLinePin(t, 'restarts', () => String(assumed('findings.restarts.min'))), at: 'left', ...reading(t, 'cap.d.k8s.line', 'line') },
      textPin(t, (root) => root.querySelector('.pvs-ranked')?.closest('.pvs-stack')?.querySelector('.pvs-caption') ?? null, 'cap.d.capped', 'grail'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'services',
    captureId: 'services.slowest',
    label: 'cap.opt.svc.slowest',
    node: () => <SlowestServicesCapture />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-ranked__row') !== null,
    pins: ({ t }) => [
      rankedPin(t, 0, 'cap.pin.slowest', 'cap.d.svc.top', 'tracing'),
      rankedPin(t, 1, 'cap.pin2.row', 'cap.d.svc.next', 'tracing'),
      { ...aboveLinePin(t, 'slow', () => formatMicros(assumed('services.latency.attention') * 1000)), at: 'left', ...reading(t, 'cap.d.svc.line', 'line') },
      textPin(t, (root) => root.querySelector('.pvs-chartframe__head ~ * .pvs-caption, .pvs-caption'), 'cap.d.capped', 'grail', 'left'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'technologies',
    captureId: 'technologies.bars',
    label: 'cap.opt.tech.bars',
    node: () => <TechnologyBarsPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-bars__row') !== null,
    pins: ({ t }) => [
      barPin(t, 0, 'cap.pin.bar', 'cap.d.tech.top', 'tech'),
      barPin(t, 1, 'cap.pin2.row', 'cap.d.tech.next', 'tech'),
      barPin(t, 2, 'cap.pin2.row', 'cap.d.tech.next', 'tech'),
      textPin(t, headingOf(), 'cap.d.tech.title', 'oneagent'),
    ],
  },
  {
    sectionId: 'technologies',
    captureId: 'technologies.chips',
    label: 'cap.opt.tech.chips',
    node: () => <TechnologyChipsPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-tech-chip') !== null,
    pins: ({ t }) => [
      {
        find: (root) => root.querySelector('.pvs-tech-chip'),
        label: (element) => {
          const value = text(element.querySelector('.pvs-tech-chip__count'));
          const name = text(element.querySelector('span:not(.pvs-tech-chip__count)'));
          return name === '' || value === '' ? null : t('cap.pin.tech.top', { name, value });
        },
        at: 'top-left',
        ...reading(t, 'cap.d.chips.top', 'tech'),
      },
      ...[1, 2].map((index) => ({
        find: nth('.pvs-tech-chip', index),
        label: (element: Element) => {
          const value = text(element.querySelector('.pvs-tech-chip__count'));
          const name = text(element.querySelector('span:not(.pvs-tech-chip__count)'));
          return name === '' || value === '' ? null : t('cap.pin2.row', { name, value });
        },
        at: 'top-left' as const,
        ...reading(t, 'cap.d.tech.next', 'tech'),
      })),
      textPin(t, headingOf(), 'cap.d.tech.title', 'oneagent'),
    ],
  },
  trendEntry('logs', 'logs.ingest', 'cap.opt.logs.ingest', 'log.ingest.trend', ({ t }) => logTrendSeries(t), 'ingested'),
  // 3.2.6: four more features on the slides — the estate, the value chain, security, the overlap.
  {
    sectionId: 'security',
    captureId: 'security.posture',
    label: 'cap.opt.security.posture',
    node: () => <SecurityPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-kpi, .pvs-figure') !== null,
    pins: ({ t }) =>
      [0, 1, 2].map((index): PinSpec => ({
        // 3.5.2: the headline cards are StratoKpi (the platform's SingleValue); the pin reads the app's own text.
        // 3.5.6: on the card's label (the card itself is a container: its pin fell on the corner).
        find: (root: HTMLElement) => {
          const card = root.querySelectorAll('.pvs-kpi')[index];
          return card?.querySelector('.pvs-skpi__label, .pvs-label') ?? null;
        },
        label: (element: Element) => {
          const card = element.closest('.pvs-kpi');
          const value = text(card?.querySelector('[data-testid="single-value-chart-value"]')) || figureText(card);
          return value === '' ? null : t('cap.pin.kpi', { label: text(element), value });
        },
        at: 'left' as const,
        ...reading(t, (['cap.d.sec.total', 'cap.d.sec.now', 'cap.d.sec.next'] as const)[index] ?? 'cap.d.sec.total', 'security'),
      })).concat([provenancePin(t, 0)]),
  },
  {
    sectionId: 'experience',
    captureId: 'experience.errors',
    label: 'cap.opt.dx.errors',
    node: () => <FrontendErrorsCapture />,
    width: 1000,
    ready: (root) => root.querySelector('.pvs-gauge') !== null && root.querySelector('.pvs-errmeter__row') !== null,
    pins: ({ t }) => {
      const appPin = (index: number, key: 'cap.pin.dx.worst' | 'cap.pin2.row', detail: StringKey): PinSpec => ({
        find: (root) => nth('.pvs-errmeter__row', index)(root)?.querySelector('.pvs-errmeter__name') ?? null,
        label: (element) => {
          const row = element.closest('.pvs-errmeter__row');
          const name = text(element);
          const value = text(row?.querySelector('.pvs-errmeter__value strong'));
          return name === '' || value === '' ? null : t(key, { name, value });
        },
        at: 'left',
        ...reading(t, detail, 'rum'),
      });
      return [
        gaugePin(t, 0, 'cap.d.dx.ring', 'rum'),
        appPin(0, 'cap.pin.dx.worst', 'cap.d.dx.worst'),
        appPin(1, 'cap.pin2.row', 'cap.d.dx.next'),
        {
          // 3.5.6: on the 1 % tick of the scale, read as how many applications sit under it.
          find: (root) => [...root.querySelectorAll('.pvs-errmeter__tick')].find((tick) => /^1([.,]0)?\s?%$/.test(text(tick))) ?? null,
          label: (element) => {
            const rows = [...(element.closest('[data-capture]') ?? element.ownerDocument.body).querySelectorAll('.pvs-errmeter__row')];
            if (rows.length === 0) return null;
            const within = rows.filter((row) => row.getAttribute('data-band') === 'good').length;
            return t('cap.pin.dx.within', { count: String(within), total: String(rows.length) });
          },
          at: 'top-left',
          ...reading(t, 'cap.d.dx.line', 'line'),
        },
        provenancePin(t, 0),
      ];
    },
  },
  {
    sectionId: 'competitor',
    captureId: 'competitor.consolidation',
    label: 'cap.opt.competitor.consolidation',
    node: () => <CompetitorPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-consol') !== null,
    pins: ({ t }) => [
      textPin(t, (root) => root.querySelector('.pvs-consol__side[data-side="today"] .pvs-consol__figure'), 'cap.d.comp.today', 'platform', 'top-left'),
      textPin(t, (root) => root.querySelector('.pvs-consol__side[data-side="dynatrace"] .pvs-consol__figure'), 'cap.d.comp.dt', 'oneagent', 'top-left'),
      textPin(t, (root) => root.querySelector('.pvs-consol__side[data-side="dynatrace"] .pvs-label'), 'cap.d.comp.platform', 'platform', 'left'),
    ],
  },
  // 3.4.10 (F-02): the Assessment — its maturity rings by default, the coverage radar as the option.
  {
    sectionId: 'assessment',
    captureId: 'assessment.maturity',
    label: 'cap.opt.assessment.maturity',
    node: () => <AssessmentMaturityCapture />,
    width: 1100,
    ready: (root) => root.querySelector('.pvs-mat-rings') !== null,
    pins: ({ t }) => [
      {
        // 3.5.6: on the step the rings state (was the sentence's corner).
        find: (root) => root.querySelector('.pvs-mat-rings__level'),
        label: (element) => {
          const value = text(element.closest('.pvs-mat')?.querySelector('.pvs-mat-rings__name'));
          return value === '' ? null : t('cap.pin.assessment.level', { value: `${text(element)} ${value}` });
        },
        at: 'left',
        ...reading(t, 'cap.d.asm.level', 'assessment'),
      },
      textPin(t, (root) => root.querySelector('.pvs-mat__inplace'), 'cap.d.asm.inplace', 'assessment'),
      {
        find: nth('.pvs-mat__pillar-name', 0),
        label: (element) => {
          const level = text(element.parentElement?.querySelector('.pvs-mat__pillar-level'));
          return level === '' ? null : t('cap.pin2.row', { name: text(element), value: level });
        },
        at: 'left',
        ...reading(t, 'cap.d.asm.pillar', 'assessment'),
      },
      // The first next step (a pillar's own line is not one).
      textPin(t, (root) => [...root.querySelectorAll('.pvs-mat li')].find((item) => item.querySelector('.pvs-mat__pillar-name') === null && text(item) !== '') ?? null, 'cap.d.asm.next', 'assessment'),
      {
        find: (root) => [...root.querySelectorAll('.pvs-mat-spectrum__here')].find((here) => text(here) !== '') ?? null,
        label: (element) => {
          const name = text(element.closest('.pvs-mat')?.querySelector('.pvs-mat-rings__name'));
          return name === '' ? null : t('cap.pin2.here', { here: text(element), name });
        },
        at: 'left',
        ...reading(t, 'cap.d.asm.here', 'assessment'),
      },
    ],
  },
  {
    sectionId: 'assessment',
    captureId: 'assessment.radar',
    label: 'cap.opt.assessment.radar',
    node: () => <AssessmentRadarCapture />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-rbars__track') !== null,
    pins: ({ t }) => {
      const pct = (element: Element) => Number.parseFloat(text(element.parentElement?.querySelector('.pvs-rbars__pct')).replace(',', '.'));
      const domain = (pick: 'best' | 'gap') => (root: HTMLElement) => {
        const names = [...root.querySelectorAll('.pvs-rbars__name')].filter((name) => Number.isFinite(pct(name)));
        return names.reduce<Element | null>((kept, name) => (kept === null || (pick === 'best' ? pct(name) > pct(kept) : pct(name) < pct(kept)) ? name : kept), null);
      };
      const domainLabel = (element: Element) => {
        const value = text(element.parentElement?.querySelector('.pvs-rbars__pct'));
        return value === '' ? null : t('cap.pin2.row', { name: text(element), value: `${value} ${text(element.parentElement?.querySelector('.pvs-rbars__band'))}`.trim() });
      };
      return [
        {
          find: (root) => root.querySelector('.pvs-rbars__centre-value'),
          label: (element) => t('cap.pin.kpi', { label: text(element.parentElement?.querySelector('.pvs-rbars__centre-label')), value: `${text(element)} ${text(element.parentElement?.querySelector('.pvs-rbars__centre-band'))}`.trim() }),
          at: 'left',
          ...reading(t, 'cap.d.asm.centre', 'assessment'),
        },
        { find: domain('best'), label: domainLabel, at: 'left', ...reading(t, 'cap.d.asm.best', 'oneagent') },
        { find: domain('gap'), label: domainLabel, at: 'left', ...reading(t, 'cap.d.asm.gap', 'assessment') },
      ];
    },
  },
  {
    sectionId: 'overview',
    captureId: 'overview.stack',
    label: 'cap.opt.overview.stack',
    node: () => <StackPanel />,
    width: 1180,
    ready: (root) => root.querySelector('.pvs-stackmap__node') !== null,
    pins: ({ t }) => {
      const byColumn = (column: string) => (root: HTMLElement) => root.querySelector(`.pvs-stackmap__node[data-column="${column}"]`);
      return [
        nodePin(t, nth('.pvs-stackmap__node', 0), (element) => t('cap.pin.stack.start', { name: stackNodeText(element) }), 'cap.d.stack.start', 'rum'),
        nodePin(t, byColumn('services'), (element) => stackNodeText(element) || null, 'cap.d.stack.services', 'smartscape'),
        nodePin(t, byColumn('infrastructure'), (element) => stackNodeText(element) || null, 'cap.d.stack.hosts', 'oneagent'),
        nodePin(
          t,
          // The last cloud provider (an estate without attribution is not where the map ends).
          (root) => nth('.pvs-stackmap__node[data-column="cloud"][data-brand="true"]', -1)(root) ?? nth('.pvs-stackmap__node', -1)(root),
          (element) => t('cap.pin.stack.end', { name: stackNodeText(element) }),
          'cap.d.stack.end',
          'smartscape',
        ),
      ];
    },
  },
  {
    sectionId: 'executive',
    captureId: 'executive.mttr',
    label: 'cap.opt.exec.mttr',
    node: () => <MttrPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-bars__row') !== null,
    pins: ({ t }) => [
      barPin(t, 0, 'cap.pin.exec.slowest', 'cap.d.mttr.top', 'automation'),
      barPin(t, 1, 'cap.pin2.row', 'cap.d.mttr.next', 'detection'),
      barPin(t, -1, 'cap.pin2.row', 'cap.d.mttr.last', 'detection'),
      textPin(t, headingOf(), 'cap.d.mttr.title', 'grail'),
    ],
  },
  {
    sectionId: 'executive',
    captureId: 'executive.rings',
    label: 'cap.opt.exec.rings',
    node: () => <RingsPanel />,
    width: 900,
    ready: (root) => root.querySelector('.pvs-gauge') !== null,
    pins: ({ t }) => [
      gaugePin(t, 0, 'cap.d.exec.ring', 'oneagent'),
      gaugePin(t, 1, 'cap.d.rings.closed', 'detection'),
      gaugePin(t, 2, 'cap.d.svc.next', 'tracing'),
      provenancePin(t, 0),
    ],
  },
  {
    sectionId: 'roi',
    captureId: 'roi.chain',
    label: 'cap.opt.roi.chain',
    node: () => <ChainPanel />,
    width: 1100,
    ready: (root) => root.querySelector('.pvs-chain__link') !== null,
    pins: ({ t }) =>
      [0, 1, 2, 3, 4].map((index) => ({
        // 3.5.6: on each step's name, read with its figure; 3.5.7: after the name (before it, the pin hid the step's icon).
        find: (root: HTMLElement) => root.querySelectorAll('.pvs-chain__link')[index]?.querySelector('.pvs-chain__step') ?? null,
        label: (element: Element) => {
          const value = figureText(element.closest('.pvs-chain__link'));
          return value === '' || value === '—' ? null : t('cap.pin.chain', { step: text(element), value });
        },
        at: 'right' as const,
        ...reading(t, (['cap.d.chain.0', 'cap.d.chain.1', 'cap.d.chain.2', 'cap.d.chain.3', 'cap.d.chain.4'] as const)[index] ?? 'cap.d.chain.0', (['oneagent', 'detection', 'rootCause', 'automation', 'platform'] as const)[index] ?? 'oneagent'),
      })),
  },
];

/** The registry's sections, in the deck's order, each with its entries (the default first). */
export function captureOptionsBySection(registry: readonly CaptureEntry[] = CAPTURE_REGISTRY): Map<string, CaptureEntry[]> {
  const bySection = new Map<string, CaptureEntry[]>();
  for (const entry of registry) bySection.set(entry.sectionId, [...(bySection.get(entry.sectionId) ?? []), entry]);
  return bySection;
}

/**
 * The capture ids a section photographs: the SE's stored choice, kept to the ids the registry still
 * has for that section and to `MAX_CAPTURES_PER_SECTION`, in the registry's order; the section's
 * default when nothing valid is left.
 */
export function resolveCaptureChoice(
  sectionId: string,
  choice: CaptureChoice,
  registry: readonly CaptureEntry[] = CAPTURE_REGISTRY,
): string[] {
  const options = registry.filter((entry) => entry.sectionId === sectionId);
  const wanted = new Set(choice[sectionId] ?? []);
  const picked = options.filter((entry) => wanted.has(entry.captureId)).slice(0, MAX_CAPTURES_PER_SECTION);
  if (picked.length > 0) return picked.map((entry) => entry.captureId);
  return options.length > 0 ? [options[0]!.captureId] : [];
}

/** Every panel the deck can photograph, in the app's language. */
export function buildCaptureTargets(t: T, fmt: ChartFormat, registry: readonly CaptureEntry[] = CAPTURE_REGISTRY): CaptureTarget[] {
  const context: CaptureContext = { t, fmt };
  return registry.map((entry) => ({
    sectionId: entry.sectionId,
    captureId: entry.captureId,
    label: entry.label,
    node: entry.node(context),
    ...(entry.width === undefined ? {} : { width: entry.width }),
    ready: entry.ready,
    pins: entry.pins(context),
  }));
}

/** The capture targets, in the app's language. */
export function useCaptureTargets(): CaptureTarget[] {
  const { t } = useTranslation();
  const fmt = useChartFormat();
  return useMemo(() => buildCaptureTargets(t, fmt), [t, fmt]);
}

// ------------------------------------------------------------------ the stage

export interface CaptureOutcome {
  /** The pictures, by capture id. */
  captures: Record<string, DeckCapture>;
  /** Capture ids whose panel had no data, did not settle in time, or could not be drawn. */
  skipped: string[];
  /** The part of `skipped` whose panel settled without data (3.3.2): "no data", not "try again". */
  noData: string[];
  /** True when the browser could not draw a single picture. */
  failed: boolean;
}

/** Draws a panel as a PNG data URL. Swappable in tests (jsdom has no canvas). */
export type Photographer = (node: HTMLElement, options: { backgroundColor: string | undefined; width: number; height: number }) => Promise<string>;

/** The SVG properties a stylesheet sets on the app's charts (fills, strokes, gradient stops, text). */
const SVG_STYLE_PROPERTIES = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stop-color',
  'stop-opacity',
  'opacity',
  'visibility',
  'display',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
] as const;

/**
 * Writes the computed SVG styles of every element inside the panel's `<svg>`s onto the elements
 * themselves. `html-to-image` copies an `<svg>` as it is in the DOM, and the picture is drawn without
 * the app's stylesheets: every fill, stroke and gradient stop set by a class would come out black.
 * The stage is thrown away after the photograph, so nothing needs restoring.
 */
export function inlineSvgStyles(root: HTMLElement): void {
  for (const element of root.querySelectorAll('svg *')) {
    if (!(element instanceof SVGElement)) continue;
    const computed = getComputedStyle(element);
    for (const name of SVG_STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(name);
      if (value !== '') element.style.setProperty(name, value);
    }
  }
}

export const htmlToImagePhotographer: Photographer = async (node, options) => {
  const { toPng } = await import('html-to-image');
  // The panel must be laid out in its final faces before its boxes are measured and copied.
  await document.fonts?.ready;
  inlineSvgStyles(node);
  return toPng(node, {
    pixelRatio: CAPTURE_PIXEL_RATIO,
    backgroundColor: options.backgroundColor,
    width: options.width,
    height: options.height,
    fontEmbedCSS: captureFontCss(),
    cacheBust: false,
    // The tooltip and the hover cursor are never part of the picture.
    filter: (element) => !(element instanceof HTMLElement && /pvs-area__(tip|cursor|dot)/.test(element.className)),
  });
};

export interface CaptureStageProps {
  targets: readonly CaptureTarget[];
  onProgress?: (done: number, total: number) => void;
  onDone: (outcome: CaptureOutcome) => void;
  photographer?: Photographer;
  /**
   * 3.4.10: how long a panel that settled without its chart may stay quiet before it counts as "no data". A panel
   * can draw a moment after its query answers (a second read served from the cache, a measure, a font), and on a
   * live tenant that moment is longer than the harness's: 700 ms of quiet was too short a verdict.
   */
  noDataQuietMs?: number;
  settleMs?: number;
  timeoutMs?: number;
}

/**
 * Mounts the panels off screen, waits for each to settle, photographs it and measures its pins.
 * Mount it with a fresh `key` for every run; it reports once, through `onDone`.
 */
export const CaptureStage = ({
  targets,
  onProgress,
  onDone,
  photographer = htmlToImagePhotographer,
  settleMs = SETTLE_MS,
  noDataQuietMs = settleMs * 6,
  timeoutMs = CAPTURE_TIMEOUT_MS,
}: CaptureStageProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<string, HTMLDivElement>());
  const callbacks = useRef({ onProgress, onDone, photographer });
  callbacks.current = { onProgress, onDone, photographer };

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return undefined;
    // Off screen and out of reach: no focus, no pointer, nothing announced.
    stage.setAttribute('inert', '');
    const ids = targets.map((target) => target.captureId);
    const lastChange = new Map<string, number>(ids.map((id) => [id, performance.now()]));
    const observers = ids.map((id) => {
      const observer = new MutationObserver(() => lastChange.set(id, performance.now()));
      const slot = slots.current.get(id);
      if (slot !== undefined) observer.observe(slot, { subtree: true, childList: true, attributes: true, characterData: true });
      return observer;
    });
    const pending = new Set(ids);
    const captures: Record<string, DeckCapture> = {};
    const skipped: string[] = [];
    const noData: string[] = [];
    let attempted = 0;
    let drawn = 0;
    let busy = false;
    let finished = false;
    // Elapsed time on the monotonic clock: a page whose wall clock is moved (or frozen) still settles.
    const started = performance.now();
    const background = rgbToHex(getComputedStyle(stage).backgroundColor);

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(timer);
      observers.forEach((observer) => observer.disconnect());
      callbacks.current.onDone({ captures, skipped, noData, failed: attempted > 0 && drawn === 0 });
    };

    const step = async () => {
      if (busy || finished) return;
      busy = true;
      try {
        const now = performance.now();
        for (const target of targets) {
          const id = target.captureId;
          if (!pending.has(id)) continue;
          const slot = slots.current.get(id);
          const loading = slot === undefined || appStillLoading(slot);
          const quiet = now - (lastChange.get(id) ?? now) >= settleMs;
          if (loading || !quiet) continue;
          const ready = target.ready(slot);
          // Not drawn yet: wait for a longer quiet before saying "no data" (the overall timeout still applies).
          if (!ready && now - (lastChange.get(id) ?? now) < noDataQuietMs) continue;
          pending.delete(id);
          if (!ready) {
            skipped.push(id);
            // A failed read is skipped, never marked "no data" (review 3.3.2 #5).
            if (slot.querySelector('[data-capture-state="failed"]') === null) noData.push(id);
          } else {
            attempted += 1;
            try {
              const width = slot.offsetWidth;
              const height = slot.offsetHeight;
              const pins = measurePins(slot, target.pins);
              const dataUrl = await callbacks.current.photographer(slot, { backgroundColor: background === null ? undefined : `#${background}`, width, height });
              captures[id] = { dataUrl, width, height, pins, ...(background === null ? {} : { frame: background }) };
              drawn += 1;
            } catch {
              skipped.push(id);
            }
          }
          callbacks.current.onProgress?.(ids.length - pending.size, ids.length);
          break; // one photograph per tick keeps the page responsive
        }
        if (pending.size > 0 && performance.now() - started > timeoutMs) {
          for (const id of pending) skipped.push(id);
          pending.clear();
        }
        if (pending.size === 0) finish();
      } finally {
        busy = false;
      }
    };

    const timer = window.setInterval(() => void step(), 200);
    return () => {
      finished = true;
      window.clearInterval(timer);
      observers.forEach((observer) => observer.disconnect());
    };
    // One run per mount: the page remounts the stage with a new key to capture again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={stageRef} className="pvs-capture-stage" aria-hidden="true">
      <style>{DTFLOW_FONT_CSS}</style>
      {/* 3.4.18: the platform's charts photographed still — no toolbar, no zoom, no pan (engine/strato mode). */}
      <StratoModeProvider mode="capture">
      {targets.map((target) => (
        <div
          key={target.captureId}
          className="pvs-capture-target"
          data-section={target.sectionId}
          data-capture={target.captureId}
          style={{ width: target.width ?? CAPTURE_WIDTH }}
          ref={(element) => {
            if (element === null) slots.current.delete(target.captureId);
            else slots.current.set(target.captureId, element);
          }}
        >
          {target.node}
        </div>
      ))}
      </StratoModeProvider>
    </div>
  );
};
