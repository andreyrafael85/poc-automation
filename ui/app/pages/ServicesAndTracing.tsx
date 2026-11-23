import React from 'react';

import { MessageContainer } from '@dynatrace/strato-components/content';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Tab, Tabs } from '@dynatrace/strato-components/navigation';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { CatalogTable } from '../components/CatalogTable';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { AssistPanel } from '../components/AssistPanel';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { useQueryScope } from '../config/StudioContext';
import { PALETTE } from '../design/palette';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { TrendChart } from '../components/TrendChart';
import { ServiceHealth } from '../features/services/ServiceHealth';
import { ServiceQuadrants } from '../features/services/ServiceQuadrants';
import { useChartFormat } from '../components/spectrum';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { formatMicros } from '../utils/time';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { Stack } from '../engine';
import { decimal } from '../utils/activeLocale';
import { SlowestServices } from '../features/cockpit/panels';
import { serviceTrendSeries } from '../features/trends/trendSeries';

/**
 * Services and distributed tracing.
 *
 * The guided flow is: see the environment trend, pick the service whose failure
 * rate stands out, then follow it into the platform for trace-level analysis.
 */

interface ServiceRow extends GrailRecord {
  name: string;
  serviceId: string;
  totalRequests: number | null;
  totalFailures: number | null;
  failureRatePct: number | null;
  responseTime: string;
}

const serviceColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<ServiceRow>[] => [
  { id: 'name', header: t('common.service'), accessor: 'name', width: '1.6fr' },
  {
    id: 'totalRequests',
    header: t('p.svc.h.requests'),
    accessor: 'totalRequests',
    width: 140,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.totalRequests)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'totalFailures',
    header: t('p.svc.h.failures'),
    accessor: 'totalFailures',
    width: 130,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.totalFailures)}</DataTable.DefaultCell>
    ),
  },
  {
    id: 'failureRatePct',
    header: t('p.svc.h.failureRate'),
    accessor: 'failureRatePct',
    width: 190,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        {rowData.failureRatePct === null ? '—' : `${decimal(rowData.failureRatePct, 2)}%`}
      </DataTable.DefaultCell>
    ),
  },
  { id: 'responseTime', header: t('p.svc.h.avgResponse'), accessor: 'responseTime', width: 170, alignment: 'right' },
  { id: 'serviceId', header: t('common.entityId'), accessor: 'serviceId', width: '1fr' },
];

const toServiceRows = (records: GrailRecord[]): ServiceRow[] =>
  records.map((record) => ({
    ...record,
    name: str(record, 'name') ?? 'Unnamed service',
    serviceId: str(record, 'serviceId') ?? '—',
    totalRequests: num(record, 'totalRequests'),
    totalFailures: num(record, 'totalFailures'),
    failureRatePct: num(record, 'failureRatePct'),
    // The metric reports microseconds; formatting says so instead of showing a raw number.
    responseTime: formatMicros(num(record, 'avgResponseTimeUs')),
  }));

interface BreakdownRow extends GrailRecord {
  serviceType: string;
  technology: string;
  services: number | null;
}

const breakdownColumns = (t: Translation['t']): DataTableColumnDef<BreakdownRow>[] => [
  { id: 'serviceType', header: t('p.svc.h.serviceType'), accessor: 'serviceType', width: '1fr' },
  { id: 'technology', header: t('p.svc.h.detectedTech'), accessor: 'technology', width: '1fr' },
  { id: 'services', header: t('common.services'), accessor: 'services', width: 120, alignment: 'right' },
];

const toBreakdownRows = (records: GrailRecord[]): BreakdownRow[] =>
  records.map((record) => ({
    ...record,
    serviceType: str(record, 'serviceType') ?? 'Not reported',
    technology: str(record, 'agentTechnologyType') ?? 'Not reported',
    services: num(record, 'services'),
  }));

