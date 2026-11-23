import { decimal } from '../../utils/activeLocale';
import { redactText, stripControlChars } from '../../utils/sanitize';
import type { KpiStatus, WrapupModel, WrapupSection, WrapupStrings } from './deck';
import { CAPTURE_KPI_TALL_H, STORY_HEAD, STORY_STRIP_MAX, TYPE, kpiValueSize, storyCardWidth, storyKpiWidth, storyLayout, storyLeftWidth, storyRightWidth, type StoryLayout } from './geometry';
import type { PrintDeckSlide } from './prints/deck/slides';

/**
 * The one specification of the SE deck (3.2.4, milestone M4).
 *
 * Until 3.2.3 the deck had three renderings that did not agree (finding E1 of the technical
 * review): an on-screen preview, a pptxgenjs deck and the corporate-template deck, each deciding
 * on its own what to cut — the template deck silently kept 5 KPIs, 5 bars, 6 × 4 table cells and 5
 * bullets while the preview showed everything. Now `buildDeckSpec` decides once: which slides,
 * in which order, which text, cut to which budget. The PPTX writer (`pptxTemplate.ts`) and the
 * on-screen preview (`DeckPreview.tsx`) only draw what it returns, with the same geometry
 * (`geometry.ts`), so the preview is the file.
 *
 * Every free text that comes from the tenant (finding lines, assist lines, table cells, the
 * labels of the capture pins) passes through `redactText` here, once, for both writers (S6).
 *
 * A capture of the app (`captures.tsx`) turns its section into a story slide (3.3.5): the picture
 * large enough to be read, with the section's numbers, drawn evidence, findings, where to act first
 * and why it matters around it, on one slide instead of two.
 */

export type DeckProfile = 'customer' | 'se';

/** A point of interest on a capture: where (fractions of the image) and what it shows. */
export interface CapturePin {
  n: number;
  x: number;
  y: number;
  /** What the pin shows: the label and the number the app wrote ("host-eu-01: 96 % CPU at its peak"). */
  label: string;
  /** 3.5.6 ("Como ler"): the technical reading and why it matters, a fixed sentence (no number of its own). */
  detail?: string;
  /** 3.5.6: the platform capability the pin demonstrates ("Davis · root cause"), a short chip. */
  capability?: string;
}

/** A picture of an app panel, taken in the browser (`captures.tsx`). */
export interface DeckCapture {
  dataUrl: string;
  /** Natural size of the captured panel, CSS px. */
  width: number;
  height: number;
  pins: CapturePin[];
  /** The panel's own background (hex, no `#`), so the frame around it continues the picture. */
  frame?: string;
}

export interface DeckKpi {
  label: string;
  value: string;
  status?: KpiStatus;
}

export interface CoverSlide {
  kind: 'cover';
  title: string;
  engagement: string;
  seLine: string | null;
  partnerLine: string | null;
  note: string;
  customerLogo: string | null;
  customerLogoAspect: number | null;
  partnerLogo: string | null;
  partnerLogoAspect: number | null;
}

export interface AgendaSlide {
  kind: 'agenda';
  title: string;
  items: string[];
}

export interface ExecutiveRing {
  label: string;
  /** 0–100, or null when not measured (a dashed ring, never a zero). */
  value: number | null;
  display: string;
  /** 3.3.17: the customer's question the ring answers ("Do we see the whole estate?"). */
  question?: string;
  /** 3.3.17: the measured answer, one or two sentences with the figures behind the ring. */
  answer?: string;
}

export interface ExecutiveStep {
  title: string;
  body: string;
}

/** The executive page: the three rings, five numbers and the next steps of the Executive summary. */
export interface ExecutiveSlide {
  kind: 'executive';
  title: string;
  subtitle: string;
  verdict: { text: string; tone: KpiStatus | undefined } | null;
  rings: ExecutiveRing[];
  numbers: DeckKpi[];
  stepsTitle: string;
  steps: ExecutiveStep[];
  note: string;
}

export interface DividerSlide {
  kind: 'divider';
  title: string;
  kicker: string;
}

export type DeckVisual =
  | { kind: 'bars'; title: string; items: { label: string; value: number; display: string }[] }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][] };

export interface SectionSlide {
  kind: 'section';
  id: string;
  title: string;
  subtitle: string | null;
  kpis: DeckKpi[];
  findingsLabel: string;
  findings: string[];
  assistLabel: string;
  assist: string[];
  /** A chart or a table drawn in the slide. */
  visual: DeckVisual | null;
}

/**
 * A captured subject on one slide (3.3.5, the "story slide"; 3.2.4–3.3.4 spread it over a capture
 * slide and a "— in detail" slide). The app's own panel, large and with its numbered pins; beside
 * it the section's numbers, what each pin shows, the findings and where to act first; under it the
 * drawn chart or table and why it matters. `layout` is decided here, from the measured text, so
 * the two writers place every block at the same spot.
 */
