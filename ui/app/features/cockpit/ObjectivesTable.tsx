import React from 'react';

import { ChartFrame } from '../../components/ChartFrame';
import { useStudio } from '../../config/StudioContext';
import { ActionTable, type ActionRow } from '../../engine/chart/ActionTable';
import { STATUS_RANK, type ChartStatus } from '../../engine/chart/status';
import { useTranslation } from '../../i18n/useTranslation';
import type { CriterionStatus } from '../../models/criteria';
import { STATUS as CRITERION_STATUS, useCriteriaResults, useCriterionFormat, useCriterionWords } from '../criteria/CriteriaPanel';

/**
 * "PoC objectives × measured" (3.3.8, the Executive summary's cockpit panel): every success
 * criterion of the PoC plan in one table — the objective, how far it got, the measured value, the
 * target, and its status in the criteria's own words. Not met first. The values come from the same
 * evaluation as the PoC Timeline (`useCriteriaResults`); nothing here is new arithmetic.
 */

const TONE: Record<CriterionStatus, ChartStatus> = {
  'not-met': 'critical',
  'manual-not-met': 'critical',
  measuring: 'warning',
  'not-read': 'warning',
  'no-target': 'warning',
  'manual-pending': 'warning',
  met: 'good',
  'manual-met': 'good',
};

export const ObjectivesTable = () => {
  const { pocPlan } = useStudio();
  const { t } = useTranslation();
  const results = useCriteriaResults(pocPlan.criteria);
  const format = useCriterionFormat();
  const words = useCriterionWords({ short: true });
  if (results.length === 0) return null;

  const rows: ActionRow[] = results
    .map((result, index) => {
      const unit = result.metric?.unit;
      const target = result.criterion.target;
      return {
        key: `${result.criterion.id}-${index}`,
        // The target has a column of its own: the objective is its agreed words (or the metric).
        entity: result.criterion.text !== '' ? result.criterion.text : words(result),
        signal: result.metric === null ? t('cockpit.obj.manual') : t(result.metric.labelKey),
        share: (result.progressPct ?? 0) / 100,
        measured: result.value === null || unit === undefined ? '—' : format(result.value, unit),
        versus: target === null || unit === undefined ? '—' : `${result.criterion.operator === '>=' ? '≥' : '≤'} ${format(target, unit)}`,
        status: TONE[result.status],
        statusText: t(CRITERION_STATUS[result.status].key),
      };
    })
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  const met = results.filter((result) => result.status === 'met' || result.status === 'manual-met').length;

  return (
    <ChartFrame
      role="exposure"
      title={t('cockpit.obj.title')}
      provenance="derived"
      trailing={<span className="pvs-caption">{t('cockpit.obj.count', { met: String(met), total: String(results.length) })}</span>}
      caption={t('cockpit.obj.caption')}
    >
      <ActionTable
        rows={rows}
        caption={t('cockpit.obj.title')}
        headers={{
          entity: t('cockpit.obj.objective'),
          signal: t('cockpit.obj.measure'),
          measured: t('cockpit.act.measured'),
          versus: t('cockpit.obj.target'),
          status: t('cockpit.act.status'),
        }}
      />
    </ChartFrame>
  );
};
