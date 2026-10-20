// Hierarchies: build a tree from nested data or flat rows, sum and sort it, then lay it out as a
// treemap (squarify, binary, slice, dice, sliceDice) or a partition (icicle, sunburst).

export interface HierarchyNode<T> {
  id: string;
  data: T;
  /** 0 at the root. */
  depth: number;
  /** 0 at leaves; the longest distance to a leaf otherwise. */
  height: number;
  /** Own value plus all descendants' (after sumHierarchy). */
  value: number;
  parent: HierarchyNode<T> | null;
  children: HierarchyNode<T>[] | null;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function makeNode<T>(data: T, id: string, depth: number, parent: HierarchyNode<T> | null): HierarchyNode<T> {
  return { id, data, depth, height: 0, value: 0, parent, children: null, x0: 0, y0: 0, x1: 0, y1: 0 };
}

function computeHeights<T>(root: HierarchyNode<T>): void {
  eachAfter(root, (node) => {
    node.height = node.children ? Math.max(...node.children.map((c) => c.height + 1)) : 0;
  });
}

/**
 * Builds a tree from nested data. `id` defaults to the index path from the root ("" for the
 * root, then "0", "0/2", ...); pass one for stable drill paths across data updates.
 */
export function fromNested<T>(
  data: T,
  children: (d: T) => Iterable<T> | null | undefined,
  id?: (d: T, path: string) => string,
): HierarchyNode<T> {
  const root = makeNode(data, id ? id(data, "") : "", 0, null);
  const stack: Array<[HierarchyNode<T>, string]> = [[root, ""]];
  while (stack.length) {
    const [node, path] = stack.pop() as [HierarchyNode<T>, string];
    const kids = children(node.data);
    const list = kids ? Array.from(kids) : [];
    if (!list.length) continue;
    const paths = list.map((_, i) => (path ? `${path}/${i}` : String(i)));
    node.children = list.map((d, i) => makeNode(d, id ? id(d, paths[i] as string) : (paths[i] as string), node.depth + 1, node));
    node.children.forEach((child, i) => stack.push([child, paths[i] as string]));
  }
  computeHeights(root);
  return root;
}

/**
 * Builds a tree from flat rows with id / parentId. Exactly one row must have no parent. Throws on
 * duplicate ids, missing parents and cycles, naming the offending id.
 */
export function stratify<T>(
  rows: readonly T[],
  id: (d: T) => string,
  parentId: (d: T) => string | null | undefined,
): HierarchyNode<T> {
  const byId = new Map<string, HierarchyNode<T>>();
  for (const row of rows) {
    const key = id(row);
    if (byId.has(key)) throw new Error(`[changelui] stratify: duplicate id "${key}"`);
    byId.set(key, makeNode(row, key, 0, null));
  }
  let root: HierarchyNode<T> | null = null;
  for (const node of byId.values()) {
    const pid = parentId(node.data);
    if (pid === null || pid === undefined || pid === "") {
      if (root) throw new Error(`[changelui] stratify: multiple roots ("${root.id}" and "${node.id}")`);
      root = node;
      continue;
    }
    const parent = byId.get(pid);
    if (!parent) throw new Error(`[changelui] stratify: missing parent "${pid}" of "${node.id}"`);
    node.parent = parent;
    (parent.children ??= []).push(node);
  }
  if (!root) throw new Error(rows.length ? "[changelui] stratify: no root (every row has a parent, so there is a cycle)" : "[changelui] stratify: no rows");
  const reached = new Set<HierarchyNode<T>>();
  eachBefore(root, (node) => {
    reached.add(node);
    node.depth = node.parent ? node.parent.depth + 1 : 0;
  });
  if (reached.size !== byId.size) {
    // Rows that never connect to the root can only be parented in a loop.
    const stray = [...byId.values()].find((n) => !reached.has(n));
    throw new Error(`[changelui] stratify: cycle through "${stray?.id ?? "?"}"`);
  }
  computeHeights(root);
  return root;
}

/** Pre-order traversal (parents before children). */
export function eachBefore<T>(root: HierarchyNode<T>, visit: (node: HierarchyNode<T>) => void): void {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop() as HierarchyNode<T>;
    visit(node);
    const kids = node.children;
    if (kids) for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i] as HierarchyNode<T>);
  }
}

