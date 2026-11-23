import React from 'react';

import { Chip, ProgressCircle } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { Callout, Cluster, Grid, Panel, Stack } from '../../engine';
import '../../engine/page-c.css';
import { HorizonStrip } from '../../engine/chart/HorizonStrip';
import { CATEGORY_KEY, type Insight, type Qualitative } from '../insights/deriveInsights';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * 3.7.9 (the owner: "Página 'roadmap' não vamos mais ter… migrar tudo para oportunidades"; the term "roadmap" read as a
 * product roadmap): the 30-60-90 action plan, a tab of Opportunities. Until 3.7.8 it was the "Recommended roadmap" page.
 *
 * Generated from the same live insights as the opportunities page, then placed
 * into horizons by effort and dependency. Nothing here is a template: if the
 * environment produced no signal for an item, the item does not appear.
 *
 * ## Why bands rather than a table
 *
 * The first version was one long table with nine columns. It was complete and
 * unreadable — an audience cannot scan it while someone is talking. Each horizon
 * is now a band, and each item is a card with the measurement on top and the
 * detail beneath.
 *
 * ## A horizon is a time window, not a severity
 *
 * The bands used to be red, amber and blue, which read as "critical, warning,
 * info" for what is only "now, next, later". All three horizons are now neutral
 * and are told apart by an "H1/H2/H3" step badge and their title (the day range).
 * Colour is left to mean what it means everywhere else: a measured condition.
 *
 * Owners are named by role, never by person.
 */

type Horizon = 'h1' | 'h2' | 'h3';

const HORIZON_STYLE: Record<Horizon, { titleKey: StringKey; intentKey: StringKey }> = {
  h1: { titleKey: 'roadmap.h1', intentKey: 'roadmap.h1.intent' },
  h2: { titleKey: 'roadmap.h2', intentKey: 'roadmap.h2.intent' },
  h3: { titleKey: 'roadmap.h3', intentKey: 'roadmap.h3.intent' },
};

const HORIZON_ORDER: Horizon[] = ['h1', 'h2', 'h3'];

/**
 * Places an insight into a horizon.
 *
 * Low effort with high impact goes first because it is defensible to commit to.
 * Anything gated on a permission decision also goes first, since it blocks
 * assessment rather than improvement.
 */
function horizonFor(insight: Insight): Horizon {
  const blocksAssessment = insight.category === 'security' || insight.category === 'coverage';
  if (blocksAssessment) return 'h1';
  if (insight.effort === 'low') return 'h1';
  if (insight.effort === 'medium') return 'h2';
  return 'h3';
}

/** Suggested owner by role (a dictionary key). Never a named individual. */
function ownerFor(insight: Insight): StringKey {
  switch (insight.category) {
    case 'security':
      return 'roadmap.owner.security';
    case 'coverage':
    case 'governance':
      return 'roadmap.owner.platform';
    case 'data-quality':
    case 'consumption':
      return 'roadmap.owner.dataSources';
    case 'automation':
      return 'roadmap.owner.sre';
    case 'capacity':
    case 'reliability':
      return 'roadmap.owner.workload';
    case 'experience':
      return 'roadmap.owner.frontend';
    default:
      return 'roadmap.owner.platform';
  }
}

/** How the team will know the item worked (a dictionary key). */
function successFor(insight: Insight): StringKey {
  switch (insight.category) {
    case 'security':
      return 'roadmap.success.security';
    case 'coverage':
      return 'roadmap.success.coverage';
    case 'data-quality':
      return 'roadmap.success.dataQuality';
    case 'automation':
      return insight.id === 'fix-failing-workflows'
        ? 'roadmap.success.automationFailing'
        : 'roadmap.success.automationPattern';
    case 'consumption':
      return 'roadmap.success.consumption';
    case 'reliability':
      return 'roadmap.success.reliability';
    case 'capacity':
      return 'roadmap.success.capacity';
    case 'experience':
      return 'roadmap.success.experience';
    default:
      return 'roadmap.success.default';
  }
}

const qualKey = (value: Qualitative): StringKey =>
  value === 'high' ? 'qual.high' : value === 'medium' ? 'qual.medium' : 'qual.low';

export interface ActionPlanProps {
  insights: readonly Insight[];
  isLoading: boolean;
  unavailable: readonly string[];
}

