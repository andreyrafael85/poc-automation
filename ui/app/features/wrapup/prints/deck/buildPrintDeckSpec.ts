import type { Translation } from '../../../../i18n/useTranslation';
import { stripControlChars } from '../../../../utils/sanitize';
import { TYPE } from '../../geometry';
import { agendaSlideFor, confidentialLine, coverSlideFor, endSlideFor, fit, type CapturePin, type CoverInput, type DeckProfile, type DeckSlide, type DeckSpec } from '../../spec';
import { printText } from '../text';
import type { AnalysisContent, MethodologyContent, ShotSlot, StoryContent } from '../types';
import { PRINT_BUDGET } from './budget';
import { PrintDeckSlideView } from './PrintSlideViews';
import { renderPrintDeckSlide } from './pptxPrintSlides';
import {
  PRINT_IMAGE_BOX,
  PRINT_TYPE,
  TITLE_ROOM,
  analysisLayout,
  analysisTextRooms,
  chartHeadingWidth,
  clampFocus,
  dqlCardLayout,
  dqlPageLayout,
  fitParagraphs,
  fitSegments,
  fitToLines,
  gridLayout,
  keepTailInCell,
  METHOD_WEIGHTS,
  methodologyLayout,
  placePins,
  printLayout,
  printTextRooms,
  scopeTileWidth,
  storyLayout,
  textWidth,
  thumbFocus,
} from './printGeometry';
import { registerPrintSlideRenderers } from './renderers';
import type { AnalysisSlide, AnalysisVisual, FocusFraction, MethodologySlide, PrintImage, PrintSlide, StorySlide } from './slides';

// Every spec with a print slide comes from this module, so its renderers are registered before any
// such slide can be drawn — and they load with this (lazy) chunk, not with the shared deck writers (RT-3).
registerPrintSlideRenderers({ View: PrintDeckSlideView, pptx: renderPrintDeckSlide });

/**
 * The one specification of the real-prints deck (3.2.7, "Teste Deck Wrapup Print"), pure.
 *
 * `buildDeckSpec` does this for the Tech Wrapup; this does it for the deck of real Dynatrace
 * screens: which shots enter the deck in each profile, in which order and with which number,
 * which text each slide carries, cut to `PRINT_BUDGET` and redacted once (`printText`). The PPTX
 * writer and the preview only draw what it returns.
 *
 * Profiles (spec D12, §5.7, §7.3):
 * - SE: every shot with a print is kept, approved or not (the footer says "SE interno"); since
 *   3.3.2 an unapproved print's caption starts with "Not approved for the customer" (§17-g).
 * - Customer: a print is kept only when approved (hash-bound) and its screen identity is verified
 *   or confirmed by the SE. A shot whose print is not kept keeps its reading as one "Prova por DQL"
 *   slide (`dql-only`): the customer-safe analysis, with every screen-sourced value filtered out
 *   again here, and no pixels anywhere — no print, no lupa, no story thumbnail.
 *
 * Decided here (the spec leaves it open): a shot with no print at all enters neither profile, so the
 * SE deck is never smaller than the customer's. Numbers `01..N` run over the shots that enter, after
 * the cut to `PRINT_BUDGET.pairs`; `planPrintDeck` is exported so cross-link refs can follow them.
 */

export interface PrintDeckLabels {
  agendaTitle: string;
  whatLabel: string;
  whyLabel: string;
  pinsLabel: string;
  zoomLabel: string;
  findingsLabel: string;
  mattersLabel: string;
  recoLabel: string;
  dqlLabel: string;
  chainLabel: string;
  printTitle: (n: string, title: string) => string;
  analysisTitle: (n: string, title: string) => string;
  dqlOnlyTitle: (n: string, title: string) => string;
  storyAgenda: string;
  methodologyAgenda: string;
  dqlPageTitle: (page: number, pages: number) => string;
  /** "Full text: appendix Q03" (`prt.deck.dqlMore`); without it an analysis slide names no appendix card. */
  dqlMore?: (ref: string) => string;
  /** "Abridged text: appendix Q03" (`prt.deck.dqlMoreCut`), for a query longer than the appendix pages left could print. */
  dqlMoreCut?: (ref: string) => string;
  /** "→ 02" on a story card (`prt.deck.storyRef`); without it the arrow and the number alone. */
  storyRef?: (n: string) => string;
  /** "Prova por DQL" in the thumbnail box of a story card with no print in this deck (`prt.deck.storyNoPrint`); without it the box stays empty. */
  storyNoPrint?: string;
  /** "past the goal ▶" (`prt.an.viz.overGoal`), added to a ruler reading past "poor" (its verdict is bad, or it is off the scale). */
  overGoal?: string;
  /**
   * "Not approved for the customer" (`prt.deck.notApproved`, 3.3.2, §17-g): leads the caption of a
   * print the SE deck keeps without the SE's approval. The SE deck never blocks on approval — it says
   * so on the slide itself, so an internal deck shown by mistake still tells the truth.
   */
  notApproved?: string;
}

