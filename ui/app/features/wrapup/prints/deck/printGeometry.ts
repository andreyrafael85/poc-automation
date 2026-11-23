import { DECK, type KpiStatus } from '../../deck';
import { CONTENT_BOTTOM, CONTENT_TOP, CONTENT_W, MARGIN, PIN_SIZE, TEMPLATE_CHROME, TYPE, containRect, type Rect } from '../../geometry';
import { fit } from '../../spec';
import { PRINT_IMAGE_W_EMU, PRINT_SPACE } from '../constants';
import type { SourceKind } from '../types';
import type { AnalysisVisual, FocusFraction } from './slides';

/**
 * Where everything sits on the slides of the real-prints deck (3.2.7), in EMU of the corporate
 * template's 16:9 canvas — the `geometry.ts` of these slides. The PPTX writer
 * (`pptxPrintSlides.ts`) and the preview (`PrintSlideViews.tsx`) both read these rectangles, type
 * sizes and colours, so the preview is the file here too. The margins, the content band and the
 * pin size are the Tech Wrapup's own (`geometry.ts`, unchanged); every slide uses layout 28.
 *
 * Pins and the lupa are fractions of the image, so a print downscaled by the bake ladder keeps
 * them where they were. The pin overlap guard runs once, in `buildPrintDeckSpec`, so both writers
 * draw the same pins.
 */

// ------------------------------------------------------------------ type sizes and colours

/** Type sizes of these slides, in points (a point is 1/960 of the slide width in the preview). */
export const PRINT_TYPE = {
  /** 11 pt, not 12: a 60-character headline takes two lines in its 360 000-EMU box, and two lines of 12 pt overflow onto "What it is". */
  headline: 11,
  label: 9,
  body: 9,
  pinsHeading: 10,
  legend: 9,
  legendNumber: 8,
  caption: 8,
  zoomLabel: 8,
  kpiLabel: 10,
  kpiFooter: 7,
  axis: 7,
  dqlLabel: 7,
  dql: 6.5,
  dqlMore: 7,
  matters: 9,
  reco: 9,
  storySubtitle: 11,
  storyStage: 10,
  storyTime: 12,
  storyText: 9.5,
  storyRef: 8,
  chain: 9,
  caveat: 7.5,
  scopeValue: 13,
  scopeLabel: 9,
  methodPrints: 9,
  methodQueries: 8.5,
  gaps: 8.5,
  note: 7.5,
  cardHeading: 10,
  cardWindow: 7.5,
} as const;

/** The monospace face of the DQL text (the PPTX names it; the preview falls back). */
export const MONO_FONT = 'Consolas';

/** The accent bar of a KPI tile, by where its number comes from. */
export const SOURCE_ACCENT: Record<SourceKind, string> = {
  dql: DECK.blue,
  davis: DECK.purple,
  rum: DECK.pink,
  screen: DECK.green,
  app: DECK.lightBlue,
};

/** A KPI value's colour by status (hex, no `#`): the Tech Wrapup's `statusColor`, without importing its writer. */
export function kpiStatusHex(status: KpiStatus | undefined): string {
  if (status === 'good') return DECK.pos;
  if (status === 'warn') return DECK.amber;
  if (status === 'bad') return DECK.red;
  return DECK.lime;
}

/** The ruler's zones, by verdict. */
export const VERDICT_HEX = { good: DECK.pos, warn: DECK.amber, bad: DECK.red } as const;

/**
 * A pin legend line, "Name: what it shows": the name (bold in both writers) is everything before
 * the first ':'. A line with no ':' (an SE's own text) has no name. Stray `**` markers are dropped.
 */
export function legendParts(line: string): { name: string | null; text: string } {
  const clean = line.replace(/\*\*/g, '');
  const colon = clean.indexOf(':');
  if (colon <= 0 || colon > 60) return { name: null, text: clean };
  return { name: clean.slice(0, colon + 1), text: clean.slice(colon + 1) };
}

// ------------------------------------------------------------------ print slide

/** The real screen on the right of the print slide: 1720:1080, flush with the right margin. */
export const PRINT_IMAGE_BOX: Rect = { x: 4312000, y: CONTENT_TOP, w: PRINT_IMAGE_W_EMU, h: 4659070 };
const LEFT = { x: MARGIN, w: 3552000 } as const;
const FRAME_GAP = 30000;
const LEGEND_TOP = 3620000;
const LEGEND_ROW = 453000;
const LEGEND_DISC = 220000;
/** Half a pin, the margin a pin's centre keeps inside the image. */
const PIN_CLAMP = PIN_SIZE / 2;
/**
 * The overlap distance of two pin centres, in pixels of the 1720 print space: the same 72 px the
 * evidence engine keeps its pins apart by (`analysis/pins.ts`), so pins it already separated pass
 * here untouched instead of being pushed a second 72 px away from what they point at. The guard
 * also nudges by this, so one nudge clears a pin dropped exactly on another.
 */
export const PIN_GAP_PX = 72;
/**
 * `PIN_GAP_PX` on the slide's image: 310 605 EMU, about 0.34 in (the spec rounds it to 310 896,
 * which is 72.07 px and would flag two pins set exactly 72 px apart as overlapping).
 */
