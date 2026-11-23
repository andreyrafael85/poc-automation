import {
  linkWidth,
  STACK_COLUMNS,
  STACK_GEOMETRY,
  STACK_LINKS,
  STACK_NODES,
  type StackColumn,
  type StackNodeInput,
  type StackNodeSpec,
} from './stackMap';

/**
 * 3.5.3 (visual proposal v4, "the environment as a living flow"): the Overview's estate drawn as
 * layers from the user to the cloud — a disc per layer the tenant measured, the stack's hierarchy
 * as curves between them. The same counts and the same presence rules as the stack map
 * (`layoutStack`): a node measured as zero is left out, a node not read stays with a dash, and a
 * map with nothing measured is not drawn. Only the geometry differs.
 */
export const FLOW_GEOMETRY = {
  width: 1120,
  /** Room at the left of the first column and, at the right, for the last column's labels. */
  left: 40,
  right: 190,
  top: 44,
  rowHeight: 84,
  radius: 24,
  minLink: 1.5,
  maxLink: 7,
} as const;

export interface FlowNode extends StackNodeSpec {
  count: number | null;
  /** Centre of the disc. */
  cx: number;
  cy: number;
  /** Index of the node's column among the columns drawn (for its colour). */
  columnIndex: number;
}

export interface FlowLink {
  from: FlowNode;
  to: FlowNode;
  width: number;
  d: string;
}

export interface FlowLayout {
  width: number;
  height: number;
  columns: readonly { id: StackColumn; x: number; index: number }[];
  nodes: readonly FlowNode[];
  links: readonly FlowLink[];
}

export function layoutFlow(inputs: readonly StackNodeInput[]): FlowLayout | null {
  const g = FLOW_GEOMETRY;
  const counts = new Map(inputs.map((input) => [input.id, input.count]));
  const present = STACK_NODES.filter((spec) => {
    if (!counts.has(spec.id)) return false;
    const count = counts.get(spec.id) ?? null;
    return count === null || count > 0;
  });
  if (!present.some((spec) => (counts.get(spec.id) ?? 0) > 0)) return null;

  const lastUsed = Math.max(...present.map((spec) => STACK_COLUMNS.indexOf(spec.column)));
  const used = STACK_COLUMNS.slice(0, lastUsed + 1);
  const span = g.width - g.left - g.right - g.radius;
  const step = used.length > 1 ? span / (used.length - 1) : 0;
  const columns = used.map((id, index) => ({ id, index, x: g.left + g.radius + index * step }));
  const tallest = Math.max(...columns.map((column) => present.filter((spec) => spec.column === column.id).length));

  const nodes: FlowNode[] = [];
  for (const column of columns) {
    const inColumn = present.filter((spec) => spec.column === column.id);
    const offset = g.top + ((tallest - inColumn.length) * g.rowHeight) / 2;
    inColumn.forEach((spec, row) => {
      nodes.push({
        ...spec,
        count: counts.get(spec.id) ?? null,
        cx: column.x,
        cy: offset + row * g.rowHeight + g.radius + 4,
        columnIndex: column.index,
      });
    });
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const largest = Math.max(0, ...nodes.map((node) => node.count ?? 0));
  const scale = (g.maxLink - g.minLink) / (STACK_GEOMETRY.maxLink - STACK_GEOMETRY.minLink);
  const links: FlowLink[] = [];
  for (const [fromId, toId] of STACK_LINKS) {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (from === undefined || to === undefined) continue;
    const x1 = from.cx + g.radius;
    const x2 = to.cx - g.radius;
    const mid = (x1 + x2) / 2;
    links.push({
      from,
      to,
      width: g.minLink + (linkWidth(from.count, largest) - STACK_GEOMETRY.minLink) * scale,
      d: `M${x1.toFixed(1)},${from.cy.toFixed(1)} C${mid.toFixed(1)},${from.cy.toFixed(1)} ${mid.toFixed(1)},${to.cy.toFixed(1)} ${x2.toFixed(1)},${to.cy.toFixed(1)}`,
    });
  }

  return { width: g.width, height: g.top + tallest * g.rowHeight + 8, columns, nodes, links };
}
