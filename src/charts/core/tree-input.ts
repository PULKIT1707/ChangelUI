// Turns the data shapes hierarchical charts accept (one nested root, an array of nested roots, or
// flat rows with id / parentId) into a summed, sorted HierarchyNode tree with stable ids. Node ids
// default to the label path ("Tech/Software"), so drill paths survive data updates.
import { readAccessor, type Accessor } from "./cartesian-model";
import { eachBefore, fromNested, sortHierarchy, stratify, sumHierarchy, type HierarchyNode } from "./hierarchy";

export interface TreeItem<T> {
  /** The source row; null for the synthetic root over an array of roots. */
  datum: T | null;
  label: string;
}

export interface TreeInputOptions<T> {
  /** A nested root, an array of nested roots, or flat rows (with `parentId`). */
  data: T | readonly T[];
  value: Accessor<T, number | null | undefined>;
  label: Accessor<T, string>;
  /** Children of a nested datum. Default `d.children`. */
  getChildren?: (d: T) => readonly T[] | null | undefined;
  /** Stable id per datum. Default: the label path. Required for flat rows. */
  id?: (d: T) => string;
  /** Flat rows: the parent id (null/undefined/"" for a root). */
  parentId?: (d: T) => string | null | undefined;
  /** Label of the synthetic root over several roots. Default "All". */
  rootLabel?: string;
  /** Sibling order. Default "desc" (by value; squarify wants it). */
  sort?: "desc" | "none";
}

const defaultChildren = (d: unknown) => (d as { children?: readonly unknown[] | null }).children;

/** Builds, sums and sorts the tree. Throws (via stratify) on bad flat rows. */
export function buildTree<T>(options: TreeInputOptions<T>): HierarchyNode<TreeItem<T>> {
  const { data, value, label, id, parentId, rootLabel = "All", sort = "desc" } = options;
  const kids = (options.getChildren ?? (defaultChildren as (d: T) => readonly T[] | null | undefined));
  const labelOf = (d: T | null) => (d === null ? rootLabel : String(readAccessor(label, d, 0) ?? ""));
  let root: HierarchyNode<TreeItem<T>>;
  if (Array.isArray(data) && parentId) {
    if (!id) throw new Error("[changelui] hierarchical charts: flat rows with parentId also need an id accessor");
    const rows = data as readonly T[];
    const roots = rows.filter((d) => {
      const p = parentId(d);
      return p === null || p === undefined || p === "";
    });
    const idOf = id as (d: T) => string;
    // Several roots get a synthetic parent so there is always one root.
    const synthetic = roots.length !== 1;
    const items: Array<{ key: string; parent: string | null; item: TreeItem<T> }> = rows.map((d) => {
      const p = parentId(d);
      const isRoot = p === null || p === undefined || p === "";
      return { key: idOf(d), parent: isRoot ? (synthetic ? "__root" : null) : String(p), item: { datum: d, label: labelOf(d) } };
    });
    if (synthetic) items.unshift({ key: "__root", parent: null, item: { datum: null, label: rootLabel } });
    const tree = stratify(items, (r) => r.key, (r) => r.parent);
    root = mapTree(tree, (r) => r.item);
  } else {
    const top: { item: TreeItem<T>; kids: readonly T[] } = Array.isArray(data)
      ? { item: { datum: null, label: rootLabel }, kids: data as readonly T[] }
      : { item: { datum: data as T, label: labelOf(data as T) }, kids: kids(data as T) ?? [] };
    type Raw = { item: TreeItem<T>; kids: readonly T[] };
    const raw = fromNested<Raw>(top, (r) => r.kids.map((d) => ({ item: { datum: d, label: labelOf(d) }, kids: kids(d) ?? [] })));
    root = mapTree(raw, (r) => r.item);
    // Ids: the caller's, else the label path (siblings with equal labels get a #n suffix).
    eachBefore(root, (node) => {
      if (!node.parent) {
        node.id = node.data.datum && id ? id(node.data.datum) : "";
        return;
      }
      if (node.data.datum && id) node.id = id(node.data.datum);
    });
    if (!id) {
      eachBefore(root, (node) => {
        if (!node.children) return;
        const seen = new Map<string, number>();
        for (const child of node.children) {
          const n = (seen.get(child.data.label) ?? 0) + 1;
          seen.set(child.data.label, n);
          const name = n > 1 ? `${child.data.label}#${n}` : child.data.label;
          child.id = node.parent || node.id ? `${node.id}/${name}` : name;
        }
      });
    }
  }
  sumHierarchy(root, (item) => {
    if (!item.datum) return 0;
    const v = Number(readAccessor(value, item.datum, 0));
    return Number.isFinite(v) && v > 0 ? v : 0;
  });
  if (sort === "desc") sortHierarchy(root);
  return root;
}

/** Copies a tree with mapped data (ids, depths and heights preserved). */
function mapTree<A, B>(source: HierarchyNode<A>, map: (d: A) => B): HierarchyNode<B> {
  const copy = (n: HierarchyNode<A>, parent: HierarchyNode<B> | null): HierarchyNode<B> => {
    const out: HierarchyNode<B> = { ...n, data: map(n.data), parent, children: null };
    out.children = n.children ? n.children.map((c) => copy(c, out)) : null;
    return out;
  };
  return copy(source, null);
}

/** Ids from the root's child down to `node` (the drill path of a node). */
export function pathOf<T>(node: HierarchyNode<T>): string[] {
  const out: string[] = [];
  for (let n: HierarchyNode<T> | null = node; n && n.parent; n = n.parent) out.unshift(n.id);
  return out;
}

/** Follows a drill path from the root; stops at the deepest id that still exists with children. */
export function resolvePath<T>(root: HierarchyNode<T>, path: readonly string[]): HierarchyNode<T> {
  let node = root;
  for (const id of path) {
    const next = node.children?.find((c) => c.id === id);
    if (!next || !next.children) break;
    node = next;
  }
  return node;
}
