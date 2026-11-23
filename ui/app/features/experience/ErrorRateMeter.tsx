import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { assumed } from '../../config/assumptions';
import { useTranslation } from '../../i18n/useTranslation';
import { errorBand, errorScaleMax } from '../../models/appFlow';
import type { RumApp } from '../../models/rum';

/**
 * "Errors & quality" on an absolute scale (3.2.6). Until 3.2.5 a bar list scaled every rate to the
 * worst one, so 3.6 % filled the whole track and read like thousands of errors, numbered like a
 * ranking. Now the axis is a percentage with the page's bands drawn behind it (under 1 % good,
 * 1–5 % worth attention, 5 % or more high — the assumption registry's), each row says how many
 * errors out of how many requests, and the worst rate comes first.
 */

/** Rows shown; the rest are counted in one line. */
export const ERROR_ROWS_SHOWN = 8;

export const ErrorRateMeter = ({ apps }: { apps: readonly RumApp[] }) => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  const good = assumed('experience.error.good');
  const attention = assumed('experience.error.attention');
  const measured = apps
    .filter((app): app is RumApp & { errorRatePct: number } => app.errorRatePct !== null && (app.requests ?? 0) > 0)
    .sort((a, b) => b.errorRatePct - a.errorRatePct);
  if (measured.length === 0) return <Text className="pvs-caption">{t('rum.notObserved')}</Text>;

  const max = errorScaleMax(measured.map((app) => app.errorRatePct), attention);
  const pct = (value: number) => Math.min(100, (value / max) * 100);
  const shown = measured.slice(0, ERROR_ROWS_SHOWN);
  const rate = (value: number) => (value === 0 ? '0%' : `${formatDecimal(value, value >= 10 ? 0 : value >= 1 ? 1 : 2)}%`);
  const ticks = [0, good, attention, max].filter((tick, index, list) => tick <= max && list.indexOf(tick) === index);

  return (
    <div className="pvs-errmeter">
      <ul className="pvs-errmeter__rows" aria-label={t('p.dx2.errors.rateAria')}>
        {shown.map((app) => {
          const band = errorBand(app.errorRatePct, good, attention);
          return (
            <li key={app.name} className="pvs-errmeter__row" data-band={band}>
              <Text className="pvs-errmeter__name pvs-truncate" title={app.name}>
                {app.name}
              </Text>
              <div className="pvs-errmeter__track" aria-hidden="true">
                <span className="pvs-errmeter__zone" data-zone="good" style={{ left: '0%', width: `${pct(good).toFixed(2)}%` }} />
                <span className="pvs-errmeter__zone" data-zone="attention" style={{ left: `${pct(good).toFixed(2)}%`, width: `${(pct(attention) - pct(good)).toFixed(2)}%` }} />
                <span className="pvs-errmeter__zone" data-zone="high" style={{ left: `${pct(attention).toFixed(2)}%`, width: `${(100 - pct(attention)).toFixed(2)}%` }} />
                <span className="pvs-errmeter__fill" style={{ width: `${Math.max(0.6, pct(app.errorRatePct)).toFixed(2)}%` }} />
              </div>
              <Text className="pvs-errmeter__value">
                <strong>{rate(app.errorRatePct)}</strong>{' '}
                <span className="pvs-caption">
                  {t('p.dx3.err.of', { errors: formatNumber(app.errors ?? 0), requests: formatNumber(app.requests ?? 0) })}
                </span>
              </Text>
            </li>
          );
        })}
      </ul>
      <div className="pvs-errmeter__axis" aria-hidden="true">
        <span />
        <div className="pvs-errmeter__scale">
          {ticks.map((tick) => (
            <span key={tick} className="pvs-errmeter__tick" style={{ left: `${pct(tick).toFixed(2)}%` }}>
              {rate(tick)}
            </span>
          ))}
        </div>
        <span />
      </div>
      <Text className="pvs-caption">
        {t('p.dx3.err.legend', { good: rate(good), attention: rate(attention) })}
        {measured.length > shown.length ? ` ${t('p.dx3.err.more', { count: formatNumber(measured.length - shown.length) })}` : ''}
      </Text>
    </div>
  );
};
