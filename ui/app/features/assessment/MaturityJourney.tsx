import React from 'react';

import { CheckmarkIcon } from '@dynatrace/strato-icons';

import type { StringKey } from '../../i18n/strings';
import type { Translation } from '../../i18n/useTranslation';
import { LEVEL_KEY, PILLAR_KEY, type MaturityLevel, type MaturityPillar, type MaturityReading } from './maturity';
import './assessment.css';

const STATE_KEY = { met: 'asm.mat.state.met', open: 'asm.mat.state.open', unread: 'asm.mat.state.unread' } as const;

/** Each pillar keeps its hue everywhere: ring, legend dot and criterion tag. */
export const PILLAR_FAMILY: Record<MaturityPillar, 'blue' | 'turquoise' | 'pink-purple' | 'orange'> = {
  visibility: 'blue',
  context: 'turquoise',
  experience: 'pink-purple',
  operations: 'orange',
};

const RING_SIZE = 220;
const RING_STROKE = 12;
const RING_GAP = 3;

/**
 * Four concentric rings, one per pillar, like activity rings: a ring closes as its pillar climbs the five steps
 * (step 1 = empty, step 5 = closed). The centre names the step reached. The rings are drawn for the eye; the same
 * steps are written beside them, so nothing rests on colour or arc length alone.
 */
const MaturityRings = ({ reading, t }: { reading: MaturityReading; t: Translation['t'] }) => {
  const centre = RING_SIZE / 2;
  return (
    <svg
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="pvs-mat-rings"
      role="img"
      aria-label={t('asm.mat.rings.aria', { level: String(reading.level), name: t(LEVEL_KEY[reading.level].name) })}
    >
      {reading.pillars.map((entry, index) => {
        const radius = centre - RING_STROKE / 2 - index * (RING_STROKE + RING_GAP);
        const length = 2 * Math.PI * radius;
        const fraction = (entry.level - 1) / 4;
        const id = `pvs-mat-ring-${entry.pillar}`;
        return (
          <g key={entry.pillar} data-spectrum={PILLAR_FAMILY[entry.pillar]} className="pvs-mat-rings__ring">
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" className="pvs-sp-stop-from" />
                <stop offset="1" className="pvs-sp-stop-to" />
              </linearGradient>
            </defs>
            <circle className="pvs-mat-rings__track" cx={centre} cy={centre} r={radius} strokeWidth={RING_STROKE} />
            {fraction > 0 && (
              <circle
                className="pvs-mat-rings__arc"
                cx={centre}
                cy={centre}
                r={radius}
                strokeWidth={RING_STROKE}
                stroke={`url(#${id})`}
                strokeDasharray={`${(length * fraction).toFixed(1)} ${length.toFixed(1)}`}
                transform={`rotate(-90 ${centre} ${centre})`}
              />
            )}
          </g>
        );
      })}
      <text x={centre} y={centre - 2} textAnchor="middle" className="pvs-mat-rings__level">
        {`${reading.level}/5`}
      </text>
      <text x={centre} y={centre + 18} textAnchor="middle" className="pvs-mat-rings__name">
        {t(LEVEL_KEY[reading.level].name)}
      </text>
    </svg>
  );
};

/**
 * The maturity journey (3.4.3; a staircase in 3.4.5; rebuilt in 3.4.7 at the owner's review of 3.4.6 — "temos que
 * lembrar que a plataforma Dynatrace vai ajudar o cliente a subir seu nível de maturidade": positive wording,
 * criteria in tune with Dynatrace's maturity materials, a clearer picture of each step).
 *
 * Three layers, top to bottom:
 *  1. the rings and the reading in words — where the environment stands today, what is already in place, and the
 *     next steps with Dynatrace;
 *  2. the spectrum of the five steps, the current one marked "You are here";
 *  3. the staircase of steps with their criteria, four per step, one per pillar, each tagged with its pillar.
 */
