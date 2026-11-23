import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { ArrowRightIcon, DynatraceSignetIcon, OneAgentSignetIcon, ProcessIcon } from '@dynatrace/strato-icons';

import { BrandGlyph } from '../../components/spectrum';
import { vendorGlyph } from '../../components/spectrum/brandFor';
import { pluralKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Today → with Dynatrace (3.2.6): the third-party agents and tools found beside the OneAgent, and
 * the one agent, one platform they consolidate into. Shared by the Competitor overlap page and the
 * deck's capture of it.
 */

/** A vendor's official glyph when the gallery has one, the functional process icon otherwise. */
export const VendorMark = ({ vendor, size }: { vendor: string; size: number }) => {
  const glyph = vendorGlyph(vendor);
  return glyph === null ? <ProcessIcon size={size} /> : <BrandGlyph name={glyph} size={size} />;
};

export const ConsolidationHero = ({ vendors, totalAgents }: { vendors: readonly { vendor: string }[]; totalAgents: number }) => {
  const { t, formatNumber } = useTranslation();
  const agents = t(pluralKey('common.agentsCount', totalAgents), { n: formatNumber(totalAgents) });
  const tools = t(pluralKey('common.toolsCount', vendors.length), { n: formatNumber(vendors.length) });
  return (
    <section className="pvs-consol" aria-label={t('comp3.consol.aria', { agents: formatNumber(totalAgents), tools: formatNumber(vendors.length) })}>
      <div className="pvs-consol__side" data-side="today">
        <Text className="pvs-label">{t('comp3.consol.today')}</Text>
        <div className="pvs-consol__marks" aria-hidden="true">
          {vendors.slice(0, 6).map((entry) => (
            <span key={entry.vendor} className="pvs-consol__mark">
              <VendorMark vendor={entry.vendor} size={20} />
            </span>
          ))}
        </div>
        <Text className="pvs-consol__figure">{t('comp3.consol.todayFigure', { agents, tools })}</Text>
      </div>
      <span className="pvs-consol__arrow" aria-hidden="true">
        <ArrowRightIcon />
      </span>
      <div className="pvs-consol__side" data-side="dynatrace" data-spectrum="blue-turquoise">
        <Text className="pvs-label">{t('comp3.consol.withDt')}</Text>
        <div className="pvs-consol__marks" aria-hidden="true">
          <span className="pvs-consol__mark" data-dt="true">
            <OneAgentSignetIcon />
          </span>
          <span className="pvs-consol__mark" data-dt="true">
            <DynatraceSignetIcon />
          </span>
        </div>
        <Text className="pvs-consol__figure">{t('comp3.consol.dtFigure')}</Text>
      </div>
    </section>
  );
};
