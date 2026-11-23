import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import { DatabaseIcon, QueuesIcon, ServicesIcon } from '@dynatrace/strato-icons';

import { BrandGlyph } from '../../components/spectrum/BrandGlyph';
import { databaseGlyph } from '../../components/spectrum/brandFor';
import { FlowMap, type FlowMapNode } from '../../components/spectrum/FlowMap';
import { QueryStateBoundary } from '../../components/QueryStateBoundary';
import { useQueryScope } from '../../config/StudioContext';
import { Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { SERVICE_TYPE_KEY, UNDECLARED_VENDOR } from '../../models/serviceTypes';
import { num, str, type GrailRecord } from '../../utils/records';

const ICON_SIZE = 22;

export interface CallMapModel {
  nodes: FlowMapNode[];
  links: { from: string; to: string; value: number }[];
  services: number | null;
  withCalls: number | null;
}

type Kind = 'service' | 'database' | 'messaging';

function kindOf(targetType: string | null): Kind {
  if (targetType === 'DATABASE_SERVICE') return 'database';
  if (targetType === 'MESSAGING_SERVICE' || targetType === 'QUEUE_LISTENER_SERVICE') return 'messaging';
  return 'service';
}

const KIND_ORDER: Record<Kind, number> = { service: 0, messaging: 1, database: 2 };

/**
 * `svc.topology.calls` as a flow map: who calls (service types) on the left, what is called
 * (service types, messaging, each database vendor) on the right, one link per measured pair.
 * Pure, so the page test and the report can build the same picture.
 */
export function buildCallMap(
  records: readonly GrailRecord[],
  t: (key: StringKey, params?: Readonly<Record<string, string | number>>) => string,
  formatNumber: (value: number) => string,
): CallMapModel {
  const typeName = (type: string) => {
    const key = SERVICE_TYPE_KEY[type];
    return key === undefined ? type : t(key);
  };
  const targetName = (target: string, targetType: string | null) => {
    if (targetType !== 'DATABASE_SERVICE') return typeName(target);
    if (target === 'DATABASE_SERVICE') return t('p.topo.calls.dbNoVendor');
    if (target === UNDECLARED_VENDOR) return t('p.topo.calls.dbUndeclared');
    return target;
  };
  const iconFor = (kind: Kind, vendor: string | null) => {
    if (kind === 'database') {
      const glyph = vendor === null ? null : databaseGlyph(vendor);
      return glyph === null ? <DatabaseIcon size={ICON_SIZE} /> : <BrandGlyph name={glyph} size={ICON_SIZE} />;
    }
    if (kind === 'messaging') return <QueuesIcon size={ICON_SIZE} />;
    return <ServicesIcon size={ICON_SIZE} />;
  };
  const unit = (count: number) => t(count === 1 ? 'p.topo.calls.unit.one' : 'p.topo.calls.unit');

  const callers = records
    .filter((record) => str(record, 'row') === 'caller')
    .map((record) => ({ type: str(record, 'source') ?? '—', services: num(record, 'services') ?? 0 }))
    .sort((a, b) => b.services - a.services);
  const callees = records
    .filter((record) => str(record, 'row') === 'callee')
    .map((record) => ({
      target: str(record, 'target') ?? '—',
      targetType: str(record, 'targetType'),
      services: num(record, 'services') ?? 0,
    }))
    .sort((a, b) => KIND_ORDER[kindOf(a.targetType)] - KIND_ORDER[kindOf(b.targetType)] || b.services - a.services);

  const nodes: FlowMapNode[] = [
    ...callers.map(({ type, services }) => {
      const name = typeName(type);
      return {
        id: `from:${type}`,
        column: 'callers',
        name,
        figure: formatNumber(services),
        unit: unit(services),
        family: 'turquoise' as const,
        icon: iconFor('service', null),
        href: '/services',
        label: t('p.topo.calls.callerAria', { name, count: formatNumber(services) }),
      };
    }),
    ...callees.map(({ target, targetType, services }) => {
      const kind = kindOf(targetType);
      const name = targetName(target, targetType);
      return {
        id: `to:${target}`,
        column: 'callees',
        name,
        figure: formatNumber(services),
        unit: unit(services),
        family: kind === 'database' ? ('purple' as const) : kind === 'messaging' ? ('orange' as const) : ('blue-turquoise' as const),
        icon: iconFor(kind, kind === 'database' ? target : null),
        href: '/services',
        label: t('p.topo.calls.calleeAria', { name, count: formatNumber(services) }),
      };
    }),
  ];
  const links = records
    .filter((record) => str(record, 'row') === 'link')
    .map((record) => ({
      from: `from:${str(record, 'source') ?? '—'}`,
      to: `to:${str(record, 'target') ?? '—'}`,
      value: num(record, 'calls') ?? 0,
    }));
  const total = records.find((record) => str(record, 'row') === 'total');
  return { nodes, links, services: num(total, 'services'), withCalls: num(total, 'withCalls') };
}

/**
 * Topology's "who calls what" (3.2.3, wave V4): the Smartscape call relationships of every
 * service, measured, drawn in the stack map's grammar. 3.2.1 could only draw the hierarchy of
 * the stack; the entity model's `calls` relationship turned out to be readable at no scan cost.
 */
export const CallMap = () => {
  const scope = useQueryScope();
  const { t, formatNumber } = useTranslation();
  const calls = useCatalogQuery('svc.topology.calls', scope);
  const model = buildCallMap(calls.records, t, formatNumber);

  return (
    <QueryStateBoundary result={calls}>
      <Stack gap="tight">
        {model.withCalls !== null && model.services !== null && (
          <Text className="pvs-caption">
            {t('p.topo.calls.coverage', { calls: formatNumber(model.withCalls), services: formatNumber(model.services) })}
          </Text>
        )}
        {model.links.length > 0 ? (
          <FlowMap
            columns={[
              { id: 'callers', label: t('p.topo.calls.col.callers') },
              { id: 'callees', label: t('p.topo.calls.col.callees') },
            ]}
            nodes={model.nodes}
            links={model.links}
            width={1145}
            ariaLabel={t('p.topo.calls.aria')}
            legend={[t('p.topo.calls.legend.link'), t('p.topo.calls.legend.width'), t('p.topo.calls.legend.count')]}
          />
        ) : (
          <Text>{t('p.topo.calls.none')}</Text>
        )}
      </Stack>
    </QueryStateBoundary>
  );
};
