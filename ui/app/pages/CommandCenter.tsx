import React from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { ApplicationsIcon, CheckmarkIcon, ServicesIcon, TechnologiesIcon, WarningIcon } from '@dynatrace/strato-icons';

import { StageCrumb } from '../components/SectionIntro';
import { EnvironmentFlow } from '../components/spectrum';
import { ENTITY_TILES, inventoryDetail } from '../components/spectrum/entityTiles';
import { OverviewHeader } from '../features/cockpit/OverviewHeader';
import { StratoGauge, StratoKpi, StratoKpiRow, StratoSplit, type KpiDelta } from '../engine/strato';
import Colors from '@dynatrace/strato-design-tokens/colors';
import { BASELINE_CATEGORIES, inventoryDeltas } from '../models/pocBaseline';
import { FAILURE_BAND_COLOR } from '../design/palette';
import { problemCategoryLabel } from '../features/problems/categoryLabel';
import { EntityModelNotice } from '../components/EntityModelNotice';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { PillarSummary } from '../features/pillars/PillarSummary';
import { KeyDiscoveries } from '../features/discoveries/KeyDiscoveries';
import { Scorecard } from '../features/scorecard/Scorecard';
import { OverviewCockpit } from '../features/cockpit/OverviewCockpit';
import { Panel, Stack } from '../engine';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { getQuery } from '../queries/catalog';
import { observed, unavailable, type Fact } from '../models/provenance';
import { diagnoseEntityModel, isMeasuredZero } from '../models/entityHealth';
import { summariseRum } from '../models/rum';
import { useStackNodes } from '../features/stack/useStackNodes';
import type { StringKey } from '../i18n/strings';
import { useTranslation } from '../i18n/useTranslation';
import { num, ratio, str } from '../utils/records';
import { missingFact, useSummaryFact } from '../hooks/useSummaryFact';

/**
 * The Overview — the front door of the story (stage 1, "Context").
 *
 * The opening move: three health rings, five headline values, the monitored
 * inventory, the stack map and the story map that lets a viewer open any of the nine
 * stages. Every figure is read live from the tenant and shows a dash with a reason when
 * it cannot be measured — the v1 honesty rule, kept inside the v3.1 shell.
 *
 * 3.2.1 ("Value Spectrum"): the rings sit in the hero and are drawn by `GaugeRing`, the
 * headline values by `KpiHero`, the inventory carries functional icons, and the stack map
 * draws the estate from the user to the cloud. The third ring used to be this app's own
 * "query efficiency": a figure about the tool, not about the estate, on the front door. It
 * is now the share of services with traffic that stay under 1 % failed requests, counted
 * over every service in the query (`svc.ranking.total`).
 *
 * The banner is this page's `h1` (the Overview has no other title). v2 also drew
 * seven neon "chapter" tiles here, one hue each, that did not match the order the
 * app is read in; the `StoryMap` replaced them with the nine stages.
 *
 * 3.2.6: the story map and the cloud estate panel left the page — the side navigation already
 * lists the stages, and the stack map already draws the clouds (or, for an estate on
 * premises, ends at the infrastructure and says so in its title).
 */

const ENTITY_CATEGORIES = [
  'Hosts',
  'Services',
  'Process instances',
  'Kubernetes clusters',
  'Kubernetes workloads',
  'Web applications',
  'Mobile applications',
  'Synthetic monitors',
] as const;


