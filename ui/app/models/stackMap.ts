import type { CloudProvider } from './cloud';

/**
 * The stack map: from the people who use the applications down to the clouds they run on
 * (3.2 "Value Spectrum", wave 2). It replaces the topology tables as the first picture of an
 * estate.
 *
 * What it is, said plainly because a diagram invites more belief than a table:
 *
 *   - every node is a COUNT of one entity type, read from the tenant (`cov.inventory`,
 *     `cloud.hosts`);
 *   - a link is the HIERARCHY of the stack (applications are served by services, services run
 *     in processes, processes on hosts…), never a measured call: the app cannot read Smartscape
 *     edges with user DQL (see `Topology.tsx`);
 *   - a link's width grows with the size of the level it leaves (log scale), not with traffic.
 *
 * Absence keeps its meaning: a type measured as zero is left out (an estate with no mobile app
 * has no mobile node), a type that could not be read stays on the map with a dash.
 */

export type StackColumn = 'experience' | 'services' | 'processes' | 'infrastructure' | 'cloud';

export const STACK_COLUMNS: readonly StackColumn[] = ['experience', 'services', 'processes', 'infrastructure', 'cloud'];

export type StackNodeId =
  | 'web'
  | 'mobile'
  | 'synthetic'
  | 'services'
  | 'workloads'
  | 'processes'
  | 'hosts'
  | 'clusters'
  | 'cloud-AWS'
  | 'cloud-Azure'
  | 'cloud-GCP'
  | 'cloud-Other'
  | 'unattributed';

export interface StackNodeInput {
  id: StackNodeId;
  /** `null` when the count could not be read. */
  count: number | null;
}

export interface StackNodeSpec {
  id: StackNodeId;
  column: StackColumn;
  /** The page a node opens. */
  route: string;
  /** Set for the provider nodes, which wear their provider's colour. */
  provider?: CloudProvider;
}

/** Order inside a column is the order a viewer reads the estate in. */
export const STACK_NODES: readonly StackNodeSpec[] = [
  { id: 'web', column: 'experience', route: '/experience' },
  { id: 'mobile', column: 'experience', route: '/experience' },
  { id: 'synthetic', column: 'experience', route: '/experience' },
  { id: 'services', column: 'services', route: '/services' },
  { id: 'workloads', column: 'services', route: '/kubernetes' },
  { id: 'processes', column: 'processes', route: '/technologies' },
  { id: 'hosts', column: 'infrastructure', route: '/infrastructure' },
  { id: 'clusters', column: 'infrastructure', route: '/kubernetes' },
  { id: 'cloud-AWS', column: 'cloud', route: '/cloud', provider: 'AWS' },
  { id: 'cloud-GCP', column: 'cloud', route: '/cloud', provider: 'GCP' },
  { id: 'cloud-Azure', column: 'cloud', route: '/cloud', provider: 'Azure' },
  { id: 'cloud-Other', column: 'cloud', route: '/cloud', provider: 'Other' },
  { id: 'unattributed', column: 'cloud', route: '/infrastructure' },
];

/** The hierarchy of the stack. Drawn only between nodes that are both on the map. */
export const STACK_LINKS: readonly (readonly [StackNodeId, StackNodeId])[] = [
  ['web', 'services'],
  ['mobile', 'services'],
  ['synthetic', 'services'],
  ['services', 'processes'],
  ['workloads', 'processes'],
  ['processes', 'hosts'],
  ['processes', 'clusters'],
  ['hosts', 'cloud-AWS'],
  ['hosts', 'cloud-GCP'],
  ['hosts', 'cloud-Azure'],
  ['hosts', 'cloud-Other'],
  ['hosts', 'unattributed'],
];

/**
 * 3.3.8 (owner's review of 3.3.7: "the stack map tiles take a large part of the page"): compact
 * pills — one line per node, 44 px instead of 64, tighter rows and thinner links — so the whole
 * estate reads at a glance; the map is ~30 % shorter (352 → 246 px with four cloud rows) and never drawn larger than this size.
 */
