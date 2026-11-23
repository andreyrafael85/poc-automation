import React from 'react';

import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { ApplicationsIcon, DatabaseIcon, TechnologiesIcon } from '@dynatrace/strato-icons';

import { DqlDisclosure } from '../components/DqlDisclosure';
import { SeOnly } from '../components/SeOnly';
import { AssistPanel } from '../components/AssistPanel';
import { IncidentSpotlight } from '../features/executive/IncidentSpotlight';
import { EntityModelNotice } from '../components/EntityModelNotice';
import { HeroBanner } from '../components/HeroBanner';
import { MetricCard } from '../components/MetricCard';
import { VerdictHero } from '../components/VerdictHero';
import { QueryStateBoundary } from '../components/QueryStateBoundary';
import { SectionIntro } from '../components/SectionIntro';
import { StatTile } from '../components/StatTile';
import { GaugeRing, InventoryTile, KpiHero } from '../components/spectrum';
import { useCommercialVisible } from '../components/SeOnly';
import { NextSteps, WhatChanged } from '../features/executive/ExecStory';
import { useStoryNumbers } from '../features/executive/useStoryNumbers';
import { deriveVerdict, summariseMttr } from '../features/executive/verdict';
import { deriveInsights, prioritise } from '../features/insights/deriveInsights';
import { forAudience } from '../features/insights/audience';
import { useInsightSignals } from '../hooks/useInsightSignals';
import { ENTITY_TILES } from '../components/spectrum/entityTiles';
import { ChartFrame } from '../components/ChartFrame';
import { BarList } from '../components/viz/BarList';
import { DonutBreakdown } from '../components/viz/DonutBreakdown';
import { Callout, Grid, Stack } from '../engine';
import { PillarSummary } from '../features/pillars/PillarSummary';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import {
  estimateDowntimeCost,
  estimateOperationalCost,
  exposureHours,
  isDowntimeConfigured,
  totalExposure,
  formatHours,
  formatMoney,
  isCostConfigured,
  nanosToHours,
} from '../models/cost';
import { derived, observed, unavailable, type Fact } from '../models/provenance';
import { getQuery } from '../queries/catalog';
import { diagnoseEntityModel, isMeasuredZero } from '../models/entityHealth';
import { summariseRum } from '../models/rum';
import { num, parseTechnology, str } from '../utils/records';
import { formatNanos } from '../utils/time';
import { ObjectivesTable } from '../features/cockpit/ObjectivesTable';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { missingFact, useSummaryFact } from '../hooks/useSummaryFact';
import { Day0VsToday } from '../features/executive/Day0VsToday';

/**
 * Executive summary.
 *
 * The one screen a director should be able to read in two minutes: how large the
 * monitored estate is, how quickly problems resolve, how much problem time is
 * currently accumulating, and where the pain concentrates.
 *
 * Monetary figures appear only when the operator has supplied a rate, and always
 * carry the arithmetic. Everything else is measured.
 */

