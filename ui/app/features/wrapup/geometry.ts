/**
 * Where everything sits on a slide of the SE deck (3.2.4), in EMU (English Metric Units) of the
 * corporate template's 16:9 canvas. The PPTX writer places shapes with these numbers; the preview
 * turns the same rectangles into percentages of a 16:9 box. One table of positions, so a change of
 * layout cannot reach one of them and miss the other.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SLIDE_W = 12192000;
export const SLIDE_H = 6858000;
export const MARGIN = 460000;
export const CONTENT_W = SLIDE_W - 2 * MARGIN;
/** Top of the content area: under the brand separator line of the "Dark: standard slide" layout. */
export const CONTENT_TOP = 1420000;
/** Bottom of the content area: above the footer of the layout. */
export const CONTENT_BOTTOM = SLIDE_H - 520000;
/** Where the title placeholder of the standard layout sits (for the preview; the PPTX inherits it). */
export const TITLE: Rect = { x: MARGIN, y: 560000, w: CONTENT_W - 2000000, h: 620000 };

const KPI_H = 900000;
const KPI_GAP = 160000;
const ASSIST_H = 1080000;
const ASSIST_BOTTOM = 6310000;
const COLUMN_GAP = 320000;
/**
 * Share of the content width the capture of the app takes on its slide. 3.2.6: 0.64 (was 0.7), so
 * the column beside it holds the section's numbers, the pins and what to do next.
 */
export const CAPTURE_SHARE = 0.64;

export interface SectionLayout {
  subtitle: Rect | null;
  kpis: Rect[];
  assist: Rect | null;
  /** The chart or the table. */
  primary: Rect | null;
  /** The findings column. */
  side: Rect | null;
}

export interface SectionShape {
  subtitle: boolean;
  kpis: number;
  assist: boolean;
  /** Something drawn in the primary block: a chart or a table. */
  primary: 'none' | 'chart' | 'table';
  findings: boolean;
}

/** The blocks of a content slide, from what it holds. */
export function sectionLayout(shape: SectionShape): SectionLayout {
  const subtitle = shape.subtitle ? { x: MARGIN, y: CONTENT_TOP, w: CONTENT_W, h: 300000 } : null;
  const kpiTop = CONTENT_TOP + 340000;
  const count = Math.max(0, Math.min(shape.kpis, 5));
  // One or two figures do not stretch across the slide: a card is at most a third of it.
  const kpiW = count === 0 ? 0 : Math.min((CONTENT_W - KPI_GAP * (count - 1)) / count, CONTENT_W * 0.32);
  const kpis = Array.from({ length: count }, (_, index) => ({ x: MARGIN + index * (kpiW + KPI_GAP), y: kpiTop, w: kpiW, h: KPI_H }));
  const assist = shape.assist ? { x: MARGIN, y: ASSIST_BOTTOM - ASSIST_H, w: CONTENT_W, h: ASSIST_H } : null;

  const midTop = count > 0 ? kpiTop + KPI_H + 200000 : kpiTop + 40000;
  const midBottom = assist === null ? CONTENT_BOTTOM : assist.y - 140000;
  const midH = Math.max(600000, midBottom - midTop);
  if (shape.primary === 'none') {
    return { subtitle, kpis, assist, primary: null, side: shape.findings ? { x: MARGIN, y: midTop, w: CONTENT_W, h: midH } : null };
  }
  if (!shape.findings) {
    return { subtitle, kpis, assist, primary: { x: MARGIN, y: midTop, w: CONTENT_W, h: midH }, side: null };
  }
  const share = shape.primary === 'table' ? 0.5 : 0.55;
  const primaryW = (CONTENT_W - COLUMN_GAP) * share;
  return {
    subtitle,
    kpis,
    assist,
    primary: { x: MARGIN, y: midTop, w: primaryW, h: midH },
    side: { x: MARGIN + primaryW + COLUMN_GAP, y: midTop, w: CONTENT_W - COLUMN_GAP - primaryW, h: midH },
  };
}

/** The largest rectangle of `aspect` (w/h) that fits in `box`, centred. */
export function containRect(box: Rect, aspect: number): Rect {
  if (!(aspect > 0)) return box;
  const byWidth = { w: box.w, h: box.w / aspect };
  const size = byWidth.h <= box.h ? byWidth : { w: box.h * aspect, h: box.h };
  return { x: box.x + (box.w - size.w) / 2, y: box.y + (box.h - size.h) / 2, w: size.w, h: size.h };
}

