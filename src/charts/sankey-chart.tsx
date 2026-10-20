"use client";

// Sankey: flows between stages on the original core layout (longest-path columns, relaxation,
// crossing-aware ribbon order). Hovering a node lights every path through it, upstream and
// downstream; hovering a ribbon shows its share of both ends. Nodes drag vertically with their
// ribbons following live, optional flow particles stream along ribbons at a speed set by value,
// ribbons draw left to right on entrance and every node and ribbon morphs on data updates.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { devWarn } from "../lib/dev";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { categoricalColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { sankeyLayout, type SankeyAlign, type SankeyGraph, type SankeyLink, type SankeyNode } from "./core/sankey";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const morph: Transition = { type: "spring", stiffness: 170, damping: 26 };

export interface SankeyNodeDatum {
  id: string;
  label?: string;
  color?: string;
}

export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

export interface SankeyNodeInfo {
  id: string;
  label: string;
  value: number;
  inflow: number;
  outflow: number;
  /** Column (0 = first). */
  layer: number;
}

export interface SankeyLinkInfo {
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  value: number;
  /** Share of the source's outflow (0..1). */
  ofSource: number;
  /** Share of the target's inflow (0..1). */
  ofTarget: number;
}

export interface SankeyChartProps<N extends SankeyNodeDatum = SankeyNodeDatum, L extends SankeyLinkDatum = SankeyLinkDatum>
  extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  nodes: readonly N[];
  links: readonly L[];
  /** Column alignment. Default "justify" (sinks in the last column). */
  align?: SankeyAlign;
  /** Node bar width in px. Default 14. */
  nodeWidth?: number;
  /** Vertical gap between nodes in px. Default 16. */
  nodePadding?: number;
  /** Ribbon color: from the source, the target, a gradient between them, or neutral. Default "gradient". */
  linkColor?: "source" | "target" | "gradient" | "neutral";
  /** Drag nodes up and down (ribbons follow). Alt+arrow keys do the same. Default true. */
  draggable?: boolean;
  /** Dots that stream along ribbons, faster for bigger flows. Off under reduced motion. Default false. */
  flowParticles?: boolean;
  /** Node labels with values. Default true. */
  labels?: boolean;
  /** Height in px. Default 360. */
  height?: number;
  format?: NumberFormat;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  onNodeClick?: (node: SankeyNodeInfo, event: React.PointerEvent | React.KeyboardEvent) => void;
  onLinkClick?: (link: SankeyLinkInfo, event: React.PointerEvent) => void;
  onActiveChange?: (active: { node: SankeyNodeInfo } | { link: SankeyLinkInfo } | null) => void;
  summary?: string;
  chartLabel?: string;
}

type Active = { kind: "node"; id: string } | { kind: "link"; index: number } | null;
type G<N, L> = SankeyGraph<N, L>;

/** Ribbon center line from the source's right edge to the target's left edge. */
function ribbonD(x0: number, y0: number, x1: number, y1: number): string {
  const xm = (x0 + x1) / 2;
  const f = (v: number) => Math.round(v * 100) / 100;
  return `M${f(x0)},${f(y0)}C${f(xm)},${f(y0)} ${f(xm)},${f(y1)} ${f(x1)},${f(y1)}`;
}

