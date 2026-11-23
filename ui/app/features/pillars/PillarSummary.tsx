import React from 'react';

import { Chip, Skeleton } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon, CriticalIcon, InformationIcon, PendingIcon } from '@dynatrace/strato-icons';

import { useStudio } from '../../config/StudioContext';
import { Callout, Cluster, Figure, Stack } from '../../engine';
import { useTranslation, type Translation } from '../../i18n/useTranslation';
import { PALETTE } from '../../design/palette';
import { criterionPillar, type CriterionResult, type CriterionStatus } from '../../models/criteria';
import type { PointMetric } from '../../models/pillars';
import { useCriteriaResults, useCriterionFormat, useCriterionWords } from '../criteria/CriteriaPanel';
import { PILLAR_LOOK } from './pillarLook';
import { usePillarEvidence, type MetricReading, type PillarEvidence, type PointEvidence } from './usePillarEvidence';

/**
 * The agreed value pillars, measured against this tenant.
 *
 * 3.2.6 redesign: the 3.2.5 cards stacked every point's chips, figures and badges and closed with a
 * "Limitation" callout — dense for the manager the Overview and the Executive summary speak to. A
 * pillar is now one tile: how much of it the PoC has proven, a dot per validation point, the
 * strongest measured proof, and the objectives of the PoC plan tied to it (Settings → PoC plan),
 * each with its live verdict. The report adds the evidence per point (`variant="detailed"`).
 *
 * ## Colour discipline
 *
 * The tile's family is the pillar's identity, never a verdict. The dots: green measured, blue
 * partly measured, a hollow ring for what this app cannot measure — a scope statement about the
 * review, not a fault in the customer's estate, so never amber or red. Only an objective's own
 * verdict (met / not met) carries success or critical colour, as it does everywhere else.
 */

/**
 * Formats a reduced metric for display.
 *
 * Locale-aware, and unit-aware: nanoseconds become hours because nobody reads
 * `41400000000000`, and microseconds become milliseconds for the same reason.
 */
export function formatMetric(
  value: number | string | null,
  unit: PointMetric['unit'],
  format: Translation['formatNumber'],
): string {
  if (value === null) return '—';
  if (typeof value === 'string') return value;

  switch (unit) {
    case 'percent':
      return `${format(value, { maximumFractionDigits: 1 })}%`;
    case 'duration-ns': {
      const hours = value / 3_600_000_000_000;
      return hours >= 1
        ? `${format(hours, { maximumFractionDigits: 1 })} h`
        : `${format(value / 60_000_000_000, { maximumFractionDigits: 0 })} min`;
    }
    case 'microseconds': {
      const ms = value / 1000;
      return ms >= 1
        ? `${format(ms, { maximumFractionDigits: 0 })} ms`
        : `${format(value, { maximumFractionDigits: 0 })} µs`;
    }
    case 'bytes':
      return format(value, { maximumFractionDigits: 0 });
    case 'text':
      return String(value);
    default:
      return format(value, { maximumFractionDigits: 0 });
  }
}

const STATUS_LABEL = {
  evidenced: 'pillar.status.evidenced',
  partial: 'pillar.status.partial',
  'not-evidenced': 'pillar.status.not-evidenced',
  measuring: 'pillar.status.measuring',
} as const;

/** Half credit for a partly evidenced point — a presentation choice, said in the tile's caption. */
export function pillarStrength(evidence: Pick<PillarEvidence, 'evidenced' | 'partial' | 'total'>): number {
  return evidence.total === 0 ? 0 : ((evidence.evidenced + evidence.partial * 0.5) / evidence.total) * 100;
}

/** The strongest proof of a pillar: its first measured readings, in the order of its points. */
export function pillarProof(evidence: PillarEvidence, max = 2): MetricReading[] {
  const measured = evidence.points.flatMap((point) => (point.status === 'evidenced' || point.status === 'partial' ? point.readings : []));
  return measured.filter((reading) => reading.value !== null && typeof reading.value === 'number').slice(0, max);
}

type GoalTone = 'met' | 'not-met' | 'open';

const goalTone = (status: CriterionStatus): GoalTone =>
  status === 'met' || status === 'manual-met' ? 'met' : status === 'not-met' || status === 'manual-not-met' ? 'not-met' : 'open';

const GoalIcon = ({ tone, status }: { tone: GoalTone; status: CriterionStatus }) => {
  if (tone === 'met') return <CheckmarkIcon />;
  if (tone === 'not-met') return <CriticalIcon />;
  return status === 'measuring' || status === 'manual-pending' ? <PendingIcon /> : <InformationIcon />;
};

const PointDots = ({ points }: { points: readonly PointEvidence[] }) => {
  const { t } = useTranslation();
  return (
    <span className="pvs-pillar__dots">
      {points.map((point) => (
        <span
          key={point.point.id}
          className="pvs-pillar__dot"
          data-status={point.status}
          title={`${t(point.point.labelKey)} — ${t(STATUS_LABEL[point.status])}`}
        />
      ))}
    </span>
  );
};

