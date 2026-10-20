"use client";

// Zoom, pan, brush and a navigator minimap for <Chart> (and the presets built on it), as opt-in
// children. The math lives in core/zoom.ts; these parts turn wheel, drag, pinch, double-click and
// keys into a new x window, which the chart stores like any other controlled state. Data updates
// tween, so every zoom glides; a drag pans 1:1 with the pointer.
import { animate, AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { useChart, useChartLayer, type ChartContextValue } from "./core/cartesian";
import { estimateTextWidth } from "./core/format";
import { areaToBaseline, linePath, type Point } from "./core/path";
import { chartMotion } from "./core/use-chart-motion";
import { brushDomain, clampDomain, isZoomed, panBy, pinchFactor, wheelZoomFactor, zoomAround, type Span } from "./core/zoom";

const instant: Transition = { duration: 0 };
const pop: Transition = { type: "spring", stiffness: 520, damping: 34 };
/** Rubber-band overscroll: resisted, and never more than 40 px. */
const OVERSCROLL = 40;
const rubber = (px: number) => Math.sign(px) * OVERSCROLL * (1 - Math.exp(-Math.abs(px) / (OVERSCROLL * 2.5)));

/** Pointer position in plot px. */
function plotPoint(ctx: ChartContextValue, el: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const sx = rect.width ? ctx.model.plotW / rect.width : 1;
  const sy = rect.height ? ctx.model.plotH / rect.height : 1;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

/** Plot px along x to a data value in the window. */
function invertX(window: Span, plotW: number, px: number): number {
  return window[0] + (Math.max(0, Math.min(plotW, px)) / Math.max(1, plotW)) * (window[1] - window[0]);
}

/** Default smallest window: two data steps. */
function defaultMinSpan(extent: Span, n: number): number {
  return n > 1 ? ((extent[1] - extent[0]) / (n - 1)) * 2 : (extent[1] - extent[0]) / 10;
}

const pctOf = (v: number, of: number) => `${(v / Math.max(1, of)) * 100}%`;

function useIsMac(): boolean {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMac(/Mac|iPhone|iPad/.test(navigator.userAgent)));
    return () => cancelAnimationFrame(id);
  }, []);
  return mac;
}

// ---------------------------------------------------------------------------------------------
// ChartZoom

export interface ChartZoomProps {
  /** Wheel zoom: only with Ctrl/Cmd held ("modifier", so the page never scroll-jacks), always, or off. Default "modifier". */
  wheel?: "modifier" | "always" | false;
  /** Plain drag: pan the zoomed window, or draw a brush and zoom to it. Shift does the other one. Default "pan". */
  drag?: "pan" | "brush";
  /** Two-finger pinch on touch screens. Default true. */
  pinch?: boolean;
  /** Smallest window in x units (ms on time axes). Default: two data steps. */
  minSpan?: number;
  /** Double-click resets. Default true. */
  resetOnDoubleClick?: boolean;
  /** Show a "Reset zoom" button and the zoom factor while zoomed. Default true. */
  resetButton?: boolean;
  resetZoomLabel?: string;
  /** Hint shown when the wheel is used without the modifier. Default "Hold Ctrl (⌘ on Mac) and scroll to zoom". */
  hintLabel?: string;
}

interface Gesture {
  kind: "pan" | "brush" | "pinch";
  startX: number;
  startDomain: Span;
  moved: boolean;
  /** Pinch: start distance and the anchor value. */
  startDistance?: number;
  anchor?: number;
}