/** y on the ribbon center line at x (the curve is monotone in x, so bisect t). */
function ribbonYAt(x0: number, y0: number, x1: number, y1: number, x: number): number {
  let lo = 0;
  let hi = 1;
  const xm = (x0 + x1) / 2;
  const bx = (t: number) => (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * xm + 3 * (1 - t) * t * t * xm + t ** 3 * x1;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t * t * y1 + t ** 3 * y1;
}

function SankeyChartInner<N extends SankeyNodeDatum, L extends SankeyLinkDatum>(props: SankeyChartProps<N, L>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    nodes: nodesIn,
    links: linksIn,
    align = "justify",
    nodeWidth = 14,
    nodePadding = 16,
    linkColor = "gradient",
    draggable = true,
    flowParticles = false,
    labels = true,
    height = 360,
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onNodeClick,
    onLinkClick,
    onActiveChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const W = Math.max(200, width);
  const H = height;
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 0 }, locale), [format, locale]);
  const fmtShort = React.useCallback((v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);

  const [hover, setHover] = React.useState<Active>(null);
  const [pinned, setPinned] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [offsets, setOffsets] = React.useState<Record<string, number>>({});
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  // New data resets manual drags (derived state).
  const [prevData, setPrevData] = React.useState({ nodesIn, linksIn });
  if (prevData.nodesIn !== nodesIn || prevData.linksIn !== linksIn) {
    setPrevData({ nodesIn, linksIn });
    setOffsets({});
  }

  // Labels sit beside nodes; the first and last columns need room inside the chart.
  const padY = 6;
  const graph = React.useMemo<G<N, L>>(() => {
    try {
      return sankeyLayout<N, L>(nodesIn, linksIn, {
        width: W,
        height: H - padY * 2,
        y: padY,
        nodeWidth,
        nodePadding,
        align,
        nodeId: (n) => n.id,
        linkSource: (l) => l.source,
        linkTarget: (l) => l.target,
        linkValue: (l) => l.value,
      });
    } catch (error) {
      devWarn("sankey-layout", error instanceof Error ? error.message.replace(/^\[changelui\] /, "") : String(error));
      return { nodes: [], links: [], layers: 0 };
    }
  }, [nodesIn, linksIn, W, H, nodeWidth, nodePadding, align]);

  // Apply manual vertical offsets (clamped to the chart).
  const placed = React.useMemo(() => {
    const dy = new Map<string, number>();
    for (const n of graph.nodes) {
      const want = offsets[n.id] ?? 0;
      const lo = padY - n.y0;
      const hi = H - padY - n.y1;
      dy.set(n.id, Math.max(lo, Math.min(hi, want)));
    }
    const nodes = graph.nodes.map((n) => ({ n, y0: n.y0 + (dy.get(n.id) ?? 0), y1: n.y1 + (dy.get(n.id) ?? 0) }));
    const links = graph.links.map((l) => ({ l, y0: l.y0 + (dy.get(l.source.id) ?? 0), y1: l.y1 + (dy.get(l.target.id) ?? 0) }));
    return { nodes, links, dy };
  }, [graph, offsets, H]);

  const colorOf = React.useMemo(() => {
    const m = new Map<string, string>();
    graph.nodes.forEach((n, i) => m.set(n.id, n.data.color ?? categoricalColor(i)));
    return m;
  }, [graph]);
  const labelOf = (n: SankeyNode<N, L>) => n.data.label ?? n.id;
  const inflow = (n: SankeyNode<N, L>) => n.targetLinks.reduce((a, l) => a + l.value, 0);
  const outflow = (n: SankeyNode<N, L>) => n.sourceLinks.reduce((a, l) => a + l.value, 0);
  const nodeInfo = (n: SankeyNode<N, L>): SankeyNodeInfo => ({ id: n.id, label: labelOf(n), value: n.value, inflow: inflow(n), outflow: outflow(n), layer: n.layer });
  const linkInfo = (l: SankeyLink<N, L>): SankeyLinkInfo => {
    const out = outflow(l.source);
    const inn = inflow(l.target);
    return { source: l.source.id, target: l.target.id, sourceLabel: labelOf(l.source), targetLabel: labelOf(l.target), value: l.value, ofSource: out ? l.value / out : 0, ofTarget: inn ? l.value / inn : 0 };
  };

  const active: Active = hover ?? (focusId ? { kind: "node", id: focusId } : pinned ? { kind: "node", id: pinned } : null);
  // Every node and link on a path through the active node (or the active link and its ends).
  const lit = React.useMemo(() => {
    if (!active) return null;
    const nodes = new Set<string>();
    const links = new Set<number>();
    if (active.kind === "link") {
      const l = graph.links[active.index];
      if (!l) return null;
      links.add(l.index);
      nodes.add(l.source.id).add(l.target.id);
      return { nodes, links };
    }
    const start = graph.nodes.find((n) => n.id === active.id);
    if (!start) return null;
    const walk = (n: SankeyNode<N, L>, dir: "up" | "down") => {
      nodes.add(n.id);
      for (const l of dir === "down" ? n.sourceLinks : n.targetLinks) {
        if (links.has(l.index)) continue;
        links.add(l.index);
        walk(dir === "down" ? l.target : l.source, dir);
      }
    };
    walk(start, "down");
    walk(start, "up");
    return { nodes, links };
  }, [active, graph]);

  const lastActive = React.useRef<string>("");
  React.useEffect(() => {
    const key = active ? (active.kind === "node" ? `n:${active.id}` : `l:${active.index}`) : "";
    if (lastActive.current === key) return;
    lastActive.current = key;
    if (!onActiveChange) return;
    if (!active) onActiveChange(null);
    else if (active.kind === "node") {
      const n = graph.nodes.find((x) => x.id === active.id);
      onActiveChange(n ? { node: nodeInfo(n) } : null);
    } else {
      const l = graph.links[active.index];
      onActiveChange(l ? { link: linkInfo(l) } : null);
    }
  });

  // Pointer: nodes first (with a little slop), then ribbons.
  const toLocal = (event: React.PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    return { x: r.width ? ((event.clientX - r.left) / r.width) * W : 0, y: r.height ? ((event.clientY - r.top) / r.height) * H : 0 };
  };
  const hitTest = (p: { x: number; y: number }): Active => {
    for (const { n, y0, y1 } of placed.nodes) {
      if (p.x >= n.x0 - 4 && p.x <= n.x1 + 4 && p.y >= y0 - 3 && p.y <= y1 + 3) return { kind: "node", id: n.id };
    }
    let best: Active = null;
    let bestW = Infinity;
    for (const { l, y0, y1 } of placed.links) {
      const x0 = l.source.x1;
      const x1 = l.target.x0;
      if (p.x < x0 || p.x > x1) continue;
      const y = ribbonYAt(x0, y0, x1, y1, p.x);
      const half = Math.max(2.5, l.width / 2);
      // Thin ribbons on top of thick ones win.
      if (Math.abs(p.y - y) <= half && l.width < bestW) {
        best = { kind: "link", index: l.index };
        bestW = l.width;
      }
    }
    return best;
  };

  const drag = React.useRef<{ id: string; startY: number; base: number; moved: boolean; pointer: number; scale: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const p = toLocal(event);
    const hit = hitTest(p);
    if (hit?.kind !== "node" || !draggable) return;
    const r = event.currentTarget.getBoundingClientRect();
    drag.current = { id: hit.id, startY: event.clientY, base: offsets[hit.id] ?? 0, moved: false, pointer: event.pointerId, scale: r.height ? H / r.height : 1 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.pointer === event.pointerId) {
      const dy = (event.clientY - d.startY) * d.scale;
      if (!d.moved && Math.abs(dy) < 3) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(d.id);
      }
      setOffsets((o) => ({ ...o, [d.id]: d.base + dy }));
      return;
    }
    setHover(hitTest(toLocal(event)));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d) {
      event.currentTarget.releasePointerCapture?.(d.pointer);
      setDragging(null);
      if (d.moved) {
        const n = graph.nodes.find((x) => x.id === d.id);
        if (n) setAnnouncement(`Moved ${labelOf(n)}.`);
        return;
      }
    }
    if (event.button !== 0) return;
    const hit = hitTest(toLocal(event));
    if (hit?.kind === "node") {
      const n = graph.nodes.find((x) => x.id === hit.id);
      setPinned((p) => (p === hit.id ? null : hit.id));
      if (n) onNodeClick?.(nodeInfo(n), event);
    } else if (hit?.kind === "link") {
      const l = graph.links[hit.index];
      if (l) onLinkClick?.(linkInfo(l), event);
    } else setPinned(null);
  };

  const describe = (n: SankeyNode<N, L>) => {
    const ins = [...n.targetLinks].sort((a, b) => b.value - a.value).slice(0, 3);
    const outs = [...n.sourceLinks].sort((a, b) => b.value - a.value).slice(0, 3);
    const inTotal = inflow(n);
    const outTotal = outflow(n);
    const parts = [`${labelOf(n)}: ${fmt(n.value)}.`];
    if (ins.length) parts.push(`In from ${ins.map((l) => `${labelOf(l.source)} ${fmt(l.value)} (${pct.format(inTotal ? l.value / inTotal : 0)})`).join(", ")}.`);
    if (outs.length) parts.push(`Out to ${outs.map((l) => `${labelOf(l.target)} ${fmt(l.value)} (${pct.format(outTotal ? l.value / outTotal : 0)})`).join(", ")}.`);
    parts.push(`Column ${n.layer + 1} of ${graph.layers}.`);
    return parts.join(" ");
  };

  const columns = React.useMemo(() => {
    const cols: Array<Array<{ n: SankeyNode<N, L>; y: number }>> = Array.from({ length: graph.layers }, () => []);
    for (const p of placed.nodes) cols[p.n.layer]?.push({ n: p.n, y: (p.y0 + p.y1) / 2 });
    for (const c of cols) c.sort((a, b) => a.y - b.y);
    return cols;
  }, [graph, placed]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const k = event.key;
    const cur = focusId ? graph.nodes.find((n) => n.id === focusId) : undefined;
    const curY = cur ? ((placed.nodes.find((p) => p.n === cur)?.y0 ?? 0) + (placed.nodes.find((p) => p.n === cur)?.y1 ?? 0)) / 2 : 0;
    let next: SankeyNode<N, L> | undefined;
    if (cur && event.altKey && draggable && (k === "ArrowUp" || k === "ArrowDown")) {
      event.preventDefault();
      const step = event.shiftKey ? 32 : 8;
      setOffsets((o) => ({ ...o, [cur.id]: (o[cur.id] ?? 0) + (k === "ArrowUp" ? -step : step) }));
      setAnnouncement(`Moved ${labelOf(cur)} ${k === "ArrowUp" ? "up" : "down"}.`);
      return;
    }
    if (!cur && (k.startsWith("Arrow") || k === "Home" || k === "End")) next = columns[0]?.[0]?.n;
    else if (cur && (k === "ArrowUp" || k === "ArrowDown")) {
      const col = columns[cur.layer] ?? [];
      const at = col.findIndex((c) => c.n === cur);
      next = col[Math.max(0, Math.min(col.length - 1, at + (k === "ArrowDown" ? 1 : -1)))]?.n;
    } else if (cur && (k === "ArrowRight" || k === "ArrowLeft")) {
      for (let c = cur.layer + (k === "ArrowRight" ? 1 : -1); c >= 0 && c < columns.length; c += k === "ArrowRight" ? 1 : -1) {
        const col = columns[c] ?? [];
        if (!col.length) continue;
        next = col.reduce((a, b) => (Math.abs(b.y - curY) < Math.abs(a.y - curY) ? b : a)).n;
        break;
      }
      next ??= cur;
    } else if (k === "Home") next = columns[0]?.[0]?.n;
    else if (k === "End") next = columns[columns.length - 1]?.[0]?.n;
    else if ((k === "Enter" || k === " ") && cur) {
      event.preventDefault();
      setPinned((p) => (p === cur.id ? null : cur.id));
      onNodeClick?.(nodeInfo(cur), event);
      return;
    } else if (k === "Escape" && (pinned || focusId)) {
      event.preventDefault();
      if (pinned) setPinned(null);
      else setFocusId(null);
      return;
    } else if (k === "t" || k === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocusId(next.id);
    setAnnouncement(describe(next));
  };

  const total = React.useMemo(() => graph.nodes.filter((n) => !n.targetLinks.length).reduce((a, n) => a + n.value, 0), [graph]);
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Sankey diagram");
  const summaryText = (() => {
    if (summary) return summary;
    if (!graph.links.length) return "No flows.";
    const sources = graph.nodes.filter((n) => !n.targetLinks.length).length;
    const sinks = graph.nodes.filter((n) => !n.sourceLinks.length).length;
    const top = [...graph.links].sort((a, b) => b.value - a.value)[0] as SankeyLink<N, L>;
    const li = linkInfo(top);
    return `Flow of ${fmt(total)} from ${sources} sources to ${sinks} destinations across ${graph.layers} stages. Largest flow: ${li.sourceLabel} to ${li.targetLabel}, ${fmt(li.value)} (${pct.format(li.ofSource)} of ${li.sourceLabel}).`;
  })();

  const maxLink = React.useMemo(() => graph.links.reduce((a, l) => Math.max(a, l.value), 0) || 1, [graph]);
  const interacting = dragging !== null;
  const tMorph = anim.reducedMotion || !anim.updates || interacting ? instant : morph;
  const linkStroke = (l: SankeyLink<N, L>) =>
    linkColor === "neutral"
      ? "var(--pui-muted-foreground)"
      : linkColor === "gradient"
        ? `url(#${uid}-g${l.index})`
        : (colorOf.get(linkColor === "source" ? l.source.id : l.target.id) as string);

  // Tooltip content and anchor.
  let tipBody: React.ReactNode = null;
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (active?.kind === "node" && (hover || focusId)) {
    const p = placed.nodes.find((x) => x.n.id === active.id);
    if (p) {
      const n = p.n;
      const outs = [...n.sourceLinks].sort((a, b) => b.value - a.value).slice(0, 4);
      const ins = [...n.targetLinks].sort((a, b) => b.value - a.value).slice(0, 4);
      const ox = outflow(n);
      const ix = inflow(n);
      const ax = n.layer === graph.layers - 1 ? n.x0 : n.x1;
      tip = { left: ax / W, top: Math.max(8, p.y0) / H, flipX: ax > W * 0.6, below: p.y0 < 90 };
      tipBody = (
        <>
          <div className={cn(blockReset, "flex items-center gap-2")}>
            <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf.get(n.id) }} />
            <span className={cn(blockReset, "text-xs font-semibold")}>{labelOf(n)}</span>
          </div>
          <div className={cn(blockReset, "mb-1 mt-0.5 text-sm font-semibold tabular-nums")}>{fmt(n.value)}</div>
          {ins.length ? (
            <div className={cn(blockReset, "mt-1 text-[10.5px] font-medium uppercase tracking-wide text-pui-muted-foreground")}>In</div>
          ) : null}
          {ins.map((l) => (
            <TipRow key={`i${l.index}`} swatch={colorOf.get(l.source.id)} label={labelOf(l.source)} value={`${fmtShort(l.value)} \u00b7 ${pct.format(ix ? l.value / ix : 0)}`} />
          ))}
          {outs.length ? (
            <div className={cn(blockReset, "mt-1 text-[10.5px] font-medium uppercase tracking-wide text-pui-muted-foreground")}>Out</div>
          ) : null}
          {outs.map((l) => (
            <TipRow key={`o${l.index}`} swatch={colorOf.get(l.target.id)} label={labelOf(l.target)} value={`${fmtShort(l.value)} \u00b7 ${pct.format(ox ? l.value / ox : 0)}`} />
          ))}
          {ox && ix && Math.abs(ox - ix) > 1e-9 ? <TipRow label={ox < ix ? "Retained" : "Added"} value={fmtShort(Math.abs(ix - ox))} tone="muted" /> : null}
        </>
      );
    }
  } else if (active?.kind === "link") {
    const p = placed.links[active.index];
    if (p) {
      const li = linkInfo(p.l);
      const mx = (p.l.source.x1 + p.l.target.x0) / 2;
      const my = (p.y0 + p.y1) / 2;
      tip = { left: mx / W, top: my / H, flipX: mx > W * 0.6, below: my < 90 };
      tipBody = (
        <>
          <div className={cn(blockReset, "flex items-center gap-1.5 text-xs font-semibold")}>
            <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf.get(li.source) }} />
            {li.sourceLabel}
            <span aria-hidden="true" className="text-pui-muted-foreground">{"\u2192"}</span>
            <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf.get(li.target) }} />
            {li.targetLabel}
          </div>
          <div className={cn(blockReset, "mb-1 mt-0.5 text-sm font-semibold tabular-nums")}>{fmt(li.value)}</div>
          <TipRow label={`Of ${li.sourceLabel} out`} value={pct.format(li.ofSource)} />
          <TipRow label={`Of ${li.targetLabel} in`} value={pct.format(li.ofTarget)} />
          {total ? <TipRow label="Of all flow" value={pct.format(li.value / total)} tone="muted" /> : null}
        </>
      );
    }
  }

  const fade = anim.reducedMotion ? instant : { duration: 0.18 };

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {linkColor === "gradient" ? (
            <defs>
              {placed.links.map(({ l }) => (
                <linearGradient key={l.index} id={`${uid}-g${l.index}`} gradientUnits="userSpaceOnUse" x1={l.source.x1} x2={l.target.x0} y1={0} y2={0}>
                  <stop offset="0%" stopColor={colorOf.get(l.source.id)} />
                  <stop offset="100%" stopColor={colorOf.get(l.target.id)} />
                </linearGradient>
              ))}
            </defs>
          ) : null}
          <g>
            {placed.links.map(({ l, y0, y1 }) => {
              const d = ribbonD(l.source.x1, y0, l.target.x0, y1);
              const on = !lit || lit.links.has(l.index);
              const strong = !!lit && lit.links.has(l.index);
              const w = Math.max(1, l.width);
              return (
                <motion.path
                  key={`${l.source.id}>${l.target.id}`}
                  fill="none"
                  stroke={linkStroke(l)}
                  initial={anim.entrance ? { d, strokeWidth: w, pathLength: 0, strokeOpacity: linkColor === "neutral" ? 0.22 : 0.4 } : { d, strokeWidth: w }}
                  animate={{ d, strokeWidth: w, pathLength: 1, strokeOpacity: on ? (strong ? 0.72 : linkColor === "neutral" ? 0.22 : 0.4) : 0.07 }}
                  transition={{
                    default: tMorph,
                    pathLength: anim.entrance ? { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + l.source.layer * 0.14 } : instant,
                    strokeOpacity: fade,
                  }}
                />
              );
            })}
          </g>
          {flowParticles && !anim.reducedMotion ? (
            <g pointerEvents="none">
              {placed.links.map(({ l, y0, y1 }) => {
                if (lit && !lit.links.has(l.index)) return null;
                const d = ribbonD(l.source.x1, y0, l.target.x0, y1);
                const dot = Math.max(1.6, Math.min(4, l.width * 0.32));
                const gap = 22;
                const duration = Math.max(0.6, Math.min(6, 1.4 * Math.sqrt(maxLink / Math.max(l.value, 1e-9))));
                return (
                  <motion.path
                    key={`p${l.source.id}>${l.target.id}`}
                    d={d}
                    fill="none"
                    stroke="var(--pui-background)"
                    strokeOpacity={0.85}
                    strokeWidth={dot}
                    strokeLinecap="round"
                    strokeDasharray={`0 ${gap}`}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -gap }}
                    transition={{ duration, ease: "linear", repeat: Infinity, delay: anim.entrance ? 1 : 0 }}
                  />
                );
              })}
            </g>
          ) : null}
          <g>
            {placed.nodes.map(({ n, y0, y1 }) => {
              const on = !lit || lit.nodes.has(n.id);
              const isActive = active?.kind === "node" && active.id === n.id;
              const h = Math.max(1, y1 - y0);
              return (
                <motion.rect
                  key={n.id}
                  rx={3}
                  fill={colorOf.get(n.id)}
                  stroke={isActive ? "var(--pui-foreground)" : "transparent"}
                  strokeWidth={1.5}
                  initial={anim.entrance ? { x: n.x0, y: y0 + h / 2, width: n.x1 - n.x0, height: 0.01, opacity: 0 } : { x: n.x0, y: y0, width: n.x1 - n.x0, height: h }}
                  animate={{ x: n.x0, y: y0, width: n.x1 - n.x0, height: h, opacity: on ? 1 : 0.3 }}
                  transition={{
                    default: anim.entrance && !interacting ? { ...morph, delay: n.layer * 0.12 } : tMorph,
                    opacity: fade,
                  }}
                  style={{ cursor: draggable ? "ns-resize" : undefined }}
                />
              );
            })}
          </g>
          {labels ? (
            <g pointerEvents="none">
              {placed.nodes.map(({ n, y0, y1 }) => {
                const on = !lit || lit.nodes.has(n.id);
                const last = n.layer === graph.layers - 1 && graph.layers > 1;
                const x = last ? n.x0 - 8 : n.x1 + 8;
                const y = (y0 + y1) / 2;
                const name = labelOf(n);
                const room = last ? n.x0 : W - n.x1;
                const fits = estimateTextWidth(name, 11.5) < room - 12;
                if (!fits) return null;
                return (
                  <motion.text
                    key={n.id}
                    initial={anim.entrance ? { opacity: 0, x, y } : { x, y }}
                    animate={{ x, y, opacity: on ? 1 : 0.35 }}
                    transition={{ default: tMorph, opacity: anim.entrance ? { duration: 0.3, delay: 0.5 + n.layer * 0.12 } : fade }}
                    textAnchor={last ? "end" : "start"}
                    fontSize={11.5}
                  >
                    <tspan dy={y1 - y0 > 26 ? "-0.2em" : "0.35em"} fill="var(--pui-foreground)" fontWeight={600}>
                      {name}
                    </tspan>
                    {y1 - y0 > 26 ? (
                      <tspan x={x} dy="1.25em" fill="var(--pui-muted-foreground)" fontSize={10.5} className="tabular-nums">
                        {fmtShort(n.value)}
                        {total && !n.targetLinks.length ? ` \u00b7 ${pct.format(n.value / total)}` : ""}
                      </tspan>
                    ) : (
                      <tspan fill="var(--pui-muted-foreground)" fontSize={10.5} dx={6} className="tabular-nums">
                        {fmtShort(n.value)}
                      </tspan>
                    )}
                  </motion.text>
                );
              })}
            </g>
          ) : null}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive sankey diagram"
          aria-label={`${nameText}. Use arrow keys to move between nodes.`}
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
          onKeyDown={onKeyDown}
          onBlur={() => setFocusId(null)}
          className={cn(
            blockReset,
            focusRing,
            "absolute inset-0 rounded-pui-md",
            dragging ? "cursor-grabbing" : hover?.kind === "node" ? (draggable ? "cursor-grab" : "cursor-pointer") : hover ? "cursor-pointer" : "cursor-default",
          )}
          style={{ touchAction: draggable ? "none" : "pan-y" }}
        />
        <ChartTip open={!!tip && !dragging} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {tipBody}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Up and down arrows move within a column, left and right move to the nearest node in the next column, Enter pins the highlight, Escape clears it
        {draggable ? ", Alt plus up or down moves the node" : ""}, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["From", "To", "Value", "Of source", "Of target"]}
        rows={graph.links.map((l) => {
          const li = linkInfo(l);
          return [li.sourceLabel, li.targetLabel, fmt(li.value), pct.format(li.ofSource), pct.format(li.ofTarget)];
        })}
      />
    </ChartFigure>
  );
}

/**
 * Sankey diagram: path highlighting through any node, ribbon tooltips with both shares, draggable
 * nodes, optional value-paced flow particles, a left-to-right draw-in and morphing updates.
 */
export const SankeyChart = React.forwardRef(SankeyChartInner) as (<N extends SankeyNodeDatum = SankeyNodeDatum, L extends SankeyLinkDatum = SankeyLinkDatum>(
  props: SankeyChartProps<N, L> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement) & {
  displayName?: string;
};
SankeyChart.displayName = "SankeyChart";
