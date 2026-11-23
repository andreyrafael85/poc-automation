import React from 'react';

import { Select } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import {
  AUTONOMY_RUNGS,
  CYCLE_LINKS,
  LINK_KEY,
  LINK_ONWARD,
  RING_LINKS,
  RUNG_KEY,
  type AutonomyRung,
  type CycleLink,
  type ValueCycleReading,
} from './valueCycle';
import './valueCycle.css';

/**
 * 3.7.9 — the Autonomous Value Cycle on the Coverage page (in place of the maturity journey): the ring of the five links
 * around the Foundation, each drawn by the app in SVG (it prints whole), the count of value events the PoC demonstrated in
 * its centre; the autonomy ladder with the rungs demonstrated and the target agreed for this PoC; the two lenses that run
 * across the cycle (AI Observability, runtime security); and one card per link with its question, its value event, what
 * the PoC demonstrated, the next wave and — for the SE and the partner only, never in executive mode nor on paper (D1) —
 * what Professional Services brings.
 */

const RING = { size: 360, centre: 180, radius: 124, stroke: 28, gap: 4 };

function arc(index: number): string {
  const span = 360 / RING_LINKS.length;
  const from = -90 + index * span + RING.gap / 2;
  const to = from + span - RING.gap;
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${(RING.centre + RING.radius * Math.cos(radians)).toFixed(1)} ${(RING.centre + RING.radius * Math.sin(radians)).toFixed(1)}`;
  };
  return `M ${point(from)} A ${RING.radius} ${RING.radius} 0 0 1 ${point(to)}`;
}

function labelAt(index: number): { x: number; y: number } {
  const span = 360 / RING_LINKS.length;
  const radians = ((-90 + index * span + span / 2) * Math.PI) / 180;
  return { x: RING.centre + RING.radius * Math.cos(radians), y: RING.centre + RING.radius * Math.sin(radians) };
}

const NUMBER: Record<CycleLink, string> = { foundation: '00', context: '01', cause: '02', impact: '03', action: '04', prevention: '05' };

export interface ValueCycleProps {
  reading: ValueCycleReading;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
  /** D1: the Professional Services line (the SE and the partner, outside executive mode). */
  showServices: boolean;
  target: AutonomyRung | null;
  /** The SE (or the partner) agrees the target here; absent, the target is read-only. */
  onTarget?: (rung: AutonomyRung | null) => void;
  /** The Tech Wrapup capture: the ring, the ladder and the counts only. */
  compact?: boolean;
}

export const ValueCycle = ({ reading, t, formatNumber, showServices, target, onTarget, compact = false }: ValueCycleProps) => {
  const events = (link: CycleLink) => reading.events.filter((event) => event.link === link);
  const reached = new Set(reading.rungs);
  return (
    <div className="pvs-cycle" data-testid="value-cycle" data-compact={compact ? 'true' : 'false'}>
      <div className="pvs-cycle__top">
        <svg className="pvs-cycle__ring" viewBox={`0 0 ${RING.size} ${RING.size}`} role="img" aria-label={t('cycle.ring.aria', { n: formatNumber(reading.total) })}>
          {RING_LINKS.map((link, index) => {
            const count = reading.demonstrated[link];
            const at = labelAt(index);
            return (
              <g key={link} data-link={link} data-shown={count > 0 ? 'true' : 'false'}>
                <path className="pvs-cycle__arc" d={arc(index)} fill="none" strokeWidth={RING.stroke} />
                <text className="pvs-cycle__arcnum" x={at.x} y={at.y + 5} textAnchor="middle">
                  {NUMBER[link]}
                </text>
              </g>
            );
          })}
          <circle className="pvs-cycle__hub" cx={RING.centre} cy={RING.centre} r={RING.radius - RING.stroke / 2 - 14} />
          <text className="pvs-cycle__hubkicker" x={RING.centre} y={RING.centre - 34} textAnchor="middle">
            {t('cycle.hub.kicker')}
          </text>
          <text className="pvs-cycle__hubfigure" x={RING.centre} y={RING.centre + 12} textAnchor="middle" data-testid="cycle-total">
            {formatNumber(reading.total)}
          </text>
          <text className="pvs-cycle__hubcaption" x={RING.centre} y={RING.centre + 36} textAnchor="middle">
            {t('cycle.hub.caption1')}
          </text>
          <text className="pvs-cycle__hubcaption" x={RING.centre} y={RING.centre + 54} textAnchor="middle">
            {t('cycle.hub.caption2')}
          </text>
        </svg>

        <div className="pvs-cycle__side">
          <ul className="pvs-cycle__legend">
            {RING_LINKS.map((link) => (
              <li key={link} data-link={link}>
                <span className="pvs-cycle__swatch" aria-hidden="true" />
                <span className="pvs-cycle__legendname">
                  {NUMBER[link]} {t(LINK_KEY[link].name)}
                </span>
                <span className="pvs-cycle__legendcount">{t('cycle.count', { n: formatNumber(reading.demonstrated[link]) })}</span>
              </li>
            ))}
          </ul>

          <section className="pvs-cycle__ladder" aria-label={t('cycle.ladder.title')}>
            <Text className="pvs-label">{t('cycle.ladder.title')}</Text>
            <ol className="pvs-cycle__rungs" data-own-numbers>
              {AUTONOMY_RUNGS.map((rung, index) => (
                <li
                  key={rung}
                  className="pvs-cycle__rung"
                  data-reached={reached.has(rung) ? 'true' : 'false'}
                  data-target={target === rung ? 'true' : 'false'}
                  style={{ ['--pvs-rung' as string]: String(index) }}
                >
                  <span>{t(RUNG_KEY[rung])}</span>
                  {target === rung && <span className="pvs-cycle__targettag">{t('cycle.ladder.targetTag')}</span>}
                </li>
              ))}
            </ol>
            <Text className="pvs-caption" data-testid="cycle-ladder-reading">
              {reading.rungs.length === 0
                ? t('cycle.ladder.none')
                : t('cycle.ladder.reached', { rung: t(RUNG_KEY[reading.rungs[reading.rungs.length - 1] ?? 'observe']) })}{' '}
              {target === null ? t('cycle.ladder.noTarget') : t('cycle.ladder.target', { rung: t(RUNG_KEY[target]) })}
            </Text>
            {onTarget !== undefined && !compact && (
              <div className="pvs-cycle__pick" data-print-hide>
                <Text className="pvs-label" id="cycle-target-label">
                  {t('cycle.ladder.pick')}
                </Text>
                <Select
                  value={target ?? 'none'}
                  onChange={(value) => onTarget(typeof value === 'string' && value !== 'none' ? (value as AutonomyRung) : null)}
                  aria-labelledby="cycle-target-label"
                  data-testid="cycle-target"
                >
                  <Select.Content>
                    <Select.Option value="none">{t('cycle.ladder.pickNone')}</Select.Option>
                    {AUTONOMY_RUNGS.map((rung) => (
                      <Select.Option key={rung} value={rung}>
                        {t(RUNG_KEY[rung])}
                      </Select.Option>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            )}
          </section>

          {!compact && (
            <div className="pvs-cycle__lenses">
              <div className="pvs-cycle__lens" data-lens="ai">
                <Text className="pvs-cycle__lenstitle">{t('cycle.lens.ai.title')}</Text>
                <Text className="pvs-caption">
                  {reading.lenses.ai === null ? t('cycle.lens.ai.none') : t('cycle.lens.ai.body', { n: formatNumber(reading.lenses.ai.services) })}
                </Text>
              </div>
              <div className="pvs-cycle__lens" data-lens="security">
                <Text className="pvs-cycle__lenstitle">{t('cycle.lens.sec.title')}</Text>
                <Text className="pvs-caption">
                  {reading.lenses.security === null
                    ? t('cycle.lens.sec.none')
                    : t('cycle.lens.sec.body', { total: formatNumber(reading.lenses.security.total), actNow: formatNumber(reading.lenses.security.actNow) })}
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="pvs-cycle__cards">
          {CYCLE_LINKS.map((link) => {
            const shown = events(link);
            const done = shown.filter((event) => event.state === 'demonstrated');
            const next = shown.filter((event) => event.state === 'next');
            return (
              <article key={link} className="pvs-cycle__card" data-link={link} id={`cycle-${link}`} data-testid={`cycle-card-${link}`}>
                <div className="pvs-cycle__cardhead">
                  <Heading level={4} as="h3">
                    {NUMBER[link]} {t(LINK_KEY[link].name)}
                  </Heading>
                  <span className="pvs-cycle__chip">{t('cycle.count', { n: formatNumber(done.length) })}</span>
                </div>
                <Text className="pvs-cycle__question">{t(LINK_KEY[link].question)}</Text>
                <Paragraph className="pvs-caption">
                  <strong>{t('cycle.valueLabel')}</strong> {t(LINK_KEY[link].value)}
                </Paragraph>
                <ul className="pvs-cycle__events">
                  {done.map((event) => (
                    <li key={event.id} data-state="demonstrated">
                      <span className="pvs-cycle__mark" aria-hidden="true">
                        ✓
                      </span>
                      <span>{t(`cycle.ev.${event.id}` as StringKey)}</span>
                      {event.figure !== null && (
                        <span className="pvs-cycle__fig">
                          {t(
                            event.figure.key,
                            Object.fromEntries(Object.entries(event.figure.params).map(([name, value]) => [name, formatNumber(value)])),
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                  {next.map((event) => (
                    <li key={event.id} data-state="next">
                      <span className="pvs-cycle__mark" aria-hidden="true">
                        →
                      </span>
                      <span>{t(`cycle.ev.${event.id}.next` as StringKey)}</span>
                      <span className="pvs-cycle__fig">{t('cycle.nextTag')}</span>
                    </li>
                  ))}
                  <li data-state="onward">
                    <span className="pvs-cycle__mark" aria-hidden="true">
                      →
                    </span>
                    <span>{t(LINK_ONWARD[link])}</span>
                    <span className="pvs-cycle__fig">{t('cycle.nextTag')}</span>
                  </li>
                </ul>
                {showServices && (
                  <Paragraph className="pvs-cycle__ps" data-print-hide data-testid={`cycle-ps-${link}`}>
                    <strong>{t('cycle.psLabel')}</strong> {t(LINK_KEY[link].ps)}
                  </Paragraph>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
