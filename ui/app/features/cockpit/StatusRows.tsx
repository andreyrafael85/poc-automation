import React, { useMemo } from 'react';
import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import { useTranslation } from '../../i18n/useTranslation';
import { statusRows, SLOT_HOURS } from '../../models/statusRows';
import { problemCategoryLabel } from '../problems/categoryLabel';

/**
 * 3.6.4 (v6, the status rows of the reference dashboards; the owner approved the new read on 2026-11-22): one row per
 * problem category, one small bar per 3-hour slot of the last 7 days — its height and ink by how many problems began
 * then, on a square-root scale so one busy slot does not flatten the rest; a slot with none a faint trace —, the row's
 * total and how many are still open. From `prob.status.rows`.
 */

const CATEGORY_COLOR: Record<string, string> = {
  AVAILABILITY: 'var(--dt-colors-charts-categorical-vivid-color-01-default)',
  ERROR: 'var(--dt-colors-charts-categorical-vivid-color-02-default)',
  RESOURCE_CONTENTION: 'var(--dt-colors-charts-categorical-vivid-color-03-default)',
  SLOWDOWN: 'var(--dt-colors-charts-categorical-vivid-color-04-default)',
  CUSTOM_ALERT: 'var(--dt-colors-charts-categorical-vivid-color-05-default)',
};

export const StatusRows = () => {
  const { t, formatNumber, formatDateTime } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const query = useCatalogQuery('prob.status.rows', scope);
  const model = useMemo(
    () => (query.outcome === 'ok' ? statusRows(query.records, query.timeframe.endIso) : null),
    [query.outcome, query.records, query.timeframe.endIso],
  );
  if (model === null) return null;
  const total = model.rows.reduce((sum, row) => sum + row.inWindow, 0);
  const fact = factFrom(query, total);
  const first = model.slotStarts[0];
  const last = model.slotStarts[model.slotStarts.length - 1];
  return (
    <Panel pad="roomy" data-testid="ai-status-rows">
      <Stack gap="group">
        <div className="pvs-funnel__head">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('v6.status.title')}
            </Heading>
            <Text className="pvs-caption">{t('v6.status.subtitle', { hours: SLOT_HOURS })}</Text>
          </Stack>
          <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
        </div>
        <ol className="pvs-status">
          {model.rows.map((row) => {
            const color = CATEGORY_COLOR[row.category] ?? 'var(--dt-colors-charts-categorical-vivid-color-06-default)';
            const name = problemCategoryLabel(row.category, t);
            return (
              <li key={row.category} className="pvs-status__row">
                <span className="pvs-status__name">
                  <span className="pvs-status__dot" style={{ background: color }} aria-hidden="true" />
                  {name}
                </span>
                <span
                  className="pvs-status__bars"
                  role="img"
                  aria-label={t('v6.status.rowLabel', { name, count: formatNumber(row.inWindow), open: formatNumber(row.open) })}
                >
                  {row.slots.map((value, index) => (
                    <span
                      key={index}
                      className="pvs-status__bar"
                      data-on={value > 0 ? 'true' : 'false'}
                      style={value > 0 ? { background: color, height: `${Math.round(22 + 78 * Math.sqrt(value / Math.max(1, row.peak)))}%` } : undefined}
                    />
                  ))}
                </span>
                <span className="pvs-status__count">{formatNumber(row.inWindow)}</span>
                <span className="pvs-status__open" data-open={row.open > 0 ? 'true' : 'false'}>
                  {row.open > 0 ? t('v6.status.open', { count: formatNumber(row.open) }) : t('v6.status.allClosed')}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="pvs-status__axis" aria-hidden="true">
          <span>{first === undefined ? '' : formatDateTime(first)}</span>
          <span>{last === undefined ? '' : formatDateTime(last)}</span>
        </div>
        <Text className="pvs-caption">
          {model.openBefore > 0 ? t('v6.status.captionBefore', { count: formatNumber(model.openBefore) }) : t('v6.status.caption')}
        </Text>
      </Stack>
    </Panel>
  );
};
