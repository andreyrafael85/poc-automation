import { PRINT_STYLES } from '../engine/printStyles';
import React from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { MessageContainer } from '@dynatrace/strato-components/content';
import { Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph, Strong, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon, GuideIcon } from '@dynatrace/strato-icons';

import { EntityModelNotice } from '../components/EntityModelNotice';
import { SeOnly } from '../components/SeOnly';
import { HeroBanner } from '../components/HeroBanner';
import { StatTile } from '../components/StatTile';
import { GaugeRing, StackMap, type SpectrumFamily } from '../components/spectrum';
import { VitalsDials } from '../features/experience/VitalsDials';
import { RcaTrail } from '../features/rca/RcaTrail';
import { useStackNodes } from '../features/stack/useStackNodes';
import { HoursBreakdown } from '../features/value/HoursBreakdown';
import { ValueChain } from '../features/value/ValueChain';
import { useValueChain } from '../features/value/useValueChain';
import { problemHours } from '../models/problemHours';
import { BarList } from '../components/viz/BarList';
import { DonutBreakdown } from '../components/viz/DonutBreakdown';
import { PillarSummary } from '../features/pillars/PillarSummary';
import { CriteriaPanel, useCriteriaResults } from '../features/criteria/CriteriaPanel';
import { IncidentStories } from '../features/rca/IncidentStories';
import { incidentStories } from '../models/incidentStories';
import { summariseRca } from '../models/rca';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useInsightSignals } from '../hooks/useInsightSignals';
import { missingFact } from '../hooks/useSummaryFact';
import { useCommercialVisible } from '../components/SeOnly';
import { forAudience } from '../features/insights/audience';
import { deriveInsights, prioritise } from '../features/insights/deriveInsights';
import {
  estimateDowntimeCost,
  estimateOperationalCost,
  totalExposure,
  formatHours,
  formatMoney,
  isCostConfigured,
  nanosToHours,
} from '../models/cost';
import { diagnoseEntityModel } from '../models/entityHealth';
import { capacityTotals, toHostCapacity } from '../models/capacity';
import { CAPACITY_LIST_LIMIT } from '../queries/catalog';
import { summarisePosture } from '../models/security';
import { summariseRum } from '../models/rum';
import { summariseEstate } from '../models/estate';
import { CloudProviderIcons } from '../components/CloudProviderIcons';
import { isSafeImageDataUrl } from '../utils/logo';
import { SEVERITY_ORDER, type Severity, type Tone } from '../design/palette';
import { Callout, Cluster, Figure, Grid, Panel, Stack } from '../engine';
import { num, parseTechnology, str, isDynatraceTechnology } from '../utils/records';
import { MAX_REPORT_DAYS, formatBytes, formatNanos, windowDays } from '../utils/time';
import { FrontendErrors, HostsAtCeiling, ProblemArrivals, SlowestServices } from '../features/cockpit/panels';
import { StratoModeProvider } from '../engine/strato';
import { decimal } from '../utils/activeLocale';

/**
 * Printable value report.
 *
 * ## Why printing rather than a PDF library
 *
 * The browser's own print pipeline produces a real PDF, honours the user's paper
 * size, keeps text selectable and searchable, and adds nothing to the bundle. A
 * PDF library would have added several hundred kilobytes to rasterise a document
 * the browser can already render better. So the report is a normal page with a
 * print stylesheet, and "Download" calls `window.print()`.
 *
 * ## The 30-day bound
 *
 * Enforced here rather than assumed. The window comes from the app selector,
 * whose widest preset is 30 days, but the check is explicit so that widening the
 * presets later cannot silently produce a report over a window nobody intended -
 * and over a scan volume nobody budgeted for.
 *
 * ## v3.1
 *
 * Rendered only inside the SE Report's "General report" tab, so it owns no `h1`:
 * the SE Report has the page title, the banner here is an `h2`, and every section
 * is a flat `Panel` with an `h2`. Printed numbers are `Figure`s (solid ink, a dash
 * and the words when not measured) instead of v2's bare headings. Every
 * `data-print-*` marker is kept; what the stylesheet no longer needs is the patch
 * for gradient ink, because no figure is drawn with one.
 */

// The print rules live in `engine/printStyles.ts` (3.4.1), shared with the Assessment report.
export { PRINT_STYLES };

interface TechRow extends Record<string, unknown> {
  technology: string;
  version: string;
  instances: number;
}

const SEVERITY_REPORT_LABEL = {
  CRITICAL: 'p.sec.sev.critical',
  HIGH: 'p.sec.sev.high',
  MEDIUM: 'p.sec.sev.medium',
  LOW: 'p.sec.sev.low',
} as const satisfies Record<(typeof SEVERITY_ORDER)[number], StringKey>;

/**
 * One printed figure with its label.
 *
 * A `Figure` in place of v2's bare `Heading` + `Text` pair: tabular numerals, solid
 * ink (so it prints), and a not-measured state that is a dash *and* the words, so
 * the reason survives on paper where a hover cannot. It is the single root element
 * of its cell, because the print stylesheet keeps each direct child of a
 * `data-print-grid` whole.
 */
interface PrintFigureProps {
  /** Pre-formatted. `null` (or the formatters' dash) means it was not measured. */
  value: string | null;
  label: string;
  /** Lines under the label: a denominator, a caveat. Printed whether or not measured. */
  details?: readonly string[];
  /** Only for a measured condition in the estate. */
  tone?: Tone;
  /** Paints the figure with a Spectrum family on screen; print keeps the solid ink. */
  family?: SpectrumFamily;
}

