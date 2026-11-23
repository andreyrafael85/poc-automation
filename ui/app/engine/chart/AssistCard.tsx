import React from 'react';

import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { EVIDENCE } from '../evidence';
import type { EvidenceRef, Provenance } from '../../models/provenance';
import './chart.css';

export interface AssistCardProps {
  title: string;
  /** The advice, in a sentence or two, already translated. */
  body: React.ReactNode;
  /** The measured fact behind the advice — never money (rule 6). */
  fact?: { label: string; value: string; provenance: Provenance; evidence?: EvidenceRef };
  footnote?: string;
}

/**
 * The recommendation card of the cockpit (3.3.7), with the measured fact in place of a saving in currency — money
 * lives only in Licensing (rule 6). 3.4.16 (design proposal D-21): it was drawn as an "AI agent" card ("Dynatrace
 * Assist" and a sparkle); what it says comes from the app's rules over measured figures, so it now wears the
 * recommendation's own icon — the AI mark is kept for what Dynatrace Intelligence itself produced.
 */
const RecommendationIcon = EVIDENCE.recommendation.Icon;

export const AssistCard = ({ title, body, fact, footnote }: AssistCardProps) => (
  <section className="pvs-assist" aria-label={title}>
    <div className="pvs-assist__head">
      <span className="pvs-assist__spark" aria-hidden="true">
        <RecommendationIcon />
      </span>
      <Heading level={4} as="h2">
        {title}
      </Heading>
    </div>
    <Paragraph className="pvs-assist__body">{body}</Paragraph>
    {fact !== undefined && (
      <div className="pvs-assist__fact">
        <Text className="pvs-assist__fact-label">{fact.label}</Text>
        <span className="pvs-assist__fact-value">{fact.value}</span>
        <ProvenanceBadge provenance={fact.provenance} confidence="high" evidence={fact.evidence} />
      </div>
    )}
    {footnote !== undefined && <Text className="pvs-caption">{footnote}</Text>}
  </section>
);