/** Post-order traversal (children before parents). */
export function eachAfter<T>(root: HierarchyNode<T>, visit: (node: HierarchyNode<T>) => void): void {
  const order: HierarchyNode<T>[] = [];
  eachBefore(root, (n) => order.push(n));
  for (let i = order.length - 1; i >= 0; i--) visit(order[i] as HierarchyNode<T>);
}

export function descendants<T>(root: HierarchyNode<T>): HierarchyNode<T>[] {
  const out: HierarchyNode<T>[] = [];
  eachBefore(root, (n) => out.push(n));
  return out;
}

export function leaves<T>(root: HierarchyNode<T>): HierarchyNode<T>[] {
  return descendants(root).filter((n) => !n.children);
}

/** The node and its ancestors up to the root (breadcrumbs: reverse it). */
export function ancestors<T>(node: HierarchyNode<T>): HierarchyNode<T>[] {
  const out: HierarchyNode<T>[] = [];
  for (let n: HierarchyNode<T> | null = node; n; n = n.parent) out.push(n);
  return out;
}

export function findNode<T>(root: HierarchyNode<T>, id: string): HierarchyNode<T> | undefined {
  return descendants(root).find((n) => n.id === id);
}

/** Sets every node's value to its own value plus its descendants'. Non-finite values count as 0. */
export function sumHierarchy<T>(root: HierarchyNode<T>, value: (d: T) => number | null | undefined): HierarchyNode<T> {
  eachAfter(root, (node) => {
    let sum = +(value(node.data) ?? 0) || 0;
    if (node.children) for (const c of node.children) sum += c.value;
    node.value = sum;
  });
  return root;
}

/** Sorts every node's children in place (stable). Default: descending value. */
export function sortHierarchy<T>(
  root: HierarchyNode<T>,
  compare: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number = (a, b) => b.value - a.value,
): HierarchyNode<T> {
  eachBefore(root, (node) => {
    node.children?.sort(compare);
  });
  return root;
}

// ---------------------------------------------------------------------------------------------
// Tiles: position a parent's children inside [x0, y0, x1, y1].

type Parent = { value: number; children: ReadonlyArray<{ value: number; x0: number; y0: number; x1: number; y1: number }> };

/** Children side by side horizontally, widths proportional to value. */
export function tileDice(parent: Parent, x0: number, y0: number, x1: number, y1: number): void {
  const k = parent.value && (x1 - x0) / parent.value;
  let x = x0;
  for (const node of parent.children) {
    node.y0 = y0;
    node.y1 = y1;
    node.x0 = x;
    x += node.value * k;
    node.x1 = x;
  }
}

/** Children stacked vertically, heights proportional to value. */
export function tileSlice(parent: Parent, x0: number, y0: number, x1: number, y1: number): void {
  const k = parent.value && (y1 - y0) / parent.value;
  let y = y0;
  for (const node of parent.children) {
    node.x0 = x0;
    node.x1 = x1;
    node.y0 = y;
    y += node.value * k;
    node.y1 = y;
  }
}

/** The golden ratio: the target aspect ratio of squarified cells. */
export const PHI = 1.618033988749895; // (1 + Math.sqrt(5)) / 2

/**
 * Squarified treemap (Bruls, Huizing & van Wijk 2000): fills rows along the shorter side while the
 * worst aspect ratio in the row keeps improving. Children should be sorted by descending value.
 */
