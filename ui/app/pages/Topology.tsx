import React from 'react';

import type { DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { DatabaseIcon, ServicesIcon, WorldmapIcon } from '@dynatrace/strato-icons';

import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { BrandGlyph, StackMap, techGlyph } from '../components/spectrum';
import { databaseGlyph } from '../components/spectrum/brandFor';
import { IconChips, type IconChip } from '../components/spectrum/IconChips';
import { useStackNodes } from '../features/stack/useStackNodes';
import { CallMap } from '../features/topology/CallMap';
import { SERVICE_TYPE_KEY } from '../models/serviceTypes';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Panel, Stack } from '../engine';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { CatalogTable } from '../components/CatalogTable';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { SectionIntro } from '../components/SectionIntro';
import { getQuery } from '../queries/catalog';
import { list, num, parseTechnology, str, type GrailRecord } from '../utils/records';
import { useTranslation, type Translation } from '../i18n/useTranslation';

/**
 * Topology and dependencies.
 *
 * What this page shows is aggregates and relationships the platform reported, never
 * a drawn graph. `smartscape.nodes` and `smartscape.edges` were tested and return
 * DATA_OBJECT_NOT_SUPPORTED for user DQL in this environment, and no official
 * Strato topology-graph component was confirmed against the installed types, so
 * there are no edges to draw. Instead:
 *
 *   - `SmartscapeView` reads the estate top-down in tiers (services, technologies,
 *     data stores, external endpoints), each tier a labelled set of counts
 *     aggregated from what the entity model reports. The tiers are told apart by
 *     their label and position; the view never invents an edge.
 *   - the two tables below it carry the relationships themselves: the database
 *     bindings and public endpoints recorded on each service, and the entities
 *     Davis correlated for each problem.
 *
 * 3.2.1 ("Value Spectrum", wave 2): the page opens with the stack map, the estate as one
 * picture from the user to the cloud. Its links are the stack's hierarchy, which the legend
 * says on screen, so it does not contradict the paragraph above: it draws no measured edge.
 *
 * 3.2.3 (wave V4): the entity model's `calls` relationship is readable from user DQL at no scan
 * cost (validated on the lab tenant), so "who calls what" now draws measured edges, grouped by
 * service type and database vendor (`svc.topology.calls`, `features/topology/CallMap.tsx`). The
 * tiers became a composition of chips with the official glyphs.
 */

interface DependencyRow extends GrailRecord {
  name: string;
  serviceType: string;
  technologies: string;
  databaseVendor: string;
  databaseName: string;
  databaseHosts: string;
  external: string;
  endpoint: string;
}

const dependencyColumns = (t: Translation['t']): DataTableColumnDef<DependencyRow>[] => [
  { id: 'name', header: t('common.service'), accessor: 'name', width: '1.6fr' },
  { id: 'serviceType', header: t('common.type'), accessor: 'serviceType', width: 190 },
  { id: 'technologies', header: t('common.technologies'), accessor: 'technologies', width: '1.4fr' },
  { id: 'databaseVendor', header: t('p.topo.h.dbVendor'), accessor: 'databaseVendor', width: 170 },
  { id: 'databaseName', header: t('p.topo.h.database'), accessor: 'databaseName', width: 170 },
  { id: 'databaseHosts', header: t('p.topo.h.dbHosts'), accessor: 'databaseHosts', width: '1.2fr' },
  { id: 'external', header: t('p.topo.h.external'), accessor: 'external', width: 120 },
  { id: 'endpoint', header: t('p.topo.h.publicEndpoint'), accessor: 'endpoint', width: '1.2fr' },
];

const toDependencyRows = (records: GrailRecord[]): DependencyRow[] =>
  records.map((record) => {
    const technologies = list(record, 'technologies')
      .map((raw) => parseTechnology(raw))
      .filter((tech): tech is NonNullable<typeof tech> => tech !== null)
      .map((tech) => (tech.version === null ? tech.type : `${tech.type} ${tech.version}`));
    const port = num(record, 'port');
    const domain = str(record, 'publicDomain');
    return {
      ...record,
      name: str(record, 'name') ?? 'Unnamed service',
      serviceType: str(record, 'serviceType') ?? 'Not reported',
      technologies: technologies.length > 0 ? [...new Set(technologies)].join(', ') : 'Not reported',
      databaseVendor: str(record, 'databaseVendor') ?? '—',
      databaseName: str(record, 'databaseName') ?? '—',
      databaseHosts: list(record, 'databaseHosts').join(', ') || '—',
      external: str(record, 'isExternal') === 'true' ? 'Yes' : 'No',
      endpoint: domain === null ? '—' : port === null ? domain : `${domain}:${port}`,
    };
  });