export const ServicesAndTracing = () => {
  const { t, tCount, formatNumber, formatCount } = useTranslation();
  const fmt = useChartFormat();
  const scope = useQueryScope();
  const totals = useCatalogQuery('svc.totals', scope);
  const ranking = useCatalogQuery('svc.ranking', scope);
  const rankingTotals = useCatalogQuery('svc.ranking.total', scope);
  const factFrom = useSummaryFact();

  const row = totals.records[0];
  const requests = num(row, 'totalRequests');
  const failures = num(row, 'totalFailures');
  const failureRate = num(row, 'failureRatePct');

  // How many services, how many fail and how many are above the 1% line are counted in the
  // query over every service with traffic. The ranking holds the 50 busiest, so it only names
  // the worst and is never counted.
  const services = toServiceRows(ranking.records);
  const failing = services.filter((service) => (service.totalFailures ?? 0) > 0);
  const aboveOne = services.filter((service) => (service.failureRatePct ?? 0) > 1);
  const totalsRow = rankingTotals.records[0];
  const serviceCount = num(totalsRow, 'services');
  const failingCount = num(totalsRow, 'failing');
  const aboveOneCount = num(totalsRow, 'aboveOnePct');

  // Dynatrace Assist — where a reliability engineer should look first.
  const worstService =
    [...aboveOne].sort((a, b) => (b.failureRatePct ?? 0) - (a.failureRatePct ?? 0))[0] ??
    [...failing].sort((a, b) => (b.failureRatePct ?? 0) - (a.failureRatePct ?? 0))[0];
  const svcAssist: string[] = [];
  if (ranking.outcome === 'ok' && worstService !== undefined) {
    svcAssist.push(
      t('p.svc.assist.s.worst', {
        name: worstService.name,
        pct: formatNumber(Number((worstService.failureRatePct ?? 0).toFixed(2))),
        failures: formatNumber(worstService.totalFailures ?? 0),
        requests: formatNumber(worstService.totalRequests ?? 0),
      }),
    );
    // The count comes from the aggregate over every service. Without it the 50 ranked rows can
    // only give a floor, and can never prove that no service is above the line.
    if (aboveOneCount !== null) {
      svcAssist.push(
        aboveOneCount > 0
          ? t('p.svc.assist.s.above', { count: formatNumber(aboveOneCount) })
          : t('p.svc.assist.s.clean'),
      );
    } else if (aboveOne.length > 0) {
      svcAssist.push(t('p.svc.assist.s.above', { count: t('common.atLeast', { n: formatNumber(aboveOne.length) }) }));
    }
  }

  /**
   * The overall picture before the ranking.
   *
   * The failure rate carries the tone, not the failure count: 19,776 failures
   * sounds alarming and 0.5% does not, and only one of those two numbers is a
   * judgement. The 1% line is this app's review convention, stated wherever it
   * is applied.
   */
  const headline: SummaryItem[] = [
    {
      key: 'requests',
      label: t('p.svc.band.requests'),
      fact: factFrom(totals, requests),
      display: requests === null ? undefined : formatNumber(requests),
      detail: t('p.svc.band.requestsDetail', {
        services:
          serviceCount !== null
            ? formatNumber(serviceCount)
            : t('common.atLeast', { n: formatNumber(services.length) }),
      }),
    },
    {
      key: 'failures',
      label: t('p.svc.band.failures'),
      fact: factFrom(totals, failures),
      display: failures === null ? undefined : formatNumber(failures),
      detail: t('p.svc.band.failuresDetail'),
    },
    {
      key: 'rate',
      label: t('p.svc.band.rate'),
      fact: factFrom(totals, failureRate === null ? null : Number(failureRate.toFixed(2)), {
        calculation: t('p.svc.band.rateCalc'),
        unit: '%',
      }),
      display: failureRate === null ? undefined : `${decimal(failureRate, 2)}%`,
      detail: t('p.svc.band.rateDetail'),
      tone: failureRate !== null && failureRate > 1 ? PALETTE.review : PALETTE.good,
    },
    {
      key: 'failingServices',
      label: t('p.svc.band.failingServices'),
      fact: factFrom(rankingTotals, failingCount, {
        calculation: t('p.svc.band.failingCalc'),
      }),
      display: failingCount === null ? undefined : formatNumber(failingCount),
      // No count and no "good" tone when the aggregate did not answer: a missing number is not a zero.
      detail: aboveOneCount === null ? undefined : t('p.svc.band.failingDetail', { count: aboveOneCount }),
      tone: aboveOneCount === null ? undefined : aboveOneCount > 0 ? PALETTE.review : PALETTE.good,
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.svc.title"
        questionKey="p.svc.question"
        takeawayKey="p.svc.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.svc.band.footnote')} />

      {/* 3.5.3 (visual proposal v4): a long page in tabs at the top, as the Coverage page — health, trend, ranking. */}
      <Tabs defaultIndex={0}>
        <Tab title={t('p.svc.tab.health')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <ServiceHealth ranking={ranking} totals={rankingTotals} />

      <CockpitRow data-testid="svc-cockpit">
        <SlowestServices />
        {svcAssist.length > 0 && (
          <AssistPanel
            eyebrow={t('assist.tech.eyebrow')}
            title={t('p.svc.assist.title')}
            sentences={svcAssist}
            note={t('assist.tech.note')}
          />
        )}
      </CockpitRow>
          </Stack>
        </Tab>
        {/* 3.5.4 (visual proposal v4): every busy service as a point before the two review lines. */}
        <Tab title={t('p.svc.tab.quadrants')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
            <ServiceQuadrants />
          </Stack>
        </Tab>
        <Tab title={t('p.svc.tab.trend')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.svc.trend')}</Heading>
        <TrendChart
          queryId="svc.golden"
          series={serviceTrendSeries(t, fmt)}
        />
      </Flex>
          </Stack>
        </Tab>
        <Tab title={t('p.svc.tab.ranking')} keepMounted>
          <Stack gap="section" className="pvs-tabpane">
      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.svc.ranking')}</Heading>
        <Paragraph>
          {t('p.svc.rankingBody')}
        </Paragraph>
        <CatalogTable<ServiceRow>
          queryId="svc.ranking"
          columns={serviceColumns(t, formatCount)}
          transform={toServiceRows}
          pageSize={15}
          summary={(result) => {
            const worst = toServiceRows(result.records)
              .filter((row) => (row.failureRatePct ?? 0) > 1)
              .sort((a, b) => (b.failureRatePct ?? 0) - (a.failureRatePct ?? 0));
            // The count is exact (over every service); the name is the worst among the ranked 50.
            // Without the exact count the ranked rows cannot prove "none above": say nothing.
            if (aboveOneCount === null && worst.length === 0) return null;
            const aboveCount = aboveOneCount ?? worst.length;
            if (aboveCount === 0) {
              return (
                <Text>
                  {t('p.svc.noneAbove')}
                </Text>
              );
            }
            return (
              <MessageContainer variant="warning">
                <MessageContainer.Title>
                  {tCount('p.svc.aboveTitle', aboveCount, { count: aboveCount })}
                </MessageContainer.Title>
                {worst[0] !== undefined && (
                  <MessageContainer.Description>
                    {t('p.svc.highest', {
                      name: worst[0].name,
                      rate: worst[0].failureRatePct == null ? '—' : decimal(worst[0].failureRatePct, 2),
                    })}
                  </MessageContainer.Description>
                )}
              </MessageContainer>
            );
          }}
        />
      </Flex>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.svc.autoDetected')}</Heading>
        <CatalogTable<BreakdownRow>
          queryId="svc.breakdown"
          columns={breakdownColumns(t)}
          transform={toBreakdownRows}
        />
      </Flex>
          </Stack>
        </Tab>
      </Tabs>

      <DqlDisclosure
        entries={[getQuery('svc.golden'), getQuery('svc.ranking.total'), getQuery('svc.ranking'), getQuery('svc.breakdown')]}
      />
    </Stack>
  );
};
