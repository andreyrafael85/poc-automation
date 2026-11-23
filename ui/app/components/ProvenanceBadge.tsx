import React from 'react';

import { InformationOverlay } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';

import { EVIDENCE } from '../engine';
import {
  CONFIDENCE_META,
  type Confidence,
  type EvidenceRef,
  type Provenance,
} from '../models/provenance';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The visual contract of this app: no figure appears without stating whether it
 * was observed, calculated, estimated, recommended or unavailable.
 *
 * The badge is not decorative. It is the mechanism that lets a technical
 * reviewer challenge any number on screen and be answered with a query id.
 *
 * v3.1: the class is carried by an **icon, a word and a tone** (see
 * `engine/evidence.tsx`), not by a coloured word alone, and the trigger names its
 * purpose for assistive technology ("Evidence class: Observed. Open for its
 * source.") instead of announcing a bare label.
 *
 * It is built on Strato's own `InformationOverlay` trigger — the platform's
 * pattern for "more about this" — whose `color` tints the icon and whose icon slot
 * takes the class icon. A pill per figure would repeat sixty heavy shapes on a
 * page; an icon and a word keep the scan light and the class legible.
 */

export interface ProvenanceBadgeProps {
  provenance: Provenance;
  confidence?: Confidence;
  evidence?: EvidenceRef;
  /** Extra caveat specific to this value. */
  note?: string;
}

export const ProvenanceBadge = ({ provenance, confidence, evidence, note }: ProvenanceBadgeProps) => {
  const entry = EVIDENCE[provenance];
  const { t, tWindow, formatTime } = useTranslation();
  const label = t(entry.labelKey);
  const Icon = entry.Icon;

  // 3.5.6: a stable hook for the Tech Wrapup's pins (the class of the evidence and the query it came from).
  return (
    <span className="pvs-prov" data-provenance={provenance} data-query={evidence?.queryId}>
    <InformationOverlay color={entry.tone}>
      <InformationOverlay.Trigger aria-label={t('evidence.chip.aria', { label })}>
        {/* The overlay's own icon slot is replaced by the class icon, so the trigger
            reads "✓ Observed" rather than "ⓘ ✓ Observed". */}
        <InformationOverlay.Icon>
          <Icon aria-hidden="true" />
        </InformationOverlay.Icon>
        {label}
      </InformationOverlay.Trigger>
      <InformationOverlay.Content>
        <Flex flexDirection="column" gap={4}>
          <Text>{t(`evidence.family.${entry.family}`)}</Text>
          <Paragraph>{t(entry.descriptionKey)}</Paragraph>
          {note !== undefined && note !== '' && <Paragraph>{note}</Paragraph>}
          {confidence !== undefined && (
            <Text>
              {t(CONFIDENCE_META[confidence].labelKey)}:{' '}
              {t(CONFIDENCE_META[confidence].descriptionKey)}
            </Text>
          )}
          {evidence !== undefined && (
            <Flex flexDirection="column" gap={2}>
              <Text>{t('c.prov.query', { value: evidence.queryId })}</Text>
              <Text>{t('c.prov.source', { value: evidence.source })}</Text>
              <Text>{t('c.prov.window', { value: tWindow(evidence.timeframe) })}</Text>
              {evidence.collectedAt !== undefined && (
                <Text>{t('c.prov.readAt', { value: formatTime(evidence.collectedAt) })}</Text>
              )}
            </Flex>
          )}
        </Flex>
      </InformationOverlay.Content>
    </InformationOverlay>
    </span>
  );
};
