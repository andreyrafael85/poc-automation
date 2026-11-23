import React from 'react';

import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { useQueryScope } from '../config/StudioContext';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { CatalogTable } from '../components/CatalogTable';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { Callout, Stack } from '../engine';
import { ChartFrame } from '../components/ChartFrame';
import { BarList } from '../components/viz/BarList';
import { CockpitRow } from '../engine/chart/CockpitRow';

/**
 * Business observability.
 *
 * Business events are flowing and carry recognisable domain semantics, which is
 * worth showing. What this page will not do is translate an event count into
 * revenue, cost or business impact: that mapping requires a value per event that
 * only the customer can supply, and inventing one would be the most damaging
 * kind of fabrication in a closing presentation.
 */

interface EventTypeRow extends GrailRecord {
  eventType: string;
  events: number | null;
}

const columns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<EventTypeRow>[] => [
  { id: 'eventType', header: t('p.biz.h.eventType'), accessor: 'eventType', width: '2fr' },
  {
    id: 'events',
    header: t('p.biz.h.events'),
    accessor: 'events',
    width: 160,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.events)}</DataTable.DefaultCell>
    ),
  },
];

const toRows = (records: GrailRecord[]): EventTypeRow[] =>
  records.map((record) => ({
    ...record,
    eventType: str(record, 'event.type') ?? 'Not reported',
    events: num(record, 'events'),
  }));

/** How many event types the cockpit bars show (3.3.12). */
const BIZ_TOP = 8;

export const BusinessObservability = () => {
  const { t, tCount, formatNumber, formatCount, tWindow } = useTranslation();
  const scope = useQueryScope();
  const events = useCatalogQuery('biz.events', scope);
  const totals = useCatalogQuery('biz.events.total', scope);
  const factFrom = useSummaryFact();

  // Types and events are counted in the query over every business event: a busy tenant has
  // hundreds of event types, and the table lists only the 25 most frequent.
  const rows = toRows(events.records);
  const total = num(totals.records[0], 'events');
  const typeCount = num(totals.records[0], 'types');
  const busiest = [...rows].sort((a, b) => (b.events ?? 0) - (a.events ?? 0))[0];
  // 3.3.12: the most frequent types as bars — a top of the 25 listed, never summed; the exact
  // count of types comes from `biz.events.total`.
  const typeBars = rows
    .filter((row): row is EventTypeRow & { events: number } => row.events !== null && row.events > 0)
    .sort((a, b) => b.events - a.events)
    .slice(0, BIZ_TOP);

  const headline: SummaryItem[] = [
    {
      key: 'types',
      label: t('p.biz.band.types'),
      fact: factFrom(totals, typeCount),
      display: typeCount === null ? undefined : formatNumber(typeCount),
      detail: t('p.biz.band.typesDetail'),
    },
    {
      key: 'events',
      label: t('p.biz.band.events'),
      fact: factFrom(totals, total),
      display: total === null ? undefined : formatNumber(total),
      detail: t('p.biz.band.eventsDetail'),
    },
    {
      key: 'busiest',
      label: t('p.biz.band.busiest'),
      fact: factFrom(events, busiest?.eventType ?? null),
      display: busiest?.eventType,
      detail:
        busiest === undefined
          ? undefined
          : tCount('p.biz.band.busiestDetail', busiest.events ?? 0, { count: formatNumber(busiest.events ?? 0) }),
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.biz.title"
        questionKey="p.biz.question"
        takeawayKey="p.biz.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.biz.band.footnote')} />

      {/* 3.3.12: the most frequent event types beside what the page cannot say (a cockpit row). */}
      <CockpitRow data-testid="biz-cockpit">
        {events.outcome === 'ok' && typeBars.length > 0 && (
          <ChartFrame
            role="magnitude"
            title={t('cockpit.biz.title')}
            provenance={events.provenance}
            evidence={events.evidence}
            windowLabel={tWindow(events.timeframe.label)}
            trailing={
              <span className="pvs-caption">
                {typeCount === null
                  ? t('cockpit.biz.topOf', { shown: formatNumber(typeBars.length), listed: formatNumber(rows.length) })
                  : t('cockpit.biz.topOfTotal', { shown: formatNumber(typeBars.length), listed: formatNumber(rows.length), total: formatNumber(typeCount) })}
              </span>
            }
          >
            <BarList
              role="magnitude"
              ariaLabel={t('cockpit.biz.title')}
              items={typeBars.map((row, index) => ({ key: `${row.eventType}-${index}`, label: row.eventType, value: row.events, display: formatNumber(row.events) }))}
            />
          </ChartFrame>
        )}
        <Callout kind="limitation" title={t('p.biz.stopsTitle')}>
          <Stack gap="tight">
            <Paragraph>{t('p.biz.stopsBody1')}</Paragraph>
            <Paragraph>{t('p.biz.stopsBody2')}</Paragraph>
          </Stack>
        </Callout>
      </CockpitRow>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.biz.observed')}</Heading>
        <CatalogTable<EventTypeRow>
          queryId="biz.events"
          columns={columns(t, formatCount)}
          transform={toRows}
          pageSize={20}
          permissionImpact={t('st.biz.perm')}
          emptyMessage={t('st.biz.empty')}
          summary={(result) => {
            const rows = toRows(result.records);
            const shown = rows.reduce((sum, row) => sum + (row.events ?? 0), 0);
            return (
              <Text>
                {t('p.biz.summaryLine', {
                  // Exact counts from `biz.events.total`; the 25 rows give only a floor without it.
                  types:
                    typeCount !== null
                      ? formatNumber(typeCount)
                      : t('common.atLeast', { n: formatNumber(rows.length) }),
                  events: total !== null ? formatNumber(total) : t('common.atLeast', { n: formatNumber(shown) }),
                })}
                {typeCount !== null && typeCount > rows.length
                  ? ` ${t('p.biz.topOf', { shown: rows.length })}`
                  : ''}
              </Text>
            );
          }}
        />
      </Flex>

      <Flex flexDirection="column" gap={8}>
        <Heading level={3} as="h2">{t('p.biz.nextTitle')}</Heading>
        <Paragraph>
          {t('p.biz.nextBody')}
        </Paragraph>
      </Flex>

      <DqlDisclosure entries={[getQuery('biz.events.total'), getQuery('biz.events')]} />
    </Stack>
  );
};
