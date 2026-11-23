import React, { useId } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccess } from '../../config/AccessContext';
import { isRouteBlocked } from '../../config/navigation';
import { useTranslation } from '../../i18n/useTranslation';
import { FLOW_GEOMETRY, fitName, fitUnit, layoutFlow, type FlowColumnInput, type FlowLinkInput, type FlowNodeInput } from '../../models/flowMap';
import { svgId, type SpectrumFamily } from './family';

export interface FlowMapNode extends FlowNodeInput {
  /** The node's name, verbatim (an entity or type name is never translated). */
  name: string;
  /** The figure on the node: a formatted count, or a short word. */
  figure: string;
  /** Printed after the figure, smaller ("services", "root cause"), when it fits beside it in the node. */
  unit?: string;
  /** A shorter unit printed when `unit` does not fit ("0,30% falhas" for "req. · 0,30% falhas"); with neither fitting, none. */
  unitShort?: string;
  family: SpectrumFamily;
  /** A 22 px icon (a Strato functional icon or a `BrandGlyph`). Decorative. */
  icon: React.ReactNode;
  /** A provider or vendor colour that replaces the family's paint (identity, not a verdict). */
  brandColor?: string;
  /** Spoken description of the node (already translated): name, figure and what it is. */
  label: string;
  /** Route the node opens, if the viewer's mode shows it. */
  href?: string;
  /**
   * A page of the Dynatrace platform the node opens in a new tab (3.2.6): the problem in the
   * Problems app, an entity through the platform's intents. The target app applies the viewer's
   * own permissions, so the link carries no data of this app's.
   */
  externalHref?: string;
  /** Draws the node raised, for the one node the picture is about (the root cause). */
  emphasis?: boolean;
  /** A node whose figure was not read: dashed, with a dash. */
  missing?: boolean;
}

export interface FlowMapProps {
  columns: readonly FlowColumnInput[];
  nodes: readonly FlowMapNode[];
  links: readonly FlowLinkInput[];
  /** Name of the whole picture (already translated). */
  ariaLabel: string;
  /** Lines under the map saying what a link and a width mean (already translated). */
  legend: readonly string[];
  /** Natural width of the drawing; it scales down to the panel and scrolls below its minimum. */
  width?: number;
}

/**
 * Columns of nodes joined by links, drawn like the stack map (3.2.3, wave V4). Used for the
 * Smartscape calls on Topology and for the root-cause trail on AIOps & RCA, so the three
 * pictures of the app speak one grammar: a node is an icon, a name and a figure; a link is a
 * relationship whose width grows with its size; the legend under the map says which.
 */
