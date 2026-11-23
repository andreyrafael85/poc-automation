/**
 * The layout of a flow map (3.2.3, wave V4): columns of nodes joined by links, in the grammar of
 * the stack map (`models/stackMap.ts`) — the same node, the same link, the same reading from left
 * to right. The stack map draws one fixed picture of the estate; this draws any picture of that
 * shape: the Smartscape calls between service types (Topology) and the root-cause trail (RCA).
 *
 * What a link means is the caller's to say, and the map's legend says it on screen: on Topology a
 * link is a measured call relationship, on RCA it is what Davis attached to the problem. A link's
 * width grows with its value on a log scale, so one large flow does not reduce the others to hairs.
 */

export interface FlowColumnInput {
  id: string;
  /** Header over the column (already translated). */
  label: string;
}

export interface FlowNodeInput {
  id: string;
  column: string;
}

export interface FlowLinkInput {
  from: string;
  to: string;
  /** Sizes the link (a count of calls, of services…). Zero or less draws the thinnest link. */
  value: number;
}

/**
 * 3.3.9 (owner's review of 3.3.8: "the map is also large — adjust it as on the Overview"): compact
 * nodes, 48 px instead of 64, tighter rows and thinner links, never drawn larger than this size —
 * the RCA trail (Executive summary, AIOps), the frontend → backend flow and the call map.
 */
export const FLOW_GEOMETRY = {
  left: 10,
  top: 26,
  nodeWidth: 210,
  nodeHeight: 48,
  rowGap: 10,
  /** Smallest horizontal room between two columns, for the links to read as curves. */
  minGap: 150,
  minLink: 2.5,
  maxLink: 11,
} as const;

export interface PlacedFlowNode<N extends FlowNodeInput = FlowNodeInput> {
  node: N;
  x: number;
  y: number;
}

export interface PlacedFlowLink<L extends FlowLinkInput = FlowLinkInput> {
  link: L;
  /** Index of the link, stable for SVG ids. */
  index: number;
  width: number;
  d: string;
  fromId: string;
  toId: string;
  /**
   * Where the link starts and ends horizontally. Its gradient is laid out in user space between
   * them: a link between two nodes at the same height is a straight line with an empty bounding
   * box, and a bounding-box gradient on it does not paint — the problem → root-cause link of
   * the RCA trail was invisible until 3.2.3 fixed it.
   */
  x1: number;
  x2: number;
}

export interface FlowLayout<N extends FlowNodeInput = FlowNodeInput, L extends FlowLinkInput = FlowLinkInput> {
  width: number;
  height: number;
  columns: readonly { id: string; label: string; x: number }[];
  nodes: readonly PlacedFlowNode<N>[];
  links: readonly PlacedFlowLink<L>[];
}

/** Width of a link of `value` against the largest link of the map (log scale, never below the floor). */
export function flowLinkWidth(value: number, largest: number): number {
  const { minLink, maxLink } = FLOW_GEOMETRY;
  if (!(value > 0) || !(largest > 0)) return minLink;
  return minLink + (maxLink - minLink) * (Math.log10(1 + value) / Math.log10(1 + largest));
}

/**
 * Places the nodes column by column (each column centred on the tallest) and draws every link
 * whose two ends are on the map. `width` is the drawing's natural width: the columns spread to
 * fill it, and never come closer than `minGap`.
 *
 * Returns `null` when there is nothing to draw.
 */