export interface CaptureSlide {
  kind: 'capture';
  /** The section the panel belongs to. */
  id: string;
  /** The section's title ("… (1/2)" when the SE chose two panels). */
  title: string;
  subtitle: string | null;
  /** Heading over the list of what each pin shows. */
  pinsLabel: string;
  capture: DeckCapture;
  kpis: DeckKpi[];
  assistLabel: string;
  assist: string[];
  findingsLabel: string;
  /** The findings in the right column. */
  findings: string[];
  /** Under the picture: the section's drawn chart or table, or (without one) its findings. */
  under: CaptureUnder | null;
  /** The key findings on the first card of the strip along the bottom (3.3.5). */
  stripFindings: string[];
  valueLabel: string;
  value: string[];
  layout: StoryLayout;
}

export type CaptureUnder = { kind: 'visual'; visual: DeckVisual } | { kind: 'findings'; lines: string[] };

export interface EndSlide {
  kind: 'end';
  partnerLogo: string | null;
  partnerLogoAspect: number | null;
}

/**
 * Every slide either deck can hold. 3.2.7: the real-prints deck (`prints/deck/buildPrintDeckSpec.ts`)
 * adds its own kinds (`PrintDeckSlide`); `buildDeckSpec` never emits them, and both writers send
 * them to their own renderers (`isPrintDeckSlide`), so the Tech Wrapup's slides keep their code paths.
 */
export type DeckSlide = CoverSlide | AgendaSlide | ExecutiveSlide | DividerSlide | SectionSlide | CaptureSlide | EndSlide | PrintDeckSlide;

export interface DeckSpec {
  profile: DeckProfile;
  slides: DeckSlide[];
  confidential: string;
  /** Written into the package as the deck's title. */
  title: string;
}

/**
 * How much text each block of a slide holds. Both writers draw from these, so a cut made here
 * is the cut the customer sees in the file and the SE sees on the screen. A text over budget
 * ends in an ellipsis; nothing is shrunk out of sight.
 */
export const BUDGET = {
  title: 70,
  subtitle: 130,
  kpis: 5,
  kpiLabel: 36,
  kpiValue: 28,
  findings: 5,
  finding: 180,
  assist: 3,
  assistLine: 200,
  bars: 5,
  barLabel: 32,
  tableRows: 6,
  tableCols: 4,
  tableCell: 48,
  agenda: 16,
  agendaItem: 64,
  /** 3.5.6 (owner's validation of 3.5.5: "4 a 5 pins por captura com informações ricas"). */
  pins: 5,
  pinLabel: 96,
  pinDetail: 150,
  pinCapability: 40,
  captureKpis: 3,
  storyKpis: 6,
  storyFindings: 3,
  storyVisualRows: 5,
  captureAssist: 2,
  captureAssistLine: 150,
  steps: 3,
  stepTitle: 90,
  stepBody: 220,
  numbers: 5,
  /** 3.3.17: the question over a ring on the executive page, and its measured answer. */
  execQuestion: 70,
  execAnswer: 180,
} as const;

