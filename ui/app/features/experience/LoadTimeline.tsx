import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';

import { useTranslation } from '../../i18n/useTranslation';
import { durationTicks } from '../../models/appFlow';
import { rateTtfb, type RumApp } from '../../models/rum';
import { RATING_LABEL } from './VitalsDials';

/**
 * "Navigation & responsiveness (p75)" as a picture (3.2.6): the page load of real users on one
 * time axis — the server's first byte, the DOM becoming interactive, the load event — and, below,
 * a user action's duration, each at its 75th percentile. Until 3.2.5 these were six rows of
 * numbers (two of them counts, not timings) with nothing to compare them against.
 *
 * The segments are cumulative milestones of one navigation, so they are drawn end to end only in
 * their natural order; a timing out of order (a partial read) is listed, not drawn.
 */

type Segment = 'server' | 'dom' | 'load' | 'action';

export const LoadTimeline = ({ app }: { app: Pick<RumApp, 'name' | 'ttfb' | 'dom' | 'load' | 'actionDur'> }) => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  const duration = (ms: number) => (ms >= 1000 ? `${formatDecimal(ms / 1000, ms >= 10_000 ? 0 : 1)} s` : `${formatNumber(Math.round(ms))} ms`);
  // An axis tick is a round number: "1 s", "1.5 s", "250 ms".
  const tickLabel = (ms: number) => (ms === 0 ? '0' : ms >= 1000 ? `${Number.isInteger(ms / 1000) ? formatNumber(ms / 1000) : formatDecimal(ms / 1000, 1)} s` : `${formatNumber(ms)} ms`);
  const values = [app.ttfb, app.dom, app.load, app.actionDur].filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) return <Text className="pvs-caption">{t('rum.notObserved')}</Text>;

  const { max, ticks } = durationTicks(Math.max(...values));
  const pct = (ms: number) => Math.min(100, (ms / max) * 100);
  const segments: { key: Segment; from: number; to: number }[] = [];
  let from = 0;
  for (const [key, value] of [
    ['server', app.ttfb],
    ['dom', app.dom],
    ['load', app.load],
  ] as const) {
    if (value === null || value < from) continue;
    segments.push({ key, from, to: value });
    from = value;
  }
  const pageEnd = segments.length === 0 ? null : (segments[segments.length - 1]?.to ?? null);
  const ttfbRating = rateTtfb(app.ttfb);
  const legend: { key: Segment; label: string; value: number | null }[] = [
    { key: 'server', label: t('p.dx3.load.ttfb'), value: app.ttfb },
    { key: 'dom', label: t('p.dx3.load.dom'), value: app.dom },
    { key: 'load', label: t('p.dx3.load.load'), value: app.load },
    { key: 'action', label: t('p.dx3.load.action'), value: app.actionDur },
  ];

  return (
    <figure
      className="pvs-loadline"
      aria-label={t('p.dx3.load.aria', {
        app: app.name,
        ttfb: app.ttfb === null ? '—' : duration(app.ttfb),
        dom: app.dom === null ? '—' : duration(app.dom),
        load: app.load === null ? '—' : duration(app.load),
        action: app.actionDur === null ? '—' : duration(app.actionDur),
      })}
    >
      <div className="pvs-loadline__grid" aria-hidden="true">
        <Text className="pvs-loadline__name">{t('p.dx3.load.page')}</Text>
        <div className="pvs-loadline__track">
          {segments.map((segment) => (
            <span
              key={segment.key}
              className="pvs-loadline__seg"
              data-seg={segment.key}
              style={{ left: `${pct(segment.from).toFixed(2)}%`, width: `${Math.max(0.8, pct(segment.to) - pct(segment.from)).toFixed(2)}%` }}
            />
          ))}
        </div>
        <Text className="pvs-loadline__value">{pageEnd === null ? '—' : duration(pageEnd)}</Text>

        {app.actionDur !== null && (
          <>
            <Text className="pvs-loadline__name">{t('p.dx3.load.action')}</Text>
            <div className="pvs-loadline__track">
              <span className="pvs-loadline__seg" data-seg="action" style={{ left: '0%', width: `${Math.max(0.8, pct(app.actionDur)).toFixed(2)}%` }} />
            </div>
            <Text className="pvs-loadline__value">{duration(app.actionDur)}</Text>
          </>
        )}

        <span />
        <div className="pvs-loadline__axis">
          {ticks.map((tick) => (
            <span key={tick} className="pvs-loadline__tick" style={{ left: `${pct(tick).toFixed(2)}%` }}>
              {tickLabel(tick)}
            </span>
          ))}
        </div>
        <span />
      </div>

      <ul className="pvs-loadline__legend">
        {legend.map((entry) => (
          <li key={entry.key} data-seg={entry.key}>
            <span className="pvs-loadline__swatch" aria-hidden="true" />
            <Text>{entry.label}</Text>
            <strong>{entry.value === null ? t('rum.notObserved') : duration(entry.value)}</strong>
            {entry.key === 'server' && app.ttfb !== null && (
              <span className="pvs-loadline__rating" data-rating={ttfbRating}>
                {t(RATING_LABEL[ttfbRating])}
              </span>
            )}
          </li>
        ))}
      </ul>
    </figure>
  );
};
