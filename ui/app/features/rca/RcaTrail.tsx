import React from 'react';

import { Text } from '@dynatrace/strato-components/typography';
import {
  AiIcon,
  ApplicationsIcon,
  ContainerIcon,
  DatabaseIcon,
  HostsIcon,
  ProcessIcon,
  ServicesIcon,
  SmartscapeIcon,
  StopwatchIcon,
} from '@dynatrace/strato-icons';

import { BrandGlyph } from '../../components/spectrum/BrandGlyph';
import { FlowMap, type FlowMapNode } from '../../components/spectrum/FlowMap';
import { IconChips, type IconChip } from '../../components/spectrum/IconChips';
import { Stack } from '../../engine';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { useFrontendIds, useRootCallers } from '../../hooks/useTrailLinks';
import { buildProblemLink, type RcaIncident } from '../../models/rca';
import { NO_CALLERS, isDatabaseRoot, type RootCallers } from '../../models/trailLinks';
import { entityLink, platformUrl, servicePath } from '../../utils/deepLinks';
import { formatNanos } from '../../utils/time';

/** How many affected entities the trail draws; the rest are one "+N" node. */
export const TRAIL_AFFECTED_SHOWN = 6;

export type EntityKind = 'service' | 'database' | 'application' | 'host' | 'process' | 'synthetic' | 'workload' | 'kubernetes' | 'entity';

/** The kind of an entity from its id (`SERVICE-…`, `HOST-…`), which Davis always reports. */
export function entityKindOf(id: string | null | undefined): EntityKind {
  const prefix = (id ?? '').split('-')[0] ?? '';
  if (prefix === 'SERVICE' || prefix === 'SERVICE_INSTANCE') return 'service';
  if (/APPLICATION$/.test(prefix) && prefix !== 'CLOUD_APPLICATION') return 'application';
  if (prefix === 'HOST') return 'host';
  if (prefix.startsWith('PROCESS_GROUP')) return 'process';
  if (prefix === 'SYNTHETIC_TEST' || prefix === 'HTTP_CHECK') return 'synthetic';
  if (prefix === 'CLOUD_APPLICATION' || prefix === 'CLOUD_APPLICATION_INSTANCE') return 'workload';
  if (prefix.startsWith('KUBERNETES') || prefix === 'CLOUD_APPLICATION_NAMESPACE') return 'kubernetes';
  return 'entity';
}

export const KIND_KEY: Record<EntityKind, StringKey> = {
  service: 'p.rca.kind.service',
  database: 'p.rca.kind.database',
  application: 'p.rca.kind.application',
  host: 'p.rca.kind.host',
  process: 'p.rca.kind.process',
  synthetic: 'p.rca.kind.synthetic',
  workload: 'p.rca.kind.workload',
  kubernetes: 'p.rca.kind.kubernetes',
  entity: 'p.rca.kind.entity',
};

export function kindIcon(kind: EntityKind): React.ReactNode {
  const size = 22;
  switch (kind) {
    case 'service':
      return <ServicesIcon size={size} />;
    case 'database':
      return <DatabaseIcon size={size} />;
    case 'application':
      return <ApplicationsIcon size={size} />;
    case 'host':
      return <HostsIcon size={size} />;
    case 'process':
      return <ProcessIcon size={size} />;
    case 'synthetic':
      return <StopwatchIcon size={size} />;
    case 'workload':
      return <ContainerIcon size={size} />;
    case 'kubernetes':
      return <BrandGlyph name="kubernetes" size={size} />;
    default:
      return <SmartscapeIcon size={size} />;
  }
}

type T = (key: StringKey, params?: Readonly<Record<string, string | number>>) => string;

/** The node's platform link, when there is one (absent rather than undefined: exact optional props). */
const external = (href: string | null): { externalHref?: string } => (href === null ? {} : { externalHref: href });