/** Cuts a text to `max` characters, at a word when one is near, with an ellipsis. */
export function fit(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  let cut = clean.slice(0, max - 1);
  // Never half of an emoji (3.2.7 review PS-4): a lone surrogate is not valid UTF-8 in the slide XML.
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Text that came from the tenant: control characters dropped, secrets and hosts redacted, cut. */
function tenantText(text: string, max: number): string {
  return fit(redactText(stripControlChars(text)), max);
}

/** Input of the executive page, read by the hook from the Executive summary's own queries. */
export interface ExecutiveInput {
  title: string;
  subtitle: string;
  verdict: { text: string; tone: KpiStatus | undefined } | null;
  rings: ExecutiveRing[];
  numbers: DeckKpi[];
  stepsTitle: string;
  steps: ExecutiveStep[];
  note: string;
}

export interface DeckSpecOptions {
  profile: DeckProfile;
  /**
   * Captures of the app, by section id: each one adds a slide after its section's. Since 3.3.2 a
   * section may carry up to two (the SE's choice), in the order given; one capture is the 3.2.4 shape.
   */
  captures?: Readonly<Record<string, DeckCapture | readonly DeckCapture[]>>;
  executive?: ExecutiveInput | null;
  coverTitle?: string;
  seLabel?: string;
  findingsLabel?: string;
  captureLabel?: string;
  pinsLabel?: string;
  agendaTitle?: string;
  /** Added to the footer of every slide of the SE profile ("SE internal — not for the customer"). */
  watermark?: string;
  /**
   * What the platform did here (3.3.3), by section id: qualitative, never a number of its own. Since
   * 3.3.5 it is the band under the picture of the subject's story slide.
   */
  valueLabel?: string;
  valueLines?: Readonly<Record<string, readonly string[]>>;
}

function sectionVisual(section: WrapupSection): DeckVisual | null {
  if (section.table !== undefined && section.table.rows.length > 0) {
    const cols = Math.min(section.table.headers.length, BUDGET.tableCols);
    return {
      kind: 'table',
      title: fit(section.table.title, BUDGET.title),
      headers: section.table.headers.slice(0, cols).map((cell) => fit(cell, BUDGET.tableCell)),
      rows: section.table.rows.slice(0, BUDGET.tableRows).map((row) => row.slice(0, cols).map((cell) => tenantText(cell, BUDGET.tableCell))),
    };
  }
  const bars =
    section.bars !== undefined && section.bars.items.length > 0
      ? { title: section.bars.title, items: section.bars.items }
      : section.pie !== undefined
        ? {
            title: section.pie.title,
            items: section.pie.data.labels.map((label, index) => ({ label, value: section.pie?.data.values[index] ?? 0 })).filter((item) => item.value > 0),
          }
        : null;
  if (bars === null || bars.items.length === 0) return null;
  return {
    kind: 'bars',
    title: fit(bars.title, BUDGET.title),
    items: [...bars.items]
      .sort((a, b) => b.value - a.value)
      .slice(0, BUDGET.bars)
      .map((item) => ({
        label: tenantText(item.label, BUDGET.barLabel),
        value: item.value,
        display: decimal(item.value, Number.isInteger(item.value) ? 0 : 1),
      })),
  };
}

function sectionSlide(section: WrapupSection, model: WrapupModel, options: DeckSpecOptions): SectionSlide {
  return {
    kind: 'section',
    id: section.id,
    title: fit(section.title, BUDGET.title),
    subtitle: section.subtitle === undefined || section.subtitle.trim() === '' ? null : fit(section.subtitle, BUDGET.subtitle),
    kpis: (section.kpis ?? []).slice(0, BUDGET.kpis).map((kpi) => ({
      label: fit(`${kpi.emoji === undefined ? '' : `${kpi.emoji} `}${kpi.label}`, BUDGET.kpiLabel),
      value: tenantText(kpi.value, BUDGET.kpiValue),
      ...(kpi.status === undefined ? {} : { status: kpi.status }),
    })),
    findingsLabel: options.findingsLabel ?? 'Key findings',
    findings: section.narrative.slice(0, BUDGET.findings).map((line) => tenantText(line, BUDGET.finding)),
    assistLabel: model.strings.assistLabel,
    assist: (section.assist ?? []).slice(0, BUDGET.assist).map((line) => tenantText(line, BUDGET.assistLine)),
    visual: sectionVisual(section),
  };
}

/**
 * Advance widths of the deck's bold face, in ems: DT Flow as the preview embeds it (`fonts.ts`) and
 * as the template's theme names it, the wider of the two faces for each character
 * (`v327.test.tsx` checks them against the embedded font). Grouped by width.
 */
const DECK_BOLD_EM: readonly (readonly [string, number])[] = [
  ['·', 0.249], ["'", 0.254], [' ‘’', 0.269], [',.:;', 0.274], ['iíîï', 0.288], ['j', 0.299], ['!', 0.303], ['|', 0.31], ['l', 0.32], ['`', 0.325],
  [')', 0.379], ['(', 0.381], ['/\\', 0.404], ['IÍ', 0.409], ['t', 0.411], [']f', 0.412], ['[', 0.415], ['°', 0.416], ['{}', 0.431], ['"', 0.437],
  ['r', 0.443], ['“”', 0.452], ['J', 0.481], ['-', 0.487], ['cç', 0.498], ['s', 0.515], ['z', 0.521], ['Lv', 0.534], ['y', 0.545], ['eèéêë', 0.551],
  ['T', 0.562], ['oóôõö', 0.563], ['£', 0.564], ['k', 0.566], ['*?', 0.572], ['x', 0.573], ['aàáâãä', 0.574], ['<>', 0.576], ['+=F^~±×÷', 0.578],
  ['g', 0.581], ['bdp', 0.584], ['q', 0.585], ['0123456789', 0.59], ['nuñúü–', 0.596], ['µ', 0.599], ['_h', 0.6], ['$EÈÉÊ', 0.603], ['&', 0.614],
  ['Z', 0.616], ['CÇ', 0.617], ['Y', 0.62], ['B', 0.631], ['PS', 0.632], ['#', 0.636], ['€', 0.645], ['G', 0.648], ['R', 0.653], ['K', 0.657],
  ['D', 0.661], ['AVÀÁÂÃÄ', 0.665], ['OQÓÔÕÖ', 0.676], ['UÚÜ', 0.683], ['X', 0.692], ['H', 0.711], ['%', 0.725], ['N', 0.728], ['…', 0.816],
  ['w', 0.82], ['—', 0.842], ['m', 0.89], ['M', 0.895], ['W', 1.016], ['@', 1.065],
];
const BOLD_EM = new Map(DECK_BOLD_EM.flatMap(([chars, em]) => [...chars].map((char) => [char, em] as const)));
/** A character the table does not know: wider than any it does, so its value is never under-measured. */
const UNKNOWN_EM = 1.1;

/** The width of a text in the deck's bold face, in ems. */
export function deckBoldEm(text: string): number {
  let em = 0;
  for (const char of text) em += BOLD_EM.get(char) ?? UNKNOWN_EM;
  return em;
}

/** EMU in a point; the inner margin a text box keeps on each side (PowerPoint's default, the preview's padding). */
const EMU_PER_PT = 12700;
const TEXT_INSET_PT = 7.2;
/**
 * Room kept beside a measured value for the renderer's rounding and a substituted font. 1.02 until
 * 3.4.11; the owner's validation of 3.4.11 (2026-11-19) showed "P-26114811" and "7.1 h" touching or
 * crossing the edge of their tiles in the delivered deck — 2 % was less than the difference between
 * the renderers — so every value now keeps 12 %.
 */
const CAPTURE_KPI_SLACK = 1.12;
/** The smallest type a capture-side value steps down to; a value that would need less is not shown there. */
export const CAPTURE_KPI_MIN_PT = 14;

/** The width a value has inside a capture-side tile when the column holds `count` of them, in points. */
function captureKpiRoomPt(count: number): number {
  const width = storyKpiWidth(count);
  return width === 0 ? 0 : width / EMU_PER_PT - 2 * TEXT_INSET_PT;
}

/**
 * The type size of a value in a capture-side tile (3.2.7 final review D2): the size a section's
 * tile gives it (`kpiValueSize`), stepped down a whole point at a time until it fits the tile's
 * real width, measured in the deck's own face — "216,431" or "P-9100100" now read whole at a
 * smaller size instead of ending in an ellipsis. Null when it would need less than
 * `CAPTURE_KPI_MIN_PT`: such a value is not picked for the tile (`captureKpiPick`).
 */
export function captureKpiFit(value: string, count: number): number | null {
  const base = kpiValueSize(value, count);
  const em = deckBoldEm(value) * CAPTURE_KPI_SLACK;
  const size = em === 0 ? base : Math.min(base, Math.floor(captureKpiRoomPt(count) / em));
  return size >= CAPTURE_KPI_MIN_PT ? size : null;
}

/** The smallest type any tile's value steps down to (a long root cause on a section slide). */
export const KPI_MIN_PT = 10;

/**
 * The type size of a value in a tile of the given width (3.4.12): the size the caller chose, stepped down
 * a whole point at a time until the value, measured in the deck's own face with `CAPTURE_KPI_SLACK`,
 * fits inside the tile's insets. Both writers call it for every number tile — the section's row, the
 * capture slide's column and the executive page — so no value can run past its tile's edge.
 */
export function kpiFitSize(value: string, size: number, widthEmu: number): number {
  const em = deckBoldEm(value) * CAPTURE_KPI_SLACK;
  const room = widthEmu / EMU_PER_PT - 2 * TEXT_INSET_PT;
  if (em === 0 || room <= 0) return size;
  return Math.max(KPI_MIN_PT, Math.min(size, Math.floor(room / em)));
}

/** Both writers' size for a capture-side value; a value `captureKpiPick` keeps always has one. */
export function captureKpiValueSize(value: string, count: number): number {
  return captureKpiFit(value, count) ?? CAPTURE_KPI_MIN_PT;
}

/**
 * The room a bar chart's value needs beside its bar, in EMU (3.3.1, owner's 3.2.7 round §17-a).
 *
 * Both writers used to give it a fixed 600,000 EMU — about 33 pt of usable width once PowerPoint's
 * insets are taken off. "1.557.000" measures 4.68 em in the deck's bold face, which is 46.8 pt at
 * `TYPE.small`, so the last digit fell off the box: the slide read "1.557.00". The width is now
 * measured from the text itself, in the same face the slide is set in, so a value can no longer be
 * cut there — and both renderers take it from here, so the preview and the `.pptx` cannot drift.
 *
 * The caller reserves the **widest** value of the chart for every row, so the bars stay
 * proportional to one another instead of each starting at a different place.
 */
export function barValueWidthEmu(display: string): number {
  const widthPt = deckBoldEm(display) * TYPE.small * CAPTURE_KPI_SLACK + 2 * TEXT_INSET_PT;
  return Math.max(BAR_VALUE_MIN_EMU, Math.ceil(widthPt * EMU_PER_PT));
}

/** The gutter a bar chart keeps for its values, in EMU: the widest of them, never less than the old fixed box. */
export function barValueGutterEmu(items: readonly { display: string }[]): number {
  return Math.max(BAR_VALUE_MIN_EMU, ...items.map((item) => barValueWidthEmu(item.display)));
}

/** What the fixed box used to be: the floor, so a short value keeps the layout 3.2.7 had. */
const BAR_VALUE_MIN_EMU = 600000;

/** The gap between a bar's end and its value, in EMU. Shared, so the two writers cannot drift. */
export const BAR_VALUE_GAP = 30000;

/**
 * The values a capture-side tile takes first (3.2.7): up to this many characters — counts,
 * durations — before an incident id or a service name, which the pin legend beside the picture
 * already names. Since the final review (D2) a longer value is no longer cut there: it is set
 * smaller (`captureKpiFit`).
 */
export const CAPTURE_KPI_SHORT = 7;

/**
 * The section's KPIs for the capture slide, every one whole (3.2.7 final review D2): the short
 * values first, then the longer ones, each group in the section's order — the 3.2.7 choice — but
 * only values that fit their tile at a readable size (`captureKpiFit`); one that fits at none, or
 * that its budget would cut, is left out, and the row holds fewer, wider tiles before it holds a
 * value cut.
 */
export function captureKpiPick<K extends { value: string }>(kpis: readonly K[], max: number = BUDGET.captureKpis): K[] {
  const clean = (kpi: K) => redactText(stripControlChars(kpi.value)).replace(/\s+/g, ' ').trim();
  const whole = kpis.filter((kpi) => clean(kpi).length <= BUDGET.kpiValue);
  const short = (kpi: K) => clean(kpi).length <= CAPTURE_KPI_SHORT;
  for (let count = Math.min(max, whole.length); count > 0; count -= 1) {
    const fitting = whole.filter((kpi) => captureKpiFit(tenantText(kpi.value, BUDGET.kpiValue), count) !== null);
    const pick = [...fitting.filter(short), ...fitting.filter((kpi) => !short(kpi))].slice(0, count);
    if (pick.length === count) return pick;
  }
  return [];
}

/**
 * The deck's body face against the bold table: the light DT Flow the preview embeds averages 0.454 em a
 * character on the deck's own sentences, the bold table 0.491 (measured from `fonts.ts`, 3.3.5).
 */
const REGULAR_TO_BOLD = 0.93;

/** How tall a list of lines is in a text box `width` EMU wide at `size` points, EMU. Errs on the tall side. */
export function textHeightEmu(lines: readonly string[], size: number, width: number, options: { bullet?: boolean; gapPt?: number; prefixEm?: number } = {}): number {
  if (lines.length === 0) return 0;
  // The bold face measures every character at least as wide as the regular one, so a line never
  // wraps more than this counts; 5 % more for the words a wrap pushes to the next line.
  const room = width / EMU_PER_PT - 2 * TEXT_INSET_PT - (options.bullet === true ? 18 : 0);
  const rows = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(((deckBoldEm(line) * REGULAR_TO_BOLD + (options.prefixEm ?? 0)) * size * 1.05) / Math.max(1, room))), 0);
  const points = rows * size * 1.2 + (lines.length - 1) * (options.gapPt ?? 4) + 2 * 3.6;
  return Math.ceil(points * EMU_PER_PT);
}

