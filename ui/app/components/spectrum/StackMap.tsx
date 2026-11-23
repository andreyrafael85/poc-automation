import React, { useId } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ApplicationsIcon,
  HostsIcon,
  MobileIcon,
  ProcessIcon,
  ServicesIcon,
  StopwatchIcon,
} from '@dynatrace/strato-icons';

import { useAccess } from '../../config/AccessContext';
import { isRouteBlocked } from '../../config/navigation';
import { PROVIDER_META } from '../../models/cloud';
import {
  layoutStack,
  STACK_GEOMETRY,
  type PlacedNode,
  type StackColumn,
  type StackNodeId,
  type StackNodeInput,
} from '../../models/stackMap';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { BrandGlyph } from './BrandGlyph';
import { svgId, type SpectrumFamily } from './family';

const FAMILY: Record<StackNodeId, SpectrumFamily> = {
  web: 'blue-turquoise',
  mobile: 'blue',
  synthetic: 'orange',
  services: 'turquoise',
  workloads: 'blue',
  processes: 'moss',
  hosts: 'purple',
  clusters: 'blue',
  'cloud-AWS': 'orange',
  'cloud-Azure': 'blue',
  'cloud-GCP': 'blue',
  'cloud-Other': 'grey',
  unattributed: 'grey',
};

export const NAME: Record<StackNodeId, StringKey> = {
  web: 'exec.label.webApps',
  mobile: 'exec.label.mobileApps',
  synthetic: 'metric.synthetics',
  services: 'metric.services',
  workloads: 'metric.workloads',
  processes: 'metric.processes',
  hosts: 'metric.hosts',
  clusters: 'metric.clusters',
  'cloud-AWS': 'stack.node.aws',
  'cloud-Azure': 'stack.node.azure',
  'cloud-GCP': 'stack.node.gcp',
  'cloud-Other': 'stack.node.otherCloud',
  unattributed: 'stack.node.unattributed',
};

export const UNIT: Record<StackNodeId, StringKey> = {
  web: 'stack.unit.apps',
  mobile: 'stack.unit.apps',
  synthetic: 'stack.unit.monitors',
  services: 'stack.unit.services',
  workloads: 'stack.unit.workloads',
  processes: 'stack.unit.instances',
  hosts: 'stack.unit.hosts',
  clusters: 'stack.unit.clusters',
  'cloud-AWS': 'stack.unit.hosts',
  'cloud-Azure': 'stack.unit.hosts',
  'cloud-GCP': 'stack.unit.hosts',
  'cloud-Other': 'stack.unit.hosts',
  unattributed: 'stack.unit.hosts',
};

export const COLUMN: Record<StackColumn, StringKey> = {
  experience: 'stack.col.experience',
  services: 'stack.col.services',
  processes: 'stack.col.processes',
  infrastructure: 'stack.col.infrastructure',
  cloud: 'stack.col.cloud',
};

const ICON_SIZE = 20;

/** The node's icon at (`x`, `y`), its top-left corner; shared with the Overview's environment flow (3.5.3). */
export function NodeIcon({ id, x = 12, y = 12, size = ICON_SIZE }: { id: StackNodeId; x?: number; y?: number; size?: number }) {
  const at = { x, y };
  const ICON_SIZE_AT = size;
  switch (id) {
    case 'web':
      return <ApplicationsIcon size={ICON_SIZE_AT} {...at} />;
    case 'mobile':
      return <MobileIcon size={ICON_SIZE_AT} {...at} />;
    case 'synthetic':
      return <StopwatchIcon size={ICON_SIZE_AT} {...at} />;
    case 'services':
      return <ServicesIcon size={ICON_SIZE_AT} {...at} />;
    case 'processes':
      return <ProcessIcon size={ICON_SIZE_AT} {...at} />;
    case 'hosts':
    case 'unattributed':
    case 'cloud-Other':
      return <HostsIcon size={ICON_SIZE_AT} {...at} />;
    case 'workloads':
    case 'clusters':
      return (
        <g transform={`translate(${at.x} ${at.y})`}>
          <BrandGlyph name={id === 'workloads' ? 'k8sWorkload' : 'kubernetes'} size={ICON_SIZE_AT} />
        </g>
      );
    case 'cloud-AWS':
    case 'cloud-Azure':
    case 'cloud-GCP':
      return (
        <g transform={`translate(${at.x} ${at.y})`}>
          <BrandGlyph name={id === 'cloud-AWS' ? 'aws' : id === 'cloud-Azure' ? 'azure' : 'googleCloud'} size={ICON_SIZE_AT} />
        </g>
      );
  }
}

export interface StackMapProps {
  nodes: readonly StackNodeInput[];
}

/**
 * The estate as one picture: applications → services → processes → hosts → clouds.
 *
 * Counts are read from the tenant; the links are the stack's hierarchy and their width the
 * size of the level they leave (see `models/stackMap.ts`, and the legend says so on screen).
 * Each node opens the page the count comes from, unless the viewer's mode does not show it.
 */