export const ExecutiveSummary = () => {
  const scope = useQueryScope();
  const { costModel, resolvedTimeframe } = useStudio();
  const { t, tCount, formatNumber, tWindow } = useTranslation();
  const factFrom = useSummaryFact();
  const story = useStoryNumbers();
  const { signals, isLoading: signalsLoading } = useInsightSignals();
  const commercialVisible = useCommercialVisible();
  const insights = forAudience(prioritise(deriveInsights(signals, { t, formatNumber })), commercialVisible);
  const percent = (value: number | null) => (value === null ? undefined : `${Math.round(value)}%`);
  const windowLabel = t(`timeframe.${resolvedTimeframe.expression}` as StringKey);

  const inventory = useCatalogQuery('cov.inventory', scope);
  const technologies = useCatalogQuery('proc.technologies', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  const exposure = useCatalogQuery('prob.exposure', scope);
  // 3.7.3: the cost reads only problems with a named root cause (the counts and the MTTR keep every problem).
  const exposureRca = useCatalogQuery('prob.exposure.rca', scope);
  const mttxRca = useCatalogQuery('prob.mttx.rca', scope);
  const topEntities = useCatalogQuery('prob.topentities', scope);
  const buckets = useCatalogQuery('cov.buckets', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  const rum = summariseRum(rumScore.records, []);
  const vulnerabilities = useCatalogQuery('sec.posture', scope);

  // The "what this cannot claim" note must reflect reality: only declare a gap
  // where the data is genuinely unavailable, never where it now flows.
  const usersGap = !(rumScore.outcome === 'ok' && rum.hasData);
  const securityGap = vulnerabilities.outcome === 'no-permission';
  const hasDeclaredGaps = usersGap || securityGap;

  // ---------------------------------------------------------------- estate
  const countOf = (category: string) =>
    num(
      inventory.records.find((record) => str(record, 'category') === category),
      'value',
    );

  const entityModel = diagnoseEntityModel(inventory.records);

  const estateFact = (value: number | null): Fact<number | string | null> => {
    if (value === null) return missingFact(inventory);
    if (value === 0 && !isMeasuredZero(entityModel)) {
      return unavailable(
        'no-telemetry',
        t('req.entityOutageShort'),
        inventory.evidence,
      );
    }
    return observed(value, inventory.evidence);
  };

  const distinctTechnologies = new Set(
    technologies.records
      .map((record) => parseTechnology(str(record, 'softwareTechnologies'))?.type)
      .filter((type): type is string => type !== undefined),
  ).size;

  const technologyFact: Fact<number | string | null> =
    technologies.outcome === 'ok'
      ? derived(
          distinctTechnologies,
          technologies.evidence,
          t('calc.distinctTech'),
        )
      : missingFact(technologies);

  // ------------------------------------------------------------------ MTTR
  // Weighted across categories, so a category with few slow problems cannot
  // dominate a simple average of averages (`summariseMttr`, shared with the SE deck).
  const { rows: mttxRows, resolvedProblems, overallMttrNs } = summariseMttr(mttx.records);

  const mttrFact: Fact<number | string | null> =
    mttx.outcome === 'ok' && overallMttrNs !== null
      ? derived(
          formatNanos(overallMttrNs),
          mttx.evidence,
          t('calc.overallMttr'),
        )
      : missingFact(
          mttx,
          'no-telemetry',
          mttx.outcome === 'no-permission' ? t('req.scope', { scope: 'storage:events:read' }) : undefined,
        );

  const worstMttr = [...mttxRows].sort((a, b) => (b.mttrNs ?? 0) - (a.mttrNs ?? 0))[0];

  // ------------------------------------------------------- open exposure
  const exposureRecord = exposure.records[0];
  const activeProblems = num(exposureRecord, 'activeProblems');
  const totalOpenNs = num(exposureRecord, 'totalOpenNs');
  const oldestOpenNs = num(exposureRecord, 'oldestOpenNs');

  const activeFact: Fact<number | string | null> =
    exposure.outcome === 'ok' && activeProblems !== null
      ? observed(activeProblems, exposure.evidence, { unit: t('ai.unit.problems') })
      : missingFact(exposure);

  const rcaOpenNs = num(exposureRca.records[0], 'totalOpenNs');
  const openHoursFact = exposureHours(rcaOpenNs, exposureRca.evidence, { t });
  const costFact = estimateOperationalCost(rcaOpenNs, costModel, exposureRca.evidence, { t });

  /**
   * Availability time only, for the downtime half of the exposure.
   *
   * A customer set a downtime rate in Settings and saw nothing change here,
   * because this page only ever computed the response half. Both halves are now
   * shown, and the combined figure states whether it is partial.
   */
  const availabilityNs = summariseMttr(mttxRca.records)
    .rows.filter((row) => row.category.toUpperCase() === 'AVAILABILITY')
    .reduce((total, row) => total + row.totalNs, 0);
  const availabilityHoursFact = exposureHours(availabilityNs, mttxRca.evidence, { t });
  const downtimeCostFact = estimateDowntimeCost(availabilityNs, costModel, mttxRca.evidence, { t });
  const combinedFact = totalExposure(costFact, downtimeCostFact, costModel, mttxRca.evidence, { t });

  const oldestFact: Fact<number | string | null> =
    oldestOpenNs !== null
      ? observed(formatNanos(oldestOpenNs), exposure.evidence, {
          note: t('exec.note.longestOpen'),
        })
      : missingFact(exposure);

  // ------------------------------------------------------------- charts
  const problemMix = mttxRows.map((row) => ({
    category: row.category,
    problems: row.problems,
  }));

  const mttrByCategory = mttxRows
    .filter((row) => row.mttrNs !== null)
    .map((row) => ({
      category: row.category,
      value: Number(((row.mttrNs ?? 0) / 3_600_000_000_000).toFixed(2)),
      unit: 'h',
    }));

  const topEntityBars = topEntities.records.slice(0, 10).map((record) => ({
    category: str(record, 'affected') ?? 'Not reported',
    value: num(record, 'problems') ?? 0,
  }));

  // Dynatrace Assist — the same evidence, restated for an executive reader.
  const dominantCategory = [...problemMix].sort((a, b) => b.problems - a.problems)[0];
  const dominantPct =
    resolvedProblems > 0 && dominantCategory !== undefined
      ? Math.round((dominantCategory.problems / resolvedProblems) * 100)
      : null;
  const execAssist: string[] = [];
  if (mttx.outcome === 'ok' && resolvedProblems > 0) {
    if (dominantCategory !== undefined && dominantPct !== null) {
      execAssist.push(
        t('exec.assist.s.dominant', {
          pct: formatNumber(dominantPct),
          category: dominantCategory.category,
          count: formatNumber(dominantCategory.problems),
        }),
      );
    }
    execAssist.push(
      t('exec.assist.s.resolved', {
        count: formatNumber(resolvedProblems),
        mttr: formatNanos(overallMttrNs ?? 0),
        // The problem queries are pinned (7 days); the sentence names that window, not the global one.
        window: tWindow(mttx.timeframe.label),
      }),
    );
  }
  if (topEntityBars.length > 0 && topEntityBars[0] !== undefined && topEntityBars[0].value > 0) {
    const topEntity = topEntityBars[0];
    execAssist.push(
      t('exec.assist.s.entity', {
        entity: topEntity.category,
        count: formatNumber(topEntity.value),
      }),
    );
  }
  if (activeProblems !== null) {
    execAssist.push(
      activeProblems > 0
        ? t('exec.assist.s.active', { count: formatNumber(activeProblems) })
        : t('exec.assist.s.activeNone'),
    );
  }

  // ------------------------------------------------------ data footprint
  const readableBuckets = buckets.records.filter(
    (record) => str(record, 'hasAccess') === 'true' || record.hasAccess === true,
  );
  const unreadableCount = buckets.records.length - readableBuckets.length;

  const sourcesFact: Fact<number | string | null> =
    buckets.outcome === 'ok'
      ? observed(buckets.records.length, buckets.evidence, { unit: t('common.unit.dataSources') })
      : missingFact(buckets);

  // The headline verdict, by the rule the SE deck's executive page reads too (`features/executive/verdict.ts`).
  const { verdict, key: verdictKey } = deriveVerdict({
    mttxOutcome: mttx.outcome,
    exposureOutcome: exposure.outcome,
    overallMttrNs,
    activeProblems,
    entityModel: entityModel.state,
  });

  return (
    <>
      <SectionIntro titleKey="exec.title" questionKey="exec.question" />

      {/* 3.2.3: the summary opens as a story — the three rings, the verdict, five numbers,
          what changed and what to do next — before the detail the director may want. */}
      <HeroBanner
        windowLabel={windowLabel}
        asOfIso={resolvedTimeframe.endIso}
        subtitle={t('exec.heroSubtitle')}
        headingAs="h2"
        brand
        aside={
          <>
            <GaugeRing
              family="blue-turquoise"
              value={story.coveragePct}
              valueDisplay={percent(story.coveragePct)}
              label={t('cc.ring.coverage.label')}
              caption={t('cc.ring.coverage.caption')}
              ariaLabel={t('cc.ring.coverage.aria')}
              missingLabel={t('tl.notMeasured')}
              fact={factFrom(story.inventory, story.coveragePct === null ? null : Math.round(story.coveragePct), {
                calculation: t('cc.ring.coverage.calc'),
                unit: '%',
              })}
            />
            <GaugeRing
              family="turquoise"
              value={story.closurePct}
              valueDisplay={percent(story.closurePct)}
              label={t('cc.ring.health.label')}
              caption={t('cc.ring.health.captionWindow', { window: t('timeframe.pinned.7d') })}
              ariaLabel={t('cc.ring.health.aria')}
              missingLabel={t('tl.notMeasured')}
              fact={factFrom(story.problems, story.closurePct === null ? null : Math.round(story.closurePct), {
                calculation: t('cc.ring.health.calc'),
                unit: '%',
              })}
            />
            <GaugeRing
              family="pink-purple"
              value={story.serviceHealthPct}
              valueDisplay={percent(story.serviceHealthPct)}
              label={t('cc.ring.services.label')}
              caption={
                story.servicesWithTraffic === null
                  ? undefined
                  : t('cc.ring.services.caption', { count: formatNumber(story.servicesWithTraffic) })
              }
              ariaLabel={t('cc.ring.services.aria')}
              missingLabel={t('tl.notMeasured')}
              fact={factFrom(story.serviceTotals, story.serviceHealthPct === null ? null : Math.round(story.serviceHealthPct), {
                calculation: t('cc.ring.services.calc'),
                unit: '%',
              })}
            />
          </>
        }
      />

      <VerdictHero
        headline={t(`verdict.${verdictKey}` as StringKey)}
        verdict={verdict}
        supporting={mttrFact}
        supportingDisplay={formatNanos(overallMttrNs)}
        supportingLabel={
          // A count is printed only when the query that produced it answered: "0 problems
          // resolved" beside a "Failed to read" badge states a number that was never measured.
          mttx.outcome === 'ok' || mttx.outcome === 'empty'
            ? tCount('verdict.mttrLabel', resolvedProblems, { count: formatNumber(resolvedProblems) })
            : t('verdict.mttrLabel.bare')
        }
        detail={t(`verdict.${verdictKey}.detail` as StringKey)}
        footnote={t('verdict.footnote')}
      />

      {/* 3.6.1 (v5): the PoC's Day 0 beside today, once a start date is set. */}
      <Day0VsToday />

      <Grid min={190}>
        <KpiHero
          family="blue-turquoise"
          fact={factFrom(story.inventory, story.monitoredEntities, { calculation: t('cc.card.entities.calc') })}
          eyebrow={t('cc.card.entities.eyebrow')}
          value={story.monitoredEntities === null ? '—' : formatNumber(story.monitoredEntities)}
          caption={t('cc.card.entities.caption')}
        />
        <KpiHero
          family="pink-purple"
          fact={factFrom(story.problems, story.activeProblems)}
          eyebrow={t('cc.card.active.eyebrow')}
          value={story.activeProblems === null ? '—' : formatNumber(story.activeProblems)}
          caption={t('cc.card.active.caption')}
          spark={story.arrivals.length > 1 ? { points: story.arrivals.map((bin) => bin.count), label: t('cc.kpi.problems.spark') } : undefined}
          trend={story.arrivals.length > 1 ? t('cc.kpi.problems.trend') : undefined}
        />
        <KpiHero
          family="purple"
          fact={mttrFact}
          eyebrow={t('metric.mttr')}
          value={overallMttrNs === null ? '—' : formatNanos(overallMttrNs)}
          caption={t('metric.mttrDetail', { count: formatNumber(resolvedProblems) })}
        />
        <KpiHero
          family="turquoise"
          fact={factFrom(story.inventory, story.services)}
          eyebrow={t('cc.card.services.eyebrow')}
          value={story.services === null ? '—' : formatNumber(story.services)}
          caption={t('cc.card.services.caption')}
        />
        <KpiHero
          family="orange"
          fact={factFrom(rumScore, rum.hasData ? rum.overallErrorRatePct : null, { calculation: t('rum.kpi.errorRateCalc') })}
          eyebrow={t('rum.kpi.errorRate')}
          value={rum.hasData && rum.overallErrorRatePct !== null ? `${formatNumber(rum.overallErrorRatePct)}%` : '—'}
          caption={rum.hasData ? t('rum.kpi.errorRateCaption') : t('rum.notObserved')}
        />
      </Grid>

      <div className="pvs-exec-story">
        <WhatChanged arrivals={story.arrivals} timeline={story.timeline} />
        <NextSteps insights={insights} loading={signalsLoading} />
      </div>

      {/* 3.3.8: the cockpit panel — every PoC objective against what was measured, open ones first. */}
      <ObjectivesTable />

      <PillarSummary />

      {/* --------------------------------------------------- estate scale */}
      <EntityModelNotice diagnosis={entityModel} />

      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('exec.scale')}
        </Heading>
        <QueryStateBoundary result={inventory}>
          <Grid min={220}>
            {ENTITY_TILES.filter(({ inventoryCategory }) =>
              ['Hosts', 'Services', 'Process instances', 'Kubernetes clusters', 'Kubernetes workloads'].includes(inventoryCategory),
            ).map(({ inventoryCategory: category, labelKey, icon, family }) => {
              const value = countOf(category);
              return (
                <InventoryTile
                  key={category}
                  label={t(labelKey)}
                  icon={icon}
                  family={family}
                  fact={estateFact(value)}
                  display={value === null ? undefined : formatNumber(value)}
                />
              );
            })}
            <InventoryTile
              label={t('exec.technologiesDetected')}
              icon={<TechnologiesIcon />}
              family="pink-purple"
              fact={technologyFact}
              display={technologies.outcome === 'ok' ? formatNumber(distinctTechnologies) : undefined}
              detail={t('exec.detail.distinctTech')}
            />
            <InventoryTile
              label={t('exec.dataSources')}
              icon={<DatabaseIcon />}
              family="blue-turquoise"
              fact={sourcesFact}
              display={buckets.outcome === 'ok' ? formatNumber(buckets.records.length) : undefined}
              detail={t('exec.notReadable', { count: unreadableCount })}
            />
            <InventoryTile
              label={t('rum.kpi.errorRate')}
              icon={<ApplicationsIcon />}
              family="orange"
              fact={
                rum.hasData && rum.overallErrorRatePct !== null
                  ? observed(`${formatNumber(rum.overallErrorRatePct)}%`, rumScore.evidence, {
                      note: t('rum.kpi.errorRateCaption'),
                    })
                  : missingFact(rumScore)
              }
              detail={t('rum.kpi.errorRateCaption')}
              // The review line the RUM page states: above 1 % of requests failing.
              status={(rum.overallErrorRatePct ?? 0) > 1 ? 'warning' : undefined}
            />
          </Grid>
        </QueryStateBoundary>
      </Stack>

      {/* 3.2.7: the incident that shows the value, in place of the cloud estate (the Overview's stack map covers it). */}
      <IncidentSpotlight />

      {/* 3.3.13: resolution speed beside the Assist (a cockpit row). */}
      <CockpitRow data-testid="exec-cockpit">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('exec.resolution')}
          </Heading>
          <QueryStateBoundary
            result={mttx}
            permissionImpact={t('st.mttr.perm')}
          >
            <Grid min={180}>
              <StatTile
                label={t('metric.mttr')}
                fact={mttrFact}
                detail={t('metric.mttrDetail', { count: formatNumber(resolvedProblems) })}
                compact
              />
              <StatTile
                label={t('exec.slowest')}
                fact={
                  worstMttr === undefined
                    ? missingFact(mttx)
                    : observed(worstMttr.category, mttx.evidence, {
                        note: t('exec.slowest.note', { time: formatNanos(worstMttr.mttrNs), count: formatNumber(worstMttr.problems) }),
                      })
                }
                detail={worstMttr === undefined ? undefined : formatNanos(worstMttr.mttrNs)}
                compact
              />
              <StatTile
                label={t('exec.resolvedInWindow')}
                fact={
                  mttx.outcome === 'ok'
                    ? observed(resolvedProblems, mttx.evidence, { unit: t('ai.unit.problems') })
                    : missingFact(mttx)
                }
                detail={t('exec.detail.autoClosed')}
                compact
              />
            </Grid>

            {mttrByCategory.length > 0 && (
              <ChartFrame
                role="duration"
                title={t('exec.mttxTitle')}
                provenance={mttx.provenance}
                evidence={mttx.evidence}
                windowLabel={tWindow(mttx.timeframe.label)}
              >
                <BarList role="duration"
                  ariaLabel={t('exec.mttxAria')}
                  items={[...mttrByCategory]
                    .sort((a, b) => b.value - a.value)
                    .map((row) => ({
                      key: row.category,
                      label: row.category,
                      value: row.value,
                      display: `${formatNumber(row.value)} h`,
                    }))}
                />
              </ChartFrame>
            )}
          </QueryStateBoundary>
        </Stack>
        {execAssist.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.eyebrow')}
            title={t('exec.assist.title')}
            sentences={execAssist}
            note={t('exec.assist.note')}
          />
        )}
      </CockpitRow>

      {/* --------------------------------------------- operational exposure */}
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('exec.openNow')}
        </Heading>

        {!isCostConfigured(costModel) && (
          <SeOnly>
            <Callout kind="pending" title={t('exec.noCostTitle')}>
              {t('exec.noCostBody')}
            </Callout>
          </SeOnly>
        )}

        <QueryStateBoundary result={exposure}>
          <Grid min={420}>
            <MetricCard
              category={t('exec.openExposure')}
              tone="primary"
              secondary={
                oldestOpenNs === null
                  ? undefined
                  : { display: formatNanos(oldestOpenNs), label: t('exec.label.longestOpen') }
              }
              figures={[
                {
                  display: activeProblems === null ? '—' : formatNumber(activeProblems),
                  label: t('exec.label.problemsOpen'),
                  fact: activeFact,
                },
                {
                  display: formatHours(nanosToHours(totalOpenNs)),
                  label: t('exec.label.accumulated'),
                  fact: openHoursFact,
                },
                {
                  display: formatNanos(oldestOpenNs),
                  label: t('exec.label.oldest'),
                  fact: oldestFact,
                },
              ]}
              interpretation={t('exec.interp.openTime')}
            />

            {/* Money at a rate the SE supplied is a commercial argument: shown only with commercial data on. */}
            <SeOnly>
            <MetricCard
              category={t('exec.operationalCost')}
              tone={isCostConfigured(costModel) ? 'primary' : 'neutral'}
              secondary={
                isCostConfigured(costModel)
                  ? {
                      display: formatMoney(costModel.ratePerHour ?? 0, costModel.currencyLabel),
                      label: t('exec.label.perHour'),
                    }
                  : undefined
              }
              figures={[
                {
                  display:
                    typeof costFact.value === 'number'
                      ? formatMoney(costFact.value, costModel.currencyLabel)
                      : '—',
                  label: isCostConfigured(costModel)
                    ? t('exec.label.responseExposure')
                    : t('exec.label.setRate'),
                  fact: costFact,
                },
                {
                  display: formatHours(nanosToHours(totalOpenNs)),
                  label: t('exec.label.measuredHours'),
                  fact: openHoursFact,
                },
              ]}
              interpretation={
                isCostConfigured(costModel)
                  ? t('exec.interp.costConfigured')
                  : t('exec.interp.costMissing')
              }
            />

            <MetricCard
              category={t('exec.downtimeCost')}
              tone={isDowntimeConfigured(costModel) ? 'primary' : 'neutral'}
              secondary={
                isDowntimeConfigured(costModel)
                  ? {
                      display: formatMoney(
                        costModel.downtimeRatePerHour ?? 0,
                        costModel.currencyLabel,
                      ),
                      label: t('exec.label.perHourDowntime'),
                    }
                  : undefined
              }
              figures={[
                {
                  display:
                    typeof downtimeCostFact.value === 'number'
                      ? formatMoney(downtimeCostFact.value, costModel.currencyLabel)
                      : '—',
                  label: isDowntimeConfigured(costModel)
                    ? t('exec.label.downtimeExposure')
                    : t('exec.label.setDowntimeRate'),
                  fact: downtimeCostFact,
                },
                {
                  display: formatHours(nanosToHours(availabilityNs)),
                  label: t('exec.label.availabilityHours'),
                  fact: availabilityHoursFact,
                },
                {
                  display:
                    typeof combinedFact.value === 'number'
                      ? formatMoney(combinedFact.value, costModel.currencyLabel)
                      : '—',
                  label: t('exec.label.combined'),
                  fact: combinedFact,
                },
              ]}
              interpretation={t('exec.interp.downtime')}
            />
            </SeOnly>
          </Grid>
        </QueryStateBoundary>
      </Stack>

      {/* --------------------------------------------------- concentration */}
      <Grid min={360}>
        <ChartFrame
          role="category"
          title={t('exec.mix')}
          provenance={mttx.provenance}
          evidence={mttx.evidence}
          windowLabel={tWindow(mttx.timeframe.label)}
        >
          <QueryStateBoundary result={mttx}>
            {problemMix.length > 0 ? (
              <DonutBreakdown
                heads={{ name: t('v6.legend.name'), count: t('v6.legend.count'), share: t('v6.hex.share') }}
                ariaLabel={t('exec.resolvedAria')}
                centerDisplay={formatNumber(problemMix.reduce((sum, row) => sum + row.problems, 0))}
                centerLabel={t('ai.unit.problems')}
                segments={problemMix.map((row) => ({
                  key: row.category,
                  label: row.category,
                  value: row.problems,
                  display: formatNumber(row.problems),
                }))}
              />
            ) : (
              <Text>{t('exec.noResolved')}</Text>
            )}
          </QueryStateBoundary>
        </ChartFrame>

        <ChartFrame
          role="magnitude"
          title={t('exec.concentration')}
          caption={t('exec.concentrationBody')}
          provenance={topEntities.provenance}
          evidence={topEntities.evidence}
          windowLabel={tWindow(topEntities.timeframe.label)}
        >
          <QueryStateBoundary result={topEntities}>
            {topEntityBars.length > 0 ? (
              <BarList role="magnitude"
                ariaLabel={t('exec.topEntitiesAria')}
                items={topEntityBars.map((row) => ({
                  key: row.category,
                  label: row.category,
                  value: row.value,
                  display: formatNumber(row.value),
                }))}
              />
            ) : (
              <Text>{t('exec.noEntity')}</Text>
            )}
          </QueryStateBoundary>
        </ChartFrame>
      </Grid>

      {/* ------------------------------------------------- declared gaps */}
      {/* What this review could not measure is a limitation of the review, not a
          fault in the estate, so it is a neutral dashed callout and never red. */}
      {hasDeclaredGaps && (
        <Callout kind="limitation" title={t('exec.gaps.title')}>
          <Stack gap="tight">
            {usersGap && (
              <Paragraph>
                <Strong>{t('exec.gap.usersLabel')}</Strong> {t('exec.gap.usersBody')}
              </Paragraph>
            )}
            {securityGap && (
              <Paragraph>
                <Strong>{t('exec.gap.securityLabel')}</Strong> {t('exec.gap.securityBody')}
              </Paragraph>
            )}
          </Stack>
        </Callout>
      )}

      <DqlDisclosure
        entries={[
          getQuery('cov.inventory'),
          getQuery('prob.summary'),
          getQuery('prob.timeline'),
          getQuery('svc.ranking.total'),
          getQuery('proc.technologies'),
          getQuery('prob.mttx'),
          getQuery('prob.exposure'),
          getQuery('prob.topentities'),
          getQuery('cov.buckets'),
          getQuery('rca.top'),
        ]}
      />
    </>
  );
};