interface ProblemTopologyRow extends GrailRecord {
  displayId: string;
  name: string;
  affected: string;
  affectedTypes: string;
  related: string;
  impact: string;
}

const problemTopologyColumns = (t: Translation['t']): DataTableColumnDef<ProblemTopologyRow>[] => [
  { id: 'displayId', header: t('p.topo.h.problem'), accessor: 'displayId', width: 130 },
  { id: 'name', header: t('common.signal'), accessor: 'name', width: '1.4fr' },
  { id: 'affected', header: t('p.topo.h.affectedEntity'), accessor: 'affected', width: '1.4fr' },
  { id: 'affectedTypes', header: t('p.topo.h.entityType'), accessor: 'affectedTypes', width: '1.2fr' },
  { id: 'related', header: t('p.topo.h.related'), accessor: 'related', width: '1.6fr' },
  { id: 'impact', header: t('common.impactLevel'), accessor: 'impact', width: 150 },
];

const toProblemTopologyRows = (records: GrailRecord[]): ProblemTopologyRow[] =>
  records
    .map((record) => ({
      ...record,
      displayId: str(record, 'displayId') ?? '—',
      name: str(record, 'name') ?? 'Unnamed',
      affected: list(record, 'affected').join(', ') || 'Not reported',
      affectedTypes: list(record, 'affectedTypes').join(', ') || 'Not reported',
      related: list(record, 'related').join(', ') || 'Not reported',
      impact: list(record, 'impactLevel').join(', ') || 'Not reported',
    }))
    .filter((row) => row.related !== 'Not reported' || row.affected !== 'Not reported');

