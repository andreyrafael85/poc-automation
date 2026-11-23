import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { GaugeRing } from '../../components/spectrum';
import { assumed } from '../../config/assumptions';
import { StatusHexMap } from '../../components/viz/StatusHexMap';
import { FAILURE_BAND_COLOR } from '../../design/palette';
import { Panel, Stack } from '../../engine';
import type { CatalogQueryResult } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { num, str } from '../../utils/records';

export type FailureBand = keyof typeof FAILURE_BAND_COLOR;

const BAND_ORDER: readonly FailureBand[] = ['high', 'review', 'under', 'none'];

const BAND_LABEL: Record<FailureBand, StringKey> = {
  none: 'p.svc.band.none',
  under: 'p.svc.band.under',
  review: 'p.svc.band.review',
  high: 'p.svc.band.high',
};

/** The band of one service's failure rate, on the 1 % and 5 % lines of the assumptions registry. */
export function failureBand(failures: number | null, ratePct: number | null): FailureBand {
  if ((failures ?? 0) === 0 || ratePct === null) return 'none';
  if (ratePct < assumed('services.failure.good')) return 'under';
  if (ratePct < assumed('services.failure.attention')) return 'review';
  return 'high';
}

/**
 * Service health at a glance (3.2.3, wave V4): the share of services with traffic under the 1 %
 * line, counted in the query over every service (`svc.ranking.total`), and the busiest services
 * as a honeycomb coloured by failure band. The honeycomb draws the ranked list as it is — the 50
 * services with most requests — and says so; it is never counted for a total.
 */
export const ServiceHealth = ({ ranking, totals }: { ranking: CatalogQueryResult; totals: CatalogQueryResult }) => {
  const { t, formatNumber } = useTranslation();
  const factFrom = useSummaryFact();
  const row = totals.records[0];
  const services = num(row, 'services');
  const above = num(row, 'aboveOnePct');
  const healthPct = totals.outcome === 'ok' && services !== null && services > 0 && above !== null ? ((services - above) / services) * 100 : null;

  const tiles = ranking.records.map((record) => {
    const band = failureBand(num(record, 'totalFailures'), num(record, 'failureRatePct'));
    return { name: str(record, 'name') ?? '—', cls: band };
  });

  return (
    <Panel as="section" pad="roomy" className="pvs-spec-band">
      <span className="pvs-spec-band__edge" aria-hidden="true" />
      <div className="pvs-svc-health">
        <GaugeRing
          family="pink-purple"
          value={healthPct}
          valueDisplay={healthPct === null ? undefined : `${Math.round(healthPct)}%`}
          label={t('cc.ring.services.label')}
          caption={services === null ? undefined : t('cc.ring.services.caption', { count: formatNumber(services) })}
          ariaLabel={t('cc.ring.services.aria')}
          missingLabel={t('tl.notMeasured')}
          fact={factFrom(totals, healthPct === null ? null : Math.round(healthPct), { calculation: t('cc.ring.services.calc'), unit: '%' })}
        />
        <Stack gap="tight" className="pvs-svc-health__hive">
          <Heading level={4} as="h2">
            {t('p.svc.hive.title')}
          </Heading>
          <Text className="pvs-caption">{t('p.svc.hive.caption', { shown: formatNumber(tiles.length) })}</Text>
          {tiles.length > 0 && (
            <StatusHexMap
              items={tiles}
              classes={BAND_ORDER.map((band) => ({ key: band, label: t(BAND_LABEL[band]), color: FAILURE_BAND_COLOR[band] }))}
              heads={{ cls: t('v6.hex.band'), count: t('v6.hex.services'), share: t('v6.hex.share') }}
              ariaLabel={t('p.svc.hive.aria', { shown: formatNumber(tiles.length) })}
            />
          )}
        </Stack>
      </div>
    </Panel>
  );
};
