/*
 * 3.4.1: the print stylesheet of the SE Report, moved here from `pages/ValueReport.tsx` so the
 * Assessment report prints with the same rules without loading the SE Report's code.
 */

/**
 * Print rules.
 *
 * Scoped to `@media print` and to explicit data attributes, so nothing here
 * affects the on-screen application. This is the one place the app uses raw CSS,
 * because Strato has no print-layout primitive.
 */
export const PRINT_STYLES = `
@media print {
  [data-print-hide] { display: none !important; }
  /*
   * A tall section must be allowed to flow across a page boundary. Forcing
   * "break-inside: avoid" on a section taller than a page makes the browser
   * push the whole block to the next page, leaving the previous one mostly
   * blank — the empty-page problem. So sections flow, and only the small atomic
   * units (a figure and its label, a card, a tile) are kept whole. The engine
   * stylesheet keeps every .pvs-panel whole in print, which is right for a card
   * and wrong for a section, so a section panel overrides it here.
   */
  [data-print-section],
  .pvs-panel[data-print-section] { break-inside: auto !important; page-break-inside: auto !important; }
  [data-print-atom] { break-inside: avoid; page-break-inside: avoid; }
  /* A grid never splits a single cell across pages, but may break between rows. */
  [data-print-grid] > * { break-inside: avoid; page-break-inside: avoid; }
  /* Never strand a heading at the foot of a page, away from its content. */
  h1, h2, h3, h4 { break-after: avoid-page; page-break-after: avoid; }
  a[href]:after { content: "" !important; }
  /*
   * Depth breaks the printed document: an element behind a blur layer makes
   * Chrome stop after the first page, and overflow:hidden on a card clips its
   * content. v3.1 draws neither (flat Strato surfaces), but a Strato component may
   * still bring a shadow or a clip of its own, so they are stripped for print and
   * every ancestor is forced to expand instead of scroll.
   *
   * Figures need no print patch any more: a Figure is solid ink, where the old
   * clipped-fill numbers were transparent and printed invisible.
   */
  *, *::before, *::after {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
  /*
   * 3.3.18: a name that truncates on screen truncates on paper too. The rule above forces every
   * element visible, which turned the ellipsis off and let a long application name run over its
   * bar (and the page sideways); a label is the one place a clip is right.
   */
  .pvs-truncate,
  .pvs-errmeter__name,
  .pvs-ranked__label,
  .pvs-bars__name {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
  /*
   * 3.3.18: the error meter needs the page's width for its scale; beside the ring on paper its bars
   * collapsed and the axis labels met. In print the ring sits above it.
   */
  [data-testid='dx-ringrank'] .pvs-svc-health { grid-template-columns: minmax(0, 1fr) !important; justify-items: start; }
  [data-testid='dx-ringrank'] .pvs-svc-health > * { width: 100%; }
  [data-testid='dx-ringrank'] .pvs-errmeter__row,
  [data-testid='dx-ringrank'] .pvs-errmeter__axis { grid-template-columns: minmax(0, 10rem) minmax(0, 1fr) minmax(0, 10rem) !important; }
  [data-testid='dx-ringrank'] .pvs-errmeter__value { white-space: normal !important; }
  /* Text for screen readers lives in a 1 px clipped box; with every clip off it would spill sideways. */
  .pvs-sr-only { display: none !important; }
  /* Keep logos and marks in the printed document. */
  img {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    display: inline-block !important;
    visibility: visible !important;
  }
  html, body { height: auto !important; overflow: visible !important; }
}
@page { margin: 12mm; }
`;