export interface PrintDeckShot {
  slot: Pick<ShotSlot, 'id' | 'kind' | 'order'>;
  /** Translated; tenant text not yet redacted. */
  title: string;
  headline: string;
  what: string;
  why: string;
  print: {
    /** Baked: masks burned in, never the master. */
    image: PrintImage;
    /** Fractions of the image, legend order. */
    pins: CapturePin[];
    /** Same order as `pins`: "Name: what it shows — value (source)". */
    legend: string[];
    /** 3.5.5: what a pin not found on the screen would have said: unnumbered lines under the legend. */
    notes?: string[];
    focus: FocusFraction | null;
    lupaOn: boolean;
    caption: string;
    /** "Real Dynatrace screen: {title}" (`prt.deck.alt`). */
    alt: string;
    /** Approved for the customer, the approval still bound to the image, masks and focus. */
    approved: boolean;
    /** The screen identity is `anchor` or `se-confirmed`. */
    identityOk: boolean;
  } | null;
  analysis: AnalysisContent | null;
  /** The same analysis minus screen-sourced values and zoom/thumb (D12). */
  analysisCustomerSafe: AnalysisContent | null;
}

export interface PrintDeckBuildInput {
  profile: DeckProfile;
  identity: CoverInput;
  /**
   * The cover's provenance line without the tenant (`tw.generatedAt`), for the Customer profile:
   * its methodology names the environment only as the customer's Dynatrace environment, and a
   * tenant id is the first label of the tenant's address (3.2.7 review PS-7). The SE keeps
   * `identity.generatedAtLabel`, tenant included.
   */
  customerGeneratedAtLabel: string;
  coverTitle: string;
  seLabel: string;
  watermark: string;
  shots: readonly PrintDeckShot[];
  story: StoryContent | null;
  methodology: MethodologyContent | null;
  labels: PrintDeckLabels;
  /**
   * 3.5.5 (owner's review: "slides 18 a 20 não vejo necessidade de manter"): the methodology page and the DQL appendix
   * are an option, off by default — "Incluir apêndice técnico". Without them an analysis slide names no appendix card
   * (its DQL lines and the print's caption still say where every number came from).
   */
  includeAppendix?: boolean;
}

/** Every label of the deck from the dictionary, for the tab (`prt.deck.*`, `prt.meth.dqlPage`, `prt.an.viz.overGoal`). */
export function printDeckLabels(t: Translation['t']): PrintDeckLabels {
  return {
    agendaTitle: t('prt.deck.agenda'),
    whatLabel: t('prt.deck.what'),
    whyLabel: t('prt.deck.why'),
    pinsLabel: t('prt.deck.pins'),
    zoomLabel: t('prt.deck.zoom'),
    findingsLabel: t('prt.deck.findings'),
    mattersLabel: t('prt.deck.matters'),
    recoLabel: t('prt.deck.reco'),
    dqlLabel: t('prt.deck.dql'),
    chainLabel: t('prt.deck.chain'),
    printTitle: (n, title) => t('prt.deck.printTitle', { n, title }),
    analysisTitle: (n, title) => t('prt.deck.analysisTitle', { n, title }),
    dqlOnlyTitle: (n, title) => t('prt.deck.dqlOnlyTitle', { n, title }),
    storyAgenda: t('prt.deck.agenda.story'),
    methodologyAgenda: t('prt.deck.agenda.method'),
    dqlPageTitle: (page, pages) => t('prt.meth.dqlPage', { page: String(page), pages: String(pages) }),
    dqlMore: (ref) => t('prt.deck.dqlMore', { ref }),
    dqlMoreCut: (ref) => t('prt.deck.dqlMoreCut', { ref }),
    storyRef: (n) => t('prt.deck.storyRef', { n }),
    storyNoPrint: t('prt.deck.storyNoPrint'),
    notApproved: t('prt.deck.notApproved'),
    overGoal: t('prt.an.viz.overGoal'),
  };
}

