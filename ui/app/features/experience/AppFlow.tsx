import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { ApplicationsIcon, ServicesIcon, SmartscapeIcon } from '@dynatrace/strato-icons';

import { FlowMap, useChartFormat, type FlowMapNode } from '../../components/spectrum';
import { useFrontendIds } from '../../hooks/useTrailLinks';
import { useTranslation } from '../../i18n/useTranslation';
import { appFlow, type FlowService } from '../../models/appFlow';
import { entityLink } from '../../utils/deepLinks';
import type { GrailRecord } from '../../utils/records';

/**
 * Who a frontend calls (3.2.6): the application → its entry services → what they call next, as a
 * compact flow map in the grammar of Topology's "who calls whom", of individual services this
 * time, each a link to its page in the platform (3.2.7: the frontend on its Experience Vitals page,
 * each service in the Services app). Read from the entity model (`rum.app.flow`); the
 * traffic on a service comes from `svc.ranking` when it is among the busiest.
 */

const external = (href: string | null): { externalHref?: string } => (href === null ? {} : { externalHref: href });

export const AppFlow = ({ appName, flow, ranking }: { appName: string; flow: readonly GrailRecord[]; ranking: readonly GrailRecord[] }) => {
  const { t, formatNumber, formatDecimal } = useTranslation();
  const fmt = useChartFormat();
  const frontendIds = useFrontendIds();
  const model = appFlow(flow, appName, ranking);
  if (model === null) return <Text className="pvs-caption">{t('p.dx3.flow.none')}</Text>;

  const figure = (service: FlowService) => (service.requests === null ? t('p.dx3.flow.service') : fmt.compact(service.requests));
  const unit = (service: FlowService) =>
    service.requests === null
      ? undefined
      : service.failurePct !== null && service.failurePct >= 0.01
        ? t('p.dx3.flow.reqFail', { pct: formatDecimal(service.failurePct, service.failurePct >= 1 ? 1 : 2) })
        : t('p.dx3.flow.req');
  // Too long beside a large figure ("911,1 mil"), the unit drops "req." and keeps the failure share (3.2.7 review UX-M4).
  const unitShort = (service: FlowService) =>
    service.requests !== null && service.failurePct !== null && service.failurePct >= 0.01
      ? t('p.dx3.flow.failShort', { pct: formatDecimal(service.failurePct, service.failurePct >= 1 ? 1 : 2) })
      : undefined;
  const serviceNode = (service: FlowService, column: 'entry' | 'next'): FlowMapNode => {
    const full = unit(service);
    const short = unitShort(service);
    return {
      id: service.id,
      column,
      name: service.name,
      figure: figure(service),
      ...(full === undefined ? {} : { unit: full }),
      ...(short === undefined ? {} : { unitShort: short }),
      family: column === 'entry' ? 'blue-turquoise' : 'turquoise',
      icon: <ServicesIcon size={22} />,
      // The spoken label keeps the whole figure, failures included, whatever the node has room to print.
      label: t('p.dx3.flow.serviceAria', { name: service.name, figure: full === undefined ? figure(service) : `${figure(service)} ${full}` }),
      ...external(entityLink(service.id)),
    };
  };

  const nodes: FlowMapNode[] = [
    {
      id: model.app.id,
      column: 'app',
      name: model.app.name,
      figure: t('p.dx3.flow.frontend'),
      family: 'orange',
      icon: <ApplicationsIcon size={22} />,
      label: t('p.dx3.flow.appAria', { name: model.app.name }),
      ...external(entityLink(model.app.id, { frontendId: frontendIds.get(model.app.id) ?? null })),
    },
    ...model.entries.map((service) => serviceNode(service, 'entry')),
    ...model.next.map((service) => serviceNode(service, 'next')),
  ];
  const links = model.links.map((link) => ({ ...link, value: 1 }));
  if (model.moreNext > 0) {
    nodes.push({
      id: 'more',
      column: 'next',
      name: t('p.dx3.flow.moreName'),
      figure: `+${formatNumber(model.moreNext)}`,
      unit: t('p.dx3.flow.services'),
      family: 'grey',
      icon: <SmartscapeIcon size={22} />,
      label: t('p.dx3.flow.more', { count: formatNumber(model.moreNext) }),
    });
    const firstEntry = model.entries[0];
    if (firstEntry !== undefined) links.push({ from: firstEntry.id, to: 'more', value: 1 });
  }

  return (
    <FlowMap
      columns={[
        { id: 'app', label: t('p.dx3.flow.col.app') },
        { id: 'entry', label: t('p.dx3.flow.col.entry') },
        { id: 'next', label: t('p.dx3.flow.col.next') },
      ]}
      nodes={nodes}
      links={links}
      width={980}
      ariaLabel={t('p.dx3.flow.aria', { name: model.app.name })}
      legend={[t('p.dx3.flow.legend'), ...(nodes.some((node) => node.externalHref !== undefined) ? [t('flow.legend.open')] : [])]}
    />
  );
};
