import type { FC } from 'react';

import type { PreviewKit } from '../../DeckPreview';
import type { PptxKit, RenderedSlide } from '../../pptxTemplate';
import type { PrintDeckSlide } from './slides';

/**
 * Where the shared deck writers find the real-prints slides' renderers (3.2.7 review RT-3).
 *
 * `DeckPreview` and `pptxTemplate` draw every deck, the Tech Wrapup's included, so they sit in the
 * SE Report's own chunk. The print slides' preview views and PPTX writer (`PrintSlideViews`,
 * `pptxPrintSlides` and their `printGeometry`) belong to the lazily loaded real-prints chunk: that
 * chunk registers them when `buildPrintDeckSpec` loads. No spec with a print slide exists before
 * that module has run, so both writers always find them; the other tabs never load their code.
 * This file imports types only.
 */

export interface PrintSlideRenderers {
  /** The on-screen slide (`PrintSlideViews.PrintDeckSlideView`). */
  View: FC<{ slide: PrintDeckSlide; kit: PreviewKit }>;
  /** The slide's PPTX XML (`pptxPrintSlides.renderPrintDeckSlide`). */
  pptx: (slide: PrintDeckSlide, confidential: string, kit: PptxKit) => RenderedSlide;
}

let registered: PrintSlideRenderers | null = null;

export function registerPrintSlideRenderers(renderers: PrintSlideRenderers): void {
  registered = renderers;
}

/** The registered renderers; a print slide drawn before the real-prints chunk loaded is a programming error. */
export function printSlideRenderers(): PrintSlideRenderers {
  if (registered === null) throw new Error('A real-prints slide was drawn before the real-prints deck code was loaded.');
  return registered;
}