/** Inset of the frame a capture sits in, EMU. */
export const CAPTURE_INSET = 70000;
/** Diameter of a numbered pin on a capture, EMU. */
export const PIN_SIZE = 260000;
/** A pin on a story slide's capture, EMU (3.3.5: smaller, so it hides less of the panel). */
export const CAPTURE_PIN_SIZE = 220000;
/** 3.5.6: the smallest a capture's pin is drawn, EMU (its number stays readable). */
export const CAPTURE_PIN_MIN = 140000;
/** 3.5.6: the pin's diameter the capture stage leaves room for, in the panel's CSS px (`PIN_RADIUS` × 2). */
export const CAPTURE_PIN_PX = 30;

/**
 * 3.5.6: a capture's pin drawn at the size the stage measured it at (`CAPTURE_PIN_PX` of the panel, scaled as the
 * picture is), kept between `CAPTURE_PIN_MIN` and `CAPTURE_PIN_SIZE` — so a pin beside a word does not cover it when
 * a tall panel is drawn small.
 */
export function capturePinSize(imageWidthEmu: number, panelWidthPx: number): number {
  if (!(panelWidthPx > 0) || !(imageWidthEmu > 0)) return CAPTURE_PIN_SIZE;
  return Math.round(Math.min(CAPTURE_PIN_SIZE, Math.max(CAPTURE_PIN_MIN, (CAPTURE_PIN_PX * imageWidthEmu) / panelWidthPx)));
}

export interface ExecutiveLayout {
  subtitle: Rect;
  verdict: Rect;
  rings: Rect[];
  /** 3.3.17: the question over each ring and its measured answer under it ("The PoC on one page"). */
  questions: Rect[];
  answers: Rect[];
  numbers: Rect[];
  steps: Rect;
  note: Rect;
}

/** Height of a question over a ring, EMU (two lines of the block heading). */
const EXEC_QUESTION_H = 480000;
/** Height of a ring with its label, EMU, in the question-and-answer page. */
const EXEC_QA_RING_H = 1500000;
/** Height of the measured answer under a ring, EMU. */
const EXEC_ANSWER_H = 1200000;

/**
 * The executive page. With answers (3.3.17, "The PoC on one page"): three columns, each a question
 * the customer asks, its ring and the measured answer, beside the next steps — no row of numbers,
 * the answers carry them. Without answers: verdict, three rings, the numbers under them and the next
 * steps on the right (the 3.2.4 page).
 */
export function executiveLayout(numbers: number, withAnswers = false): ExecutiveLayout {
  const leftW = CONTENT_W * 0.6;
  const gap = 320000;
  const ringTop = CONTENT_TOP + 760000;
  const colGap = 200000;
  const ringW = (leftW - 2 * colGap) / 3;
  const head = {
    subtitle: { x: MARGIN, y: CONTENT_TOP, w: CONTENT_W, h: 300000 },
    verdict: { x: MARGIN, y: CONTENT_TOP + 360000, w: CONTENT_W, h: 330000 },
    note: { x: MARGIN, y: CONTENT_BOTTOM - 260000, w: CONTENT_W, h: 260000 },
  };
  if (withAnswers) {
    const cols = [0, 1, 2].map((index) => MARGIN + index * (ringW + colGap));
    const ringY = ringTop + EXEC_QUESTION_H + 20000;
    const answerY = ringY + EXEC_QA_RING_H + 60000;
    const total = answerY + EXEC_ANSWER_H - ringTop;
    return {
      ...head,
      questions: cols.map((x) => ({ x, y: ringTop, w: ringW, h: EXEC_QUESTION_H })),
      rings: cols.map((x) => ({ x, y: ringY, w: ringW, h: EXEC_QA_RING_H })),
      answers: cols.map((x) => ({ x, y: answerY, w: ringW, h: EXEC_ANSWER_H })),
      numbers: [],
      steps: { x: MARGIN + leftW + gap, y: ringTop, w: CONTENT_W - leftW - gap, h: total },
    };
  }
  const ringH = 1700000;
  const rings = [0, 1, 2].map((index) => ({ x: MARGIN + index * (ringW + colGap), y: ringTop, w: ringW, h: ringH }));
  const count = Math.max(1, Math.min(numbers, 5));
  const numTop = ringTop + ringH + 200000;
  const numGap = 120000;
  const numW = (leftW - numGap * (count - 1)) / count;
  return {
    ...head,
    questions: [],
    answers: [],
    rings,
    numbers: Array.from({ length: count }, (_, index) => ({ x: MARGIN + index * (numW + numGap), y: numTop, w: numW, h: 860000 })),
    steps: { x: MARGIN + leftW + gap, y: ringTop, w: CONTENT_W - leftW - gap, h: ringH + 200000 + 860000 },
  };
}