const PointList = ({ points }: { points: readonly PointEvidence[] }) => {
  const { t, formatNumber } = useTranslation();
  return (
    <ul className="pvs-pillar__points">
      {points.map((point) => {
        const values = point.readings.filter((reading) => reading.value !== null);
        return (
          <li key={point.point.id} className="pvs-pillar__point">
            <span className="pvs-pillar__dot" data-status={point.status} aria-hidden="true" />
            <span className="pvs-pillar__point-body">
              <Text className="pvs-pillar__point-name">
                {t(point.point.labelKey)} <span className="pvs-caption">· {t(STATUS_LABEL[point.status])}</span>
              </Text>
              {values.length > 0 && (
                <Text className="pvs-caption">
                  {values.map((reading) => `${t(reading.metric.labelKey)}: ${formatMetric(reading.value, reading.metric.unit, formatNumber)}`).join(' · ')}
                </Text>
              )}
              {point.missingScopes.length > 0 && <Text className="pvs-caption">{t('pillar.blockedBy', { scopes: point.missingScopes.join(', ') })}</Text>}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

const PillarTile = ({ evidence, goals, detailed }: { evidence: PillarEvidence; goals: readonly CriterionResult[]; detailed: boolean }) => {
  const { t, formatNumber } = useTranslation();
  const words = useCriterionWords({ short: true });
  const format = useCriterionFormat();
  const { pillar, points, evidenced, partial, measuring, total } = evidence;
  const look = PILLAR_LOOK[pillar.id];
  const strength = pillarStrength(evidence);
  const proof = pillarProof(evidence);
  const met = goals.filter((goal) => goalTone(goal.status) === 'met').length;

  return (
    <li className="pvs-pillar" data-spectrum={look.family}>
      <span className="pvs-pillar__edge" aria-hidden="true" />
      <div className="pvs-pillar__head">
        <span className="pvs-pillar__emblem" aria-hidden="true">
          <look.Icon />
        </span>
        <Stack gap="tight">
          <Heading level={5} as="h3" className="pvs-pillar__title">
            {t(pillar.titleKey)}
          </Heading>
          <Text className="pvs-caption">{t(pillar.roiKey)}</Text>
        </Stack>
      </div>

      <div className="pvs-pillar__score">
        {measuring > 0 && evidenced + partial === 0 ? (
          <Skeleton height={36} width={72} />
        ) : (
          <Figure value={formatNumber(Math.round(strength))} unit="%" size="lg" ink="spectrum" />
        )}
        <Stack gap="tight">
          <Text className="pvs-pillar__proven">{t('pillar.tile.proven', { evidenced: String(evidenced), total: String(total) })}</Text>
          <PointDots points={points} />
        </Stack>
      </div>

      {proof.length > 0 && (
        <p className="pvs-pillar__proof">
          {proof.map((reading, index) => (
            <span key={reading.metric.id}>
              {index > 0 && ' · '}
              <strong>{formatMetric(reading.value, reading.metric.unit, formatNumber)}</strong> {t(reading.metric.labelKey).toLowerCase()}
            </span>
          ))}
        </p>
      )}

      <div className="pvs-pillar__goals">
        <Text className="pvs-label">
          {goals.length === 0 ? t('pillar.tile.noGoals') : t('pillar.tile.goals', { met: String(met), total: String(goals.length) })}
        </Text>
        {goals.length > 0 && (
          <ul className="pvs-pillar__goal-list">
            {goals.map((goal) => {
              const tone = goalTone(goal.status);
              return (
                <li key={goal.criterion.id} className="pvs-pillar__goal" data-tone={tone}>
                  <span className="pvs-pillar__goal-icon" aria-hidden="true">
                    <GoalIcon tone={tone} status={goal.status} />
                  </span>
                  <Text>
                    {words(goal)}
                    {goal.metric !== null && goal.value !== null && <span className="pvs-caption"> — {format(goal.value, goal.metric.unit)}</span>}
                  </Text>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detailed && <PointList points={points} />}
    </li>
  );
};

export interface PillarSummaryProps {
  /** Set false to skip the queries entirely, e.g. on a screen that is hidden. */
  enabled?: boolean;
  /** `compact` — the manager's view (Overview, Executive summary); `detailed` adds the evidence per point (the report). */
  variant?: 'compact' | 'detailed';
  /** Objectives the page already evaluated; read here otherwise. */
  results?: readonly CriterionResult[];
}

export const PillarSummary = ({ enabled = true, variant = 'compact', results }: PillarSummaryProps) => {
  const { timeframeLabel, pocPlan } = useStudio();
  const { t, tWindow } = useTranslation();
  const { pillars } = usePillarEvidence(enabled);
  // The page's own evaluation when it has one: the hooks run either way, the queries only when needed.
  const own = useCriteriaResults(results === undefined && enabled ? pocPlan.criteria : []);
  const objectives = results ?? own;
  const anyUnproven = pillars.some((pillar) => pillar.notEvidenced > 0);

  return (
    <Stack as="section" gap="group" className="pvs-pillars">
      <Stack gap="tight">
        <Cluster align="baseline">
          <Heading level={4} as="h2">
            {t('pillar.section.title')}
          </Heading>
          <Chip color={PALETTE.info} variant="accent" size="condensed">
            {t('pillar.measuredOver', { window: tWindow(timeframeLabel) })}
          </Chip>
        </Cluster>
        <Paragraph className="pvs-prose pvs-muted">{t('pillar.section.lead')}</Paragraph>
      </Stack>

      {pillars.length === 0 ? (
        <Callout kind="pending" title={t('callout.pending')}>
          {t('pillar.noneInPlan')}
        </Callout>
      ) : (
        <>
          <ul className="pvs-pillars__grid" data-variant={variant}>
            {pillars.map((evidence) => (
              <PillarTile
                key={evidence.pillar.id}
                evidence={evidence}
                goals={objectives.filter((result) => criterionPillar(result.criterion) === evidence.pillar.id)}
                detailed={variant === 'detailed'}
              />
            ))}
          </ul>
          <Text className="pvs-caption">
            {t('pillar.tile.howToRead')}
            {anyUnproven ? ` ${t('pillar.honestyShort')}` : ''}
          </Text>
        </>
      )}
    </Stack>
  );
};
