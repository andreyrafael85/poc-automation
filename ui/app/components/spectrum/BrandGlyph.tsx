import React from 'react';

import { BRAND_GLYPHS, type BrandGlyph as BrandGlyphName } from './brandGlyphs';

export interface BrandGlyphProps {
  name: BrandGlyphName;
  /** Rendered size in px; the glyphs are drawn on a 20×20 grid (16, 20 and 32 are the gallery sizes). */
  size?: number;
  /** Accessible name. Without one the glyph is decoration and hidden from assistive technology. */
  label?: string;
}

/**
 * One official third-party glyph (AWS, Kubernetes, Java…) from the Dynatrace icon gallery.
 *
 * Monochrome and drawn in `currentColor`, like Strato's own icons, so it takes the colour of
 * its context and follows the theme. The PNG brand logos the app used before are kept only
 * where a provider's full-colour mark is required (the PPTX deck).
 */
export const BrandGlyph = ({ name, size = 20, label }: BrandGlyphProps) => (
  <svg
    className="pvs-glyph"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="currentColor"
    role={label === undefined ? undefined : 'img'}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
    focusable="false"
  >
    {/* A glyph is a fixed list of paths, never reordered: the index is a stable key. */}
    {BRAND_GLYPHS[name].map((d, index) => (
      <path key={index} d={d} />
    ))}
  </svg>
);
