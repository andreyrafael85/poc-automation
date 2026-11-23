import React from 'react';

import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { Heading, Paragraph, Text } from '@dynatrace/strato-components/typography';

import { CatalogTable } from '../components/CatalogTable';
import { ChartFrame } from '../components/ChartFrame';
import { ProviderMark } from '../components/spectrum';
import { BarList } from '../components/viz/BarList';
import { DonutBreakdown, type DonutSegment } from '../components/viz/DonutBreakdown';
import { DqlDisclosure } from '../components/DqlDisclosure';
import { PageSummary, type SummaryItem } from '../components/PageSummary';
import { SectionIntro } from '../components/SectionIntro';
import { useQueryScope } from '../config/StudioContext';
import { Callout, Cluster, Figure, Grid, Panel, Stack } from '../engine';
import '../engine/page-c.css';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import { useSummaryFact } from '../hooks/useSummaryFact';
import { PROVIDER_META, normaliseProvider, summariseCloud, type CloudProvider } from '../models/cloud';
import { summariseCloudServices } from '../models/cloudServices';
import { getQuery } from '../queries/catalog';
import { num, str, type GrailRecord } from '../utils/records';
import { formatBytes } from '../utils/time';
import { CockpitRow } from '../engine/chart/CockpitRow';
import { useTranslation, type Translation } from '../i18n/useTranslation';

/**
 * Cloud observability.
 *
 * The multi-cloud footprint on its own page: which providers Dynatrace found,
 * how much of the estate runs in each, and the instrumentation depth per cloud.
 * Attribution comes only from the platform's `cloudType`; a host without it is
 * on-prem or undetected, never assumed to be in a cloud.
 */

interface CloudHostRow extends GrailRecord {
  name: string;
  provider: CloudProvider;
  osType: string;
  cpuCores: number | null;
  memory: string;
  monitoringMode: string;
  state: string;
}

const toRows = (records: GrailRecord[]): CloudHostRow[] =>
  records.map((record) => ({
    ...record,
    name: str(record, 'name') ?? str(record, 'entity.name') ?? '—',
    provider: normaliseProvider(str(record, 'cloudType')),
    osType: str(record, 'osType') ?? 'Not reported',
    cpuCores: num(record, 'cpuCores'),
    memory: formatBytes(num(record, 'memoryTotal')),
    monitoringMode: str(record, 'monitoringMode') ?? 'Not reported',
    state: str(record, 'state') ?? 'Not reported',
  }));

const cloudColumns = (t: Translation['t']): DataTableColumnDef<CloudHostRow>[] => [
  { id: 'name', header: t('common.host'), accessor: 'name', width: '1.8fr' },
  {
    id: 'provider',
    header: t('p.cloud.h.provider'),
    accessor: 'provider',
    width: 150,
    cell: ({ rowData }) => (
      <DataTable.DefaultCell>
        <Cluster gap="tight">
          <ProviderMark provider={rowData.provider} size={24} decorative />
          <Text>{PROVIDER_META[rowData.provider].short}</Text>
        </Cluster>
      </DataTable.DefaultCell>
    ),
  },
  { id: 'osType', header: t('p.cloud.h.os'), accessor: 'osType', width: 120 },
  { id: 'cpuCores', header: t('p.cloud.h.cores'), accessor: 'cpuCores', width: 100, alignment: 'right' },
  { id: 'memory', header: t('p.cloud.h.memory'), accessor: 'memory', width: 130, alignment: 'right' },
  { id: 'monitoringMode', header: t('common.monitoringMode'), accessor: 'monitoringMode', width: 170 },
  { id: 'state', header: t('p.cloud.h.state'), accessor: 'state', width: 150 },
];

