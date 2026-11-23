import React from 'react';

import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { CheckmarkIcon, CriticalIcon, InformationIcon, PendingIcon } from '@dynatrace/strato-icons';

import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery, type CatalogQueryResult } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { CRITERION_METRICS, criteriaQueries, criteriaScore, evaluateCriterion, type CriterionResult, type CriterionStatus, type CriterionUnit } from '../../models/criteria';
import type { SuccessCriterion } from '../../models/pocPlan';
import { GaugeRing } from '../../components/spectrum';
import type { CatalogId } from '../../queries/catalog';

/**
 * "Objectives × what was proven" (3.2.5, milestone M5): each success criterion agreed in Settings,
 * judged live from the query that measures it. Shown on the PoC Timeline and in the general report.
 */

/** Each criterion with its live verdict. Only the queries the criteria name are run. */
export function useCriteriaResults(criteria: readonly SuccessCriterion[]): CriterionResult[] {
  const scope = useQueryScope();
  const needed = criteriaQueries(criteria);
  const run = (id: CatalogId) => ({ ...scope, enabled: needed.has(id) });
  const results: Partial<Record<CatalogId, CatalogQueryResult>> = {
    'cov.inventory': useCatalogQuery('cov.inventory', run('cov.inventory')),
    'svc.ranking.total': useCatalogQuery('svc.ranking.total', run('svc.ranking.total')),
    'prob.mttx': useCatalogQuery('prob.mttx', run('prob.mttx')),
    'prob.exposure': useCatalogQuery('prob.exposure', run('prob.exposure')),
    'prob.summary': useCatalogQuery('prob.summary', run('prob.summary')),
    'prob.recurrent.total': useCatalogQuery('prob.recurrent.total', run('prob.recurrent.total')),
    'auto.workflows.total': useCatalogQuery('auto.workflows.total', run('auto.workflows.total')),
    'sec.posture': useCatalogQuery('sec.posture', run('sec.posture')),
    'rum.audience.total': useCatalogQuery('rum.audience.total', run('rum.audience.total')),
  };
  return criteria.map((criterion) => {
    if (criterion.metric === 'manual') return evaluateCriterion(criterion, [], null);
    const result = results[CRITERION_METRICS[criterion.metric].queryId];
    return evaluateCriterion(criterion, result?.records ?? [], result?.outcome ?? null);
  });
}

export const STATUS: Record<CriterionStatus, { key: StringKey; tone: 'met' | 'not-met' | 'neutral' }> = {
  met: { key: 'crit.status.met', tone: 'met' },
  'not-met': { key: 'crit.status.notMet', tone: 'not-met' },
  measuring: { key: 'crit.status.measuring', tone: 'neutral' },
  'not-read': { key: 'crit.status.notRead', tone: 'neutral' },
  'no-target': { key: 'crit.status.noTarget', tone: 'neutral' },
  'manual-met': { key: 'crit.status.manualMet', tone: 'met' },
  'manual-not-met': { key: 'crit.status.manualNotMet', tone: 'not-met' },
  'manual-pending': { key: 'crit.status.manualPending', tone: 'neutral' },
};

const StatusIcon = ({ status }: { status: CriterionStatus }) => {
  if (status === 'met' || status === 'manual-met') return <CheckmarkIcon />;
  if (status === 'not-met' || status === 'manual-not-met') return <CriticalIcon />;
  if (status === 'measuring' || status === 'manual-pending') return <PendingIcon />;
  return <InformationIcon />;
};

/** A figure in a criterion's unit. */
export function useCriterionFormat(): (value: number, unit: CriterionUnit) => string {
  const { formatNumber, formatDecimal } = useTranslation();
  return (value, unit) =>
    unit === 'percent' ? `${formatDecimal(value, value >= 10 ? 0 : 1)}%` : unit === 'hours' ? `${formatDecimal(value, value >= 10 ? 0 : 1)} h` : formatNumber(Math.round(value));
}