/** A rectangle as percentages of the slide, for the preview. */
export function percent(rect: Rect): { left: string; top: string; width: string; height: string } {
  const p = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;
  return { left: p(rect.x, SLIDE_W), top: p(rect.y, SLIDE_H), width: p(rect.w, SLIDE_W), height: p(rect.h, SLIDE_H) };
}

/** Type sizes of the deck, in points. The preview turns a point into 1/960 of the slide width. */
export const TYPE = {
  coverTitle: 40,
  coverInfo: 22,
  coverSe: 14,
  coverNote: 9,
  title: 24,
  subtitle: 13,
  agenda: 18,
  dividerTitle: 30,
  dividerKicker: 16,
  kpiLabel: 10,
  blockHead: 12,
  body: 10.5,
  small: 10,
  pin: 9,
  pinLegend: 12,
  execRing: 24,
  execRingLabel: 11,
  execNumber: 20,
} as const;

/** The value size of a KPI card: long values (a fully qualified root cause) step down to fit their tile. */
export function kpiValueSize(value: string, count: number): number {
  const base = count >= 5 ? 22 : 26;
  const len = value.length;
  if (len <= 12) return base;
  if (len <= 20) return Math.min(base, 18);
  if (len <= 32) return 14;
  if (len <= 48) return 12;
  return 10;
}

export interface CaptureLayout {
  /** The block the picture is fitted into. */
  frame: Rect;
  /** The column beside it. */
  side: Rect;
  /** The section's numbers, a row at the top of the column (3.2.6). */
  kpis: Rect[];
  /** What to do next, at the bottom of the column (3.2.6). */
  assist: Rect | null;
}

const CAPTURE_KPI_H = 560000;
/** A number tile whose label takes two lines. */
export const CAPTURE_KPI_TALL_H = 720000;
const CAPTURE_KPI_GAP = 80000;
/** Share of the two columns the picture's column takes on a story slide (3.3.5). */
export const STORY_SHARE = 0.6;
/** The gap between two blocks stacked in a column of a story slide. */
export const STORY_GAP = 150000;
/** The height of a block's heading (a lime label) on a story slide. */
export const STORY_HEAD = 300000;

/** The two columns of a story slide, from where its content starts. */
function storyColumns(top: number): { left: Rect; right: Rect } {
  const bottom = CONTENT_BOTTOM - 60000;
  const leftW = (CONTENT_W - COLUMN_GAP) * STORY_SHARE;
  return {
    left: { x: MARGIN, y: top, w: leftW, h: bottom - top },
    right: { x: MARGIN + leftW + COLUMN_GAP, y: top, w: CONTENT_W - COLUMN_GAP - leftW, h: bottom - top },
  };
}

/** Where a story slide's content starts: under the subtitle when there is one. */
export function storyTop(subtitle: boolean): number {
  return CONTENT_TOP + (subtitle ? 360000 : 0);
}

/**
 * The numbers of a story slide, at the top of the right column: up to three a row, two rows at
 * most (four are a 2 × 2 grid, so no tile stands alone).
 */
export function storyKpiRects(count: number, column: Rect, height: number = CAPTURE_KPI_H): Rect[] {
  const n = Math.max(0, Math.min(count, 6));
  if (n === 0) return [];
  const perRow = n <= 3 ? n : n === 4 ? 2 : 3;
  const w = (column.w - CAPTURE_KPI_GAP * (perRow - 1)) / perRow;
  return Array.from({ length: n }, (_, index) => ({
    x: column.x + (index % perRow) * (w + CAPTURE_KPI_GAP),
    y: column.y + Math.floor(index / perRow) * (height + CAPTURE_KPI_GAP),
    w,
    h: height,
  }));
}

/** The width of one number tile when the right column holds `count` of them, EMU. */
export function storyKpiWidth(count: number): number {
  return storyKpiRects(count, storyColumns(CONTENT_TOP).right)[0]?.w ?? 0;
}

