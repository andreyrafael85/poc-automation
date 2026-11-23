import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { Figure, Panel } from '../engine';
import { useTranslation } from '../i18n/useTranslation';
import { type EstateSizing } from '../models/estate';

/**
 * Compact cloud-footprint summary, reused on the Overview, the Executive summary
 * and the value report so each echoes the Cloud page without re-deriving the
 * numbers. Licensing sizing is deliberately NOT shown here — it lives only on
 * the Licensing page, for the SE. Renders nothing when no cloud attribution was
 * measured.
 */
export const EstateSizingSummary = ({ estate }: { estate: EstateSizing }) => {
  const { t, formatNumber } = useTranslation();
  if (!estate.hasCloud) return null;

  return (
    <Panel pad="roomy">
      <div className="pvs-stack">
        <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-2)' } as React.CSSProperties}>
          <p className="pvs-eyebrow">{t('estate.eyebrow')}</p>
          <Heading level={4} as="h2">
            {t('estate.title')}
          </Heading>
        </div>
        <div className="pvs-grid" style={{ '--pvs-min': '180px' } as React.CSSProperties}>
          {estate.cloudHosts > 0 && (
            <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)' } as React.CSSProperties}>
              <Figure value={formatNumber(estate.cloudHosts)} size="md" />
              <Text className="pvs-caption">{t('estate.cloud', { providers: estate.providerShorts.join(' · ') })}</Text>
            </div>
          )}
          {estate.cloudServices !== null && (
            <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)' } as React.CSSProperties}>
              <Figure value={formatNumber(estate.cloudServices)} size="md" />
              <Text className="pvs-caption">{t('estate.services')}</Text>
            </div>
          )}
        </div>
        {estate.topCloudServices.length > 0 && (
          <Text>
            {t('estate.topServices', {
              list: estate.topCloudServices
                .slice(0, 5)
                .map((service) => `${service.family} (${formatNumber(service.resources)})`)
                .join(' · '),
            })}
          </Text>
        )}
        <Text className="pvs-caption">{t('estate.footnote')}</Text>
      </div>
    </Panel>
  );
};