export const StackMap = ({ nodes }: StackMapProps) => {
  const { t, formatNumber } = useTranslation();
  const navigate = useNavigate();
  const access = useAccess();
  const reactId = useId();
  const layout = layoutStack(nodes);
  if (layout === null) return null;

  const restricted = access.level === 'customer' && access.restrictedView;
  const canOpen = (route: string) => !isRouteBlocked(route, { commercialVisible: access.commercialVisible, restricted });
  const g = STACK_GEOMETRY;

  const nodeLabel = (node: PlacedNode) => {
    const count = node.count === null ? t('stack.notRead') : `${formatNumber(node.count)} ${t(UNIT[node.id])}`;
    return `${t(NAME[node.id])}: ${count}`;
  };

  const stop = (node: PlacedNode, offset: '0' | '1') =>
    node.provider === undefined ? (
      <stop offset={offset} data-spectrum={FAMILY[node.id]} className="pvs-sp-stop-to" />
    ) : (
      <stop
        offset={offset}
        className="pvs-stackmap__stop-brand"
        style={{ '--pvs-brand': PROVIDER_META[node.provider].color } as React.CSSProperties}
      />
    );

  return (
    <div className="pvs-stack" style={{ '--pvs-gap': 'var(--pvs-gap-tight)' } as React.CSSProperties}>
      <div className="pvs-stackmap" data-variant="compact">
        <svg
          className="pvs-stackmap__svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ maxWidth: `${layout.width}px` }}
          role="group"
          aria-label={t('stack.aria')}
        >
          <defs>
            {layout.links.map((link, index) => (
              // User space, not the bounding box: a link between two nodes at the same height is a
              // straight line with an empty box, on which a bounding-box gradient does not paint.
              <linearGradient
                key={index}
                id={svgId(reactId, `link${index}`)}
                gradientUnits="userSpaceOnUse"
                x1={link.from.x + g.nodeWidth}
                y1={0}
                x2={link.to.x}
                y2={0}
              >
                {stop(link.from, '0')}
                {stop(link.to, '1')}
              </linearGradient>
            ))}
          </defs>

          {layout.columns.map((column) => (
            <text key={column.id} x={column.x} y={14} className="pvs-stackmap__column">
              {t(COLUMN[column.id]).toUpperCase()}
            </text>
          ))}

          <g aria-hidden="true">
            {layout.links.map((link, index) => (
              <React.Fragment key={index}>
                <path
                  d={link.d}
                  className="pvs-stackmap__link"
                  stroke={`url(#${svgId(reactId, `link${index}`)})`}
                  strokeWidth={link.width.toFixed(1)}
                />
                <path d={link.d} className="pvs-stackmap__flow" style={{ animationDelay: `${(index % 4) * 0.2}s` }} />
              </React.Fragment>
            ))}
          </g>

          {layout.nodes.map((node) => {
            const open = canOpen(node.route);
            const label = nodeLabel(node);
            const go = () => {
              void navigate(node.route);
            };
            return (
              <g
                key={node.id}
                className="pvs-stackmap__node"
                transform={`translate(${node.x} ${node.y.toFixed(1)})`}
                data-spectrum={FAMILY[node.id]}
                data-column={node.column}
                data-brand={node.provider === undefined ? undefined : 'true'}
                data-missing={node.count === null ? 'true' : undefined}
                data-href={open ? node.route : undefined}
                style={node.provider === undefined ? undefined : ({ '--pvs-brand': PROVIDER_META[node.provider].color } as React.CSSProperties)}
                role={open ? 'link' : 'img'}
                tabIndex={open ? 0 : undefined}
                aria-label={open ? t('stack.open', { node: label }) : label}
                onClick={open ? go : undefined}
                onKeyDown={
                  open
                    ? (event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          go();
                        }
                      }
                    : undefined
                }
              >
                <rect width={g.nodeWidth} height={g.nodeHeight} rx={g.nodeHeight / 2} className="pvs-stackmap__box" />
                <rect x={0} y={8} width={4} height={g.nodeHeight - 16} rx={2} className="pvs-stackmap__bar" />
                <g className="pvs-stackmap__icon" aria-hidden="true">
                  <NodeIcon id={node.id} />
                </g>
                {/* 3.3.8: one line — the name, and the count at the right edge of the pill. */}
                <text x={37} y={g.nodeHeight / 2 + 4.5} className="pvs-stackmap__name" aria-hidden="true">
                  {t(NAME[node.id])}
                </text>
                <text x={g.nodeWidth - 14} y={g.nodeHeight / 2 + 6} textAnchor="end" className="pvs-stackmap__count" aria-hidden="true">
                  {node.count === null ? '—' : formatNumber(node.count)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="pvs-stackmap__legend">
        <span>{t('stack.legend.width')}</span>
        <span>{t('stack.legend.links')}</span>
        <span>{t('stack.legend.open')}</span>
      </div>
    </div>
  );
};