/**
 * The slide of a captured panel, kept for the tile widths the capture-side values are fitted to
 * (`captureKpiFit`): since 3.3.5 the slide itself is laid out by `storyLayout`.
 */
export function captureLayout(shape: { kpis: number; assist: boolean } = { kpis: 0, assist: false }): CaptureLayout {
  const { left, right } = storyColumns(CONTENT_TOP);
  const kpis = storyKpiRects(Math.min(shape.kpis, 3), right);
  return { frame: left, side: right, kpis, assist: shape.assist ? { x: right.x, y: right.y + right.h - 1300000, w: right.w, h: 1300000 } : null };
}

/** What a story slide holds, measured by the spec (`spec.ts`) in EMU of height. */
export interface StoryNeeds {
  subtitle: boolean;
  /** Width / height of the captured picture. */
  aspect: number;
  kpis: number;
  /** The tiles' height when a label takes two lines (`CAPTURE_KPI_TALL_H`); the short tile otherwise. */
  kpiH?: number;
  /** The pins' legend without its heading; 0 when the picture has no pins. */
  pins: number;
  /** How many cards the strip along the bottom holds (findings, why it matters, the Assist): 0–3. */
  cards: number;
  /** The strip's height (its tallest card); 0 for no strip. */
  strip: number;
  /** A block under the picture, in the room a wide panel leaves (the drawn chart or table, or findings); 0 for none. */
  under: number;
  /** A block beside a narrow picture, inside its column (findings); 0 for none. */
  beside?: number;
  /** More findings in the right column, heading included, one height per number of findings kept. */
  findings: readonly number[];
}

/** Where every block of a story slide sits (3.3.5): one slide per subject, no space left idle. */
export interface StoryLayout {
  subtitle: Rect | null;
  /** The block the picture is fitted into (top-aligned, `captureImageRect`). */
  frame: Rect;
  under: Rect | null;
  /** Beside a narrow picture, in its own column. */
  beside: Rect | null;
  /** The width a narrow picture leaves beside it (0 when too little for a block). */
  besideWidth: number;
  kpis: Rect[];
  pins: Rect | null;
  findings: Rect | null;
  /** How many of the right column's findings fit. */
  findingsKept: number;
  /** The strip's cards, left to right, in the order the spec gave them. */
  cards: Rect[];
}

/** The narrowest block that stands beside a picture, EMU (about 2 inches). */
const STORY_MIN_BESIDE = 1800000;
/** The gap between two cards of the strip. */
const STORY_CARD_GAP = 140000;
/** The tallest the strip gets: a third of the content's height. */
export const STORY_STRIP_MAX = 1550000;

/** The width of one card of the strip when it holds `count`, EMU (for the spec's text measures). */
export function storyCardWidth(count: number): number {
  const n = Math.max(1, Math.min(count, 3));
  return (CONTENT_W - STORY_CARD_GAP * (n - 1)) / n;
}

/**
 * The story slide (3.3.5, owner's 3.3.4 validation: "join into one slide what today takes two"; and
 * the owner's review of the first draft: no panel squeezed to one side of its column).
 *
 * Along the bottom, a strip of cards the same on every slide: the key findings, why it matters and
 * the Assist. Above it, left: the picture, as large as its column allows; under it (a wide panel
 * leaves room) the drawn chart or table, or beside it (a tall one leaves width) more findings.
 * Right: the numbers, what each pin shows and, when there is room, more findings. A block that does
 * not fit whole is not placed — the spec then leaves it out — and nothing is cut out of sight.
 */