/** The deck's cover title: "TIP - {customer} - Tech Wrapup · Real screens", or the generic one without a customer. */
export function printDeckCoverTitle(t: Translation['t'], customer: string): string {
  const name = customer.trim();
  return name === '' ? t('prt.deck.coverTitleNoCustomer') : t('prt.deck.coverTitle', { customer: name });
}

// ------------------------------------------------------------------ which shots, in which order

type ShotPrint = NonNullable<PrintDeckShot['print']>;

/** Whether a print's pixels may enter the deck of this profile (D12). */
export function isPrintKept(print: ShotPrint, profile: DeckProfile): boolean {
  return profile === 'se' || (print.approved && print.identityOk);
}

export interface PlannedShot {
  shot: PrintDeckShot;
  /** '01'..'NN' over the shots that enter. */
  number: string;
  /** with-print: a print slide (then its analysis, if any); dql-only: the customer's "Prova por DQL" slide. */
  mode: 'with-print' | 'dql-only';
}

/** The shots that enter the deck of a profile, in slot order, cut to `PRINT_BUDGET.pairs` and numbered. */
export function planPrintDeck(shots: readonly PrintDeckShot[], profile: DeckProfile): PlannedShot[] {
  const entering = [...shots]
    .sort((a, b) => a.slot.order - b.slot.order)
    .flatMap((shot): Omit<PlannedShot, 'number'>[] => {
      if (shot.print === null) return [];
      if (isPrintKept(shot.print, profile)) return [{ shot, mode: 'with-print' }];
      if (profile === 'customer' && (shot.analysisCustomerSafe ?? shot.analysis) !== null) return [{ shot, mode: 'dql-only' }];
      return [];
    })
    .slice(0, PRINT_BUDGET.pairs);
  return entering.map((entry, index) => ({ ...entry, number: String(index + 1).padStart(2, '0') }));
}

/** The deck number of every shot that enters, by slot id (the cross-link refs and the story's "→ 02"). */
export function printDeckNumbers(shots: readonly PrintDeckShot[], profile: DeckProfile): ReadonlyMap<string, string> {
  return new Map(planPrintDeck(shots, profile).map((entry) => [entry.shot.slot.id, entry.number]));
}

/**
 * The customer-safe cut of an analysis (D12), applied mechanically: no KPI and no finding that
 * rests on a value read from the screen.
 */
export function customerSafeAnalysis(content: AnalysisContent): AnalysisContent {
  return {
    ...content,
    kpis: content.kpis.filter((kpi) => kpi.value.source !== 'screen'),
    findings: content.findings.filter((finding) => finding.facts.every((fact) => fact.source !== 'screen')),
  };
}

/** The reading an entry's analysis slide prints: for a "Prova por DQL" slide, the customer-safe cut. */
function slideContentOf(entry: PlannedShot): AnalysisContent | null {
  const { shot } = entry;
  const source = entry.mode === 'dql-only' ? (shot.analysisCustomerSafe ?? shot.analysis) : shot.analysis;
  if (source === null) return null;
  return entry.mode === 'dql-only' ? customerSafeAnalysis(source) : source;
}

/**
 * The queries the deck of a profile cites, in the order its reader meets them: each analysis
 * slide's own query (its DQL appendix card, Q01…), then the queries behind the numbers its tiles
 * and findings print. The methodology lists these first (3.2.7 final review D3), so a query the
 * appendix prints is never one its table leaves out.
 */
