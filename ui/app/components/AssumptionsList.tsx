import React from 'react';

import { Heading, Paragraph } from '@dynatrace/strato-components/typography';

import { ASSUMPTIONS, UNIT_SYMBOL, visibleAssumptions } from '../config/assumptions';
import { Stack } from '../engine';
import { useTranslation } from '../i18n/useTranslation';
import { useCommercialVisible } from './SeOnly';

/**
 * Every number the app chose, with where it comes from (see `config/assumptions.ts`).
 *
 * Shown in the Help sheet and in Settings. Licence-sizing assumptions are commercial, so they
 * appear only while "Commercial data" is on, like every other commercial figure.
 */
export const AssumptionsList = () => {
  const { t, formatNumber } = useTranslation();
  const commercial = useCommercialVisible();

  return (
    <Stack gap="group">
      <Paragraph>{t('assumption.intro')}</Paragraph>
      <Paragraph>{t('assumption.note.convention')}</Paragraph>
      {visibleAssumptions(commercial).map(({ group, ids }) => (
        <Stack key={group} gap="tight" role="group" aria-label={t(`assumption.group.${group}`)}>
          <Heading level={5}>{t(`assumption.group.${group}`)}</Heading>
          {group === 'experience' && <Paragraph>{t('assumption.note.vitals')}</Paragraph>}
          <dl className="pvs-facts">
            {ids.map((id) => {
              const assumption = ASSUMPTIONS[id];
              const symbol = UNIT_SYMBOL[assumption.unit];
              return (
                <React.Fragment key={id}>
                  <dt>{t(`assumption.${id}`)}</dt>
                  <dd>
                    <strong>
                      {formatNumber(assumption.value)}
                      {symbol === '' ? '' : ` ${symbol}`}
                    </strong>
                    {' · '}
                    {t(`assumption.origin.${assumption.origin}`)}
                    {' · '}
                    {t('assumption.asOf', { date: assumption.asOf })}
                    <br />
                    {t(`assumption.${id}.basis`)}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </Stack>
      ))}
    </Stack>
  );
};
