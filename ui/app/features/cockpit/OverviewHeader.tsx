import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { useStudio } from '../../config/StudioContext';
import { Panel } from '../../engine';
import { useTranslation } from '../../i18n/useTranslation';
import { isSafeImageDataUrl } from '../../utils/logo';
import { BRAND_PACK_INSTALLED } from '../wrapup/brandPack';

/**
 * The Overview's header (3.4.18, G-D1 / DN-6 of `docs/v3.4/DESIGN-STRATO-NATIVO-PLANO.md`): a flat surface, the
 * customer's mark beside the Dynatrace one, the title in neutral ink, the window and the read time, and the three
 * health gauges on the platform's `GaugeChart` — where 3.2 drew a gradient band, a painted headline and glowing rings.
 * The title stays the page's only `h1`. The logo is shown only after `isSafeImageDataUrl` accepts it (the second gate
 * after the upload's).
 */
export const OverviewHeader = ({
  title,
  subtitle,
  windowLabel,
  asOfIso,
  gauges,
}: {
  title: string;
  subtitle: string;
  windowLabel: string;
  asOfIso: string;
  gauges: React.ReactNode;
}) => {
  const { parameters } = useStudio();
  const { t, formatDateTime } = useTranslation();
  const logo = parameters.customerLogoDataUrl;

  return (
    <Panel pad="roomy" className="pvs-sheader" data-testid="overview-header">
      <div className="pvs-sheader__text">
        <div className="pvs-sheader__meta">
          {isSafeImageDataUrl(logo) && logo !== null && (
            <img
              className="pvs-sheader__logo"
              src={logo}
              alt={parameters.customerName === '' ? t('c.hero.customerLogoAlt') : t('c.hero.namedLogoAlt', { name: parameters.customerName })}
            />
          )}
          {BRAND_PACK_INSTALLED && <img className="pvs-sheader__logo" data-brand="dynatrace" src="./assets/Dynatrace_Logo.svg" alt="Dynatrace" />}
          <Chip size="condensed">{windowLabel}</Chip>
          <Text textStyle="small" className="pvs-sheader__subtitle">
            {t('c.hero.asOf', { time: formatDateTime(asOfIso) })}
          </Text>
        </div>
        <Heading level={1}>{title}</Heading>
        {parameters.engagementName !== '' && <Text className="pvs-sheader__subtitle">{parameters.engagementName}</Text>}
        <Paragraph className="pvs-sheader__subtitle">{subtitle}</Paragraph>
        {parameters.pocDescription !== '' && <Paragraph className="pvs-sheader__subtitle">{parameters.pocDescription}</Paragraph>}
      </div>
      <div className="pvs-sgauge-row">{gauges}</div>
    </Panel>
  );
};