export function citedQueryIds(shots: readonly PrintDeckShot[], profile: DeckProfile): string[] {
  const contents = planPrintDeck(shots, profile)
    .map(slideContentOf)
    .filter((content): content is AnalysisContent => content !== null);
  const ids: string[] = [];
  const add = (id: string) => {
    if (id !== 'screen' && !ids.includes(id)) ids.push(id);
  };
  for (const content of contents) if (content.dqlSource !== null && content.dql !== null && content.dql.trim() !== '') add(content.dqlSource.id);
  for (const content of contents) {
    for (const kpi of content.kpis.slice(0, PRINT_BUDGET.kpis)) add(kpi.value.queryId);
    for (const finding of content.findings.slice(0, PRINT_BUDGET.findings)) for (const fact of finding.facts) add(fact.queryId);
  }
  return ids;
}

// ------------------------------------------------------------------ text

/**
 * A query, hard-wrapped at `width` characters: continuation lines are indented by two spaces and no
 * character is dropped, so the printed lines put back together are the executed text. Control
 * characters go; a tab becomes two spaces; blank lines at either end are trimmed.
 */
export function wrapDql(text: string, width: number): string[] {
  const out: string[] = [];
  const step = Math.max(1, width - 2);
  for (const raw of stripControlChars(text).replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.length <= width) {
      out.push(line);
      continue;
    }
    out.push(line.slice(0, width));
    for (let at = width; at < line.length; at += step) out.push(`  ${line.slice(at, at + step)}`);
  }
  while (out.length > 0 && (out[0] ?? '').trim() === '') out.shift();
  while (out.length > 0 && (out[out.length - 1] ?? '').trim() === '') out.pop();
  return out;
}

/** At most `max` lines; a cut ends its last line in an ellipsis. */
function capLines(lines: readonly string[], max: number, width: number): string[] {
  if (lines.length <= max) return [...lines];
  const kept = lines.slice(0, max);
  const last = kept[max - 1] ?? '';
  kept[max - 1] = `${last.slice(0, width - 1)}…`;
  return kept;
}

/** App-authored text (a label, a time, a window line): control characters dropped, cut. */
const plain = (text: string, max: number) => fit(stripControlChars(text), max);

// The boxes the measured texts are fitted to (3.2.7 review UX-M1): a character budget cut titles,
// findings and recommendations short while their boxes still had lines free.
const ANALYSIS_LAYOUT = analysisLayout({ kpis: 4, hasDql: true });
const ANALYSIS_ROOMS = analysisTextRooms(ANALYSIS_LAYOUT);
const PRINT_ROOMS = printTextRooms(printLayout({ pins: 0, zoom: false }));
const CARD_HEADING = dqlCardLayout(dqlPageLayout().cards[0] ?? { x: 0, y: 0, w: 0, h: 0 }).heading;
const SCREEN_CELL_W = gridLayout(methodologyLayout().prints, METHOD_WEIGHTS.prints, 1).cells[0]?.[0]?.w ?? 0;

/** A slide title on the two lines of the title placeholder: "05 · Leitura analítica — {title}" keeps its entity. */
const slideTitle = (text: string) => fitToLines(fit(text, PRINT_BUDGET.slideTitle), TITLE_ROOM.width, TITLE_ROOM.size, TITLE_ROOM.lines);

/** One text in its box: whole when it fits, else cut to the lines the box holds. */
const inBox = (text: string, room: Parameters<typeof fitParagraphs>[1]) => (text === '' ? '' : (fitParagraphs([text], room)[0] ?? ''));