export const MIN_PIN_DISTANCE = (PIN_GAP_PX / PRINT_SPACE.width) * PRINT_IMAGE_BOX.w;
const PIN_NUDGE_TRIES = 3;

export interface LegendRow {
  row: Rect;
  disc: Rect;
  text: Rect;
}

export interface PrintLayout {
  image: Rect;
  /** The 1.25 pt frame around the image. */
  frame: Rect;
  caption: Rect;
  headline: Rect;
  whatLabel: Rect;
  what: Rect;
  whyLabel: Rect;
  why: Rect;
  pinsHeading: Rect;
  /** One per pin, in legend order (≤ 6; ≤ 4 with the lupa). */
  legend: LegendRow[];
  /** The lupa: its label and the box the detail is fitted into (only with ≤ 4 pins). */
  zoom: { label: Rect; box: Rect } | null;
}

/** The legend on the left, the real screen on the right (reference slide 19). */
export function printLayout(shape: { pins: number; zoom: boolean; aspect?: number }): PrintLayout {
  const image = shape.aspect === undefined ? PRINT_IMAGE_BOX : { ...containRect(PRINT_IMAGE_BOX, shape.aspect), y: PRINT_IMAGE_BOX.y };
  const zoom = shape.zoom && shape.pins <= 4;
  const rows = Math.max(0, Math.min(shape.pins, zoom ? 4 : 6));
  const legend = Array.from({ length: rows }, (_, index) => {
    const row = { x: LEFT.x, y: LEGEND_TOP + index * LEGEND_ROW, w: LEFT.w, h: LEGEND_ROW };
    return {
      row,
      disc: { x: row.x, y: row.y + 40000, w: LEGEND_DISC, h: LEGEND_DISC },
      text: { x: row.x + LEGEND_DISC + 60000, y: row.y, w: row.w - LEGEND_DISC - 60000, h: row.h },
    };
  });
  return {
    image,
    frame: { x: image.x - FRAME_GAP, y: image.y - FRAME_GAP, w: image.w + 2 * FRAME_GAP, h: image.h + 2 * FRAME_GAP },
    caption: { x: PRINT_IMAGE_BOX.x, y: PRINT_IMAGE_BOX.y + PRINT_IMAGE_BOX.h + 50000, w: PRINT_IMAGE_BOX.w, h: 200000 },
    headline: { x: LEFT.x, y: CONTENT_TOP, w: LEFT.w, h: 360000 },
    whatLabel: { x: LEFT.x, y: 1820000, w: LEFT.w, h: 220000 },
    what: { x: LEFT.x, y: 2040000, w: LEFT.w, h: 380000 },
    whyLabel: { x: LEFT.x, y: 2460000, w: LEFT.w, h: 220000 },
    why: { x: LEFT.x, y: 2680000, w: LEFT.w, h: 560000 },
    pinsHeading: { x: LEFT.x, y: 3300000, w: LEFT.w, h: 280000 },
    legend,
    zoom: zoom ? { label: { x: LEFT.x, y: 5492000, w: LEFT.w, h: 180000 }, box: { x: LEFT.x, y: 5692000, w: LEFT.w, h: 646000 } } : null,
  };
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** A pin's centre on the image, kept half a pin inside its edges. */
export function pinCentre(image: Rect, pin: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp(image.x + pin.x * image.w, image.x + PIN_CLAMP, image.x + image.w - PIN_CLAMP),
    y: clamp(image.y + pin.y * image.h, image.y + PIN_CLAMP, image.y + image.h - PIN_CLAMP),
  };
}

/** The disc of a pin on the image. */
export function pinRect(image: Rect, pin: { x: number; y: number }): Rect {
  const centre = pinCentre(image, pin);
  return { x: centre.x - PIN_SIZE / 2, y: centre.y - PIN_SIZE / 2, w: PIN_SIZE, h: PIN_SIZE };
}

/**
 * The overlap guard: a pin whose centre is closer than 72 px of the print space (`PIN_GAP_PX`, at
 * the image's width) to one already placed is moved down 72 px (at most three times) and dropped
 * if it still overlaps. Returns the kept pins in order, each with its final position as fractions
 * (clamped inside the image), and the indices of the input that survived (the caller drops the
 * matching legend lines).
 */
export function placePins<P extends { x: number; y: number }>(pins: readonly P[], image: Rect = PRINT_IMAGE_BOX): { pins: P[]; kept: number[] } {
  const gap = (PIN_GAP_PX / PRINT_SPACE.width) * image.w;
  const placed: { x: number; y: number }[] = [];
  const out: P[] = [];
  const kept: number[] = [];
  pins.forEach((pin, index) => {
    let centre = pinCentre(image, pin);
    for (let attempt = 0; attempt <= PIN_NUDGE_TRIES; attempt += 1) {
      // Half an EMU of slack: pins exactly 72 px apart, or a nudge of exactly the gap, must not fail on floating-point noise.
      const free = placed.every((other) => Math.hypot(other.x - centre.x, other.y - centre.y) >= gap - 0.5);
      if (free) {
        placed.push(centre);
        kept.push(index);
        out.push({ ...pin, x: (centre.x - image.x) / image.w, y: (centre.y - image.y) / image.h });
        return;
      }
      centre = { x: centre.x, y: clamp(centre.y + gap, image.y + PIN_CLAMP, image.y + image.h - PIN_CLAMP) };
    }
  });
  return { pins: out, kept };
}