/** The inner margin of a band (Assist, why it matters): its text sits this far in from each side. */
export const BAND_PAD_X = 140000;
/** Where a band's lines start under its top edge (its label above them). */
export const BAND_TEXT_TOP = 340000;

/** A titled list's height: its heading and the lines. */
function listHeight(lines: readonly string[], size: number, width: number): number {
  return lines.length === 0 ? 0 : STORY_HEAD + 60000 + textHeightEmu(lines, size, width, { bullet: true });
}

/** The drawn chart or table's height under the picture: heading and one row a line. */
function visualHeight(visual: DeckVisual): number {
  return STORY_HEAD + 60000 + (visual.kind === 'bars' ? visual.items.length : visual.rows.length + 1) * 250000;
}

/** A pin's line in the "How to read" legend, as measured: the label, its reading and its capability chip. */
export function pinLegendText(pin: CapturePin): string {
  return [pin.label, pin.detail, pin.capability === undefined ? undefined : `· ${pin.capability}`].filter((part) => part !== undefined && part !== '').join(' ');
}

/** The legend of the pins' height, without its heading (3.5.6: set small, each pin with its reading). */
function pinsHeight(pins: readonly CapturePin[], width: number): number {
  return pins.length === 0 ? 0 : 60000 + textHeightEmu(pins.map(pinLegendText), TYPE.small, width, { gapPt: 5, prefixEm: 1.4 });
}

