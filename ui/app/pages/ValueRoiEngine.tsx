import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { NumberInputV2, ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { ArrowDownIcon } from '@dynatrace/strato-icons';

import { ValueCard } from '../components/viz/ValueCard';
import { ChartFrame } from '../components/ChartFrame';
import { KpiHero, SpectrumArea, useChartFormat } from '../components/spectrum';
import { HoursBreakdown, hoursCategoryName } from '../features/value/HoursBreakdown';
import { ValueChain } from '../features/value/ValueChain';
import { useValueChain } from '../features/value/useValueChain';
import { problemHours } from '../models/problemHours';
import { StatTile } from '../components/StatTile';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { SectionIntro } from '../components/SectionIntro';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SeOnly } from '../components/SeOnly';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { Callout, Cluster, EVIDENCE, Figure, Grid, Panel, Stack } from '../engine';
import '../engine/page-c.css';
import { useCatalogQuery, type CatalogQueryResult } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';
import { summariseCompetitors } from '../models/competitor';
import { diagnoseEntityModel } from '../models/entityHealth';
import { missingFact, useSummaryFact } from '../hooks/useSummaryFact';
import { compareWeeks, problemDays, type WeekComparison } from '../models/pocBaseline';
import {
  estimateOperationalCost,
  exposureHours,
  formatHours,
  formatMoney,
  isCostConfigured,
  nanosToHours,
} from '../models/cost';
import { pluralKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { num, str } from '../utils/records';

/**
 * Value & ROI Engine.
 *
 * Reads value straight from the engagement — coverage, detection, resolution and
 * toil — so it stands on its own even when the PoC runs in an isolated
 * environment with no competitor installed. Money is only ever the operator's
 * rate times measured hours, with the arithmetic shown; consolidation is an
 * optional bonus driver, present only when competitor agents were actually found.
 *
 * The baseline and the consolidation calculator both follow the same principle:
 * the numbers that can be measured (MTTR, hosts, agents, tools) are read from
 * the tenant, and the only inputs asked of the operator are the things the
 * platform genuinely cannot know — what resolution felt like before Dynatrace,
 * and what a competing agent costs them.
 *
 * 3.2.6 restyle: the drivers are a value chain (discover → detect → resolve → automate →
 * consolidate) the report reuses; the problem hours are ranked by category (3.2.7: count × mean
 * time to resolve, in place of the 3.2.6 mosaic) with the action the biggest calls for; the MTTR reference is picked from presets (the "slider" deferred in 3.2.5);
 * and the page closes like the Executive summary — what the PoC gave back, beside what to do next.
 */

const NS_PER_HOUR = 3_600_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The MTTR references a customer usually quotes, in hours (the input still takes any value). */
export const MTTR_PRESETS = [2, 4, 8, 12, 24, 48] as const;


export const ValueRoiEngine = () => {
  const { t, tCount, tWindow, formatNumber, formatDay } = useTranslation();
  const fmt = useChartFormat();
  const scope = useQueryScope();
  const { costModel, baseline, setBaseline, pocPlan, pocWindows } = useStudio();
  // 3.2.5: the measured MTTR of the PoC itself, its first days against its latest.
  const daily = useCatalogQuery('prob.poc.daily', scope);

  const inventory = useCatalogQuery('cov.inventory', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  // 3.7.3: the hours and the money absorbed count only problems with a named root cause.
  const mttxRca = useCatalogQuery('prob.mttx.rca', scope);
  const recurrent = useCatalogQuery('prob.recurrent.total', scope);
  const agents = useCatalogQuery('comp.agents', scope);

  const dash = '—';

  // Every category answering zero at once is an entity-model outage, not an empty estate: the
  // same guard the Overview applies, so this page cannot print "0 entities · Observed" (3.2.1).
  const entityOutage = diagnoseEntityModel(inventory.records).state === 'unavailable';

  const hosts =
    inventory.outcome === 'ok' && !entityOutage
      ? num(inventory.records.find((item) => str(item, 'category') === 'Hosts'), 'value')
      : null;

  const recurring = recurrent.outcome === 'ok' ? num(recurrent.records[0], 'patterns') : null;

  // Only a query that answered can say "none": loading, refused or failed is not an absence (3.2.1).
  const agentsRead = agents.outcome === 'ok' || agents.outcome === 'empty';
  const { vendors, totalAgents: competitorAgents } = summariseCompetitors(agentsRead ? agents.records : []);
  const agentsText = t(pluralKey('common.agentsCount', competitorAgents), { n: formatNumber(competitorAgents) });
  const competitorTools = vendors.length;

  const resolvedTotalNs = mttx.records.reduce((sum, record) => sum + (num(record, 'totalNs') ?? 0), 0);
  const resolvedCount = mttx.records.reduce((sum, record) => sum + (num(record, 'problems') ?? 0), 0);
  // Weighted mean across categories: total resolution time over problems closed.
  const measuredMttrHours =
    mttx.outcome === 'ok' && resolvedCount > 0 ? resolvedTotalNs / resolvedCount / NS_PER_HOUR : null;
  // Hours and money absorbed come from `prob.mttx`. When it did not answer there is no figure:
  // summing nothing gave "0 min" under an "Observed" badge for a query that had failed.
  const mttxRead = mttxRca.outcome === 'ok';
  const absorbedNs = mttxRead ? mttxRca.records.reduce((sum, record) => sum + (num(record, 'totalNs') ?? 0), 0) : null;
  const absorbedHoursFact = mttxRead ? exposureHours(absorbedNs, mttxRca.evidence, { t }) : missingFact(mttxRca);
  const absorbedCostFact = mttxRead
    ? estimateOperationalCost(absorbedNs, costModel, mttxRca.evidence, { t })
    : missingFact(mttxRca);

  // Problem hours per category (closed problems, the window of `prob.mttx`), largest first.
  const hoursByCategory = problemHours(mttx.records);
  // Problem hours closed per day since the start of the PoC (`prob.poc.daily`), for the closing story.
  const pocStart = pocWindows === null ? null : pocWindows.since.startIso.slice(0, 10);
  const pocDays = pocStart === null ? [] : problemDays(daily.records, pocStart);
  const hoursPerDay = pocDays.map((day) => ({ t: day.day, v: day.closedNs / NS_PER_HOUR }));
  const pocHours = hoursPerDay.reduce((sum, point) => sum + (point.v ?? 0), 0);
  // 3.3.8: the measured MTTR of each PoC day (a day with nothing closed is a gap, never a zero),
  // read against the PoC's MTTR criterion and, when the SE gave one, the "before" estimate.
  const mttrPerDay = pocDays.map((day) => ({ t: day.day, v: day.closed > 0 ? day.closedNs / day.closed / NS_PER_HOUR : null }));
  const mttrCriterion = pocPlan.criteria.find((criterion) => criterion.metric === 'problems.mttr' && criterion.operator === '<=' && criterion.target !== null);
  const mttrReferences = [
    ...(mttrCriterion?.target == null ? [] : [{ value: mttrCriterion.target, kind: 'goal' as const, label: t('roi.mttrDaily.criterion', { target: formatHours(mttrCriterion.target) }) }]),
    ...(baseline.manualMttrHours === null ? [] : [{ value: baseline.manualMttrHours, kind: 'mean' as const, label: t('roi.mttrDaily.before', { value: formatHours(baseline.manualMttrHours) }) }]),
  ];

  // Baseline deltas — only when the operator supplied their pre-Dynatrace estimate.
  const manualMttr = baseline.manualMttrHours;
  const mttrDeltaPct =
    manualMttr !== null && measuredMttrHours !== null && manualMttr > 0
      ? Math.max(0, Math.round(((manualMttr - measuredMttrHours) / manualMttr) * 100))
      : null;
  const mttrDeltaHours =
    manualMttr !== null && measuredMttrHours !== null
      ? Math.max(0, manualMttr - measuredMttrHours)
      : null;

  // Redundant spend — measured agents × the operator's per-agent cost, if given.
  const perAgent = baseline.annualCostPerAgent;
  const redundantSpend = perAgent !== null && competitorAgents > 0 ? competitorAgents * perAgent : null;

  // The value chain (shared with the general report): discover → detect → resolve → automate (→ consolidate).
  const chain = useValueChain();

  // What to do next, from what this page measured: the category that took the most hours, the
  // recurring patterns a workflow could take, the agents a consolidation would retire.
  const topCategory = hoursByCategory[0];
  const nextSteps: { key: string; title: string; body: string }[] = [
    ...(topCategory === undefined
      ? []
      : [
          {
            key: 'hours',
            title: t('roi3.next.hoursTitle'),
            body: t('roi4.next.hoursBody', {
              category: hoursCategoryName(topCategory.category, t),
              share: `${formatNumber(Math.round(topCategory.share))}%`,
              hours: formatHours(topCategory.hours),
            }),
          },
        ]),
    ...(recurring !== null && recurring > 0
      ? [{ key: 'automate', title: t('roi3.next.automateTitle'), body: t('roi3.next.automateBody', { patterns: formatNumber(recurring) }) }]
      : []),
    ...(agentsRead && competitorAgents > 0
      ? [{ key: 'consolidate', title: t('roi3.next.consolTitle'), body: t('roi3.next.consolBody', { agents: agentsText }) }]
      : []),
    ...(manualMttr === null ? [{ key: 'baseline', title: t('roi3.next.baselineTitle'), body: t('roi3.next.baselineBody') }] : []),
  ].slice(0, 3);

  return (
    <Stack gap="section">
      <SectionIntro titleKey="roi.title" questionKey="roi.subtitle" />

      <Stack as="section" gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('roi3.chain.title')}
          </Heading>
          <Paragraph className="pvs-prose pvs-muted">{t('roi3.chain.body')}</Paragraph>
        </Stack>
        <ValueChain links={chain} label={t('roi3.chain.title')} />
        {agentsRead && competitorAgents === 0 && (
          <Callout kind="note" title={t('callout.note')}>
            {t('roi.consolidation.none')}
          </Callout>
        )}
      </Stack>

      {/* 3.2.5: MTTR is measured by default — the PoC's first days against its latest. The
          customer's own reference below is a projection, labelled as one. */}
      <MeasuredMttr
        weeks={pocWindows === null ? null : compareWeeks(problemDays(daily.records, pocWindows.since.startIso.slice(0, 10)))}
        hasStart={pocPlan.startDate !== null}
        daily={daily}
      />

      {/* Before vs. with Dynatrace — the measured half from the tenant, the
          estimated half from the operator. */}
      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('roi.baseline.title')}
        </Heading>
        <Callout kind="estimate" title={t('callout.estimate')}>
          {t('roi.baseline.subtitle')}
        </Callout>

        <div className="pvs-c-field pvs-mttr-ref">
          <Text id="mttr-estimate-label">{t('roi.baseline.mttrInput')}</Text>
          {/* 3.2.6: the references customers usually quote, one click each; any other value below. */}
          <ToggleButtonGroup
            value={manualMttr !== null && (MTTR_PRESETS as readonly number[]).includes(manualMttr) ? String(manualMttr) : ''}
            onChange={(value) => setBaseline({ ...baseline, manualMttrHours: value === '' ? null : Number(value) })}
            aria-labelledby="mttr-estimate-label"
          >
            {MTTR_PRESETS.map((hours) => (
              <ToggleButtonGroup.Item key={hours} value={String(hours)}>
                {t('roi3.mttr.preset', { hours: String(hours) })}
              </ToggleButtonGroup.Item>
            ))}
          </ToggleButtonGroup>
          <NumberInputV2
            value={manualMttr}
            onChange={(value) =>
              setBaseline({ ...baseline, manualMttrHours: typeof value === 'number' ? value : null })
            }
            min={0}
            placeholder={t('roi.baseline.mttrPlaceholder')}
            aria-labelledby="mttr-estimate-label"
          />
        </div>

        <Grid min={300}>
          <BaselineColumn
            title={t('roi.baseline.before')}
            tag={t('roi.baseline.beforeTag')}
            provenance="projection"
            rows={[
              {
                label: t('roi.baseline.mttr'),
                value: manualMttr === null ? dash : formatNumber(manualMttr),
                unit: t('roi.unit.hours'),
                missing: manualMttr === null,
                missingLabel: t('roi.baseline.setEstimate'),
                detail: t('roi.baseline.mttrBefore'),
              },
              {
                label: t('roi.baseline.tools'),
                value:
                  competitorTools > 0 ? formatNumber(competitorTools + 1) : t('roi.baseline.manual'),
                detail: t('roi.baseline.toolsBefore'),
              },
              {
                label: t('roi.baseline.detection'),
                value: t('roi.baseline.manual'),
                detail: t('roi.baseline.detectionBefore'),
              },
            ]}
          />
          <BaselineColumn
            title={t('roi.baseline.after')}
            tag={t('roi.baseline.afterTag')}
            provenance="observed"
            rows={[
              {
                label: t('roi.baseline.mttr'),
                value: measuredMttrHours === null ? dash : formatNumber(Number(measuredMttrHours.toFixed(1))),
                unit: t('roi.unit.hours'),
                missing: measuredMttrHours === null,
                missingLabel: t('c.tile.notMeasured'),
                detail: t('roi.baseline.mttrAfter'),
              },
              {
                label: t('roi.baseline.tools'),
                value: '1',
                unit: tCount('roi.unit.tools', 1),
                detail: t('roi.baseline.toolsAfter'),
                // The proposition of the platform, not something this page measured.
                basis: 'hypothesis',
              },
              {
                label: t('roi.baseline.detection'),
                value: t('roi.baseline.none'),
                detail: t('roi.baseline.detectionAfter'),
                basis: 'hypothesis',
              },
            ]}
          />
        </Grid>

        {mttrDeltaPct === null ? (
          <Callout kind="pending" title={t('callout.pending')}>
            {t('roi.baseline.setEstimate')}
          </Callout>
        ) : (
          <Cluster gap="group">
            <Chip color="primary" variant="accent">
              <Chip.Prefix>
                <ArrowDownIcon aria-hidden="true" />
              </Chip.Prefix>
              {t('roi.baseline.delta', { pct: formatNumber(mttrDeltaPct) })}
            </Chip>
            {mttrDeltaHours !== null && mttrDeltaHours > 0 && (
              <Chip color="primary" variant="accent">
                <Chip.Prefix>
                  <ArrowDownIcon aria-hidden="true" />
                </Chip.Prefix>
                {t('roi.baseline.deltaHours', {
                  hours: formatNumber(Number(mttrDeltaHours.toFixed(1))),
                })}
              </Chip>
            )}
          </Cluster>
        )}
      </Stack>

      {/* Consolidation calculator — hosts and tools are measured, so the client
          never has to know their own footprint. */}
      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('roi.consol.title')}
        </Heading>
        <Paragraph className="pvs-prose pvs-muted">{t('roi.consol.subtitle')}</Paragraph>

        {competitorAgents > 0 ? (
          <>
            <Grid min={220}>
              <ValueCard
                family="purple"
                eyebrow={t('roi.consol.hosts')}
                value={hosts === null ? dash : formatNumber(hosts)}
                caption={t('roi.consol.hostsCaption')}
              />
              <ValueCard
                family="pink-purple"
                eyebrow={t('roi.consol.tools')}
                value={formatNumber(competitorTools)}
                caption={t('roi.consol.toolsCaption')}
              />
              <ValueCard
                family="orange"
                eyebrow={t('roi.consol.agents')}
                value={formatNumber(competitorAgents)}
                caption={t('roi.consol.agentsCaption')}
              />
            </Grid>

            {/* What an agent costs the customer, and the spend that implies, is a commercial argument. */}
            <SeOnly>
            <div className="pvs-c-field">
              <Text id="agent-cost-label">{t('roi.consol.rateLabel')}</Text>
              <NumberInputV2
                value={perAgent}
                onChange={(value) =>
                  setBaseline({
                    ...baseline,
                    annualCostPerAgent: typeof value === 'number' ? value : null,
                  })
                }
                min={0}
                placeholder={t('roi.consol.ratePlaceholder')}
                aria-labelledby="agent-cost-label"
              />
            </div>
            <Callout kind="assumption" title={t('callout.assumption')}>
              {t('roi.consol.rateHint')}
            </Callout>

            {redundantSpend !== null && (
              <StatTile
                label={t('roi.consol.redundantSpend')}
                fact={{
                  value: redundantSpend,
                  provenance: 'projection',
                  confidence: 'low',
                  note: t('roi.consol.redundantNote', { agents: agentsText }),
                }}
                display={formatMoney(redundantSpend, costModel.currencyLabel)}
                detail={t('roi.consol.redundantNote', { agents: agentsText })}
                status="warning"
                compact
              />
            )}
            </SeOnly>

            <Callout kind="recommendation" title={t('callout.recommendation')}>
              {t('roi.consol.verdict', {
                agents: agentsText,
                tools: t(pluralKey('common.toolsCount', competitorTools), { n: formatNumber(competitorTools) }),
              })}
            </Callout>
          </>
        ) : agentsRead ? (
          <Callout kind="note" title={t('callout.note')}>
            {t('roi.consol.none')}
          </Callout>
        ) : (
          // Not read (loading, refused, failed): no claim either way.
          <Text>{t(agents.outcome === 'loading' ? 'common.loadingShort' : 'common.notRead')}</Text>
        )}
      </Stack>

      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('roi.exposure.title')}
        </Heading>
        {!isCostConfigured(costModel) && (
          <SeOnly>
            <Callout kind="pending" title={t('callout.pending')}>
              {t('roi.exposure.setRate')}
            </Callout>
          </SeOnly>
        )}
        <Grid min={240}>
          <StatTile
            label={t('roi.exposure.absorbed')}
            fact={absorbedHoursFact}
            display={formatHours(nanosToHours(absorbedNs))}
            detail={t('roi.exposure.hours')}
            status="neutral"
            compact
          />
          <SeOnly>
            <StatTile
              label={t('roi.exposure.money')}
              fact={absorbedCostFact}
              display={
                typeof absorbedCostFact.value === 'number'
                  ? formatMoney(absorbedCostFact.value, costModel.currencyLabel)
                  : undefined
              }
              detail={isCostConfigured(costModel) ? t('roi.exposure.rateNote') : t('roi.exposure.setRate')}
              status="warning"
              compact
            />
          </SeOnly>
        </Grid>
      </Stack>

      {/* 3.3.20 (Value & ROI on the chart engine): where the problem hours went beside the daily
          time to resolve against the criterion — the two halves of the same story, one row. */}
      <CockpitRow data-testid="roi-cockpit" split="even" align="start">
        {/* 3.2.7: where the problem hours went — problems × average duration per category, and the action it calls for. Hours, never money. */}
        {mttxRead && hoursByCategory.length > 0 && (
          <Panel as="section" pad="roomy" className="pvs-spec-band" data-spectrum="pink-purple">
            <span className="pvs-spec-band__edge" aria-hidden="true" />
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('roi.split.title')}
                </Heading>
                <Text className="pvs-caption">{t('roi.split.caption', { window: tWindow(mttx.timeframe.label) })}</Text>
              </Stack>
              <HoursBreakdown rows={hoursByCategory} />
            </Stack>
          </Panel>
        )}
        {/* 3.3.8: real × target × before — the PoC's daily MTTR against its criterion and the SE's estimate. */}
        {mttrPerDay.filter((point) => point.v !== null).length > 1 && (
          <ChartFrame role="duration" title={t('roi.mttrDaily.title')} provenance={daily.provenance} evidence={daily.evidence} caption={t('roi.mttrDaily.caption')}>
            <SpectrumArea
              points={mttrPerDay}
              family="blue-turquoise"
              label={t('roi.mttrDaily.title')}
              format={(value) => formatHours(value)}
              formatTime={fmt.binTime}
              formatTick={fmt.tick(mttrPerDay.length * DAY_MS)}
              height={200}
              references={mttrReferences}
            />
          </ChartFrame>
        )}
      </CockpitRow>

      {/* 3.2.6: the Executive summary's pattern — what the PoC gave back, beside what to do next. */}
      <div className="pvs-exec-story">
        <Panel as="section" pad="roomy" className="pvs-spec-band" data-spectrum="turquoise">
          <span className="pvs-spec-band__edge" aria-hidden="true" />
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('roi3.back.title')}
              </Heading>
              <Paragraph className="pvs-lead">
                {pocStart === null
                  ? t('roi3.back.noStart')
                  : t('roi3.back.lead', { hours: formatHours(pocHours), since: formatDay(pocStart), closed: formatNumber(pocDays.reduce((sum, day) => sum + day.closed, 0)) })}
              </Paragraph>
            </Stack>
            {hoursPerDay.length > 1 && (
              <SpectrumArea
                points={hoursPerDay}
                family="turquoise"
                label={t('roi3.back.chart')}
                format={(value) => formatHours(value)}
                formatTime={fmt.binTime}
                formatTick={fmt.tick(hoursPerDay.length * DAY_MS)}
                height={150}
              />
            )}
            <Text className="pvs-caption">{t('roi3.back.caption')}</Text>
          </Stack>
        </Panel>
        <Panel as="section" pad="roomy">
          <Stack gap="group">
            <Heading level={4} as="h2">
              {t('exec.next.title')}
            </Heading>
            {nextSteps.length === 0 ? (
              <Text className="pvs-muted">{t('p.report.noSignal')}</Text>
            ) : (
              <ol className="pvs-steps">
                {nextSteps.map((step, index) => (
                  <li key={step.key} className="pvs-steps__item" data-spectrum={(['blue-turquoise', 'pink-purple', 'turquoise'] as const)[index % 3]}>
                    <span className="pvs-steps__index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <Stack gap="tight">
                      <Text className="pvs-steps__title">{step.title}</Text>
                      <Text>{step.body}</Text>
                    </Stack>
                  </li>
                ))}
              </ol>
            )}
          </Stack>
        </Panel>
      </div>

      <DqlDisclosure
        entries={[
          getQuery('cov.inventory'),
          getQuery('prob.summary'),
          getQuery('prob.mttx'),
          getQuery('prob.recurrent.total'),
          getQuery('comp.agents'),
          getQuery('prob.poc.daily'),
        ]}
      />
    </Stack>
  );
};