export function layoutFlow<N extends FlowNodeInput, L extends FlowLinkInput>(
  columns: readonly FlowColumnInput[],
  nodes: readonly N[],
  links: readonly L[],
  width = 1145,
): FlowLayout<N, L> | null {
  const g = FLOW_GEOMETRY;
  const used = columns.filter((column) => nodes.some((node) => node.column === column.id));
  if (used.length === 0) return null;

  const span = used.length === 1 ? 0 : (width - 2 * g.left - g.nodeWidth) / (used.length - 1);
  const step = used.length === 1 ? 0 : Math.max(span, g.nodeWidth + g.minGap);
  const drawnWidth = used.length === 1 ? g.nodeWidth + 2 * g.left : 2 * g.left + g.nodeWidth + step * (used.length - 1);
  const placedColumns = used.map((column, index) => ({ id: column.id, label: column.label, x: g.left + index * step }));

  const heightOf = (count: number) => (count === 0 ? 0 : count * g.nodeHeight + (count - 1) * g.rowGap);
  const tallest = Math.max(...placedColumns.map((column) => heightOf(nodes.filter((node) => node.column === column.id).length)));

  const placed: PlacedFlowNode<N>[] = [];
  for (const column of placedColumns) {
    const inColumn = nodes.filter((node) => node.column === column.id);
    const offset = g.top + (tallest - heightOf(inColumn.length)) / 2;
    inColumn.forEach((node, row) => placed.push({ node, x: column.x, y: offset + row * (g.nodeHeight + g.rowGap) }));
  }

  const byId = new Map(placed.map((entry) => [entry.node.id, entry]));
  const largest = Math.max(0, ...links.map((link) => link.value));
  const placedLinks: PlacedFlowLink<L>[] = [];
  links.forEach((link, index) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (from === undefined || to === undefined || from === to) return;
    const x1 = from.x + g.nodeWidth;
    const y1 = from.y + g.nodeHeight / 2;
    const x2 = to.x;
    const y2 = to.y + g.nodeHeight / 2;
    const mid = (x1 + x2) / 2;
    placedLinks.push({
      link,
      index,
      width: flowLinkWidth(link.value, largest),
      fromId: link.from,
      toId: link.to,
      x1,
      x2,
      d: `M${x1},${y1.toFixed(1)} C${mid.toFixed(1)},${y1.toFixed(1)} ${mid.toFixed(1)},${y2.toFixed(1)} ${x2},${y2.toFixed(1)}`,
    });
  });

  return { width: drawnWidth, height: g.top + tallest + 12, columns: placedColumns, nodes: placed, links: placedLinks };
}

/** Shortens a name to fit a node, keeping its start; the full name stays in the node's title. */
export function fitName(name: string, max = 24): string {
  return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}

/** Where a node's figure line starts (after its icon), and what it keeps clear of the node's right edge. */
const FIGURE_X = 46;
const FIGURE_END_PAD = 3;
/** The type sizes of the figure (bold) and of its unit, in px (`.pvs-stackmap__count`, `.pvs-stackmap__unit`). */
const FIGURE_PX = 16;
const UNIT_PX = 11;

/** The advance of a character in em, by kind (generous: a measured UI face is narrower, never wider). */
function charEm(ch: string): number {
  if (/[\s.,:;'"|!()[\]{}/\\ilfjtrI·-]/.test(ch)) return 0.33;
  if (/[mwMW@%—–…]/.test(ch)) return 0.88;
  if (/[0-9]/.test(ch)) return 0.58;
  if (/\p{Lu}/u.test(ch)) return 0.7;
  return 0.56;
}

/** The width of a text at `px`, estimated (no DOM: the same answer in a test and in every browser). */
export function textPx(text: string, px: number): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  return em * px;
}

/**
 * The unit a node prints after its figure: the first of `units` that fits beside it in the node,
 * none when none does (3.2.7 review UX-M4). In pt-BR, "Banco de dados causa raiz" ran out of the
 * root node under the links, and "911,1 mil req. · 0,30% falhas" was clipped at the map's edge; the
 * figure itself is never cut, and the node's title and spoken label keep the whole text.
 */
export function fitUnit(figure: string, units: readonly (string | undefined)[]): string | undefined {
  const room = FLOW_GEOMETRY.nodeWidth - FIGURE_X - FIGURE_END_PAD;
  const used = textPx(figure, FIGURE_PX);
  return units.find((unit): unit is string => unit !== undefined && unit !== '' && used + textPx(` ${unit}`, UNIT_PX) <= room);
}
