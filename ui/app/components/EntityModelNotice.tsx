import React from 'react';

import { MessageContainer } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Paragraph, Text } from '@dynatrace/strato-components/typography';

import type { EntityModelDiagnosis } from '../models/entityHealth';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Warns, prominently, when the entity model is not answering.
 *
 * Placed above any section whose figures come from entity queries. Without it a
 * reader has no way to distinguish "your estate is empty" from "the inventory
 * source is down", and the first reading is both wrong and alarming.
 */

export interface EntityModelNoticeProps {
  diagnosis: EntityModelDiagnosis;
  /** Appears in the printed report as well as on screen when true. */
  includeInPrint?: boolean;
}

export const EntityModelNotice = ({ diagnosis, includeInPrint = true }: EntityModelNoticeProps) => {
  const { t } = useTranslation();
  if (diagnosis.state !== 'unavailable') return null;

  return (
    <div {...(includeInPrint ? {} : { 'data-print-hide': true })}>
      <MessageContainer variant="critical">
        <MessageContainer.Title>{t('entity.outage.title')}</MessageContainer.Title>
        <MessageContainer.Description>
          <Flex flexDirection="column" gap={8}>
            <Paragraph>{t('entity.outage.body')}</Paragraph>
            <Text>{t('entity.outage.scope')}</Text>
          </Flex>
        </MessageContainer.Description>
      </MessageContainer>
    </div>
  );
};