export const STACK_GEOMETRY = {
  width: 1195,
  columnGap: 240,
  left: 10,
  top: 28,
  nodeWidth: 215,
  nodeHeight: 44,
  rowGap: 10,
  minLink: 2,
  maxLink: 12,
} as const;

export interface PlacedNode extends StackNodeSpec {
  count: number | null;
  x: number;
  y: number;
}

export interface PlacedLink {
  from: PlacedNode;
  to: PlacedNode;
  width: number;
  d: string;
}

export interface StackLayout {
  width: number;
  height: number;
  columns: readonly { id: StackColumn; x: number }[];
  nodes: readonly PlacedNode[];
  links: readonly PlacedLink[];
}

/** Width of the links that leave a level of `count` entities, against the largest level. */
export function linkWidth(count: number | null, largest: number): number {
  const { minLink, maxLink } = STACK_GEOMETRY;
  if (count === null || count <= 0 || largest <= 0) return minLink;
  return minLink + (maxLink - minLink) * (Math.log10(1 + count) / Math.log10(1 + largest));
}

/**
 * Places the nodes and links. Returns `null` when nothing on the map was measured: a map of
 * dashes says nothing the inventory below it does not say better.
 */
export function layoutStack(inputs: readonly StackNodeInput[]): StackLayout | null {
  const g = STACK_GEOMETRY;
  const counts = new Map(inputs.map((input) => [input.id, input.count]));
  const present = STACK_NODES.filter((spec) => {
    if (!counts.has(spec.id)) return false;
    const count = counts.get(spec.id) ?? null;
    return count === null || count > 0;
  });
  if (!present.some((spec) => (counts.get(spec.id) ?? 0) > 0)) return null;

  // Trailing columns with nothing in them are not drawn: an estate with no cloud ends at its
  // infrastructure instead of at an empty "Cloud" column (3.2.6).
  const lastUsed = Math.max(...present.map((spec) => STACK_COLUMNS.indexOf(spec.column)));
  const columns = STACK_COLUMNS.slice(0, lastUsed + 1).map((id, index) => ({ id, x: g.left + index * g.columnGap }));
  const width = Math.min(g.width, g.left * 2 + (columns.length - 1) * g.columnGap + g.nodeWidth);
  const heightOf = (n: number) => (n === 0 ? 0 : n * g.nodeHeight + (n - 1) * g.rowGap);
  const tallest = Math.max(...columns.map((column) => heightOf(present.filter((spec) => spec.column === column.id).length)));

  const nodes: PlacedNode[] = [];
  for (const column of columns) {
    const inColumn = present.filter((spec) => spec.column === column.id);
    const offset = g.top + (tallest - heightOf(inColumn.length)) / 2;
    inColumn.forEach((spec, row) => {
      nodes.push({ ...spec, count: counts.get(spec.id) ?? null, x: column.x, y: offset + row * (g.nodeHeight + g.rowGap) });
    });
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const largest = Math.max(0, ...nodes.map((node) => node.count ?? 0));
  const links: PlacedLink[] = [];
  for (const [fromId, toId] of STACK_LINKS) {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (from === undefined || to === undefined) continue;
    const x1 = from.x + g.nodeWidth;
    const y1 = from.y + g.nodeHeight / 2;
    const x2 = to.x;
    const y2 = to.y + g.nodeHeight / 2;
    const mid = (x1 + x2) / 2;
    links.push({
      from,
      to,
      width: linkWidth(from.count, largest),
      d: `M${x1},${y1.toFixed(1)} C${mid},${y1.toFixed(1)} ${mid},${y2.toFixed(1)} ${x2},${y2.toFixed(1)}`,
    });
  }

  return { width, height: g.top + tallest + 12, columns, nodes, links };
}