/** A focus clamped inside the image, with a minimum size so a crop is never empty. */
export function clampFocus(focus: FocusFraction): FocusFraction {
  const w = clamp(focus.w, 0.01, 1);
  const h = clamp(focus.h, 0.01, 1);
  return { x: clamp(focus.x, 0, 1 - w), y: clamp(focus.y, 0, 1 - h), w, h };
}

/** The whole image, as a focus (a story thumbnail of a print with no lupa). */
export const FULL_FOCUS: FocusFraction = { x: 0, y: 0, w: 1, h: 1 };

/**
 * The region a story thumbnail shows: the print's focus grown around its centre to the aspect of
 * the thumbnail's box, kept inside the image. A lupa region is a strip (481 × 41 px on the problem
 * page), which at card width would draw as a sliver; grown to the box it keeps the lupa's detail
 * and the context above and below it. Without a focus, the whole screen.
 */
export function thumbFocus(focus: FocusFraction | null, size: { width: number; height: number }, aspect: number): FocusFraction {
  if (focus === null || !(aspect > 0) || size.width <= 0 || size.height <= 0) return FULL_FOCUS;
  const clean = clampFocus(focus);
  let w = clean.w * size.width;
  let h = clean.h * size.height;
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  // Larger than the image: the largest region of that aspect the image holds.
  const shrink = Math.min(1, size.width / w, size.height / h);
  w *= shrink;
  h *= shrink;
  const cx = (clean.x + clean.w / 2) * size.width;
  const cy = (clean.y + clean.h / 2) * size.height;
  const x = clamp(cx - w / 2, 0, size.width - w);
  const y = clamp(cy - h / 2, 0, size.height - h);
  return { x: x / size.width, y: y / size.height, w: w / size.width, h: h / size.height };
}

/** Width over height of a region of an image of `width` × `height` pixels. */
export function focusAspect(focus: FocusFraction, size: { width: number; height: number }): number {
  const clean = clampFocus(focus);
  return (clean.w * size.width) / (clean.h * size.height);
}

/**
 * The `<a:srcRect>` of a focus: 1/1000 of a percent cut from each edge. The preview crops with the
 * same fractions (`cropStyle`), so the lupa reads the same in both.
 */
export function srcRectFor(focus: FocusFraction): { l: number; t: number; r: number; b: number } {
  const { x, y, w, h } = clampFocus(focus);
  return {
    l: Math.round(x * 100000),
    t: Math.round(y * 100000),
    r: Math.round((1 - x - w) * 100000),
    b: Math.round((1 - y - h) * 100000),
  };
}

/** The region of the slide a focus covers on the image (the dashed mark of the lupa). */
export function focusOnImage(image: Rect, focus: FocusFraction): Rect {
  const { x, y, w, h } = clampFocus(focus);
  return { x: image.x + x * image.w, y: image.y + y * image.h, w: w * image.w, h: h * image.h };
}

// ------------------------------------------------------------------ analysis slide

const KPI_STEP = 2858000;
const KPI_W = 2698000;
const KPI_H = 900000;
/** Height of the accent bar on top of a KPI tile. */
export const KPI_ACCENT_H = 40000;

export interface AnalysisLayout {
  kpis: Rect[];
  /** The chart card. */
  chart: Rect;
  chartTitle: Rect;
  plot: Rect;
  /** The DQL block under the chart; null when there is no query to print. */
  dql: Rect | null;
  findings: Rect;
  matters: Rect;
  reco: Rect;
}

/** KPI tiles on top; the chart, its DQL, then the findings, "why it matters" and the recommendation (reference slide 20). */
export function analysisLayout(shape: { kpis: number; hasDql: boolean }): AnalysisLayout {
  const count = Math.max(0, Math.min(shape.kpis, 4));
  return {
    kpis: Array.from({ length: count }, (_, index) => ({ x: MARGIN + index * KPI_STEP, y: CONTENT_TOP, w: KPI_W, h: KPI_H })),
    chart: { x: MARGIN, y: 2480000, w: 5695040, h: 3858000 },
    chartTitle: { x: 560000, y: 2540000, w: 5495040, h: 280000 },
    plot: { x: 560000, y: 2840000, w: 5495040, h: shape.hasDql ? 2418000 : 3418000 },
    dql: shape.hasDql ? { x: 560000, y: 5338000, w: 5495040, h: 920000 } : null,
    findings: { x: 6475040, y: 2480000, w: 5256960, h: 2000000 },
    matters: { x: 6475040, y: 4560000, w: 2548480, h: 1778000 },
    reco: { x: 9183520, y: 4560000, w: 2548480, h: 1778000 },
  };
}

/** The block a kit chart (bars, table) draws into: its heading at the chart title, its rows down to the plot's bottom. */
export function kitChartRect(layout: AnalysisLayout): Rect {
  return { x: layout.chartTitle.x, y: layout.chartTitle.y, w: layout.chartTitle.w, h: layout.plot.y + layout.plot.h - layout.chartTitle.y };
}