export const ActionPlan = ({ insights, isLoading, unavailable }: ActionPlanProps) => {
  const { t, tCount } = useTranslation();
  const byHorizon = (horizon: Horizon) => insights.filter((insight) => horizonFor(insight) === horizon);

  return (
    <Stack gap="section" data-testid="action-plan">
      <Callout kind="note" title={t('p.roadmap.howToRead')}>
        <Stack gap="tight">
          <Paragraph>{t('roadmap.howToRead.horizon')}</Paragraph>
          <Paragraph>{t('p.roadmap.howToReadBody2')}</Paragraph>
        </Stack>
      </Callout>
      {/* Sources this synthesis could not read: a limit of the review, not a fault in the estate. */}
      {unavailable.length > 0 && (
        <Callout kind="limitation" title={t('p.roadmap.partialTitle')}>
          {t('p.roadmap.partialLine', { list: unavailable.join(', ') })}
        </Callout>
      )}

      {isLoading ? (
        <Cluster justify="center" gap="tight">
          <ProgressCircle aria-label={t('p.roadmap.derivingAria')} />
          <Text>{t('p.roadmap.deriving')}</Text>
        </Cluster>
      ) : insights.length === 0 ? (
        <Callout kind="note" title={t('p.roadmap.none')}>
          {t('roadmap.empty')}
        </Callout>
      ) : (
        <Stack gap="section">
          {/* 3.3.20 (Roadmap on the chart engine): the three horizons at a glance, before the cards. */}
          <Panel pad="roomy">
            <Stack gap="group">
              <Heading level={4} as="h2">
                {t('roadmap.glance.title')}
              </Heading>
              <HorizonStrip
                label={t('roadmap.glance.title')}
                columns={HORIZON_ORDER.map((horizon) => {
                  const items = byHorizon(horizon);
                  return {
                    key: horizon,
                    title: t(HORIZON_STYLE[horizon].titleKey),
                    intent: t(HORIZON_STYLE[horizon].intentKey),
                    countLabel: tCount('roadmap.itemCount', items.length, { count: items.length }),
                    items: items.map((insight) => ({ key: insight.id, title: insight.title })),
                  };
                })}
              />
            </Stack>
          </Panel>
          {HORIZON_ORDER.map((horizon, horizonIndex) => {
            const style = HORIZON_STYLE[horizon];
            const items = byHorizon(horizon);

            return (
              // Neutral on purpose: a horizon is a time window, never a severity.
              <Panel key={horizon} as="section" pad="roomy">
                <Stack gap="group">
                  <Cluster justify="between" gap="group">
                    <Cluster gap="group">
                      <span className="pvs-step">
                        {t('roadmap.horizonBadge', { n: horizonIndex + 1 })}
                      </span>
                      <Heading level={4} as="h2">
                        {t(style.titleKey)}
                      </Heading>
                      <Text className="pvs-muted">{t(style.intentKey)}</Text>
                    </Cluster>
                    <Chip color="neutral" variant="emphasized" size="condensed">
                      {tCount('roadmap.itemCount', items.length, { count: items.length })}
                    </Chip>
                  </Cluster>

                  {items.length === 0 ? (
                    <Text className="pvs-muted">{t('p.roadmap.emptyHorizon')}</Text>
                  ) : (
                    <Grid min={340}>
                      {items.map((insight) => (
                        <Panel key={insight.id} as="article" pad="compact">
                          <Stack gap="tight">
                            <Cluster gap="tight">
                              <Chip color="neutral" variant="accent" size="condensed">
                                {t(CATEGORY_KEY[insight.category])}
                              </Chip>
                              <Chip color="primary" variant="accent" size="condensed">
                                {`${t('roadmap.impact')}: ${t(qualKey(insight.impact))}`}
                              </Chip>
                              <Chip color="neutral" variant="accent" size="condensed">
                                {`${t('roadmap.effort')}: ${t(qualKey(insight.effort))}`}
                              </Chip>
                            </Cluster>

                            <Heading level={5} as="h3">
                              {insight.title}
                            </Heading>

                            <div className="pvs-c-metric">
                              <Text className="pvs-label">{t('roadmap.measured')}</Text>
                              <Text>{insight.observation}</Text>
                            </div>

                            <Paragraph>{insight.recommendation}</Paragraph>

                            <dl className="pvs-c-defs">
                              <div>
                                <dt>{t('roadmap.success')}</dt>
                                <dd>{t(successFor(insight))}</dd>
                              </div>
                              <div>
                                <dt>{t('roadmap.owner')}</dt>
                                <dd>{t(ownerFor(insight))}</dd>
                              </div>
                              <div>
                                <dt>{t('roadmap.dependency')}</dt>
                                <dd>{insight.dependencies}</dd>
                              </div>
                            </dl>
                            <Text className="pvs-caption">
                              {t('p.roadmap.evidence', {
                                list: insight.evidence.join(', '),
                              })}
                            </Text>
                          </Stack>
                        </Panel>
                      ))}
                    </Grid>
                  )}
                </Stack>
              </Panel>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