export function tileSquarify(parent: Parent, x0: number, y0: number, x1: number, y1: number, ratio = PHI): void {
  const nodes = parent.children;
  const n = nodes.length;
  const target = ratio > 1 ? ratio : 1;
  let remaining = parent.value;
  let i0 = 0;
  let i1 = 0;
  while (i0 < n) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    // Skip leading zero-value nodes: they join the row without affecting it.
    let sum: number;
    do sum = (nodes[i1++] as Parent["children"][number]).value;
    while (!sum && i1 < n);
    let minV = sum;
    let maxV = sum;
    const alpha = Math.max(dy / dx, dx / dy) / (remaining * target);
    let beta = sum * sum * alpha;
    let worst = Math.max(maxV / beta, beta / minV);
    for (; i1 < n; i1++) {
      const v = (nodes[i1] as Parent["children"][number]).value;
      sum += v;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      beta = sum * sum * alpha;
      const next = Math.max(maxV / beta, beta / minV);
      if (next > worst) {
        sum -= v;
        break;
      }
      worst = next;
    }
    const row = { value: sum, children: nodes.slice(i0, i1) };
    // Taller than wide: the row runs across the top; otherwise down the left side.
    if (dx < dy) {
      const yb = remaining ? y0 + (dy * sum) / remaining : y1;
      tileDice(row, x0, y0, x1, yb);
      y0 = yb;
    } else {
      const xb = remaining ? x0 + (dx * sum) / remaining : x1;
      tileSlice(row, x0, y0, xb, y1);
      x0 = xb;
    }
    remaining -= sum;
    i0 = i1;
  }
}

/**
 * Balanced binary split: recursively halves the children by value, cutting the longer side.
 * Order-preserving, so cells keep their neighbors when values change (stable updates).
 */
export function tileBinary(parent: Parent, x0: number, y0: number, x1: number, y1: number): void {
  const nodes = parent.children;
  const n = nodes.length;
  if (!n) return;
  const sums = new Array<number>(n + 1);
  sums[0] = 0;
  for (let i = 0; i < n; i++) sums[i + 1] = (sums[i] as number) + (nodes[i] as Parent["children"][number]).value;

  const split = (i: number, j: number, value: number, ax: number, ay: number, bx: number, by: number) => {
    if (i >= j - 1) {
      const node = nodes[i] as Parent["children"][number];
      node.x0 = ax;
      node.y0 = ay;
      node.x1 = bx;
      node.y1 = by;
      return;
    }
    const offset = sums[i] as number;
    const half = value / 2 + offset;
    // First k in (i, j) with sums[k] >= half, then step back if the previous cut is closer.
    let k = i + 1;
    let hi = j - 1;
    while (k < hi) {
      const mid = (k + hi) >>> 1;
      if ((sums[mid] as number) < half) k = mid + 1;
      else hi = mid;
    }
    if (half - (sums[k - 1] as number) < (sums[k] as number) - half && i + 1 < k) k--;
    const left = (sums[k] as number) - offset;
    const right = value - left;
    if (bx - ax > by - ay) {
      const xk = value ? (ax * right + bx * left) / value : bx;
      split(i, k, left, ax, ay, xk, by);
      split(k, j, right, xk, ay, bx, by);
    } else {
      const yk = value ? (ay * right + by * left) / value : by;
      split(i, k, left, ax, ay, bx, yk);
      split(k, j, right, ax, yk, bx, by);
    }
  };
  split(0, n, parent.value, x0, y0, x1, y1);
}

/** Alternates by depth: dice at even depths, slice at odd ones (classic slice-and-dice). */
export function tileSliceDice(parent: Parent & { depth: number }, x0: number, y0: number, x1: number, y1: number): void {
  if (parent.depth & 1) tileSlice(parent, x0, y0, x1, y1);
  else tileDice(parent, x0, y0, x1, y1);
}

export type Tile = "squarify" | "binary" | "slice" | "dice" | "sliceDice";