type Columns = Extract<AnalysisVisual, { kind: 'columns' }>;
type Capacity = Extract<AnalysisVisual, { kind: 'capacity' }>;
type Ruler = Extract<AnalysisVisual, { kind: 'ruler' }>;

export interface ColumnsGeometry {
  /** The bars, one per measured minute (a null minute draws nothing: a gap, never a zero). */
  bars: { rect: Rect; highlight: boolean }[];
  band: Rect | null;
  bandLabel: Rect | null;
  markers: { rule: Rect; label: Rect; text: string }[];
  xLabels: { rect: Rect; text: string }[];
  maxLabel: Rect;
  axis: Rect;
}

const AXIS_LABEL_W = 620000;
const AXIS_LABEL_H = 180000;
const TOP_LABEL_H = 170000;
/** The y-axis maximum's label, top left of the plot; the band's label starts after it. */
const MAX_LABEL_W = 1250000;

/** The side margin of a marker's label chip, and the gap a chip keeps to the next one. */
const MARKER_CHIP_PAD = 25000;

/** One column per minute: the problem band behind, markers as amber rules, time labels at the edges of the band and the plot. */
export function columnsLayout(visual: Columns, plot: Rect): ColumnsGeometry {
  const area = { x: plot.x, y: plot.y + TOP_LABEL_H, w: plot.w, h: plot.h - TOP_LABEL_H - AXIS_LABEL_H - 30000 };
  const n = Math.max(1, visual.points.length);
  const slot = area.w / n;
  const max = Math.max(...visual.points.map((point) => point.value ?? 0), 0);
  const scale = max > 0 ? area.h / max : 0;
  const bars = visual.points.flatMap((point, index) => {
    if (point.value === null || !Number.isFinite(point.value)) return [];
    const h = Math.max(point.value > 0 ? 6000 : 0, point.value * scale);
    return [{ rect: { x: area.x + index * slot + slot * 0.15, y: area.y + area.h - h, w: Math.max(4000, slot * 0.7), h }, highlight: point.highlight }];
  });
  const bandFrom = visual.band === null ? null : clamp(Math.min(visual.band.from, visual.band.to), 0, n - 1);
  const bandTo = visual.band === null ? null : clamp(Math.max(visual.band.from, visual.band.to), 0, n - 1);
  const band = bandFrom === null || bandTo === null ? null : { x: area.x + bandFrom * slot, y: area.y, w: (bandTo - bandFrom + 1) * slot, h: area.h };
  // Markers close in time keep their rules, but a label that would overlap the one before it is
  // left out (two labels on top of each other read as "05:1616"). A label is a chip as wide as its
  // text, drawn over every rule (both writers draw the rules first): a later rule no longer runs
  // through it ("05|03", 3.2.7 review UX-M3).
  let lastLabelEnd = Number.NEGATIVE_INFINITY;
  const markers = [...visual.markers]
    .sort((a, b) => a.at - b.at)
    .map((marker) => {
      const cx = area.x + (clamp(marker.at, 0, n - 1) + 0.5) * slot;
      const w = textWidth(marker.label, PRINT_TYPE.axis) + 2 * MARKER_CHIP_PAD;
      const labelX = clamp(cx + 20000, area.x, area.x + area.w - w);
      const label = { x: labelX, y: area.y + 10000, w, h: TOP_LABEL_H };
      const room = labelX >= lastLabelEnd;
      if (room) lastLabelEnd = labelX + w + MARKER_CHIP_PAD;
      return { rule: { x: cx - 6000, y: area.y, w: 12000, h: area.h }, label, text: room ? marker.label : '' };
    });
  const xIndices = [0, ...(bandFrom === null ? [] : [bandFrom]), ...(bandTo === null ? [] : [bandTo]), n - 1].filter((value, index, all) => all.indexOf(value) === index);
  const xLabels: { rect: Rect; text: string }[] = [];
  for (const index of xIndices.sort((a, b) => a - b)) {
    const text = visual.points[index]?.label ?? '';
    if (text === '') continue;
    const cx = area.x + (index + 0.5) * slot;
    const rect = { x: clamp(cx - AXIS_LABEL_W / 2, plot.x, plot.x + plot.w - AXIS_LABEL_W), y: area.y + area.h + 30000, w: AXIS_LABEL_W, h: AXIS_LABEL_H };
    const last = xLabels[xLabels.length - 1];
    if (last !== undefined && rect.x < last.rect.x + last.rect.w) continue;
    xLabels.push({ rect, text });
  }
  // The band's label starts where the band does, unless the y-axis maximum's label (as wide as its
  // text, not the whole 1.25 M reserved for it) is there: then right after that label.
  const maxLabelEnd = plot.x + Math.min(MAX_LABEL_W, textWidth(`${visual.maxLabel} ${visual.unit}`.trim(), PRINT_TYPE.axis) + 60000);
  const bandLabelW = band === null || visual.band === null ? 0 : Math.min(plot.w / 2, textWidth(visual.band.label, PRINT_TYPE.axis) + 40000);
  return {
    bars,
    band,
    bandLabel: band === null ? null : { x: clamp(band.x + 20000, maxLabelEnd, plot.x + plot.w - bandLabelW), y: plot.y, w: bandLabelW, h: TOP_LABEL_H },
    markers,
    xLabels,
    maxLabel: { x: plot.x, y: plot.y, w: MAX_LABEL_W - 40000, h: TOP_LABEL_H },
    axis: { x: area.x, y: area.y + area.h, w: area.w, h: 6000 },
  };
}

