import React, { useId } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccess } from '../../config/AccessContext';
import { isRouteBlocked } from '../../config/navigation';
import { CHART_PALETTE } from '../../design/palette';
import { useStratoMode } from '../../engine/strato';
import { useTranslation } from '../../i18n/useTranslation';
import { PROVIDER_META } from '../../models/cloud';
import { FLOW_GEOMETRY, layoutFlow, type FlowNode } from '../../models/environmentFlow';
import type { StackNodeId, StackNodeInput } from '../../models/stackMap';
import { svgId } from './family';
import { COLUMN, NAME, NodeIcon, UNIT } from './StackMap';

export interface EnvironmentFlowProps {
  nodes: readonly StackNodeInput[];
  /**
   * Layers with something measured to review now, each with its reason in words (for example "3 services above the
   * 1 % failure line"). A hot layer pulses; the reason is written beside it and read by assistive technology.
   */
  hot?: Partial<Record<StackNodeId, string>>;
}

/** Two particles per link, out of phase; only on screen, never in a capture or a print. */
const PARTICLES_PER_LINK = 2;
const PARTICLE_SECONDS = 3.6;

/**
 * 3.5.3 — the Overview's "From the user to the cloud, now": the estate as a flow of layers (visual proposal v4).
 *
 * Every count is the stack map's (`useStackNodes`: `cov.inventory`, `cloud.hosts`); the curves are the stack's
 * hierarchy and their thickness the size of the level they leave. Each disc wears its column's Categorical Vivid hue
 * (a cloud its provider's colour), carries the layer's icon and opens the page its count comes from. The motion —
 * particles along the curves and the pulse of a hot layer — is decoration: it stops under `prefers-reduced-motion`,
 * in print and in the capture stage, and every number and reason is written as text.
 */
export const EnvironmentFlow = ({ nodes, hot = {} }: EnvironmentFlowProps) => {
  const { t, formatNumber } = useTranslation();
  const navigate = useNavigate();
  const access = useAccess();
  const mode = useStratoMode();
  const reactId = useId();
  const layout = layoutFlow(nodes);
  if (layout === null) return null;

  const restricted = access.level === 'customer' && access.restrictedView;
  const canOpen = (route: string) => !isRouteBlocked(route, { commercialVisible: access.commercialVisible, restricted });
  const g = FLOW_GEOMETRY;
  const hueOf = (node: FlowNode): string =>
    node.provider !== undefined && node.provider !== 'Other'
      ? PROVIDER_META[node.provider].color
      : node.id === 'unattributed' || node.provider === 'Other'
        ? 'var(--pvs-eflow-neutral)'
        : (CHART_PALETTE.category[node.columnIndex % CHART_PALETTE.category.length] ?? 'var(--pvs-eflow-neutral)');

  const countText = (node: FlowNode) => (node.count === null ? '—' : formatNumber(node.count));
  const nodeLabel = (node: FlowNode) => {
    const count = node.count === null ? t('stack.notRead') : `${formatNumber(node.count)} ${t(UNIT[node.id])}`;
    const reason = hot[node.id];
    return `${t(NAME[node.id])}: ${count}${reason === undefined ? '' : ` — ${reason}`}`;
  };
  const moving = mode === 'screen';

  return (
    <div className="pvs-eflow" data-pvs-chart="environment-flow" data-pvs-state="ready">
      {/* On a phone the drawing keeps a readable size and scrolls sideways, like the stack map before it. */}
      <div className="pvs-eflow__scroll">
      <svg
        className="pvs-eflow__svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="group"
        aria-label={t('flow.aria')}
      >
        <defs>
          {layout.links.map((link, index) => (
            <linearGradient
              key={index}
              id={svgId(reactId, `flow${index}`)}
              gradientUnits="userSpaceOnUse"
              x1={link.from.cx}
              y1={0}
              x2={link.to.cx}
              y2={0}
            >
              <stop offset="0" stopColor={hueOf(link.from)} />
              <stop offset="1" stopColor={hueOf(link.to)} />
            </linearGradient>
          ))}
        </defs>

        {layout.columns.map((column) => (
          <text key={column.id} x={column.x} y={16} textAnchor="middle" className="pvs-eflow__column" aria-hidden="true">
            {t(COLUMN[column.id]).toUpperCase()}
          </text>
        ))}

        <g aria-hidden="true">
          {layout.links.map((link, index) => (
            <path
              key={index}
              d={link.d}
              className="pvs-eflow__link"
              stroke={`url(#${svgId(reactId, `flow${index}`)})`}
              strokeWidth={link.width.toFixed(1)}
            />
          ))}
          {moving &&
            layout.links.flatMap((link, index) =>
              Array.from({ length: PARTICLES_PER_LINK }, (_, k) => (
                <circle key={`${index}-${k}`} r={2.4} className="pvs-eflow__particle" fill={hueOf(link.from)}>
                  <animateMotion
                    dur={`${PARTICLE_SECONDS}s`}
                    begin={`-${(((index * 0.37 + k / PARTICLES_PER_LINK) % 1) * PARTICLE_SECONDS).toFixed(2)}s`}
                    repeatCount="indefinite"
                    path={link.d}
                  />
                </circle>
              )),
            )}
        </g>

        {layout.nodes.map((node) => {
          const open = canOpen(node.route);
          const label = nodeLabel(node);
          const reason = hot[node.id];
          const go = () => {
            void navigate(node.route);
          };
          const tx = node.cx + g.radius + 10;
          return (
            <g
              key={node.id}
              className="pvs-eflow__node"
              data-node={node.id}
              data-hot={reason === undefined ? undefined : 'true'}
              data-missing={node.count === null ? 'true' : undefined}
              data-href={open ? node.route : undefined}
              style={{ '--pvs-eflow-hue': hueOf(node) } as React.CSSProperties}
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
              {reason !== undefined && <circle cx={node.cx} cy={node.cy} r={g.radius + 4} className="pvs-eflow__pulse" />}
              <circle cx={node.cx} cy={node.cy} r={g.radius} className="pvs-eflow__disc" />
              <g className="pvs-eflow__icon" aria-hidden="true">
                <NodeIcon id={node.id} x={node.cx - 10} y={node.cy - 10} size={20} />
              </g>
              <text x={tx} y={node.cy - 1} className="pvs-eflow__count" aria-hidden="true">
                {countText(node)}
              </text>
              <text x={tx} y={node.cy + 16} className="pvs-eflow__name" aria-hidden="true">
                {t(NAME[node.id])}
              </text>
              {reason !== undefined && (
                <text x={tx} y={node.cy + 32} className="pvs-eflow__reason" aria-hidden="true">
                  <tspan className="pvs-eflow__reason-dot">● </tspan>
                  {reason}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
      <div className="pvs-eflow__legend">
        <span>{t('flow.legend.links')}</span>
        {Object.keys(hot).length > 0 && <span>{t('flow.legend.hot')}</span>}
        <span>{t('stack.legend.open')}</span>
      </div>
    </div>
  );
};
