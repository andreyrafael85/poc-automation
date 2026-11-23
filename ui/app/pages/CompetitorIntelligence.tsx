import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ArrowRightIcon, CheckmarkIcon, DynatraceSignetIcon, WarningIcon } from '@dynatrace/strato-icons';


import { ValueCard } from '../components/viz/ValueCard';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { BarList } from '../components/viz/BarList';
import { SectionIntro } from '../components/SectionIntro';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Cluster, EVIDENCE, Figure, Grid, Panel, Stack } from '../engine';
import type { IconComponent } from '../engine/evidence';
import '../engine/page-b.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';
import { pluralKey, type StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { summariseCompetitors, type RiskCategory } from '../models/competitor';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { ConsolidationHero, VendorMark } from '../features/competitor/ConsolidationHero';

/**
 * Competitor Intelligence — Observability Overlap Analysis.
 *
 * Shows the third-party observability agents the platform actually discovered
 * running alongside OneAgent, the concrete impact of that overlap, and the
 * unified-platform case. Strictly evidence-based on the agents found; the risk
 * framing is about co-installation, not an unfounded claim against a product.
 * Pure log forwarders are excluded — they are not a direct APM competitor.
 *
 * 3.2.6: told as the consolidation it opens — today's agents and tools beside one OneAgent and
 * one platform; the cost of the overlap in red, the unified side highlighted with green checks;
 * the recommendation as a three-step plan under the Dynatrace signet.
 */

const RISK_KEY: Record<RiskCategory, StringKey> = {
  apm: 'comp.risk.apm',
  metrics: 'comp.risk.metrics',
  logs: 'comp.risk.logs',
  infra: 'comp.risk.infra',
  viz: 'comp.risk.viz',
};

export const CompetitorIntelligence = () => {
  const { t, tCount, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const agents = useCatalogQuery('comp.agents', scope);
  const factFrom = useSummaryFact();

  const { vendors, totalAgents } = summariseCompetitors(agents.records);
  const detected = agents.outcome === 'ok' && totalAgents > 0;

  const riskPoints: StringKey[] = [
    'comp.compare.risk1',
    'comp.compare.risk2',
    'comp.compare.risk3',
    'comp.compare.risk4',
  ];
  const dtPoints: StringKey[] = [
    'comp.compare.dt1',
    'comp.compare.dt2',
    'comp.compare.dt3',
    'comp.compare.dt4',
  ];

  const VerdictIcon = EVIDENCE.recommendation.Icon;

  return (
    <>
      <SectionIntro titleKey="comp.title" questionKey="comp.subtitle" />

      <QueryStateBoundary result={agents}>
        {detected ? (
          <>
            {/* Today → with Dynatrace: the consolidation in one picture. */}
            <ConsolidationHero vendors={vendors} totalAgents={totalAgents} />

            {/* 3.3.11: the vendors beside the three counts (a cockpit row). */}
            <CockpitRow data-testid="comp-cockpit">
              <Panel pad="roomy">
                <Stack gap="group">
                  <Heading level={4} as="h2">
                    {t('comp.bars.title')}
                  </Heading>
                  <BarList
                    role="magnitude"
                    ariaLabel={t('comp.bars.aria')}
                    items={vendors.map((entry) => ({
                      key: entry.vendor,
                      label: entry.vendor,
                      value: entry.count,
                      display: `${formatNumber(entry.count)} ${tCount('comp.unit.agents', entry.count)}`,
                      icon: <VendorMark vendor={entry.vendor} size={16} />,
                    }))}
                  />
                </Stack>
              </Panel>
              <Grid min={200}>
                <ValueCard
                  family="orange"
                  eyebrow={t('comp.metric.agents.eyebrow')}
                  value={formatNumber(totalAgents)}
                  fact={factFrom(agents, totalAgents)}
                  caption={t('comp.metric.agents.caption')}
                />
                <ValueCard
                  family="pink-purple"
                  eyebrow={t('comp.metric.vendors.eyebrow')}
                  value={formatNumber(vendors.length)}
                  fact={factFrom(agents, vendors.length)}
                  caption={t('comp.metric.vendors.caption')}
                />
                <ValueCard
                  family="moss"
                  eyebrow={t('comp.metric.overlap.eyebrow')}
                  value={formatNumber(totalAgents)}
                  // The count is measured; that Dynatrace replaces these agents is this app's claim.
                  evidence="derived"
                  caption={t('comp.metric.overlap.caption')}
                />
              </Grid>
            </CockpitRow>

            <Stack gap="group">
              <Heading level={4} as="h2">
                {t('comp.detail.title')}
              </Heading>
              <Grid min={300}>
                {vendors.map((entry) => (
                  <Panel key={entry.vendor}>
                    <Stack gap="tight">
                      <div className="pvs-inv" data-spectrum="orange">
                        <span className="pvs-inv__icon" aria-hidden="true">
                          <VendorMark vendor={entry.vendor} size={22} />
                        </span>
                        <Heading level={5} as="h3">
                          {entry.vendor}
                        </Heading>
                      </div>
                      <Figure value={formatNumber(entry.count)} unit={tCount('comp.unit.agents', entry.count)} size="md" />
                      <ul className="pvs-b-points">
                        <ComparePoint Icon={WarningIcon} text={t(RISK_KEY[entry.category])} />
                      </ul>
                      <ul className="pvs-b-names">
                        {entry.names.map((name) => (
                          <li key={name}>
                            <Text className="pvs-caption pvs-wrap">{name}</Text>
                          </li>
                        ))}
                      </ul>
                    </Stack>
                  </Panel>
                ))}
              </Grid>
            </Stack>

            {/* The overlap has a cost — and a fix. */}
            <Stack gap="group">
              <Heading level={4} as="h2">
                {t('comp.compare.title')}
              </Heading>
              <div className="pvs-compare">
                <Panel className="pvs-compare__side" data-side="risk">
                  <Stack gap="tight">
                    <Cluster align="center" gap="tight">
                      <span className="pvs-compare__badge" data-side="risk" aria-hidden="true">
                        <WarningIcon />
                      </span>
                      <Heading level={5} as="h3">
                        {t('comp.compare.riskTitle')}
                      </Heading>
                    </Cluster>
                    <ul className="pvs-b-points" data-side="risk">
                      {riskPoints.map((key) => (
                        <ComparePoint key={key} Icon={WarningIcon} text={t(key)} />
                      ))}
                    </ul>
                  </Stack>
                </Panel>
                <span className="pvs-compare__arrow" aria-hidden="true">
                  <ArrowRightIcon />
                </span>
                <Panel className="pvs-compare__side" data-side="dynatrace" data-spectrum="moss">
                  <Stack gap="tight">
                    <Cluster align="center" gap="tight">
                      <span className="pvs-compare__badge" data-side="dynatrace" aria-hidden="true">
                        <DynatraceSignetIcon />
                      </span>
                      <Heading level={5} as="h3">
                        {t('comp.compare.dtTitle')}
                      </Heading>
                      <Chip color="success" variant="accent" size="condensed">
                        {t('comp3.compare.recommended')}
                      </Chip>
                    </Cluster>
                    <ul className="pvs-b-points" data-side="dynatrace">
                      {dtPoints.map((key) => (
                        <ComparePoint key={key} Icon={CheckmarkIcon} text={t(key)} />
                      ))}
                    </ul>
                  </Stack>
                </Panel>
              </div>
            </Stack>

            {/* The recommendation as a plan, under the Dynatrace signet. */}
            <Panel pad="roomy" className="pvs-reco" data-spectrum="blue-turquoise" evidence="recommendation">
              <span className="pvs-spec-band__edge" aria-hidden="true" />
              <div className="pvs-reco__grid">
                <span className="pvs-reco__emblem" aria-hidden="true">
                  <DynatraceSignetIcon />
                </span>
                <Stack gap="group">
                  <Stack gap="tight">
                    <Cluster align="center" gap="tight">
                      <VerdictIcon aria-hidden="true" />
                      <Heading level={4} as="h2">
                        {t('comp.verdict.eyebrow')}
                      </Heading>
                    </Cluster>
                    <Paragraph className="pvs-reco__lead">
                      {t('comp.verdict.text', {
                        agents: t(pluralKey('common.agentsCount', totalAgents), { n: formatNumber(totalAgents) }),
                        tools: t(pluralKey('common.toolsCount', vendors.length), { n: formatNumber(vendors.length) }),
                      })}
                    </Paragraph>
                  </Stack>
                  <ol className="pvs-reco__steps">
                    {(['comp3.step1', 'comp3.step2', 'comp3.step3'] as const).map((key, index) => (
                      <li key={key} className="pvs-reco__step">
                        <span className="pvs-reco__index" aria-hidden="true">
                          {index + 1}
                        </span>
                        <Text>{t(key, { agents: t(pluralKey('common.agentsCount', totalAgents), { n: formatNumber(totalAgents) }) })}</Text>
                      </li>
                    ))}
                  </ol>
                </Stack>
              </div>
            </Panel>

            <Callout kind="note" title={t('comp.overlap.title')}>
              {t('comp.overlap.body')}
            </Callout>
          </>
        ) : (
          <Callout kind="note" title={t('comp.none.title')}>
            {t('comp.none.body')}
          </Callout>
        )}
      </QueryStateBoundary>

      <DqlDisclosure entries={[getQuery('comp.agents')]} />
    </>
  );
};

/** One line of the comparison: a Strato icon (decorative) and the sentence it illustrates. */
const ComparePoint = ({ Icon, text }: { Icon: IconComponent; text: string }) => (
  <li className="pvs-b-point">
    <span className="pvs-b-point__icon">
      <Icon aria-hidden="true" />
    </span>
    <Text>{text}</Text>
  </li>
);