export const MaturityJourney = ({
  reading,
  t,
  formatNumber,
  compact = false,
}: {
  reading: MaturityReading;
  t: Translation['t'];
  formatNumber: Translation['formatNumber'];
  /** 3.4.10: the rings, the reading and the spectrum only — the Tech Wrapup's picture of the journey. */
  compact?: boolean;
}) => {
  const next = reading.level < 5 ? ((reading.level + 1) as MaturityLevel) : null;
  const nextOpen = next === null ? [] : reading.criteria.filter((criterion) => criterion.level === next && criterion.state !== 'met');
  const metTotal = reading.criteria.filter((criterion) => criterion.state === 'met').length;
  const label = (id: string, params: Record<string, string>) => t(`asm.mat.c.${id}` as StringKey, params);
  return (
    <div className="pvs-mat" data-testid="asm-maturity">
      <div className="pvs-mat__hero" data-print-atom>
        <MaturityRings reading={reading} t={t} />
        <div className="pvs-mat__reading">
          <p className="pvs-mat__now">{t('asm.mat.now', { level: String(reading.level), name: t(LEVEL_KEY[reading.level].name) })}</p>
          <p className="pvs-mat__inplace">{t('asm.mat.inPlace', { met: formatNumber(metTotal), total: formatNumber(reading.criteria.length) })}</p>
          <ul className="pvs-mat__pillars" aria-label={t('asm.mat.pillars')}>
            {reading.pillars.map((entry) => (
              <li key={entry.pillar} className="pvs-mat__pillar" data-spectrum={PILLAR_FAMILY[entry.pillar]}>
                <span className="pvs-mat__dot" aria-hidden="true" />
                <span className="pvs-mat__pillar-name">{t(PILLAR_KEY[entry.pillar])}</span>
                <span className="pvs-mat__pillar-level">{t('asm.mat.pillarLevel', { level: String(entry.level), name: t(LEVEL_KEY[entry.level].name) })}</span>
              </li>
            ))}
          </ul>
          {next === null ? (
            <p className="pvs-mat__next">{t('asm.mat.top')}</p>
          ) : (
            <div className="pvs-mat__next">
              <p>{t('asm.mat.next', { name: t(LEVEL_KEY[next].name) })}</p>
              <ul>
                {nextOpen.map((criterion) => (
                  <li key={criterion.id}>
                    <strong>{t(PILLAR_KEY[criterion.pillar])}:</strong> {label(criterion.id, criterion.params)}
                    {criterion.state === 'unread' && <span className="pvs-mat__state"> · {t(STATE_KEY.unread)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ol className="pvs-mat-spectrum" aria-label={t('asm.mat.spectrum')} data-print-atom>
        {([1, 2, 3, 4, 5] as const).map((level) => {
          const position = level < reading.level ? 'reached' : level === reading.level ? 'current' : 'ahead';
          return (
            <li key={level} className="pvs-mat-spectrum__step" data-position={position} style={{ '--pvs-i': level - 1 } as React.CSSProperties}>
              <span className="pvs-mat-spectrum__here">{position === 'current' ? t('asm.mat.here') : ''}</span>
              <span className="pvs-mat-spectrum__bar" aria-hidden="true" />
              <span className="pvs-mat-spectrum__num">{String(level).padStart(2, '0')}</span>
              <span className="pvs-mat-spectrum__name">{t(LEVEL_KEY[level].name)}</span>
            </li>
          );
        })}
      </ol>

      {!compact && (
      <ol className="pvs-mat__stairs" aria-label={t('asm.mat.title')}>
        {([1, 2, 3, 4, 5] as const).map((level: MaturityLevel) => {
          const stats = reading.perLevel.find((entry) => entry.level === level);
          const position = level < reading.level ? 'reached' : level === reading.level ? 'current' : 'ahead';
          return (
            <li key={level} className="pvs-mat__step" data-position={position} style={{ '--pvs-step': level } as React.CSSProperties} data-print-atom>
              <div className="pvs-mat__riser" aria-hidden="true">
                <span className="pvs-mat__badge">{String(level).padStart(2, '0')}</span>
              </div>
              <div className="pvs-mat__card">
                <span className="pvs-mat__name">{t(LEVEL_KEY[level].name)}</span>
                {position === 'current' && <span className="pvs-mat__here">{t('asm.mat.here')}</span>}
                <span className="pvs-mat__tag">{t(LEVEL_KEY[level].tag)}</span>
                <span className="pvs-mat__text">{t(LEVEL_KEY[level].text)}</span>
                {stats !== undefined && stats.total > 0 && (
                  <>
                    <span className="pvs-mat__progress">
                      <span className="pvs-mat__bar" aria-hidden="true">
                        <span style={{ width: `${((stats.met / stats.total) * 100).toFixed(0)}%` }} />
                      </span>
                      {position === 'ahead' && stats.met === 0
                        ? t('asm.mat.aheadProgress', { total: formatNumber(stats.total) })
                        : t('asm.mat.progress', { met: formatNumber(stats.met), total: formatNumber(stats.total) })}
                    </span>
                    <ul className="pvs-mat__criteria">
                      {reading.criteria
                        .filter((criterion) => criterion.level === level)
                        .map((criterion) => (
                          <li key={criterion.id} className="pvs-mat__criterion" data-state={criterion.state}>
                            <span className="pvs-mat__mark" aria-hidden="true">
                              {criterion.state === 'met' ? <CheckmarkIcon /> : criterion.state === 'open' ? '→' : '?'}
                            </span>
                            <span>
                              <span className="pvs-mat__ptag" data-spectrum={PILLAR_FAMILY[criterion.pillar]}>
                                {t(PILLAR_KEY[criterion.pillar])}
                              </span>
                              {label(criterion.id, criterion.params)}
                              <span className="pvs-mat__state"> · {t(STATE_KEY[criterion.state])}</span>
                            </span>
                          </li>
                        ))}
                    </ul>
                    {position === 'ahead' && stats.met === stats.total && <span className="pvs-mat__ahead-met">{t('asm.mat.aheadMet')}</span>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      )}
      {reading.mayBeHigher && <p className="pvs-caption">{t('asm.mat.mayBeHigher')}</p>}
    </div>
  );
};
