import { useCallback, useEffect, useRef, useState } from 'react';

import { fileSlug } from '../../deckFiles';
import { buildTemplateDeck, loadBrandTemplate } from '../../pptxTemplate';
import type { DeckProfile, DeckSpec } from '../../spec';

/**
 * Downloading the real-prints deck (3.2.7): the brand template, the package, an object URL and a
 * hidden anchor — what `TechWrapup.downloadPptx` does, as a hook for the prints tab. The package is
 * written with `dedupeMedia` and `storeImages`: each print is one JPEG part however many slides
 * show it (print, lupa, story thumbnail), stored rather than deflated.
 *
 * The object URL lives until it is replaced or the tab unmounts: revoking it at once could cancel
 * the download in some browsers, silently (finding E5), and the `ready` state carries it for the
 * fallback link (`deck.download.fallback`). The button that calls this never says "PowerPoint"
 * (`prt.deck.download`), so the Tech Wrapup's "Download PowerPoint" stays unique on the page.
 */

export type DeckDownloadState =
  | { phase: 'idle' }
  | { phase: 'busy' }
  | { phase: 'ready'; url: string; name: string; bytes: number }
  | { phase: 'failed'; reason: string };

export interface DeckDownload {
  state: DeckDownloadState;
  /** Builds the package from `spec` and hands it to the browser as `fileName`; ignored while one is being built. */
  download: (spec: DeckSpec, meta: { dtLogo: string; seName: string | null }, fileName: string) => Promise<void>;
}

/**
 * `TIP-Tech-Wrapup-Prints-{customer}-{Month}-{YYYY}[-SE-interno].pptx`, with the Tech Wrapup's
 * month and year (the month named in the app's language, capitalised).
 */
export function printDeckFileName(customer: string, profile: DeckProfile, now: Date, locale: string): string {
  const monthName = now.toLocaleDateString(locale, { month: 'long' });
  const month = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `TIP-Tech-Wrapup-Prints-${fileSlug(customer.trim() || 'poc')}-${month}-${now.getFullYear()}${profile === 'se' ? '-SE-interno' : ''}.pptx`;
}

export function useDeckDownload(options: { loadTemplate?: () => Promise<ArrayBuffer> } = {}): DeckDownload {
  const loadTemplate = options.loadTemplate ?? loadBrandTemplate;
  const [state, setState] = useState<DeckDownloadState>({ phase: 'idle' });
  const objectUrl = useRef<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (objectUrl.current !== null) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    };
  }, []);

  const download = useCallback(
    async (spec: DeckSpec, meta: { dtLogo: string; seName: string | null }, fileName: string) => {
      if (busy.current) return;
      busy.current = true;
      setState({ phase: 'busy' });
      try {
        const template = await loadTemplate();
        const blob = await buildTemplateDeck(spec, template, { dtLogo: meta.dtLogo, seName: meta.seName, dedupeMedia: true, storeImages: true });
        // The tab was left while the file was built: nothing to hand over, nothing to keep alive.
        if (!mounted.current) return;
        if (objectUrl.current !== null) URL.revokeObjectURL(objectUrl.current);
        const url = URL.createObjectURL(blob);
        objectUrl.current = url;
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setState({ phase: 'ready', url, name: fileName, bytes: blob.size });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (mounted.current) setState({ phase: 'failed', reason: reason.slice(0, 160) });
      } finally {
        busy.current = false;
      }
    },
    [loadTemplate],
  );

  return { state, download };
}