/**
 * The words of a criterion: its own text, or the metric, operator and target. `short` (the deck's
 * table) keeps the agreed text and the target only — the measured figure has a column of its own.
 */
export function useCriterionWords(options: { short?: boolean } = {}): (result: CriterionResult) => string {
  const { t } = useTranslation();
  const format = useCriterionFormat();
  return (result) => {
    const { criterion, metric } = result;
    if (metric === null) return criterion.text;
    const rule = criterion.target === null ? '' : `${criterion.operator === '>=' ? '≥' : '≤'} ${format(criterion.target, metric.unit)}`;
    const goal = rule === '' ? t(metric.labelKey) : `${t(metric.labelKey)} ${rule}`;
    if (criterion.text === '') return goal;
    if (options.short === true) return rule === '' ? criterion.text : `${criterion.text} (${rule})`;
    return `${criterion.text} (${goal})`;
  };
}

export const CriteriaPanel = ({
  results,
  headingLevel = 3,
  ring = false,
}: {
  results: readonly CriterionResult[];
  headingLevel?: 3 | 4;
  /** 3.3.14: the share of criteria met on a ring beside the list (the PoC Timeline). */
  ring?: boolean;
}) => {
  const { t } = useTranslation();
  const format = useCriterionFormat();
  const words = useCriterionWords();
  const score = criteriaScore(results);
  const list = (
    <Stack gap="group" className="pvs-svc-health__hive">
      <Stack gap="tight">
        <Heading level={headingLevel} as={headingLevel === 3 ? 'h2' : 'h3'}>
          {t('crit.panel.title')}
        </Heading>
        <Paragraph className="pvs-prose">
          {results.length === 0 ? t('crit.panel.none') : t('crit.panel.score', { met: String(score.met), total: String(score.total) })}
        </Paragraph>
      </Stack>
      {results.length > 0 && (
        <ol className="pvs-criteria__list">
          {results.map((result) => {
            const status = STATUS[result.status];
            return (
              <li key={result.criterion.id} className="pvs-criteria__item" data-tone={status.tone}>
                <span className="pvs-criteria__icon" aria-hidden="true">
                  <StatusIcon status={result.status} />
                </span>
                <div className="pvs-criteria__body">
                  <Text className="pvs-criteria__goal">{words(result)}</Text>
                  <div className="pvs-criteria__meta">
                    <Text className="pvs-criteria__status">{t(status.key)}</Text>
                    {result.metric !== null && result.value !== null && (
                      <Text className="pvs-caption">{t('crit.panel.measured', { value: format(result.value, result.metric.unit) })}</Text>
                    )}
                    {result.criterion.origin !== '' && <Text className="pvs-caption">{t('crit.panel.origin', { origin: result.criterion.origin })}</Text>}
                  </div>
                  {result.progressPct !== null && (
                    <div
                      className="pvs-criteria__bar"
                      role="img"
                      aria-label={t('crit.panel.progress', { pct: String(Math.round(result.progressPct)) })}
                    >
                      <span className="pvs-criteria__fill" style={{ width: `${Math.max(2, Math.round(result.progressPct))}%` }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Stack>
  );
  const showRing = ring && score.total > 0;
  return (
    <Panel as="section" pad="roomy" className={showRing ? 'pvs-criteria pvs-spec-band' : 'pvs-criteria'}>
      {showRing ? (
        <>
          <span className="pvs-spec-band__edge" aria-hidden="true" />
          <div className="pvs-svc-health">
            <GaugeRing
              family="moss"
              value={(score.met / score.total) * 100}
              valueDisplay={`${score.met}/${score.total}`}
              label={t('ringrank.crit.label')}
              caption={t('ringrank.crit.caption', { pct: String(Math.round((score.met / score.total) * 100)) })}
              ariaLabel={t('ringrank.crit.aria', { met: String(score.met), total: String(score.total) })}
              missingLabel={t('tl.notMeasured')}
            />
            {list}
          </div>
        </>
      ) : (
        list
      )}
    </Panel>
  );
};
