import React, { useMemo } from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useSummaryFact } from '../../hooks/useSummaryFact';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { experienceFunnel, type FunnelStep } from '../../models/experienceFunnel';

/**
 * 3.6.2 — the Experience funnel (the v5 proposal, approved on 2026-11-21): the real users' actions in the window, the
 * ones not frustrated and the satisfied ones — the experience level Dynatrace gives each action —, each step part of the
 * one before, in the same unit; then the requests and those answered without a 4xx or 5xx. From `rum.funnel` (metrics,
 * 0 B). Nothing is drawn when the actions were not measured — never a zero.
 */

const STEP_KEY: Record<FunnelStep['key'], StringKey> = {
  actions: 'exp.funnel.step.actions',
  notFrustrated: 'exp.funnel.step.notFrustrated',
  satisfied: 'exp.funnel.step.satisfied',
};

const DROP_KEY: Partial<Record<FunnelStep['key'], StringKey>> = {
  notFrustrated: 'exp.funnel.drop.frustrated',
  satisfied: 'exp.funnel.drop.tolerating',
};

/** One hue per funnel: every step counts the same thing (identity, never a verdict). */
const STEP_COLOR = [
  'var(--dt-colors-charts-categorical-vivid-color-01-default)',
  'var(--dt-colors-charts-categorical-vivid-color-01-default)',
  'var(--dt-colors-charts-categorical-vivid-color-01-default)',
];

interface Row {
  key: string;
  label: string;
  count: number;
  share: number;
  drop?: string;
  color: string;
}

const FunnelRows = ({ rows, testId }: { rows: readonly Row[]; testId: string }) => {
  const { formatNumber } = useTranslation();
  return (
    <ol className="pvs-funnel" data-testid={testId}>
      {rows.map((row) => (
        <li key={row.key} className="pvs-funnel__row" data-step={row.key}>
          {row.drop !== undefined && <span className="pvs-funnel__drop">{row.drop}</span>}
          <span className="pvs-funnel__label">{row.label}</span>
          <span className="pvs-funnel__track" aria-hidden="true">
            <span className="pvs-funnel__fill" style={{ width: `${Math.max(0.6, Math.min(100, row.share)).toFixed(2)}%`, background: row.color }} />
          </span>
          <span className="pvs-funnel__count">{formatNumber(row.count)}</span>
          <span className="pvs-funnel__share">{`${formatNumber(Math.round(row.share * 10) / 10)} %`}</span>
        </li>
      ))}
    </ol>
  );
};

export const ExperienceFunnel = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();
  const query = useCatalogQuery('rum.funnel', scope);
  const funnel = useMemo(() => (query.outcome === 'ok' ? experienceFunnel(query.records) : null), [query.outcome, query.records]);
  if (funnel === null) return null;

  const first = funnel.steps[0] as FunnelStep;
  const fact = factFrom(query, first.count);
  const actionRows: Row[] = funnel.steps.map((step, index) => {
    const dropKey = DROP_KEY[step.key];
    return {
      key: step.key,
      label: t(STEP_KEY[step.key]),
      count: step.count,
      share: step.share,
      drop: dropKey === undefined ? undefined : t(dropKey, { count: formatNumber(step.drop) }),
      color: STEP_COLOR[index] ?? STEP_COLOR[0] as string,
    };
  });
  const requests = funnel.requests;
  const requestRows: Row[] =
    requests === null || !(requests.total > 0)
      ? []
      : [
          { key: 'requests', label: t('exp.funnel.step.requests'), count: requests.total, share: 100, color: STEP_COLOR[0] as string },
          {
            key: 'requestsOk',
            label: t('exp.funnel.step.requestsOk'),
            count: requests.ok,
            share: (requests.ok / requests.total) * 100,
            drop: t('exp.funnel.drop.failed', { count: formatNumber(requests.failed) }),
            color: STEP_COLOR[1] as string,
          },
        ];
  const worst = funnel.mostFrustrated;

  return (
    <Panel pad="roomy" data-testid="dx-funnel">
      <Stack gap="group">
        <Stack gap="tight">
          <div className="pvs-funnel__head">
            <Heading level={4} as="h2">
              {t('exp.funnel.title')}
            </Heading>
            <ProvenanceBadge provenance={fact.provenance} confidence={fact.confidence} evidence={fact.evidence} note={fact.note} />
          </div>
          <Text className="pvs-caption">{t('exp.funnel.subtitle', { apps: formatNumber(funnel.apps) })}</Text>
        </Stack>
        <div className="pvs-funnel__grid">
          <Stack gap="tight">
            <Text className="pvs-funnel__unit">{t('exp.funnel.unit.actions')}</Text>
            <FunnelRows rows={actionRows} testId="dx-funnel-actions" />
          </Stack>
          {requestRows.length > 0 && (
            <Stack gap="tight">
              <Text className="pvs-funnel__unit">{t('exp.funnel.unit.requests')}</Text>
              <FunnelRows rows={requestRows} testId="dx-funnel-requests" />
            </Stack>
          )}
        </div>
        {worst !== null && (
          <Text className="pvs-funnel__note">
            {t('exp.funnel.worst', {
              app: worst.name.length > 48 ? `${worst.name.slice(0, 47)}…` : worst.name,
              count: formatNumber(worst.frustrated),
              actions: formatNumber(worst.actions),
              pct: formatNumber(Math.round(worst.frustratedShare * 10) / 10),
            })}
          </Text>
        )}
        <Text className="pvs-caption">{t('exp.funnel.legend')}</Text>
      </Stack>
    </Panel>
  );
};
