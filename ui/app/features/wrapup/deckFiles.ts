/**
 * What both decks need around their slides (moved from `pages/TechWrapup.tsx` in 3.2.7, unchanged):
 * the print stylesheet that turns the preview into a 16:9 PDF, one slide per page, and the slug
 * of the customer's name in the file name. The Tech Wrapup and the real-prints deck share them, so
 * their PDFs and file names cannot drift apart; `TechWrapup.tsx` re-exports both.
 */

/**
 * Print: one slide per 16:9 page (13.333 × 7.5 in, the template's own size) and nothing else.
 * The deck is isolated rather than the app's chrome hidden piece by piece: every ancestor of the
 * slides loses its padding, margin, gap and height (Strato's `main` pads 16 px, the tab panel 16
 * more, the header keeps a 17 px strip — together they pushed the cover onto page 2 and left a
 * blank page 1), and every element beside that chain that does not hold the slides is not printed.
 */
export const DECK_PRINT_CSS = `
@media print {
  @page { size: 13.333in 7.5in; margin: 0; }
  html, body { height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
  :has(.pvs-deck) {
    margin: 0 !important; padding: 0 !important; border: 0 !important; gap: 0 !important;
    height: auto !important; min-height: 0 !important; max-height: none !important;
    overflow: visible !important; position: static !important; transform: none !important;
  }
  :has(.pvs-deck) > :not(:has(.pvs-deck)):not(.pvs-deck) { display: none !important; }
  *, *::before, *::after {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pvs-deck { gap: 0 !important; margin: 0 !important; }
  [data-wrap-slide] { break-inside: avoid; page-break-inside: avoid; break-after: page; page-break-after: always; }
  [data-wrap-slide]:last-child { break-after: auto; page-break-after: auto; }
  [data-wrap-slide] > div { width: 13.333in !important; height: 7.5in !important; border: none !important; border-radius: 0 !important; overflow: hidden !important; }
}
`;

/** "Acme Corp." → "Acme-Corp", for the file name. */
export function fileSlug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'poc'
  );
}
