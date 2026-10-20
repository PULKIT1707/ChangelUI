"use client";

// Treemap: squarified (or binary/slice/dice) nested rectangles with group headers, color by
// category, by value or on a diverging scale (market maps), auto-fitting labels and drill zoom.
// Drilling zooms like a camera: the clicked group grows to fill the chart, its children follow,
// new levels unfold from inside it and the rest slides off screen; going up reverses it. Data
// updates tween every rectangle; arrow keys move spatially to the nearest cell in that direction.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import type { Accessor } from "./core/cartesian-model";
import { categoricalColor, divergingColor, mix, sequentialColor, withOpacity } from "./core/color";
import { ChartBreadcrumb, useDrillPath } from "./core/drill";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { ancestors, descendants, treemap, type HierarchyNode, type Tile } from "./core/hierarchy";
import { buildTree, pathOf, resolvePath, type TreeItem } from "./core/tree-input";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
/** Camera-like zoom: quick start, long soft landing, never overshoots (sizes can't go negative). */
const zoom: Transition = { duration: 0.62, ease: [0.22, 1, 0.36, 1] };
const HEADER = 22;

export interface TreemapNodeInfo<T> {
  id: string;
  label: string;
  value: number;
  /** The source row (null for a synthetic root). */
  datum: T | null;
  /** Depth below the root (1 = top-level group). */
  depth: number;
  /** Share of the parent's value (0..1). */
  shareOfParent: number;
  /** Share of the current view's total (0..1). */
  shareOfView: number;
  /** Labels from the root's child down to this node. */
  trail: string[];
  /** Drill path of this node (ids below the root). */
  path: string[];
  childCount: number;
}

export type TreemapColor<T> = "category" | "value" | "diverging" | ((node: TreemapNodeInfo<T>) => string);

