"use client";

// Scatter and bubble chart: x / y (numbers or dates), an optional size encoding, groups with a
// toggle legend, linear trend lines with R², quadrants, and a 2D nearest-point hover (grid index)
// with a crosshair and axis pills. Drag to zoom into a box (or select points with Shift), scroll
// with Ctrl/Cmd to zoom around the pointer, double-click to reset: every change tweens the
// points, so zooming glides. Points pop in by x order on mount.
import { AnimatePresence, motion, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor } from "./core/color";
import { estimateTextWidth, formatDate, formatNumber, multiTimeFormat, tickFormat, type NumberFormat } from "./core/format";
import { scaleLinear, scaleLog, scaleUtc, type ContinuousScale } from "./core/scale";
import { GridIndex } from "./core/spatial";
import { linearRegression } from "./core/stats";
import { timeTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";
import { wheelZoomFactor } from "./core/zoom";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };
const FONT = 11;

type Box = readonly [x0: number, x1: number, y0: number, y1: number];

export interface ScatterAxis {
  /** Axis title. */
  label?: string;
  /** "log" for values spanning orders of magnitude (income, population). Default "linear". */
  scale?: "linear" | "log";
  /** Number format, or a function (dates get an Intl date format by default). */
  format?: NumberFormat;
  min?: number;
  max?: number;
  tickCount?: number;
}

export interface ScatterQuadrants {
  /** Divider positions in data units. */
  x: number;
  y: number;
  /** Corner labels: top-left, top-right, bottom-left, bottom-right. */
  labels?: readonly [string, string, string, string];
}

export interface ScatterChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color" | "onSelect"> {
  data: readonly T[];
  x: Accessor<T, number | Date>;
  y: Accessor<T, number>;
  /** Bubble size (area-true sqrt scale). */
  size?: Accessor<T, number>;
  /** Bubble radius range in px. Default [4, 22]. */
  sizeRange?: readonly [number, number];
  /** Point radius without `size`. Default 4.5. */
  radius?: number;
  /** Group per row: colors, legend, per-group trend lines. */
  series?: Accessor<T, string>;
  /** Colors per group name (any CSS color or token). Default: the palette in first-seen order. */
  colors?: Record<string, string>;
  /** Point name shown as the tooltip heading. */
  label?: Accessor<T, string>;
  /** Least-squares trend: one line, one per group, or none. Default "none". */
  trend?: "none" | "linear" | "series";
  quadrants?: ScatterQuadrants;
  xAxis?: ScatterAxis;
  yAxis?: ScatterAxis;
  /** Size format and name in the tooltip. */
  sizeFormat?: NumberFormat;
  sizeLabel?: string;
  /** Drag behavior: zoom into the box, or select the points in it. Shift does the other one. Default "zoom". */
  brush?: "zoom" | "select" | "none";
  /** Ctrl/Cmd + wheel zooms around the pointer. Default true. */
  wheelZoom?: boolean;
  /** Selected rows (brush select or click). */
  onSelectionChange?: (rows: T[]) => void;
  onPointClick?: (datum: T, index: number, event: React.PointerEvent | React.KeyboardEvent) => void;
  /** Default "top" when there are groups. */
  legend?: "top" | "bottom" | "none";
  /** Hover radius for snapping, px. Default 24. */
  hitRadius?: number;
  height?: number;
  initialWidth?: number;
  locale?: string;
  timeZone?: string;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  summary?: string;
  chartLabel?: string;
  resetZoomLabel?: string;
}

interface Pt<T> {
  i: number;
  x: number;
  y: number;
  s: number | null;
  group: string;
  datum: T;
}

function ScatterPoint({
  tween,
  index,
  color,
  opacity,
  delay,
  entrance,
  emphasis,
  reducedMotion,
}: {
  tween: MotionValue<Float64Array>;
  index: number;
  color: string;
  opacity: number;
  delay: number;
  entrance: boolean;
  emphasis: "none" | "active" | "selected";
  reducedMotion: boolean;
}) {
  const cx = useTransform(tween, (g) => g[index * 3] ?? 0);
  const cy = useTransform(tween, (g) => g[index * 3 + 1] ?? 0);
  const r = useTransform(tween, (g) => Math.max(0, (g[index * 3 + 2] ?? 0) + (emphasis === "active" ? 2.5 : 0)));
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      stroke={emphasis === "selected" ? "var(--pui-ring)" : emphasis === "active" ? "var(--pui-background)" : "color-mix(in oklab, var(--pui-background) 70%, transparent)"}
      strokeWidth={emphasis === "none" ? 1 : 2}
      initial={entrance ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity }}
      transition={
        reducedMotion
          ? instant
          : entrance
            ? { scale: { type: "spring", stiffness: 420, damping: 18, delay }, opacity: { duration: 0.2, delay } }
            : { opacity: chartMotion.fade }
      }
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    />
  );
}