/** What the trail knows beyond the incident itself, to open each box on the right page. */
export interface TrailHints {
  /** The root cause's callers (`useRootCallers`): a database root opens its top failing caller. */
  callers?: RootCallers;
  /** `APPLICATION-…` → `FRONTEND-…` (`useFrontendIds`). */
  frontendIds?: ReadonlyMap<string, string>;
}

/**
 * The incident's trail as a flow map: the problem → the root cause Davis named → the entities it
 * affected. Every node and link is something Davis attached to the problem (`rca.top`); the map
 * is a picture of the analysis, not a trace of calls, and its legend says so.
 *
 * Every node opens its page in the platform (3.2.7, explicit addresses in `utils/deepLinks.ts`):
 * the problem in the Problems app, a service in the Services app, a frontend in Experience Vitals,
 * a host in Infrastructure & Operations. A database root cause opens the service that failed most
 * calling it — the database has no page of its own there. An entity with no known page has no link.
 */
export function buildTrail(
  incident: RcaIncident,
  t: T,
  formatNumber: (value: number) => string,
  hints: TrailHints = {},
): { nodes: FlowMapNode[]; links: { from: string; to: string; value: number }[] } {
  const callers = hints.callers ?? NO_CALLERS;
  const frontendIds = hints.frontendIds ?? new Map<string, string>();
  const viaCaller = isDatabaseRoot(callers) ? callers.callers[0] : undefined;
  const isRootId = (id: string | null | undefined) => viaCaller !== undefined && id != null && id === incident.rootCauseId;
  /** The kind and link of an entity of the trail. */
  const target = (id: string | null | undefined): { kind: EntityKind; href: string | null } =>
    isRootId(id) && viaCaller !== undefined
      ? { kind: 'database', href: platformUrl(servicePath(viaCaller.id)) }
      : { kind: entityKindOf(id), href: entityLink(id, { frontendId: id == null ? null : frontendIds.get(id) ?? null }) };
  const nodes: FlowMapNode[] = [];
  const links: { from: string; to: string; value: number }[] = [];
  const duration = incident.durationNs === null ? '—' : formatNanos(incident.durationNs);
  nodes.push({
    id: 'problem',
    column: 'problem',
    name: `${incident.displayId} · ${incident.name}`,
    figure: duration,
    unit: t('p.rca.trail.durationUnit'),
    family: 'pink-purple',
    icon: <AiIcon size={22} />,
    label: t('p.rca.trail.problemAria', { id: incident.displayId, name: incident.name, duration }),
    ...external(platformUrl(buildProblemLink(incident.eventId, incident.displayId))),
  });

  const hasRoot = incident.rootCauseName !== null;
  if (hasRoot) {
    const { kind, href } = target(incident.rootCauseId);
    nodes.push({
      id: 'root',
      column: 'root',
      name: incident.rootCauseName ?? '—',
      figure: t(KIND_KEY[kind]),
      unit: t('p.rca.trail.rootUnit'),
      family: 'orange',
      icon: kindIcon(kind),
      emphasis: true,
      label:
        viaCaller === undefined
          ? t('p.rca.trail.rootAria', { name: incident.rootCauseName ?? '—', kind: t(KIND_KEY[kind]) })
          : t('p.rca.trail.rootViaAria', { name: incident.rootCauseName ?? '—', caller: viaCaller.name }),
      ...external(href),
    });
    links.push({ from: 'problem', to: 'root', value: 2 });
  }

  const aligned = incident.affectedIds.length === incident.affectedNames.length;
  incident.affectedNames.slice(0, TRAIL_AFFECTED_SHOWN).forEach((name, index) => {
    const { kind, href } = target(aligned ? incident.affectedIds[index] : null);
    const id = `affected-${index}`;
    nodes.push({
      id,
      column: 'affected',
      name,
      figure: t(KIND_KEY[kind]),
      unit: t('p.rca.trail.affectedUnit'),
      family: 'turquoise',
      icon: kindIcon(kind),
      label: t('p.rca.trail.affectedAria', { name, kind: t(KIND_KEY[kind]) }),
      ...external(href),
    });
    links.push({ from: hasRoot ? 'root' : 'problem', to: id, value: 1 });
  });
  const more = incident.affectedNames.length - TRAIL_AFFECTED_SHOWN;
  if (more > 0) {
    nodes.push({
      id: 'affected-more',
      column: 'affected',
      name: t('p.rca.trail.moreName'),
      figure: `+${formatNumber(more)}`,
      unit: t('p.rca.trail.affectedUnit'),
      family: 'grey',
      icon: <SmartscapeIcon size={22} />,
      label: t('p.rca.trail.more', { count: formatNumber(more) }),
    });
    links.push({ from: hasRoot ? 'root' : 'problem', to: 'affected-more', value: 1 });
  }
  return { nodes, links };
}