/** The chart of an analysis slide, cut to its budget, every tenant label redacted. */
function visualFor(visual: AnalysisVisual | null, profile: DeckProfile, overGoal: string | undefined): AnalysisVisual | null {
  if (visual === null) return null;
  // One line of 12 pt: a heading too long for it drops its window ("· 120 min observados na tela até 11:50 UTC") before it is cut.
  const title = fitSegments(printText(visual.title, PRINT_BUDGET.slideTitle, profile), chartHeadingWidth(ANALYSIS_LAYOUT), TYPE.blockHead);
  switch (visual.kind) {
    case 'columns': {
      const points = visual.points.slice(0, PRINT_BUDGET.columns);
      const last = Math.max(0, points.length - 1);
      const band =
        visual.band === null || Math.min(visual.band.from, visual.band.to) > last
          ? null
          : { from: Math.max(0, visual.band.from), to: Math.min(last, visual.band.to), label: printText(visual.band.label, 40, profile) };
      return {
        kind: 'columns',
        title,
        unit: plain(visual.unit, 20),
        points: points.map((point) => ({ label: plain(point.label, 12), value: point.value, highlight: point.highlight })),
        band,
        markers: visual.markers.filter((marker) => marker.at >= 0 && marker.at <= last).map((marker) => ({ at: marker.at, label: printText(marker.label, 40, profile) })),
        maxLabel: plain(visual.maxLabel, 20),
      };
    }
    case 'bars':
      return {
        kind: 'bars',
        title,
        items: visual.items.slice(0, PRINT_BUDGET.bars).map((item) => ({
          label: printText(item.label, PRINT_BUDGET.barLabel, profile),
          value: item.value,
          display: plain(item.display, 16),
          highlight: item.highlight,
        })),
      };
    case 'table': {
      const cols = Math.min(visual.headers.length, PRINT_BUDGET.tableCols);
      return {
        kind: 'table',
        title,
        headers: visual.headers.slice(0, cols).map((cell) => plain(cell, PRINT_BUDGET.tableCell)),
        rows: visual.rows.slice(0, PRINT_BUDGET.tableRows).map((row) => row.slice(0, cols).map((cell) => printText(cell, PRINT_BUDGET.tableCell, profile))),
      };
    }
    case 'ruler':
      return {
        kind: 'ruler',
        title,
        items: visual.items.slice(0, 4).map((item) => {
          // Past "poor" (spec §5.5): the reading is in the poor zone, or off the scale at its right end.
          const past = item.verdict === 'bad' || item.position >= 1;
          const over = past && overGoal !== undefined && overGoal !== '' && !item.display.includes(overGoal);
          return {
            label: printText(item.label, PRINT_BUDGET.barLabel, profile),
            display: plain(over ? `${item.display} · ${overGoal}` : item.display, 40),
            position: Math.max(0, Math.min(1, item.position)),
            verdict: item.verdict,
          };
        }),
      };
    case 'capacity':
      return {
        kind: 'capacity',
        title,
        rows: visual.rows.slice(0, 4).map((row) => ({ ...row, label: printText(row.label, PRINT_BUDGET.barLabel, profile), display: printText(row.display, 60, profile) })),
      };
  }
}

// ------------------------------------------------------------------ slides

function printSlideFor(entry: PlannedShot, print: ShotPrint, profile: DeckProfile, labels: PrintDeckLabels): PrintSlide {
  const { shot, number } = entry;
  const focus = print.focus === null ? null : clampFocus(print.focus);
  const zoomOn = print.lupaOn && focus !== null;
  const lines = print.pins.map((pin, index) => printText(print.legend[index] ?? pin.label, PRINT_BUDGET.pinLabel, profile));
  const max = zoomOn ? PRINT_BUDGET.pinsWithZoom : PRINT_BUDGET.pins;
  // The overlap guard runs here, once, so both writers draw the same pins; a dropped pin takes its legend line with it.
  const placed = placePins(print.pins.slice(0, max), PRINT_IMAGE_BOX);
  const legend = placed.kept.map((index) => lines[index] ?? '');
  // The legend has six rows (four with the lupa): the unnumbered notes take the rows the pins left.
  const notes = (print.notes ?? []).slice(0, Math.max(0, max - legend.length)).map((line) => printText(line, PRINT_BUDGET.pinLabel, profile));
  const title = printText(shot.title, PRINT_BUDGET.title, profile);
  return {
    kind: 'print',
    id: shot.slot.id,
    number,
    title: slideTitle(labels.printTitle(number, title)),
    headline: printText(shot.headline, PRINT_BUDGET.headline, profile),
    whatLabel: labels.whatLabel,
    what: inBox(printText(shot.what, PRINT_BUDGET.what, profile), PRINT_ROOMS.what),
    whyLabel: labels.whyLabel,
    why: inBox(printText(shot.why, PRINT_BUDGET.why, profile), PRINT_ROOMS.why),
    pinsLabel: labels.pinsLabel,
    pins: placed.pins.map((pin, index) => ({ n: pin.n, x: pin.x, y: pin.y, label: legend[index] ?? '' })),
    legend,
    notes,
    image: print.image,
    alt: printText(print.alt, PRINT_BUDGET.alt, profile),
    zoom: zoomOn && focus !== null ? { label: labels.zoomLabel, focus } : null,
    caption: unapprovedCaption(printText(print.caption, PRINT_BUDGET.caption, profile), profile === 'se' && !print.approved ? labels.notApproved : undefined),
  };
}

