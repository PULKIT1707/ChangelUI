"use client";

// Parallel coordinates: one vertical axis per measure and one polyline per row. Drag on any axis
// to brush a range (brushes combine with AND), drag a brush to move it or its edges to resize,
// click an axis to clear it, drag an axis title to reorder (the others glide out of the way),
// double-click a title to flip it. Rows outside the filter fade, each axis carries a live
// histogram of the matching rows, hovering snaps to the nearest line with a tooltip of all its
// values, and the keyboard can pick axes, move and resize brushes and reorder axes.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, sequentialColor } from "./core/color";
import { formatNumber, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTip, TipRow, useChartUid } from "./core/frame";
import { linePath } from "./core/path";
import { scaleLinear, type ContinuousScale } from "./core/scale";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface ParallelDimension<T> {
  /** Unique id; also the field read when `value` is omitted. */
  key: string;
  label?: string;
  value?: (datum: T, index: number) => number | null | undefined;
  format?: NumberFormat;
  /** Fixed domain (default: the data extent, rounded). */
  domain?: readonly [number, number];
  /** Larger values at the bottom. */
  reverse?: boolean;
}

export type ParallelBrushes = Readonly<Record<string, readonly [number, number]>>;

export interface ParallelCoordinatesProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  data: readonly T[];
  dimensions: readonly ParallelDimension<T>[];
  /** Row name for tooltips and announcements. */
  label?: Accessor<T, string | number>;
  /** Category (string) colors by palette with a toggle legend; a dimension key colors on the sequential ramp. */
  colorBy?: Accessor<T, string | number> | { dimension: string };
  brushes?: ParallelBrushes;
  defaultBrushes?: ParallelBrushes;
  onBrushChange?: (brushes: ParallelBrushes, matching: readonly T[]) => void;
  /** Axis order (dimension keys). */
  order?: readonly string[];
  defaultOrder?: readonly string[];
  onOrderChange?: (order: string[]) => void;
  /** Default "smooth". */
  curve?: "linear" | "smooth";
  /** Mini histograms of the matching rows beside each axis. Default true. */
  histograms?: boolean;
  /** Line opacity for matching rows. Default: by row count. */
  lineOpacity?: number;
  /** Default 380. */
  height?: number;
  locale?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  onRowClick?: (datum: T, index: number, event: React.PointerEvent) => void;
  summary?: string;
  chartLabel?: string;
}

type DragState =
  | { kind: "brush"; dim: string; mode: "new" | "move" | "lo" | "hi"; anchor: number; start: readonly [number, number] | null; pointer: number; moved: boolean }
  | { kind: "axis"; dim: string; pointer: number; x0: number; moved: boolean };

const BINS = 12;

