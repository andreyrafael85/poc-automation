import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ROLE_TONE, type ChartRole } from '../design/palette';
import { Panel } from '../engine';
import { useTranslation } from '../i18n/useTranslation';
import type { EvidenceRef, Provenance } from '../models/provenance';
import { ProvenanceBadge } from './ProvenanceBadge';

/**
 * The frame every chart in this app sits in.
 *
 * Charts were being placed directly into page layouts, each with its own
 * heading style, its own spacing and its own idea of where the provenance badge
 * goes. Across the app that reads as a pile of unrelated widgets.
 *
 * One frame fixes the structural half of that. It always renders, in this order:
 *
 *   role chip        heading                          provenance badge
 *   ───────────────────────────────────────────────────────────────────
 *   the chart
 *   what the chart is showing, in one sentence
 *   window · query id
 *
 * The role chip is not decoration: it names what kind of quantity the chart is
 * measuring, and it is the same word that selects the chart's colour ramp in
 * `design/palette`. Colour and label therefore always agree, which is what lets
 * an audience learn the language after two tabs instead of re-reading every
 * axis.
 *
 * The title is an `h2` styled as a level-4 heading: the page owns the `h1`, and a
 * chart is a section of it, so the outline stays in order whatever the size.
 */

const ROLE_LABEL: Record<ChartRole, string> = {
  magnitude: 'chart.role.magnitude',
  category: 'chart.role.category',
  duration: 'chart.role.duration',
  volume: 'chart.role.volume',
  exposure: 'chart.role.exposure',
};

export interface ChartFrameProps {
  /** What the chart measures. Drives both the chip and the colour ramp. */
  role: ChartRole;
  title: string;
  /** One sentence on how to read it. */
  caption?: string;
  provenance?: Provenance;
  evidence?: EvidenceRef;
  /** Window label, shown so the scope of the chart is never ambiguous. */
  windowLabel?: string;
  /** Rendered to the right of the heading, e.g. a headline figure. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartFrame = ({
  role,
  title,
  caption,
  provenance,
  evidence,
  windowLabel,
  trailing,
  children,
}: ChartFrameProps) => {
  const { t, formatTime } = useTranslation();

  return (
    <Panel pad="roomy">
      <div className="pvs-stack">
        <div className="pvs-chartframe__head">
          <div className="pvs-chartframe__title">
            {/* 3.4.18 (D-13/D-27, design guide 06 C2): the role chip is neutral — the platform keeps colour for status
                and for the one primary action of a page; the word still names the kind of quantity. */}
            <Chip size="condensed" data-role-tone={ROLE_TONE[role]}>
              {t(ROLE_LABEL[role] as Parameters<typeof t>[0])}
            </Chip>
            <Heading level={4} as="h2">
              {title}
            </Heading>
          </div>
          <div className="pvs-chartframe__tools">
            {trailing}
            {provenance !== undefined && (
              <ProvenanceBadge provenance={provenance} confidence="high" evidence={evidence} />
            )}
          </div>
        </div>

        <div className="pvs-chartframe__body">{children}</div>

        {caption !== undefined && <Text className="pvs-caption">{caption}</Text>}
        {windowLabel !== undefined && evidence !== undefined && (
          <Text className="pvs-caption">
            {t('c.chart.footer', { window: windowLabel, query: evidence.queryId })}
            {evidence.collectedAt !== undefined ? t('c.read.at', { time: formatTime(evidence.collectedAt) }) : ''}
          </Text>
        )}
      </div>
    </Panel>
  );
};
