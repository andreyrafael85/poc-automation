import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';

import { PALETTE, type Tone } from '../design/palette';
import { Figure, Panel } from '../engine';
import { isUnavailable, type Fact } from '../models/provenance';
import { ProvenanceBadge } from './ProvenanceBadge';

/**
 * The single verdict a viewer should take away from a screen.
 *
 * v3.1: a flat `Panel` tinted by the verdict's tone, with a rail, instead of a
 * saturated `Container variant="accent"`. The figure is a `Figure`, not a heading:
 * a number is not a section title and should not appear in the page outline.
 *
 * ## Why this is a strip and not a hero
 *
 * It used to be a tall, centred, full-width block: verdict word at heading-1,
 * the metric under it, the sentence under that. A customer's reaction was that a
 * manager opening the Executive Summary met a large blue panel whose figure was
 * already repeated in the tiles below, while everything actually worth reading
 * sat further down the page.
 *
 * They were right. A verdict earns one line, not a screenful. It is now a
 * horizontal strip: verdict, supporting metric, one sentence, on a single row
 * that collapses gracefully on a narrow viewport. The takeaway survives; the
 * real estate does not.
 *
 * The verdict itself is always derived from measured values by the caller, and
 * it still carries a provenance badge: a headline is not exempt from the rule
 * that every statement is traceable.
 */

export type Verdict = 'strong' | 'good' | 'mixed' | 'attention' | 'blocked' | 'unknown';

/**
 * Tone per verdict.
 *
 * Deliberately restrained. An executive reading a red banner concludes their
 * environment is on fire, which is not what most of these verdicts mean:
 * "worth reviewing" is context, and "not assessable" is about *our* permissions,
 * not about their estate.
 *
 * So amber and red are not used here at all. Green marks a genuinely good
 * result, blue carries everything informational, and grey marks the absence of a
 * conclusion. Where something really is wrong, the specific card says so — the
 * headline does not shout on its behalf.
 */
const VERDICT_TONE: Record<Verdict, Tone> = {
  strong: PALETTE.good,
  good: PALETTE.good,
  mixed: PALETTE.info,
  attention: PALETTE.info,
  blocked: PALETTE.absent,
  unknown: PALETTE.absent,
};

export interface VerdictHeroProps {
  /** One word or short phrase. The verdict, not a sentence. */
  headline: string;
  verdict: Verdict;
  /** The measurement that justifies the headline. */
  supporting: Fact<number | string | null>;
  /** Pre-formatted supporting value. */
  supportingDisplay?: string;
  supportingLabel: string;
  /** One sentence of interpretation. Keep it to one. */
  detail: string;
  /** Optional secondary line, e.g. a scope reminder. */
  footnote?: string;
}

export const VerdictHero = ({
  headline,
  verdict,
  supporting,
  supportingDisplay,
  supportingLabel,
  detail,
  footnote,
}: VerdictHeroProps) => {
  const tone = VERDICT_TONE[verdict];
  const unavailable = isUnavailable(supporting);

  return (
    <Panel tone={tone} rail={tone !== 'neutral'} pad="compact">
      <div className="pvs-stack" style={{ '--pvs-gap': 'var(--pvs-gap-tight)' } as React.CSSProperties}>
        <div className="pvs-cluster" style={{ '--pvs-gap': 'var(--pvs-gap-group)' } as React.CSSProperties}>
          <Chip color={tone} variant="emphasized" size="condensed">
            {headline}
          </Chip>

          <div className="pvs-cluster">
            <Figure
              value={supportingDisplay ?? String(supporting.value)}
              size="md"
              missing={unavailable}
              missingLabel={supportingLabel}
            />
            <Text>{supportingLabel}</Text>
            <ProvenanceBadge
              provenance={supporting.provenance}
              confidence={supporting.confidence}
              evidence={supporting.evidence}
              note={supporting.note}
            />
          </div>
        </div>

        <Paragraph className="pvs-prose">{detail}</Paragraph>
        {footnote !== undefined && <Text className="pvs-caption">{footnote}</Text>}
      </div>
    </Panel>
  );
};