export interface CapacityGeometry {
  rows: { label: Rect; display: Rect; used: Rect; requested: Rect; allocatable: Rect | null }[];
}

/** Three horizontal bars per row: used, requested and allocatable, on one scale. */
export function capacityLayout(visual: Capacity, plot: Rect): CapacityGeometry {
  const rows = visual.rows.slice(0, 4);
  const max = Math.max(1e-9, ...rows.flatMap((row) => [row.used, row.requested, row.allocatable ?? 0]));
  const rowH = rows.length === 0 ? 0 : Math.min(900000, plot.h / rows.length);
  const labelW = plot.w * 0.3;
  const trackX = plot.x + labelW + 40000;
  const trackW = plot.w - labelW - 40000;
  const barH = Math.max(0, Math.min(140000, (rowH - 160000 - 2 * 20000 - 40000) / 3));
  const width = (value: number) => Math.max(value > 0 ? 6000 : 0, (value / max) * trackW);
  return {
    rows: rows.map((row, index) => {
      const y = plot.y + index * rowH;
      const top = y + 160000;
      return {
        label: { x: plot.x, y, w: labelW, h: rowH },
        display: { x: trackX, y, w: trackW, h: 160000 },
        used: { x: trackX, y: top, w: width(row.used), h: barH },
        requested: { x: trackX, y: top + barH + 20000, w: width(row.requested), h: barH },
        allocatable: row.allocatable === null ? null : { x: trackX, y: top + 2 * (barH + 20000), w: width(row.allocatable), h: barH },
      };
    }),
  };
}

export interface RulerGeometry {
  items: { label: Rect; zones: { rect: Rect; verdict: 'good' | 'warn' | 'bad' }[]; marker: Rect; display: Rect; align: 'l' | 'ctr' | 'r' }[];
}

const RULER_DISPLAY_W = 1500000;

/**
 * The good | attention | poor scale (40 / 30 / 30 %) and a marker at each value. A value off the
 * scale sits at its right end, its reading right-aligned there ("… · past the goal ▶", added to the
 * reading by `buildPrintDeckSpec`).
 */
export function rulerLayout(visual: Ruler, plot: Rect): RulerGeometry {
  const items = visual.items.slice(0, 4);
  const rowH = items.length === 0 ? 0 : Math.min(700000, plot.h / items.length);
  const labelW = plot.w * 0.28;
  const trackX = plot.x + labelW + 40000;
  const trackW = plot.w - labelW - 40000 - 200000;
  return {
    items: items.map((item, index) => {
      const y = plot.y + index * rowH;
      const trackY = y + rowH / 2 - 50000;
      const zones: { rect: Rect; verdict: 'good' | 'warn' | 'bad' }[] = [
        { rect: { x: trackX, y: trackY, w: trackW * 0.4, h: 100000 }, verdict: 'good' },
        { rect: { x: trackX + trackW * 0.4, y: trackY, w: trackW * 0.3, h: 100000 }, verdict: 'warn' },
        { rect: { x: trackX + trackW * 0.7, y: trackY, w: trackW * 0.3, h: 100000 }, verdict: 'bad' },
      ];
      const at = trackX + clamp(item.position, 0, 1) * trackW;
      const x = clamp(at - RULER_DISPLAY_W / 2, trackX, trackX + trackW - RULER_DISPLAY_W);
      return {
        label: { x: plot.x, y, w: labelW, h: rowH },
        zones,
        marker: { x: clamp(at - 20000, trackX, trackX + trackW - 40000), y: trackY - 60000, w: 40000, h: 220000 },
        display: { x, y: trackY - 230000, w: RULER_DISPLAY_W, h: 170000 },
        align: item.position >= 1 ? 'r' : item.position <= 0 ? 'l' : 'ctr',
      };
    }),
  };
}

// ------------------------------------------------------------------ story slide

export interface StoryCard {
  card: Rect;
  stage: Rect;
  time: Rect;
  /** The box a thumbnail is fitted into (at its focus aspect). */
  thumb: Rect;
  text: Rect;
  ref: Rect;
}

export interface StoryLayout {
  subtitle: Rect;
  cards: StoryCard[];
  /** One arrow in each gap between cards. */
  arrows: Rect[];
  chain: Rect;
  caveat: Rect;
}

const STORY_GAP = 220000;
const STORY_ARROW = 140000;
const CARD_PAD = 80000;

