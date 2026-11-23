import React, { useState } from 'react';

import { Button } from '@dynatrace/strato-components/buttons';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';
import { DownloadIcon } from '@dynatrace/strato-icons';

import { DqlDisclosure } from '../components/DqlDisclosure';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { useQueryScope, useStudio } from '../config/StudioContext';
import { Callout, Figure, Grid, Panel, Stack } from '../engine';
import { ReadinessList } from '../engine/chart/ReadinessList';
import { RingRankPanel } from '../engine/chart/RingRankPanel';
import { BarList } from '../components/viz/BarList';
import '../engine/page-d.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { summariseCloud } from '../models/cloud';
import { formatMoney, formatMoneyFine } from '../models/cost';
import { summariseConsumption } from '../models/consumptionForecast';
import {
  buildClassicUnits,
  buildDpsResultSummary,
  consumptionCost,
  localValue,
  PUBLIC_QUERY_USD_PER_GIB,
  rateCardCurrency,
  resultSummaryTotalUsd,
  sizeClassic,
  sizeDps,
  toLicHosts,
  totalHosts,
} from '../models/licensing';
import { getQuery } from '../queries/catalog';
import { num, str } from '../utils/records';
import { windowDays } from '../utils/time';
import { useTranslation } from '../i18n/useTranslation';
import { useAssessment } from '../features/assessment/useAssessment';
import { gapExpansions } from '../features/licensing/gapExpansion';
import { appCostExpectation, sessionCeilingUsd } from '../features/consumption/appCost';
import { ConsumptionPanel } from '../features/consumption/ConsumptionPanel';
import { preflight } from '../features/consumption/preflight';
import { useSessionMeter } from '../features/consumption/sessionMeter';
import { decimal } from '../utils/activeLocale';

/**
 * Licensing — DPS and Classic sizing from the measured environment.
 *
 * The app turns the estate into the units each licence model bills on, so a SE
 * does not size a PoC by hand. A monetary estimate appears only when a **public**
 * rate card is enabled in Settings; otherwise the page shows units only. Every
 * sizing table is copyable and downloadable as CSV for a sales order.
 */

const GIB = 1024 ** 3;
type TabId = 'dps' | 'classic' | 'projection' | 'appConsumption';

interface ResultDisplayRow extends Record<string, unknown> {
  category: string;
  capability: string;
  usageMonthly: string;
  usageAnnual: string;
  volume: string;
  costMonthly: string;
  costAnnual: string;
}

interface ClassicDisplayRow extends Record<string, unknown> {
  unit: string;
  driver: string;
  measuredMonthly: string;
  measuredAnnual: string;
  measureUnit: string;
}