function analysisSlideFor(entry: PlannedShot, content: AnalysisContent, profile: DeckProfile, labels: PrintDeckLabels): AnalysisSlide {
  const { shot, number, mode } = entry;
  const title = printText(shot.title, PRINT_BUDGET.title, profile);
  return {
    kind: 'analysis',
    id: shot.slot.id,
    number,
    title: slideTitle(mode === 'dql-only' ? labels.dqlOnlyTitle(number, title) : labels.analysisTitle(number, title)),
    variant: mode,
    kpis: content.kpis.slice(0, PRINT_BUDGET.kpis).map((kpi) => ({
      label: printText(kpi.label, PRINT_BUDGET.kpiLabel, profile),
      value: printText(kpi.value.display, PRINT_BUDGET.kpiValue, profile),
      ...(kpi.status === undefined ? {} : { status: kpi.status }),
      source: kpi.value.source,
      footer: printText(kpi.footer, PRINT_BUDGET.kpiFooter, profile),
    })),
    visual: visualFor(content.visual, profile, labels.overGoal),
    dqlLabel: labels.dqlLabel,
    dql: content.dql === null ? [] : wrapDql(content.dql, PRINT_BUDGET.dqlLineChars).slice(0, PRINT_BUDGET.dqlLines),
    dqlMore: null,
    findingsLabel: labels.findingsLabel,
    findings: fitParagraphs(
      content.findings.slice(0, PRINT_BUDGET.findings).map((finding) => printText(finding.text, PRINT_BUDGET.findingMax, profile)),
      ANALYSIS_ROOMS.findings,
    ),
    mattersLabel: labels.mattersLabel,
    matters: inBox(printText(content.matters, PRINT_BUDGET.matters, profile), ANALYSIS_ROOMS.matters),
    recoLabel: labels.recoLabel,
    reco: fitParagraphs(
      content.reco.slice(0, PRINT_BUDGET.reco).map((line) => printText(line, PRINT_BUDGET.recoLine, profile)),
      ANALYSIS_ROOMS.reco,
    ),
  };
}

/** The story, when it has ≥ 3 steps and ≥ 2 thumbnails from prints this profile keeps. */
function storySlideFor(story: StoryContent | null, planned: readonly PlannedShot[], profile: DeckProfile, labels: PrintDeckLabels): StorySlide | null {
  if (story === null) return null;
  const byShot = new Map(planned.map((entry) => [entry.shot.slot.id, entry]));
  const shown = story.steps.slice(0, PRINT_BUDGET.storySteps);
  // The thumbnail box of a card at this step count: a thumbnail shows its print's focus grown to it.
  const box = storyLayout(shown.length).cards[0]?.thumb;
  const aspect = box === undefined || box.h <= 0 ? 0 : box.w / box.h;
  const steps = shown.map((step) => {
    const entry = step.shotId === null ? undefined : byShot.get(step.shotId);
    // A thumbnail only from a print whose pixels are in this deck: never from a dql-only shot.
    const print = entry?.mode === 'with-print' ? entry.shot.print : null;
    return {
      label: plain(step.label, 32),
      time: step.time === null ? null : plain(step.time, 32),
      text: printText(step.text, PRINT_BUDGET.storyText, profile),
      ref: entry === undefined ? null : (labels.storyRef?.(entry.number) ?? `→ ${entry.number}`),
      thumb: print === null ? null : { image: print.image, focus: thumbFocus(print.focus, print.image, aspect) },
      noPrint: print === null ? (labels.storyNoPrint ?? null) : null,
    };
  });
  if (steps.length < 3 || steps.filter((step) => step.thumb !== null).length < 2) return null;
  return {
    kind: 'story',
    title: printText(story.title, PRINT_BUDGET.title, profile),
    subtitle: printText(story.subtitle, 160, profile),
    steps,
    chainLabel: labels.chainLabel,
    chain: printText(story.chain, PRINT_BUDGET.chain, profile),
    caveat: printText(story.caveat, PRINT_BUDGET.caveat, profile),
  };
}