export const Topology = () => {
  const { t, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const factFrom = useSummaryFact();

  // The headline counts come from `svc.topology.total` and the Smartscape tiers from
  // `svc.topology.mix`, both aggregated in the query over every service. The dependency table
  // below lists the first 300 services by name and says so; it is never counted.
  const topologyTotals = useCatalogQuery('svc.topology.total', scope);
  const stack = useStackNodes();
  const mix = useCatalogQuery('svc.topology.mix', scope);
  const totalsRow = topologyTotals.records[0];
  const serviceCount = num(totalsRow, 'services');
  const withDatabase = num(totalsRow, 'withDatabase');
  const external = num(totalsRow, 'external');
  const publicEndpoints = num(totalsRow, 'publicDomain');

  const tier = (name: string) =>
    mix.records
      .filter((record) => str(record, 'tier') === name)
      .map((record) => ({ label: str(record, 'label') ?? '—', count: num(record, 'services') ?? 0 }))
      .sort((a, b) => b.count - a.count);

  const typeName = (type: string) => {
    const key = SERVICE_TYPE_KEY[type];
    return key === undefined ? type : t(key);
  };

  // What the services are made of, each tier the top 8 over every service (counted in the query).
  // 3.2.3: chips with the official glyph of each technology and database vendor.
  const glyphOr = (glyph: ReturnType<typeof techGlyph>, fallback: React.ReactNode) =>
    glyph === null ? fallback : <BrandGlyph name={glyph} size={18} />;
  const composition: { key: string; label: string; family: 'turquoise' | 'pink-purple' | 'purple' | 'orange'; items: IconChip[] }[] = [
    {
      key: 'types',
      label: t('p.topo.smart.services'),
      family: 'turquoise',
      items: tier('type').map(({ label, count }) => ({
        key: label,
        name: typeName(label),
        display: formatNumber(count),
        icon: <ServicesIcon size={18} />,
      })),
    },
    {
      key: 'tech',
      label: t('p.topo.smart.technologies'),
      family: 'pink-purple',
      items: tier('technology').map(({ label, count }) => ({
        key: label,
        name: label,
        display: formatNumber(count),
        icon: glyphOr(techGlyph(label), <ServicesIcon size={18} />),
      })),
    },
    {
      key: 'db',
      label: t('p.topo.smart.databases'),
      family: 'purple',
      items: tier('database').map(({ label, count }) => ({
        key: label,
        name: label,
        display: formatNumber(count),
        icon: glyphOr(databaseGlyph(label), <DatabaseIcon size={18} />),
      })),
    },
    {
      key: 'external',
      label: t('p.topo.smart.external'),
      family: 'orange',
      items: tier('domain').map(({ label, count }) => ({
        key: label,
        name: label,
        display: formatNumber(count),
        icon: <WorldmapIcon size={18} />,
      })),
    },
  ];

  const headline: SummaryItem[] = [
    {
      key: 'services',
      label: t('p.topo.band.services'),
      fact: factFrom(topologyTotals, serviceCount),
      display: serviceCount === null ? undefined : formatNumber(serviceCount),
      detail: t('p.topo.band.servicesDetail'),
    },
    {
      key: 'databases',
      label: t('p.topo.band.databases'),
      fact: factFrom(topologyTotals, withDatabase),
      display: withDatabase === null ? undefined : formatNumber(withDatabase),
      detail: t('p.topo.band.databasesDetail'),
    },
    {
      key: 'external',
      label: t('p.topo.band.external'),
      fact: factFrom(topologyTotals, external),
      display: external === null ? undefined : formatNumber(external),
      detail: t('p.topo.band.externalDetail'),
    },
    {
      key: 'public',
      label: t('p.topo.band.public'),
      fact: factFrom(topologyTotals, publicEndpoints),
      display: publicEndpoints === null ? undefined : formatNumber(publicEndpoints),
      detail: t('p.topo.band.publicDetail'),
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro
        titleKey="p.topo.title"
        questionKey="p.topo.question"
        takeawayKey="p.topo.takeaway"
      />

      <PageSummary items={headline} footnote={t('p.topo.band.footnote')} />

      <Panel as="section" pad="roomy">
        <Stack gap="group">
          <Heading level={4} as="h2">
            {t(stack.hasCloud ? 'stack.title' : 'stack.titleOnPrem')}
          </Heading>
          <StackMap nodes={stack.nodes} />
          {stack.unattributedShown && <Paragraph className="pvs-caption">{t('stack.unattributedNote')}</Paragraph>}
        </Stack>
      </Panel>

      <Panel as="section" pad="roomy" className="pvs-spec-band">
        <span className="pvs-spec-band__edge" aria-hidden="true" />
        <Stack gap="group">
          <Stack gap="tight">
            <Heading level={4} as="h2">
              {t('p.topo.calls.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('p.topo.calls.subtitle')}</Paragraph>
          </Stack>
          <CallMap />
        </Stack>
      </Panel>

      {mix.outcome === 'ok' && mix.records.length > 0 && (
        <Panel as="section" pad="roomy">
          <Stack gap="group">
            <Stack gap="tight">
              <Heading level={4} as="h2">
                {t('p.topo.comp.title')}
              </Heading>
              <Paragraph className="pvs-prose">{t('p.topo.comp.subtitle')}</Paragraph>
            </Stack>
            <div className="pvs-topo-comp">
              {composition.map((group) => (
                <Stack key={group.key} gap="tight" className="pvs-topo-comp__group">
                  <Heading level={5} as="h3">
                    {group.label}
                  </Heading>
                  {group.items.length === 0 ? (
                    <Text className="pvs-caption">{t('p.topo.smart.empty')}</Text>
                  ) : (
                    <IconChips items={group.items} label={group.label} family={group.family} />
                  )}
                </Stack>
              ))}
            </div>
          </Stack>
        </Panel>
      )}

      {/* Why there is no drawn graph: a limit of the data source, not a fault in the estate. */}
      <Callout kind="limitation" title={t('p.topo.whyTable')}>
        {t('p.topo.whyTableBody')}
      </Callout>

      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.topo.deps')}
        </Heading>
        <Paragraph className="pvs-prose">{t('p.topo.depsBody')}</Paragraph>
        <CatalogTable<DependencyRow>
          queryId="svc.topology"
          columns={dependencyColumns(t)}
          transform={toDependencyRows}
          pageSize={15}
        />
      </Stack>

      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.topo.davisRel')}
        </Heading>
        <Paragraph className="pvs-prose">{t('p.topo.davisRelBody')}</Paragraph>
        <CatalogTable<ProblemTopologyRow>
          queryId="prob.list"
          columns={problemTopologyColumns(t)}
          transform={toProblemTopologyRows}
          pageSize={10}
          emptyMessage={t('st.topo.empty')}
        />
      </Stack>

      <DataTableHint />

      <DqlDisclosure
        entries={[
          getQuery('cov.inventory'),
          getQuery('cloud.hosts'),
          getQuery('svc.topology.total'),
          getQuery('svc.topology.calls'),
          getQuery('svc.topology.mix'),
          getQuery('svc.topology'),
          getQuery('prob.list'),
        ]}
      />
    </Stack>
  );
};

const DataTableHint = () => {
  const { t } = useTranslation();

  return <Paragraph className="pvs-prose pvs-muted">{t('p.topo.path')}</Paragraph>;
};
