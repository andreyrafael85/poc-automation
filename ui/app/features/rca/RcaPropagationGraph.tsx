import React, { useMemo } from 'react';

import { Heading, Text } from '@dynatrace/strato-components/typography';

import { useQueryScope } from '../../config/StudioContext';
import { Panel, Stack } from '../../engine';
import { useCatalogQuery } from '../../hooks/useCatalogQuery';
import { useRootCallers } from '../../hooks/useTrailLinks';
import type { StringKey } from '../../i18n/strings';
import { useTranslation } from '../../i18n/useTranslation';
import { incidentLogWindow, type RcaIncident } from '../../models/rca';
import { GRAPH_SHOWN, propagationGraph, type GraphColumn, type GraphNode, type PropagationGraph } from '../../models/rcaGraph';
import { isDatabaseRoot } from '../../models/trailLinks';
import { RCA_EDGE_MAX_IDS } from '../../queries/catalogTemplates';
import { entityType } from '../../utils/deepLinks';
import { str } from '../../utils/records';
import { entityKindOf, KIND_KEY } from './RcaTrail';

/**
 * 3.6.1 — the propagation v4 on AIOps & RCA (the v5 proposal, approved 2026-11-21): the incident as a graph from the
 * root cause to where users met it, hop by hop along the calls the entity model recorded, with the time of the first
 * event on each entity and a ruler of the problem's start, events and end. Light runs along the links on screen only
 * (never under reduced motion). The 3.5.4 layers stay below it ("by layers").
 */

const COLUMN_KEY: Record<GraphColumn['id'], StringKey> = {
  cause: 'rca.v4.col.cause',
  hop1: 'rca.v4.col.hop1',
  hop2: 'rca.v4.col.hop2',
  hop3: 'rca.v4.col.hop3',
  also: 'rca.v4.col.also',
  users: 'rca.v4.col.users',
};

const NODE_W = 196;
const NODE_H = 50;
const ROW = 62;
const HEAD = 30;
const WIDTH = 1120;