/** The headline six, one family each, in the order of the Overview's KPI row. */
const SIX_FAMILIES: readonly SpectrumFamily[] = ['blue-turquoise', 'pink-purple', 'turquoise', 'moss', 'orange', 'purple'];

/**
 * 3.2.6: every figure of the report is a card in the app's own skin — an accent edge, a light wash
 * and the numeral painted in its family — so the deliverable reads like the app it came from
 * (until 3.2.5 most figures were plain black numbers under a heading). A toned figure states a
 * condition and keeps its tone instead of the family's paint; print keeps the solid ink.
 */
const PrintFigure = ({ value, label, details = [], tone, family = 'blue-turquoise' }: PrintFigureProps) => {
  const { t } = useTranslation();
  const missing = value === null || value === '—';
  return (
    <div className="pvs-rfig" data-print-atom data-spectrum={family} data-toned={tone === undefined ? undefined : 'true'} data-missing={missing ? 'true' : undefined}>
      <span className="pvs-rfig__edge" aria-hidden="true" />
      <Figure
        value={missing ? '' : value}
        size="md"
        tone={tone}
        missing={missing}
        missingLabel={t('state.notMeasured')}
        ink={tone === undefined ? 'spectrum' : undefined}
      />
      <Text className="pvs-label">{label}</Text>
      {missing && <Text className="pvs-caption">{t('state.notMeasured')}</Text>}
      {details.map((line, index) => (
        <Text key={index} className="pvs-caption">
          {line}
        </Text>
      ))}
    </div>
  );
};

/** Families for a row of figures, so neighbours read apart (identity, never a verdict). */
const ROW_FAMILIES: readonly SpectrumFamily[] = ['blue-turquoise', 'turquoise', 'moss', 'purple', 'orange', 'pink-purple', 'blue'];
const rowFamily = (index: number): SpectrumFamily => ROW_FAMILIES[index % ROW_FAMILIES.length] ?? 'blue-turquoise';

/** Tone of a vulnerability count by severity: only a non-zero count is a condition. */
const SEVERITY_TONE: Record<Severity, Tone | undefined> = {
  CRITICAL: 'critical',
  // Red, as on /security and in Strato's security risk palette (3.2.1).
  HIGH: 'critical',
  MEDIUM: undefined,
  LOW: undefined,
};