/** The captures of a section, in order: none, one, or the SE's choice of several. */
function capturesOf(section: WrapupSection, options: DeckSpecOptions): readonly DeckCapture[] {
  const given = options.captures?.[section.id];
  if (given === undefined) return [];
  return isCaptureList(given) ? given : [given];
}

const isCaptureList = (value: DeckCapture | readonly DeckCapture[]): value is readonly DeckCapture[] => Array.isArray(value);

/** What a subject still has to show: each slide takes its share, so nothing is said twice. */
interface StoryPool {
  kpis: NonNullable<WrapupSection['kpis']>;
  findings: string[];
  visual: DeckVisual | null;
  assist: string[];
  value: string[];
}

/**
 * The story slides of a captured subject (3.3.5): one per picture, every block shown once. The
 * first slide takes the numbers that fit, the drawn evidence, the findings that fit, where to act
 * first and why it matters; a second picture (the SE's choice) takes what is left.
 */
function storySlides(section: WrapupSection, model: WrapupModel, options: DeckSpecOptions, captures: readonly DeckCapture[]): CaptureSlide[] {
  const visual = sectionVisual(section);
  const pool: StoryPool = {
    kpis: [...(section.kpis ?? [])],
    findings: section.narrative.slice(0, BUDGET.findings).map((line) => tenantText(line, BUDGET.finding)),
    visual:
      visual === null
        ? null
        : visual.kind === 'bars'
          ? { ...visual, items: visual.items.slice(0, BUDGET.storyVisualRows) }
          : { ...visual, rows: visual.rows.slice(0, BUDGET.storyVisualRows) },
    assist: (section.assist ?? []).slice(0, BUDGET.captureAssist).map((line) => tenantText(line, BUDGET.captureAssistLine)),
    value: (options.valueLines?.[section.id] ?? []).slice(0, BUDGET.captureAssist).map((line) => fit(line, BUDGET.captureAssistLine)),
  };
  return captures.map((capture, index) => storySlide(section, model, options, capture, captures.length > 1 ? ` (${index + 1}/${captures.length})` : '', pool));
}

