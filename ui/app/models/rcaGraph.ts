/**
 * 3.6.1 — the RCA propagation v4 (the v5 proposal, approved on 2026-11-21: "o grafo com a luz correndo da causa ao
 * impacto, a hora em cada entidade e uma régua com os marcos"), as data. Pure.
 *
 * Every node is something the platform attached to the problem or measured; every link is a call the entity model
 * recorded (`rca.edges`, or a caller of the root measured by `rca.callers`) — a hop is never guessed. An affected entity
 * no recorded call reaches is shown apart ("also affected"), without a link. The time on a node is the first
 * Dynatrace Intelligence event the problem grouped on that entity (`ev.problem.events`); an entity without one has no
 * time, never an estimate.
 */

export type GraphKind = 'service' | 'database' | 'application' | 'host' | 'process' | 'synthetic' | 'workload' | 'kubernetes' | 'entity';

export interface GraphEntity {
  id: string | null;
  name: string;
  kind: GraphKind;
}

export interface GraphNode extends GraphEntity {
  key: string;
  /** Failures measured on the node during the incident (a caller of the root), already formatted by the caller. */
  failures?: number;
  /** The first event the problem grouped on this entity (ISO), when there is one. */
  firstEventIso?: string;
}

export type GraphColumnId = 'cause' | 'hop1' | 'hop2' | 'hop3' | 'also' | 'users';

export interface GraphColumn {
  id: GraphColumnId;
  nodes: GraphNode[];
  /** Nodes of the column beyond those drawn. */
  more: number;
}

export interface GraphLink {
  from: string;
  to: string;
}

export interface GraphRuler {
  startIso: string | null;
  endIso: string | null;
  open: boolean;
  /** The distinct first-event times of the drawn nodes, in time order. */
  events: string[];
}

export interface PropagationGraph {
  columns: GraphColumn[];
  /** From a column's node to the node of the column before it that it calls (the direction the incident travelled is the reverse). */
  links: GraphLink[];
  ruler: GraphRuler;
}

export interface GraphInputs {
  root: GraphEntity | null;
  affected: readonly GraphEntity[];
  callers: readonly { id: string; name: string; failures: number | null }[];
  edges: readonly { from: string; to: string }[];
  events: readonly { source: string; startIso: string }[];
  startIso: string | null;
  endIso: string | null;
  open: boolean;
}

/** Nodes a column draws before folding the rest into "+N". */
export const GRAPH_SHOWN = 6;
const HOPS: readonly GraphColumnId[] = ['hop1', 'hop2', 'hop3'];
const USER_FACING: ReadonlySet<GraphKind> = new Set<GraphKind>(['application', 'synthetic']);

/** The propagation as columns of hops from the root cause, links only where a call was recorded. */
export function propagationGraph(inputs: GraphInputs): PropagationGraph {
  const firstEvent = new Map<string, string>();
  for (const event of inputs.events) {
    const known = firstEvent.get(event.source);
    if (known === undefined || Date.parse(event.startIso) < Date.parse(known)) firstEvent.set(event.source, event.startIso);
  }
  const withTime = <T extends GraphEntity>(entity: T): T & { firstEventIso?: string } => {
    const at = entity.id === null ? undefined : firstEvent.get(entity.id);
    return at === undefined ? entity : { ...entity, firstEventIso: at };
  };

  const root = inputs.root;
  const columns: GraphColumn[] = [];
  const links: GraphLink[] = [];
  if (root === null || root.id === null) {
    return { columns, links, ruler: ruler(inputs, []) };
  }

  // Who calls whom: the recorded calls, and the measured callers of the root.
  const calls = new Map<string, Set<string>>();
  const addCall = (from: string, to: string) => {
    if (from === to) return;
    const set = calls.get(from) ?? new Set<string>();
    set.add(to);
    calls.set(from, set);
  };
  for (const edge of inputs.edges) addCall(edge.from, edge.to);
  for (const caller of inputs.callers) addCall(caller.id, root.id);

  // The candidates: the affected entities with an id (not the root, not where users meet it), and the measured callers.
  const candidates = new Map<string, GraphNode>();
  for (const entity of inputs.affected) {
    if (entity.id === null || entity.id === root.id || USER_FACING.has(entity.kind)) continue;
    candidates.set(entity.id, { ...withTime(entity), key: entity.id });
  }
  for (const caller of inputs.callers) {
    const known = candidates.get(caller.id);
    const node: GraphNode = { ...withTime({ id: caller.id, name: caller.name, kind: 'service' }), ...(known ?? {}), key: caller.id };
    if (caller.failures !== null) node.failures = caller.failures;
    candidates.set(caller.id, node);
  }

  columns.push({ id: 'cause', nodes: [{ ...withTime(root), key: root.id }], more: 0 });
  const placed = new Set<string>([root.id]);
  let frontier = new Set<string>([root.id]);
  for (const hop of HOPS) {
    const reached = [...candidates.values()].filter((node) => node.id !== null && !placed.has(node.id) && [...(calls.get(node.id) ?? [])].some((to) => frontier.has(to)));
    if (reached.length === 0) break;
    // The most failing first, then those reached earliest.
    reached.sort((a, b) => (b.failures ?? -1) - (a.failures ?? -1) || (Date.parse(a.firstEventIso ?? '') || Infinity) - (Date.parse(b.firstEventIso ?? '') || Infinity));
    const shown = reached.slice(0, GRAPH_SHOWN);
    columns.push({ id: hop, nodes: shown, more: reached.length - shown.length });
    for (const node of shown) {
      for (const to of calls.get(node.id as string) ?? []) if (frontier.has(to)) links.push({ from: node.id as string, to });
    }
    for (const node of reached) placed.add(node.id as string);
    frontier = new Set(shown.map((node) => node.id as string));
  }

  const also = [...candidates.values()].filter((node) => node.id !== null && !placed.has(node.id));
  if (also.length > 0) columns.push({ id: 'also', nodes: also.slice(0, GRAPH_SHOWN), more: Math.max(0, also.length - GRAPH_SHOWN) });

  const users = inputs.affected.filter((entity) => USER_FACING.has(entity.kind)).map((entity, index) => ({ ...withTime(entity), key: entity.id ?? `user-${index}` }));
  if (users.length > 0) columns.push({ id: 'users', nodes: users.slice(0, GRAPH_SHOWN), more: Math.max(0, users.length - GRAPH_SHOWN) });

  return { columns, links, ruler: ruler(inputs, columns) };
}

function ruler(inputs: GraphInputs, columns: readonly GraphColumn[]): GraphRuler {
  const times = new Set<string>();
  for (const column of columns) for (const node of column.nodes) if (node.firstEventIso !== undefined) times.add(node.firstEventIso);
  return {
    startIso: inputs.startIso,
    endIso: inputs.open ? null : inputs.endIso,
    open: inputs.open,
    events: [...times].sort((a, b) => Date.parse(a) - Date.parse(b)),
  };
}