export const ValueReport = () => {
  const scope = useQueryScope();
  const { parameters, costModel, resolvedTimeframe, setTimeframe, pocPlan } = useStudio();
  // 3.2.5: the agreed objectives judged live, and the incidents told as stories.
  const criteria = useCriteriaResults(pocPlan.criteria);
  const rcaTop = useCatalogQuery('rca.top', scope);
  const rcaSummary = summariseRca(rcaTop.records, [], []);
  const { t, tCount, formatNumber, formatDateTime } = useTranslation();
  const windowLabel = t(`timeframe.${resolvedTimeframe.expression}` as StringKey);

  const inventory = useCatalogQuery('cov.inventory', scope);
  const mttx = useCatalogQuery('prob.mttx', scope);
  const exposure = useCatalogQuery('prob.exposure', scope);
  // 3.7.3: the hours and the money of the exposure count only problems with a named root cause.
  const exposureRca = useCatalogQuery('prob.exposure.rca', scope);
  const mttxRca = useCatalogQuery('prob.mttx.rca', scope);
  const technologies = useCatalogQuery('proc.technologies', scope);
  const topEntities = useCatalogQuery('prob.topentities', scope);
  const serviceTotals = useCatalogQuery('svc.totals', scope);
  const capacityTotal = useCatalogQuery('infra.capacity.total', scope);
  const capacity = useCatalogQuery('infra.capacity', scope);
  const capacityExact = useCatalogQuery('infra.capacity.summary', scope);
  const vulnerabilities = useCatalogQuery('sec.posture', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  const rumVitals = useCatalogQuery('rum.webvitals', scope);
  const cloudHosts = useCatalogQuery('cloud.hosts', scope);
  const cloudServices = useCatalogQuery('cloud.services', scope);
  const estate = summariseEstate(cloudHosts.records, [], cloudServices.records);
  const { signals, isLoading: signalsLoading } = useInsightSignals();
  // 3.2.6: the app's own pictures in the deliverable — the value chain, the stack map, the problem hours (3.2.7: ranked).
  const chain = useValueChain();
  const stack = useStackNodes();
  const hoursByCategory = problemHours(mttx.records);

  const days = windowDays(resolvedTimeframe);
  const withinBound = days <= MAX_REPORT_DAYS + 0.01;

  const entityModel = diagnoseEntityModel(inventory.records);

  const countOf = (category: string) =>
    num(
      inventory.records.find((record) => str(record, 'category') === category),
      'value',
    );

  const mttxRows = mttx.records.map((record) => ({
    category: str(record, 'event.category') ?? 'Uncategorised',
    problems: num(record, 'problems') ?? 0,
    mttrNs: num(record, 'mttrNs'),
    totalNs: num(record, 'totalNs') ?? 0,
  }));
  const resolvedProblems = mttxRows.reduce((total, row) => total + row.problems, 0);
  const resolvedTotalNs = mttxRows.reduce((total, row) => total + row.totalNs, 0);
  const overallMttrNs = resolvedProblems > 0 ? resolvedTotalNs / resolvedProblems : null;

  const exposureRecord = exposure.records[0];
  const activeProblems = num(exposureRecord, 'activeProblems');
  const totalOpenNs = num(exposureRecord, 'totalOpenNs');
  const oldestOpenNs = num(exposureRecord, 'oldestOpenNs');
  const avgOpenNs = num(exposureRecord, 'avgOpenNs');

  /**
   * Availability time only, for the downtime half of the exposure.
   *
   * Charging every problem-hour at a downtime rate would overstate the figure by
   * the ratio of all problems to availability problems, which on the validation
   * tenant is about twelve to one.
   */
  // 3.7.3: the exposure (hours and money) reads `prob.mttx.rca` — problems with a named root cause only.
  const rcaRows = mttxRca.records.map((record) => ({
    category: str(record, 'event.category') ?? 'Uncategorised',
    problems: num(record, 'problems') ?? 0,
    totalNs: num(record, 'totalNs') ?? 0,
  }));
  const rcaResolvedNs = rcaRows.reduce((total, row) => total + row.totalNs, 0);
  const availabilityNs = rcaRows
    .filter((row) => row.category.toUpperCase() === 'AVAILABILITY')
    .reduce((total, row) => total + row.totalNs, 0);
  const availabilityProblems = rcaRows
    .filter((row) => row.category.toUpperCase() === 'AVAILABILITY')
    .reduce((total, row) => total + row.problems, 0);

  // The resolved side (absorbed hours and cost, downtime, the problem counts beside them) is
  // read from `prob.mttx.rca`. Summing a query that did not answer gave "0 min", "Across 0 resolved
  // problems" — figures nobody measured — so without an answer there is no figure at all.
  const mttxRead = mttxRca.outcome === 'ok';
  const resolvedNs = mttxRead ? rcaResolvedNs : null;
  const availabilityHoursNs = mttxRead ? availabilityNs : null;

  const costFact = estimateOperationalCost(num(exposureRca.records[0], 'totalOpenNs'), costModel, exposureRca.evidence, { t });
  const absorbedCostFact = mttxRead
    ? estimateOperationalCost(rcaResolvedNs, costModel, mttxRca.evidence, { t })
    : missingFact(mttxRca);
  const downtimeCostFact = mttxRead
    ? estimateDowntimeCost(availabilityNs, costModel, mttxRca.evidence, { t })
    : missingFact(mttxRca);
  const combinedFact = mttxRead
    ? totalExposure(absorbedCostFact, downtimeCostFact, costModel, mttxRca.evidence, { t })
    : missingFact(mttxRca);

  /** The slowest category to resolve, which is where the effort concentrates. */
  const slowestCategory = [...mttxRows]
    .filter((row) => row.mttrNs !== null)
    .sort((a, b) => (b.mttrNs ?? 0) - (a.mttrNs ?? 0))[0];

  const techRows: TechRow[] = technologies.records
    .map((record) => {
      const parsed = parseTechnology(str(record, 'softwareTechnologies'));
      return {
        technology: parsed?.type ?? 'Not reported',
        version: parsed?.version ?? 'Not reported',
        instances: num(record, 'instances') ?? 0,
      };
    })
    .filter((row) => row.technology !== 'Not reported' && !isDynatraceTechnology(row.technology));

  const commercialVisible = useCommercialVisible();
  const insights = forAudience(prioritise(deriveInsights(signals, { t, formatNumber })), commercialVisible).slice(0, 6);

  // --- v2 enrichment: figures reused across the new visual sections -------
  const ENTITY_TYPES = [
    'Hosts',
    'Services',
    'Process instances',
    'Kubernetes clusters',
    'Kubernetes workloads',
    'Web applications',
    'Mobile applications',
    'Synthetic monitors',
  ] as const;
  const coveredTypes =
    inventory.outcome === 'ok'
      ? ENTITY_TYPES.filter((category) => (countOf(category) ?? 0) > 0).length
      : null;
  const coveragePct = coveredTypes === null ? null : (coveredTypes / ENTITY_TYPES.length) * 100;
  // Resolved problems come from `prob.mttx`, open ones from `prob.exposure`. A total is only a
  // total when both answered: with one source down it would be a partial count printed as the
  // whole (and, with both down, a "0" for something that was never measured). An empty
  // `prob.mttx` is an answer — nothing was closed in the window.
  const resolvedAnswered = mttx.outcome === 'ok' || mttx.outcome === 'empty';
  const activeAnswered = exposure.outcome === 'ok' && activeProblems !== null;
  const totalProblems: number | null =
    resolvedAnswered && activeAnswered ? resolvedProblems + (activeProblems ?? 0) : null;
  const closurePct =
    totalProblems !== null && totalProblems > 0 ? (resolvedProblems / totalProblems) * 100 : null;
  const pinned7d = t('timeframe.pinned.7d');
  const activePct =
    totalProblems !== null && totalProblems > 0 && activeProblems !== null
      ? (activeProblems / totalProblems) * 100
      : null;

  const techAgg = new Map<string, number>();
  for (const row of techRows) {
    techAgg.set(row.technology, (techAgg.get(row.technology) ?? 0) + row.instances);
  }
  const techFootprint = [...techAgg.entries()]
    .map(([technology, instances]) => ({ technology, instances }))
    .sort((a, b) => b.instances - a.instances)
    .slice(0, 10);

  const monitoredEntities = ENTITY_TYPES.reduce<number | null>((sum, category) => {
    const value = countOf(category);
    return value === null ? sum : (sum ?? 0) + value;
  }, null);
  const problemsDetected = totalProblems;
  const technologiesCount = techAgg.size;

  // --- v2 enrichment: services, infrastructure and reach -----------------
  const totalRequests = num(serviceTotals.records[0], 'totalRequests');
  const totalFailures = num(serviceTotals.records[0], 'totalFailures');
  const failureRatePct = num(serviceTotals.records[0], 'failureRatePct');
  const successPct = failureRatePct === null ? null : Math.max(0, Math.min(100, 100 - failureRatePct));

  const capTotal = capacityTotal.records[0];
  const totalHosts = num(capTotal, 'hosts');
  const totalCores = num(capTotal, 'totalCores');
  const totalMemBytes = num(capTotal, 'totalMemBytes');
  const capacitySummary =
    capacityExact.outcome === 'ok' || capacity.outcome === 'ok'
      ? capacityTotals(capacityExact.records[0], toHostCapacity(capacity.records), CAPACITY_LIST_LIMIT)
      : null;
  const oversizedHosts = capacitySummary?.oversized ?? null;
  const reclaimableBytes = capacitySummary?.reclaimableMemoryBytes ?? null;

  const vulnSummary = summarisePosture(vulnerabilities.records);
  // Four different things the section can say, none of which is "scope not granted" unless it is.
  const securityState: 'ok' | 'denied' | 'empty' | 'failed' =
    vulnerabilities.outcome === 'ok' && vulnSummary.total > 0
      ? 'ok'
      : vulnerabilities.outcome === 'no-permission'
        ? 'denied'
        : vulnerabilities.outcome === 'empty' || vulnerabilities.outcome === 'ok'
          ? 'empty'
          : 'failed';
  const vulnReadable = securityState === 'ok';
  const rum = summariseRum(rumScore.records, rumVitals.records);

  if (!withinBound) {
    return (
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('p.report.tooWide')}
        </Heading>
        <MessageContainer variant="critical">
          <MessageContainer.Title>
            {t('p.report.tooWideTitle', { days: Math.round(days) })}
          </MessageContainer.Title>
          <MessageContainer.Description>
            <Stack gap="tight">
              <Paragraph>{t('p.report.tooWideBound', { max: MAX_REPORT_DAYS })}</Paragraph>
              <Button variant="emphasized" onClick={() => setTimeframe('now-30d')}>
                {t('p.report.switch30')}
              </Button>
            </Stack>
          </MessageContainer.Description>
        </MessageContainer>
      </Stack>
    );
  }

  return (
    // 3.5.0 (DN-8): the report is a printed document — every platform chart in it is drawn at a fixed width, still.
    <StratoModeProvider mode="print">
    <Stack gap="section">
      <style>{PRINT_STYLES}</style>

      {/* ------------------------------------------------ screen-only bar */}
      <Cluster data-print-hide justify="between" gap="group">
        <Stack gap="tight">
          <Heading level={4} as="h2">
            {t('report.title')}
          </Heading>
          <Text className="pvs-caption">
            {t('report.windowLine', {
              window: windowLabel,
              days: Math.round(days),
              max: MAX_REPORT_DAYS,
            })}
          </Text>
        </Stack>
        <Cluster>
          {days < 25 && (
            // A suggestion about the window, not a condition in the estate: the recommendation
            // icon and plain text. (A pill truncated the sentence: "Consider the 30-day window for a cl…".)
            <Cluster gap="tight">
              <GuideIcon aria-hidden="true" />
              <Text>{t('p.report.consider30')}</Text>
            </Cluster>
          )}
          <Button variant="emphasized" onClick={() => window.print()}>
            <Button.Prefix>
              <DownloadIcon />
            </Button.Prefix>
            {t('report.download')}
          </Button>
        </Cluster>
      </Cluster>

      <div data-print-hide>
        <Callout kind="note" title={t('report.howTo.title')}>
          {t('report.howTo.body')}
        </Callout>
      </div>

      <Divider data-print-hide />

      {/* ----------------------------------------------------- report body */}
      <div data-print-section>
        <HeroBanner
          windowLabel={windowLabel}
          asOfIso={resolvedTimeframe.endIso}
          title={
            parameters.customerName === ''
              ? t('report.heroTitleAnon')
              : t('report.heroTitle', { customer: parameters.customerName })
          }
          subtitle={t('report.heroSubtitle')}
          headingAs="h2"
        />
      </div>

      {/* Co-branding strip — only when a delivery partner is set. A customer
          logo alone would just repeat the hero, so it stays hidden here. */}
      {(parameters.partnerLogoDataUrl !== null || parameters.partnerName !== '') && (
        <Panel pad="roomy" data-print-section>
          <Cluster justify="between" gap="section">
            {isSafeImageDataUrl(parameters.customerLogoDataUrl) && parameters.customerLogoDataUrl !== null && (
              <img
                className="pvs-hero__logo"
                src={parameters.customerLogoDataUrl}
                alt={
                  parameters.customerName === ''
                    ? t('c.hero.customerLogoAlt')
                    : t('c.hero.namedLogoAlt', { name: parameters.customerName })
                }
              />
            )}
            <Cluster gap="group">
              <Text className="pvs-label">{t('report.partner.label')}</Text>
              {isSafeImageDataUrl(parameters.partnerLogoDataUrl) && parameters.partnerLogoDataUrl !== null ? (
                <img
                  className="pvs-hero__logo"
                  src={parameters.partnerLogoDataUrl}
                  alt={
                    parameters.partnerName === ''
                      ? t('report.partner.logoAlt')
                      : t('report.partner.namedLogoAlt', { name: parameters.partnerName })
                  }
                />
              ) : (
                <Strong>{parameters.partnerName}</Strong>
              )}
            </Cluster>
          </Cluster>
        </Panel>
      )}

      {parameters.scopeDescription !== '' && (
        <Panel pad="roomy" data-print-section>
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('report.declaredScope')}
            </Heading>
            <Paragraph>{parameters.scopeDescription}</Paragraph>
          </Stack>
        </Panel>
      )}

      {/* 3.2.6: the value chain first — what the platform found, caught, closed and can automate. */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('roi3.chain.title')}
            </Heading>
            <Paragraph>{t('roi3.chain.body')}</Paragraph>
          </Stack>
          <ValueChain links={chain} label={t('roi3.chain.title')} />
        </Stack>
      </Panel>

      {/* The pillar tiles are cards of their own; no frame around them. */}
      <div data-print-section>
        <PillarSummary variant="detailed" results={criteria} />
      </div>

      {/* 3.2.5: what was agreed, and what the data proves of it. */}
      {criteria.length > 0 && (
        <div data-print-section>
          <CriteriaPanel results={criteria} />
        </div>
      )}

      {/* ----------------------------------- v2: environment health rings */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.glance.title')}
          </Heading>
          <Grid data-print-grid min={180}>
            <GaugeRing
              family="blue-turquoise"
              value={coveragePct}
              valueDisplay={coveragePct === null ? undefined : `${Math.round(coveragePct)}%`}
              label={t('cc.ring.coverage.label')}
              caption={coveragePct === null ? t('tl.notMeasured') : t('cc.ring.coverage.caption')}
              ariaLabel={t('cc.ring.coverage.aria')}
              missingLabel={t('tl.notMeasured')}
            />
            <GaugeRing
              family="turquoise"
              value={closurePct}
              valueDisplay={closurePct === null ? undefined : `${Math.round(closurePct)}%`}
              label={t('cc.ring.health.label')}
              caption={
                closurePct === null
                  ? t('tl.notMeasured')
                  : t('cc.ring.health.captionWindow', { window: t('timeframe.pinned.7d') })
              }
              ariaLabel={t('cc.ring.health.aria')}
              missingLabel={t('tl.notMeasured')}
            />
            <GaugeRing
              family="pink-purple"
              value={activePct}
              valueDisplay={activePct === null ? undefined : `${Math.round(activePct)}%`}
              label={t('ai.ring.active.label')}
              caption={activePct === null ? t('tl.notMeasured') : t('ai.ring.active.caption')}
              ariaLabel={t('ai.ring.active.aria')}
              missingLabel={t('tl.notMeasured')}
            />
          </Grid>
        </Stack>
      </Panel>

      {/* --------------------------------- v2: the PoC in six numbers */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.kpi.title')}
          </Heading>
          <Grid data-print-grid min={150}>
            {(
              [
                // The problem figures come from queries pinned to 7 days, whatever the report's
                // window: each says so, so "6,883 problems" is never read as the last 24 hours.
                [t('report.kpi.entities'), monitoredEntities === null ? null : formatNumber(monitoredEntities), []],
                [t('report.kpi.problems'), problemsDetected === null ? null : formatNumber(problemsDetected), [pinned7d]],
                [t('report.kpi.closed'), closurePct === null ? null : `${Math.round(closurePct)}%`, [pinned7d]],
                [t('report.kpi.mttr'), overallMttrNs === null ? null : formatNanos(overallMttrNs), [pinned7d]],
                [t('report.kpi.active'), activeProblems === null ? null : formatNumber(activeProblems), [pinned7d]],
                [t('report.kpi.technologies'), technologiesCount === 0 ? null : formatNumber(technologiesCount), []],
              ] as [string, string | null, string[]][]
            ).map(([label, value, details], index) => (
              <PrintFigure
                key={label}
                label={label}
                value={value}
                details={details}
                family={SIX_FAMILIES[index % SIX_FAMILIES.length]}
              />
            ))}
          </Grid>
        </Stack>
      </Panel>

      {/* -------------------------------------------------- 1. what exists */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.s1.title')}
          </Heading>
          <Paragraph>{t('report.s1.body')}</Paragraph>
          <EntityModelNotice diagnosis={entityModel} />
          <Grid data-print-grid min={150}>
            {(
              [
                [t('metric.hosts'), countOf('Hosts')],
                [t('metric.services'), countOf('Services')],
                [t('metric.processes'), countOf('Process instances')],
                [t('metric.clusters'), countOf('Kubernetes clusters')],
                [t('metric.workloads'), countOf('Kubernetes workloads')],
                [t('metric.synthetics'), countOf('Synthetic monitors')],
              ] as [string, number | null][]
            ).map(([label, value], index) => {
              // A zero is only printed when the entity model is answering. If it
              // is not, printing "0 hosts" would turn an outage into an apparent
              // measurement that the estate is empty - the worst thing this
              // report could tell a customer.
              const unavailable = value === null || entityModel.state === 'unavailable';
              return (
                <PrintFigure
                  key={label}
                  label={label}
                  value={unavailable ? null : formatNumber(value)}
                  details={unavailable ? [t('entity.outage.short')] : []}
                  family={rowFamily(index)}
                />
              );
            })}
          </Grid>
          {/* 3.2.6: the estate as the app draws it, from the user to the infrastructure (or the cloud). */}
          <Stack gap="tight" data-print-atom>
            <Heading level={5} as="h3">
              {t(stack.hasCloud ? 'stack.title' : 'stack.titleOnPrem')}
            </Heading>
            <StackMap nodes={stack.nodes} />
          </Stack>
        </Stack>
      </Panel>

      {/* --------------------------------- v2: services & reliability */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.svc.title')}
          </Heading>
          <Paragraph>{t('report.svc.body')}</Paragraph>
          <Grid data-print-grid min={180}>
            <PrintFigure
              label={t('report.svc.requests')}
              value={totalRequests === null ? null : formatNumber(totalRequests)}
              family="turquoise"
            />
            <PrintFigure
              label={t('report.svc.failures')}
              value={totalFailures === null ? null : formatNumber(totalFailures)}
              family="orange"
            />
            <PrintFigure
              label={t('report.svc.rate')}
              value={successPct === null ? null : `${decimal(successPct, 2)}%`}
              family="moss"
            />
          </Grid>
          {/* 3.3.18: the page's own panel — the slowest of the busiest services against the 1 s line. */}
          <div data-print-atom>
            <SlowestServices />
          </div>
        </Stack>
      </Panel>

      {/* --------------------------------- v2: infrastructure & right-sizing */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.infra.title')}
          </Heading>
          <Paragraph>{t('report.infra.body')}</Paragraph>
          <Grid data-print-grid min={160}>
            <PrintFigure
              label={t('report.infra.hosts')}
              value={totalHosts === null ? null : formatNumber(totalHosts)}
              family="blue"
            />
            <PrintFigure
              label={t('report.infra.cores')}
              value={totalCores === null ? null : formatNumber(totalCores)}
              family="blue-turquoise"
            />
            <PrintFigure
              label={t('report.infra.memory')}
              value={totalMemBytes === null ? null : formatBytes(totalMemBytes)}
              family="purple"
            />
            <PrintFigure
              label={t('report.infra.oversized')}
              value={oversizedHosts === null ? null : formatNumber(oversizedHosts)}
              family="orange"
            />
            <PrintFigure
              label={t('report.infra.reclaimable')}
              value={reclaimableBytes === null ? null : formatBytes(reclaimableBytes)}
              family="moss"
            />
          </Grid>
          {/* 3.3.18: ring + ranking — the hosts below 75% at peak beside the ones at their ceiling. */}
          <div data-print-atom>
            <HostsAtCeiling />
          </div>
        </Stack>
      </Panel>

      {(estate.hasCloud || estate.hasSizing) && (
        <Panel pad="roomy" data-print-section>
          <Stack gap="group">
            <Heading level={4} as="h2">
              {t('estate.report.title')}
            </Heading>
            {estate.cloudProviders.length > 0 && <CloudProviderIcons providers={estate.cloudProviders} size={26} />}
            <Grid data-print-grid min={220}>
              {estate.cloudHosts > 0 && (
                <PrintFigure
                  label={t('estate.cloud', { providers: estate.providerShorts.join(' · ') })}
                  value={formatNumber(estate.cloudHosts)}
                />
              )}
              {estate.cloudServices !== null && (
                <PrintFigure label={t('estate.services')} value={formatNumber(estate.cloudServices)} />
              )}
            </Grid>
            {estate.topCloudServices.length > 0 && (
              <Text>
                {t('estate.topServices', {
                  list: estate.topCloudServices
                    .slice(0, 6)
                    .map((service) => `${service.family} (${formatNumber(service.resources)})`)
                    .join(' · '),
                })}
              </Text>
            )}
            <Text className="pvs-caption">{t('estate.footnote')}</Text>
          </Stack>
        </Panel>
      )}

      {/* ------------------------------------------------ 2. how it behaves */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.s2.title')}
          </Heading>
          {/* 3.3.17 (owner): the eight figures four to a row, so the section sits on fewer lines. */}
          {/* 3.3.18: the eight figures stay together on one page (the owner's 3.3.17 review). */}
          <div data-print-atom>
            <Grid data-print-grid min={150}>
              <PrintFigure
                label={t('metric.mttr')}
                value={formatNanos(overallMttrNs)}
                details={mttxRead ? [tCount('metric.mttrDetail', resolvedProblems, { count: formatNumber(resolvedProblems) })] : []}
              />
              <PrintFigure
                label={t('metric.openNow')}
                value={activeProblems === null ? null : formatNumber(activeProblems)}
              />
              <PrintFigure
                label={t('metric.openTime')}
                value={formatHours(nanosToHours(totalOpenNs))}
                details={[t('metric.measuredByPlatform')]}
              />
              <PrintFigure label={t('metric.longestOpen')} value={formatNanos(oldestOpenNs)} />
              <PrintFigure
                label={t('report.exec.avgOpen')}
                value={formatNanos(avgOpenNs)}
                details={[t('report.exec.avgOpenDetail')]}
              />
              <PrintFigure
                label={t('report.exec.downtime')}
                value={formatHours(nanosToHours(availabilityHoursNs))}
                details={mttxRead ? [tCount('report.exec.downtimeDetail', availabilityProblems, { count: formatNumber(availabilityProblems) })] : []}
              />
              <PrintFigure
                label={t('report.exec.slowestCategory')}
                value={slowestCategory === undefined ? null : formatNanos(slowestCategory.mttrNs)}
                details={[slowestCategory?.category ?? '—']}
              />
              <PrintFigure
                label={t('report.exec.absorbed')}
                value={formatHours(nanosToHours(resolvedNs))}
                details={[t('report.exec.absorbedDetail')]}
              />
            </Grid>
          </div>
          {/* 3.3.18: when problems begin, every 6 hours, with the window's mean dashed. */}
          <div data-print-atom>
              <ProblemArrivals />
          </div>

          {/* Priced exposure is commercial: it prints only when "Commercial data" is on, so a PDF made
              for the customer never carries it. */}
          <SeOnly>
          {/* ---------------------------------- exposure, both halves */}
          <Stack gap="tight">
            <Heading level={5} as="h3">
              {t('report.exec.exposureTitle')}
            </Heading>
            <Paragraph>{t('report.exec.exposureBody')}</Paragraph>
            <Grid data-print-grid min={240}>
              <StatTile
                label={t('report.exec.responseCost')}
                fact={absorbedCostFact}
                display={
                  typeof absorbedCostFact.value === 'number'
                    ? formatMoney(absorbedCostFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={t('report.exec.responseCostDetail', {
                  hours: formatHours(nanosToHours(resolvedNs)),
                })}
                compact
              />
              <StatTile
                label={t('report.exec.downtimeCost')}
                fact={downtimeCostFact}
                display={
                  typeof downtimeCostFact.value === 'number'
                    ? formatMoney(downtimeCostFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={t('report.exec.downtimeCostDetail', {
                  hours: formatHours(nanosToHours(availabilityHoursNs)),
                })}
                compact
              />
              <StatTile
                label={t('report.exec.combined')}
                fact={combinedFact}
                display={
                  typeof combinedFact.value === 'number'
                    ? formatMoney(combinedFact.value, costModel.currencyLabel)
                    : undefined
                }
                detail={t('report.exec.combinedDetail')}
                compact
              />
            </Grid>
            {combinedFact.note !== undefined && <Text className="pvs-caption">{combinedFact.note}</Text>}
          </Stack>

          {/* A cost built on a rate somebody typed in is an estimate, and says so. */}
          {isCostConfigured(costModel) ? (
            <Callout
              kind="estimate"
              title={`${t('p.report.costLabel')} ${
                typeof costFact.value === 'number'
                  ? formatMoney(costFact.value, costModel.currencyLabel)
                  : '—'
              }`}
            >
              <Stack gap="tight">
                <Paragraph>{costFact.note}</Paragraph>
                <Paragraph>{t('cost.assumptionWarning')}</Paragraph>
              </Stack>
            </Callout>
          ) : (
            <Callout kind="pending" title={t('cost.noneTitle')}>
              {t('cost.noneBody')}
            </Callout>
          )}
          </SeOnly>

          {/* 3.2.6: where the problem hours went, as Value & ROI draws it, with the action it calls for. */}
          {hoursByCategory.length > 0 && (
            <Stack gap="tight" data-print-atom data-spectrum="pink-purple">
              <Heading level={5} as="h3">
                {t('roi.split.title')}
              </Heading>
              <HoursBreakdown rows={hoursByCategory} />
            </Stack>
          )}
        </Stack>
      </Panel>

      {/* ------------------------------------------ 3. where it concentrates */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.s3.title')}
          </Heading>
          <Grid min={320}>
            {mttxRows.length > 0 && (
              <Stack gap="tight">
                <Heading level={5} as="h3">
                  {t('report.mix.title')}
                </Heading>
                <DonutBreakdown
                heads={{ name: t('v6.legend.name'), count: t('v6.legend.count'), share: t('v6.hex.share') }}
                  ariaLabel={t('report.mix.title')}
                  centerDisplay={formatNumber(mttxRows.reduce((sum, row) => sum + row.problems, 0))}
                  centerLabel={t('ai.unit.problems')}
                  segments={mttxRows.map((row) => ({
                    key: row.category,
                    label: row.category,
                    value: row.problems,
                    display: formatNumber(row.problems),
                  }))}
                />
              </Stack>
            )}
            {topEntities.records.length > 0 ? (
              <Stack gap="tight">
                <Heading level={5} as="h3">
                  {t('exec.concentration')}
                </Heading>
                <BarList role="magnitude"
                  ariaLabel={t('exec.topEntitiesAria')}
                  items={topEntities.records.slice(0, 10).map((record, index) => ({
                    key: `${str(record, 'affected') ?? 'unknown'}-${index}`,
                    label: str(record, 'affected') ?? t('common.notReported'),
                    value: num(record, 'problems') ?? 0,
                    display: formatNumber(num(record, 'problems') ?? 0),
                  }))}
                />
              </Stack>
            ) : (
              <Text>{t('exec.noEntity')}</Text>
            )}
          </Grid>
        </Stack>
      </Panel>

      {/* 3.2.6: the root-cause trail of the most impactful incident — Davis's analysis as the app draws it. */}
      {rcaSummary.incident !== null && (
        <Panel pad="roomy" data-print-section>
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('report3.trail.title')}
              </Heading>
              <Paragraph>{t('report3.trail.body', { id: rcaSummary.incident.displayId, name: rcaSummary.incident.name })}</Paragraph>
            </Stack>
            <RcaTrail incident={rcaSummary.incident} />
          </Stack>
        </Panel>
      )}

      {/* 3.2.5: the most telling incidents, told as stories. */}
      <div data-print-section>
        <IncidentStories stories={incidentStories(rcaSummary.incident, rcaSummary.others)} />
      </div>

      {/* ------------------------------------------------- 4. technologies */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.s4.title')}
          </Heading>
          <Paragraph>{t('report.s4.body')}</Paragraph>
          {techFootprint.length > 0 && (
            <Stack gap="tight">
              <Heading level={5} as="h3">
                {t('report.footprint.title')}
              </Heading>
              <BarList role="magnitude"
                ariaLabel={t('report.footprint.title')}
                items={techFootprint.map((row) => ({
                  key: row.technology,
                  label: row.technology,
                  value: row.instances,
                  display: formatNumber(row.instances),
                }))}
              />
            </Stack>
          )}
        </Stack>
      </Panel>

      {/* --------------------------------- v2: security & runtime risk */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.sec.title')}
          </Heading>
          <Paragraph>{t('report.sec.body')}</Paragraph>
          {vulnReadable ? (
            <Grid data-print-grid min={140}>
              <PrintFigure label={t('report.sec.total')} value={formatNumber(vulnSummary.total)} family="red" />
              {SEVERITY_ORDER.map((severity) => (
                <PrintFigure
                  key={severity}
                  label={t(SEVERITY_REPORT_LABEL[severity])}
                  value={formatNumber(vulnSummary.bySeverity[severity])}
                  tone={vulnSummary.bySeverity[severity] > 0 ? SEVERITY_TONE[severity] : undefined}
                />
              ))}
            </Grid>
          ) : (
            <Callout
              kind="note"
              title={securityState === 'empty' ? t('p.sec.empty.title') : t('report.sec.pendingTitle')}
            >
              {securityState === 'denied'
                ? t('report.sec.blocked')
                : securityState === 'empty'
                  ? t('p.sec.empty.body')
                  : t('report.sec.failed')}
            </Callout>
          )}
        </Stack>
      </Panel>

      {/* --------------------------------- v2: digital experience (real users) */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('rum.report.title')}
          </Heading>
          <Paragraph>{t('rum.report.body')}</Paragraph>
          {rum.hasData ? (
            <Grid data-print-grid min={160}>
              <PrintFigure label={t('p.dx2.kpi.requests')} value={formatNumber(rum.totalRequests)} />
              <PrintFigure label={t('p.dx2.kpi.actions')} value={formatNumber(rum.totalActions)} />
              <PrintFigure
                label={t('p.dx2.kpi.errorRate')}
                value={rum.overallErrorRatePct === null ? null : `${formatNumber(rum.overallErrorRatePct)}%`}
              />
              <PrintFigure
                label={t('p.dx2.kpi.worstInp')}
                value={rum.worstInp === null ? null : `${formatNumber(Math.round(rum.worstInp))} ms`}
                tone={rum.poorInpApps > 0 ? 'critical' : undefined}
              />
            </Grid>
          ) : null}
          {/* 3.2.6: the busiest application's Core Web Vitals, on the dials of the Digital experience page. */}
          {rum.hasData && rum.apps[0] !== undefined ? (
            <Stack gap="tight" data-print-atom>
              <Heading level={5} as="h3" className="pvs-wrap">
                {t('report3.vitals.title', { app: rum.apps[0].name })}
              </Heading>
              <VitalsDials app={rum.apps[0]} />
            </Stack>
          ) : (
            <Callout kind="note" title={t('report.rum.opportunityTitle')}>
              {t('rum.report.notObserved')}
            </Callout>
          )}
          {/* 3.3.18: ring + ranking — requests without a front-end error beside the errors by application. */}
          <div data-print-atom>
            <FrontendErrors />
          </div>
        </Stack>
      </Panel>

      {/* ---------------------------------------------- 5. recommendations */}
      <Panel pad="roomy" data-print-section>
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('report.s5.title')}
          </Heading>
          {signalsLoading ? (
            <Text>{t('p.report.deriving')}</Text>
          ) : insights.length === 0 ? (
            <Text>
              {t('p.report.noSignal')}
            </Text>
          ) : (
            insights.map((insight, index) => (
              <Stack key={insight.id} gap="tight" data-print-atom>
                <Text>
                  <Strong>
                    {t('p.report.insightLine', {
                      index: index + 1,
                      title: insight.title,
                      impact: t(`qual.${insight.impact}`),
                      effort: t(`qual.${insight.effort}`),
                    })}
                  </Strong>
                </Text>
                <Text>{t('p.report.measured', { value: insight.observation })}</Text>
                <Text>{t('p.report.recommended', { value: insight.recommendation })}</Text>
              </Stack>
            ))
          )}
          <Paragraph className="pvs-prose">{t('report.s5.disclaimer')}</Paragraph>
        </Stack>
      </Panel>

      {/* -------------------------------------------------- 6. what is missing */}
      {(() => {
        // Only declare a gap that is actually true for this tenant: RUM is a gap
        // only when it was not usable, security only when it was blocked or empty,
        // topology only when the entity graph is not queryable here. Each is a
        // limitation of this review, so each is a neutral dashed callout.
        const showRumGap = !rum.hasData;
        const showSecurityGap = securityState !== 'ok';
        const showTopologyGap = entityModel.state === 'unavailable';
        if (!showRumGap && !showSecurityGap && !showTopologyGap) return null;
        return (
          <Panel pad="roomy" data-print-section>
            <Stack gap="group">
              <Heading level={4} as="h2">
                {t('report.s6.title')}
              </Heading>
              {showRumGap && (
                <Callout kind="limitation" title={t('gap.rum.title')}>
                  {t('gap.rum.body')}
                </Callout>
              )}
              {showSecurityGap && (
                <Callout kind="limitation" title={t('gap.security.title')}>
                  {securityState === 'denied'
                    ? t('gap.security.body')
                    : securityState === 'empty'
                      ? t('gap.security.bodyEmpty')
                      : t('report.sec.failed')}
                </Callout>
              )}
              {showTopologyGap && (
                <Callout kind="limitation" title={t('gap.topology.title')}>
                  {t('gap.topology.body')}
                </Callout>
              )}
            </Stack>
          </Panel>
        );
      })()}

      <Panel pad="roomy" data-print-section>
        <Stack gap="tight">
          <Text className="pvs-caption">
            {t('report.footer.generated', {
              start: formatDateTime(resolvedTimeframe.startIso),
              end: formatDateTime(resolvedTimeframe.endIso),
            })}
          </Text>
          <Text className="pvs-caption">{t('report.footer.reproducible')}</Text>
        </Stack>
      </Panel>
    </Stack>
    </StratoModeProvider>
  );
};