/** A card of a story slide's strip, in the strip's order: the key findings, why it matters, the Assist. */
export interface StoryCard {
  kind: 'findings' | 'value' | 'assist';
  label: string;
  lines: readonly string[];
}

/** The cards a story slide's strip holds, left to right; both writers draw them from here. */
export function storyCards(slide: CaptureSlide): StoryCard[] {
  const cards: StoryCard[] = [
    { kind: 'findings', label: slide.findingsLabel, lines: slide.stripFindings },
    { kind: 'value', label: slide.valueLabel, lines: slide.value },
    { kind: 'assist', label: slide.assistLabel, lines: slide.assist },
  ];
  return cards.filter((card) => card.lines.length > 0);
}

/** One story slide; takes what it shows out of `pool`. */
function storySlide(section: WrapupSection, model: WrapupModel, options: DeckSpecOptions, capture: DeckCapture, suffix: string, pool: StoryPool): CaptureSlide {
  const right = storyRightWidth();
  const left = storyLeftWidth();
  const subtitle = section.subtitle === undefined || section.subtitle.trim() === '' ? null : fit(section.subtitle, BUDGET.subtitle);
  const allPins = capture.pins.slice(0, BUDGET.pins).map((pin) => ({
    ...pin,
    label: tenantText(pin.label, BUDGET.pinLabel),
    ...(pin.detail === undefined ? {} : { detail: tenantText(pin.detail, BUDGET.pinDetail) }),
    ...(pin.capability === undefined ? {} : { capability: fit(pin.capability, BUDGET.pinCapability) }),
  }));
  let pins = allPins;
  let kpis = captureKpiPick(pool.kpis, BUDGET.storyKpis);
  const findings = pool.findings.slice(0, BUDGET.storyFindings);
  const aspect = capture.height > 0 ? capture.width / capture.height : 16 / 9;
  // A label that takes two lines in its tile makes the row taller, so the value is never pushed out.
  const labelRoom = storyKpiWidth(kpis.length);
  const kpiH = kpis.some((kpi) => textHeightEmu([fit(kpi.label, BUDGET.kpiLabel)], TYPE.kpiLabel, labelRoom) > textHeightEmu(['x'], TYPE.kpiLabel, labelRoom)) ? CAPTURE_KPI_TALL_H : undefined;

  // The strip along the bottom: the key findings, why it matters and the Assist, each cut to what
  // its card holds — whole lines, never a line cut — so the cards stay under the strip's height.
  let stripFindings = findings.slice(0, 2);
  let value = [...pool.value];
  let assist = [...pool.assist];
  const count = () => [stripFindings, value, assist].filter((lines) => lines.length > 0).length;
  const card = (lines: readonly string[]) => (lines.length === 0 ? 0 : BAND_TEXT_TOP + textHeightEmu(lines, TYPE.small, storyCardWidth(count()) - 2 * BAND_PAD_X, { bullet: true, gapPt: 3 }) + 60000);
  const stripH = () => Math.max(card(stripFindings), card(value), card(assist));
  while (stripH() > STORY_STRIP_MAX) {
    // Trim the longest card by a line: findings first (the rest go elsewhere), then the others.
    const tallest = [stripFindings, value, assist].reduce((a, b) => (card(b) > card(a) ? b : a));
    if (tallest.length === 0) break;
    if (tallest === stripFindings) stripFindings = stripFindings.slice(0, -1);
    else if (tallest === value) value = value.slice(0, -1);
    else assist = assist.slice(0, -1);
  }
  // 3.5.6: the pins and their reading come before the numbers — the right column gives up number tiles (six, three,
  // two, none) before it gives up a pin, and a pin is dropped from the end only when no tile is left to give.
  const fits = (k: number, p: number) => storyLayout({ subtitle: subtitle !== null, aspect, kpis: k, kpiH, pins: pinsHeight(allPins.slice(0, p), right), cards: count(), strip: stripH(), under: 0, findings: [] }).pins !== null;
  if (allPins.length > 0) {
    const kpiSteps = [kpis.length, 3, 2, 0].filter((k, index, steps) => k <= kpis.length && steps.indexOf(k) === index);
    let chosen: { k: number; p: number } | null = null;
    for (let p = allPins.length; p >= 1 && chosen === null; p -= 1) {
      const k = kpiSteps.find((candidate) => fits(candidate, p));
      if (k !== undefined) chosen = { k, p };
    }
    if (chosen !== null) {
      kpis = kpis.slice(0, chosen.k);
      pins = allPins.slice(0, chosen.p);
    }
  }
  const base = { subtitle: subtitle !== null, aspect, kpis: kpis.length, kpiH, pins: pinsHeight(pins, right), cards: count(), strip: stripH() };

  // The findings the strip could not hold go to the right column, beside a narrow picture or under a
  // wide one; the drawn chart or table takes the room under the picture first.
  const rest = findings.filter((line) => !stripFindings.includes(line));
  const sideHeights = rest.map((_, n) => listHeight(rest.slice(0, n + 1), TYPE.small, right));
  let under: CaptureUnder | null = null;
  let layout: StoryLayout = storyLayout({ ...base, under: 0, findings: sideHeights });
  if (pool.visual !== null) {
    const tried = storyLayout({ ...base, under: visualHeight(pool.visual), findings: sideHeights });
    if (tried.under !== null) {
      under = { kind: 'visual', visual: pool.visual };
      layout = tried;
    }
  }
  const unplaced = rest.slice(layout.findingsKept);
  if (under === null && unplaced.length > 0) {
    for (let kept = unplaced.length; kept > 0 && under === null; kept -= 1) {
      const lines = unplaced.slice(0, kept);
      const besideTry = layout.besideWidth > 0 ? storyLayout({ ...base, under: 0, beside: listHeight(lines, TYPE.small, layout.besideWidth), findings: sideHeights }) : null;
      if (besideTry?.beside != null) {
        under = { kind: 'findings', lines };
        layout = besideTry;
        break;
      }
      const underTry = storyLayout({ ...base, under: listHeight(lines, TYPE.body, left), findings: sideHeights });
      if (underTry.under !== null) {
        under = { kind: 'findings', lines };
        layout = underTry;
      }
    }
  }
  const underLines = under?.kind === 'findings' ? under.lines : [];
  const side = rest.slice(0, layout.findingsKept).filter((line) => !underLines.includes(line));
  const shownFindings = new Set([...stripFindings, ...side, ...underLines]);
  const shownKpis = new Set(kpis);
  pool.kpis = pool.kpis.filter((kpi) => !shownKpis.has(kpi));
  pool.findings = pool.findings.filter((line) => !shownFindings.has(line));
  if (under?.kind === 'visual') pool.visual = null;
  pool.assist = pool.assist.filter((line) => !assist.includes(line));
  pool.value = pool.value.filter((line) => !value.includes(line));

  return {
    kind: 'capture',
    id: section.id,
    title: fit(`${section.title}${suffix}`, BUDGET.title),
    subtitle,
    pinsLabel: options.pinsLabel ?? 'What it shows',
    capture: { ...capture, pins: layout.pins === null ? [] : pins },
    kpis: kpis.map((kpi) => ({
      label: fit(kpi.label, BUDGET.kpiLabel),
      value: tenantText(kpi.value, BUDGET.kpiValue),
      ...(kpi.status === undefined ? {} : { status: kpi.status }),
    })),
    assistLabel: model.strings.assistLabel,
    assist,
    findingsLabel: options.findingsLabel ?? 'Key findings',
    findings: side,
    under,
    stripFindings,
    valueLabel: options.valueLabel ?? 'Why it matters',
    value,
    layout,
  };
}