/** 3..5 cards in a row, an arrow between each two, the chain band and the caveat under them. */
export function storyLayout(steps: number): StoryLayout {
  const n = clamp(Math.round(steps), 3, 5);
  const w = (CONTENT_W - (n - 1) * STORY_GAP) / n;
  const y = 1800000;
  const h = 3700000;
  const cards = Array.from({ length: n }, (_, index) => {
    const card = { x: MARGIN + index * (w + STORY_GAP), y, w, h };
    const inner = { x: card.x + CARD_PAD, w: card.w - 2 * CARD_PAD };
    return {
      card,
      stage: { ...inner, y: y + CARD_PAD, h: 260000 },
      time: { ...inner, y: y + 340000, h: 280000 },
      thumb: { ...inner, y: y + 640000, h: 1250000 },
      text: { ...inner, y: y + 1950000, h: 1400000 },
      ref: { ...inner, y: y + h - CARD_PAD - 220000, h: 220000 },
    };
  });
  const arrows = cards.slice(0, -1).map(({ card }) => ({ x: card.x + card.w + (STORY_GAP - STORY_ARROW) / 2, y: y + h / 2 - 120000, w: STORY_ARROW, h: 240000 }));
  return {
    subtitle: { x: MARGIN, y: CONTENT_TOP, w: CONTENT_W, h: 300000 },
    cards,
    arrows,
    chain: { x: MARGIN, y: 5580000, w: CONTENT_W, h: 460000 },
    caveat: { x: MARGIN, y: 6080000, w: CONTENT_W, h: CONTENT_BOTTOM - 6080000 },
  };
}

// ------------------------------------------------------------------ methodology slides

export interface MethodologyLayout {
  scope: Rect[];
  prints: Rect;
  queries: Rect;
  gaps: Rect;
}

/** Four scope tiles, the screens and the queries side by side, the transparency notes at the bottom. */
export function methodologyLayout(): MethodologyLayout {
  return {
    scope: Array.from({ length: 4 }, (_, index) => ({ x: MARGIN + index * KPI_STEP, y: CONTENT_TOP, w: KPI_W, h: 700000 })),
    prints: { x: MARGIN, y: 2280000, w: 5476000, h: 2600000 },
    queries: { x: 6256000, y: 2280000, w: 5476000, h: 2600000 },
    gaps: { x: MARGIN, y: 5000000, w: CONTENT_W, h: CONTENT_BOTTOM - 5000000 },
  };
}

/**
 * Column weights of the methodology tables (screen, captured, via, link, identity / query, window,
 * records, read), sized to their longest usual texts: a title, '05/10 18:58 GMT-3', 'captura
 * guiada', 'verificado', 'confirmada pelo SE' / 'ev.k8s.incidentRestarts', 'janela da consulta: 30
 * min até 18:58 GMT-3', '1.234', 'não informado'.
 */
export const METHOD_WEIGHTS = {
  prints: [0.36, 0.19, 0.13, 0.15, 0.17],
  queries: [0.3, 0.44, 0.12, 0.14],
} as const;

/** The cells of a table drawn in `rect`: a heading band, a header row and up to `rows` rows. */
export function gridLayout(rect: Rect, weights: readonly number[], rows: number): { head: Rect; cells: Rect[][] } {
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const top = rect.y + 360000;
  const rowH = Math.min(300000, (rect.h - 360000) / (Math.max(0, rows) + 1));
  const xs = weights.map((_, index) => rect.x + (weights.slice(0, index).reduce((sum, weight) => sum + weight, 0) / total) * rect.w);
  const row = (r: number) => weights.map((weight, c) => ({ x: xs[c] as number, y: top + r * rowH, w: (weight / total) * rect.w, h: rowH }));
  return { head: { x: rect.x, y: rect.y, w: rect.w, h: 320000 }, cells: Array.from({ length: Math.max(0, rows) + 1 }, (_, r) => row(r)) };
}

/** The inner margin of a table cell, on every side, in both writers (a line of 9 pt plus two of these fits a row of ten). */
export const CELL_INSET = 30000;
/** The smallest type a table column steps down to before it cuts a cell. */
const MIN_CELL_PT = 7;
/** EMU in a point. */
export const EMU_PER_PT = 12700;

const NARROW_CHAR = /[\s.,:;'"|!()[\]{}/\\ilfjtrI·-]/;
const WIDE_CHAR = /[mwMW@%—–…]/;
const DIGIT = /[0-9]/;
const UPPER = /\p{Lu}/u;

/**
 * The advance of a character in em, by kind: the wider of DT Flow (the deck's face, light and bold,
 * measured on the embedded faces) and Arial (what PowerPoint draws when a machine lacks DT Flow).
 */
function charEm(ch: string): number {
  if (NARROW_CHAR.test(ch)) return 0.33;
  if (WIDE_CHAR.test(ch)) return 0.88;
  if (DIGIT.test(ch)) return 0.58;
  if (UPPER.test(ch)) return 0.7;
  return 0.56;
}

/** The width of a text in em, with 4 % to spare. */
function textEm(text: string): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  return em * 1.04;
}

/**
 * Whether a text stays on one line in a cell `width` EMU wide at `size` pt. PowerPoint does not
 * shrink text to its box when it opens a file (`normAutofit` applies once the text is edited; the
 * LibreOffice render shrinks it and hides the problem), so a wrapped cell would spill over the next
 * row there — and be clipped in the preview, which keeps cells on one line.
 */
export function cellFits(text: string, width: number, size: number): boolean {
  return textEm(text) * size * EMU_PER_PT <= width - 2 * CELL_INSET;
}

