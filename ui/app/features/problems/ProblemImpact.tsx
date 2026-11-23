import { SeOnly } from '../../components/SeOnly';
import React from 'react';

import { Chip } from '@dynatrace/strato-components/content';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { ChartFrame } from '../../components/ChartFrame';
import { BarList } from '../../components/viz/BarList';
import { QueryStateBoundary } from '../../components/QueryStateBoundary';
import { StatTile } from '../../components/StatTile';
import { useQueryScope, useStudio } from '../../config/StudioContext';
import { Callout, Cluster, EVIDENCE, Grid, Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import {
  absorbedCostLabel,
  estimateDowntimeCost,
  estimateOperationalCost,
  exposureHours,
  isDowntimeConfigured,
  totalExposure,
  formatHours,
  formatMoney,
  isCostConfigured,
  nanosToHours,
} from '../../models/cost';
import { observed, type Fact } from '../../models/provenance';
import { num, str } from '../../utils/records';
import { localizeSentinel } from '../../utils/sentinels';
import { CAUSE_NOT_NAMED } from '../../queries/catalog';
import { formatNanos } from '../../utils/time';
import { useTranslation, type Translation } from '../../i18n/useTranslation';
import { missingFact } from '../../hooks/useSummaryFact';
import { assumed } from '../../config/assumptions';

/**
 * Operational impact of problems.
 *
 * Answers the question an executive actually asks — "what is this costing us?" —
 * while keeping the two halves of that answer strictly separated:
 *
 *   - **problem-hours and MTTR** are measured by Dynatrace
 *   - **money** is measured hours multiplied by a rate the operator typed in,
 *     shown with the arithmetic and labelled as an estimate
 *
 * With no rate configured the section is still useful: hours, MTTR and
 * recurrence stand on their own.
 */

interface MttxRow extends Record<string, unknown> {
  category: string;
  problems: number;
  mttr: string;
  median: string;
  p90: string;
  totalHours: string;
}

const mttxColumns = (t: Translation['t']): DataTableColumnDef<MttxRow>[] => [
  { id: 'category', header: t('common.category'), accessor: 'category', width: '1.4fr' },
  { id: 'problems', header: t('f.impact.h.resolved'), accessor: 'problems', width: 120, alignment: 'right' },
  { id: 'mttr', header: t('f.impact.h.mttr'), accessor: 'mttr', width: 180, alignment: 'right' },
  { id: 'median', header: t('f.impact.h.median'), accessor: 'median', width: 140, alignment: 'right' },
  { id: 'p90', header: t('f.impact.h.p90'), accessor: 'p90', width: 160, alignment: 'right' },
  { id: 'totalHours', header: t('f.impact.h.totalTime'), accessor: 'totalHours', width: 180, alignment: 'right' },
];

export interface ProblemImpactProps {
  /** Hide the "active problems now" tile when a lens above already shows it. */
  hideActiveCount?: boolean;
}

export const ProblemImpact = ({ hideActiveCount = false }: ProblemImpactProps = {}) => {
  const { t, formatNumber, tWindow } = useTranslation();
  const scope = useQueryScope();
  const { costModel } = useStudio();

  const exposure = useCatalogQuery('prob.exposure', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  // 3.7.3: the hours and the money count only problems with a named root cause.
  const exposureRca = useCatalogQuery('prob.exposure.rca', scope);
  const mttxRca = useCatalogQuery('prob.mttx.rca', scope);
  const topEntities = useCatalogQuery('prob.topentities', scope);
  const recurrent = useCatalogQuery('prob.recurrent', scope);

  // ------------------------------------------------------- open exposure
  const exposureRecord = exposure.records[0];
  const activeProblems = num(exposureRecord, 'activeProblems');
  const totalOpenNs = num(exposureRecord, 'totalOpenNs');
  const avgOpenNs = num(exposureRecord, 'avgOpenNs');
  const oldestOpenNs = num(exposureRecord, 'oldestOpenNs');

  const activeFact: Fact<number | string | null> =
    activeProblems === null
      ? missingFact(exposure)
      : observed(activeProblems, exposure.evidence, { unit: t('common.unit.open') });

  const rcaOpenNs = num(exposureRca.records[0], 'totalOpenNs');
  const openHoursFact = exposureHours(rcaOpenNs, exposureRca.evidence, { t });
  const openCostFact = estimateOperationalCost(rcaOpenNs, costModel, exposureRca.evidence, { t });

  // ------------------------------------------------- absorbed (resolved)
  const mttxRows = mttx.records.map((record) => ({
    category: str(record, 'event.category') ?? t('common.uncategorised'),
    problems: num(record, 'problems') ?? 0,
    mttrNs: num(record, 'mttrNs'),
    medianNs: num(record, 'medianNs'),
    p90Ns: num(record, 'p90Ns'),
    totalNs: num(record, 'totalNs') ?? 0,
  }));

  const resolvedTotalNs = mttxRows.reduce((total, row) => total + row.totalNs, 0);

  /**
   * Availability time only.
   *
   * Downtime cost is charged against outages, not against every problem. On the
   * validation tenant availability accounts for roughly one problem-hour in
   * twelve, so applying a downtime rate to the whole set would overstate the
   * figure by about an order of magnitude.
   */
  const rcaRows = mttxRca.records.map((record) => ({ category: str(record, 'event.category') ?? '', totalNs: num(record, 'totalNs') ?? 0 }));
  const rcaResolvedNs = rcaRows.reduce((total, row) => total + row.totalNs, 0);
  const availabilityNs = rcaRows.filter((row) => row.category.toUpperCase() === 'AVAILABILITY').reduce((total, row) => total + row.totalNs, 0);

  const absorbedHoursFact = exposureHours(rcaResolvedNs, mttxRca.evidence, { t });
  const absorbedCostFact = estimateOperationalCost(rcaResolvedNs, costModel, mttxRca.evidence, { t });
  const availabilityHoursFact = exposureHours(availabilityNs, mttxRca.evidence, { t });
  const downtimeCostFact = estimateDowntimeCost(availabilityNs, costModel, mttxRca.evidence, { t });
  const combinedFact = totalExposure(absorbedCostFact, downtimeCostFact, costModel, mttxRca.evidence, { t });

  const tableRows: MttxRow[] = mttxRows.map((row) => ({
    category: row.category,
    problems: row.problems,
    mttr: formatNanos(row.mttrNs),
    median: formatNanos(row.medianNs),
    p90: formatNanos(row.p90Ns),
    totalHours: formatHours(nanosToHours(row.totalNs)),
  }));

  // --------------------------------------------------------- top 10 lists
  /**
   * 3.3.1 (backlog Q12): a pattern is now a problem name **on an entity**, so one name can appear
   * more than once — "Failure rate increase" was one row of 59 on the lab tenant and is really 32
   * with no cause named, 8 on TradeManagement and 7 on easytrade_offer_service. The row carries the
   * cause, and the label names it, so the list neither repeats itself nor hides which is which.
   */
  const topRecurring = recurrent.records.slice(0, 10).map((record) => {
    const rootCause = localizeSentinel(str(record, 'rootCause') ?? CAUSE_NOT_NAMED, t);
    const named = (str(record, 'rootCause') ?? CAUSE_NOT_NAMED) !== CAUSE_NOT_NAMED;
    return {
      name: str(record, 'event.name') ?? 'Unnamed',
      category: str(record, 'event.category') ?? t('common.uncategorised'),
      rootCause,
      named,
      occurrences: num(record, 'occurrences') ?? 0,
    };
  });

  const topEntityBars = topEntities.records.slice(0, 10).map((record) => ({
    category: str(record, 'affected') ?? t('common.notReported'),
    value: num(record, 'problems') ?? 0,
  }));

  // Open exposure is a condition worth reviewing only while something is open. With nothing
  // open these tiles carry no tone — 2.x drew them amber (and "longest open" red) whatever the
  // value, and there is no stated threshold that makes any open duration a fault.
  const openTone: 'warning' | 'neutral' = activeProblems !== null && activeProblems > 0 ? 'warning' : 'neutral';

  return (
    <Stack gap="section">
      {/* ------------------------------------------------- open exposure */}
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('f.impact.openTitle')}
        </Heading>

        {!isCostConfigured(costModel) && (
          <Callout kind="note" title={t('f.impact.hoursTitle')}>
            {t('f.impact.hoursBody')}
          </Callout>
        )}

        <QueryStateBoundary
          result={exposure}
          permissionImpact={t('st.impact.perm')}
        >
          <Grid min={230}>
            {!hideActiveCount && (
              <StatTile
                label={t('f.impact.openNow')}
                fact={activeFact}
                status={activeProblems !== null && activeProblems > 0 ? 'critical' : 'ideal'}
              />
            )}
            <StatTile
              label={t('f.impact.accumulated')}
              fact={openHoursFact}
              display={formatHours(nanosToHours(totalOpenNs))}
              detail={t('f.impact.clockRunning')}
              status={openTone}
              compact
            />
            <StatTile
              label={t('f.impact.avgOpen')}
              fact={
                avgOpenNs === null
                  ? missingFact(exposure)
                  : observed(formatNanos(avgOpenNs), exposure.evidence, {
                      note: t('f.impact.avgOpenNote'),
                    })
              }
              status={openTone}
              compact
            />
            <StatTile
              label={t('f.impact.longestOpen')}
              fact={
                oldestOpenNs === null
                  ? missingFact(exposure)
                  : observed(formatNanos(oldestOpenNs), exposure.evidence, {
                      note: t('f.impact.longestOpenNote'),
                    })
              }
              status={openTone}
              compact
            />
            <SeOnly>
              <StatTile
                label={t('f.impact.estimatedOpen')}
                fact={openCostFact}
                display={
                  typeof openCostFact.value === 'number'
                    ? formatMoney(openCostFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={
                  isCostConfigured(costModel)
                    ? t('f.impact.openRateLabel')
                    : t('f.impact.setRate')
                }
                status={openTone}
                compact
              />
            </SeOnly>
          </Grid>
        </QueryStateBoundary>
      </Stack>

      {/* -------------------------------------------- resolution + absorbed */}
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('f.impact.resolutionTitle')}
        </Heading>
        <QueryStateBoundary result={mttx}>
          <Grid min={230}>
            <StatTile
              label={t('f.impact.totalTime')}
              fact={absorbedHoursFact}
              display={formatHours(nanosToHours(resolvedTotalNs))}
              detail={t('f.impact.totalTimeDetail')}
              compact
            />
            <SeOnly>
              <StatTile
                label={t('f.impact.absorbed')}
                fact={absorbedCostFact}
                display={
                  typeof absorbedCostFact.value === 'number'
                    ? formatMoney(absorbedCostFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={isCostConfigured(costModel) ? absorbedCostLabel({ t }) : t('f.impact.setRate')}
                status="neutral"
                compact
              />
            </SeOnly>
            <StatTile
              label={t('f.impact.downtimeHours')}
              fact={availabilityHoursFact}
              display={formatHours(nanosToHours(availabilityNs))}
              detail={t('f.impact.downtimeHoursDetail')}
              compact
            />
            <SeOnly>
              <StatTile
                label={t('f.impact.downtimeCost')}
                fact={downtimeCostFact}
                display={
                  typeof downtimeCostFact.value === 'number'
                    ? formatMoney(downtimeCostFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={
                  isDowntimeConfigured(costModel)
                    ? t('f.impact.downtimeCostDetail')
                    : t('f.impact.setDowntimeRate')
                }
                status="neutral"
                compact
              />
            </SeOnly>
            <SeOnly>
              <StatTile
                label={t('f.impact.combined')}
                fact={combinedFact}
                display={
                  typeof combinedFact.value === 'number'
                    ? formatMoney(combinedFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={t('f.impact.combinedDetail')}
                status="neutral"
                compact
              />
            </SeOnly>
          </Grid>

          <DataTable
            data={tableRows}
            columns={mttxColumns(t)}
            fullWidth
            sortable
            aria-label={t('f.impact.mttxAria')}
          />
          <Text className="pvs-caption">{t('f.impact.medianNote')}</Text>
        </QueryStateBoundary>
      </Stack>

      {/* ----------------------------------------------------- top 10 lists */}
      <Grid min={380}>
        <ChartFrame
          role="magnitude"
          title={t('f.impact.recurringTitle')}
          caption={t('f.impact.recurringBody')}
          provenance={recurrent.provenance}
          evidence={recurrent.evidence}
          windowLabel={tWindow(recurrent.timeframe.label)}
        >
          <QueryStateBoundary result={recurrent}>
            {topRecurring.length > 0 ? (
              <BarList role="exposure"
                ariaLabel={t('f.impact.recurringAria')}
                items={topRecurring.map((row) => ({
                  key: `${row.name}|${row.rootCause}`,
                  label: row.named ? `${row.name} · ${row.rootCause}` : row.name,
                  value: row.occurrences,
                  display: `${formatNumber(row.occurrences)}×`,
                }))}
              />
            ) : (
              <Text>{t('f.impact.noRecurring')}</Text>
            )}
          </QueryStateBoundary>
        </ChartFrame>

        <ChartFrame
          role="magnitude"
          title={t('f.impact.topEntitiesTitle')}
          caption={t('f.impact.topEntitiesBody')}
          provenance={topEntities.provenance}
          evidence={topEntities.evidence}
          windowLabel={tWindow(topEntities.timeframe.label)}
        >
          <QueryStateBoundary result={topEntities}>
            {topEntityBars.length > 0 ? (
              <BarList role="magnitude"
                ariaLabel={t('f.impact.topEntitiesAria')}
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

      {/* ------------------------------------------------- recommendations */}
      <ProblemRecommendations
        topRecurring={topRecurring}
        topEntity={topEntityBars[0]}
        oldestOpenNs={oldestOpenNs}
        activeProblems={activeProblems}
      />
    </Stack>
  );
};

/**
 * Quick-win recommendations, generated only from signals that are present.
 *
 * Deliberately short. A long list of generic advice is easy to produce and
 * impossible to act on.
 */
const ProblemRecommendations = ({
  topRecurring,
  topEntity,
  oldestOpenNs,
  activeProblems,
}: {
  topRecurring: { name: string; category: string; occurrences: number }[];
  topEntity: { category: string; value: number } | undefined;
  oldestOpenNs: number | null;
  activeProblems: number | null;
}) => {
  const { t, formatNumber } = useTranslation();
  const recommendations: { title: string; why: string; action: string }[] = [];

  const top = topRecurring[0];
  if (top !== undefined && top.occurrences >= assumed('findings.pattern.min')) {
    recommendations.push({
      title: t('f.impact.qw.automate.title', { name: top.name }),
      why: t('f.impact.qw.automate.why', { count: formatNumber(top.occurrences) }),
      action: t('f.impact.qw.automate.action'),
    });
  }

  if (topEntity !== undefined && topEntity.value >= assumed('findings.entity.min')) {
    recommendations.push({
      title: t('f.impact.qw.entity.title', { name: topEntity.category }),
      why: t('f.impact.qw.entity.why', { count: formatNumber(topEntity.value) }),
      action: t('f.impact.qw.entity.action'),
    });
  }

  // 168 hours is one week. Stated explicitly so the threshold is not mistaken
  // for a platform rule.
  if (oldestOpenNs !== null && oldestOpenNs > assumed('problems.stale') * 3_600_000_000_000) {
    recommendations.push({
      title: t('f.impact.quickWinTriage'),
      why: t('f.impact.qw.triage.why', { duration: formatNanos(oldestOpenNs) }),
      action: t('f.impact.qw.triage.action'),
    });
  }

  if (activeProblems !== null && activeProblems > assumed('problems.open.attention')) {
    recommendations.push({
      title: t('f.impact.quickWinAlerting'),
      why: t('f.impact.qw.alerting.why', { count: formatNumber(activeProblems) }),
      action: t('f.impact.qw.alerting.action'),
    });
  }

  if (recommendations.length === 0) {
    return (
      <Callout kind="note" title={t('f.impact.noQuickWinTitle')}>
        {t('f.impact.noQuickWinBody')}
      </Callout>
    );
  }

  const RecommendationIcon = EVIDENCE.recommendation.Icon;

  return (
    <Stack gap="group">
      <Heading level={4} as="h2">
        {t('f.impact.quickWinsTitle')}
      </Heading>
      <Grid min={320}>
        {recommendations.map((recommendation) => (
          <Panel key={recommendation.title} evidence="recommendation" rail railTone="primary">
            <Stack gap="tight">
              <Cluster>
                <Chip color="primary" variant="accent" size="condensed">
                  <Chip.Prefix>
                    <RecommendationIcon aria-hidden="true" />
                  </Chip.Prefix>
                  {t('common.recommendation')}
                </Chip>
              </Cluster>
              <Heading level={5} as="h3">
                {recommendation.title}
              </Heading>
              <Text>{recommendation.why}</Text>
              <Paragraph>{recommendation.action}</Paragraph>
            </Stack>
          </Panel>
        ))}
      </Grid>
      <Text className="pvs-caption">{t('f.impact.quickWinsFooter')}</Text>
    </Stack>
  );
};