function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const Licensing = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const { rateCard, resolvedTimeframe } = useStudio();
  const factFrom = useSummaryFact();
  const [tabIndex, setTabIndex] = useState(0);
  // 3.2.7: DPS, Classic, then the cost projection — every priced figure lives in that tab. 3.4.13: the app's own
  // consumption (moved from Settings) follows, in GiB; its expected cost is priced in the cost projection.
  const PROJECTION_TAB = 2;
  const tab: TabId = tabIndex === 1 ? 'classic' : tabIndex === PROJECTION_TAB ? 'projection' : tabIndex === 3 ? 'appConsumption' : 'dps';

  const licHosts = useCatalogQuery('lic.hosts', scope);
  const logs = useCatalogQuery('log.ingest', scope);
  const inventory = useCatalogQuery('cov.inventory', scope);
  const cloud = useCatalogQuery('cloud.hosts', scope);
  const capabilities = useCatalogQuery('cons.capabilities', scope);
  // Sessions over every frontend at once (`rum.audience.total`), not a sum of per-app rows.
  const audience = useCatalogQuery('rum.audience.total', scope);
  const pods = useCatalogQuery('lic.k8spods', scope);
  const podHours = useCatalogQuery('lic.k8spodhours', scope);
  // 3.2.6: the consumption projection, priced — here and nowhere else in the app.
  const daily = useCatalogQuery('cons.daily', scope);
  const projected = consumptionCost(summariseConsumption(daily.records), rateCard);

  const hosts = toLicHosts(licHosts.records);
  const classic = sizeClassic(hosts);

  // Per-day rates are annualised below, so the window must cover at least a day. Until 3.2.0 a
  // 1-hour window was divided by a floor of one day, which cut every daily rate by 24x (3.2.1).
  const days = windowDays(resolvedTimeframe);
  const sizingWindowOk = days >= 1;
  const logIngestBytes = logs.records
    .filter((record) => str(record, 'event.type')?.includes('Ingest'))
    .reduce((sum, record) => sum + (num(record, 'bytes') ?? 0), 0);
  const logGibPerDay =
    sizingWindowOk && logs.outcome === 'ok' && logIngestBytes > 0 ? logIngestBytes / GIB / days : null;

  const inv = (category: string) =>
    num(inventory.records.find((record) => str(record, 'category') === category), 'value');
  const k8sWorkloads = inv('Kubernetes workloads');
  const syntheticMonitors = inv('Synthetic monitors');
  const cloudHosts = cloud.outcome === 'ok' ? summariseCloud(cloud.records).totalHosts : null;
  const k8sPods = pods.outcome === 'ok' ? num(pods.records[0], 'pods') : null;
  /**
   * 3.3.1 (backlog Q11): the pod-hours the platform billed, and the hours they cover, so the year
   * is extrapolated from what was measured. Counting the pods alive right now and holding them for
   * 8,760 h overstated the lab tenant by 53 % (1,571 counted against 1,026 on average).
   */
  const podHourRow = podHours.records[0];
  const billedPodHours = podHours.outcome === 'ok' ? num(podHourRow, 'podHours') : null;
  const podHourWindow = (() => {
    const from = Date.parse(str(podHourRow, 'firstSeen') ?? '');
    const to = Date.parse(str(podHourRow, 'lastSeen') ?? '');
    return Number.isFinite(from) && Number.isFinite(to) && to > from ? (to - from) / 3_600_000 : null;
  })();
  const k8sPodHours =
    billedPodHours !== null && podHourWindow !== null ? { hours: billedPodHours, windowHours: podHourWindow } : null;
  const totalSessions = audience.outcome === 'ok' ? num(audience.records[0] ?? {}, 'sessions') : null;
  const sessionsPerDay =
    sizingWindowOk && totalSessions !== null && totalSessions > 0 ? totalSessions / days : null;

  const hasCapability = (needle: string) =>
    capabilities.outcome === 'ok' && capabilities.records.some((record) => str(record, 'event.type')?.includes(needle));
  const rumActive = hasCapability('Real User Monitoring');
  const appSecActive = hasCapability('Runtime Vulnerability');

  const dps = sizeDps({ hosts, logGibPerDay, k8sWorkloads, syntheticMonitors, cloudHosts, rumActive, appSecActive });
  // Host-based sizing is a figure only if `lic.hosts` answered; otherwise the rows that depend on
  // it are a dash ("0 memory-gibibyte-hours" was printed for a query that had failed).
  const hostsRead = licHosts.outcome === 'ok';

  // The DPS Result Summary (public estimator format) and the Classic unit drivers.
  const resultRows = buildDpsResultSummary({
    fullStackGib: hostsRead ? dps.fullStackGib : null,
    infraHosts: hostsRead ? dps.infraHosts : null,
    k8sPods,
    k8sPodHours,
    logGibPerDay,
    sessionsPerDay,
    syntheticActionsPerDay: null,
    appSecActive,
  });
  const classicUnits = buildClassicUnits({
    totalHostUnits: hostsRead ? classic.totalHostUnits : null,
    sessionsPerYear: sessionsPerDay === null ? null : sessionsPerDay * 365,
    syntheticMonitors,
    logGibPerYear: logGibPerDay === null ? null : logGibPerDay * 365,
    appSecActive,
    appSecGibHoursPerYear: appSecActive && hostsRead ? dps.fullStackGib * 8760 : null,
  });
  const totalUsd = resultSummaryTotalUsd(resultRows);
  // 3.4.11 (F-15): each gap the Assessment measured, beside the DPS capability that closes it — priced only here.
  const assessment = useAssessment();
  const gaps = assessment.isLoading ? [] : gapExpansions(assessment.signals, { hosts: hostsRead ? hosts : null, fullStackGib: hostsRead ? dps.fullStackGib : null, appSecActive });
  const gapsPricedUsd = gaps.reduce((sum, gap) => sum + (gap.annualUsd ?? 0), 0);
  // 3.4.13: what using this app is expected to cost — the pre-flight's projected visit at the public query price.
  const windowHours = (Date.parse(resolvedTimeframe.endIso) - Date.parse(resolvedTimeframe.startIso)) / 3_600_000;
  const appCost = appCostExpectation(preflight(logs.outcome === 'ok' || logs.outcome === 'empty' ? logs.records : null, windowHours));
  const sessionReads = useSessionMeter();
  const sessionBytes = sessionReads.reduce((sum, read) => sum + read.bytes, 0);
  const fine = (usd: number) => formatMoneyFine(localValue(usd, rateCard) ?? 0, rateCardCurrency(rateCard));
  // A range with its currency once ("USD 0.0045 – 0.012"): repeated, it wrapped the tile onto two lines.
  const fineRange = (low: number, high: number) =>
    `${formatMoneyFine(localValue(low, rateCard) ?? 0, rateCardCurrency(rateCard))} – ${formatMoneyFine(localValue(high, rateCard) ?? 0, '')}`;
  const totalLocal = localValue(totalUsd, rateCard);
  const money = (value: number) => formatMoney(Math.round(value), rateCardCurrency(rateCard));

  const band: SummaryItem[] = [
    {
      key: 'hosts',
      label: t('p.lic.band.hosts'),
      fact: factFrom(licHosts, licHosts.outcome === 'ok' ? totalHosts(hosts) : null),
      display: licHosts.outcome === 'ok' ? formatNumber(totalHosts(hosts)) : undefined,
      detail: t('p.lic.band.hostsDetail', { fs: formatNumber(classic.fullStackHosts), inf: formatNumber(classic.infraHosts) }),
    },
    {
      key: 'hu',
      label: t('p.lic.band.hostUnits'),
      fact: factFrom(licHosts, licHosts.outcome === 'ok' ? classic.totalHostUnits : null, { calculation: t('p.lic.band.huCalc'), unit: 'HU' }),
      display: licHosts.outcome === 'ok' ? formatNumber(classic.totalHostUnits) : undefined,
      detail: t('p.lic.band.huDetail'),
    },
    {
      key: 'logs',
      label: t('p.lic.band.logs'),
      fact: factFrom(logs, logGibPerDay === null ? null : Number(logGibPerDay.toFixed(1)), { unit: t('common.unit.gibPerDay') }),
      // The fact's unit (GiB/day) is printed beside the figure; "21.4 GiB" + "GiB/day" read "GiB GiB/day".
      display: logGibPerDay === null ? undefined : decimal(logGibPerDay, 1),
      detail: t('p.lic.band.logsDetail'),
    },
    {
      key: 'k8s',
      label: t('p.lic.band.k8s'),
      fact: factFrom(inventory, k8sWorkloads),
      display: k8sWorkloads === null ? undefined : formatNumber(k8sWorkloads),
      detail: t('p.lic.band.k8sDetail'),
    },
    {
      key: 'cloud',
      label: t('p.lic.band.cloud'),
      fact: factFrom(cloud, cloudHosts),
      display: cloudHosts === null ? undefined : formatNumber(cloudHosts),
      detail: t('p.lic.band.cloudDetail'),
    },
  ];

  const enabled = rateCard.enabled;
  const localOr = (usd: number | null) => {
    const value = localValue(usd, rateCard);
    return value === null ? '—' : money(value);
  };

  const numOr = (value: number | null) => (value === null ? '—' : formatNumber(Math.round(value)));

  // Host Units read from both Full-Stack and Infra-Only host RAM (≈16 GiB = 1 licence).
  const huDriver = (() => {
    const parts: string[] = [];
    if (classic.fullStackHosts > 0) parts.push(t('p.lic.cls.huFs', { fs: formatNumber(classic.fullStackHosts) }));
    if (classic.infraHosts > 0) parts.push(t('p.lic.cls.huInf', { inf: formatNumber(classic.infraHosts) }));
    const base = t('p.lic.cls.huDriver');
    return parts.length > 0 ? `${base} — ${parts.join(' + ')}` : base;
  })();

  const dpsDisplay: ResultDisplayRow[] = resultRows.map((row) => ({
    category: row.category,
    capability: row.capability,
    usageMonthly: row.annualUsage === null ? '—' : numOr(row.annualUsage / 12),
    usageAnnual: numOr(row.annualUsage),
    volume: `${t('p.lic.rs.per')} ${formatNumber(row.rateCardQty)} ${row.rateCardUnit}`,
    costMonthly: enabled ? localOr(row.annualUsd === null ? null : row.annualUsd / 12) : '',
    costAnnual: enabled ? localOr(row.annualUsd) : '',
  }));

  const classicDisplay: ClassicDisplayRow[] = classicUnits.map((row) => ({
    unit: row.unit,
    driver: row.unit === 'HU' ? huDriver : row.driverKey === null ? row.driver : t(row.driverKey),
    measuredMonthly: row.value === null ? '—' : numOr(row.perYear ? row.value / 12 : row.value),
    measuredAnnual: numOr(row.value),
    measureUnit: row.measureUnitKey === null ? row.measureUnit : t(row.measureUnitKey),
  }));

  // The DPS tab is the sizing alone (usage); the same rows priced are in "Cost projection".
  // The text columns keep a minimum width: on a phone the table scrolls sideways instead of squeezing
  // them to one letter beside the fixed numeric columns (3.2.7 review UX-M9). The tables wrap their
  // cells (`lineWrap`), so a long category, capability or rate-card volume reads in full on two lines
  // instead of ending in an ellipsis; "Unit of measure" is wide enough for its pt-BR header
  // ("Unidade de medida"), which does not wrap (3.2.7 final review P3).
  const dpsColumns: DataTableColumnDef<ResultDisplayRow>[] = [
    { id: 'category', header: t('p.lic.rs.category'), accessor: 'category', width: '1.3fr', minWidth: 150 },
    { id: 'capability', header: t('p.lic.rs.capability'), accessor: 'capability', width: '1.8fr', minWidth: 180 },
    { id: 'usageMonthly', header: t('p.lic.rs.usageMonthly'), accessor: 'usageMonthly', width: 175, alignment: 'right' },
    { id: 'usageAnnual', header: t('p.lic.rs.usage'), accessor: 'usageAnnual', width: 175, alignment: 'right' },
    { id: 'volume', header: t('p.lic.rs.volume'), accessor: 'volume', width: '1.3fr', minWidth: 170 },
  ];
  const dpsPricedColumns: DataTableColumnDef<ResultDisplayRow>[] = [
    ...dpsColumns,
    { id: 'costMonthly', header: t('p.lic.rs.costMonthly', { currency: rateCardCurrency(rateCard) }), accessor: 'costMonthly', width: 130, alignment: 'right' },
    { id: 'costAnnual', header: t('p.lic.rs.costAnnual', { currency: rateCardCurrency(rateCard) }), accessor: 'costAnnual', width: 130, alignment: 'right' },
  ];

  const classicColumns: DataTableColumnDef<ClassicDisplayRow>[] = [
    { id: 'unit', header: t('p.lic.rs.unit'), accessor: 'unit', width: 90 },
    { id: 'driver', header: t('p.lic.rs.driver'), accessor: 'driver', width: '2fr', minWidth: 220 },
    { id: 'measuredMonthly', header: t('p.lic.rs.measuredMonthly'), accessor: 'measuredMonthly', width: 170, alignment: 'right' },
    { id: 'measuredAnnual', header: t('p.lic.rs.measured'), accessor: 'measuredAnnual', width: 170, alignment: 'right' },
    { id: 'measureUnit', header: t('p.lic.rs.measureUnit'), accessor: 'measureUnit', width: 160 },
  ];

  const exportRows = () => {
    if (tab === 'classic') {
      downloadCsv(
        'licensing-classic.csv',
        [t('p.lic.rs.unit'), t('p.lic.rs.driver'), t('p.lic.rs.measuredMonthly'), t('p.lic.rs.measured'), t('p.lic.rs.measureUnit')],
        classicDisplay.map((row) => [row.unit, row.driver, row.measuredMonthly, row.measuredAnnual, row.measureUnit]),
      );
      return;
    }
    // Prices only leave from the cost-projection tab, and only with the rate card on.
    const priced = tab === 'projection' && enabled;
    const header = [t('p.lic.rs.category'), t('p.lic.rs.capability'), t('p.lic.rs.usageMonthly'), t('p.lic.rs.usage'), t('p.lic.rs.volume')];
    if (priced) header.push(t('p.lic.rs.costMonthly', { currency: rateCardCurrency(rateCard) }), t('p.lic.rs.costAnnual', { currency: rateCardCurrency(rateCard) }));
    downloadCsv(
      priced ? 'licensing-dps-cost-estimate.csv' : 'licensing-dps-result-summary.csv',
      header,
      dpsDisplay.map((row) =>
        priced
          ? [row.category, row.capability, row.usageMonthly, row.usageAnnual, row.volume, row.costMonthly, row.costAnnual]
          : [row.category, row.capability, row.usageMonthly, row.usageAnnual, row.volume],
      ),
    );
  };

  const tableVariant = { rowSeparation: 'zebraStripes', verticalDividers: false } as const;

  // 3.3.21 — what the sizing rests on: every capability read on this environment (its usage per
  // month) or still open. AppSec is in the sizing only where it runs; an open row stays out of the
  // totals instead of counting as zero (rule 8).
  const basisRows = resultRows.filter((row) => row.id !== 'appsec' || appSecActive);
  const basisRead = basisRows.filter((row) => row.annualUsage !== null).length;
  const basisPct = basisRows.length === 0 ? null : Math.round((basisRead / basisRows.length) * 100);
  const basisItems = basisRows.map((row) => ({
    key: row.id,
    label: row.capability,
    where:
      row.annualUsage === null
        ? t('p.lic.basis.noReading')
        : t('p.lic.basis.perMonth', { value: `${numOr(row.annualUsage / 12)} ${row.rateCardUnit}` }),
    done: row.annualUsage !== null,
  }));

  // 3.3.21 — where the estimate goes (cost projection only, rule 6): each priced capability's share
  // of the annual total at the public list price, largest first. Every row of the sizing is here,
  // nothing is capped, so the shares add up to the total shown above them.
  const splitItems =
    totalUsd === null || totalUsd <= 0
      ? []
      : resultRows
          .filter((row) => row.annualUsd !== null && row.annualUsd > 0)
          .sort((a, b) => (b.annualUsd ?? 0) - (a.annualUsd ?? 0))
          .map((row) => ({
            key: row.id,
            label: row.capability,
            value: row.annualUsd ?? 0,
            display: t('p.lic.split.display', {
              money: localOr(row.annualUsd),
              share: decimal(((row.annualUsd ?? 0) / totalUsd) * 100, 1),
            }),
          }));

  return (
    <Stack gap="section">
      <SectionIntro titleKey="p.lic.title" questionKey="p.lic.question" takeawayKey="p.lic.takeaway" />

      <PageSummary items={band} footnote={t('p.lic.band.footnote')} />

      {!sizingWindowOk && (
        <Callout kind="limitation" title={t('p.lic.window.short.title')}>
          {t('p.lic.window.short.body')}
        </Callout>
      )}

      <Tabs selectedIndex={tabIndex} onChange={setTabIndex}>
        <Tab title={t('p.lic.tab.dps')}>
          <Stack gap="section">
            <RingRankPanel
              data-testid="lic-basis"
              title={t('p.lic.basis.title')}
              caption={t('p.lic.basis.caption')}
              ring={{
                family: 'blue',
                value: basisPct,
                valueDisplay: basisPct === null ? undefined : `${basisPct}%`,
                label: t('p.lic.basis.ring'),
                caption: t('p.lic.basis.ringCaption', { done: String(basisRead), total: String(basisRows.length) }),
                ariaLabel: t('p.lic.basis.aria'),
                missingLabel: t('tl.notMeasured'),
              }}
            >
              <ReadinessList
                items={basisItems}
                ariaLabel={t('p.lic.basis.title')}
                doneLabel={t('p.lic.basis.done')}
                openLabel={t('p.lic.basis.open')}
              />
            </RingRankPanel>
          <Panel pad="roomy">
            <Stack gap="group">
              <PanelHead
                title={t('p.lic.dps.title')}
                body={t('p.lic.dps.body')}
                exportLabel={t('p.lic.export')}
                onExport={exportRows}
              />

              <DataTable data={dpsDisplay} columns={dpsColumns} fullWidth lineWrap variant={tableVariant} />

              {/* 3.2.7: the priced view of these rows is in "Cost projection", nowhere else. */}
              <Text className="pvs-caption">{t('p.lic.dps.pricedElsewhere')}</Text>
            </Stack>
          </Panel>
          </Stack>
        </Tab>

        <Tab title={t('p.lic.tab.classic')}>
          <Panel pad="roomy">
            <Stack gap="group">
              <PanelHead
                title={t('p.lic.cls.title')}
                body={t('p.lic.cls.body')}
                exportLabel={t('p.lic.export')}
                onExport={exportRows}
              />

              <DataTable data={classicDisplay} columns={classicColumns} fullWidth lineWrap variant={tableVariant} />

              <Callout kind="limitation" title={t('p.lic.cls.note.title')}>
                {t('p.lic.cls.note.body')}
              </Callout>
            </Stack>
          </Panel>
        </Tab>

        <Tab title={t('p.lic.tab.projection')}>
          <Panel pad="roomy">
            <Stack gap="group">
              <Stack gap="tight">
                <Heading level={4} as="h2">
                  {t('p.lic.proj.title')}
                </Heading>
                <Paragraph className="pvs-prose">{t('p.lic.proj.body')}</Paragraph>
              </Stack>
              {!enabled ? (
                <Callout kind="pending" title={t('p.lic.gate.title')}>
                  {t('p.lic.gate.body')}
                </Callout>
              ) : (
                <Stack gap="section">
                  {/* The DPS sizing at the public list price (was the footer of the DPS tab). */}
                  <Stack gap="group">
                    <PanelHead
                      title={t('p.lic.proj.dpsTitle')}
                      body={t('p.lic.proj.dpsBody')}
                      exportLabel={t('p.lic.export')}
                      onExport={exportRows}
                    />
                    <Grid min={220}>
                      <Estimate
                        title={t('p.lic.est.dpsMonthly')}
                        value={totalLocal === null ? '' : money(totalLocal / 12)}
                        caption={t('p.lic.est.dpsCalc')}
                        missing={totalLocal === null}
                        missingLabel={t('p.lic.est.setRate')}
                      />
                      <Estimate
                        title={t('p.lic.est.dpsAnnual')}
                        value={totalLocal === null ? '' : money(totalLocal)}
                        caption={t('p.lic.est.dpsAnnualCalc')}
                        missing={totalLocal === null}
                        missingLabel={t('p.lic.est.setRate')}
                      />
                    </Grid>
                    {splitItems.length > 0 && (
                      <Panel pad="compact" evidence="projection" data-testid="lic-split">
                        <Stack gap="tight">
                          <Heading level={5} as="h3">
                            {t('p.lic.split.title')}
                          </Heading>
                          <Text className="pvs-caption">{t('p.lic.split.caption')}</Text>
                          <BarList items={splitItems} ariaLabel={t('p.lic.split.title')} role="magnitude" />
                        </Stack>
                      </Panel>
                    )}
                    <DataTable data={dpsDisplay} columns={dpsPricedColumns} fullWidth lineWrap variant={tableVariant} />
                    <Callout kind="estimate" title={t('callout.estimate')}>
                      {t('p.lic.est.disclaimer')}
                    </Callout>
                  </Stack>

                  {/* 3.4.11 (F-15): from the Assessment's gaps to the expansion that closes them. */}
                  {gaps.length > 0 && (
                    <Panel pad="compact" evidence="projection" data-testid="lic-gaps">
                      <Stack gap="group">
                        <Stack gap="tight">
                          <Heading level={5} as="h3">
                            {t('lic.gap.title')}
                          </Heading>
                          <Text className="pvs-caption">{t('lic.gap.caption')}</Text>
                        </Stack>
                        <div className="pvs-asm-table-wrap">
                          <table className="pvs-asm-table">
                            <thead>
                              <tr>
                                <th scope="col">{t('lic.gap.col.gap')}</th>
                                <th scope="col">{t('lic.gap.col.capability')}</th>
                                <th scope="col" data-num>
                                  {t('lic.gap.col.annual', { currency: rateCardCurrency(rateCard) })}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {gaps.map((gap) => {
                                const local = localValue(gap.annualUsd, rateCard);
                                return (
                                  <tr key={gap.id}>
                                    <td>{`${gap.rule} · ${t(gap.gapKey, Object.fromEntries(Object.entries(gap.params).map(([key, value]) => [key, formatNumber(value)])))}`}</td>
                                    <td>{gap.capability}</td>
                                    <td data-num>
                                      {local === null ? t('lic.gap.toSize') : money(local)}
                                      {gap.replacesUsd !== undefined && local !== null && (
                                        <span className="pvs-caption">{` · ${t('lic.gap.replaces', { amount: money(localValue(gap.replacesUsd, rateCard) ?? 0) })}`}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {gapsPricedUsd !== 0 && (
                          <Text>{t('lic.gap.total', { amount: money(localValue(gapsPricedUsd, rateCard) ?? 0) })}</Text>
                        )}
                        <Callout kind="estimate" title={t('callout.estimate')}>
                          {t('lic.gap.disclaimer')}
                        </Callout>
                      </Stack>
                    </Panel>
                  )}

                  {/* 3.4.13: what using this app is expected to cost, at the public query price (owner's order). */}
                  <Panel pad="compact" evidence="projection" data-testid="lic-appcost">
                    <Stack gap="group">
                      <Stack gap="tight">
                        <Heading level={5} as="h3">
                          {t('lic.appcost.title')}
                        </Heading>
                        <Text className="pvs-caption">{t('lic.appcost.caption')}</Text>
                      </Stack>
                      {appCost === null ? (
                        <Text>{logs.isLoading ? t('p.asm.gap.loading') : t('lic.appcost.unread')}</Text>
                      ) : (
                        <>
                          {/* Two a row: a range ("USD 0.0045 – 0.012") reads on one line. */}
                          <Grid min={320}>
                            <Estimate
                              title={t('lic.appcost.visit')}
                              value={fineRange(appCost.visitBillableUsd, appCost.visitCeilingUsd)}
                              caption={t('lic.appcost.visitCalc', { gib: decimal(appCost.visitGiB, 2), billable: decimal(appCost.visitBillableGiB, 2) })}
                              missing={false}
                              missingLabel=""
                            />
                            <Estimate
                              title={t('lic.appcost.day')}
                              value={fineRange(appCost.dayBillableUsd, appCost.dayCeilingUsd)}
                              caption={t('lic.appcost.dayCalc', { people: formatNumber(appCost.usage.people), visits: formatNumber(appCost.usage.visitsPerDay) })}
                              missing={false}
                              missingLabel=""
                            />
                            <Estimate
                              title={t('lic.appcost.poc', { days: formatNumber(appCost.usage.days) })}
                              value={fineRange(appCost.pocBillableUsd, appCost.pocCeilingUsd)}
                              caption={t('lic.appcost.pocCalc', { visits: formatNumber(appCost.pocVisits), gib: formatNumber(Math.round(appCost.pocGiB)) })}
                              missing={false}
                              missingLabel=""
                            />
                            <Estimate
                              title={t('lic.appcost.session')}
                              value={fine(sessionCeilingUsd(sessionBytes))}
                              caption={t('lic.appcost.sessionCalc', { gib: decimal(sessionBytes / 1024 ** 3, 2), reads: formatNumber(sessionReads.length) })}
                              missing={false}
                              missingLabel=""
                            />
                          </Grid>
                          <Text className="pvs-caption">
                            {t(appCost.logsPayPerQuery === true ? 'lic.appcost.logsBilled' : appCost.logsPayPerQuery === false ? 'lic.appcost.logsIncluded' : 'lic.appcost.logsUnknown')}
                          </Text>
                        </>
                      )}
                      <Callout kind="estimate" title={t('callout.estimate')}>
                        {t('lic.appcost.disclaimer', { price: `${PUBLIC_QUERY_USD_PER_GIB} USD` })}
                      </Callout>
                    </Stack>
                  </Panel>

                  {/* The billed consumption, projected and priced. */}
                  <Stack gap="group">
                  <Stack gap="tight">
                    <Heading level={5} as="h3">
                      {t('p.lic.proj.consTitle')}
                    </Heading>
                  </Stack>
                  <Grid min={220}>
                    <Estimate
                      title={t('p.lic.proj.next30')}
                      value={projected.total30 === null ? '' : money(projected.total30)}
                      caption={t('p.lic.proj.calc')}
                      missing={projected.total30 === null}
                      missingLabel={t('p.lic.proj.tooEarly')}
                    />
                    <Estimate
                      title={t('p.lic.proj.next365')}
                      value={projected.total365 === null ? '' : money(projected.total365)}
                      caption={t('p.lic.proj.calc')}
                      missing={projected.total365 === null}
                      missingLabel={t('p.lic.proj.tooEarly')}
                    />
                  </Grid>
                  <DataTable
                    data={projected.rows.map((row) => ({
                      capability: row.capability,
                      price: `${row.usdPerUnit} USD`,
                      next30: row.next30 === null ? '—' : money(row.next30),
                      next365: row.next365 === null ? '—' : money(row.next365),
                    }))}
                    columns={[
                      { id: 'capability', header: t('cons.f.h.capability'), accessor: 'capability', width: '2fr' },
                      { id: 'price', header: t('p.lic.proj.price'), accessor: 'price', width: '1fr' },
                      { id: 'next30', header: t('p.lic.proj.next30'), accessor: 'next30', width: '1fr', alignment: 'right' },
                      { id: 'next365', header: t('p.lic.proj.next365'), accessor: 'next365', width: '1fr', alignment: 'right' },
                    ]}
                    fullWidth
                    variant={tableVariant}
                  >
                    <DataTable.EmptyState>{t('cons.f.empty')}</DataTable.EmptyState>
                  </DataTable>
                  {projected.unpriced.length > 0 && (
                    <Text className="pvs-caption">{t('p.lic.proj.unpriced', { list: projected.unpriced.join(' · ') })}</Text>
                  )}
                  <Callout kind="estimate" title={t('callout.estimate')}>
                    {t('p.lic.proj.disclaimer')}
                  </Callout>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Panel>
        </Tab>

        {/* 3.4.13 (owner's order of 2026-11-19): the app's own consumption, moved from Settings — in GiB here; its
            expected cost at the public price is in the cost projection. */}
        <Tab title={t('settings.tab.consumption')}>
          <Stack gap="section" data-testid="lic-consumption">
            <ConsumptionPanel />
            <Callout kind="note" title={t('lic.appcost.title')}>
              <Stack gap="tight">
                <Text>{t('lic.consumption.toCost')}</Text>
                <div>
                  <Button onClick={() => setTabIndex(PROJECTION_TAB)} data-testid="lic-consumption-tocost">
                    {t('lic.consumption.toCostButton')}
                  </Button>
                </div>
              </Stack>
            </Callout>
          </Stack>
        </Tab>
      </Tabs>

      <DqlDisclosure entries={[getQuery('lic.hosts'), getQuery('lic.k8spods'), getQuery('lic.k8spodhours'), getQuery('log.ingest'), getQuery('cov.inventory'), getQuery('cloud.hosts'), getQuery('rum.audience.total'), getQuery('cons.capabilities'), getQuery('cons.daily')]} />
    </Stack>
  );
};

/** The title, the one-line description and the CSV export of the active sizing table. */
const PanelHead = ({
  title,
  body,
  exportLabel,
  onExport,
}: {
  title: string;
  body: string;
  exportLabel: string;
  onExport: () => void;
}) => (
  <div className="pvs-d-head">
    <Stack gap="tight" className="pvs-d-head__text">
      <Heading level={4} as="h2">
        {title}
      </Heading>
      <Paragraph className="pvs-prose">{body}</Paragraph>
    </Stack>
    <Button onClick={onExport} aria-label={exportLabel}>
      <Button.Prefix>
        <DownloadIcon />
      </Button.Prefix>
      {exportLabel}
    </Button>
  </div>
);

/**
 * One estimated figure: a value computed from public list prices, so it is drawn
 * as an estimate (dashed edge) and its premise is printed under it. With no rate
 * to convert at, it is a muted dash that says what to set — never a zero.
 */
const Estimate = ({
  title,
  value,
  caption,
  missing,
  missingLabel,
}: {
  title: string;
  value: string;
  caption: string;
  missing: boolean;
  missingLabel: string;
}) => (
  <Panel pad="compact" evidence="projection">
    <Stack gap="tight">
      <Text className="pvs-label">{title}</Text>
      <Figure value={value} size="md" missing={missing} missingLabel={missingLabel} />
      <Text className="pvs-caption">{missing ? missingLabel : caption}</Text>
    </Stack>
  </Panel>
);