function ParallelCoordinatesInner<T>(props: ParallelCoordinatesProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    dimensions,
    label,
    colorBy,
    brushes: brushesProp,
    defaultBrushes = {},
    onBrushChange,
    order: orderProp,
    defaultOrder,
    onOrderChange,
    curve = "smooth",
    histograms = true,
    lineOpacity,
    height = 380,
    locale = "en-US",
    initialWidth = 720,
    animation = "auto",
    title,
    description,
    titleAs,
    onRowClick,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const [brushes, setBrushesState] = useControllableState<ParallelBrushes>({ value: brushesProp, defaultValue: defaultBrushes, name: "brushes" });
  const [orderState, setOrderState] = useControllableState<readonly string[]>({ value: orderProp, defaultValue: defaultOrder ?? dimensions.map((d) => d.key), onChange: (o) => onOrderChange?.([...o]), name: "order" });
  const [flipped, setFlipped] = React.useState<ReadonlySet<string>>(() => new Set());
  const [hiddenGroups, setHiddenGroups] = React.useState<ReadonlySet<string>>(() => new Set());
  const [hover, setHover] = React.useState<number | null>(null);
  const [activeAxis, setActiveAxis] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const dragRef = React.useRef<DragState | null>(null);

  const dimByKey = React.useMemo(() => new Map(dimensions.map((d) => [d.key, d])), [dimensions]);
  const order = React.useMemo(() => {
    const known = orderState.filter((k) => dimByKey.has(k));
    for (const d of dimensions) if (!known.includes(d.key)) known.push(d.key);
    return known;
  }, [orderState, dimByKey, dimensions]);

  // Values per dimension.
  const values = React.useMemo(() => {
    const out = new Map<string, Float64Array>();
    for (const dim of dimensions) {
      const arr = new Float64Array(data.length);
      data.forEach((d, i) => {
        const v = dim.value ? dim.value(d, i) : (d as Record<string, unknown>)[dim.key];
        arr[i] = typeof v === "number" && Number.isFinite(v) ? v : Number.NaN;
      });
      out.set(dim.key, arr);
    }
    return out;
  }, [data, dimensions]);

  // Geometry.
  const W = Math.max(240, width);
  const H = height;
  const m = { top: 44, bottom: 26, left: 44, right: histograms ? 56 : 44 };
  const plotTop = m.top;
  const plotBottom = H - m.bottom;
  const n = order.length;
  const step = n > 1 ? (W - m.left - m.right) / (n - 1) : 0;
  const axisX = (k: number) => (n > 1 ? m.left + k * step : W / 2);
  const scales = React.useMemo(() => {
    const out = new Map<string, ContinuousScale>();
    for (const dim of dimensions) {
      const arr = values.get(dim.key) as Float64Array;
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of arr) {
        if (Number.isNaN(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
      if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
      const domain = dim.domain ?? ([lo, hi] as const);
      const rev = (dim.reverse ?? false) !== flipped.has(dim.key);
      out.set(dim.key, scaleLinear(domain, rev ? [plotTop, plotBottom] : [plotBottom, plotTop], { nice: dim.domain ? false : 5 }));
    }
    return out;
  }, [dimensions, values, flipped, plotTop, plotBottom]);

  // Color.
  const colorModel = React.useMemo(() => {
    if (!colorBy) return { kind: "none" as const, of: () => categoricalColor(0), groups: [] as string[], groupOf: () => null as string | null };
    if (typeof colorBy === "object") {
      const arr = values.get(colorBy.dimension);
      const s = scales.get(colorBy.dimension);
      const [d0, d1] = s ? s.domain : [0, 1];
      return {
        kind: "sequential" as const,
        of: (i: number) => sequentialColor(0.2 + 0.8 * Math.max(0, Math.min(1, ((arr?.[i] ?? d0) - d0) / (d1 - d0 || 1)))),
        groups: [] as string[],
        groupOf: () => null as string | null,
      };
    }
    const groups: string[] = [];
    const keyOf = data.map((d, i) => {
      const g = String(readAccessor(colorBy, d, i));
      if (!groups.includes(g)) groups.push(g);
      return g;
    });
    return { kind: "categorical" as const, of: (i: number) => categoricalColor(groups.indexOf(keyOf[i] as string)), groups, groupOf: (i: number) => keyOf[i] ?? null };
  }, [colorBy, data, values, scales]);

  // Filter.
  const matchMask = React.useMemo(() => {
    const mask = new Uint8Array(data.length).fill(1);
    for (const [key, range] of Object.entries(brushes)) {
      const arr = values.get(key);
      if (!arr) continue;
      const lo = Math.min(range[0], range[1]);
      const hi = Math.max(range[0], range[1]);
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (!(v >= lo && v <= hi)) mask[i] = 0;
      }
    }
    if (hiddenGroups.size) for (let i = 0; i < data.length; i++) if (hiddenGroups.has(colorModel.groupOf(i) ?? "")) mask[i] = 0;
    return mask;
  }, [brushes, values, data.length, hiddenGroups, colorModel]);
  const matchCount = matchMask.reduce((a, b) => a + b, 0);
  const setBrushes = (next: ParallelBrushes) => {
    setBrushesState(next);
    if (onBrushChange) {
      const mask = new Uint8Array(data.length).fill(1);
      for (const [key, range] of Object.entries(next)) {
        const arr = values.get(key);
        if (!arr) continue;
        const lo = Math.min(range[0], range[1]);
        const hi = Math.max(range[0], range[1]);
        for (let i = 0; i < arr.length; i++) if (!((arr[i] as number) >= lo && (arr[i] as number) <= hi)) mask[i] = 0;
      }
      onBrushChange(next, data.filter((_, i) => mask[i]));
    }
  };

  const fmtDim = (key: string, v: number) => formatNumber(v, dimByKey.get(key)?.format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const labelOf = (i: number) => (label ? String(readAccessor(label, data[i] as T, i)) : `Row ${i + 1}`);
  const yOf = (key: string, i: number) => {
    const v = values.get(key)?.[i] as number;
    const s = scales.get(key) as ContinuousScale;
    return Number.isNaN(v) ? null : s(v);
  };
  const pathOf = (i: number) =>
    linePath(
      order.map((key, k) => {
        const y = yOf(key, i);
        return y === null ? null : ([axisX(k), y] as const);
      }),
      { curve: curve === "smooth" ? "monotone" : "linear" },
    );

  // Histograms of matching rows.
  const hist = React.useMemo(() => {
    if (!histograms) return null;
    const out = new Map<string, { all: number[]; match: number[]; max: number }>();
    for (const dim of dimensions) {
      const arr = values.get(dim.key) as Float64Array;
      const s = scales.get(dim.key) as ContinuousScale;
      const [d0, d1] = s.domain;
      const all = new Array<number>(BINS).fill(0);
      const match = new Array<number>(BINS).fill(0);
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i] as number;
        if (Number.isNaN(v)) continue;
        const b = Math.max(0, Math.min(BINS - 1, Math.floor(((v - d0) / (d1 - d0 || 1)) * BINS)));
        all[b] = (all[b] as number) + 1;
        if (matchMask[i]) match[b] = (match[b] as number) + 1;
      }
      out.set(dim.key, { all, match, max: Math.max(1, ...all) });
    }
    return out;
  }, [histograms, dimensions, values, scales, matchMask]);

  // Pointer.
  const toLocal = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / (rect.width || 1)) * W, y: ((event.clientY - rect.top) / (rect.height || 1)) * H };
  };
  const axisNear = (x: number) => {
    let best = -1;
    let bd = 16;
    for (let k = 0; k < n; k++) {
      const d = Math.abs(x - axisX(k));
      if (d < bd) [best, bd] = [k, d];
    }
    return best;
  };
  const nearestLine = (x: number, y: number) => {
    if (n < 2) return null;
    const k = Math.max(0, Math.min(n - 2, Math.floor((x - m.left) / step)));
    const t = Math.max(0, Math.min(1, (x - axisX(k)) / step));
    const a = order[k] as string;
    const b = order[k + 1] as string;
    let best: number | null = null;
    let bd = 10;
    for (let i = 0; i < data.length; i++) {
      if (!matchMask[i]) continue;
      const ya = yOf(a, i);
      const yb = yOf(b, i);
      if (ya === null || yb === null) continue;
      // Smooth curves sit close to the straight segment except near the axes; close enough to snap.
      const d = Math.abs(ya + (yb - ya) * t - y);
      if (d < bd) [best, bd] = [i, d];
    }
    return best;
  };
  const describeAxis = (k: number, b: ParallelBrushes = brushes) => {
    const key = order[k] as string;
    const dim = dimByKey.get(key);
    const r = b[key];
    return `${dim?.label ?? key}${r ? `: ${fmtDim(key, Math.min(r[0], r[1]))} to ${fmtDim(key, Math.max(r[0], r[1]))}` : ", no filter"}. Axis ${k + 1} of ${n}.`;
  };
  const countText = (b: ParallelBrushes) => {
    let c = 0;
    for (let i = 0; i < data.length; i++) {
      let ok = !hiddenGroups.has(colorModel.groupOf(i) ?? "");
      for (const [key, r] of Object.entries(b)) {
        const v = values.get(key)?.[i] as number;
        if (!(v >= Math.min(r[0], r[1]) && v <= Math.max(r[0], r[1]))) ok = false;
      }
      if (ok) c++;
    }
    return `${c} of ${data.length} rows match.`;
  };
  const withBrush = (key: string, range: readonly [number, number] | null): ParallelBrushes => {
    const next: Record<string, readonly [number, number]> = { ...brushes };
    if (range) next[key] = range;
    else delete next[key];
    return next;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const p = toLocal(event);
    const k = axisNear(p.x);
    if (k < 0) return;
    const key = order[k] as string;
    const s = scales.get(key) as ContinuousScale;
    if (p.y < plotTop - 6) {
      dragRef.current = { kind: "axis", dim: key, pointer: event.pointerId, x0: p.x, moved: false };
    } else {
      const r = brushes[key];
      let mode: "new" | "move" | "lo" | "hi" = "new";
      if (r) {
        const y0 = s(r[0]);
        const y1 = s(r[1]);
        const top = Math.min(y0, y1);
        const bot = Math.max(y0, y1);
        if (Math.abs(p.y - y0) < 6) mode = "lo";
        else if (Math.abs(p.y - y1) < 6) mode = "hi";
        else if (p.y > top && p.y < bot) mode = "move";
      }
      dragRef.current = { kind: "brush", dim: key, mode, anchor: s.invert(p.y), start: r ?? null, pointer: event.pointerId, moved: false };
    }
    setActiveAxis(k);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const p = toLocal(event);
    const d = dragRef.current;
    if (!d || d.pointer !== event.pointerId) {
      setHover(p.y >= plotTop - 6 && p.y <= plotBottom + 6 && axisNear(p.x) < 0 ? nearestLine(p.x, p.y) : null);
      return;
    }
    if (d.kind === "axis") {
      if (!d.moved && Math.abs(p.x - d.x0) < 4) return;
      d.moved = true;
      setDragging(d.dim);
      const target = Math.max(0, Math.min(n - 1, Math.round((p.x - m.left) / (step || 1))));
      const cur = order.indexOf(d.dim);
      if (target !== cur) {
        const next = order.filter((k) => k !== d.dim);
        next.splice(target, 0, d.dim);
        setOrderState(next);
        setActiveAxis(target);
      }
      return;
    }
    const s = scales.get(d.dim) as ContinuousScale;
    const [dlo, dhi] = [Math.min(...s.domain), Math.max(...s.domain)];
    const clampV = (v: number) => Math.max(dlo, Math.min(dhi, v));
    const v = clampV(s.invert(Math.max(plotTop, Math.min(plotBottom, p.y))));
    if (!d.moved && Math.abs(v - d.anchor) < (dhi - dlo) * 0.01) return;
    d.moved = true;
    setDragging(d.dim);
    let range: readonly [number, number];
    if (d.mode === "new" || !d.start) range = [Math.min(d.anchor, v), Math.max(d.anchor, v)];
    else if (d.mode === "lo") range = [v, d.start[1]];
    else if (d.mode === "hi") range = [d.start[0], v];
    else {
      const span = Math.abs(d.start[1] - d.start[0]);
      let lo = Math.min(d.start[0], d.start[1]) + (v - d.anchor);
      lo = Math.max(dlo, Math.min(dhi - span, lo));
      range = [lo, lo + span];
    }
    setBrushes(withBrush(d.dim, [Math.min(range[0], range[1]), Math.max(range[0], range[1])]));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    if (!d) return;
    event.currentTarget.releasePointerCapture?.(d.pointer);
    if (d.kind === "brush") {
      if (!d.moved) {
        // A click on the axis clears its brush.
        if (brushes[d.dim]) {
          const next = withBrush(d.dim, null);
          setBrushes(next);
          setAnnouncement(`${dimByKey.get(d.dim)?.label ?? d.dim} filter cleared. ${countText(next)}`);
        }
      } else setAnnouncement(`${describeAxis(order.indexOf(d.dim))} ${countText(brushes)}`);
    } else if (d.moved) setAnnouncement(`Moved ${dimByKey.get(d.dim)?.label ?? d.dim} to position ${order.indexOf(d.dim) + 1}.`);
  };
  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / (rect.width || 1)) * W;
    const y = ((event.clientY - rect.top) / (rect.height || 1)) * H;
    const k = axisNear(x);
    if (k < 0 || y > plotTop - 6) return;
    flip(order[k] as string);
  };
  const flip = (key: string) => {
    setFlipped((f) => {
      const next = new Set(f);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setAnnouncement(`${dimByKey.get(key)?.label ?? key} flipped.`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n) return;
    const k = activeAxis ?? 0;
    const key = order[k] as string;
    const s = scales.get(key) as ContinuousScale;
    const [dlo, dhi] = [Math.min(...s.domain), Math.max(...s.domain)];
    const span = dhi - dlo;
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const t = Math.max(0, Math.min(n - 1, k + (event.key === "ArrowLeft" ? -1 : 1)));
      if (t === k) return;
      const next = order.filter((x) => x !== key);
      next.splice(t, 0, key);
      setOrderState(next);
      setActiveAxis(t);
      setAnnouncement(`Moved ${dimByKey.get(key)?.label ?? key} to position ${t + 1}.`);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const t = activeAxis === null ? 0 : Math.max(0, Math.min(n - 1, k + (event.key === "ArrowLeft" ? -1 : 1)));
      setActiveAxis(t);
      setAnnouncement(describeAxis(t));
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (activeAxis === null) setActiveAxis(0);
      const cur = brushes[key] ?? ([dlo + span * 0.4, dlo + span * 0.6] as const);
      const up = event.key === "ArrowUp";
      const visualUp = (s(dhi) < s(dlo)) === up ? 1 : -1;
      let lo = Math.min(cur[0], cur[1]);
      let hi = Math.max(cur[0], cur[1]);
      const d = span * 0.05 * visualUp;
      if (event.shiftKey) {
        // Shift: grow (up) or shrink (down) around the middle.
        const g = span * 0.025 * (up ? 1 : -1);
        lo = Math.max(dlo, lo - g);
        hi = Math.min(dhi, hi + g);
        if (hi - lo < span * 0.02) return;
      } else if (brushes[key]) {
        const w = hi - lo;
        lo = Math.max(dlo, Math.min(dhi - w, lo + d));
        hi = lo + w;
      }
      const next = withBrush(key, [lo, hi]);
      setBrushes(next);
      setAnnouncement(`${describeAxis(k, next)} ${countText(next)}`);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && brushes[key]) {
      event.preventDefault();
      const next = withBrush(key, null);
      setBrushes(next);
      setAnnouncement(`Filter cleared. ${countText(next)}`);
    } else if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      flip(key);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setBrushes({});
      setAnnouncement(`All filters cleared. ${data.length} rows.`);
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
    }
  };

  const brushed = Object.keys(brushes).length > 0 || hiddenGroups.size > 0;
  const baseOpacity = lineOpacity ?? Math.max(0.18, Math.min(0.75, 14 / Math.sqrt(Math.max(1, data.length))));
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Parallel coordinates");
  const summaryText = summary ?? `${data.length} rows across ${n} measures: ${order.map((k) => dimByKey.get(k)?.label ?? k).join(", ")}.${brushed ? ` ${matchCount} rows match the filters.` : ""}`;
  const hovered = hover !== null ? hover : null;
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (hovered !== null && !dragging) {
    const ys = order.map((key) => yOf(key, hovered)).filter((v): v is number => v !== null);
    const mid = Math.floor((n - 1) / 2);
    const y = yOf(order[mid] as string, hovered) ?? ys[0] ?? plotTop;
    tip = { left: (axisX(mid) + step / 2) / W, top: y / H, flipX: (axisX(mid) + step / 2) / W > 0.6, below: y < 140 };
  }
  const layout = anim.updates ? chartMotion.layout : instant;
  const fade = anim.reducedMotion ? instant : { duration: 0.2 };

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-pui-muted-foreground")}>
        <span className={cn(blockReset, "tabular-nums")} aria-hidden="true">
          <motion.strong key={matchCount} initial={anim.reducedMotion ? false : { opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="inline-block font-semibold text-pui-foreground">
            {matchCount}
          </motion.strong>{" "}
          of {data.length} match
        </span>
        {colorModel.kind === "categorical"
          ? colorModel.groups.map((g, i) => {
              const off = hiddenGroups.has(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={!off}
                  onClick={() =>
                    setHiddenGroups((h) => {
                      const next = new Set(h);
                      if (next.has(g)) next.delete(g);
                      else next.add(g);
                      return next;
                    })
                  }
                  className={cn(controlReset, focusRing, "inline-flex h-6 items-center gap-1.5 rounded-pui-full border border-pui-border px-2 transition-opacity hover:bg-pui-muted", off ? "opacity-45" : "")}
                >
                  <span aria-hidden="true" className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: categoricalColor(i) }} />
                  {g}
                </button>
              );
            })
          : null}
        <AnimatePresence>
          {brushed ? (
            <motion.button
              key="clear"
              type="button"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => {
                setBrushes({});
                setHiddenGroups(new Set());
                setAnnouncement(`All filters cleared. ${data.length} rows.`);
              }}
              className={cn(controlReset, focusRing, "ms-auto inline-flex h-6 items-center rounded-pui-md px-2 font-medium text-pui-foreground hover:bg-pui-muted")}
            >
              Clear filters
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Lines: dimmed rows first, matching rows on top */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {data.map((_, i) =>
              matchMask[i] ? null : (
                <motion.path key={`o${i}`} initial={false} animate={{ d: pathOf(i), opacity: 0.06 }} transition={{ d: layout, opacity: fade }} stroke="var(--pui-muted-foreground)" strokeWidth={1} />
              ),
            )}
            {data.map((_, i) =>
              matchMask[i] ? (
                <motion.path
                  key={`m${i}`}
                  initial={anim.entrance ? { pathLength: 0, opacity: 0, d: pathOf(i) } : false}
                  animate={{ d: pathOf(i), pathLength: 1, opacity: hovered === null ? baseOpacity : hovered === i ? 1 : baseOpacity * 0.35 }}
                  transition={{ d: layout, pathLength: anim.reducedMotion ? instant : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: anim.entrance ? Math.min(0.5, (i / Math.max(1, data.length)) * 0.5) : 0 }, opacity: fade }}
                  stroke={colorModel.of(i)}
                  strokeWidth={1.4}
                />
              ) : null,
            )}
            {hovered !== null ? <path d={pathOf(hovered)} stroke={colorModel.of(hovered)} strokeWidth={3} pointerEvents="none" /> : null}
          </g>
          {/* Axes */}
          {order.map((key, k) => {
            const dim = dimByKey.get(key);
            const s = scales.get(key) as ContinuousScale;
            const r = brushes[key];
            const h = hist?.get(key);
            const isActive = activeAxis === k;
            const binH = (plotBottom - plotTop) / BINS;
            const [d0, d1] = s.domain;
            return (
              <motion.g key={key} initial={false} animate={{ x: axisX(k) }} transition={dragging === key ? { type: "spring", stiffness: 700, damping: 40 } : layout}>
                {h
                  ? h.match.map((c, b) => {
                      const yA = s(d0 + ((d1 - d0) * b) / BINS);
                      const yB = s(d0 + ((d1 - d0) * (b + 1)) / BINS);
                      const y = Math.min(yA, yB);
                      return (
                        <g key={b}>
                          <rect x={4} y={y + 1} width={((h.all[b] as number) / h.max) * 18} height={Math.max(0, binH - 2)} rx={1.5} fill="var(--pui-muted)" />
                          <motion.rect
                            x={4}
                            y={y + 1}
                            height={Math.max(0, binH - 2)}
                            rx={1.5}
                            initial={false}
                            animate={{ width: Math.max(0.01, (c / h.max) * 18) }}
                            transition={anim.updates ? chartMotion.size : instant}
                            fill={isActive ? "var(--pui-primary)" : "var(--pui-muted-foreground)"}
                            opacity={0.55}
                          />
                        </g>
                      );
                    })
                  : null}
                <line x1={0} x2={0} y1={plotTop} y2={plotBottom} stroke={isActive ? "var(--pui-foreground)" : "var(--pui-chart-axis)"} strokeWidth={isActive ? 2 : 1.25} />
                {s.ticks(5).map((t) => (
                  <g key={t}>
                    <line x1={-4} x2={0} y1={s(t)} y2={s(t)} stroke="var(--pui-chart-axis)" />
                    <text x={-7} y={s(t)} dy="0.35em" textAnchor="end" fontSize={9.5} fill="var(--pui-muted-foreground)" className="tabular-nums" paintOrder="stroke" stroke="var(--pui-background)" strokeWidth={3}>
                      {fmtDim(key, t)}
                    </text>
                  </g>
                ))}
                {r ? (
                  <motion.rect
                    x={-8}
                    width={16}
                    rx={4}
                    initial={false}
                    animate={{ y: Math.min(s(r[0]), s(r[1])), height: Math.max(2, Math.abs(s(r[1]) - s(r[0]))) }}
                    transition={dragging === key || anim.reducedMotion ? instant : chartMotion.hover}
                    fill="var(--pui-primary)"
                    fillOpacity={0.18}
                    stroke="var(--pui-primary)"
                    strokeWidth={1.5}
                  />
                ) : null}
                <g style={{ cursor: dragging === key ? "grabbing" : "grab" }}>
                  <text y={plotTop - 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={isActive ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                    {dim?.label ?? key}
                    {flipped.has(key) ? " \u2193" : ""}
                  </text>
                  {r ? (
                    <text y={plotTop - 9} textAnchor="middle" fontSize={9.5} fill="var(--pui-primary-text, var(--pui-primary))" className="tabular-nums">
                      {fmtDim(key, Math.min(r[0], r[1]))}&ndash;{fmtDim(key, Math.max(r[0], r[1]))}
                    </text>
                  ) : null}
                </g>
              </motion.g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="parallel coordinates"
          aria-label={`${nameText}. Left and right arrows pick an axis, up and down move its filter.`}
          aria-describedby={`${uid}-help`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => !dragRef.current && setHover(null)}
          onDoubleClick={onDoubleClick}
          onClick={(event) => {
            if (hover !== null && onRowClick) onRowClick(data[hover] as T, hover, event as unknown as React.PointerEvent);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setActiveAxis(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", dragging ? "cursor-grabbing" : hover !== null ? "cursor-pointer" : "cursor-crosshair")}
          style={{ touchAction: "none" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {hovered !== null ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center gap-1.5 text-xs font-semibold")}>
                <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-pui-full")} style={{ background: colorModel.of(hovered) }} />
                {labelOf(hovered)}
              </div>
              {order.map((key) => {
                const v = values.get(key)?.[hovered] as number;
                return <TipRow key={key} label={dimByKey.get(key)?.label ?? key} value={Number.isNaN(v) ? "\u2013" : fmtDim(key, v)} />;
              })}
            </>
          ) : null}
        </ChartTip>
      </div>
      <span id={`${uid}-help`} className={srOnly}>
        Left and right arrows pick an axis. Up and down create or move its filter, with Shift to widen or narrow it. Delete clears the axis filter, Escape clears all. Alt with left or right moves the axis, R flips it, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={`${nameText}${brushed ? ` (${matchCount} matching rows)` : ""}`}
        visible={tableVisible}
        columns={["Row", ...order.map((k) => dimByKey.get(k)?.label ?? k)]}
        rows={data.flatMap((_, i) => (matchMask[i] ? [[labelOf(i), ...order.map((k) => fmtDim(k, values.get(k)?.[i] as number))]] : []))}
      />
    </ChartFigure>
  );
}

/** Parallel coordinates with AND brushes on every axis, drag-to-reorder axes and live histograms. */
export const ParallelCoordinates = React.forwardRef(ParallelCoordinatesInner) as (<T>(props: ParallelCoordinatesProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
ParallelCoordinates.displayName = "ParallelCoordinates";