export interface TreemapChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  /** A nested root (children in `d.children`), an array of roots, or flat rows with `parentId`. */
  data: T | readonly T[];
  /** Leaf size: a column name or a function. Parents sum their children. */
  value: Accessor<T, number | null | undefined>;
  label: Accessor<T, string>;
  getChildren?: (d: T) => readonly T[] | null | undefined;
  /** Stable ids (required for flat rows). Default: the label path. */
  getId?: (d: T) => string;
  /** Flat rows: the parent id. */
  parentId?: (d: T) => string | null | undefined;
  /** Root label (breadcrumb, synthetic root). Default "All". */
  rootLabel?: string;
  /**
   * "category" tints each top-level group with a palette color, "value" uses the sequential ramp,
   * "diverging" maps `colorValue` around 0 (e.g. % change). Default "category".
   */
  color?: TreemapColor<T>;
  /** Value for "value" / "diverging" coloring. Default: the node value. */
  colorValue?: (d: T) => number | null | undefined;
  /** Formats colorValue in the tooltip, e.g. a signed percent. */
  formatColorValue?: (v: number) => string;
  /** Tooltip label for colorValue. Default "Change". */
  colorValueLabel?: string;
  /** Tiling. "binary" keeps neighbors stable across updates. Default "squarify". */
  tile?: Tile;
  /** Levels drawn below the current view. Default 2 (groups with headers, then their children). */
  maxDepth?: number;
  /** Group headers with label and value. Default true. */
  headers?: boolean;
  /** Gap between cells in px. Default 2. */
  padding?: number;
  /** Height in px. Default 380. */
  height?: number;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** The breadcrumb above the chart. Default true. */
  breadcrumb?: boolean;
  tableToggle?: boolean;
  /** Drill path (ids below the root). Controlled with onPathChange. */
  path?: readonly string[];
  defaultPath?: readonly string[];
  onPathChange?: (path: string[]) => void;
  /** Click or Enter on a cell (drillable groups also drill). */
  onNodeClick?: (node: TreemapNodeInfo<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveNodeChange?: (node: TreemapNodeInfo<T> | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Cell<T> {
  node: HierarchyNode<TreeItem<T>>;
  rect: Rect;
  /** Drawn with visible children (a group with a header). */
  group: boolean;
  /** Relative depth below the view (1..maxDepth). */
  level: number;
  fill: string;
  ink: string;
  /** Legend / tooltip swatch color. */
  swatch: string;
  /** Top-level group under the view (for hover fade and drilling). */
  top: HierarchyNode<TreeItem<T>>;
}

interface Layout<T> {
  focus: HierarchyNode<TreeItem<T>>;
  cells: Cell<T>[];
  byId: Map<string, Rect>;
  W: number;
  H: number;
}

/** Affine map that takes rect a onto rect b. */
type Affine = { sx: number; sy: number; tx: number; ty: number };
const IDENTITY: Affine = { sx: 1, sy: 1, tx: 0, ty: 0 };
function affine(a: Rect, b: Rect): Affine {
  const sx = a.w > 0 ? b.w / a.w : 1;
  const sy = a.h > 0 ? b.h / a.h : 1;
  return { sx, sy, tx: b.x - a.x * sx, ty: b.y - a.y * sy };
}
function apply(t: Affine, r: Rect): Rect {
  return { x: r.x * t.sx + t.tx, y: r.y * t.sy + t.ty, w: Math.max(0.01, r.w * t.sx), h: Math.max(0.01, r.h * t.sy) };
}
const toAttrs = (r: Rect) => ({ x: r.x, y: r.y, width: Math.max(0.01, r.w), height: Math.max(0.01, r.h) });

function TreemapChartInner<T>(props: TreemapChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    value,
    label,
    getChildren,
    getId,
    parentId,
    rootLabel = "All",
    color = "category",
    colorValue,
    formatColorValue,
    colorValueLabel = "Change",
    tile = "squarify",
    maxDepth = 2,
    headers = true,
    padding = 2,
    height = 380,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    breadcrumb = true,
    tableToggle = false,
    path: pathProp,
    defaultPath,
    onPathChange,
    onNodeClick,
    onActiveNodeChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width, measured } = useChartSize(boxRef, { initialWidth, height });
  const W = Math.max(120, width);
  const H = height;
  const drill = useDrillPath({ path: pathProp, defaultPath, onPathChange });
  const [hover, setHover] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);

  const root = React.useMemo(
    () => buildTree<T>({ data, value, label, getChildren, id: getId, parentId, rootLabel }),
    [data, value, label, getChildren, getId, parentId, rootLabel],
  );
  const focus = React.useMemo(() => resolvePath(root, drill.path), [root, drill.path]);

  // Color domain for value / diverging coloring (over the leaves of the whole tree).
  const colorOf = React.useMemo(() => {
    const cv = (n: HierarchyNode<TreeItem<T>>) => {
      if (colorValue && n.data.datum) {
        const v = Number(colorValue(n.data.datum));
        return Number.isFinite(v) ? v : null;
      }
      return n.value;
    };
    let lo = Infinity;
    let hi = -Infinity;
    for (const n of descendants(root)) {
      if (n.children) continue;
      const v = cv(n);
      if (v === null) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    return { cv, lo, hi };
  }, [root, colorValue]);

  const info = React.useCallback(
    (node: HierarchyNode<TreeItem<T>>, view: HierarchyNode<TreeItem<T>>): TreemapNodeInfo<T> => ({
      id: node.id,
      label: node.data.label,
      value: node.value,
      datum: node.data.datum,
      depth: node.depth,
      shareOfParent: node.parent && node.parent.value ? node.value / node.parent.value : 1,
      shareOfView: view.value ? node.value / view.value : 0,
      trail: ancestors(node)
        .reverse()
        .slice(1)
        .map((n) => n.data.label),
      path: pathOf(node),
      childCount: node.children?.length ?? 0,
    }),
    [],
  );

  const layout = React.useMemo<Layout<T>>(() => {
    // Lay the view out to fill the chart; groups then re-tile their children under a header.
    treemap(focus, { width: W, height: H, tile, paddingInner: padding });
    const cells: Cell<T>[] = [];
    const byId = new Map<string, Rect>();
    byId.set(focus.id, { x: 0, y: 0, w: W, h: H });
    const groups = focus.children ?? [];
    const leafValueMax = new Map<HierarchyNode<TreeItem<T>>, number>();
    const visit = (n: HierarchyNode<TreeItem<T>>, top: HierarchyNode<TreeItem<T>>, groupIndex: number) => {
      const level = n.depth - focus.depth;
      const group = !!n.children && level < maxDepth && n.value > 0;
      const rect: Rect = { x: n.x0, y: n.y0, w: Math.max(0, n.x1 - n.x0), h: Math.max(0, n.y1 - n.y0) };
      let fill: string;
      let ink = "var(--pui-foreground)";
      let swatch = categoricalColor(groupIndex);
      if (typeof color === "function") fill = color(info(n, focus));
      else if (color === "category") {
        const base = categoricalColor(groupIndex);
        if (group) fill = mix(base, "var(--pui-background)", level === 1 ? 0.16 : 0.26);
        else {
          const peak = n.parent ? (leafValueMax.get(n.parent) ?? n.value) : n.value;
          fill = mix(base, "var(--pui-background)", 0.34 + 0.36 * (peak ? Math.sqrt(n.value / peak) : 1));
        }
      } else {
        const v = colorOf.cv(n);
        if (group) fill = mix("var(--pui-muted-foreground)", "var(--pui-background)", 0.1);
        else if (v === null) fill = "var(--pui-muted)";
        else if (color === "diverging") {
          fill = divergingColor(v, colorOf.lo, colorOf.hi, 0);
          const span = Math.max(Math.abs(colorOf.lo), Math.abs(colorOf.hi)) || 1;
          if (Math.abs(v / span) > 0.55) ink = "var(--pui-background)";
        } else {
          const t = colorOf.hi > colorOf.lo ? (v - colorOf.lo) / (colorOf.hi - colorOf.lo) : 1;
          fill = sequentialColor(0.12 + 0.88 * t);
          if (t > 0.55) ink = "var(--pui-background)";
        }
      }
      if (color !== "category" && !group) swatch = fill;
      cells.push({ node: n, rect, group, level, fill, ink, swatch, top });
      byId.set(n.id, rect);
      if (group && n.children) {
        leafValueMax.set(n, Math.max(...n.children.map((c) => c.value)));
        for (const c of n.children) visit(c, top, groupIndex);
      }
    };
    // Groups get header room: shrink each group's children into the area under its header.
    const inset = (n: HierarchyNode<TreeItem<T>>) => {
      if (!n.children || n.depth - focus.depth >= maxDepth) return;
      const x0 = n.x0 + padding;
      const x1 = n.x1 - padding;
      const y0 = n.y0 + (headers ? HEADER : padding);
      const y1 = n.y1 - padding;
      // Too small for a header: the children fill the cell.
      if (x1 - x0 < 4 || y1 - y0 < 4) treemapChildren(n, n.x0, n.y0, n.x1, n.y1);
      else treemapChildren(n, x0, y0, x1, y1);
      for (const c of n.children) inset(c);
    };
    const treemapChildren = (n: HierarchyNode<TreeItem<T>>, x0: number, y0: number, x1: number, y1: number) => {
      // Lay the subtree out in its own box, then shift it into place.
      const w = Math.max(0, x1 - x0);
      const h = Math.max(0, y1 - y0);
      const saved = { x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1 };
      treemap(n, { width: w, height: h, tile, paddingInner: padding });
      for (const d of descendants(n)) {
        if (d === n) continue;
        d.x0 += x0;
        d.x1 += x0;
        d.y0 += y0;
        d.y1 += y0;
      }
      Object.assign(n, saved);
    };
    for (const g of groups) inset(g);
    groups.forEach((g, i) => visit(g, g, i));
    return { focus, cells, byId, W, H };
  }, [focus, W, H, tile, padding, headers, maxDepth, color, colorOf, info]);

  // Previous layout (derived state, set during render) for the drill camera and enter/exit.
  // Client-only mounts wait for the real size, then bloom in; SSR / hydrated charts show at once.
  const ready = !anim.entrance || measured;
  const shown = ready ? layout : null;
  const [frames, setFrames] = React.useState<{ cur: Layout<T> | null; prev: Layout<T> | null }>({ cur: shown, prev: null });
  if (frames.cur !== shown) setFrames({ cur: shown, prev: frames.cur });
  const prev = frames.cur !== shown ? frames.cur : frames.prev;
  const entering = anim.entrance && !anim.reducedMotion && !!shown && !prev;

  // Camera: the anchor is the deeper of the old and new views, present in both layouts.
  const camera = React.useMemo(() => {
    if (!prev || !shown || prev.focus === layout.focus) return { enter: IDENTITY, exit: IDENTITY, drill: false };
    const full: Rect = { x: 0, y: 0, w: layout.W, h: layout.H };
    const inNew = layout.byId.get(prev.focus.id);
    if (prev.byId.has(layout.focus.id) && !inNew) {
      // Drilled in: the new view was a cell; new cells unfold from it, old ones fly out.
      const was = prev.byId.get(layout.focus.id) as Rect;
      return { enter: affine(full, was), exit: affine(was, full), drill: true };
    }
    // Drilled up (one or more levels): the old view becomes a cell (or sits inside one).
    let anchor: HierarchyNode<TreeItem<T>> | null = prev.focus;
    while (anchor && !layout.byId.has(anchor.id)) anchor = anchor.parent;
    const now = anchor ? (layout.byId.get(anchor.id) as Rect) : full;
    return { enter: affine(now, full), exit: affine(full, now), drill: true };
  }, [prev, shown, layout]);
  const resized = !!prev && (prev.W !== layout.W || prev.H !== layout.H);
  const motionOn = !anim.reducedMotion && anim.updates && !resized && measured;
  const transition = motionOn ? zoom : instant;

  const cells = React.useMemo(() => shown?.cells ?? [], [shown]);
  const viewInfo = (n: HierarchyNode<TreeItem<T>>) => info(n, layout.focus);
  const cellById = React.useMemo(() => new Map(cells.map((c) => [c.node.id, c])), [cells]);
  // Keyboard targets: drawn cells that are not groups (the deepest visible level).
  const targets = React.useMemo(() => cells.filter((c) => !c.group && c.rect.w > 0.5 && c.rect.h > 0.5), [cells]);
  const activeId = focusId ?? hover;
  const active = activeId ? (cellById.get(activeId) ?? null) : null;

  const lastActive = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastActive.current === activeId) return;
    lastActive.current = activeId;
    onActiveNodeChange?.(active ? viewInfo(active.node) : null);
  });

  const describe = (c: Cell<T>) => {
    const i = viewInfo(c.node);
    const parent = c.node.parent && c.node.parent !== layout.focus ? `, ${pct.format(i.shareOfParent)} of ${c.node.parent.data.label}` : "";
    const kids = c.node.children?.length ? `, ${c.node.children.length} children` : "";
    return `${i.trail.join(" \u203a ")}: ${fmt(i.value)}, ${pct.format(i.shareOfView)} of ${layout.focus.data.label}${parent}${kids}.`;
  };

  const drillTarget = (c: Cell<T>): HierarchyNode<TreeItem<T>> | null => {
    // Clicking any cell drills into its top-level group (or the group itself).
    const g = c.group ? c.node : c.top;
    return g.children && g.children.length && g !== layout.focus ? g : null;
  };
  const goTo = (node: HierarchyNode<TreeItem<T>>, viaKeyboard: boolean) => {
    drill.setPath(pathOf(node));
    setHover(null);
    setAnnouncement(`${node.data.label}: ${fmt(node.value)}, ${node.children?.length ?? 0} items. Escape goes up.`);
    if (viaKeyboard) setFocusId(null);
  };
  const goUp = () => {
    const parent = layout.focus.parent;
    if (!parent) return false;
    drill.setPath(pathOf(parent));
    setHover(null);
    setFocusId(null);
    setAnnouncement(`Up to ${parent.data.label}: ${fmt(parent.value)}.`);
    return true;
  };
  const activate = (c: Cell<T>, event: React.PointerEvent | React.KeyboardEvent) => {
    onNodeClick?.(viewInfo(c.node), event);
    const target = drillTarget(c);
    if (target) goTo(target, event.type === "keydown");
  };

  const hitTest = (event: React.PointerEvent<HTMLDivElement>): Cell<T> | null => {
    const r = event.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = ((event.clientX - r.left) / r.width) * W;
    const y = ((event.clientY - r.top) / r.height) * H;
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i] as Cell<T>;
      if (x >= c.rect.x && x <= c.rect.x + c.rect.w && y >= c.rect.y && y <= c.rect.y + c.rect.h) return c;
    }
    return null;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const cur = focusId ? (cellById.get(focusId) ?? null) : null;
    let next: Cell<T> | null = null;
    const k = event.key;
    if (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown") {
      if (!cur) next = targets[0] ?? null;
      else {
        const cx = cur.rect.x + cur.rect.w / 2;
        const cy = cur.rect.y + cur.rect.h / 2;
        let best = Infinity;
        for (const c of targets) {
          if (c === cur) continue;
          const dx = c.rect.x + c.rect.w / 2 - cx;
          const dy = c.rect.y + c.rect.h / 2 - cy;
          const along = k === "ArrowRight" ? dx : k === "ArrowLeft" ? -dx : k === "ArrowDown" ? dy : -dy;
          if (along <= 1) continue;
          const across = k === "ArrowRight" || k === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);
          const score = along + across * 2;
          if (score < best) {
            best = score;
            next = c;
          }
        }
        if (!next) next = cur;
      }
    } else if (k === "Home") next = targets[0] ?? null;
    else if (k === "End") next = targets[targets.length - 1] ?? null;
    else if ((k === "Enter" || k === " ") && cur) {
      event.preventDefault();
      activate(cur, event);
      return;
    } else if (k === "Escape" || k === "Backspace") {
      if (focusId && k === "Escape" && !layout.focus.parent) {
        event.preventDefault();
        setFocusId(null);
        return;
      }
      if (goUp()) event.preventDefault();
      return;
    } else if (k === "t" || k === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocusId(next.node.id);
    setAnnouncement(describe(next));
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : "Treemap");
  const summaryText = (() => {
    if (summary) return summary;
    const kids = layout.focus.children ?? [];
    if (!kids.length) return `${layout.focus.data.label}: no data.`;
    const topThree = kids
      .slice(0, 3)
      .map((c) => `${c.data.label} ${pct.format(layout.focus.value ? c.value / layout.focus.value : 0)}`)
      .join(", ");
    return `Treemap of ${layout.focus.data.label}, total ${fmt(layout.focus.value)} across ${kids.length} groups. Largest: ${topThree}.`;
  })();

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active) {
    const ax = active.rect.x + Math.min(active.rect.w / 2, 60);
    const ay = active.rect.y + Math.min(active.rect.h / 2, 30);
    tip = { left: ax / W, top: ay / H, flipX: ax / W > 0.62, below: ay < 110 };
  }
  const activeInfo = active ? viewInfo(active.node) : null;
  const activeCv = active && color !== "category" && typeof color !== "function" && colorValue ? colorOf.cv(active.node) : null;

  const exitCustom = camera;
  const cellTransition = (c: Cell<T>, i: number): Transition => {
    if (entering) return { ...zoom, delay: Math.min(0.45, (c.level - 1) * 0.12 + i * 0.004) };
    return motionOn ? zoom : instant;
  };
  const initialRect = (c: Cell<T>): Rect | false => {
    if (prev?.byId.has(c.node.id)) return false;
    // Entrance: bloom from each cell's center.
    if (entering) return { x: c.rect.x + c.rect.w / 2, y: c.rect.y + c.rect.h / 2, w: 0.01, h: 0.01 };
    if (!motionOn || !prev) return false;
    if (camera.drill) return apply(camera.enter, c.rect);
    return { x: c.rect.x + c.rect.w / 2, y: c.rect.y + c.rect.h / 2, w: 0.01, h: 0.01 };
  };

  const dimmed = (c: Cell<T>) => !!active && active.top !== c.top;

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-hidden rounded-pui-md")}>
      <AnimatePresence custom={exitCustom} initial={false}>
        {cells.map((c, i) => {
          const r = c.rect;
          const from = initialRect(c);
          const isActive = active?.node.id === c.node.id;
          return (
            <motion.rect
              key={c.node.id}
              custom={exitCustom}
              variants={{
                exit: (cam: typeof camera) => {
                  const to = cam.drill ? apply(cam.exit, r) : { x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0.01, h: 0.01 };
                  return { ...toAttrs(to), opacity: 0, transition: motionOn ? zoom : instant };
                },
              }}
              initial={from ? { ...toAttrs(from), opacity: camera.drill ? 1 : 0 } : false}
              animate={{ ...toAttrs(r), opacity: dimmed(c) ? 0.42 : 1 }}
              exit="exit"
              transition={{ default: cellTransition(c, i), opacity: motionOn ? { duration: 0.18 } : instant }}
              rx={c.group ? 6 : 4}
              fill={c.fill}
              stroke={isActive ? "var(--pui-foreground)" : c.group ? withOpacity("var(--pui-foreground)", 0.08) : "transparent"}
              strokeWidth={isActive ? 2 : 1}
              style={{ transition: anim.reducedMotion ? undefined : "fill 0.35s ease, stroke 0.15s ease" }}
            />
          );
        })}
      </AnimatePresence>
    </svg>
  );

  // HTML labels: crisp text, truncation and wrapping; remount (fade) per view, glide on updates.
  const labels = (
    <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0")}>
      <AnimatePresence initial={false}>
        {cells.map((c) => {
          const r = c.rect;
          const show = c.group ? r.w >= 44 && r.h >= HEADER && headers : r.w >= 38 && r.h >= 20;
          if (!show) return null;
          const twoLines = !c.group && r.h >= 38 && r.w >= 48;
          const big = !c.group && r.w > 120 && r.h > 70;
          const style = { left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${((c.group ? HEADER : r.h) / H) * 100}%` };
          return (
            <motion.div
              key={`${layout.focus.id}|${c.node.id}`}
              initial={motionOn || entering ? { opacity: 0, ...style } : false}
              animate={{ opacity: dimmed(c) ? 0.55 : 1, ...style }}
              exit={{ opacity: 0, transition: { duration: motionOn ? 0.1 : 0 } }}
              transition={motionOn ? { default: zoom, opacity: { duration: 0.2, delay: camera.drill || entering ? 0.42 : 0 } } : instant}
              className={cn(blockReset, "absolute overflow-hidden", c.group ? "flex items-center gap-1.5 px-2" : "flex flex-col p-1.5")}
              style={{ color: c.ink }}
            >
              <span className={cn(blockReset, "truncate font-semibold leading-tight", c.group ? "text-[11px] uppercase tracking-wide" : big ? "text-sm" : "text-[11px]")}>{c.node.data.label}</span>
              {c.group || twoLines ? (
                <span className={cn(blockReset, "truncate tabular-nums leading-tight opacity-70", big ? "text-xs" : "text-[10.5px]")}>{fmt(c.node.value)}</span>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  const crumbs = ancestors(layout.focus)
    .reverse()
    .map((n) => ({ key: n.id || "__root", label: n.data.label, detail: n === layout.focus ? fmt(n.value) : undefined }));

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {breadcrumb ? (
        <ChartBreadcrumb
          items={crumbs}
          reducedMotion={anim.reducedMotion}
          onNavigate={(i) => {
            const target = ancestors(layout.focus).reverse()[i];
            if (target && target !== layout.focus) {
              drill.setPath(pathOf(target));
              setHover(null);
              setFocusId(null);
            }
          }}
        />
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        {svg}
        {labels}
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive treemap"
          aria-label={`${nameText}, showing ${layout.focus.data.label}. Use arrow keys to move between cells, Enter to drill in, Escape to go up.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(hitTest(event)?.node.id ?? null)}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            if (event.button !== 0) return;
            const c = hitTest(event);
            if (c) activate(c, event);
          }}
          onContextMenu={(event) => {
            if (goUp()) event.preventDefault();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocusId(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", active && drillTarget(active) ? "cursor-zoom-in" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip && !!activeInfo} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeInfo && active ? (
            <>
              {activeInfo.trail.length > 1 ? (
                <div className={cn(blockReset, "mb-0.5 max-w-56 truncate text-[10.5px] text-pui-muted-foreground")}>{activeInfo.trail.slice(0, -1).join(" \u203a ")}</div>
              ) : null}
              <div className={cn(blockReset, "flex items-center gap-2")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: active.swatch }} />
                <span className={cn(blockReset, "text-xs font-semibold")}>{activeInfo.label}</span>
              </div>
              <div className={cn(blockReset, "mb-1 mt-0.5 text-sm font-semibold tabular-nums")}>{fmt(activeInfo.value)}</div>
              <TipRow label={`Of ${layout.focus.data.label}`} value={pct.format(activeInfo.shareOfView)} />
              {active.node.parent && active.node.parent !== layout.focus ? <TipRow label={`Of ${active.node.parent.data.label}`} value={pct.format(activeInfo.shareOfParent)} /> : null}
              {activeCv !== null ? (
                <TipRow label={colorValueLabel} value={formatColorValue ? formatColorValue(activeCv) : fmt(activeCv)} tone={color === "diverging" ? (activeCv >= 0 ? "up" : "down") : undefined} />
              ) : null}
              <div className={cn(blockReset, "mt-1.5 h-1 w-36 overflow-hidden rounded-pui-full bg-pui-muted")}>
                <motion.div
                  className={cn(blockReset, "h-full rounded-pui-full bg-pui-foreground/70")}
                  initial={false}
                  animate={{ width: `${activeInfo.shareOfView * 100}%` }}
                  transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 260, damping: 30 }}
                />
              </div>
              {drillTarget(active) ? <div className={cn(blockReset, "mt-1.5 text-[10.5px] text-pui-muted-foreground")}>Click to open {drillTarget(active)?.data.label}</div> : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Arrow keys move to the nearest cell in that direction, Home and End jump to the first and last, Enter opens a group, Escape or Backspace goes up a level, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={`${nameText}: ${layout.focus.data.label}`}
        visible={tableVisible}
        columns={["Item", "Value", `Of ${layout.focus.data.label}`, "Of parent"]}
        rows={cells.map((c) => {
          const i = viewInfo(c.node);
          return [i.trail.slice(layout.focus.depth).join(" \u203a "), fmt(i.value), pct.format(i.shareOfView), pct.format(i.shareOfParent)];
        })}
      />
    </ChartFigure>
  );
}

/**
 * Treemap with nested group headers, category / value / diverging color, auto-fit labels, a rich
 * tooltip, camera-style drill zoom with a breadcrumb, morphing updates and spatial arrow keys.
 */
export const TreemapChart = React.forwardRef(TreemapChartInner) as (<T>(props: TreemapChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
TreemapChart.displayName = "TreemapChart";
