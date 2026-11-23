import React from 'react';

import { ThresholdGauge } from '../../components/spectrum';
import { assumed } from '../../config/assumptions';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { rateCls, rateInp, rateLcp, type Rating, type RumApp } from '../../models/rum';

export const RATING_LABEL: Record<Rating, StringKey> = {
  good: 'p.dx2.rating.good',
  'needs-improvement': 'p.dx2.rating.ni',
  poor: 'p.dx2.rating.poor',
  'no-data': 'p.dx2.rating.noData',
};

/** The tenant's CLS field is the published score × 10,000 (see the assumptions registry). */
export const CLS_SCALE = 10_000;

/**
 * An application's three Core Web Vitals, each on a half dial with its three published zones
 * (3.2.3). Shared since 3.2.4 by Digital experience and the SE deck's capture of it.
 */
export const VitalsDials = ({ app }: { app: Pick<RumApp, 'lcp' | 'inp' | 'cls'> }) => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  return (
    <div className="pvs-dx-vitals">
      <ThresholdGauge
        label={t('p.dx2.cwv.lcp')}
        value={app.lcp}
        display={app.lcp === null ? '—' : formatDecimal(app.lcp / 1000, 2)}
        unit="s"
        good={assumed('experience.lcp.good')}
        poor={assumed('experience.lcp.poor')}
        max={assumed('experience.lcp.poor') * 1.5}
        rating={rateLcp(app.lcp)}
        ratingLabel={t(RATING_LABEL[rateLcp(app.lcp)])}
        goodLabel={`${formatDecimal(assumed('experience.lcp.good') / 1000, 1)} s`}
        poorLabel={`${formatDecimal(assumed('experience.lcp.poor') / 1000, 1)} s`}
      />
      <ThresholdGauge
        label={t('p.dx2.cwv.inp')}
        value={app.inp}
        display={app.inp === null ? '—' : formatNumber(Math.round(app.inp))}
        unit={t('p.dx2.unit.ms')}
        good={assumed('experience.inp.good')}
        poor={assumed('experience.inp.poor')}
        max={assumed('experience.inp.poor') * 1.6}
        rating={rateInp(app.inp)}
        ratingLabel={t(RATING_LABEL[rateInp(app.inp)])}
        goodLabel={`${formatNumber(assumed('experience.inp.good'))} ${t('p.dx2.unit.ms')}`}
        poorLabel={`${formatNumber(assumed('experience.inp.poor'))} ${t('p.dx2.unit.ms')}`}
      />
      <ThresholdGauge
        label={t('p.dx2.cwv.cls')}
        value={app.cls}
        // The tenant's field reports CLS × 10,000; the dial and the thresholds are written as published.
        display={app.cls === null ? '—' : formatDecimal(app.cls / CLS_SCALE, 3)}
        good={assumed('experience.cls.good')}
        poor={assumed('experience.cls.poor')}
        max={assumed('experience.cls.poor') * 1.6}
        rating={rateCls(app.cls)}
        ratingLabel={t(RATING_LABEL[rateCls(app.cls)])}
        goodLabel={formatDecimal(assumed('experience.cls.good') / CLS_SCALE, 2)}
        poorLabel={formatDecimal(assumed('experience.cls.poor') / CLS_SCALE, 2)}
      />
    </div>
  );
};