/** A text cut with an ellipsis to what one line of the cell holds. */
function cutToCell(text: string, width: number, size: number): string {
  if (cellFits(text, width, size)) return text;
  const room = (width - 2 * CELL_INSET) / (size * EMU_PER_PT) / 1.04 - charEm('…');
  let em = 0;
  let keep = 0;
  for (const ch of text) {
    em += charEm(ch);
    if (em > room) break;
    keep += ch.length;
  }
  // `fit` keeps max − 1 characters and adds the ellipsis, at a word boundary when one is near.
  return fit(text, keep + 1);
}

// ------------------------------------------------------------------ text measured against its box (3.2.7 review UX-M1)

/** A text box's inner margins in the shared writer (`box` in `pptxTemplate.ts`) and the preview's `text()` padding. */
const BOX_INSET_LR = 91440;
const BOX_INSET_TB = 45720;
/** The indent of a bullet paragraph (`marL` 18 pt in the file; the preview indents 14 pt). */
const BULLET_INDENT = 228600;
/** The height of a line, in units of its type size (the preview's `line-height: 1.2`, PowerPoint's single spacing). */
const LINE_FACTOR = 1.2;
/** A paragraph cut to fit its box keeps at least this many lines; with less room left it is left out. */
const MIN_CUT_LINES = 2;

/** The room of a text block, as both writers draw it: width and height in EMU (margins and bullet indent taken off), type size and paragraph spacing in points. */
export interface TextRoom {
  width: number;
  height: number;
  size: number;
  spaceAfter: number;
}

/**
 * The title placeholder of layout 28 (`TEMPLATE_CHROME.titleRect`, 11 508 081 × 827 088 EMU,
 * anchored at its bottom with 90 % line spacing): two lines of 24 pt fit it, so a title wraps to a
 * second line instead of losing its end (the entity a slide is about).
 */
export const TITLE_ROOM = { width: TEMPLATE_CHROME.titleRect.w - 2 * BOX_INSET_LR, size: TYPE.title, lines: 2 } as const;

/** The three text blocks of the analysis slide (`bulletList` for the findings; the matters and reco blocks of both writers). */
export function analysisTextRooms(layout: Pick<AnalysisLayout, 'findings' | 'matters' | 'reco'>): { findings: TextRoom; matters: TextRoom; reco: TextRoom } {
  return {
    findings: { width: layout.findings.w - 2 * BOX_INSET_LR - BULLET_INDENT, height: layout.findings.h - 360000 - 2 * BOX_INSET_TB, size: TYPE.body, spaceAfter: 4 },
    matters: { width: layout.matters.w, height: layout.matters.h - 380000, size: PRINT_TYPE.matters, spaceAfter: 0 },
    reco: { width: layout.reco.w - BULLET_INDENT, height: layout.reco.h - 380000, size: PRINT_TYPE.reco, spaceAfter: 3 },
  };
}

/** "What it is" and "why this screen" on the print slide (no margins, 9 pt): two and four lines. */
export function printTextRooms(layout: Pick<PrintLayout, 'what' | 'why'>): { what: TextRoom; why: TextRoom } {
  return {
    what: { width: layout.what.w, height: layout.what.h, size: PRINT_TYPE.body, spaceAfter: 0 },
    why: { width: layout.why.w, height: layout.why.h, size: PRINT_TYPE.body, spaceAfter: 0 },
  };
}

/** A scope tile of the methodology: its value (13 pt bold, two lines) and its label (one line), default margins. */
export function scopeTileWidth(): number {
  return KPI_W - 2 * BOX_INSET_LR;
}

/** The width of a text in EMU at `size` pt (the estimate every fit here uses). */
export function textWidth(text: string, size: number): number {
  return textEm(text) * size * EMU_PER_PT;
}

/** The one-line heading of a chart (`heading` of the shared writer: 12 pt bold, default margins). */
export function chartHeadingWidth(layout: Pick<AnalysisLayout, 'chartTitle'>): number {
  return layout.chartTitle.w - 2 * BOX_INSET_LR;
}

/** The label column of the shared bar chart (`barChart`: 40 % of the block, default margins, one line of 10 pt). */
export function barLabelWidth(layout: AnalysisLayout): number {
  return kitChartRect(layout).w * 0.4 - 2 * BOX_INSET_LR;
}

/** Lines of `text` in a box `width` EMU wide at `size` pt, wrapped at spaces (a word wider than the box is broken by character). */
export function wrapToLines(text: string, width: number, size: number): string[] {
  const room = width / (size * EMU_PER_PT);
  const lines: string[] = [];
  let line = '';
  for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
    if (word === '') continue;
    const candidate = line === '' ? word : `${line} ${word}`;
    if (textEm(candidate) <= room) {
      line = candidate;
      continue;
    }
    if (line !== '') lines.push(line);
    let rest = [...word];
    while (rest.length > 1 && textEm(rest.join('')) > room) {
      let keep = 1;
      while (keep < rest.length - 1 && textEm(rest.slice(0, keep + 1).join('')) <= room) keep += 1;
      lines.push(rest.slice(0, keep).join(''));
      rest = rest.slice(keep);
    }
    line = rest.join('');
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** Whether a text stays on one line `width` EMU wide at `size` pt. */
export function fitsLine(text: string, width: number, size: number): boolean {
  return textEm(text) * size * EMU_PER_PT <= width;
}

/**
 * A text cut to what `lines` lines of its box hold: whole when it fits, else the longest cut
 * (`fit`: at a word boundary when one is near, with an ellipsis) that does.
 */
export function fitToLines(text: string, width: number, size: number, lines: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (lines < 1) return '';
  const fits = (candidate: string) => wrapToLines(candidate, width, size).length <= lines;
  if (fits(clean)) return clean;
  let low = 1;
  let high = clean.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(fit(clean, mid))) low = mid;
    else high = mid - 1;
  }
  return fit(clean, low);
}

