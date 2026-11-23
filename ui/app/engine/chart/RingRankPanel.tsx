import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { GaugeRing, type GaugeRingProps } from '../../components/spectrum';
import type { EvidenceRef, Provenance } from '../../models/provenance';
import { Panel } from '../Panel';
import { Stack } from '../layout';
import './chart.css';

export interface RingRankPanelProps {
  /** The share that answers the panel's question, on a ring (a derived ratio of measured counts). */
  ring: GaugeRingProps;
  /** What the list ranks ("Workflows that fail first"). */
  title: string;
  /** How the list is ordered and what it is a top of ("top 6 of 9 …"). */
  caption?: string;
  /** The ranked list itself: a `BarList`, `RankedBars` or any list of the engine. */
  children: React.ReactNode;
  /** The list's own source, shown as its badge (the ring carries its own in `ring.fact`). */
  provenance?: Provenance;
  evidence?: EvidenceRef;
  'data-testid'?: string;
}

/**
 * Ring + ranking (3.3.14, the owner's pick from the Automation page): one panel that answers "how
 * much of it is fine?" with a ring and "where is the rest?" with the ranked list beside it — the
 * success ring beside the workflows that fail first, generalised. The ring is always a ratio of two
 * measured counts (never a sum of a capped list); the list says what it is a top of.
 */
export const RingRankPanel = ({ ring, title, caption, children, provenance, evidence, 'data-testid': testId }: RingRankPanelProps) => (
  // 3.5.0: no spectrum edge (D-13) — the ring is the platform's GaugeChart (GaugeRing).
  <Panel as="section" pad="roomy" className="pvs-ringrank" data-testid={testId}>
    <div className="pvs-svc-health">
      <GaugeRing {...ring} />
      <Stack gap="tight" className="pvs-svc-health__hive">
        <div className="pvs-ringrank__head">
          <Heading level={4} as="h2">
            {title}
          </Heading>
          {provenance !== undefined && <ProvenanceBadge provenance={provenance} confidence="high" evidence={evidence} />}
        </div>
        {caption !== undefined && <Text className="pvs-caption">{caption}</Text>}
        {children}
      </Stack>
    </div>
  </Panel>
);