export const CommandCenter = () => {
  const scope = useQueryScope();
  const { parameters, isUnconfigured, resolvedTimeframe } = useStudio();
  const { t, formatNumber } = useTranslation();
  const factFrom = useSummaryFact();
  const windowLabel = t(`timeframe.${resolvedTimeframe.expression}` as StringKey);

  const inventory = useCatalogQuery('cov.inventory', scope);
  const problems = useCatalogQuery('prob.summary', scope);
  const serviceTotals = useCatalogQuery('svc.ranking.total', scope);
  // 3.5.3: the environment flow's hot layers read the capacity verdicts the cockpit already reads (one cached answer).
  const capacitySummary = useCatalogQuery('infra.capacity.summary', scope);
  const rumScore = useCatalogQuery('rum.scorecard', scope);
  // 3.5.8 (v6): the inventory beside the PoC's Day 0 — the existing catalog entry of the PoC timeline (entity model,
  // 0 B), read only once a PoC start date is set; without it no change is shown, never an estimate.
  const day0 = useCatalogQuery('cov.inventory.day0', scope);

  // When every category answers zero at once the entity model is not answering: those
  // zeros are not counts. The KPI tiles already refuse them; the cards and rings that sum
  // the same categories must refuse them too, or an outage reads as "0 entities, 0% coverage".
  const entityModel = diagnoseEntityModel(inventory.records);
  const entityOutage = entityModel.state === 'unavailable';

  const categoryCount = (category: string): number | null => {
    if (inventory.outcome !== 'ok' || entityOutage) return null;
    const record = inventory.records.find((item) => str(item, 'category') === category);
    return num(record, 'value');
  };

  const monitoredEntities = ENTITY_CATEGORIES.reduce<number | null>((total, category) => {
    const value = categoryCount(category);
    if (value === null) return total;
    return (total ?? 0) + value;
  }, null);

  const coveredTypes = ENTITY_CATEGORIES.filter((category) => (categoryCount(category) ?? 0) > 0).length;
  const coveragePct =
    inventory.outcome === 'ok' && !entityOutage ? (coveredTypes / ENTITY_CATEGORIES.length) * 100 : null;

  const totalProblems = problems.records.reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const activeProblems = problems.records
    .filter((record) => str(record, 'event.status') === 'ACTIVE')
    .reduce((total, record) => total + (num(record, 'problems') ?? 0), 0);
  const closedProblems = totalProblems - activeProblems;
  const closureRatio = ratio(closedProblems, totalProblems);
  const closurePct = problems.outcome === 'ok' ? closureRatio?.percent ?? null : null;

  // Service health: every service that handled traffic, counted in the query, not a top-N list.
  const serviceRow = serviceTotals.records[0];
  const servicesWithTraffic = num(serviceRow, 'services');
  const servicesAboveOnePct = num(serviceRow, 'aboveOnePct');
  const serviceHealthPct =
    serviceTotals.outcome === 'ok' && servicesWithTraffic !== null && servicesWithTraffic > 0 && servicesAboveOnePct !== null
      ? ((servicesWithTraffic - servicesAboveOnePct) / servicesWithTraffic) * 100
      : null;

  const servicesCount = categoryCount('Services');
  const rum = summariseRum(rumScore.records, []);
  const rumErrorRatePct = rum.hasData ? rum.overallErrorRatePct : null;

  const categoryFact = (category: string): Fact<number | string | null> => {
    const record = inventory.records.find((item) => str(item, 'category') === category);
    const value = num(record, 'value');
    if (inventory.outcome === 'no-permission') {
      return unavailable('no-permission', t('req.scope', { scope: 'storage:entities:read' }), inventory.evidence);
    }
    if (value === null) return missingFact(inventory);
    if (value === 0 && !isMeasuredZero(entityModel)) {
      return unavailable('no-telemetry', t('req.entityOutage'), inventory.evidence);
    }
    return observed(value, inventory.evidence);
  };

  const baselineDeltas = day0.outcome === 'ok' && inventory.outcome === 'ok' && !entityOutage ? inventoryDeltas(day0.records, inventory.records) : [];
  const deltaFor = (category: string): KpiDelta | undefined => {
    if (!(BASELINE_CATEGORIES as readonly string[]).includes(category)) return undefined;
    const change = baselineDeltas.find((entry) => entry.category === category)?.delta;
    if (change === null || change === undefined) return undefined;
    const display = `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatNumber(Math.abs(change))}`;
    return { value: change, display, words: t('v6.delta.day0', { change: display }), tone: change > 0 ? 'good' : 'neutral' };
  };
  const anyDelta = ENTITY_TILES.some(({ inventoryCategory }) => deltaFor(inventoryCategory) !== undefined);

  const stack = useStackNodes();
  // 3.5.3: a layer pulses only for something measured now — services above the 1 % failure line, saturated hosts.
  const saturatedHosts = capacitySummary.outcome === 'ok' ? num(capacitySummary.records[0], 'saturated') : null;
  const flowHot = {
    ...(servicesAboveOnePct !== null && servicesAboveOnePct > 0 ? { services: t('flow.hot.services', { n: formatNumber(servicesAboveOnePct) }) } : {}),
    ...(saturatedHosts !== null && saturatedHosts > 0 ? { hosts: t('flow.hot.hosts', { n: formatNumber(saturatedHosts) }) } : {}),
  };

  // 3.3.8: a measured split under every headline that has no time series (only the active problems
  // have one): the estate by layer, services by failure band, problems closed vs. open, errors by app.
  const share = (part: number, whole: number) => (whole > 0 ? `${formatNumber(Math.round((part * 1000) / whole) / 10)}%` : '');
  const layers = ENTITY_TILES.map((tile) => ({ key: tile.inventoryCategory, label: t(tile.labelKey), value: categoryCount(tile.inventoryCategory) ?? 0 }))
    .filter((layer) => layer.value > 0)
    .sort((a, b) => b.value - a.value);
  const layerTotal = layers.reduce((sum, layer) => sum + layer.value, 0);
  const entityMeter =
    layers.length > 1
      ? [...layers.slice(0, 3), ...(layers.length > 3 ? [{ key: 'others', label: t('cockpit.donut.others'), value: layers.slice(3).reduce((sum, layer) => sum + layer.value, 0) }] : [])]
      : undefined;
  const entityTrend = entityMeter === undefined ? undefined : layers.slice(0, 2).map((layer) => `${layer.label} ${share(layer.value, layerTotal)}`).join(' · ');

  const failing = num(serviceRow, 'failing');
  const serviceMeter =
    serviceTotals.outcome === 'ok' && servicesWithTraffic !== null && servicesWithTraffic > 0 && failing !== null && servicesAboveOnePct !== null
      ? [
          // 3.4.16 (D-10): the platform's "Status and health" scale — above the 1 % line Warning, failures under it
          // Good (blue), no failure Ideal (green); the words in the caption carry the same reading.
          { label: t('cc.meter.services.above'), value: servicesAboveOnePct, color: FAILURE_BAND_COLOR.review },
          { label: t('cc.meter.services.failing'), value: Math.max(0, failing - servicesAboveOnePct), color: FAILURE_BAND_COLOR.under },
          { label: t('cc.meter.services.clean'), value: Math.max(0, servicesWithTraffic - failing), color: FAILURE_BAND_COLOR.none },
        ]
      : undefined;
  const serviceTrend =
    serviceMeter === undefined
      ? undefined
      : t('cc.meter.services.caption', {
          above: formatNumber(servicesAboveOnePct ?? 0),
          failing: formatNumber(Math.max(0, (failing ?? 0) - (servicesAboveOnePct ?? 0))),
          clean: formatNumber(Math.max(0, (servicesWithTraffic ?? 0) - (failing ?? 0))),
        });

  const closedMeter = problems.outcome === 'ok' && totalProblems > 0;
  const closedTrend = !closedMeter ? undefined : t('cc.meter.closed.caption', { pct: share(closedProblems, totalProblems), total: formatNumber(totalProblems) });

  // 3.4.18 (DN-4): the active problems split by category, from the same read as the number — the arrivals line of
  // `prob.timeline` measured something else (problems that began per 6 h) and left the tile.
  const activeByCategory = new Map<string, number>();
  for (const record of problems.records) {
    if (str(record, 'event.status') !== 'ACTIVE') continue;
    const category = str(record, 'event.category') ?? 'OTHER';
    activeByCategory.set(category, (activeByCategory.get(category) ?? 0) + (num(record, 'problems') ?? 0));
  }
  const activeSplit = [...activeByCategory.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ label: problemCategoryLabel(category, t), value: count }));
  const activeTrend =
    activeSplit.length > 1 ? activeSplit.slice(0, 2).map((part) => `${part.label} ${share(part.value, activeProblems)}`).join(' · ') : undefined;

  const appErrors = rum.apps
    .filter((app): app is typeof app & { errors: number } => app.errors !== null && app.errors > 0)
    .sort((a, b) => b.errors - a.errors);
  const errorTotal = appErrors.reduce((sum, app) => sum + app.errors, 0);
  const frontendMeter =
    rumErrorRatePct !== null && appErrors.length > 0
      ? [
          ...appErrors.slice(0, 3).map((app) => ({ label: app.name, value: app.errors })),
          ...(appErrors.length > 3 ? [{ label: t('cockpit.donut.others'), value: appErrors.slice(3).reduce((sum, app) => sum + app.errors, 0) }] : []),
        ]
      : undefined;
  const top = appErrors[0];
  const frontendTrend = frontendMeter === undefined || top === undefined ? undefined : t('cc.meter.frontend.caption', { app: top.name.length > 26 ? `${top.name.slice(0, 25)}…` : top.name, pct: share(top.errors, errorTotal) });

  return (
    <>
      <StageCrumb />

      <OverviewHeader
        windowLabel={windowLabel}
        asOfIso={resolvedTimeframe.endIso}
        title={isUnconfigured ? t('cc.title') : t('cc.titleNamed', { customer: parameters.customerName })}
        subtitle={t('cc.subtitle', { window: windowLabel })}
        gauges={
          <>
            <StratoGauge
              testId="cc-gauge-coverage"
              value={coveragePct}
              label={t('cc.ring.coverage.label')}
              caption={t('cc.ring.coverage.caption')}
              fact={factFrom(inventory, coveragePct === null ? null : Math.round(coveragePct), { calculation: t('cc.ring.coverage.calc'), unit: '%' })}
            />
            <StratoGauge
              testId="cc-gauge-closed"
              value={closurePct}
              label={t('cc.ring.health.label')}
              caption={t('cc.ring.health.captionWindow', { window: t('timeframe.pinned.7d') })}
              fact={factFrom(problems, closurePct === null ? null : Math.round(closurePct), { calculation: t('cc.ring.health.calc'), unit: '%' })}
            />
            <StratoGauge
              testId="cc-gauge-services"
              value={serviceHealthPct}
              label={t('cc.ring.services.label')}
              caption={servicesWithTraffic === null ? undefined : t('cc.ring.services.caption', { count: formatNumber(servicesWithTraffic) })}
              fact={factFrom(serviceTotals, serviceHealthPct === null ? null : Math.round(serviceHealthPct), { calculation: t('cc.ring.services.calc'), unit: '%' })}
            />
          </>
        }
      />

      {/* 3.4.18: one KPI anatomy on the platform's SingleValue — label, value, a measured mark, caption, evidence. */}
      <StratoKpiRow testId="cc-kpis">
        <StratoKpi
          testId="cc-kpi-entities"
          badge={<TechnologiesIcon />}
          label={t('cc.card.entities.eyebrow')}
          fact={factFrom(inventory, monitoredEntities, { calculation: t('cc.card.entities.calc') })}
          value={monitoredEntities}
          formatter={(value) => formatNumber(value)}
          caption={entityTrend ?? t('cc.card.entities.caption')}
          mark={entityMeter === undefined ? undefined : <StratoSplit parts={entityMeter} ariaLabel={t('cc.meter.entities')} />}
        />
        <StratoKpi
          testId="cc-kpi-active"
          badge={<WarningIcon />}
          label={t('cc.card.active.eyebrow')}
          fact={factFrom(problems, problems.outcome === 'ok' ? activeProblems : null)}
          value={problems.outcome === 'ok' ? activeProblems : null}
          formatter={(value) => formatNumber(value)}
          caption={activeTrend ?? t('cc.card.active.caption')}
          mark={activeSplit.length > 1 ? <StratoSplit parts={activeSplit} ariaLabel={t('cc.card.active.eyebrow')} /> : undefined}
        />
        <StratoKpi
          testId="cc-kpi-services"
          badge={<ServicesIcon />}
          label={t('cc.card.services.eyebrow')}
          fact={factFrom(inventory, servicesCount)}
          value={servicesCount}
          formatter={(value) => formatNumber(value)}
          caption={serviceTrend ?? t('cc.card.services.caption')}
          mark={serviceMeter === undefined ? undefined : <StratoSplit parts={serviceMeter} ariaLabel={t('cc.meter.services')} />}
        />
        <StratoKpi
          testId="cc-kpi-closed"
          badge={<CheckmarkIcon />}
          label={t('cc.card.closed.eyebrow')}
          fact={factFrom(problems, problems.outcome === 'ok' ? closedProblems : null, { calculation: t('cc.card.closed.calc') })}
          value={problems.outcome === 'ok' ? closedProblems : null}
          formatter={(value) => formatNumber(value)}
          caption={closedTrend ?? t('cc.card.closed.caption')}
          // 3.6.0 (owner: "o formato de mini barras … repassado aos demais com as cores diferenciando os dados"): closed and
          // still open, which together are every problem of the window, as mini bars like every other card.
          mark={
            closedMeter ? (
              <StratoSplit
                parts={[
                  { label: t('cc.meter.closed'), value: closedProblems },
                  { label: t('v6.split.open'), value: activeProblems, color: Colors.Charts.Status.Neutral.Default },
                ]}
                ariaLabel={t('cc.card.closed.eyebrow')}
              />
            ) : undefined
          }
        />
        <StratoKpi
          testId="cc-kpi-frontend"
          badge={<ApplicationsIcon />}
          label={t('rum.kpi.errorRate')}
          fact={factFrom(rumScore, rumErrorRatePct, { calculation: t('rum.kpi.errorRateCalc') })}
          value={rumErrorRatePct}
          formatter={(value) => formatNumber(Math.round(value * 100) / 100)}
          unit="%"
          caption={rumErrorRatePct === null ? t('rum.notObserved') : frontendTrend ?? t('rum.kpi.errorRateCaption')}
          // 3.6.0 (owner: the mini bars on every card, coloured by part): the errors split by application.
          mark={frontendMeter === undefined ? undefined : <StratoSplit parts={frontendMeter} ariaLabel={t('cc.meter.frontend')} />}
        />
      </StratoKpiRow>

      <EntityModelNotice diagnosis={entityModel} />

      {/* 3.3.7: the cockpit — since 3.4.18 on the platform's TimeseriesChart, DonutChart and CategoricalBarChart. */}
      <OverviewCockpit />

      <Panel pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t('cc.inventory.title')}
          </Heading>
          <StratoKpiRow min={160} valueCap={28} testId="cc-inventory">
            {ENTITY_TILES.filter(({ inventoryCategory: category }) => {
              // Hide categories measured as exactly zero (e.g. no mobile apps), so
              // a "0" tile never dilutes the estate; the grid reflows on its own.
              const value = categoryCount(category);
              return !(inventory.outcome === 'ok' && value === 0);
            }).map(({ inventoryCategory: category, labelKey, icon }) => (
              <StratoKpi
                key={category}
                size="sm"
                label={t(labelKey)}
                badge={icon}
                fact={categoryFact(category)}
                value={categoryCount(category)}
                formatter={(value) => formatNumber(value)}
                caption={inventoryDetail(category, inventory.records, t, formatNumber)}
                delta={deltaFor(category)}
              />
            ))}
          </StratoKpiRow>
          {anyDelta && <Text className="pvs-caption">{t('v6.delta.day0Note')}</Text>}
          {/* 3.3.9: the window and the query once for the row (every tile reads cov.inventory). */}
          <Text className="pvs-caption">{t('cockpit.inv.source', { window: windowLabel, query: 'cov.inventory' })}</Text>
        </Stack>
      </Panel>

      <Panel pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t(stack.hasCloud ? 'flow.title' : 'flow.titleOnPrem')}
          </Heading>
          <EnvironmentFlow nodes={stack.nodes} hot={flowHot} />
          {stack.unattributedShown && <Text className="pvs-caption">{t('stack.unattributedNote')}</Text>}
        </Stack>
      </Panel>

      <Text className="pvs-caption">{t('cc.footnote')}</Text>

      <KeyDiscoveries />

      <PillarSummary />

      <Scorecard />

      <DqlDisclosure
        entries={[
          getQuery('cov.inventory'),
          getQuery('prob.summary'),
          getQuery('prob.timeline'),
          getQuery('svc.ranking.total'),
          getQuery('svc.ranking'),
          getQuery('infra.capacity'),
          getQuery('infra.capacity.summary'),
          getQuery('cloud.hosts'),
        ]}
      />
    </>
  );
};