interface BaselineRow {
  label: string;
  /** Already formatted. A word ("many", "none") is allowed: not every row is a number. */
  value: string;
  unit?: string;
  /** True when the value was not measured / not entered; `missingLabel` says why. */
  missing?: boolean;
  missingLabel?: string;
  detail: string;
  /** `hypothesis` for a row that states what the platform proposes rather than what was measured. */
  basis?: 'hypothesis';
}

/**
 * One side of the before/after comparison.
 *
 * The side wears its evidence class: the operator's own estimate is an `estimated`
 * card (dashed edge, estimated icon and word), the live reading is `observed`
 * (solid edge, check and word). The distinction is the border and the word, not a
 * hue, and neither side is tinted as "the good one".
 */
const BaselineColumn = ({
  title,
  tag,
  provenance,
  rows,
}: {
  title: string;
  tag: string;
  provenance: 'projection' | 'observed';
  rows: readonly BaselineRow[];
}) => {
  const entry = EVIDENCE[provenance];
  const Icon = entry.Icon;
  return (
    <Panel as="article" pad="roomy" evidence={provenance}>
      <Stack gap="group">
        <Cluster justify="between">
          <Heading level={5} as="h3">
            {title}
          </Heading>
          <Chip color={entry.tone} variant="accent" size="condensed">
            <Chip.Prefix>
              <Icon aria-hidden="true" />
            </Chip.Prefix>
            {tag}
          </Chip>
        </Cluster>
        {rows.map((row) => (
          <div key={row.label} className="pvs-c-metric">
            <Text className="pvs-label">{row.label}</Text>
            <Figure
              value={row.value}
              unit={row.unit}
              size="md"
              missing={row.missing}
              missingLabel={row.missingLabel}
            />
            <Text className="pvs-caption">{row.detail}</Text>
            {row.basis === 'hypothesis' && <ProvenanceBadge provenance="hypothesis" />}
          </div>
        ))}
      </Stack>
    </Panel>
  );
};