function ZoomController({
  wheel = "modifier",
  drag = "pan",
  pinch = true,
  minSpan,
  resetOnDoubleClick = true,
  resetButton = true,
  resetZoomLabel = "Reset zoom",
  hintLabel,
}: ChartZoomProps) {
  const ctx = useChart();
  const { model, extent, xDomain, registerZoom, animation } = ctx;
  const ctxRef = React.useRef(ctx);
  useIsomorphicLayoutEffect(() => {
    ctxRef.current = ctx;
  });
  const [brush, setBrush] = React.useState<[number, number] | null>(null);
  const [hint, setHint] = React.useState(false);
  const mac = useIsMac();
  const span = minSpan ?? (extent ? defaultMinSpan(extent, model.n) : 1);

  React.useEffect(() => {
    if (!extent) return;
    registerZoom({ minSpan: span });
    return () => registerZoom(null);
  }, [registerZoom, extent, span]);

  const optionsRef = React.useRef({ wheel, drag, pinch, resetOnDoubleClick, span });
  useIsomorphicLayoutEffect(() => {
    optionsRef.current = { wheel, drag, pinch, resetOnDoubleClick, span };
  });

  React.useEffect(() => {
    const el = ctx.overlayRef.current;
    if (!el || !extent) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let gesture: Gesture | null = null;
    let hintTimer = 0;

    const limits = () => ({ extent, minSpan: optionsRef.current.span });
    const current = (): Span => ctxRef.current.store.getState().xDomain ?? extent;
    const commit = (next: Span | null) => {
      const c = ctxRef.current;
      if (!next) {
        c.setXDomain(null);
        return;
      }
      const clamped = clampDomain(next, limits());
      c.setXDomain(isZoomed(clamped, extent) ? clamped : null);
    };
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onWheel = (event: WheelEvent) => {
      const o = optionsRef.current;
      if (!o.wheel) return;
      const zoomed = isZoomed(ctxRef.current.store.getState().xDomain, extent);
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5;
      if (horizontal && zoomed) {
        // Trackpad horizontal swipe pans the zoomed window.
        event.preventDefault();
        const w = current();
        commit(panBy(w, (event.deltaX / Math.max(1, ctxRef.current.model.plotW)) * (w[1] - w[0]), limits()));
        return;
      }
      if (o.wheel === "modifier" && !event.ctrlKey && !event.metaKey) {
        window.clearTimeout(hintTimer);
        setHint(true);
        hintTimer = window.setTimeout(() => setHint(false), 1200);
        return;
      }
      event.preventDefault();
      const w = current();
      const p = plotPoint(ctxRef.current, el, event.clientX, event.clientY);
      commit(zoomAround(w, wheelZoomFactor(event.deltaY, event.deltaMode), invertX(w, ctxRef.current.model.plotW, p.x), limits()));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const p = plotPoint(ctxRef.current, el, event.clientX, event.clientY);
      pointers.set(event.pointerId, p);
      const o = optionsRef.current;
      const w = current();
      if (pointers.size === 2 && o.pinch) {
        const pts = [...pointers.values()];
        const mid = ((pts[0]?.x ?? 0) + (pts[1]?.x ?? 0)) / 2;
        gesture = { kind: "pinch", startX: mid, startDomain: w, moved: true, startDistance: distance(), anchor: invertX(w, ctxRef.current.model.plotW, mid) };
        setBrush(null);
        return;
      }
      if (pointers.size > 1) return;
      const zoomed = isZoomed(ctxRef.current.store.getState().xDomain, extent);
      let kind: "pan" | "brush" = event.shiftKey ? (o.drag === "pan" ? "brush" : "pan") : o.drag;
      // At the full extent there is nothing to pan: a drag zooms instead.
      if (kind === "pan" && !zoomed) kind = "brush";
      if (event.pointerType === "touch" && kind === "brush" && !event.shiftKey) {
        // Touch drags scrub the tooltip; only pinch zooms.
        gesture = null;
        return;
      }
      gesture = { kind, startX: p.x, startDomain: w, moved: false };
      el.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const c = ctxRef.current;
      const p = plotPoint(c, el, event.clientX, event.clientY);
      pointers.set(event.pointerId, p);
      if (!gesture) return;
      if (gesture.kind === "pinch") {
        const factor = pinchFactor(gesture.startDistance ?? 0, distance());
        commit(zoomAround(gesture.startDomain, factor, gesture.anchor ?? (gesture.startDomain[0] + gesture.startDomain[1]) / 2, limits()));
        return;
      }
      const dx = p.x - gesture.startX;
      if (!gesture.moved && Math.abs(dx) < 4) return;
      if (!gesture.moved) {
        gesture.moved = true;
        if (gesture.kind === "pan") c.setInteracting(true);
      }
      if (gesture.kind === "pan") {
        const w = gesture.startDomain;
        const span = w[1] - w[0];
        const shift = (-dx / Math.max(1, c.model.plotW)) * span;
        const next = panBy(w, shift, limits());
        commit(next);
        // Past an edge the marks stretch a little (the window itself stays clamped), then spring back.
        if (!c.animation.reducedMotion && span > 0) {
          const overPx = ((w[0] + shift - next[0]) / span) * c.model.plotW;
          c.panOffset.set(-rubber(overPx));
        }
      } else {
        const x0 = Math.max(0, Math.min(c.model.plotW, gesture.startX));
        const x1 = Math.max(0, Math.min(c.model.plotW, p.x));
        setBrush([Math.min(x0, x1), Math.max(x0, x1)]);
      }
    };

    const end = (event: PointerEvent) => {
      const had = pointers.delete(event.pointerId);
      if (!had || !gesture) return;
      const g = gesture;
      const c = ctxRef.current;
      if (g.kind === "pinch") {
        if (pointers.size === 0) gesture = null;
        event.stopPropagation();
        return;
      }
      gesture = null;
      if (g.kind === "pan") {
        c.setInteracting(false);
        if (c.panOffset.get() !== 0) animate(c.panOffset, 0, chartMotion.hover);
      }
      if (g.kind === "brush") {
        setBrush(null);
        const p = plotPoint(c, el, event.clientX, event.clientY);
        if (g.moved && Math.abs(p.x - g.startX) > 6) {
          const next = brushDomain(g.startX, p.x, (px) => invertX(g.startDomain, c.model.plotW, px));
          commit(next);
          c.store.announce(`Zoomed to ${c.model.formatXValue(next[0])} \u2013 ${c.model.formatXValue(next[1])}`);
        }
      }
      // A drag is not a click: keep the chart from selecting the mark under the release point.
      if (g.moved) event.stopPropagation();
    };

    const onDoubleClick = () => {
      if (!optionsRef.current.resetOnDoubleClick) return;
      commit(null);
      ctxRef.current.store.announce("Zoom reset");
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("dblclick", onDoubleClick);
    return () => {
      window.clearTimeout(hintTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("dblclick", onDoubleClick);
      ctxRef.current.setInteracting(false);
    };
  }, [ctx.overlayRef, extent]);

  if (!extent) return null;
  const { margin: m, width: W, height: H } = model;
  const zoomed = isZoomed(xDomain, extent);
  const factor = xDomain ? (extent[1] - extent[0]) / Math.max(1e-9, xDomain[1] - xDomain[0]) : 1;
  const fade = animation.reducedMotion ? instant : pop;
  return (
    <>
      {brush ? (
        <div
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute rounded-pui-sm border border-pui-primary/60 bg-pui-primary/12")}
          style={{ left: pctOf(m.left + brush[0], W), width: pctOf(brush[1] - brush[0], W), top: pctOf(m.top, H), height: pctOf(model.plotH, H) }}
        />
      ) : null}
      <AnimatePresence>
        {hint ? (
          <motion.div
            key="hint"
            aria-hidden="true"
            initial={animation.reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={fade}
            className={cn(
              blockReset,
              "pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-pui-full bg-pui-chart-tooltip-fg px-3 py-1.5 text-xs font-medium text-pui-chart-tooltip-bg shadow-pui-lg",
            )}
          >
            {hintLabel ?? `Hold ${mac ? "\u2318" : "Ctrl"} and scroll to zoom`}
          </motion.div>
        ) : null}
        {resetButton && zoomed ? (
          <motion.div
            key="reset"
            initial={animation.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
            transition={fade}
            className={cn(blockReset, "absolute z-20 flex items-center gap-1.5")}
            style={{ right: pctOf(m.right + 6, W), top: pctOf(m.top + 6, H) }}
          >
            <span className={cn(blockReset, "rounded-pui-full bg-pui-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-pui-muted-foreground")}>
              {factor >= 10 ? Math.round(factor) : factor.toFixed(1)}&times;
            </span>
            <button
              type="button"
              onClick={() => ctx.setXDomain(null)}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex h-7 cursor-pointer items-center gap-1 rounded-pui-md border border-pui-border bg-pui-surface px-2 text-xs font-medium text-pui-foreground shadow-pui-sm transition-colors hover:bg-pui-muted",
              )}
            >
              <svg viewBox="0 0 16 16" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" strokeLinecap="round" />
                <path d="M2.5 2.5v2.8h2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {resetZoomLabel}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Zoom and pan for continuous x axes: Ctrl/Cmd + wheel (or a trackpad pinch) zooms around the
 * pointer, drag pans, Shift+drag (or a drag at full extent) brushes a window, two fingers pinch,
 * double-click resets, and + / - / 0 / Shift+arrows work from the keyboard. Band axes ignore it.
 */
export function ChartZoom(props: ChartZoomProps) {
  return useChartLayer() === "html" ? <ZoomController {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// ChartNavigator

export interface ChartNavigatorProps {
  /** Height in px. Default 48. */
  height?: number;
  /** Series drawn in the minimap. Default: the first visible line or area. */
  seriesId?: string;
  /** Accessible names of the two window handles. */
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

function NavigatorLayer({ height = 48, seriesId, startLabel = "Window start", endLabel = "Window end", className }: ChartNavigatorProps) {
  const ctx = useChart();
  const { model, extent, xDomain, zoom, setXDomain, setInteracting, uid, animation } = ctx;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ part: "window" | "start" | "end"; startPx: number; startDomain: Span } | null>(null);
  const series = model.series.find((s) => (seriesId ? s.id === seriesId : !s.hidden && s.kind !== "bar")) ?? model.series[0];

  const mini = React.useMemo(() => {
    if (!extent || !series) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of series.values) {
      if (v === null) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) return null;
    if (hi === lo) hi = lo + 1;
    const h = height - 8;
    const pts: Array<Point | null> = series.values.map((v, i) =>
      v === null ? null : [((model.xNum[i] as number) - extent[0]) / (extent[1] - extent[0]) * model.plotW, 4 + h - ((v - lo) / (hi - lo)) * h],
    );
    return { line: linePath(pts, { curve: "monotone" }), area: areaToBaseline(pts, height, { curve: "monotone" }) };
  }, [extent, series, height, model.plotW, model.xNum]);

  if (!extent || !mini || !series) return null;
  const win: Span = xDomain ?? extent;
  const full = extent[1] - extent[0];
  const toPx = (v: number) => ((v - extent[0]) / full) * model.plotW;
  const a = toPx(win[0]);
  const b = toPx(win[1]);
  const { margin: m, width: W } = model;
  const limits = { extent, minSpan: zoom?.minSpan ?? defaultMinSpan(extent, model.n) };
  const step = model.n > 1 ? full / (model.n - 1) : full / 10;

  const commit = (next: Span) => {
    const c = clampDomain(next, limits);
    setXDomain(isZoomed(c, extent) ? c : null);
  };
  const pxFromEvent = (event: React.PointerEvent) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 0;
    return ((event.clientX - rect.left) / rect.width) * W - m.left;
  };
  const onPointerDown = (part: "window" | "start" | "end") => (event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = { part, startPx: pxFromEvent(event), startDomain: win };
    setInteracting(true);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = ((pxFromEvent(event) - d.startPx) / Math.max(1, model.plotW)) * full;
    const [s0, s1] = d.startDomain;
    if (d.part === "window") commit(panBy(d.startDomain, delta, limits));
    else if (d.part === "start") commit([Math.min(s0 + delta, s1 - limits.minSpan), s1]);
    else commit([s0, Math.max(s1 + delta, s0 + limits.minSpan)]);
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setInteracting(false);
  };
  /** Click outside the window: center the window there. */
  const onTrackPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const px = pxFromEvent(event);
    const center = extent[0] + (Math.max(0, Math.min(model.plotW, px)) / model.plotW) * full;
    const w = win[1] - win[0];
    commit([center - w / 2, center + w / 2]);
    // Keep dragging from here.
    onPointerDown("window")(event);
  };
  const onHandleKey = (part: "start" | "end") => (event: React.KeyboardEvent) => {
    const big = event.shiftKey ? full * 0.1 : step;
    const [s0, s1] = win;
    let next: Span | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = part === "start" ? [s0 - big, s1] : [s0, Math.max(s0 + limits.minSpan, s1 - big)];
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = part === "start" ? [Math.min(s1 - limits.minSpan, s0 + big), s1] : [s0, s1 + big];
    else if (event.key === "Home") next = part === "start" ? [extent[0], s1] : [s0, s0 + limits.minSpan];
    else if (event.key === "End") next = part === "start" ? [s1 - limits.minSpan, s1] : [s0, extent[1]];
    if (!next) return;
    event.preventDefault();
    commit(next);
  };
  const handle = (part: "start" | "end", px: number) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={part === "start" ? startLabel : endLabel}
      aria-valuemin={extent[0]}
      aria-valuemax={extent[1]}
      aria-valuenow={Math.round(part === "start" ? win[0] : win[1])}
      aria-valuetext={model.formatXValue(part === "start" ? win[0] : win[1])}
      onPointerDown={onPointerDown(part)}
      onKeyDown={onHandleKey(part)}
      className={cn(blockReset, focusRing, "group absolute top-0 z-10 flex h-full w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-pui-sm")}
      style={{ left: pctOf(m.left + px, W) }}
    >
      <span
        className={cn(
          blockReset,
          "h-[60%] w-2 rounded-pui-full border border-pui-border bg-pui-surface shadow-pui-sm transition-transform duration-150 group-hover:scale-y-110 group-active:scale-110",
        )}
      />
    </div>
  );
  const gradientId = `${uid}-nav`;
  return (
    <div
      ref={rootRef}
      className={cn(blockReset, "relative w-full select-none", className)}
      style={{ height }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: series.color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: series.color, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        <g transform={`translate(${m.left},0)`}>
          <rect width={model.plotW} height={height} rx={8} fill="color-mix(in oklab, var(--pui-muted) 55%, transparent)" />
          <path d={mini.area} fill={`url(#${gradientId})`} />
          <path d={mini.line} fill="none" stroke={series.color} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          <motion.rect
            initial={false}
            animate={{ x: 0, width: Math.max(0, a) }}
            transition={instant}
            height={height}
            fill="color-mix(in oklab, var(--pui-background) 62%, transparent)"
          />
          <motion.rect initial={false} animate={{ x: b, width: Math.max(0, model.plotW - b) }} transition={instant} height={height} fill="color-mix(in oklab, var(--pui-background) 62%, transparent)" />
          <rect x={a} width={Math.max(0, b - a)} height={height} rx={6} fill="none" stroke="var(--pui-primary)" strokeOpacity={0.55} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div aria-hidden="true" className={cn(blockReset, "absolute inset-y-0 cursor-pointer")} style={{ left: pctOf(m.left, W), width: pctOf(model.plotW, W) }} onPointerDown={onTrackPointerDown} />
      <div
        aria-hidden="true"
        onPointerDown={onPointerDown("window")}
        className={cn(blockReset, "absolute inset-y-0 cursor-grab touch-none active:cursor-grabbing")}
        style={{ left: pctOf(m.left + a, W), width: pctOf(Math.max(0, b - a), W) }}
      />
      {handle("start", a)}
      {handle("end", b)}
    </div>
  );
}

/** A minimap of the whole series under the chart, with a draggable, resizable window. */
export function ChartNavigator(props: ChartNavigatorProps) {
  return useChartLayer() === "legend-bottom" ? <NavigatorLayer {...props} /> : null;
}

// ---------------------------------------------------------------------------------------------
// ChartBrush

export interface ChartBrushProps {
  /** The brushed x range (controlled), or null. */
  value?: Span | null;
  defaultValue?: Span | null;
  /** Fires while dragging. */
  onValueChange?: (range: Span | null) => void;
  /** Fires on release (filters, linked views). */
  onBrushEnd?: (range: Span | null) => void;
  /** Pill text for the range. Default: "<from> – <to> · N points". */
  formatLabel?: (range: Span, count: number) => string;
}

function BrushLayer({ value, defaultValue = null, onValueChange, onBrushEnd, formatLabel }: ChartBrushProps) {
  const ctx = useChart();
  const { model, extent, animation } = ctx;
  const [inner, setInner] = React.useState<Span | null>(defaultValue);
  const range = value !== undefined ? value : inner;
  const ctxRef = React.useRef(ctx);
  const handlers = React.useRef({ onValueChange, onBrushEnd, controlled: value !== undefined });
  useIsomorphicLayoutEffect(() => {
    ctxRef.current = ctx;
    handlers.current = { onValueChange, onBrushEnd, controlled: value !== undefined };
  });

  React.useEffect(() => {
    const el = ctx.overlayRef.current;
    if (!el || !extent) return;
    let start: number | null = null;
    let moved = false;
    let last: Span | null = null;
    const set = (next: Span | null) => {
      last = next;
      if (!handlers.current.controlled) setInner(next);
      handlers.current.onValueChange?.(next);
    };
    const currentWindow = (): Span => ctxRef.current.store.getState().xDomain ?? extent;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      start = plotPoint(ctxRef.current, el, event.clientX, event.clientY).x;
      moved = false;
      el.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (start === null) return;
      const x = plotPoint(ctxRef.current, el, event.clientX, event.clientY).x;
      if (!moved && Math.abs(x - start) < 4) return;
      moved = true;
      const w = currentWindow();
      const s = start;
      set(brushDomain(s, x, (px) => invertX(w, ctxRef.current.model.plotW, px)));
    };
    const up = (event: PointerEvent) => {
      if (start === null) return;
      start = null;
      if (moved) {
        event.stopPropagation();
        handlers.current.onBrushEnd?.(last);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !last) return;
      set(null);
      handlers.current.onBrushEnd?.(null);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("keydown", key);
    };
  }, [ctx.overlayRef, extent]);

  if (!extent || !range) return null;
  const w = ctx.xDomain ?? extent;
  const toPx = (v: number) => ((v - w[0]) / Math.max(1e-9, w[1] - w[0])) * model.plotW;
  const a = Math.max(0, Math.min(model.plotW, toPx(range[0])));
  const b = Math.max(0, Math.min(model.plotW, toPx(range[1])));
  let count = 0;
  for (const v of model.xNum) if (v >= range[0] && v <= range[1]) count++;
  const text = formatLabel ? formatLabel(range, count) : `${model.formatXValue(range[0])} \u2013 ${model.formatXValue(range[1])} \u00b7 ${count} point${count === 1 ? "" : "s"}`;
  const { margin: m, width: W, height: H } = model;
  const labelW = estimateTextWidth(text, 11) + 18;
  const center = m.left + (a + b) / 2;
  const left = Math.max(m.left, Math.min(m.left + model.plotW - labelW, center - labelW / 2));
  // Mean of the first visible series inside the range, a quick read-out.
  const s = model.series.find((x) => !x.hidden);
  let sum = 0;
  let k = 0;
  if (s) {
    for (let i = 0; i < model.n; i++) {
      const xv = model.xNum[i] as number;
      const v = s.values[i];
      if (xv >= range[0] && xv <= range[1] && v !== null && v !== undefined) {
        sum += v;
        k++;
      }
    }
  }
  return (
    <>
      <motion.div
        aria-hidden="true"
        initial={animation.reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className={cn(blockReset, "pointer-events-none absolute rounded-pui-sm border-x border-pui-primary bg-pui-primary/12")}
        style={{ left: pctOf(m.left + a, W), width: pctOf(Math.max(1, b - a), W), top: pctOf(m.top, H), height: pctOf(model.plotH, H) }}
      />
      <div
        aria-hidden="true"
        className={cn(blockReset, "pointer-events-none absolute z-10 whitespace-nowrap rounded-pui-full bg-pui-chart-tooltip-fg px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-pui-chart-tooltip-bg shadow-pui-md")}
        style={{ left: pctOf(left, W), top: pctOf(Math.max(0, m.top - 2), H) }}
      >
        {text}
        {s && k ? ` \u00b7 avg ${model.formatValue(s, sum / k)}` : ""}
      </div>
    </>
  );
}

/** Drag across the plot to select an x range (no zoom): filters, linked views, "N selected". */
export function ChartBrush(props: ChartBrushProps) {
  return useChartLayer() === "html" ? <BrushLayer {...props} /> : null;
}
