import React from 'react';

import { Flex } from '@dynatrace/strato-components/layouts';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';

import { CatalogTable } from '../components/CatalogTable';
import { ChartFrame } from '../components/ChartFrame';
import { BarList } from '../components/viz/BarList';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { TechChips } from '../components/spectrum';
import { useQueryScope } from '../config/StudioContext';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery } from '../queries/catalog';
import { rankTechnologies, technologyBars, technologyChips, toTechnologyRows, type TechnologyRow } from '../models/technologies';
import { num, str } from '../utils/records';
import { useTranslation, type Translation } from '../i18n/useTranslation';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { Callout, Panel, Stack } from '../engine';

/**
 * Processes and technologies.
 *
 * The version column is reported verbatim from the platform. This page
 * deliberately makes no end-of-support or obsolescence claim: that would require
 * a vendor lifecycle source this app does not have, and an unverified
 * "unsupported version" claim in front of a customer is worse than no claim.
 */

const technologyColumns = (t: Translation['t'], formatCount: Translation['formatCount']): DataTableColumnDef<TechnologyRow>[] => [
  { id: 'technology', header: t('common.technology'), accessor: 'technology', width: '1.4fr' },
  { id: 'edition', header: t('p.tech.h.edition'), accessor: 'edition', width: '1.2fr' },
  { id: 'version', header: t('common.version'), accessor: 'version', width: '1fr' },
  {
    id: 'instances',
    header: t('p.tech.h.instances'),
    accessor: 'instances',
    width: 170,
    alignment: 'right',
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>{formatCount(rowData.instances)}</DataTable.DefaultCell>
    ),
  },
];

export const ProcessesAndTechnologies = () => {
  const { t, tCount, formatNumber, tWindow, formatCount } = useTranslation();
  const scope = useQueryScope();
  const technologies = useCatalogQuery('proc.technologies', scope);
  const inventory = useCatalogQuery('cov.inventory', scope);
  const factFrom = useSummaryFact();

  const rows = toTechnologyRows(technologies.records);
  // Process instances come from the inventory, which counts each instance once. Summing the
  // technology rows would count an instance once per technology it runs.
  const instances = num(
    inventory.records.find((record) => str(record, 'category') === 'Process instances'),
    'value',
  );
  const families = new Set(rows.map((row) => row.technology)).size;
  const withVersion = rows.filter((row) => row.version !== 'Version not reported').length;
  const ranked = rankTechnologies(rows);
  const top = ranked[0];

  /**
   * The question an SRE lands on this page with: what are we actually running,
   * and how much of it. The inventory table answers it eventually; this answers
   * it immediately.
   */
  const headline: SummaryItem[] = [
    {
      key: 'families',
      label: t('p.tech.band.families'),
      fact: factFrom(technologies, technologies.outcome === 'ok' ? families : null),
      display: technologies.outcome === 'ok' ? formatNumber(families) : undefined,
      detail: t('p.tech.band.familiesDetail'),
    },
    {
      key: 'instances',
      label: t('p.tech.band.instances'),
      fact: factFrom(inventory, instances),
      display: instances === null ? undefined : formatNumber(instances),
      detail: t('p.tech.band.instancesDetail'),
    },
    {
      key: 'top',
      label: t('p.tech.band.top'),
      fact: factFrom(technologies, top?.technology ?? null),
      display: top?.technology,
      detail:
        top === undefined
          ? undefined
          : tCount('p.tech.band.topDetail', top.instances ?? 0, { count: formatNumber(top.instances ?? 0) }),
    },
    {
      key: 'versions',
      label: t('p.tech.band.versions'),
      fact: factFrom(technologies, technologies.outcome === 'ok' ? withVersion : null, {
        calculation: t('p.tech.band.versionsCalc'),
      }),
      display: technologies.outcome === 'ok' ? formatNumber(withVersion) : undefined,
      detail: t('p.tech.band.versionsDetail', { total: rows.length }),
    },
  ];

  // One chip per technology, its versions together; the busiest versions as bars (`models/technologies`,
  // shared with the Tech Wrapup's captures).
  const chips = technologyChips(rows).map(({ name, count }) => ({ name, display: formatNumber(count) }));
  const bars = technologyBars(rows);

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.tech.title"
        questionKey="p.tech.question"
        takeawayKey="p.tech.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.tech.band.footnote')} />

      {/* 3.3.12: the technologies by process count beside the chips (a cockpit row). */}
      <CockpitRow data-testid="tech-cockpit" align="start">
        {bars.length > 0 && (
          <ChartFrame
            role="magnitude"
            title={t('p.tech.chartTitle')}
            caption={t('p.tech.chartCaption')}
            provenance={technologies.provenance}
            evidence={technologies.evidence}
            windowLabel={tWindow(technologies.timeframe.label)}
          >
            <BarList role="magnitude"
              ariaLabel={t('p.tech.chartAria')}
              // Rows are per technology *version*, so a name can repeat ("JAVA" 17.x and 1.8.x):
              // the position keeps the keys unique.
              items={bars.map((row, index) => ({
                key: `${row.name}-${index}`,
                label: row.name,
                value: row.value,
                display: formatNumber(row.value),
              }))}
            />
          </ChartFrame>
        )}
        {technologies.outcome === 'ok' && chips.length > 0 && (
          <Panel as="section" pad="roomy">
            <Stack gap="group">
              <Heading level={4} as="h2">
                {t('p.tech.chips.title')}
              </Heading>
              <TechChips items={chips} label={t('p.tech.chips.aria')} />
              <Paragraph className="pvs-caption">{t('p.tech.chips.caption')}</Paragraph>
            </Stack>
          </Panel>
        )}
      </CockpitRow>

      <Callout kind="limitation" title={t('p.tech.noClaim')}>
        {t('p.tech.noClaimBody')}
      </Callout>

      <Flex flexDirection="column" gap={12}>
        <Heading level={3} as="h2">{t('p.tech.inventory')}</Heading>
        <Paragraph>
          {t('p.tech.inventoryBody')}
        </Paragraph>
        <CatalogTable<TechnologyRow>
          queryId="proc.technologies"
          columns={technologyColumns(t, formatCount)}
          transform={toTechnologyRows}
          pageSize={20}
        />
      </Flex>

      <DqlDisclosure entries={[getQuery('cov.inventory'), getQuery('proc.technologies')]} />
    </Stack>
  );
};