/** Where each node of the graph sits, in the SVG's units. */
export function graphLayout(graph: PropagationGraph): { height: number; at: Map<string, { x: number; y: number }>; columnX: number[] } {
  const n = graph.columns.length;
  const span = WIDTH - 2 * 12 - NODE_W;
  const columnX = graph.columns.map((_, index) => 12 + (n <= 1 ? 0 : (span * index) / (n - 1)));
  const tallest = Math.max(1, ...graph.columns.map((column) => column.nodes.length + (column.more > 0 ? 1 : 0)));
  const height = HEAD + tallest * ROW + 8;
  const at = new Map<string, { x: number; y: number }>();
  graph.columns.forEach((column, index) => {
    const used = column.nodes.length * ROW;
    const top = HEAD + (tallest * ROW - used) / 2;
    column.nodes.forEach((node, row) => at.set(node.key, { x: columnX[index] ?? 0, y: top + row * ROW }));
  });
  return { height, at, columnX };
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const RcaPropagationGraph = ({ incident }: { incident: RcaIncident }) => {
  const { t, formatNumber, formatTime } = useTranslation();
  const { refreshToken } = useQueryScope();
  const callers = useRootCallers(incident);
  const window = useMemo(() => incidentLogWindow(incident), [incident]);

  const serviceIds = useMemo(() => {
    const ids = [incident.rootCauseId, ...incident.affectedIds, ...callers.callers.map((caller) => caller.id)].filter(
      (id): id is string => id !== null && entityType(id) === 'SERVICE',
    );
    return [...new Set(ids)].slice(0, RCA_EDGE_MAX_IDS);
  }, [incident, callers]);
  const edgesQuery = useCatalogQuery('rca.edges', {
    refreshToken,
    enabled: serviceIds.length > 0,
    params: useMemo(() => (serviceIds.length === 0 ? null : { serviceIds }), [serviceIds]),
    window,
  });
  const eventsQuery = useCatalogQuery('ev.problem.events', {
    refreshToken,
    enabled: incident.eventId !== null,
    params: useMemo(() => (incident.eventId === null ? null : { eventId: incident.eventId }), [incident.eventId]),
    window,
  });

  const graph = useMemo(() => {
    const aligned = incident.affectedIds.length === incident.affectedNames.length;
    const database = isDatabaseRoot(callers);
    return propagationGraph({
      root: incident.rootCauseName === null ? null : { id: incident.rootCauseId, name: incident.rootCauseName, kind: database ? 'database' : entityKindOf(incident.rootCauseId) },
      affected: incident.affectedNames.map((name, index) => {
        const id = aligned ? (incident.affectedIds[index] ?? null) : null;
        return { id, name, kind: entityKindOf(id) };
      }),
      callers: callers.callers.map((caller) => ({ id: caller.id, name: caller.name, failures: caller.failures })),
      edges: edgesQuery.outcome === 'ok' ? edgesQuery.records.flatMap((record) => {
        const from = str(record, 'from');
        const to = str(record, 'to');
        return from === null || to === null ? [] : [{ from, to }];
      }) : [],
      events: eventsQuery.outcome === 'ok' ? eventsQuery.records.flatMap((record) => {
        const source = str(record, 'source');
        const startIso = str(record, 'event.start');
        return source === null || startIso === null ? [] : [{ source, startIso }];
      }) : [],
      startIso: incident.startIso,
      endIso: incident.endIso,
      open: incident.status === 'ACTIVE',
    });
  }, [incident, callers, edgesQuery.outcome, edgesQuery.records, eventsQuery.outcome, eventsQuery.records]);

  if (graph.columns.length < 2) return null;
  const { height, at } = graphLayout(graph);
  const path = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    // From the cause side (the callee, left) to the caller (right): the way the incident travelled.
    const x1 = to.x + NODE_W;
    const y1 = to.y + NODE_H / 2;
    const x2 = from.x;
    const y2 = from.y + NODE_H / 2;
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  };
  const timeOf = (node: GraphNode) => (node.firstEventIso === undefined ? null : formatTime(node.firstEventIso));
  const summary = graph.columns.map((column) => `${t(COLUMN_KEY[column.id])}: ${column.nodes.map((node) => node.name).join(', ')}${column.more > 0 ? ` +${column.more}` : ''}`).join('; ');

  return (
    <Panel pad="roomy">
      <Stack gap="group">
        <Heading level={4} as="h2">
          {t('rca.v4.title')}
        </Heading>
        <div className="pvs-rgraph__scroll">
          <svg className="pvs-rgraph" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={`${t('rca.v4.title')}. ${summary}`} data-pvs-chart="rca-graph">
            {graph.columns.map((column, index) => (
              <text key={column.id} className="pvs-rgraph__col" x={(graphLayout(graph).columnX[index] ?? 0) + 2} y={16}>
                {t(COLUMN_KEY[column.id]).toUpperCase()}
              </text>
            ))}
            {graph.links.map((link, index) => {
              const from = at.get(link.from);
              const to = at.get(link.to);
              if (from === undefined || to === undefined) return null;
              const d = path(from, to);
              return (
                <g key={`${link.from}-${link.to}`}>
                  <path className="pvs-rgraph__link" d={d} />
                  {/* Every light starts on its link at once (a delayed one waited at the corner of the drawing). */}
                  <circle className="pvs-rgraph__spark" r="3">
                    <animateMotion dur={`${(2.2 + (index % 5) * 0.35).toFixed(2)}s`} begin="0s" repeatCount="indefinite" path={d} />
                  </circle>
                </g>
              );
            })}
            {graph.columns.map((column) =>
              column.nodes.map((node) => {
                const spot = at.get(node.key);
                if (spot === undefined) return null;
                const time = timeOf(node);
                return (
                  <g key={node.key} className="pvs-rgraph__node" data-column={column.id} transform={`translate(${spot.x} ${spot.y})`}>
                    <rect width={NODE_W} height={NODE_H} rx="8" />
                    <text className="pvs-rgraph__name" x="12" y="21">
                      {truncate(node.name, time === null ? 24 : 18)}
                    </text>
                    <text className="pvs-rgraph__kind" x="12" y="38">
                      {node.failures === undefined ? t(KIND_KEY[node.kind]) : t('rca.v4.failures', { kind: t(KIND_KEY[node.kind]), count: formatNumber(node.failures) })}
                    </text>
                    {time !== null && (
                      <text className="pvs-rgraph__time" x={NODE_W - 10} y="21" textAnchor="end">
                        {time}
                      </text>
                    )}
                  </g>
                );
              }),
            )}
            {graph.columns.map((column, index) =>
              column.more > 0 ? (
                <text key={`${column.id}-more`} className="pvs-rgraph__more" x={(graphLayout(graph).columnX[index] ?? 0) + 12} y={(at.get(column.nodes[column.nodes.length - 1]?.key ?? '')?.y ?? HEAD) + ROW + 18}>
                  {t('rca.v4.more', { count: formatNumber(column.more) })}
                </text>
              ) : null,
            )}
          </svg>
        </div>
        <GraphRuler graph={graph} />
        <Text className="pvs-caption">{t('rca.v4.legend', { shown: GRAPH_SHOWN })}</Text>
      </Stack>
    </Panel>
  );
};

/** The problem's start, the first events drawn on the graph, and its end (or "still open"), on one line. */
const GraphRuler = ({ graph }: { graph: PropagationGraph }) => {
  const { t, formatTime } = useTranslation();
  const { startIso, endIso, open, events } = graph.ruler;
  if (startIso === null) return null;
  // The first signal may come before the problem opened (the events that made Dynatrace Intelligence open it).
  const firstSignal = events.length > 0 && Date.parse(events[0] as string) < Date.parse(startIso) ? (events[0] as string) : null;
  const start = Date.parse(firstSignal ?? startIso);
  const end = Math.max(Date.parse(startIso), ...events.map((event) => Date.parse(event)), endIso === null ? 0 : Date.parse(endIso));
  const span = Math.max(1, end - start);
  const pct = (iso: string) => `${Math.min(100, Math.max(0, ((Date.parse(iso) - start) / span) * 100)).toFixed(2)}%`;
  return (
    <div className="pvs-rgraph__ruler" aria-label={t('rca.v4.ruler')}>
      <div className="pvs-rgraph__track">
        {events.map((event) => (
          <span key={event} className="pvs-rgraph__tick" style={{ left: pct(event) }} title={formatTime(event)} />
        ))}
        <span className="pvs-rgraph__tick" data-mark="start" style={{ left: pct(startIso) }} title={formatTime(startIso)} />
      </div>
      <div className="pvs-rgraph__marks">
        {firstSignal !== null && <span>{t('rca.v4.firstSignal', { time: formatTime(firstSignal) })}</span>}
        <span>{t('rca.v4.start', { time: formatTime(startIso) })}</span>
        {events.length > 0 && <span>{t('rca.v4.events', { count: String(events.length) })}</span>}
        <span>{open || endIso === null ? t('rca.v4.open') : t('rca.v4.end', { time: formatTime(endIso) })}</span>
      </div>
    </div>
  );
};