/**
 * A one-line text whose parts are joined by ' · ' (a chart heading: "what · window"): whole when it
 * fits, else without its last parts — a heading reads better without its window than cut inside
 * it — and cut only when its first part alone is too long.
 */
export function fitSegments(text: string, width: number, size: number): string {
  const parts = text.replace(/\s+/g, ' ').trim().split(' · ');
  for (let count = parts.length; count >= 1; count -= 1) {
    const candidate = parts.slice(0, count).join(' · ');
    if (fitsLine(candidate, width, size)) return candidate;
  }
  return fitToLines(parts[0] ?? '', width, size, 1);
}

/**
 * Paragraphs (the findings, the recommendations) in their box, in order: each one whole while the
 * box has room for it, the first that does not fit cut to the lines left (two at least, else left
 * out), and the ones after it left out. A character budget cut sentences short while the box still
 * had lines free; this measures them.
 */
export function fitParagraphs(texts: readonly string[], room: TextRoom): string[] {
  const lineH = room.size * LINE_FACTOR;
  const height = room.height / EMU_PER_PT;
  const out: string[] = [];
  let used = 0;
  for (const text of texts) {
    const need = wrapToLines(text, room.width, room.size).length * lineH;
    if (used + need <= height + 0.01) {
      out.push(text);
      used += need + room.spaceAfter;
      continue;
    }
    const left = Math.floor((height - used + 0.01) / lineH);
    if (left >= MIN_CUT_LINES) out.push(fitToLines(text, room.width, room.size, left));
    break;
  }
  return out;
}

/**
 * A table cell "{what} · {entity}" too long for its column even at the smallest type: its first part
 * is cut instead of its end, so the entity the row is about stays ("Serviço com mais falhas… ·
 * svc-catalog-01", not "Serviço com mais falhas em excesso ·…"; 3.2.7 review UX-M1). Anything else
 * is left to `fitGrid`.
 */
export function keepTailInCell(text: string, width: number): string {
  if (cellFits(text, width, MIN_CELL_PT)) return text;
  const at = text.indexOf(' · ');
  if (at <= 0) return text;
  const head = text.slice(0, at);
  const tail = text.slice(at);
  if (!cellFits(`${head.slice(0, 2)}…${tail}`, width, MIN_CELL_PT)) return text;
  for (let keep = head.length; keep >= 3; keep -= 1) {
    const candidate = `${fit(head, keep)}${tail}`;
    if (cellFits(candidate, width, MIN_CELL_PT)) return candidate;
  }
  return text;
}

/**
 * A table on one line per cell, the same in both writers: a column keeps the table's type size
 * when all its cells fit, steps down by half a point (to 7 pt) until they do, and a cell still too
 * long at 7 pt is cut with an ellipsis. Returns each column's size and the texts as drawn.
 */
export function fitGrid(
  rect: Rect,
  weights: readonly number[],
  size: number,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): { sizes: number[]; headers: string[]; rows: string[][] } {
  const { cells } = gridLayout(rect, weights, rows.length);
  const widths = (cells[0] ?? []).map((cell) => cell.w);
  const sizes = widths.map((width, c) => {
    const texts = [headers[c] ?? '', ...rows.map((row) => row[c] ?? '')];
    let at = size;
    while (at > MIN_CELL_PT && !texts.every((text) => cellFits(text, width, at))) at -= 0.5;
    return at;
  });
  const fitCell = (text: string, c: number) => cutToCell(text, widths[c] ?? 0, sizes[c] ?? size);
  return {
    sizes,
    headers: widths.map((_, c) => fitCell(headers[c] ?? '', c)),
    rows: rows.map((row) => widths.map((_, c) => fitCell(row[c] ?? '', c))),
  };
}

/** The DQL appendix: a 2 × 2 grid of cards. */
export function dqlPageLayout(): { cards: Rect[] } {
  const xs = [MARGIN, 6256000];
  const ys = [CONTENT_TOP, 3959000];
  return { cards: ys.flatMap((y) => xs.map((x) => ({ x, y, w: 5476000, h: 2379000 }))) };
}

/** Inside a DQL card: the heading, the window line and the text. */
export function dqlCardLayout(card: Rect): { heading: Rect; window: Rect; lines: Rect } {
  const inner = { x: card.x + 100000, w: card.w - 200000 };
  return {
    heading: { ...inner, y: card.y + 60000, h: 240000 },
    window: { ...inner, y: card.y + 300000, h: 200000 },
    lines: { ...inner, y: card.y + 510000, h: card.h - 560000 },
  };
}