function ScatterChartInner<T>(props: ScatterChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    y,
    size,
    sizeRange = [4, 22],
    radius = 4.5,
    series,
    colors,
    label,
    trend = "none",
    quadrants,
    xAxis,
    yAxis,
    sizeFormat,
    sizeLabel = "Size",
    brush = "zoom",
    wheelZoom = true,
    onSelectionChange,
    onPointClick,
    legend,
    hitRadius = 24,
    height = 340,
    initialWidth = 640,
    locale = "en-US",
    timeZone = "UTC",
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    summary,
    chartLabel,
    resetZoomLabel = "Reset zoom",
    className,
    ...rest
  } = props;

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sizeState = useChartSize(containerRef, { initialWidth, height });
  const anim = useChartAnimation(animation);
  const [zoom, setZoom] = React.useState<Box | null>(null);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [solo, setSolo] = React.useState<{ key: string; restore: string[] } | null>(null);
  const [active, setActive] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [hoverGroup, setHoverGroup] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [drag, setDrag] = React.useState<{ x0: number; y0: number; x1: number; y1: number; mode: "zoom" | "select" } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  // --- data --------------------------------------------------------------------------------------
  const { points, groups, isTime } = React.useMemo(() => {
    const out: Pt<T>[] = [];
    const seen: string[] = [];
    let time = false;
    data.forEach((d, i) => {
      const xv = readAccessor(x, d, i);
      if (xv instanceof Date) time = true;
      const xn = +xv;
      const yn = Number(readAccessor(y, d, i));
      if (!Number.isFinite(xn) || !Number.isFinite(yn)) return;
      const g = series ? String(readAccessor(series, d, i)) : "";
      if (!seen.includes(g)) seen.push(g);
      const sv = size ? Number(readAccessor(size, d, i)) : null;
      out.push({ i, x: xn, y: yn, s: sv !== null && Number.isFinite(sv) ? sv : null, group: g, datum: d });
    });
    return { points: out, groups: seen, isTime: time };
  }, [data, x, y, size, series]);
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);
  const colorOf = React.useCallback((g: string) => colors?.[g] ?? categoricalColor(Math.max(0, groups.indexOf(g))), [colors, groups]);
  const hasGroups = !!series && groups.length > 0;
  const legendPos = legend ?? (hasGroups ? "top" : "none");

  const fmtX = React.useCallback(
    (v: number) =>
      typeof xAxis?.format === "function"
        ? xAxis.format(v)
        : isTime
          ? formatDate(v, xAxis?.format ? (xAxis.format as Intl.DateTimeFormatOptions) : { dateStyle: "medium" }, locale, timeZone)
          : formatNumber(v, xAxis?.format ?? { maximumFractionDigits: 2 }, locale),
    [xAxis?.format, isTime, locale, timeZone],
  );
  const fmtY = React.useCallback((v: number) => formatNumber(v, yAxis?.format ?? { maximumFractionDigits: 2 }, locale), [yAxis?.format, locale]);
  const fmtS = React.useCallback((v: number) => formatNumber(v, sizeFormat ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [sizeFormat, locale]);

  // --- layout ------------------------------------------------------------------------------------
  const W = sizeState.width;
  const H = sizeState.height;
  const model = React.useMemo(() => {
    const visible = points.filter((p) => !hiddenSet.has(p.group));
    const src = visible.length ? visible : points;
    const ext = (vals: number[]): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of vals) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (!Number.isFinite(lo)) return [0, 1];
      if (lo === hi) return [lo - 1, hi + 1];
      const pad = (hi - lo) * 0.05;
      // Never pad non-negative data below zero (no "-$50K" axis for revenue).
      return [lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad];
    };
    const xLog = xAxis?.scale === "log" && !isTime;
    const yLog = yAxis?.scale === "log";
    // Log axes pad multiplicatively and stay positive.
    const extLog = (vals: number[]): [number, number] => {
      const pos = vals.filter((v) => v > 0);
      if (!pos.length) return [1, 10];
      const lo = Math.min(...pos);
      const hi = Math.max(...pos);
      return lo === hi ? [lo / 2, hi * 2] : [lo / 1.15, hi * 1.15];
    };
    const fullX = xLog ? extLog(src.map((p) => p.x)) : ext(src.map((p) => p.x));
    const fullY = yLog ? extLog(src.map((p) => p.y)) : ext(src.map((p) => p.y));
    const makeX = (d: [number, number], r: [number, number]): ContinuousScale =>
      isTime ? scaleUtc(d, r) : xLog ? scaleLog([Math.max(1e-9, d[0]), Math.max(2e-9, d[1])], r) : scaleLinear(d, r);
    const makeY = (d: [number, number], r: [number, number]): ContinuousScale => (yLog ? scaleLog([Math.max(1e-9, d[0]), Math.max(2e-9, d[1])], r) : scaleLinear(d, r));
    const xCount = xAxis?.tickCount ?? Math.max(2, Math.round(W / 110));
    const yCount = yAxis?.tickCount ?? Math.max(2, Math.round(H / 56));
    let xd: [number, number] = zoom ? [zoom[0], zoom[1]] : [xAxis?.min ?? fullX[0], xAxis?.max ?? fullX[1]];
    let yd: [number, number] = zoom ? [zoom[2], zoom[3]] : [yAxis?.min ?? fullY[0], yAxis?.max ?? fullY[1]];
    if (!zoom && !isTime) xd = [...makeX(xd, [0, 1]).nice(xCount).domain] as [number, number];
    if (!zoom) yd = [...makeY(yd, [0, 1]).nice(yCount).domain] as [number, number];
    if (!zoom && xAxis?.min !== undefined) xd[0] = xAxis.min;
    if (!zoom && xAxis?.max !== undefined) xd[1] = xAxis.max;
    if (!zoom && yAxis?.min !== undefined) yd[0] = yAxis.min;
    if (!zoom && yAxis?.max !== undefined) yd[1] = yAxis.max;
    const yFmt = yAxis?.format
      ? (v: number) => formatNumber(v, yAxis.format as NumberFormat, locale)
      : yLog
        ? (v: number) => formatNumber(v, { notation: "compact", maximumFractionDigits: 1 }, locale)
        : tickFormat(yd[0], yd[1], yCount, { locale, compact: true });
    const yTicksRaw = makeY(yd, [0, 1]).ticks(yCount);
    const labelW = Math.max(0, ...yTicksRaw.map((t) => estimateTextWidth(yFmt(t), FONT)));
    const margin = { top: 14, right: 18, bottom: 30 + (xAxis?.label ? 16 : 0), left: Math.ceil(labelW + 14 + (yAxis?.label ? 18 : 0)) };
    const plotW = Math.max(1, W - margin.left - margin.right);
    const plotH = Math.max(1, H - margin.top - margin.bottom);
    const xs = makeX(xd, [0, plotW]);
    const ys = makeY(yd, [plotH, 0]);
    const xFmt =
      typeof xAxis?.format === "function"
        ? xAxis.format
        : isTime
          ? multiTimeFormat(locale, timeZone)
          : xAxis?.format
            ? (v: number) => formatNumber(v, xAxis.format as NumberFormat, locale)
            : xLog
              ? (v: number) => formatNumber(v, { notation: "compact", maximumFractionDigits: 1 }, locale)
              : tickFormat(xd[0], xd[1], xCount, { locale, compact: true });
    const xTicks = (isTime ? timeTicks(xd[0], xd[1], xCount).ticks : xs.ticks(xCount)).map((t) => ({ v: t, pos: xs(t), label: xFmt(t) }));
    const yTicks = ys.ticks(yCount).map((t) => ({ v: t, pos: ys(t), label: yFmt(t) }));
    // Bubble scale: area-true (sqrt), across all points so toggling groups keeps sizes.
    let smax = 0;
    for (const p of points) if (p.s !== null && Math.abs(p.s) > smax) smax = Math.abs(p.s);
    const rOf = (p: Pt<T>) => (size && p.s !== null && smax > 0 ? sizeRange[0] + Math.sqrt(Math.abs(p.s) / smax) * (sizeRange[1] - sizeRange[0]) : radius);
    const geometry = new Float64Array(points.length * 3);
    const index = new GridIndex(24);
    points.forEach((p, k) => {
      const off = hiddenSet.has(p.group);
      const px = xs(p.x);
      const py = ys(p.y);
      geometry[k * 3] = px;
      geometry[k * 3 + 1] = py;
      geometry[k * 3 + 2] = off ? 0 : rOf(p);
      index.add(off ? Number.NaN : px, off ? Number.NaN : py);
    });
    return { margin, plotW, plotH, xs, ys, xd, yd, xTicks, yTicks, geometry, index, fullX, fullY, rOf };
  }, [points, hiddenSet, zoom, W, H, xAxis?.min, xAxis?.max, xAxis?.tickCount, xAxis?.format, xAxis?.label, xAxis?.scale, yAxis?.min, yAxis?.max, yAxis?.tickCount, yAxis?.format, yAxis?.label, yAxis?.scale, isTime, locale, timeZone, size, sizeRange, radius]);

  const tween = useDataTween(model.geometry, { enabled: anim.updates, resetKey: `${W}x${H}x${points.length}` });

  // Draw order: big bubbles first, so small ones stay on top; entrance ranks by x.
  const drawOrder = React.useMemo(() => points.map((_, k) => k).sort((a, b) => (model.geometry[b * 3 + 2] ?? 0) - (model.geometry[a * 3 + 2] ?? 0)), [points, model.geometry]);
  const xRank = React.useMemo(() => {
    const order = points.map((_, k) => k).sort((a, b) => (points[a] as Pt<T>).x - (points[b] as Pt<T>).x);
    const rank = new Array<number>(points.length);
    order.forEach((k, r) => {
      rank[k] = r;
    });
    return { order, rank };
  }, [points]);

  // --- trends ------------------------------------------------------------------------------------
  const xLogAxis = xAxis?.scale === "log" && !isTime;
  const yLogAxis = yAxis?.scale === "log";
  const tx = React.useCallback((v: number) => (xLogAxis ? Math.log10(Math.max(1e-12, v)) : v), [xLogAxis]);
  const ty = React.useCallback((v: number) => (yLogAxis ? Math.log10(Math.max(1e-12, v)) : v), [yLogAxis]);
  const unTy = (v: number) => (yLogAxis ? 10 ** v : v);
  const trends = React.useMemo(() => {
    if (trend === "none") return [];
    const sets = trend === "series" && hasGroups ? groups.filter((g) => !hiddenSet.has(g)) : [null];
    return sets
      .map((g) => {
        const pts = points.filter((p) => !hiddenSet.has(p.group) && (g === null || p.group === g));
        // Fit in the axes' own space, so the trend is straight on log axes too.
        const reg = linearRegression(
          pts.map((p) => tx(p.x)),
          pts.map((p) => ty(p.y)),
        );
        if (!reg) return null;
        return { group: g, reg, color: g === null ? "var(--pui-foreground)" : colorOf(g) };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [trend, hasGroups, groups, hiddenSet, points, colorOf, tx, ty]);

  // --- interaction -------------------------------------------------------------------------------
  const { margin: m, plotW, plotH } = model;
  const shown = active ?? focus;
  const activePoint = shown !== null ? points[shown] : undefined;
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const toPlot = (event: React.PointerEvent | React.WheelEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { px: ((event.clientX - rect.left) / Math.max(1, rect.width)) * plotW, py: ((event.clientY - rect.top) / Math.max(1, rect.height)) * plotH };
  };
  const nearest = (px: number, py: number) => {
    const k = model.index.nearest(px, py, hitRadius + sizeRange[1]);
    if (k < 0) return null;
    const dx = (model.geometry[k * 3] ?? 0) - px;
    const dy = (model.geometry[k * 3 + 1] ?? 0) - py;
    return Math.hypot(dx, dy) <= hitRadius + (model.geometry[k * 3 + 2] ?? 0) ? k : null;
  };
  const describe = (k: number) => {
    const p = points[k] as Pt<T>;
    const parts = [label ? String(readAccessor(label, p.datum, p.i)) : null, hasGroups ? p.group : null, `${xAxis?.label ?? "x"} ${fmtX(p.x)}`, `${yAxis?.label ?? "y"} ${fmtY(p.y)}`, p.s !== null ? `${sizeLabel} ${fmtS(p.s)}` : null];
    return parts.filter(Boolean).join(", ");
  };
  const commitZoom = (box: Box | null) => {
    setZoom(box);
    setAnnouncement(box ? `Zoomed to x ${fmtX(box[0])} to ${fmtX(box[1])}, y ${fmtY(box[2])} to ${fmtY(box[3])}` : "Zoom reset");
  };
  const selectRows = (ks: number[]) => {
    setSelected(ks);
    onSelectionChange?.(ks.map((k) => (points[k] as Pt<T>).datum));
  };

  const dragRef = React.useRef<{ x0: number; y0: number; mode: "zoom" | "select"; id: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (brush === "none" || event.button !== 0 || event.pointerType === "touch") return;
    const { px, py } = toPlot(event, event.currentTarget);
    const mode = event.shiftKey ? (brush === "zoom" ? "select" : "zoom") : brush;
    dragRef.current = { x0: px, y0: py, mode, id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const { px, py } = toPlot(event, event.currentTarget);
    const d = dragRef.current;
    if (d) {
      if (Math.abs(px - d.x0) > 4 || Math.abs(py - d.y0) > 4) {
        setDrag({ x0: d.x0, y0: d.y0, x1: Math.max(0, Math.min(plotW, px)), y1: Math.max(0, Math.min(plotH, py)), mode: d.mode });
        setActive(null);
      }
      return;
    }
    const k = nearest(px, py);
    setActive(k);
    setHoverGroup(null);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && drag) {
      const xa = Math.min(drag.x0, drag.x1);
      const xb = Math.max(drag.x0, drag.x1);
      const ya = Math.min(drag.y0, drag.y1);
      const yb = Math.max(drag.y0, drag.y1);
      setDrag(null);
      if (d.mode === "zoom") {
        // A thin box zooms one axis only.
        const zx = xb - xa > 8;
        const zy = yb - ya > 8;
        if (!zx && !zy) return;
        const box: Box = [
          zx ? model.xs.invert(xa) : model.xd[0],
          zx ? model.xs.invert(xb) : model.xd[1],
          zy ? model.ys.invert(yb) : model.yd[0],
          zy ? model.ys.invert(ya) : model.yd[1],
        ];
        commitZoom(box);
      } else {
        const ks: number[] = [];
        points.forEach((p, k) => {
          if (hiddenSet.has(p.group)) return;
          const px = model.geometry[k * 3] ?? 0;
          const py = model.geometry[k * 3 + 1] ?? 0;
          if (px >= xa && px <= xb && py >= ya && py <= yb) ks.push(k);
        });
        selectRows(ks);
        setAnnouncement(`${ks.length} point${ks.length === 1 ? "" : "s"} selected`);
      }
      return;
    }
    const { px, py } = toPlot(event, event.currentTarget);
    const k = nearest(px, py);
    if (k === null) return;
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const next = selectedSet.has(k) ? selected.filter((s) => s !== k) : additive ? [...selected, k] : [k];
    selectRows(next);
    onPointClick?.((points[k] as Pt<T>).datum, (points[k] as Pt<T>).i, event);
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!wheelZoom || !(event.ctrlKey || event.metaKey)) return;
    const f = wheelZoomFactor(event.deltaY, event.deltaMode);
    const { px, py } = toPlot(event, event.currentTarget);
    const ax = model.xs.invert(px);
    const ay = model.ys.invert(py);
    const [x0, x1] = model.xd;
    const [y0, y1] = model.yd;
    const next: Box = [ax - (ax - x0) / f, ax + (x1 - ax) / f, ay - (ay - y0) / f, ay + (y1 - ay) / f];
    if (f < 1 && next[1] - next[0] >= model.fullX[1] - model.fullX[0] && next[3] - next[2] >= model.fullY[1] - model.fullY[0]) {
      setZoom(null);
      return;
    }
    setZoom(next);
  };
  // Wheel zoom must be able to preventDefault (React wheel listeners are passive).
  const overlayRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = overlayRef.current;
    if (!el || !wheelZoom) return;
    const block = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, [wheelZoom]);

  const visibleOrder = xRank.order.filter((k) => !hiddenSet.has((points[k] as Pt<T>).group));
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const pos = focus === null ? -1 : visibleOrder.indexOf(focus);
    let next: number | null = null;
    const page = Math.max(1, Math.round(visibleOrder.length * 0.1));
    switch (event.key) {
      case "ArrowRight":
        next = visibleOrder[pos < 0 ? 0 : Math.min(visibleOrder.length - 1, pos + 1)] ?? null;
        break;
      case "ArrowLeft":
        next = visibleOrder[pos < 0 ? visibleOrder.length - 1 : Math.max(0, pos - 1)] ?? null;
        break;
      case "PageDown":
        next = visibleOrder[Math.min(visibleOrder.length - 1, Math.max(0, pos) + page)] ?? null;
        break;
      case "PageUp":
        next = visibleOrder[Math.max(0, pos - page)] ?? null;
        break;
      case "Home":
        next = visibleOrder[0] ?? null;
        break;
      case "End":
        next = visibleOrder[visibleOrder.length - 1] ?? null;
        break;
      case "ArrowUp":
      case "ArrowDown": {
        // The nearest point above / below the focused one (by y), so the keyboard can move in 2D.
        const cur = focus !== null ? points[focus] : undefined;
        if (!cur) {
          next = visibleOrder[0] ?? null;
          break;
        }
        const dir = event.key === "ArrowUp" ? 1 : -1;
        let best: number | null = null;
        let bestD = Infinity;
        for (const k of visibleOrder) {
          const p = points[k] as Pt<T>;
          if ((p.y - cur.y) * dir <= 0 || k === focus) continue;
          const dx = ((model.geometry[k * 3] ?? 0) - (model.geometry[focus as number * 3] ?? 0)) * 2;
          const dy = (model.geometry[k * 3 + 1] ?? 0) - (model.geometry[(focus as number) * 3 + 1] ?? 0);
          const d = Math.hypot(dx, dy);
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        }
        next = best ?? focus;
        break;
      }
      case "Enter":
      case " ":
        if (focus === null) return;
        event.preventDefault();
        selectRows(selectedSet.has(focus) ? selected.filter((s) => s !== focus) : event.shiftKey ? [...selected, focus] : [focus]);
        onPointClick?.((points[focus] as Pt<T>).datum, (points[focus] as Pt<T>).i, event);
        return;
      case "Escape":
        if (selected.length) selectRows([]);
        else if (zoom) commitZoom(null);
        else return;
        event.preventDefault();
        return;
      case "+":
      case "=":
      case "-":
      case "_": {
        event.preventDefault();
        const f = event.key === "+" || event.key === "=" ? 1.4 : 1 / 1.4;
        const cur = focus !== null ? points[focus] : undefined;
        const ax = cur?.x ?? (model.xd[0] + model.xd[1]) / 2;
        const ay = cur?.y ?? (model.yd[0] + model.yd[1]) / 2;
        const [x0, x1] = model.xd;
        const [y0, y1] = model.yd;
        commitZoom([ax - (ax - x0) / f, ax + (x1 - ax) / f, ay - (ay - y0) / f, ay + (y1 - ay) / f]);
        return;
      }
      case "0":
        if (!zoom) return;
        event.preventDefault();
        commitZoom(null);
        return;
      case "t":
      case "T":
        event.preventDefault();
        setTableVisible((v) => !v);
        return;
      default:
        return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(`${describe(next)}. Point ${visibleOrder.indexOf(next) + 1} of ${visibleOrder.length}.`);
  };

  const toggle = (g: string, alt: boolean) => {
    if (alt) {
      if (solo?.key === g) {
        setHidden(solo.restore);
        setSolo(null);
      } else {
        setSolo({ key: g, restore: solo ? solo.restore : hidden });
        setHidden(groups.filter((x) => x !== g));
      }
      return;
    }
    setSolo(null);
    setHidden(hiddenSet.has(g) ? hidden.filter((x) => x !== g) : [...hidden, g]);
  };

  // --- render ------------------------------------------------------------------------------------
  const focusGroup = hoverGroup ?? activePoint?.group ?? null;
  const dense = points.length > 300;
  const baseOpacity = dense ? 0.55 : 0.82;
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Scatter chart");
  const overall = linearRegression(
    points.filter((p) => !hiddenSet.has(p.group)).map((p) => p.x),
    points.filter((p) => !hiddenSet.has(p.group)).map((p) => p.y),
  );
  const r = overall && Number.isFinite(overall.r2) ? Math.sign(overall.slope) * Math.sqrt(overall.r2) : null;
  const strength = r === null ? "" : Math.abs(r) > 0.7 ? "strong" : Math.abs(r) > 0.4 ? "moderate" : Math.abs(r) > 0.2 ? "weak" : "no clear";
  const summaryText =
    summary ??
    `${points.length - points.filter((p) => hiddenSet.has(p.group)).length} points${hasGroups ? ` in ${groups.length - hiddenSet.size} groups` : ""}. ${
      r === null ? "" : `${strength[0]?.toUpperCase()}${strength.slice(1)} ${r >= 0 ? "positive" : "negative"} correlation (r = ${r.toFixed(2)}). `
    }${xAxis?.label ?? "x"} from ${fmtX(model.fullX[0])} to ${fmtX(model.fullX[1])}; ${yAxis?.label ?? "y"} from ${fmtY(model.fullY[0])} to ${fmtY(model.fullY[1])}.`;
  const pct = (v: number, of: number) => `${(v / Math.max(1, of)) * 100}%`;
  const transition = anim.reducedMotion ? instant : glide;
  const tickTransition = anim.updates ? chartMotion.update : instant;
  const ax = activePoint ? (model.geometry[(shown as number) * 3] ?? 0) : 0;
  const ay = activePoint ? (model.geometry[(shown as number) * 3 + 1] ?? 0) : 0;
  const inView = ax >= 0 && ax <= plotW && ay >= 0 && ay <= plotH;
  const pill = (px: number, py: number, text: string, anchor: "middle" | "end") => {
    const w = estimateTextWidth(text, FONT) + 14;
    const left = anchor === "middle" ? px - w / 2 : px - w;
    return (
      <g>
        <rect x={left} y={py - 10} width={w} height={20} rx={6} fill="var(--pui-chart-tooltip-fg)" />
        <text x={left + w / 2} y={py + 4} textAnchor="middle" fontSize={FONT} fontWeight={600} fill="var(--pui-chart-tooltip-bg)" className="tabular-nums">
          {text}
        </text>
      </g>
    );
  };
  const selectionStats =
    selected.length > 1
      ? (() => {
          const ys = selected.map((k) => (points[k] as Pt<T>).y);
          return `${selected.length} selected \u00b7 avg ${fmtY(ys.reduce((a, v) => a + v, 0) / ys.length)}`;
        })()
      : null;

  const legendNode =
    legendPos === "none" || !hasGroups ? null : (
      <div role="group" aria-label="Groups" className={cn(blockReset, "flex flex-wrap items-center gap-1")}>
        {groups.map((g) => {
          const off = hiddenSet.has(g);
          const count = points.filter((p) => p.group === g).length;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={!off}
              title="Click to toggle, Alt+click to show only this group"
              onClick={(event) => toggle(g, event.altKey)}
              onPointerEnter={() => !off && setHoverGroup(g)}
              onPointerLeave={() => setHoverGroup(null)}
              onFocus={() => !off && setHoverGroup(g)}
              onBlur={() => setHoverGroup(null)}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-pui-md px-2 py-1 text-xs transition-[opacity,background-color] duration-150 hover:bg-pui-muted",
                off ? "text-pui-muted-foreground" : "text-pui-foreground",
                focusGroup && focusGroup !== g ? "opacity-50" : "",
              )}
            >
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ scale: off ? 0.7 : 1, opacity: off ? 0.4 : 1 }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 30 }}
                className={cn(blockReset, "size-2.5 shrink-0 rounded-pui-full")}
                style={{ background: colorOf(g) }}
              />
              <span className={cn(blockReset, off ? "line-through decoration-1" : "")}>{g}</span>
              <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>{count}</span>
            </button>
          );
        })}
      </div>
    );

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={descId}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={titleId} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      {legendPos === "top" ? legendNode : null}
      <div ref={containerRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <clipPath id={`${uid}-clip`}>
              <rect x={-2} y={-2} width={plotW + 4} height={plotH + 4} />
            </clipPath>
          </defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {/* grid + axes */}
            <g stroke="var(--pui-chart-grid)" shapeRendering="crispEdges">
              <AnimatePresence initial={false}>
                {model.yTicks.map((t) => (
                  <motion.line key={`y${t.v}`} initial={{ opacity: 0, y: t.pos }} animate={{ opacity: 1, y: t.pos }} exit={{ opacity: 0 }} transition={tickTransition} x1={0} x2={plotW} />
                ))}
                {model.xTicks.map((t) => (
                  <motion.line key={`x${t.v}`} initial={{ opacity: 0, x: t.pos }} animate={{ opacity: 1, x: t.pos }} exit={{ opacity: 0 }} transition={tickTransition} y1={0} y2={plotH} />
                ))}
              </AnimatePresence>
            </g>
            <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="var(--pui-chart-axis)" />
            <g fontSize={FONT} fill="var(--pui-muted-foreground)" className="tabular-nums">
              <AnimatePresence initial={false}>
                {model.yTicks.map((t) => (
                  <motion.text key={`yl${t.v}`} initial={{ opacity: 0, y: t.pos }} animate={{ opacity: 1, y: t.pos }} exit={{ opacity: 0 }} transition={tickTransition} x={-10} dy="0.32em" textAnchor="end">
                    {t.label}
                  </motion.text>
                ))}
                {model.xTicks.map((t) => (
                  <motion.text key={`xl${t.v}`} initial={{ opacity: 0, x: t.pos }} animate={{ opacity: 1, x: t.pos }} exit={{ opacity: 0 }} transition={tickTransition} y={plotH + 18} textAnchor="middle">
                    {t.label}
                  </motion.text>
                ))}
              </AnimatePresence>
              {xAxis?.label ? (
                <text x={plotW / 2} y={plotH + 40} textAnchor="middle" fontWeight={600} fill="var(--pui-foreground)">
                  {xAxis.label}
                </text>
              ) : null}
              {yAxis?.label ? (
                <text transform={`translate(${-m.left + 12},${plotH / 2}) rotate(-90)`} textAnchor="middle" fontWeight={600} fill="var(--pui-foreground)">
                  {yAxis.label}
                </text>
              ) : null}
            </g>
            <g clipPath={`url(#${uid}-clip)`}>
              {quadrants
                ? (() => {
                    const qx = model.xs(quadrants.x);
                    const qy = model.ys(quadrants.y);
                    const labels = quadrants.labels;
                    return (
                      <g aria-hidden="true">
                        <motion.rect initial={false} animate={{ x: qx, y: 0, width: Math.max(0, plotW - qx), height: Math.max(0, qy) }} transition={tickTransition} fill="color-mix(in oklab, var(--pui-success) 6%, transparent)" />
                        <motion.rect initial={false} animate={{ x: 0, y: qy, width: Math.max(0, qx), height: Math.max(0, plotH - qy) }} transition={tickTransition} fill="color-mix(in oklab, var(--pui-danger) 5%, transparent)" />
                        <motion.line initial={false} animate={{ x1: qx, x2: qx }} transition={tickTransition} y1={0} y2={plotH} stroke="var(--pui-chart-crosshair)" strokeDasharray="5 4" />
                        <motion.line initial={false} animate={{ y1: qy, y2: qy }} transition={tickTransition} x1={0} x2={plotW} stroke="var(--pui-chart-crosshair)" strokeDasharray="5 4" />
                        {labels ? (
                          <g fontSize={11} fontWeight={600} fill="var(--pui-muted-foreground)">
                            <text x={8} y={16}>
                              {labels[0]}
                            </text>
                            <text x={plotW - 8} y={16} textAnchor="end">
                              {labels[1]}
                            </text>
                            <text x={8} y={plotH - 8}>
                              {labels[2]}
                            </text>
                            <text x={plotW - 8} y={plotH - 8} textAnchor="end">
                              {labels[3]}
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })()
                : null}
              {trends.map((t) => {
                const [x0, x1] = model.xd;
                const p0 = { x: model.xs(x0), y: model.ys(unTy(t.reg.predict(tx(x0)))) };
                const p1 = { x: model.xs(x1), y: model.ys(unTy(t.reg.predict(tx(x1)))) };
                const dim = focusGroup !== null && t.group !== null && t.group !== focusGroup;
                return (
                  <motion.line
                    key={t.group ?? "__all"}
                    initial={anim.entrance ? { opacity: 0, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y } : false}
                    animate={{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, opacity: dim ? 0.2 : 0.9 }}
                    transition={anim.reducedMotion ? instant : anim.entrance ? { ...chartMotion.update, opacity: { duration: 0.5, delay: 0.55 } } : chartMotion.update}
                    stroke={t.color}
                    strokeWidth={2}
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                  />
                );
              })}
              <g>
                {drawOrder.map((k) => {
                  const p = points[k] as Pt<T>;
                  const off = hiddenSet.has(p.group);
                  let opacity = off ? 0 : baseOpacity;
                  if (!off && selected.length) opacity = selectedSet.has(k) ? 1 : 0.18;
                  else if (!off && focusGroup !== null && hasGroups && p.group !== focusGroup) opacity = 0.16;
                  if (!off && shown === k) opacity = 1;
                  return (
                    <ScatterPoint
                      key={p.i}
                      tween={tween}
                      index={k}
                      color={colorOf(p.group)}
                      opacity={opacity}
                      delay={Math.min(0.6, ((xRank.rank[k] ?? 0) / Math.max(1, points.length)) * 0.6)}
                      entrance={anim.entrance}
                      emphasis={shown === k ? "active" : selectedSet.has(k) ? "selected" : "none"}
                      reducedMotion={anim.reducedMotion}
                    />
                  );
                })}
              </g>
            </g>
            {/* crosshair to the axes, with value pills */}
            {activePoint && inView && !drag ? (
              <motion.g initial={false} animate={{ opacity: 1 }} pointerEvents="none">
                <motion.line initial={false} animate={{ x1: ax, x2: ax, y1: ay, y2: plotH }} transition={transition} stroke={colorOf(activePoint.group)} strokeOpacity={0.55} strokeDasharray="3 3" />
                <motion.line initial={false} animate={{ x1: 0, x2: ax, y1: ay, y2: ay }} transition={transition} stroke={colorOf(activePoint.group)} strokeOpacity={0.55} strokeDasharray="3 3" />
                <motion.g initial={false} animate={{ x: ax }} transition={transition}>
                  {pill(0, plotH + 14, isTime ? fmtX(activePoint.x) : fmtX(activePoint.x), "middle")}
                </motion.g>
                <motion.g initial={false} animate={{ y: ay }} transition={transition}>
                  {pill(-6, 0, fmtY(activePoint.y), "end")}
                </motion.g>
              </motion.g>
            ) : null}
            {trends.length ? (
              <g fontSize={10.5} fontWeight={600} pointerEvents="none">
                {trends.map((t, k) => (
                  <text key={t.group ?? "__all"} x={plotW - 6} y={(zoom ? 48 : 14) + k * 15} textAnchor="end" fill={t.color} className="tabular-nums">
                    {t.group ? `${t.group} ` : "Trend "}
                    {"R\u00b2 "}
                    {Number.isFinite(t.reg.r2) ? t.reg.r2.toFixed(2) : "\u2013"}
                  </text>
                ))}
              </g>
            ) : null}
          </g>
        </svg>
        <div
          ref={overlayRef}
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to explore.`}
          aria-describedby={`${uid}-help`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            if (!dragRef.current) setActive(null);
          }}
          onDoubleClick={() => zoom && commitZoom(null)}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute rounded-pui-sm", active !== null ? "cursor-pointer" : brush !== "none" ? "cursor-crosshair" : "cursor-default")}
          style={{ left: pct(m.left, W), top: pct(m.top, H), width: pct(plotW, W), height: pct(plotH, H), touchAction: "pan-y" }}
        />
        {drag ? (
          <div
            aria-hidden="true"
            className={cn(
              blockReset,
              "pointer-events-none absolute rounded-pui-sm border",
              drag.mode === "zoom" ? "border-pui-primary/70 bg-pui-primary/10" : "border-dashed border-pui-foreground/50 bg-pui-foreground/5",
            )}
            style={{
              left: pct(m.left + Math.min(drag.x0, drag.x1), W),
              top: pct(m.top + Math.min(drag.y0, drag.y1), H),
              width: pct(Math.abs(drag.x1 - drag.x0), W),
              height: pct(Math.abs(drag.y1 - drag.y0), H),
            }}
          />
        ) : null}
        <AnimatePresence>
          {zoom ? (
            <motion.button
              key="reset"
              type="button"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 520, damping: 34 }}
              onClick={() => commitZoom(null)}
              className={cn(
                controlReset,
                focusRing,
                "absolute z-20 inline-flex h-7 cursor-pointer items-center gap-1 rounded-pui-md border border-pui-border bg-pui-surface px-2 text-xs font-medium shadow-pui-sm transition-colors hover:bg-pui-muted",
              )}
              style={{ right: pct(m.right + 6, W), top: pct(m.top + 6, H) }}
            >
              <svg viewBox="0 0 16 16" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" strokeLinecap="round" />
                <path d="M2.5 2.5v2.8h2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {resetZoomLabel}
            </motion.button>
          ) : null}
        </AnimatePresence>
        {selectionStats ? (
          <div
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute z-10 rounded-pui-full bg-pui-chart-tooltip-fg px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-pui-chart-tooltip-bg shadow-pui-md")}
            style={{ left: pct(m.left + 8, W), top: pct(m.top + 6, H) }}
          >
            {selectionStats}
          </div>
        ) : null}
        <AnimatePresence>
          {activePoint && inView && !drag ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94, left: pct(m.left + ax, W), top: pct(m.top + ay, H) }}
              animate={{ opacity: 1, scale: 1, left: pct(m.left + ax, W), top: pct(m.top + ay, H) }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={transition}
              className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
            >
              <div
                className={cn(
                  blockReset,
                  "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md transition-transform duration-200 ease-pui-out",
                )}
                style={{ transform: `translate(${(m.left + ax) / W > 0.6 ? "calc(-100% - 16px)" : "16px"}, ${(m.top + ay) / H > 0.6 ? "calc(-100% + 8px)" : "-8px"})` }}
              >
                {label ? <div className={cn(blockReset, "mb-1 text-xs font-semibold")}>{String(readAccessor(label, activePoint.datum, activePoint.i))}</div> : null}
                {hasGroups ? (
                  <div className={cn(blockReset, "mb-1 flex items-center gap-1.5 text-[11px] text-pui-muted-foreground")}>
                    <span aria-hidden="true" className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: colorOf(activePoint.group) }} />
                    {activePoint.group}
                  </div>
                ) : null}
                <dl className={cn(blockReset, "grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs")}>
                  <dt className={cn(blockReset, "text-pui-muted-foreground")}>{xAxis?.label ?? "x"}</dt>
                  <dd className={cn(blockReset, "m-0 text-right font-semibold tabular-nums")}>{fmtX(activePoint.x)}</dd>
                  <dt className={cn(blockReset, "text-pui-muted-foreground")}>{yAxis?.label ?? "y"}</dt>
                  <dd className={cn(blockReset, "m-0 text-right font-semibold tabular-nums")}>{fmtY(activePoint.y)}</dd>
                  {activePoint.s !== null ? (
                    <>
                      <dt className={cn(blockReset, "text-pui-muted-foreground")}>{sizeLabel}</dt>
                      <dd className={cn(blockReset, "m-0 text-right font-semibold tabular-nums")}>{fmtS(activePoint.s)}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {legendPos === "bottom" ? legendNode : null}
      <span id={`${uid}-help`} className={srOnly}>
        Left and right arrows move through the points by x, up and down move to the nearest point above or below, Enter selects, plus and minus zoom, 0 resets, Escape clears, T shows the data table.
      </span>
      <p id={descId} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
      <div className={tableVisible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : srOnly}>
        <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
          <caption className={cn(blockReset, tableVisible ? "px-3 py-2 text-left font-medium" : "")}>
            {typeof title === "string" ? title : nameText}
            {points.length > 500 ? ` (first 500 of ${points.length} rows)` : ""}
          </caption>
          <thead>
            <tr>
              {label ? <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>Name</th> : null}
              {hasGroups ? <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>Group</th> : null}
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                {xAxis?.label ?? "x"}
              </th>
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                {yAxis?.label ?? "y"}
              </th>
              {size ? <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>{sizeLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {points.slice(0, 500).map((p) => (
              <tr key={p.i} className={cn(blockReset, "border-t border-pui-border")}>
                {label ? <td className={cn(blockReset, "px-3 py-1")}>{String(readAccessor(label, p.datum, p.i))}</td> : null}
                {hasGroups ? <td className={cn(blockReset, "px-3 py-1")}>{p.group}</td> : null}
                <td className={cn(blockReset, "px-3 py-1")}>{fmtX(p.x)}</td>
                <td className={cn(blockReset, "px-3 py-1")}>{fmtY(p.y)}</td>
                {size ? <td className={cn(blockReset, "px-3 py-1")}>{p.s === null ? "\u2013" : fmtS(p.s)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Scatter / bubble chart with groups, trend lines (R²), quadrants, 2D snapping hover, box zoom,
 * brush selection and keyboard exploration. Every data, zoom and legend change glides.
 */
export const ScatterChart = React.forwardRef(ScatterChartInner) as (<T>(props: ScatterChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
ScatterChart.displayName = "ScatterChart";
