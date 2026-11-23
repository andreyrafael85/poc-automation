/**
 * How much text each block of the real-prints deck holds (3.2.7). Separate from the Tech Wrapup's
 * `BUDGET`, which stays untouched: these slides have their own geometry (`printGeometry.ts`), and
 * both writers cut from here, so a cut the SE sees in the preview is the cut the customer opens.
 * Lengths are characters; counts are items.
 *
 * The slide titles, the "what"/"why" texts, the findings, "why it matters", the recommendations,
 * the chart headings, the scope tiles and the appendix headings are then fitted to the lines their
 * boxes hold (`printGeometry.ts`, `fitParagraphs` / `fitToLines`, 3.2.7 review UX-M1): for those
 * the length here is only an upper bound, not the cut.
 */
export const PRINT_BUDGET = {
  /** Kept print/analysis pairs (21 slides with 7, 28 with 10). */
  pairs: 10,
  /** A screen's title (the agenda, the alt text). */
  title: 70,
  /** A slide title: "05 · Leitura analítica — {title}", measured onto the placeholder's two lines. */
  slideTitle: 120,
  headline: 60,
  what: 140,
  why: 260,
  pins: 6,
  pinsWithZoom: 4,
  pinLabel: 130,
  caption: 150,
  alt: 120,
  kpis: 4,
  kpiLabel: 44,
  kpiValue: 16,
  kpiFooter: 62, // 52 until 3.4.12: "Dynatrace Intelligence · {window}" (was "Davis · …") must keep its window whole.
  findings: 3,
  /** The longest finding the analysis writes with its suffix (`narrative.ts`). */
  finding: 190,
  /** The longest finding a slide takes; its box decides how much of it shows. */
  findingMax: 360,
  matters: 320,
  reco: 2,
  recoLine: 240,
  dqlLines: 6,
  dqlLineChars: 96,
  /** Points of a `columns` chart (one per minute). */
  columns: 90,
  bars: 6,
  barLabel: 30,
  tableRows: 5,
  tableCols: 3,
  tableCell: 30,
  storySteps: 5,
  storyText: 130,
  chain: 170,
  caveat: 170,
  methodRows: 10,
  /** A methodology cell: `fitGrid` then fits each one to its column, stepping the type down before it cuts. */
  methodCell: 90,
  gaps: 4,
  gapLine: 120,
  dqlCardLines: 18,
  dqlCardChars: 100,
  dqlPages: 3,
} as const;
