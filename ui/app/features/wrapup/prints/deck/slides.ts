import type { CapturePin, DeckKpi } from '../../spec';
import type { SourceKind } from '../types';

/**
 * The slide kinds of the real-prints deck (3.2.7): a real Dynatrace screen with its pinned legend,
 * the analytic reading of the same entity and window, the incident story and the methodology.
 *
 * `buildPrintDeckSpec` emits them next to the Tech Wrapup's own cover, agenda and end slides;
 * `buildDeckSpec` never does. Both writers (the PPTX and the preview) dispatch on
 * `isPrintDeckSlide`, so the existing slide kinds keep their own code paths untouched. Every text
 * here is final: translated, redacted (`printText`) and cut to `PRINT_BUDGET`.
 */

/** A baked print: masks burned in, JPEG. */
export interface PrintImage {
  /** `data:image/jpeg;base64,…` */
  dataUrl: string;
  width: number;
  height: number;
  /** sha256 of the baked bytes: one media part per distinct image (`dedupeMedia`). */
  mediaKey: string;
}

/** A region of an image, as fractions of its width and height (the lupa, a story thumbnail). */
export interface FocusFraction {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The chart of an analysis slide. `columns`: one point per minute (≤ 90); `band` and `markers`
 * index into `points` (`from`/`to` inclusive). `ruler`: `position` is 0..1 along the
 * good | attention | poor scale.
 */
export type AnalysisVisual =
  | {
      kind: 'columns';
      title: string;
      unit: string;
      points: { label: string; value: number | null; highlight: boolean }[];
      band: { from: number; to: number; label: string } | null;
      markers: { at: number; label: string }[];
      maxLabel: string;
    }
  | { kind: 'bars'; title: string; items: { label: string; value: number; display: string; highlight: boolean }[] }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][] }
  | { kind: 'ruler'; title: string; items: { label: string; display: string; position: number; verdict: 'good' | 'warn' | 'bad' }[] }
  | { kind: 'capacity'; title: string; rows: { label: string; used: number; requested: number; allocatable: number | null; display: string }[] };

/** A real screen, with its numbered pins and what each one shows. */
export interface PrintSlide {
  kind: 'print';
  id: string;
  /** '01'. */
  number: string;
  title: string;
  headline: string;
  whatLabel: string;
  what: string;
  whyLabel: string;
  why: string;
  pinsLabel: string;
  /** Fractions of the image; ≤ 6 (≤ 4 with zoom). */
  pins: CapturePin[];
  /** Same order as pins; '**Name**: text' (bold split at the first ':'). */
  legend: string[];
  /**
   * 3.5.5: what a pin not found on the screen would have said, as unnumbered lines after the legend (never a pin on a
   * guessed spot); they share the legend's rows (≤ 6, ≤ 4 with the lupa).
   */
  notes: string[];
  image: PrintImage;
  /** 'Tela real do Dynatrace: {title}' — never 'What it shows'. */
  alt: string;
  zoom: { label: string; focus: FocusFraction } | null;
  caption: string;
}

/** The analytic reading of a print: KPIs with their source, one chart, the DQL that ran, findings. */
export interface AnalysisSlide {
  kind: 'analysis';
  id: string;
  number: string;
  title: string;
  /** dql-only = "Prova por DQL" (customer profile, print not approved): no screen value, no zoom. */
  variant: 'with-print' | 'dql-only';
  /** ≤ 4. */
  kpis: (DeckKpi & { source: SourceKind; footer: string })[];
  visual: AnalysisVisual | null;
  dqlLabel: string;
  /** ≤ 6 wrapped lines. */
  dql: string[];
  /** 'Texto completo: apêndice Q03'. */
  dqlMore: string | null;
  findingsLabel: string;
  findings: string[];
  mattersLabel: string;
  matters: string;
  recoLabel: string;
  reco: string[];
}

/** The incident, screen by screen: 3..5 steps with thumbnails cropped from the kept prints. */
export interface StorySlide {
  kind: 'story';
  title: string;
  subtitle: string;
  /**
   * 3..5. `ref` is "→ 02"; a thumbnail reuses its print's media part (0 bytes). `noPrint` ("Prova por
   * DQL") fills the thumbnail box of a step whose print is not in this deck, so the card has no blank half.
   */
  steps: { label: string; time: string | null; text: string; ref: string | null; thumb: { image: PrintImage; focus: FocusFraction } | null; noPrint?: string | null }[];
  chainLabel: string;
  chain: string;
  caveat: string;
}

/** The methodology: the summary page, then ≤ 3 pages of DQL cards (4 per page). */
export type MethodologySlide =
  | {
      kind: 'methodology';
      part: 'summary';
      title: string;
      scope: { label: string; value: string }[];
      printsTitle: string;
      printHeaders: string[];
      prints: string[][];
      queriesTitle: string;
      queryHeaders: string[];
      queries: string[][];
      gapsTitle: string;
      gaps: string[];
      note: string;
    }
  | { kind: 'methodology'; part: 'dql'; title: string; cards: { ref: string; heading: string; windowLine: string; lines: string[] }[] };

export type PrintDeckSlide = PrintSlide | AnalysisSlide | StorySlide | MethodologySlide;

export const PRINT_DECK_KINDS = ['print', 'analysis', 'story', 'methodology'] as const;

const KINDS: ReadonlySet<string> = new Set(PRINT_DECK_KINDS);

/** True for the slide kinds of this deck; the shared writers dispatch on it. */
export function isPrintDeckSlide(slide: { kind: string }): slide is PrintDeckSlide {
  return KINDS.has(slide.kind);
}