function methodologySummary(content: MethodologyContent, profile: DeckProfile): MethodologySlide {
  const cell = (text: string) => printText(text, PRINT_BUDGET.methodCell, profile);
  return {
    kind: 'methodology',
    part: 'summary',
    title: printText(content.title, PRINT_BUDGET.title, profile),
    // A scope tile holds two lines of its value ("17 executadas entre 11:58 UTC e 12:00 UTC") and one of its label.
    scope: content.scope.slice(0, 4).map((item) => ({
      label: fitToLines(cell(item.label), scopeTileWidth(), PRINT_TYPE.scopeLabel, 1),
      value: fitToLines(cell(item.value), scopeTileWidth(), PRINT_TYPE.scopeValue, 2),
    })),
    printsTitle: plain(content.printsTitle, PRINT_BUDGET.title),
    printHeaders: content.printHeaders.slice(0, 5).map((header) => plain(header, PRINT_BUDGET.methodCell)),
    // The screen column keeps the entity a row is about when its title is too long for it.
    prints: content.prints.slice(0, PRINT_BUDGET.methodRows).map((row) => row.slice(0, 5).map((text, column) => (column === 0 ? keepTailInCell(cell(text), SCREEN_CELL_W) : cell(text)))),
    queriesTitle: plain(content.queriesTitle, PRINT_BUDGET.title),
    queryHeaders: content.queryHeaders.slice(0, 4).map((header) => plain(header, PRINT_BUDGET.methodCell)),
    queries: content.queries.slice(0, PRINT_BUDGET.methodRows).map((row) => row.slice(0, 4).map(cell)),
    gapsTitle: plain(content.gapsTitle, PRINT_BUDGET.title),
    gaps: content.gaps.slice(0, PRINT_BUDGET.gaps).map((line) => printText(line, PRINT_BUDGET.gapLine, profile)),
    note: printText(content.note, 260, profile),
  };
}

const CARDS_PER_PAGE = 4;

interface AppendixSource {
  slide: AnalysisSlide;
  dql: string;
  heading: string;
  windowLine: string;
}

/**
 * The DQL appendix: one card per distinct query printed on an analysis slide, refs `Q01..` in slide
 * order, four per page, at most three pages (the budget's). A query over 18 lines takes as many card
 * slots as its length needs, while the pages have them; one cut short there says so on its slide
 * ("Texto resumido", never "Texto completo" — 3.2.7 review UX-M1), and one that does not fit in the
 * pages left gets no card, and its slide names none.
 */
function appendixFor(sources: readonly AppendixSource[], labels: PrintDeckLabels): MethodologySlide[] {
  const slots = PRINT_BUDGET.dqlPages * CARDS_PER_PAGE;
  const cards: Extract<MethodologySlide, { part: 'dql' }>['cards'] = [];
  const refs = new Map<string, { ref: string; whole: boolean }>();
  const more = (ref: string, whole: boolean) => (whole ? labels.dqlMore?.(ref) : (labels.dqlMoreCut ?? labels.dqlMore)?.(ref)) ?? null;
  for (const source of sources) {
    const known = refs.get(source.dql);
    if (known !== undefined) {
      source.slide.dqlMore = more(known.ref, known.whole) ?? source.slide.dqlMore;
      continue;
    }
    if (cards.length >= slots) continue;
    const ref = `Q${String(refs.size + 1).padStart(2, '0')}`;
    const lines = wrapDql(source.dql, PRINT_BUDGET.dqlCardChars);
    const per = PRINT_BUDGET.dqlCardLines;
    const needed = Math.max(1, Math.ceil(lines.length / per));
    const taken = Math.min(needed, slots - cards.length);
    for (let part = 0; part < taken; part += 1) {
      // The last card a query gets holds the rest of it, capped (with an ellipsis) when the pages ran out.
      const chunk = part === taken - 1 ? lines.slice(part * per) : lines.slice(part * per, (part + 1) * per);
      cards.push({ ref, heading: source.heading, windowLine: source.windowLine, lines: capLines(chunk, per, PRINT_BUDGET.dqlCardChars) });
    }
    const whole = taken === needed;
    refs.set(source.dql, { ref, whole });
    source.slide.dqlMore = more(ref, whole) ?? source.slide.dqlMore;
  }
  const pages = Math.ceil(cards.length / CARDS_PER_PAGE);
  return Array.from({ length: pages }, (_, page) => ({
    kind: 'methodology',
    part: 'dql',
    title: fit(labels.dqlPageTitle(page + 1, pages), PRINT_BUDGET.title),
    cards: cards.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE),
  }));
}