/** The executive page, cut to its budgets: the deck's third slide, and the one-pager on its own. */
export function executiveSlide(executive: ExecutiveInput): ExecutiveSlide {
  return {
    kind: 'executive',
    title: fit(executive.title, BUDGET.title),
    subtitle: fit(executive.subtitle, BUDGET.subtitle),
    verdict: executive.verdict === null ? null : { text: fit(executive.verdict.text, BUDGET.assistLine), tone: executive.verdict.tone },
    rings: executive.rings.slice(0, 3).map((ring) => ({
      ...ring,
      label: fit(ring.label, 40),
      ...(ring.question === undefined ? {} : { question: fit(ring.question, BUDGET.execQuestion) }),
      ...(ring.answer === undefined ? {} : { answer: fit(ring.answer, BUDGET.execAnswer) }),
    })),
    numbers: executive.numbers.slice(0, BUDGET.numbers).map((kpi) => ({ ...kpi, label: fit(kpi.label, BUDGET.kpiLabel), value: fit(kpi.value, BUDGET.kpiValue) })),
    stepsTitle: executive.stepsTitle,
    steps: executive.steps
      .slice(0, BUDGET.steps)
      .map((step) => ({ title: tenantText(step.title, BUDGET.stepTitle), body: tenantText(step.body, BUDGET.stepBody) })),
    note: fit(executive.note, 200),
  };
}

