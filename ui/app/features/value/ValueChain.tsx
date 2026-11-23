import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import type { SpectrumFamily } from '../../components/spectrum';
import { Figure } from '../../engine';
import type { IconComponent } from '../../engine/evidence';
import type { Provenance } from '../../models/provenance';

/**
 * The value chain of the PoC (3.2.6): discover → detect → resolve → automate (→ consolidate), each
 * link a measured figure with its provenance, joined by arrows so the page reads as one story —
 * what the platform found, what it caught, how fast it closed, what it can take off people's
 * hands. Shared by Value & ROI and the general report.
 */

export interface ChainLink {
  key: string;
  Icon: IconComponent;
  family: SpectrumFamily;
  /** The verb of the step ("Discover"). */
  step: string;
  value: string | null;
  unit?: string;
  caption: string;
  provenance: Provenance;
}

export const ValueChain = ({ links, label }: { links: readonly ChainLink[]; label: string }) => (
  <ol className="pvs-chain" aria-label={label}>
    {links.map((link) => (
      <li key={link.key} className="pvs-chain__link" data-spectrum={link.family} data-missing={link.value === null ? 'true' : undefined}>
        <div className="pvs-chain__head">
          <span className="pvs-chain__emblem" aria-hidden="true">
            <link.Icon />
          </span>
          <Heading level={5} as="h3" className="pvs-chain__step">
            {link.step}
          </Heading>
        </div>
        <Figure value={link.value ?? '—'} {...(link.unit === undefined || link.value === null ? {} : { unit: link.unit })} size="lg" ink="spectrum" missing={link.value === null} />
        <Text className="pvs-caption">{link.caption}</Text>
        <ProvenanceBadge provenance={link.value === null ? 'no-telemetry' : link.provenance} />
      </li>
    ))}
  </ol>
);