export const CloudObservability = () => {
  const { t, tCount, formatNumber } = useTranslation();
  const scope = useQueryScope();
  const cloud = useCatalogQuery('cloud.hosts', scope);
  const services = useCatalogQuery('cloud.services', scope);
  const inventory = useCatalogQuery('cov.inventory', scope);
  const factFrom = useSummaryFact();

  const view = summariseCloud(cloud.records);
  const svc = summariseCloudServices(services.records);
  const fullStackHosts = view.providers.reduce((sum, row) => sum + row.fullStack, 0);
  const infraOnlyHosts = view.providers.reduce((sum, row) => sum + row.infra, 0);
  const totalHosts = num(
    inventory.records.find((record) => str(record, 'category') === 'Hosts'),
    'value',
  );
  const coveragePct =
    totalHosts !== null && totalHosts > 0 ? Math.round((view.totalHosts / totalHosts) * 100) : null;

  const headline: SummaryItem[] = [
    {
      key: 'hosts',
      label: t('p.cloud.band.hosts'),
      fact: factFrom(cloud, cloud.outcome === 'ok' ? view.totalHosts : null),
      display: cloud.outcome === 'ok' ? formatNumber(view.totalHosts) : undefined,
      detail: t('p.cloud.band.hostsDetail', { total: totalHosts === null ? '—' : formatNumber(totalHosts) }),
    },
    {
      key: 'providers',
      label: t('p.cloud.band.providers'),
      fact: factFrom(cloud, cloud.outcome === 'ok' ? view.providerCount : null),
      display: cloud.outcome === 'ok' ? formatNumber(view.providerCount) : undefined,
      detail: t('p.cloud.band.providersDetail'),
    },
    {
      key: 'cores',
      label: t('p.cloud.band.cores'),
      fact: factFrom(cloud, cloud.outcome === 'ok' ? view.totalCores : null),
      display: cloud.outcome === 'ok' ? formatNumber(view.totalCores) : undefined,
      detail: t('p.cloud.band.coresDetail'),
    },
    {
      key: 'memory',
      label: t('p.cloud.band.memory'),
      fact: factFrom(cloud, cloud.outcome === 'ok' ? view.totalMemBytes : null),
      display: cloud.outcome === 'ok' ? formatBytes(view.totalMemBytes) : undefined,
      detail: t('p.cloud.band.memoryDetail'),
    },
    {
      key: 'coverage',
      label: t('p.cloud.band.coverage'),
      fact: factFrom(cloud, coveragePct, { calculation: t('p.cloud.band.coverageCalc'), unit: '%' }),
      display: coveragePct === null ? undefined : `${coveragePct}%`,
      detail: t('p.cloud.band.coverageDetail', { total: totalHosts === null ? '—' : formatNumber(totalHosts) }),
    },
  ];

  const segments: DonutSegment[] = view.providers.map((row) => ({
    key: row.provider,
    label: PROVIDER_META[row.provider].short,
    value: row.hosts,
    display: formatNumber(row.hosts),
  }));

  // A figure is printed only when the query behind it answered: with `cloud.hosts` failed this
  // panel said "0 Cloud hosts" and "0 infrastructure-only vs 0 full-stack hosts".
  const cloudRead = cloud.outcome === 'ok';
  const servicesRead = services.outcome === 'ok';
  const unread = t('state.notMeasured');

  const phases: readonly FinOpsPhase[] = [
    {
      key: 'inform',
      phase: t('p.cloud.finops.phase.inform'),
      metric: !cloudRead
        ? '—'
        : coveragePct === null
          ? `${formatNumber(view.totalHosts)} ${t('p.cloud.band.hosts')}`
          : `${coveragePct}%`,
      caption: !cloudRead
        ? unread
        : t('p.cloud.finops.informCap', {
            providers: view.providers.map((row) => PROVIDER_META[row.provider].short).join(' · ') || '—',
            families: servicesRead ? formatNumber(svc.serviceFamilyCount) : '—',
          }),
      action: t('p.cloud.finops.informAct'),
    },
    {
      key: 'optimize',
      phase: t('p.cloud.finops.phase.optimize'),
      metric: cloudRead ? formatNumber(infraOnlyHosts) : '—',
      caption: cloudRead
        ? t('p.cloud.finops.optimizeCap', { infra: formatNumber(infraOnlyHosts), full: formatNumber(fullStackHosts) })
        : unread,
      action: t('p.cloud.finops.optimizeAct'),
    },
    {
      key: 'operate',
      phase: t('p.cloud.finops.phase.operate'),
      metric: servicesRead ? formatNumber(svc.totalResources) : '—',
      caption: t('p.cloud.finops.operateCap'),
      action: t('p.cloud.finops.operateAct'),
    },
  ];

  return (
    <Stack gap="section">
      <SectionIntro titleKey="p.cloud.title" questionKey="p.cloud.question" takeawayKey="p.cloud.takeaway" />

      <PageSummary items={headline} footnote={t('p.cloud.band.footnote')} />

      {/* 3.3.12: the providers beside the hosts' distribution (a cockpit row). */}
      <CockpitRow data-testid="cloud-cockpit" align="start">
        {view.providers.length > 0 && (
          // 3.5.3 (fit): one provider per line, its four figures side by side — three providers no longer leave a
          // hole beside the third card, and the column matches the distribution's height.
          <Stack gap="group" className="pvs-cloud-providers">
            {view.providers.map((row) => {
              const meta = PROVIDER_META[row.provider];
              return (
                // The provider is identified by its official glyph (brand colour lives only there) and its name.
                <Panel key={row.provider} as="article" pad="roomy">
                  <Stack gap="group">
                    <Cluster gap="group">
                      <ProviderMark provider={row.provider} size={44} decorative />
                      <Stack gap="tight">
                        <Heading level={4} as="h2">
                          {meta.fullName}
                        </Heading>
                        <Text className="pvs-caption">{tCount('p.cloud.card.hosts', row.hosts, { hosts: formatNumber(row.hosts) })}</Text>
                      </Stack>
                    </Cluster>
                    <Grid min={96} gap="tight">
                      <Metric label={t('p.cloud.card.cores')} value={formatNumber(row.cores)} />
                      <Metric label={t('p.cloud.card.memory')} value={formatBytes(row.memBytes)} />
                      <Metric label={t('p.cloud.card.fullStack')} value={formatNumber(row.fullStack)} />
                      <Metric label={t('p.cloud.card.infra')} value={formatNumber(row.infra)} />
                    </Grid>
                  </Stack>
                </Panel>
              );
            })}
          </Stack>
        )}
        {segments.length > 0 && (
          <Stack as="section" gap="group">
            <Heading level={4} as="h2">
              {t('p.cloud.distTitle')}
            </Heading>
            <Paragraph className="pvs-prose">{t('p.cloud.distBody')}</Paragraph>
            <ChartFrame
              role="category"
              title={t('p.cloud.distChartTitle')}
              provenance={cloud.provenance}
              evidence={cloud.evidence}
            >
              <DonutBreakdown
                heads={{ name: t('v6.legend.name'), count: t('v6.legend.count'), share: t('v6.hex.share') }}
                segments={segments}
                ariaLabel={t('p.cloud.distChartTitle')}
                centerDisplay={formatNumber(view.totalHosts)}
                centerLabel={t('p.cloud.band.hosts')}
              />
            </ChartFrame>
          </Stack>
        )}
      </CockpitRow>

      {svc.serviceFamilyCount > 0 && (
        <Stack as="section" gap="group">
          <Heading level={4} as="h2">
            {t('p.cloud.svc.title')}
          </Heading>
          <Paragraph className="pvs-prose">
            {t('p.cloud.svc.body', { families: formatNumber(svc.serviceFamilyCount), resources: formatNumber(svc.totalResources) })}
          </Paragraph>
          <Grid min={300}>
            {(['AWS', 'Azure', 'GCP', 'Other'] as CloudProvider[])
              .filter((provider) => svc.byProvider[provider].length > 0)
              .map((provider) => (
                <Panel key={provider} as="article" pad="roomy">
                  <Stack gap="group">
                    <Cluster gap="tight">
                      <ProviderMark provider={provider} size={40} decorative />
                      <Heading level={5} as="h3">
                        {PROVIDER_META[provider].fullName}
                      </Heading>
                    </Cluster>
                    <BarList
                      role="magnitude"
                      ariaLabel={t('p.cloud.svc.aria', { provider: PROVIDER_META[provider].short })}
                      items={svc.byProvider[provider].slice(0, 10).map((service) => ({
                        key: service.family,
                        label: service.family,
                        value: service.resources,
                        display: formatNumber(service.resources),
                      }))}
                    />
                  </Stack>
                </Panel>
              ))}
          </Grid>
        </Stack>
      )}

      <Panel as="section" pad="roomy">
        <Stack gap="section">
          <Stack gap="tight">
            <p className="pvs-eyebrow">{t('p.cloud.finops.eyebrow')}</p>
            <Heading level={4} as="h2">
              {t('p.cloud.finops.title')}
            </Heading>
            <Paragraph className="pvs-prose">{t('p.cloud.finops.body')}</Paragraph>
          </Stack>
          <ol className="pvs-c-steps" data-layout="grid" aria-label={t('p.cloud.finops.title')}>
            {phases.map((phase, index) => (
              <Panel key={phase.key} as="li" pad="compact">
                <Stack gap="tight">
                  <Cluster gap="tight">
                    <span className="pvs-step">{index + 1}</span>
                    <Text className="pvs-label">{phase.phase}</Text>
                  </Cluster>
                  <Figure value={phase.metric} size="md" />
                  <Text className="pvs-caption">{phase.caption}</Text>
                  <Text>{phase.action}</Text>
                </Stack>
              </Panel>
            ))}
          </ol>
          <Callout kind="note" title={t('callout.note')}>
            {t('p.cloud.finops.footnote')}
          </Callout>
        </Stack>
      </Panel>

      <Stack as="section" gap="group">
        <Heading level={4} as="h2">
          {t('p.cloud.tableTitle')}
        </Heading>
        <Paragraph className="pvs-prose">{t('p.cloud.tableBody')}</Paragraph>
        <CatalogTable<CloudHostRow>
          queryId="cloud.hosts.detail"
          columns={cloudColumns(t)}
          transform={toRows}
          emptyMessage={t('p.cloud.empty')}
        />
      </Stack>

      <DqlDisclosure entries={[getQuery('cloud.hosts'), getQuery('cloud.services'), getQuery('cloud.hosts.detail')]} />
    </Stack>
  );
};

interface FinOpsPhase {
  key: string;
  phase: string;
  metric: string;
  caption: string;
  action: string;
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="pvs-c-metric">
    <Figure value={value} size="md" />
    <Text className="pvs-caption">{label}</Text>
  </div>
);