/**
 * The PoC's measured MTTR (3.2.5): the problems that began in its first days and closed, against
 * those of its latest complete days. Without a start date in Settings there is nothing to compare.
 */
const MeasuredMttr = ({ weeks, hasStart, daily }: { weeks: WeekComparison | null; hasStart: boolean; daily: CatalogQueryResult }) => {
  const { t, formatDecimal, formatNumber } = useTranslation();
  const factFrom = useSummaryFact();
  const hours = (value: number | null) => (value === null ? '—' : `${formatDecimal(value, value >= 10 ? 0 : 1)} h`);
  // A change that rounds to nothing is no change.
  const raw = weeks?.mttrChangePct ?? null;
  const change = raw === null ? null : Math.round(raw);
  return (
    <Stack as="section" gap="group">
      <Stack gap="tight">
        <Heading level={4} as="h2">
          {t('roi.measured.title')}
        </Heading>
        <Paragraph className="pvs-prose pvs-muted">
          {!hasStart ? t('roi.measured.noStart') : weeks === null ? t('tl.weeks.tooEarly') : t('roi.measured.body', { days: String(weeks.span) })}
        </Paragraph>
      </Stack>
      {weeks !== null && (
        <Grid min={220}>
          <KpiHero
            family="purple"
            fact={factFrom(daily, weeks.first.mttrHours === null ? null : Math.round(weeks.first.mttrHours * 10) / 10, { calculation: t('tl.weeks.mttrCalc', { days: String(weeks.span) }) })}
            eyebrow={t('roi.measured.first', { days: String(weeks.span) })}
            value={hours(weeks.first.mttrHours)}
            caption={t('roi.measured.closed', { count: formatNumber(weeks.first.closed) })}
          />
          <KpiHero
            family="turquoise"
            fact={factFrom(daily, weeks.latest.mttrHours === null ? null : Math.round(weeks.latest.mttrHours * 10) / 10, { calculation: t('tl.weeks.mttrCalc', { days: String(weeks.span) }) })}
            eyebrow={t('roi.measured.latest', { days: String(weeks.span) })}
            value={hours(weeks.latest.mttrHours)}
            caption={
              change === null
                ? t('roi.measured.closed', { count: formatNumber(weeks.latest.closed) })
                : change < 0
                  ? t('roi.measured.faster', { pct: formatDecimal(-change, 0) })
                  : change > 0
                    ? t('roi.measured.slower', { pct: formatDecimal(change, 0) })
                    : t('roi.measured.same')
            }
          />
        </Grid>
      )}
    </Stack>
  );
};