/** The footer of every slide: "CONFIDENTIAL", plus the SE watermark under the SE profile. */
export function confidentialLine(profile: DeckProfile, confidential: string, watermark: string | undefined): string {
  return profile === 'se' && watermark !== undefined && watermark !== '' ? `${confidential} · ${watermark}` : confidential;
}

/**
 * What the cover, the agenda and the end of a deck need from the PoC: the Tech Wrapup's
 * `WrapupModel` satisfies it as it is, and the real-prints deck (3.2.7) builds one from the same
 * identity hooks without reading the Tech Wrapup's queries.
 */
export interface CoverInput {
  customerName: string;
  engagementName: string;
  seName: string | null;
  partnerName: string;
  generatedAtLabel: string;
  customerLogo: string | null;
  customerLogoAspect: number | null;
  partnerLogo: string | null;
  partnerLogoAspect: number | null;
  strings: Pick<WrapupStrings, 'title' | 'partnerLabel' | 'measured' | 'confidential' | 'agendaTitle'>;
}

export interface CoverOptions {
  coverTitle?: string;
  seLabel?: string;
}

/** Injects the customer name into the deck title: "A — B" → "A — {customer} - B". */
function coverTitleFor(model: CoverInput): string {
  const customer = model.customerName.trim();
  const title = model.strings.title;
  if (customer === '') return title;
  const dash = ' — ';
  if (title.includes(dash)) return title.replace(dash, ` — ${customer} - `);
  return `${customer} - ${title}`;
}

/** The deck's title before any cut: the caller's, else the model's with the customer injected. */
function coverTitleOf(model: CoverInput, options: CoverOptions): string {
  return options.coverTitle !== undefined && options.coverTitle !== '' ? options.coverTitle : coverTitleFor(model);
}

/** The cover: the deck title, the engagement, the SE, the partner and the provenance line. */
export function coverSlideFor(model: CoverInput, options: CoverOptions): CoverSlide {
  const s = model.strings;
  return {
    kind: 'cover',
    title: fit(coverTitleOf(model, options), BUDGET.title + 20),
    engagement: fit(model.engagementName, BUDGET.title),
    seLine: model.seName === null ? null : fit(`${options.seLabel ?? 'Solutions Engineer'}: ${model.seName}`, BUDGET.title),
    partnerLine: model.partnerName.trim() === '' ? null : fit(`${s.partnerLabel} ${model.partnerName}`, BUDGET.title),
    note: fit(`${model.generatedAtLabel} · ${s.measured}`, 160),
    customerLogo: model.customerLogo,
    customerLogoAspect: model.customerLogoAspect,
    partnerLogo: model.partnerLogo,
    partnerLogoAspect: model.partnerLogoAspect,
  };
}

/** The agenda: its items cut to the agenda's budget. */
export function agendaSlideFor(title: string, items: readonly string[]): AgendaSlide {
  return { kind: 'agenda', title, items: items.slice(0, BUDGET.agenda).map((item) => fit(item, BUDGET.agendaItem)) };
}

/** The branded end slide, with the partner logo when there is one. */
export function endSlideFor(model: Pick<CoverInput, 'partnerLogo' | 'partnerLogoAspect'>): EndSlide {
  return { kind: 'end', partnerLogo: model.partnerLogo, partnerLogoAspect: model.partnerLogoAspect };
}

/**
 * The deck, slide by slide: cover, agenda, the executive page, the technical part, the business
 * part and the end. The model already respects the profile (`commercial` cuts consumption and every
 * money figure when it builds); the spec records which profile it was built for.
 */
export function buildDeckSpec(model: WrapupModel, options: DeckSpecOptions): DeckSpec {
  const s = model.strings;
  const slides: DeckSlide[] = [];
  const cover = coverTitleOf(model, options);
  slides.push(coverSlideFor(model, options));
  const executive = options.executive ?? null;
  const agendaItems = [
    ...(executive === null ? [] : [executive.title]),
    ...[...model.technical, ...model.business].map((section) => section.title),
  ];
  slides.push(agendaSlideFor(options.agendaTitle ?? s.agendaTitle, agendaItems));
  if (executive !== null) slides.push(executiveSlide(executive));
  // 3.3.5: one story slide per captured subject (two when the SE chose two panels), nothing said twice.
  const pushSection = (section: WrapupSection) => {
    const captures = capturesOf(section, options);
    if (captures.length === 0) slides.push(sectionSlide(section, model, options));
    else slides.push(...storySlides(section, model, options, captures));
  };
  if (model.technical.length > 0) {
    slides.push({ kind: 'divider', title: s.technicalDivider, kicker: s.technicalKicker });
    model.technical.forEach(pushSection);
  }
  if (model.business.length > 0) {
    slides.push({ kind: 'divider', title: s.businessDivider, kicker: s.businessKicker });
    model.business.forEach(pushSection);
  }
  slides.push(endSlideFor(model));
  return { profile: options.profile, slides, confidential: confidentialLine(options.profile, s.confidential, options.watermark), title: cover };
}