/**
 * The root-cause trail of AIOps & RCA (3.2.3, wave V4), in the stack map's grammar. `callers`, when
 * given, are the root's callers already read by the parent (the deck's capture waits for them before
 * the photograph); without it the trail reads them itself.
 */
export const RcaTrail = ({ incident, callers: givenCallers }: { incident: RcaIncident; callers?: RootCallers }) => {
  const { t, formatNumber } = useTranslation();
  const ownCallers = useRootCallers(givenCallers === undefined ? incident : null);
  const callers = givenCallers ?? ownCallers;
  const frontendIds = useFrontendIds();
  const { nodes, links } = buildTrail(incident, t, formatNumber, { callers, frontendIds });
  const database = isDatabaseRoot(callers);
  const callerChips: IconChip[] = database
    ? callers.callers.map((caller) => ({
        key: caller.id,
        name: caller.name,
        display: caller.failures === null ? t('p.dx3.flow.service') : t('p.rca.trail.callerFailures', { count: formatNumber(caller.failures) }),
        icon: <ServicesIcon size={18} />,
        ...(platformUrl(servicePath(caller.id)) === null ? {} : { href: platformUrl(servicePath(caller.id)) as string }),
      }))
    : [];
  const k8s: IconChip[] = [
    ...incident.clusters.map((name) => ({ key: `c-${name}`, name, display: t('p.rca.trail.cluster'), icon: <BrandGlyph name="kubernetes" size={18} /> })),
    ...incident.namespaces.map((name) => ({ key: `n-${name}`, name, display: t('p.rca.trail.namespace'), icon: <BrandGlyph name="k8sNamespace" size={18} /> })),
    ...incident.workloads.slice(0, 4).map((name) => ({ key: `w-${name}`, name, display: t('p.rca.trail.workload'), icon: <BrandGlyph name="k8sWorkload" size={18} /> })),
  ];
  return (
    <Stack gap="group">
      <FlowMap
        columns={[
          { id: 'problem', label: t('p.rca.trail.col.problem') },
          { id: 'root', label: t('p.rca.trail.rootCause') },
          { id: 'affected', label: t('p.rca.trail.affected') },
        ]}
        nodes={nodes}
        links={links}
        width={1145}
        ariaLabel={t('p.rca.trail.aria')}
        legend={[
          t('p.rca.trail.legend.links'),
          t('p.rca.trail.legend.root'),
          ...(database ? [t('p.rca.trail.legend.database', { caller: callers.callers[0]?.name ?? '—' })] : []),
          ...(nodes.some((node) => node.externalHref !== undefined) ? [t('flow.legend.open')] : []),
        ]}
      />
      {callerChips.length > 0 && (
        <Stack gap="tight">
          <Text className="pvs-label">{t('p.rca.trail.callers', { name: incident.rootCauseName ?? '—' })}</Text>
          <IconChips items={callerChips} label={t('p.rca.trail.callers', { name: incident.rootCauseName ?? '—' })} family="orange" />
        </Stack>
      )}
      {k8s.length > 0 && (
        <Stack gap="tight">
          <Text className="pvs-label">{t('p.rca.trail.k8s')}</Text>
          <IconChips items={k8s} label={t('p.rca.trail.k8s')} family="blue" />
        </Stack>
      )}
    </Stack>
  );
};
