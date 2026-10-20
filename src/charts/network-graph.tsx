"use client";

// Network graph on the original force core: a deterministic seeded layout (the server renders the
// settled graph), a live settle for client-only mounts, drag to pin (the rest of the graph reacts
// live, double-click unpins), Ctrl/Cmd+wheel zoom and drag-to-pan, neighbor highlighting with a
// rich tooltip, search that flies to a node, and arrow keys that walk to the neighbor in that
// direction. Positions live in one Float64Array; React renders once per simulation frame.
import { animate, AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion } from "./core/a11y";
import { categoricalColor, withOpacity } from "./core/color";
import { createForceSimulation, type ForceSimulation } from "./core/force";
import { estimateTextWidth, formatNumber, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const PRECOMPUTE_MAX = 400;
/** Smallest on-screen node radius and label size in px, at any zoom. */
const MIN_NODE_PX = 6;
const LABEL_PX = 11;

export interface NetworkNodeDatum {
  id: string;
  label?: string;
  /** Color group (palette color per group). */
  group?: string;
  /** Size; default the node's degree. */
  value?: number;
}

export interface NetworkLinkDatum {
  source: string;
  target: string;
  /** Link weight (thicker, shorter springs). Default 1. */
  value?: number;
}

export interface NetworkNodeInfo {
  id: string;
  label: string;
  group: string | null;
  value: number;
  degree: number;
  neighbors: string[];
  pinned: boolean;
}

export interface NetworkGraphProps<N extends NetworkNodeDatum = NetworkNodeDatum, L extends NetworkLinkDatum = NetworkLinkDatum>
  extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  nodes: readonly N[];
  links: readonly L[];
  /** Node radius range in px, mapped by sqrt(value). Default [5, 18]. */
  nodeSize?: readonly [number, number];
  /** Spring rest length. Default 54. */
  linkDistance?: number;
  /** Repulsion per node (negative). Default -170. */
  charge?: number;
  /** Labels: "auto" (biggest nodes, the hovered node and its neighbors), "all" or "none". Default "auto". */
  labels?: "auto" | "all" | "none";
  /** A search box that highlights matches and flies to them. Default false. */
  search?: boolean;
  /** Drag nodes to pin them; double-click unpins. Default true. */
  draggable?: boolean;
  /** Ctrl/Cmd+wheel zoom, drag-to-pan and zoom buttons. Default true. */
  zoomable?: boolean;
  /** Height in px. Default 420. */
  height?: number;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onNodeClick?: (node: NetworkNodeInfo, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveNodeChange?: (node: NetworkNodeInfo | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface View {
  k: number;
  tx: number;
  ty: number;
}

interface Prepared {
  ids: string[];
  index: Map<string, number>;
  edges: Array<{ s: number; t: number; v: number }>;
  neighbors: number[][];
  degree: number[];
  radius: number[];
  groups: string[];
  color: string[];
  /** Settled positions (x, y pairs) or a seeded circle for very large graphs. */
  settled: Float64Array;
  /** Seeded start positions (for the live settle). */
  start: Float64Array;
}

function simInputs(p: Pick<Prepared, "ids" | "edges" | "radius">, linkDistance: number, maxV: number, at?: Float64Array) {
  const nodes = p.ids.map((id, i) => ({ id, radius: (p.radius[i] as number) + 3, x: at ? (at[i * 2] as number) : undefined, y: at ? (at[i * 2 + 1] as number) : undefined }));
  const links = p.edges.map((e) => ({ source: p.ids[e.s] as string, target: p.ids[e.t] as string, distance: linkDistance * (1.15 - 0.35 * Math.sqrt(e.v / maxV)) }));
  return { nodes, links };
}

const positionsOf = (sim: ForceSimulation) => {
  const out = new Float64Array(sim.nodes.length * 2);
  sim.nodes.forEach((n, i) => {
    out[i * 2] = n.x;
    out[i * 2 + 1] = n.y;
  });
  return out;
};

/** The view that fits every node (plus a label margin) into the W x H stage with padding. */
function fitView(pos: Float64Array, radius: readonly number[], W: number, H: number): View {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i * 2 < pos.length; i++) {
    const r = (radius[i] ?? 6) + 14;
    const x = pos[i * 2] as number;
    const y = pos[i * 2 + 1] as number;
    x0 = Math.min(x0, x - r);
    x1 = Math.max(x1, x + r);
    y0 = Math.min(y0, y - r);
    y1 = Math.max(y1, y + r);
  }
  if (!Number.isFinite(x0)) return { k: 1, tx: W / 2, ty: H / 2 };
  const k = Math.max(0.15, Math.min(1.6, (W - 48) / (x1 - x0 || 1), (H - 48) / (y1 - y0 || 1)));
  return { k, tx: W / 2 - ((x0 + x1) / 2) * k, ty: H / 2 - ((y0 + y1) / 2) * k };
}

function NetworkGraphInner<N extends NetworkNodeDatum, L extends NetworkLinkDatum>(props: NetworkGraphProps<N, L>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    nodes,
    links,
    nodeSize = [5, 18],
    linkDistance = 54,
    charge = -170,
    labels = "auto",
    search = false,
    draggable = true,
    zoomable = true,
    height = 420,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
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
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const W = Math.max(200, width);
  const H = height;
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);

  // Primitive deps: a fresh nodeSize array each render (the default, or an inline literal) must
  // not rebuild the layout, or the render-time "new data" reset below would loop forever.
  const [r0, r1] = nodeSize;
  const prepared = React.useMemo<Prepared>(() => {
    const ids = nodes.map((n) => n.id);
    const index = new Map(ids.map((id, i) => [id, i]));
    const edges: Prepared["edges"] = [];
    const seen = new Set<string>();
    for (const l of links) {
      const s = index.get(l.source);
      const t = index.get(l.target);
      if (s === undefined || t === undefined || s === t) continue;
      const key = s < t ? `${s}-${t}` : `${t}-${s}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ s, t, v: Math.max(1e-6, l.value ?? 1) });
    }
    const neighbors: number[][] = ids.map(() => []);
    for (const e of edges) {
      neighbors[e.s]?.push(e.t);
      neighbors[e.t]?.push(e.s);
    }
    const degree = neighbors.map((n) => n.length);
    const sizes = nodes.map((n, i) => Math.max(0, n.value ?? degree[i] ?? 0));
    const maxSize = Math.max(1e-9, ...sizes);
    const radius = sizes.map((v) => r0 + (r1 - r0) * Math.sqrt(v / maxSize));
    const groups: string[] = [];
    const color = nodes.map((n) => {
      if (n.group === undefined) return categoricalColor(0);
      let g = groups.indexOf(n.group);
      if (g < 0) g = groups.push(n.group) - 1;
      return categoricalColor(g);
    });
    const maxV = Math.max(1e-9, ...edges.map((e) => e.v));
    const base = { ids, edges, radius };
    const input = simInputs(base, linkDistance, maxV);
    const sim = createForceSimulation(input.nodes, input.links, { charge, linkDistance, collide: 0.8 });
    const start = positionsOf(sim);
    let settled: Float64Array;
    if (ids.length <= PRECOMPUTE_MAX) {
      sim.run(300);
      settled = positionsOf(sim);
    } else {
      // Too big to settle during render: a seeded circle, then the client settles it live.
      settled = new Float64Array(ids.length * 2);
      const R = 18 * Math.sqrt(ids.length);
      ids.forEach((_, i) => {
        const a = (i / ids.length) * Math.PI * 2;
        settled[i * 2] = R * Math.cos(a);
        settled[i * 2 + 1] = R * Math.sin(a);
      });
    }
    return { ids, index, edges, neighbors, degree, radius, groups, color, settled, start };
  }, [nodes, links, r0, r1, linkDistance, charge]);

  const maxEdge = React.useMemo(() => Math.max(1e-9, ...prepared.edges.map((e) => e.v)), [prepared]);
  const live = anim.entrance || prepared.ids.length > PRECOMPUTE_MAX;
  const [positions, setPositions] = React.useState<Float64Array>(() => (live && !anim.reducedMotion ? prepared.start : prepared.settled));
  const [prevPrepared, setPrevPrepared] = React.useState(prepared);
  const [pinned, setPinned] = React.useState<ReadonlySet<string>>(() => new Set());
  // The positions the default view fits: the precomputed layout until a live settle finishes.
  const [fitBasis, setFitBasis] = React.useState<Float64Array>(() => prepared.settled);
  if (prevPrepared !== prepared) {
    // New data: nodes that stay keep their place and the simulation carries them to the new layout.
    const from = Float64Array.from(prepared.start);
    prepared.ids.forEach((id, i) => {
      const j = prevPrepared.index.get(id);
      if (j === undefined) return;
      from[i * 2] = positions[j * 2] as number;
      from[i * 2 + 1] = positions[j * 2 + 1] as number;
    });
    setPrevPrepared(prepared);
    setPositions(anim.reducedMotion ? prepared.settled : from);
    setFitBasis(prepared.settled);
    setPinned(new Set());
  }
  const positionsRef = useLatestRef(positions);
  const simRef = React.useRef<ForceSimulation | null>(null);
  const rafRef = React.useRef(0);
  const [view, setView] = React.useState<View | null>(null);
  const fit = React.useMemo(() => fitView(fitBasis, prepared.radius, W, H), [fitBasis, prepared.radius, W, H]);
  const v = view ?? fit;
  // True from a mount or data change until its settle ends, unless the viewer zooms, pans or drags.
  const autoFitRef = React.useRef(true);
  const onSettledRef = React.useRef<(pos: Float64Array) => void>(() => {});

  // The simulation loop: ticks while the layout is warm, rendering one frame per tick batch.
  const runLoop = React.useCallback((ticksPerFrame: number) => {
    cancelAnimationFrame(rafRef.current);
    const step = () => {
      const sim = simRef.current;
      if (!sim) return;
      sim.tick(ticksPerFrame);
      const pos = positionsOf(sim);
      setPositions(pos);
      if (!sim.settled()) rafRef.current = requestAnimationFrame(step);
      else onSettledRef.current(pos);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);
  const ensureSim = React.useCallback(
    (from: Float64Array) => {
      if (simRef.current && simRef.current.nodes.length === prepared.ids.length) return simRef.current;
      const input = simInputs(prepared, linkDistance, maxEdge, from);
      const sim = createForceSimulation(input.nodes, input.links, { charge, linkDistance, collide: 0.8, alpha: 0.05 });
      for (const id of pinned) {
        const i = prepared.index.get(id);
        if (i !== undefined) sim.pin(id, from[i * 2] as number, from[i * 2 + 1] as number);
      }
      simRef.current = sim;
      return sim;
    },
    [prepared, linkDistance, maxEdge, charge, pinned],
  );
  // Live mounts settle visibly (3 ticks per frame, about 1.5 s); data updates re-settle from where
  // the nodes are. Hydrated charts start settled and only simulate when a node is dragged.
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    const first = !mountedRef.current;
    mountedRef.current = true;
    simRef.current = null;
    autoFitRef.current = true;
    if (anim.reducedMotion || (first && !live)) return;
    const input = simInputs(prepared, linkDistance, maxEdge, first ? prepared.start : positionsRef.current);
    simRef.current = createForceSimulation(input.nodes, input.links, { charge, linkDistance, collide: 0.8, alpha: first ? 1 : 0.6 });
    runLoop(prepared.ids.length > 200 ? 2 : 3);
    return () => cancelAnimationFrame(rafRef.current);
  }, [prepared, live, anim.reducedMotion, linkDistance, maxEdge, charge, runLoop, positionsRef]);
  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const [dragging, setDragging] = React.useState<"node" | "pan" | null>(null);

  const labelOf = (i: number) => nodes[i]?.label ?? prepared.ids[i] ?? "";
  const info = (i: number): NetworkNodeInfo => ({
    id: prepared.ids[i] as string,
    label: labelOf(i),
    group: nodes[i]?.group ?? null,
    value: nodes[i]?.value ?? (prepared.degree[i] as number),
    degree: prepared.degree[i] as number,
    neighbors: (prepared.neighbors[i] ?? []).map((j) => prepared.ids[j] as string),
    pinned: pinned.has(prepared.ids[i] as string),
  });

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out: number[] = [];
    nodes.forEach((n, i) => {
      if ((n.label ?? n.id).toLowerCase().includes(q)) out.push(i);
    });
    return out;
  }, [query, nodes]);
  const matchSet = React.useMemo(() => (matches ? new Set(matches) : null), [matches]);

  const active = focus ?? hover;
  const near = React.useMemo(() => (active === null ? null : new Set([active, ...(prepared.neighbors[active] ?? [])])), [active, prepared]);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveNodeChange?.(active === null ? null : info(active));
  });

  const labelSet = React.useMemo(() => {
    if (labels === "none") return new Set<number>();
    if (labels === "all") return new Set(prepared.ids.map((_, i) => i));
    const ranked = prepared.ids.map((_, i) => i).sort((a, b) => (prepared.radius[b] as number) - (prepared.radius[a] as number));
    return new Set(ranked.slice(0, Math.min(12, Math.ceil(prepared.ids.length * 0.15))));
  }, [labels, prepared]);

  // Coordinates: pointer -> chart px -> world.
  const toChart = (event: { clientX: number; clientY: number }) => {
    const r = overlayRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: 0, y: 0 };
    return { x: ((event.clientX - r.left) / r.width) * W, y: ((event.clientY - r.top) / r.height) * H };
  };
  const toWorld = (p: { x: number; y: number }) => ({ x: (p.x - v.tx) / v.k, y: (p.y - v.ty) / v.k });
  const nodeAt = (p: { x: number; y: number }): number | null => {
    let best: number | null = null;
    let bestD = Infinity;
    for (let i = 0; i < prepared.ids.length; i++) {
      const sx = (positions[i * 2] as number) * v.k + v.tx;
      const sy = (positions[i * 2 + 1] as number) * v.k + v.ty;
      const d = Math.hypot(sx - p.x, sy - p.y);
      const reach = Math.max((prepared.radius[i] as number) * v.k, MIN_NODE_PX) + 6;
      if (d <= reach && d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const animateView = (to: View) => {
    const from = v;
    if (anim.reducedMotion) {
      setView(to);
      return;
    }
    animate(0, 1, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (t) => setView({ k: from.k + (to.k - from.k) * t, tx: from.tx + (to.tx - from.tx) * t, ty: from.ty + (to.ty - from.ty) * t }),
    });
  };
  /** Glides to the view that fits `pos`, then makes it the default (reset) view. */
  const fitTo = (pos: Float64Array) => {
    const to = fitView(pos, prepared.radius, W, H);
    const settle = () => {
      setFitBasis(pos);
      setView(null);
    };
    if (anim.reducedMotion) settle();
    else {
      animateView(to);
      setTimeout(settle, 600);
    }
  };
  useIsomorphicLayoutEffect(() => {
    onSettledRef.current = (pos) => {
      if (autoFitRef.current) fitTo(pos);
      autoFitRef.current = false;
    };
  });
  const zoomBy = (factor: number, at = { x: W / 2, y: H / 2 }, smooth = true) => {
    autoFitRef.current = false;
    const k = Math.max(0.15, Math.min(6, v.k * factor));
    const wx = (at.x - v.tx) / v.k;
    const wy = (at.y - v.ty) / v.k;
    const next = { k, tx: at.x - wx * k, ty: at.y - wy * k };
    if (smooth) animateView(next);
    else setView(next);
  };
  const flyTo = (i: number) => {
    const k = Math.max(v.k, 1.3);
    animateView({ k, tx: W / 2 - (positions[i * 2] as number) * k, ty: H / 2 - (positions[i * 2 + 1] as number) * k });
  };

  // Ctrl/Cmd + wheel (and trackpad pinch) zooms around the pointer; a plain wheel scrolls the page.
  const zoomRef = useLatestRef(zoomBy);
  React.useEffect(() => {
    const el = overlayRef.current;
    if (!el || !zoomable) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: ((event.clientX - r.left) / r.width) * W, y: ((event.clientY - r.top) / r.height) * H };
      zoomRef.current(Math.exp(-event.deltaY * 0.0022), at, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomable, W, H, zoomRef]);

  const drag = React.useRef<{ kind: "node" | "pan"; index: number; pointer: number; sx: number; sy: number; view: View; moved: boolean } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const p = toChart(event);
    const hit = nodeAt(p);
    if (hit !== null && draggable) drag.current = { kind: "node", index: hit, pointer: event.pointerId, sx: p.x, sy: p.y, view: v, moved: false };
    else if (hit === null && zoomable) drag.current = { kind: "pan", index: -1, pointer: event.pointerId, sx: p.x, sy: p.y, view: v, moved: false };
    else return;
    autoFitRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const p = toChart(event);
    if (!d || d.pointer !== event.pointerId) {
      setHover(nodeAt(p));
      return;
    }
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 3) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(d.kind);
    }
    if (d.kind === "pan") {
      setView({ k: d.view.k, tx: d.view.tx + (p.x - d.sx), ty: d.view.ty + (p.y - d.sy) });
      return;
    }
    const w = toWorld(p);
    const id = prepared.ids[d.index] as string;
    if (anim.reducedMotion) {
      // Reduced motion: only the dragged node moves (no live simulation).
      setPositions((pos) => {
        const next = Float64Array.from(pos);
        next[d.index * 2] = w.x;
        next[d.index * 2 + 1] = w.y;
        return next;
      });
    } else {
      const sim = ensureSim(positions);
      sim.pin(id, w.x, w.y);
      if (sim.settled() || sim.alpha() < 0.25) {
        sim.reheat(Math.max(0.3, sim.alpha()), 0.3);
        runLoop(1);
      }
    }
    if (!pinned.has(id)) setPinned((s) => new Set(s).add(id));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d) event.currentTarget.releasePointerCapture?.(d.pointer);
    setDragging(null);
    if (d?.moved) {
      if (d.kind === "node") {
        simRef.current?.reheat(simRef.current.alpha(), 0);
        setAnnouncement(`Pinned ${labelOf(d.index)}. Double-click or press Enter to release.`);
      }
      return;
    }
    if (event.button !== 0) return;
    const hit = nodeAt(toChart(event));
    if (hit !== null) {
      setFocus(null);
      onNodeClick?.(info(hit), event);
    }
  };
  const unpin = (i: number) => {
    const id = prepared.ids[i] as string;
    if (!pinned.has(id)) return false;
    setPinned((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    if (!anim.reducedMotion) {
      const sim = ensureSim(positions);
      sim.pin(id, null);
      sim.reheat(0.3, 0);
      runLoop(1);
    }
    setAnnouncement(`Released ${labelOf(i)}.`);
    return true;
  };
  const togglePin = (i: number) => {
    if (unpin(i)) return;
    const id = prepared.ids[i] as string;
    setPinned((s) => new Set(s).add(id));
    if (!anim.reducedMotion) ensureSim(positions).pin(id, positions[i * 2] as number, positions[i * 2 + 1] as number);
    setAnnouncement(`Pinned ${labelOf(i)}.`);
  };
  const unpinAll = () => {
    if (!anim.reducedMotion && simRef.current) {
      for (const id of pinned) simRef.current.pin(id, null);
      simRef.current.reheat(0.4, 0);
      runLoop(1);
    }
    setPinned(new Set());
    setAnnouncement("Released all pinned nodes.");
  };

  const describe = (i: number) => {
    const ns = (prepared.neighbors[i] ?? []).map(labelOf);
    const g = nodes[i]?.group;
    return `${labelOf(i)}${g ? `, ${g}` : ""}: ${ns.length} connection${ns.length === 1 ? "" : "s"}${ns.length ? ` (${ns.slice(0, 6).join(", ")}${ns.length > 6 ? `, and ${ns.length - 6} more` : ""})` : ""}.${pinned.has(prepared.ids[i] as string) ? " Pinned." : ""}`;
  };
  const biggest = React.useMemo(() => {
    let best = 0;
    prepared.radius.forEach((r, i) => {
      if (r > (prepared.radius[best] as number)) best = i;
    });
    return prepared.ids.length ? best : null;
  }, [prepared]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const k = event.key;
    let next: number | null = null;
    if (k.startsWith("Arrow")) {
      if (focus === null) next = biggest;
      else {
        const dir = k === "ArrowRight" ? [1, 0] : k === "ArrowLeft" ? [-1, 0] : k === "ArrowDown" ? [0, 1] : [0, -1];
        const fx = positions[focus * 2] as number;
        const fy = positions[focus * 2 + 1] as number;
        const pickIn = (pool: readonly number[]) => {
          let best: number | null = null;
          let bestScore = Infinity;
          for (const j of pool) {
            if (j === focus) continue;
            const dx = (positions[j * 2] as number) - fx;
            const dy = (positions[j * 2 + 1] as number) - fy;
            const dist = Math.hypot(dx, dy) || 1;
            const cos = (dx * (dir[0] as number) + dy * (dir[1] as number)) / dist;
            if (cos < 0.45) continue;
            const score = dist * (2 - cos);
            if (score < bestScore) {
              bestScore = score;
              best = j;
            }
          }
          return best;
        };
        next = pickIn(prepared.neighbors[focus] ?? []) ?? pickIn(prepared.ids.map((_, j) => j)) ?? focus;
      }
    } else if (k === "Home") next = biggest;
    else if ((k === "Enter" || k === " ") && focus !== null) {
      event.preventDefault();
      togglePin(focus);
      onNodeClick?.(info(focus), event);
      return;
    } else if (k === "Escape" && focus !== null) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (zoomable && (k === "+" || k === "=")) {
      event.preventDefault();
      zoomBy(1.3);
      return;
    } else if (zoomable && (k === "-" || k === "_")) {
      event.preventDefault();
      zoomBy(1 / 1.3);
      return;
    } else if (zoomable && k === "0") {
      event.preventDefault();
      fitTo(positions);
      return;
    } else if (k === "t" || k === "T") {
      event.preventDefault();
      setTableVisible((t) => !t);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next));
    // Keep the focused node on screen.
    const sx = (positions[next * 2] as number) * v.k + v.tx;
    const sy = (positions[next * 2 + 1] as number) * v.k + v.ty;
    if (sx < 20 || sx > W - 20 || sy < 20 || sy > H - 20) flyTo(next);
  };

  const nameText = chartLabel ?? (typeof title === "string" ? title : "Network graph");
  const summaryText = (() => {
    if (summary) return summary;
    if (!prepared.ids.length) return "No nodes.";
    const hubs = prepared.ids
      .map((_, i) => i)
      .sort((a, b) => (prepared.degree[b] as number) - (prepared.degree[a] as number))
      .slice(0, 3)
      .map((i) => `${labelOf(i)} (${prepared.degree[i]})`);
    return `Network of ${prepared.ids.length} nodes and ${prepared.edges.length} links${prepared.groups.length ? ` in ${prepared.groups.length} groups` : ""}. Most connected: ${hubs.join(", ")}.`;
  })();

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active !== null && dragging === null) {
    const sx = (positions[active * 2] as number) * v.k + v.tx;
    const sy = (positions[active * 2 + 1] as number) * v.k + v.ty - Math.max((prepared.radius[active] as number) * v.k, MIN_NODE_PX);
    if (sx >= 0 && sx <= W && sy >= -20 && sy <= H) tip = { left: sx / W, top: Math.max(0, sy) / H, flipX: sx > W * 0.62, below: sy < 110 };
  }
  const topNeighbors =
    active === null
      ? []
      : prepared.edges
          .filter((e) => e.s === active || e.t === active)
          .sort((a, b) => b.v - a.v)
          .slice(0, 5)
          .map((e) => ({ j: e.s === active ? e.t : e.s, v: e.v }));

  const fade = anim.reducedMotion ? instant : { duration: 0.18 };
  const k = v.k;
  // "auto" labels skip any that would overlap a bigger node's label on screen (hover still shows it).
  const crowded = new Set<number>();
  if (labels === "auto") {
    const placed: Array<[number, number, number, number]> = [];
    const ranked = [...labelSet].sort((a, b) => (prepared.radius[b] as number) - (prepared.radius[a] as number));
    for (const i of ranked) {
      const w = estimateTextWidth(labelOf(i), LABEL_PX) * 1.1;
      const cx = (positions[i * 2] as number) * k + v.tx;
      const top = (positions[i * 2 + 1] as number) * k + v.ty + Math.max((prepared.radius[i] as number) * k, MIN_NODE_PX);
      const box: [number, number, number, number] = [cx - w / 2 - 2, top, cx + w / 2 + 2, top + LABEL_PX * 1.5];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) crowded.add(i);
      else placed.push(box);
    }
  }
  const dim = (i: number) => (near ? !near.has(i) : matchSet ? !matchSet.has(i) : false);

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {search ? (
        <div className={cn(blockReset, "flex flex-wrap items-center gap-2")}>
          <label className={cn(blockReset, "relative flex min-w-48 flex-1 items-center sm:max-w-72")}>
            <span className="sr-only">Search nodes</span>
            <svg viewBox="0 0 16 16" className="pointer-events-none absolute start-2.5 size-3.5 text-pui-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              placeholder="Search nodes"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !matches?.length) return;
                event.preventDefault();
                const at = focus !== null ? matches.indexOf(focus) : -1;
                const i = matches[(at + 1) % matches.length] as number;
                setFocus(i);
                flyTo(i);
                setAnnouncement(describe(i));
              }}
              className={cn(
                controlReset,
                focusRing,
                "h-8 w-full rounded-pui-md border border-pui-border bg-pui-background ps-8 pe-2.5 text-xs text-pui-foreground placeholder:text-pui-muted-foreground",
              )}
            />
          </label>
          <span role="status" className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>
            {matches ? `${matches.length} match${matches.length === 1 ? "" : "es"}${matches.length ? ", Enter to jump" : ""}` : ""}
          </span>
        </div>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none overflow-hidden rounded-pui-md")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block")}>
          <g transform={`translate(${v.tx},${v.ty}) scale(${k})`}>
            <g>
              {prepared.edges.map((e, n) => {
                const lit = near ? near.has(e.s) && near.has(e.t) && (e.s === active || e.t === active) : false;
                const off = near ? !lit : matchSet ? !(matchSet.has(e.s) || matchSet.has(e.t)) : false;
                return (
                  <motion.line
                    key={n}
                    x1={positions[e.s * 2]}
                    y1={positions[e.s * 2 + 1]}
                    x2={positions[e.t * 2]}
                    y2={positions[e.t * 2 + 1]}
                    stroke={lit ? (prepared.color[active as number] as string) : "var(--pui-muted-foreground)"}
                    strokeWidth={(0.8 + 2.2 * Math.sqrt(e.v / maxEdge)) * (lit ? 1.4 : 1)}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ strokeOpacity: off ? 0.06 : lit ? 0.85 : 0.28 }}
                    transition={fade}
                  />
                );
              })}
            </g>
            <g>
              {prepared.ids.map((id, i) => {
                // Never smaller than MIN_NODE_PX on screen, however far out the view is.
                const r = Math.max(prepared.radius[i] as number, MIN_NODE_PX / k);
                const x = positions[i * 2] as number;
                const y = positions[i * 2 + 1] as number;
                const isActive = active === i;
                const isPinned = pinned.has(id);
                return (
                  <g key={id} transform={`translate(${x},${y})`}>
                    <motion.g initial={anim.entrance && !anim.reducedMotion ? { scale: 0, opacity: 0 } : false} animate={{ scale: 1, opacity: dim(i) ? 0.22 : 1 }} transition={{ scale: anim.reducedMotion ? instant : { type: "spring", stiffness: 380, damping: 22, delay: Math.min(0.5, i * 0.004) }, opacity: fade }}>
                      {isActive || (matchSet?.has(i) && !near) ? <circle r={r + 6} fill={withOpacity(prepared.color[i] as string, 0.22)} /> : null}
                      <circle r={r} fill={prepared.color[i]} stroke="var(--pui-background)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      {isPinned ? <circle r={Math.max(2, r * 0.32)} fill="var(--pui-background)" /> : null}
                      {isActive ? <circle r={r + 2.5} fill="none" stroke="var(--pui-foreground)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" /> : null}
                    </motion.g>
                  </g>
                );
              })}
            </g>
            <g pointerEvents="none">
              {prepared.ids.map((id, i) => {
                const show = (labelSet.has(i) && !crowded.has(i)) || (near?.has(i) ?? false) || (matchSet?.has(i) ?? false);
                if (!show) return null;
                const r = Math.max(prepared.radius[i] as number, MIN_NODE_PX / k);
                // At least LABEL_PX on screen at any zoom; grows with the zoom past 2.2x.
                const fs = LABEL_PX / Math.min(k, 2.2);
                return (
                  <text
                    key={id}
                    x={positions[i * 2]}
                    y={(positions[i * 2 + 1] as number) + r + fs * 1.15}
                    textAnchor="middle"
                    fontSize={fs}
                    fontWeight={active === i ? 700 : 600}
                    fill="var(--pui-foreground)"
                    fillOpacity={dim(i) ? 0.3 : 1}
                    stroke="var(--pui-background)"
                    strokeWidth={3 / k}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {labelOf(i)}
                  </text>
                );
              })}
            </g>
          </g>
        </svg>
        <div
          ref={overlayRef}
          tabIndex={0}
          role="application"
          aria-roledescription="interactive network graph"
          aria-label={`${nameText}. Use arrow keys to move between connected nodes.`}
          aria-describedby={`${uid}-help`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(null);
          }}
          onPointerLeave={() => {
            if (!drag.current) setHover(null);
          }}
          onDoubleClick={(event) => {
            const hit = nodeAt(toChart(event));
            if (hit !== null) unpin(hit);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(
            blockReset,
            focusRing,
            "absolute inset-0 rounded-pui-md",
            dragging === "pan" ? "cursor-grabbing" : dragging === "node" ? "cursor-grabbing" : hover !== null ? (draggable ? "cursor-grab" : "cursor-pointer") : zoomable ? "cursor-move" : "cursor-default",
          )}
          style={{ touchAction: draggable || zoomable ? "none" : "pan-y" }}
        />
        {zoomable ? (
          <div className={cn(blockReset, "absolute end-2 top-2 z-[3] flex items-center gap-1")}>
            <AnimatePresence>
              {pinned.size ? (
                <motion.button
                  key="unpin"
                  type="button"
                  onClick={unpinAll}
                  initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                  className={cn(controlReset, focusRing, "h-7 rounded-pui-md border border-pui-border bg-pui-background/90 px-2 text-[11px] text-pui-muted-foreground shadow-pui-sm backdrop-blur hover:text-pui-foreground")}
                >
                  {pinned.size} pinned &middot; release
                </motion.button>
              ) : null}
            </AnimatePresence>
            {(
              [
                ["Zoom in", "in", "M8 3.5v9M3.5 8h9"],
                ["Zoom out", "out", "M3.5 8h9"],
                ["Fit to view", "fit", "M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"],
              ] as const
            ).map(([label, action, d]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => (action === "fit" ? fitTo(positions) : zoomBy(action === "in" ? 1.3 : 1 / 1.3))}
                className={cn(controlReset, focusRing, "inline-flex size-7 items-center justify-center rounded-pui-md border border-pui-border bg-pui-background/90 text-pui-muted-foreground shadow-pui-sm backdrop-blur hover:text-pui-foreground")}
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={d} />
                </svg>
              </button>
            ))}
          </div>
        ) : null}
        {zoomable ? (
          <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute bottom-2 start-2 rounded-pui-sm bg-pui-background/80 px-1.5 py-0.5 text-[10.5px] text-pui-muted-foreground backdrop-blur")}>
            Ctrl/{"\u2318"} + scroll to zoom &middot; drag to pan{draggable ? " \u00b7 drag a node to pin it" : ""}
          </span>
        ) : null}
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {active !== null ? (
            <>
              <div className={cn(blockReset, "flex items-center gap-2")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-full")} style={{ background: prepared.color[active] }} />
                <span className={cn(blockReset, "text-xs font-semibold")}>{labelOf(active)}</span>
                {pinned.has(prepared.ids[active] as string) ? <span className={cn(blockReset, "rounded-pui-sm bg-pui-muted px-1 text-[10px] text-pui-muted-foreground")}>pinned</span> : null}
              </div>
              {nodes[active]?.group ? <div className={cn(blockReset, "text-[10.5px] text-pui-muted-foreground")}>{nodes[active]?.group}</div> : null}
              <div className={cn(blockReset, "mb-1 mt-1 text-sm font-semibold tabular-nums")}>
                {prepared.degree[active]} connection{prepared.degree[active] === 1 ? "" : "s"}
              </div>
              {nodes[active]?.value !== undefined ? <TipRow label="Value" value={fmt(nodes[active]?.value as number)} /> : null}
              {topNeighbors.map(({ j, v: w }) => (
                <TipRow key={j} swatch={prepared.color[j]} label={labelOf(j)} value={fmt(w)} tone="muted" />
              ))}
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((t) => !t)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Arrow keys move to the connected node in that direction (or the nearest node), Home jumps to the biggest node, Enter pins or releases it
        {zoomable ? ", plus and minus zoom, 0 fits the graph" : ""}, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={`${nameText}: links`}
        visible={tableVisible}
        columns={["From", "To", "Weight"]}
        rows={prepared.edges.map((e) => [labelOf(e.s), labelOf(e.t), fmt(e.v)])}
      />
    </ChartFigure>
  );
}

/**
 * Force-directed network graph: seeded, SSR-stable layout, live settle, drag to pin, zoom and pan,
 * neighbor highlighting, search that flies to matches and directional keyboard navigation.
 */
export const NetworkGraph = React.forwardRef(NetworkGraphInner) as (<N extends NetworkNodeDatum = NetworkNodeDatum, L extends NetworkLinkDatum = NetworkLinkDatum>(
  props: NetworkGraphProps<N, L> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement) & {
  displayName?: string;
};
NetworkGraph.displayName = "NetworkGraph";