export const FlowMap = ({ columns, nodes, links, ariaLabel, legend, width = 1145 }: FlowMapProps) => {
  const access = useAccess();
  const reactId = useId();
  const layout = layoutFlow(columns, nodes, links, width);
  if (layout === null) return null;

  const restricted = access.level === 'customer' && access.restrictedView;
  const canOpen = (route: string | undefined) =>
    route !== undefined && !isRouteBlocked(route, { commercialVisible: access.commercialVisible, restricted });
  const byId = new Map(layout.nodes.map((entry) => [entry.node.id, entry.node]));

  const stop = (node: FlowMapNode | undefined, offset: '0' | '1') =>
    node?.brandColor === undefined ? (
      <stop offset={offset} data-spectrum={node?.family ?? 'grey'} className="pvs-sp-stop-to" />
    ) : (
      <stop offset={offset} className="pvs-stackmap__stop-brand" style={{ '--pvs-brand': node.brandColor } as React.CSSProperties} />
    );

  return (
    <div className="pvs-stack" style={{ '--pvs-gap': 'var(--pvs-gap-tight)' } as React.CSSProperties}>
      <div className="pvs-stackmap pvs-flowmap" data-variant="compact">
        <svg
          className="pvs-stackmap__svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ minWidth: Math.min(720, layout.width), maxWidth: layout.width }}
          role="group"
          aria-label={ariaLabel}
        >
          <defs>
            {layout.links.map((link) => (
              <linearGradient
                key={link.index}
                id={svgId(reactId, `flow${link.index}`)}
                gradientUnits="userSpaceOnUse"
                x1={link.x1}
                y1={0}
                x2={link.x2}
                y2={0}
              >
                {stop(byId.get(link.fromId), '0')}
                {stop(byId.get(link.toId), '1')}
              </linearGradient>
            ))}
          </defs>

          {layout.columns.map((column) => (
            <text key={column.id} x={column.x} y={14} className="pvs-stackmap__column">
              {column.label.toUpperCase()}
            </text>
          ))}

          <g aria-hidden="true">
            {layout.links.map((link) => (
              <React.Fragment key={link.index}>
                <path
                  d={link.d}
                  className="pvs-stackmap__link"
                  stroke={`url(#${svgId(reactId, `flow${link.index}`)})`}
                  strokeWidth={link.width.toFixed(1)}
                />
                <path d={link.d} className="pvs-stackmap__flow" style={{ animationDelay: `${(link.index % 4) * 0.2}s` }} />
              </React.Fragment>
            ))}
          </g>

          {layout.nodes.map(({ node, x, y }) =>
            node.externalHref !== undefined ? (
              <ExternalNode key={node.id} node={node} x={x} y={y} />
            ) : canOpen(node.href) ? (
              <LinkedNode key={node.id} node={node} x={x} y={y} />
            ) : (
              <NodeShape key={node.id} node={node} x={x} y={y} />
            ),
          )}
        </svg>
      </div>
      <div className="pvs-stackmap__legend">
        {legend.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
};

interface NodeProps {
  node: FlowMapNode;
  x: number;
  y: number;
  /** Set by `LinkedNode`: the node is a link to `node.href`. */
  onOpen?: () => void;
}

/**
 * One node, drawn as on the stack map. A node without a link is an image with its name; a node
 * with one is rendered by `LinkedNode`, the only part that needs the router — so a map whose nodes
 * link nowhere (the RCA trail) draws outside a router too.
 */
const NodeShape = ({ node, x, y, onOpen }: NodeProps) => {
  const { t } = useTranslation();
  const g = FLOW_GEOMETRY;
  const open = onOpen !== undefined;
  const figure = node.missing === true ? '—' : node.figure;
  // The unit only when it fits beside the figure (3.2.7 review UX-M4); the title keeps the whole text.
  const unit = fitUnit(figure, [node.unit, node.unitShort]);
  const whole = node.unit === undefined ? figure : `${figure} ${node.unit}`;
  return (
    <g
      className="pvs-stackmap__node"
      transform={`translate(${x} ${y.toFixed(1)})`}
      data-spectrum={node.family}
      data-brand={node.brandColor === undefined ? undefined : 'true'}
      data-missing={node.missing === true ? 'true' : undefined}
      data-emphasis={node.emphasis === true ? 'true' : undefined}
      data-href={open ? node.href : undefined}
      style={node.brandColor === undefined ? undefined : ({ '--pvs-brand': node.brandColor } as React.CSSProperties)}
      role={open ? 'link' : 'img'}
      tabIndex={open ? 0 : undefined}
      aria-label={open ? t('stack.open', { node: node.label }) : node.label}
      onClick={onOpen}
      onKeyDown={
        open
          ? (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      <title>{unit === node.unit ? node.name : `${node.name} · ${whole}`}</title>
      <rect width={g.nodeWidth} height={g.nodeHeight} rx={12} className="pvs-stackmap__box" />
      <rect x={0} y={8} width={4} height={g.nodeHeight - 16} rx={2} className="pvs-stackmap__bar" />
      <g className="pvs-stackmap__icon" transform="translate(14 13)" aria-hidden="true">
        {node.icon}
      </g>
      <text x={46} y={20} className="pvs-stackmap__name" aria-hidden="true">
        {fitName(node.name)}
      </text>
      <text x={46} y={39} className="pvs-stackmap__count" aria-hidden="true">
        {figure}
        {unit !== undefined && <tspan className="pvs-stackmap__unit"> {unit}</tspan>}
      </text>
    </g>
  );
};

const LinkedNode = ({ node, x, y }: NodeProps) => {
  const navigate = useNavigate();
  const open = () => {
    if (node.href !== undefined) void navigate(node.href);
  };
  return <NodeShape node={node} x={x} y={y} onOpen={open} />;
};

/** A node that opens a page of the platform: an SVG link, in a new tab, keyboard-reachable. */
const ExternalNode = ({ node, x, y }: NodeProps) => {
  const { t } = useTranslation();
  return (
    <a
      href={node.externalHref}
      target="_blank"
      rel="noopener noreferrer"
      className="pvs-stackmap__ext"
      aria-label={t('flow.openInDynatrace', { node: node.label })}
    >
      <g aria-hidden="true">
        <NodeShape node={{ ...node, label: node.label }} x={x} y={y} />
      </g>
    </a>
  );
};
