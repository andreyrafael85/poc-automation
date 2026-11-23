import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { SpectrumArea, useChartFormat } from '../../components/spectrum';
import { useAccess } from '../../config/AccessContext';
import { assumed } from '../../config/assumptions';
import { isRouteBlocked } from '../../config/navigation';
import { Panel, Stack } from '../../engine';
import type { CatalogQueryResult } from '../../hooks/useCatalogQuery';
import { useTranslation } from '../../i18n/useTranslation';
import type { Insight } from '../../features/insights/deriveInsights';
import { arrivalChange, type ArrivalBin } from '../../models/problemTimeline';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';

/**
 * "What changed" (3.2.3, the Executive summary as a story): problems that began every six hours
 * over the pinned seven days, drawn as a Spectrum area, and one sentence comparing the two halves
 * of the week — every period counted, the quiet ones as zeros. Below the review line of the
 * assumptions registry the sentence says "stable", not a direction.
 */
export const WhatChanged = ({ arrivals, timeline }: { arrivals: readonly ArrivalBin[]; timeline: CatalogQueryResult }) => {
  const { t, tWindow, formatNumber } = useTranslation();
  const fmt = useChartFormat();
  if (arrivals.length < 2) return null;
  const change = arrivalChange(arrivals);
  const min = assumed('problems.trend.min');
  const sentence =
    change === null
      ? t('exec.changed.none')
      : change.fallPct >= min
        ? t('exec.changed.fell', { pct: formatNumber(change.fallPct) })
        : change.fallPct <= -min
          ? t('exec.changed.rose', { pct: formatNumber(-change.fallPct) })
          : t('exec.changed.stable', { pct: formatNumber(Math.abs(change.fallPct)) });
  const points = arrivals.map((bin) => ({ t: bin.start, v: bin.count }));
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <Panel as="section" pad="roomy" className="pvs-spec-band">
      <span className="pvs-spec-band__edge" aria-hidden="true" />
      <Stack gap="group">
        <div className="pvs-trend__head">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('exec.changed.title')}
            </Heading>
            <Paragraph className="pvs-lead">{sentence}</Paragraph>
          </Stack>
          <ProvenanceBadge provenance={timeline.provenance} confidence="high" evidence={timeline.evidence} />
        </div>
        <SpectrumArea
          points={points}
          family="pink-purple"
          label={t('exec.changed.aria')}
          format={(value) => fmt.compact(value)}
          formatTime={fmt.binTime}
          formatTick={fmt.tick(first !== undefined && last !== undefined ? last.t - first.t : 0)}
          height={150}
        />
        <Text className="pvs-caption">{t('exec.changed.caption', { window: tWindow(timeline.timeframe.label) })}</Text>
      </Stack>
    </Panel>
  );
};

/**
 * "Next steps" (3.2.3): the three highest-priority opportunities the measured signals produce
 * (`deriveInsights`, already filtered for the audience), each with what was measured and what to
 * do, and a link to the page that shows the evidence when the viewer's mode shows it.
 */
export const NextSteps = ({ insights, loading }: { insights: readonly Insight[]; loading: boolean }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const access = useAccess();
  const restricted = access.level === 'customer' && access.restrictedView;
  const shown = insights.slice(0, 3);

  return (
    <Panel as="section" pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('exec.next.title')}
        </Heading>
        {loading ? (
          <Text>{t('p.report.deriving')}</Text>
        ) : shown.length === 0 ? (
          <Text>{t('p.report.noSignal')}</Text>
        ) : (
          <ol className="pvs-steps">
            {shown.map((insight, index) => {
              const open = !isRouteBlocked(insight.drilldown, { commercialVisible: access.commercialVisible, restricted });
              return (
                <li key={insight.id} className="pvs-steps__item" data-spectrum={STEP_FAMILY[index % STEP_FAMILY.length]}>
                  <span className="pvs-steps__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="pvs-stack" style={{ '--pvs-gap': 'var(--dt-spacings-size-4)' } as React.CSSProperties}>
                    <Text className="pvs-steps__title">{insight.title}</Text>
                    <Text>{insight.recommendation}</Text>
                    <Text className="pvs-caption">{t('p.report.measured', { value: insight.observation })}</Text>
                    {open && (
                      <button type="button" className="pvs-steps__link" onClick={() => void navigate(insight.drilldown)}>
                        {t('exec.next.open')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Stack>
    </Panel>
  );
};

const STEP_FAMILY = ['blue-turquoise', 'pink-purple', 'turquoise'] as const;