export function storyLayout(needs: StoryNeeds): StoryLayout {
  const top = storyTop(needs.subtitle);
  const bottom = CONTENT_BOTTOM - 60000;
  const subtitle = needs.subtitle ? { x: MARGIN, y: CONTENT_TOP, w: CONTENT_W, h: 300000 } : null;

  const stripH = needs.cards > 0 ? Math.min(needs.strip, STORY_STRIP_MAX) : 0;
  const cardW = storyCardWidth(needs.cards);
  const cards = Array.from({ length: stripH > 0 ? Math.min(needs.cards, 3) : 0 }, (_, index) => ({ x: MARGIN + index * (cardW + STORY_CARD_GAP), y: bottom - stripH, w: cardW, h: stripH }));
  const areaBottom = stripH > 0 ? bottom - stripH - STORY_GAP : bottom;
  const { left, right } = storyColumns(top);
  const area = areaBottom - top;

  // Left: the picture at its column's width, as tall as the area lets it be.
  const aspect = needs.aspect > 0 ? needs.aspect : 16 / 9;
  const natural = (left.w - 2 * CAPTURE_INSET) / aspect + 2 * CAPTURE_INSET;
  const frameH = Math.min(natural, area);
  const frame = { x: left.x, y: top, w: left.w, h: frameH };
  const underRoom = area - frameH - STORY_GAP;
  const under = needs.under > 0 && underRoom >= needs.under ? { x: left.x, y: top + frameH + STORY_GAP, w: left.w, h: underRoom } : null;
  const imageW = Math.min(left.w - 2 * CAPTURE_INSET, (frameH - 2 * CAPTURE_INSET) * aspect) + 2 * CAPTURE_INSET;
  const free = left.w - imageW - COLUMN_GAP;
  const besideWidth = under === null && free >= STORY_MIN_BESIDE ? free : 0;
  const beside = besideWidth > 0 && (needs.beside ?? 0) > 0 && (needs.beside ?? 0) <= frameH ? { x: left.x + imageW + COLUMN_GAP, y: top, w: free, h: frameH } : null;

  // Right: the numbers, what each pin shows, then findings while they fit.
  const kpis = storyKpiRects(needs.kpis, { ...right, y: top }, needs.kpiH);
  const last = kpis[kpis.length - 1];
  let y = last === undefined ? top : last.y + last.h + STORY_GAP;
  let pins: Rect | null = null;
  if (needs.pins > 0 && y + STORY_HEAD + needs.pins <= areaBottom) {
    pins = { x: right.x, y, w: right.w, h: STORY_HEAD + needs.pins };
    y += pins.h + STORY_GAP;
  }
  let findingsKept = 0;
  needs.findings.forEach((height, index) => {
    if (height > 0 && y + height <= areaBottom) findingsKept = index + 1;
  });
  const findings = findingsKept === 0 ? null : { x: right.x, y, w: right.w, h: areaBottom - y };
  return { subtitle, frame, under, beside, besideWidth, kpis, pins, findings, findingsKept, cards };
}

/** The width of the right column of a story slide, EMU (for the spec's text measures). */
export function storyRightWidth(): number {
  return storyColumns(CONTENT_TOP).right.w;
}

/** The width of the left column of a story slide, EMU. */
export function storyLeftWidth(): number {
  return storyColumns(CONTENT_TOP).left.w;
}

/**
 * Where a capture's picture sits: as large as its frame allows at its own proportions, against the
 * frame's left edge and its top (inside the inset of the panel drawn around it).
 */
export function captureImageRect(frame: Rect, width: number, height: number): Rect {
  const inner = { x: frame.x + CAPTURE_INSET, y: frame.y + CAPTURE_INSET, w: frame.w - 2 * CAPTURE_INSET, h: frame.h - 2 * CAPTURE_INSET };
  return { ...containRect(inner, height > 0 ? width / height : 1), x: inner.x, y: inner.y };
}

/**
 * The chrome of the corporate template's "Dark: standard slide" layout, measured from the template
 * (layout 28): the preview draws it, the PPTX inherits it from the layout.
 */
export const TEMPLATE_CHROME = {
  background: '030C16',
  titleRect: { x: 442913, y: 225425, w: 11508081, h: 827088 },
  underline: { x: 534733, y: 1177242, w: 1090868, h: 45719 },
  footer: { x: 442913, y: 6471920, w: 8254628, h: 249555 },
  number: { x: 11417212, y: 6487290, w: 410527, h: 246221 },
  numberBar: { x: 11270487, y: 6600542, w: 219456, h: 27432 },
  signet: { x: 11017845, y: 6499325, w: 219356, h: 222150 },
  coverTitle: { x: 438520, y: 2703532, w: 10406958, h: 923330 },
  coverLogo: { x: 9521640, y: 373942, w: 2268000, h: 396000 },
  endBox: { x: 3124674, y: 2245341, w: 5647894, h: 2371125 },
  endLogo: { x: 4650731, y: 3063071, w: 2595781, h: 458587 },
  endText: { x: 4062304, y: 3658855, w: 3772635, h: 307777 },
} as const;
