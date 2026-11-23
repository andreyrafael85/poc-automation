import React from 'react';

import { HostsIcon } from '@dynatrace/strato-icons';

import { PROVIDER_META, type CloudProvider } from '../../models/cloud';
import { BrandGlyph } from './BrandGlyph';
import type { BrandGlyph as BrandGlyphName } from './brandGlyphs';

const GLYPH: Record<CloudProvider, BrandGlyphName | null> = {
  AWS: 'aws',
  Azure: 'azure',
  GCP: 'googleCloud',
  Other: null,
};

export interface ProviderMarkProps {
  provider: CloudProvider;
  /** Tile size in px; the glyph is drawn at 60 % of it. */
  size?: number;
  /** Decorative when the provider's name is printed beside it. */
  decorative?: boolean;
}

/**
 * A cloud provider's official monochrome glyph (Dynatrace third-party gallery), in the
 * provider's colour on a wash of it: how the platform itself shows a provider.
 *
 * It replaces the rasterised brand PNGs on screen, which never matched the platform's look.
 * A provider without a glyph ("Other") gets the functional hosts icon, never a made-up logo.
 */
export const ProviderMark = ({ provider, size = 40, decorative = false }: ProviderMarkProps) => {
  const meta = PROVIDER_META[provider];
  const glyph = GLYPH[provider];
  const inner = Math.round(size * 0.6);
  return (
    <span
      className="pvs-provider"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : meta.fullName}
      aria-hidden={decorative ? true : undefined}
      // Per instance: the provider's brand colour and the size the caller asked for.
      style={{ '--pvs-brand': meta.color, '--pvs-provider-size': `${size}px` } as React.CSSProperties}
    >
      {glyph === null ? <HostsIcon size={inner} /> : <BrandGlyph name={glyph} size={inner} />}
    </span>
  );
};