/** A caption led by the SE deck's "not approved" mark, cut back to the caption budget. */
export function unapprovedCaption(caption: string, mark: string | undefined): string {
  if (mark === undefined || mark.trim() === '') return caption;
  return fit(caption === '' ? mark : `${mark} · ${caption}`, PRINT_BUDGET.caption);
}

/** The real-prints deck, slide by slide: cover, agenda, story?, (print → analysis?) × N, methodology, DQL appendix, end. */
export function buildPrintDeckSpec(input: PrintDeckBuildInput): DeckSpec {
  const { profile, labels } = input;
  const planned = planPrintDeck(input.shots, profile);
  const identity = profile === 'customer' ? { ...input.identity, generatedAtLabel: input.customerGeneratedAtLabel } : input.identity;
  const confidential = confidentialLine(profile, identity.strings.confidential, input.watermark);
  const cover = coverSlideFor(identity, { coverTitle: input.coverTitle, seLabel: input.seLabel });

  // No print kept and no "Prova por DQL": cover, agenda and end only (the tab says why instead of offering a download).
  if (planned.length === 0) {
    // No print yet: cover and end only — an agenda with no items read as a blank "What we will show".
    return { profile, slides: [cover, endSlideFor(identity)], confidential, title: input.coverTitle };
  }

  const pairs: DeckSlide[] = [];
  const appendix: AppendixSource[] = [];
  for (const entry of planned) {
    const { shot } = entry;
    if (entry.mode === 'with-print' && shot.print !== null) pairs.push(printSlideFor(entry, shot.print, profile, labels));
    const content = slideContentOf(entry);
    if (content === null) continue;
    const slide = analysisSlideFor(entry, content, profile, labels);
    pairs.push(slide);
    if (content.dql !== null && content.dql.trim() !== '') {
      appendix.push({
        slide,
        dql: content.dql,
        // One line of 10 pt after "Q04  ": measured, so "· svc-catalog-01 · ev.service.screen" is not cut at 70 characters.
        heading: fitToLines(
          printText(content.dqlSource === null ? shot.title : `${shot.title} · ${content.dqlSource.id}`, PRINT_BUDGET.slideTitle, profile),
          CARD_HEADING.w - textWidth('Q00  ', PRINT_TYPE.cardHeading),
          PRINT_TYPE.cardHeading,
          1,
        ),
        windowLine: plain(content.dqlSource?.windowLine ?? '', 120),
      });
    }
  }

  const story = storySlideFor(input.story, planned, profile, labels);
  const withAppendix = input.includeAppendix === true;
  const summary = !withAppendix || input.methodology === null ? null : methodologySummary(input.methodology, profile);
  const dqlPages = withAppendix ? appendixFor(appendix, labels) : [];
  const hasMethod = summary !== null || dqlPages.length > 0;
  const agenda = agendaSlideFor(labels.agendaTitle, [
    ...(story === null ? [] : [labels.storyAgenda]),
    ...planned.map((entry) => printText(entry.shot.title, PRINT_BUDGET.title, profile)),
    ...(hasMethod ? [labels.methodologyAgenda] : []),
  ]);

  const slides: DeckSlide[] = [cover, agenda, ...(story === null ? [] : [story]), ...pairs, ...(summary === null ? [] : [summary]), ...dqlPages, endSlideFor(identity)];
  return { profile, slides, confidential, title: input.coverTitle };
}
