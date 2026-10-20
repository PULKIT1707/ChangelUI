// Sankey layout (original): columns from longest-path depth, values to node heights, then a few
// rounds of Gauss-Seidel relaxation that pull each node toward the weighted center of its
// neighbors, with per-column collision resolution. Links are ordered so ribbons don't cross needlessly.

export type SankeyAlign = "justify" | "left" | "right" | "center";

export interface SankeyNode<N, L> {
  id: string;
  data: N;
  index: number;
  /** Outgoing links, sorted by target position after layout. */
  sourceLinks: SankeyLink<N, L>[];
  /** Incoming links, sorted by source position after layout. */
  targetLinks: SankeyLink<N, L>[];
  /** max(sum in, sum out), or the node's fixed value. */
  value: number;
  /** Longest path from any source. */
  depth: number;
  /** Longest path to any sink. */
  height: number;
  /** Column after alignment. */
  layer: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface SankeyLink<N, L> {
  data: L;
  index: number;
  source: SankeyNode<N, L>;
  target: SankeyNode<N, L>;
  value: number;
  /** Ribbon thickness in px. */
  width: number;
  /** Ribbon center y at the source edge and at the target edge. */
  y0: number;
  y1: number;
}

export interface SankeyOptions<N, L> {
  width: number;
  height: number;
  /** Top-left of the layout area. Default 0, 0. */
  x?: number;
  y?: number;
  nodeWidth?: number;
  /** Vertical gap between nodes in a column (shrinks if a column can't fit it). Default 12. */
  nodePadding?: number;
  align?: SankeyAlign;
  /** Relaxation rounds. Default 6; 0 keeps the initial value-ordered stacking. */
  iterations?: number;
  nodeId?: (node: N, index: number) => string;
  /** Overrides the computed node value (e.g. to show capacity). */
  nodeValue?: (node: N) => number | undefined;
  linkSource?: (link: L) => string;
  linkTarget?: (link: L) => string;
  linkValue?: (link: L) => number;
}

export interface SankeyGraph<N, L> {
  nodes: SankeyNode<N, L>[];
  links: SankeyLink<N, L>[];
  /** Number of columns. */
  layers: number;
}

type AnyRecord = Record<string, unknown>;
const field = (key: string) => (d: unknown) => (d as AnyRecord)[key];

function findCycleEdge<N, L>(nodes: readonly SankeyNode<N, L>[], done: ReadonlySet<SankeyNode<N, L>>): string {
  // Every unfinished node still has an unfinished predecessor, so walking backwards through them
  // must revisit a node: the link that closes that loop is part of a cycle.
  const start = nodes.find((n) => !done.has(n));
  const onPath = new Set<SankeyNode<N, L>>();
  let node = start;
  while (node) {
    onPath.add(node);
    const back: SankeyLink<N, L> | undefined = node.targetLinks.find((l) => !done.has(l.source));
    if (!back) break;
    if (onPath.has(back.source)) return `"${back.source.id}" -> "${node.id}"`;
    node = back.source;
  }
  return "(unknown)";
}

/** Lays out a flow diagram. Throws on unknown node ids and on cycles (naming an edge in the loop). */
export function sankeyLayout<N, L>(nodesIn: readonly N[], linksIn: readonly L[], options: SankeyOptions<N, L>): SankeyGraph<N, L> {
  const x0 = options.x ?? 0;
  const y0 = options.y ?? 0;
  const x1 = x0 + options.width;
  const y1 = y0 + options.height;
  const nodeWidth = Math.max(0, options.nodeWidth ?? 16);
  const align = options.align ?? "justify";
  const iterations = Math.max(0, Math.floor(options.iterations ?? 6));
  const nodeId = options.nodeId ?? ((d: N) => String(field("id")(d)));
  const linkSource = options.linkSource ?? ((d: L) => String(field("source")(d)));
  const linkTarget = options.linkTarget ?? ((d: L) => String(field("target")(d)));
  const linkValue = options.linkValue ?? ((d: L) => Number(field("value")(d)));

  const nodes: SankeyNode<N, L>[] = nodesIn.map((data, index) => ({
    id: nodeId(data, index),
    data,
    index,
    sourceLinks: [],
    targetLinks: [],
    value: 0,
    depth: 0,
    height: 0,
    layer: 0,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: SankeyLink<N, L>[] = linksIn.map((data, index) => {
    const s = linkSource(data);
    const t = linkTarget(data);
    const source = byId.get(s);
    const target = byId.get(t);
    if (!source) throw new Error(`[changelui] sankeyLayout: link ${index} has unknown source "${s}"`);
    if (!target) throw new Error(`[changelui] sankeyLayout: link ${index} has unknown target "${t}"`);
    if (source === target) throw new Error(`[changelui] sankeyLayout: cycle at link "${s}" -> "${t}" (self-loop)`);
    const v = linkValue(data);
    const link: SankeyLink<N, L> = { data, index, source, target, value: Number.isFinite(v) && v > 0 ? v : 0, width: 0, y0: 0, y1: 0 };
    source.sourceLinks.push(link);
    target.targetLinks.push(link);
    return link;
  });

  for (const node of nodes) {
    const inSum = node.targetLinks.reduce((a, l) => a + l.value, 0);
    const outSum = node.sourceLinks.reduce((a, l) => a + l.value, 0);
    const fixed = options.nodeValue?.(node.data);
    node.value = fixed !== undefined && Number.isFinite(fixed) ? Math.max(0, fixed) : Math.max(inSum, outSum);
  }

  // Depth: longest path from a source, in Kahn topological order (input order breaks ties).
  const indegree = new Map(nodes.map((n) => [n, n.targetLinks.length]));
  const queue = nodes.filter((n) => n.targetLinks.length === 0);
  const topo: SankeyNode<N, L>[] = [];
  for (let qi = 0; qi < queue.length; qi++) {
    const node = queue[qi] as SankeyNode<N, L>;
    topo.push(node);
    for (const link of node.sourceLinks) {
      const t = link.target;
      t.depth = Math.max(t.depth, node.depth + 1);
      const left = (indegree.get(t) as number) - 1;
      indegree.set(t, left);
      if (left === 0) queue.push(t);
    }
  }
  if (topo.length !== nodes.length) {
    throw new Error(`[changelui] sankeyLayout: cycle at link ${findCycleEdge(nodes, new Set(topo))}`);
  }
  for (let i = topo.length - 1; i >= 0; i--) {
    const node = topo[i] as SankeyNode<N, L>;
    for (const link of node.sourceLinks) node.height = Math.max(node.height, link.target.height + 1);
  }
  const maxDepth = nodes.reduce((a, n) => Math.max(a, n.depth), 0);
  for (const node of nodes) {
    node.layer =
      align === "left"
        ? node.depth
        : align === "right"
          ? maxDepth - node.height
          : align === "center"
            ? node.targetLinks.length
              ? node.depth
              : node.sourceLinks.length
                ? Math.min(...node.sourceLinks.map((l) => l.target.depth)) - 1
                : 0
            : node.sourceLinks.length
              ? node.depth
              : maxDepth;
  }
  const layers = nodes.length ? nodes.reduce((a, n) => Math.max(a, n.layer), 0) + 1 : 0;
  const columns: SankeyNode<N, L>[][] = Array.from({ length: layers }, () => []);
  for (const node of nodes) columns[node.layer]?.push(node);

  // x: columns spread edge to edge.
  const kx = layers > 1 ? (x1 - x0 - nodeWidth) / (layers - 1) : 0;
  for (const node of nodes) {
    node.x0 = layers > 1 ? x0 + node.layer * kx : x0 + (x1 - x0 - nodeWidth) / 2;
    node.x1 = node.x0 + nodeWidth;
  }

  // y scale: the tightest column decides px per unit of value.
  const tallest = columns.reduce((a, c) => Math.max(a, c.length), 0);
  const py = Math.max(0, Math.min(options.nodePadding ?? 12, tallest > 1 ? (y1 - y0) / (tallest - 1) : Infinity));
  let ky = Infinity;
  for (const column of columns) {
    const sum = column.reduce((a, n) => a + n.value, 0);
    if (sum > 0) ky = Math.min(ky, (y1 - y0 - (column.length - 1) * py) / sum);
  }
  if (!Number.isFinite(ky) || ky < 0) ky = 0;
  for (const link of links) link.width = link.value * ky;

  // Initial stacking in input order, with the leftover space spread evenly between nodes.
  for (const column of columns) {
    let y = y0;
    for (const node of column) {
      node.y0 = y;
      node.y1 = y + node.value * ky;
      y = node.y1 + py;
    }
    const spare = (y1 - (y - py) - y0) / (column.length + 1);
    if (spare > 0) column.forEach((node, i) => shift(node, spare * (i + 1)));
  }

  const center = (n: SankeyNode<N, L>) => (n.y0 + n.y1) / 2;
  function shift(node: SankeyNode<N, L>, dy: number): void {
    node.y0 += dy;
    node.y1 += dy;
  }
  function towards(node: SankeyNode<N, L>, linksOf: SankeyLink<N, L>[], other: (l: SankeyLink<N, L>) => SankeyNode<N, L>, alpha: number): void {
    let weight = 0;
    let sum = 0;
    for (const l of linksOf) {
      weight += l.value;
      sum += center(other(l)) * l.value;
    }
    if (weight > 0) shift(node, (sum / weight - center(node)) * alpha);
  }
  function resolve(column: SankeyNode<N, L>[]): void {
    column.sort((a, b) => a.y0 - b.y0 || a.index - b.index);
    let y = y0;
    for (const node of column) {
      if (node.y0 < y) shift(node, y - node.y0);
      y = node.y1 + py;
    }
    // Overflow at the bottom: push back up, then re-check the top.
    y = y1;
    for (let i = column.length - 1; i >= 0; i--) {
      const node = column[i] as SankeyNode<N, L>;
      if (node.y1 > y) shift(node, y - node.y1);
      y = node.y0 - py;
    }
    y = y0;
    for (const node of column) {
      if (node.y0 < y) shift(node, y - node.y0);
      y = node.y1 + py;
    }
  }

  for (let it = 0; it < iterations; it++) {
    const alpha = 0.9 ** it;
    for (let c = 1; c < layers; c++) {
      const column = columns[c] as SankeyNode<N, L>[];
      for (const node of column) towards(node, node.targetLinks, (l) => l.source, alpha);
      resolve(column);
    }
    for (let c = layers - 2; c >= 0; c--) {
      const column = columns[c] as SankeyNode<N, L>[];
      for (const node of column) towards(node, node.sourceLinks, (l) => l.target, alpha);
      resolve(column);
    }
  }
  for (const column of columns) resolve(column);

  // Ribbons leave and enter in the order of the node on the other end.
  for (const node of nodes) {
    node.sourceLinks.sort((a, b) => a.target.y0 - b.target.y0 || a.target.index - b.target.index || a.index - b.index);
    node.targetLinks.sort((a, b) => a.source.y0 - b.source.y0 || a.source.index - b.source.index || a.index - b.index);
    let y = node.y0;
    for (const link of node.sourceLinks) {
      link.y0 = y + link.width / 2;
      y += link.width;
    }
    y = node.y0;
    for (const link of node.targetLinks) {
      link.y1 = y + link.width / 2;
      y += link.width;
    }
  }
  return { nodes, links, layers };
}