export interface TreemapOptions {
  width: number;
  height: number;
  tile?: Tile;
  /** Target aspect ratio for squarify (default the golden ratio). */
  ratio?: number;
  /** Gap between siblings in px. Default 0. */
  paddingInner?: number;
  /** Inset of children inside their parent in px. Default 0. */
  paddingOuter?: number;
  /** Top inset (room for group headers); overrides paddingOuter at the top. */
  paddingTop?: number;
  /** Snap rect edges to whole pixels. Default false. */
  round?: boolean;
}

function roundNode(node: { x0: number; y0: number; x1: number; y1: number }): void {
  node.x0 = Math.round(node.x0);
  node.y0 = Math.round(node.y0);
  node.x1 = Math.round(node.x1);
  node.y1 = Math.round(node.y1);
}

/** Lays out a summed hierarchy as nested rectangles in [0, width] x [0, height] (mutates x0..y1). */
export function treemap<T>(root: HierarchyNode<T>, options: TreemapOptions): HierarchyNode<T> {
  const tile = options.tile ?? "squarify";
  const inner = Math.max(0, options.paddingInner ?? 0);
  const outer = Math.max(0, options.paddingOuter ?? 0);
  const top = Math.max(0, options.paddingTop ?? outer);
  const ratio = options.ratio ?? PHI;
  const pads = [0];
  root.x0 = 0;
  root.y0 = 0;
  root.x1 = options.width;
  root.y1 = options.height;
  eachBefore(root, (node) => {
    let p = pads[node.depth] ?? 0;
    let x0 = node.x0 + p;
    let y0 = node.y0 + p;
    let x1 = node.x1 - p;
    let y1 = node.y1 - p;
    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    node.x0 = x0;
    node.y0 = y0;
    node.x1 = x1;
    node.y1 = y1;
    if (!node.children) return;
    p = pads[node.depth + 1] = inner / 2;
    x0 += outer - p;
    y0 += top - p;
    x1 -= outer - p;
    y1 -= outer - p;
    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    const parent = node as HierarchyNode<T> & { children: HierarchyNode<T>[] };
    if (tile === "squarify") tileSquarify(parent, x0, y0, x1, y1, ratio);
    else if (tile === "binary") tileBinary(parent, x0, y0, x1, y1);
    else if (tile === "slice") tileSlice(parent, x0, y0, x1, y1);
    else if (tile === "dice") tileDice(parent, x0, y0, x1, y1);
    else tileSliceDice(parent, x0, y0, x1, y1);
  });
  if (options.round) eachBefore(root, roundNode);
  return root;
}

export interface PartitionOptions {
  /** Extent along the sibling axis (for a sunburst: 2 * Math.PI). */
  width: number;
  /** Extent along the depth axis (for a sunburst: the radius). */
  height: number;
  /** Gap subtracted from each cell's far edges. Default 0. */
  padding?: number;
  round?: boolean;
}

/**
 * Adjacency layout: every depth gets an equal band of `height`, and children split their parent's
 * extent along `width` by value. Icicle charts use it directly; sunbursts map x to angle, y to radius.
 */
export function partition<T>(root: HierarchyNode<T>, options: PartitionOptions): HierarchyNode<T> {
  const { width, height } = options;
  const padding = Math.max(0, options.padding ?? 0);
  const levels = root.height + 1;
  root.x0 = padding;
  root.y0 = padding;
  root.x1 = width;
  root.y1 = height / levels;
  eachBefore(root, (node) => {
    if (node.children) {
      tileDice(node as HierarchyNode<T> & { children: HierarchyNode<T>[] }, node.x0, (height * (node.depth + 1)) / levels, node.x1, (height * (node.depth + 2)) / levels);
    }
    let x0 = node.x0;
    let y0 = node.y0;
    let x1 = node.x1 - padding;
    let y1 = node.y1 - padding;
    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    node.x0 = x0;
    node.y0 = y0;
    node.x1 = x1;
    node.y1 = y1;
  });
  if (options.round) eachBefore(root, roundNode);
  return root;
}
