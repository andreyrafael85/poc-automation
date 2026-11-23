import React from 'react';

import { Cluster } from '../engine';
import { type CloudProvider } from '../models/cloud';
import { ProviderMark } from './spectrum';

/**
 * A row of cloud-provider marks: the official monochrome glyphs of the Dynatrace icon gallery,
 * in each provider's colour (3.2.1, "Value Spectrum"). Print-safe, so it renders the same on
 * screen and in the PDF report; each mark is named for assistive technology.
 *
 * Up to 3.2.0 this drew rasterised brand PNGs on a light matte, which never matched the
 * platform's look. The PNGs remain only in the PPTX deck, which needs raster images.
 */
export const CloudProviderIcons = ({
  providers,
  size = 28,
}: {
  providers: readonly CloudProvider[];
  size?: number;
}) => {
  if (providers.length === 0) return null;
  return (
    <Cluster>
      {providers.map((provider) => (
        <ProviderMark key={provider} provider={provider} size={size} />
      ))}
    </Cluster>
  );
};
