"use client";
// WhatIfChart: drag forecast points and watch the confidence band, totals and deltas recompute
// live. The original forecast stays as a dashed ghost line; Shift-drag scales every later point
// proportionally. Each handle is a role="slider" (arrow keys, Shift for x10, Home / End).
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { buttonBase, buttonPress, buttonSizes } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { areaPath, areaToBaseline, linePath, type AreaPoint, type Point } from "./core/path";
import { scaleLinear } from "./core/scale";
import { nice, tickStep, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface WhatIfTotals {
  /** Sum of the edited forecast. */
  total: number;
  /** Sum of the original forecast. */
  original: number;
  /** total - original. */
  delta: number;
  /** delta / original (0 when original is 0). */
  deltaPct: number;
  /** Last forecast point vs the last actual, as a fraction. */
  growth: number;
}

export interface WhatIfChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color" | "defaultValue"> {
  data: readonly T[];
  /** Point label (a month, a quarter). */
  x: Accessor<T, string | number>;
  /** Actual values, and the original forecast for the editable points. */
  y: Accessor<T, number>;
  /** Index of the first forecast (editable) point. Default: the second half of the data. */
  editableFrom?: number;
  /** Drag bounds and snapping. Defaults: 0, twice the data maximum, about 1/100 of the axis. */
  min?: number;
  max?: number;
  step?: number;
  /** Controlled forecast values (one per editable point). */
  value?: readonly number[];
  defaultValue?: readonly number[];
  onValueChange?: (value: number[]) => void;
  /** Confidence band half-width as a fraction of the value, widening with sqrt(steps ahead). Default 0.06. */
  bandPct?: number;
  /** Custom band: [low, high] for a forecast value `k` steps ahead (0-based). Overrides bandPct. */
  band?: (value: number, k: number) => readonly [number, number];
  /** A dashed goal line. */
  target?: number;
  targetLabel?: string;
  /** Show the totals strip. Default true. */
  totals?: boolean;
  totalLabel?: string;
  /** Called with the derived totals on every change. */
  onTotalsChange?: (totals: WhatIfTotals) => void;
  format?: NumberFormat;
  locale?: string;
  height?: number;
  initialWidth?: number;
  color?: string;
  forecastColor?: string;
  actualLabel?: string;
  forecastLabel?: string;
  resetLabel?: string;
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  description?: React.ReactNode;
  ariaLabel?: string;
  animation?: ChartAnimation;
}

function Rolling({ value, format, reducedMotion }: { value: number; format: (v: number) => string; reducedMotion: boolean }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  React.useEffect(() => {
    if (reducedMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.45, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value, reducedMotion]);
  return <motion.span>{text}</motion.span>;
}

const sameArray = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

function WhatIfChartInner<T>(props: WhatIfChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    y,
    editableFrom: editableFromProp,
    min,
    max,
    step: stepProp,
    value: valueProp,
    defaultValue,
    onValueChange,
    bandPct = 0.06,
    band,
    target,
    targetLabel = "Target",
    totals: showTotals = true,
    totalLabel = "Forecast total",
    onTotalsChange,
    format,
    locale = "en-US",
    height = 320,
    initialWidth = 640,
    color = categoricalColor(0),
    forecastColor = categoricalColor(1),
    actualLabel = "Actual",
    forecastLabel = "Forecast",
    resetLabel = "Reset",
    title,
    titleAs: TitleTag = "h3",
    description,
    ariaLabel,
    animation = "auto",
    className,
    ...rest
  } = props;
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const size = useChartSize(boxRef, { initialWidth, height });
  const anim = useChartAnimation(animation);
  const W = size.width;
  const H = height;
  const n = data.length;
  const from = Math.max(1, Math.min(n - 1, Math.floor(editableFromProp ?? Math.ceil(n / 2))));
  const editCount = Math.max(0, n - from);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const tickFmt = React.useCallback((v: number) => formatNumber(v, typeof format === "function" ? format : { notation: "compact", maximumFractionDigits: 1, ...format }, locale), [format, locale]);
  const pct = React.useCallback((v: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(v), [locale]);
  const labels = React.useMemo(() => data.map((d, i) => String(readAccessor(x, d, i))), [data, x]);
  const values = React.useMemo(() => data.map((d, i) => Number(readAccessor(y, d, i)) || 0), [data, y]);
  const original = React.useMemo(() => values.slice(from), [values, from]);

  // Uncontrolled edits belong to one dataset: new data starts again from its own forecast.
  const [inner, setInner] = React.useState<{ base: readonly number[]; values: readonly number[] }>(() => ({ base: original, values: defaultValue ?? original }));
  const forecast = valueProp ?? (inner.base === original ? inner.values : original);
  const onValueRef = useLatestRef(onValueChange);
  const setForecast = (next: number[]) => {
    if (valueProp === undefined) setInner({ base: original, values: next });
    onValueRef.current?.(next);
  };
  const fc = React.useMemo(() => Array.from({ length: editCount }, (_, k) => forecast[k] ?? original[k] ?? 0), [forecast, original, editCount]);

  // A stable axis: the drag range, not the current values, so the axis never moves under the pointer.
  const lo = min ?? 0;
  const hiRaw = max ?? Math.max(...values, target ?? 0, 1) * 1.8;
  const [, hi] = nice(lo, hiRaw, 5);
  const step = stepProp ?? tickStep(lo, hi, 100);
  const snap = (v: number) => Math.max(lo, Math.min(max ?? hi, Math.round(v / step) * step));
  const yTicks = niceTicks(lo, hi, 5);
  const left = Math.ceil(Math.max(...yTicks.map((v) => estimateTextWidth(tickFmt(v), 11)), 10)) + 14;
  const plot = { left, top: 22, right: W - 18, bottom: H - 28 };
  const yScale = scaleLinear([lo, hi], [plot.bottom, plot.top], { clamp: true });
  const xAt = (i: number) => plot.left + (i / Math.max(1, n - 1)) * (plot.right - plot.left);
  const lastActual = values[from - 1] ?? 0;

  const bandAt = (v: number, k: number): readonly [number, number] => (band ? band(v, k) : [v * (1 - bandPct * Math.sqrt(k + 1)), v * (1 + bandPct * Math.sqrt(k + 1))]);

  const totals: WhatIfTotals = React.useMemo(() => {
    const total = fc.reduce((a, b) => a + b, 0);
    const orig = original.reduce((a, b) => a + b, 0);
    const delta = total - orig;
    const last = fc[fc.length - 1] ?? lastActual;
    return { total, original: orig, delta, deltaPct: orig ? delta / orig : 0, growth: lastActual ? (last - lastActual) / Math.abs(lastActual) : 0 };
  }, [fc, original, lastActual]);
  const totalsKey = `${totals.total}:${totals.original}`;
  const onTotalsRef = useLatestRef(onTotalsChange);
  const lastTotals = React.useRef("");
  React.useEffect(() => {
    if (lastTotals.current === totalsKey) return;
    lastTotals.current = totalsKey;
    onTotalsRef.current?.(totals);
  }, [totalsKey, totals, onTotalsRef]);

  const [drag, setDrag] = React.useState<{ k: number; startY: number; start: number[]; proportional: boolean } | null>(null);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focusK, setFocusK] = React.useState(0);
  const [activeHandle, setActiveHandle] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const changed = !sameArray(fc, original);

  const describeTotals = (t: WhatIfTotals) => `${totalLabel} ${fmt(t.total)}, ${pct(t.deltaPct)} vs plan.`;
  const commit = (next: number[]) => setForecast(next);

  const setPoint = (k: number, v: number, proportional: boolean, base: readonly number[]) => {
    const next = [...base];
    const nv = snap(v);
    if (proportional) {
      const ratio = (base[k] ?? 0) !== 0 ? nv / (base[k] as number) : 1;
      for (let j = k + 1; j < editCount; j++) next[j] = snap((base[j] ?? 0) * ratio);
    }
    next[k] = nv;
    commit(next);
    return next;
  };

  const pyFromEvent = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || !rect.height) return null;
    return ((event.clientY - rect.top) / rect.height) * H;
  };
  const onHandleDown = (k: number) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    (event.currentTarget as HTMLElement).focus();
    setFocusK(k);
    setDrag({ k, startY: event.clientY, start: [...fc], proportional: event.shiftKey });
  };
  const onHandleMove = (k: number) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.k !== k) return;
    const py = pyFromEvent(event);
    if (py === null) return;
    setPoint(k, yScale.invert(py), event.shiftKey || drag.proportional, drag.start);
  };
  const onHandleUp = (k: number) => () => {
    if (!drag || drag.k !== k) return;
    setDrag(null);
    setAnnouncement(`${labels[from + k]} ${forecastLabel.toLowerCase()}: ${fmt(fc[k] ?? 0)}. ${describeTotals(totals)}`);
  };
  const onHandleKey = (k: number) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    const cur = fc[k] ?? 0;
    const big = event.shiftKey ? 10 : 1;
    let v: number | null = null;
    if (event.key === "ArrowUp") v = cur + step * big;
    else if (event.key === "ArrowDown") v = cur - step * big;
    else if (event.key === "PageUp") v = cur + step * 10;
    else if (event.key === "PageDown") v = cur - step * 10;
    else if (event.key === "Home") v = lo;
    else if (event.key === "End") v = max ?? hi;
    else if (event.key === "Escape" && drag) {
      event.preventDefault();
      event.stopPropagation();
      commit(drag.start);
      setDrag(null);
      return;
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = Math.max(0, Math.min(editCount - 1, k + (event.key === "ArrowRight" ? 1 : -1)));
      setFocusK(next);
      boxRef.current?.querySelector<HTMLElement>(`[data-whatif-index="${next}"]`)?.focus();
      return;
    }
    if (v === null) return;
    event.preventDefault();
    const next = setPoint(k, v, event.altKey, fc);
    const t = next.reduce((a, b) => a + b, 0);
    const orig = totals.original;
    setAnnouncement(`${fmt(next[k] ?? 0)}. ${totalLabel} ${fmt(t)}, ${pct(orig ? (t - orig) / orig : 0)} vs plan.`);
  };
  const reset = () => {
    commit([...original]);
    setAnnouncement(`Reset to the original forecast. ${totalLabel} ${fmt(totals.original)}.`);
  };

  // Geometry.
  const actualPts: Point[] = values.slice(0, from).map((v, i) => [xAt(i), yScale(v)]);
  const anchor: Point = [xAt(from - 1), yScale(lastActual)];
  const fcPts: Point[] = [anchor, ...fc.map((v, k): Point => [xAt(from + k), yScale(v)])];
  const ghostPts: Point[] = [anchor, ...original.map((v, k): Point => [xAt(from + k), yScale(v)])];
  const bandPts: AreaPoint[] = [[anchor[0], anchor[1], anchor[1]], ...fc.map((v, k): AreaPoint => {
    const [b0, b1] = bandAt(v, k);
    return [xAt(from + k), yScale(b1), yScale(b0)];
  })];
  const actualD = linePath(actualPts, { curve: "monotone" });
  const actualArea = areaToBaseline(actualPts, plot.bottom, { curve: "monotone" });
  const fcD = linePath(fcPts, { curve: "monotone" });
  const ghostD = linePath(ghostPts, { curve: "monotone" });
  const bandD = areaPath(bandPts, { curve: "monotone" });
  const dragging = drag !== null;
  const pathT: Transition = anim.updates && !dragging ? chartMotion.update : instant;
  const labelEvery = Math.max(1, Math.ceil((Math.max(...labels.map((l) => estimateTextWidth(l, 11)), 1) + 10) / Math.max(1, (plot.right - plot.left) / Math.max(1, n - 1))));

  const onPlotMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - plot.left) / Math.max(1, plot.right - plot.left)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const tipIndex = drag ? from + drag.k : hover;
  const tipK = tipIndex !== null ? tipIndex - from : -1;
  const nameText = ariaLabel ?? (typeof title === "string" ? title : "What-if forecast");
  const summary = `${nameText}. ${actualLabel} values from ${labels[0]} to ${labels[from - 1]}; an editable ${forecastLabel.toLowerCase()} from ${labels[from]} to ${labels[n - 1]}. ${describeTotals(totals)}`;

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? `${uid}-title` : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={`${uid}-desc`}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description || changed ? (
        <div className={cn(blockReset, "flex flex-wrap items-start justify-between gap-3")}>
          <figcaption className={cn(blockReset, "flex min-w-0 flex-col gap-0.5")}>
            {title ? (
              <TitleTag id={`${uid}-title`} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
                {title}
              </TitleTag>
            ) : null}
            {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
          </figcaption>
          <AnimatePresence initial={false}>
            {changed ? (
              <motion.button
                key="reset"
                type="button"
                onClick={reset}
                initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                transition={anim.reducedMotion ? instant : chartMotion.hover}
                className={cn(controlReset, focusRing, buttonBase, buttonPress, buttonSizes.sm, "border border-pui-border bg-pui-background hover:bg-pui-muted")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {resetLabel}
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
      {showTotals ? (
        <div aria-hidden="true" className={cn(blockReset, "grid grid-cols-3 gap-2")}>
          {[
            { label: totalLabel, value: <Rolling value={totals.total} format={fmt} reducedMotion={anim.reducedMotion} />, tone: "" },
            {
              label: "vs plan",
              value: (
                <>
                  <Rolling value={totals.delta} format={(v) => `${v >= 0 ? "+" : "\u2212"}${fmt(Math.abs(v))}`} reducedMotion={anim.reducedMotion} />
                  <span className={cn(blockReset, "ms-1.5 text-xs")}>{pct(totals.deltaPct)}</span>
                </>
              ),
              tone: Math.abs(totals.delta) < step / 2 ? "" : totals.delta > 0 ? "text-pui-success-text" : "text-pui-danger-text",
            },
            { label: `${labels[n - 1]} vs ${labels[from - 1]}`, value: <Rolling value={totals.growth} format={pct} reducedMotion={anim.reducedMotion} />, tone: "" },
          ].map((s) => (
            <div key={s.label} className={cn(blockReset, "min-w-0 rounded-pui-lg border border-pui-border px-3 py-2")}>
              <div className={cn(blockReset, "truncate text-[11px] text-pui-muted-foreground")}>{s.label}</div>
              <div className={cn(blockReset, "truncate text-base font-semibold tabular-nums tracking-tight", s.tone)}>{s.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div
        ref={boxRef}
        onPointerMove={onPlotMove}
        onPointerLeave={() => setHover(null)}
        className={cn(blockReset, "relative w-full select-none")}
        style={{ height: H, touchAction: "pan-y" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <linearGradient id={`${uid}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.26 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <rect x={anchor[0]} y={plot.top - 14} width={Math.max(0, plot.right - anchor[0] + 8)} height={plot.bottom - plot.top + 14} fill="var(--pui-muted)" opacity={0.35} rx={6} />
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={plot.left} x2={plot.right} y1={yScale(t)} y2={yScale(t)} stroke="var(--pui-chart-grid)" strokeDasharray={t === lo ? undefined : "3 3"} />
              <text x={plot.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {tickFmt(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={xAt(i)} y={plot.bottom + 18} textAnchor="middle" fontSize={11} fill={tipIndex === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"} fontWeight={tipIndex === i ? 600 : 400}>
                {l}
              </text>
            ) : null,
          )}
          <text x={anchor[0] + 8} y={plot.top - 4} fontSize={11} fontWeight={600} fill="var(--pui-muted-foreground)">
            {forecastLabel}
          </text>
          <line x1={anchor[0]} x2={anchor[0]} y1={plot.top - 14} y2={plot.bottom} stroke="var(--pui-border)" strokeDasharray="4 4" />
          {target !== undefined ? (
            <g>
              <line x1={plot.left} x2={plot.right} y1={yScale(target)} y2={yScale(target)} stroke="var(--pui-warning)" strokeWidth={1.25} strokeDasharray="6 4" />
              <text x={plot.right} y={yScale(target) - 6} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--pui-warning-text)">
                {targetLabel} {tickFmt(target)}
              </text>
            </g>
          ) : null}
          <motion.path initial={false} animate={{ d: actualArea }} transition={anim.updates ? chartMotion.update : instant} fill={`url(#${uid}-area)`} />
          <motion.path initial={false} animate={{ d: bandD }} transition={pathT} fill={withOpacity(forecastColor, 0.16)} />
          <motion.path initial={false} animate={{ d: ghostD }} transition={anim.updates ? chartMotion.update : instant} fill="none" stroke="var(--pui-muted-foreground)" strokeOpacity={changed ? 0.75 : 0} strokeWidth={1.5} strokeDasharray="5 4" style={{ transition: "stroke-opacity 200ms" }} />
          <motion.path initial={false} animate={{ d: actualD }} transition={anim.updates ? chartMotion.update : instant} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <motion.path initial={false} animate={{ d: fcD }} transition={pathT} fill="none" stroke={forecastColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {actualPts.map(([px, py], i) => (
            <motion.circle key={i} initial={false} animate={{ cx: px, cy: py, r: tipIndex === i ? 4.5 : 2.75 }} transition={anim.updates ? chartMotion.update : instant} fill={color} stroke="var(--pui-background)" strokeWidth={1.5} />
          ))}
          {tipIndex !== null ? <line x1={xAt(tipIndex)} x2={xAt(tipIndex)} y1={plot.top} y2={plot.bottom} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" pointerEvents="none" /> : null}
        </svg>
        {/* Drag handles: real sliders positioned over the forecast points. */}
        {fc.map((v, k) => {
          const isDrag = drag?.k === k;
          const lit = isDrag || activeHandle === k;
          const handleT: Transition = dragging || !anim.updates ? instant : chartMotion.update;
          return (
            <motion.div
              key={k}
              role="slider"
              tabIndex={k === focusK ? 0 : -1}
              data-whatif-index={k}
              aria-label={`${labels[from + k]} ${forecastLabel.toLowerCase()}`}
              aria-valuemin={lo}
              aria-valuemax={max ?? hi}
              aria-valuenow={Math.round(v * 1000) / 1000}
              aria-valuetext={`${labels[from + k]} ${forecastLabel.toLowerCase()}: ${fmt(v)}`}
              aria-describedby={`${uid}-help`}
              onPointerDown={onHandleDown(k)}
              onPointerMove={onHandleMove(k)}
              onPointerUp={onHandleUp(k)}
              onPointerCancel={onHandleUp(k)}
              onPointerEnter={() => setActiveHandle(k)}
              onPointerLeave={() => setActiveHandle((a) => (a === k ? null : a))}
              onFocus={() => {
                setFocusK(k);
                setActiveHandle(k);
              }}
              onBlur={() => setActiveHandle((a) => (a === k ? null : a))}
              onKeyDown={onHandleKey(k)}
              initial={false}
              animate={{ left: `${(xAt(from + k) / W) * 100}%`, top: `${(yScale(v) / H) * 100}%` }}
              transition={{ left: handleT, top: handleT }}
              className={cn(blockReset, focusRing, "absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize touch-none items-center justify-center rounded-pui-full")}
            >
              <motion.span
                aria-hidden="true"
                className={cn(blockReset, "block size-3.5 rounded-pui-full border-2 bg-pui-background shadow-pui-sm")}
                style={{ borderColor: forecastColor }}
                initial={false}
                animate={{ scale: isDrag && !anim.reducedMotion ? 1.3 : lit ? 1.15 : 1, backgroundColor: isDrag ? forecastColor : "var(--pui-background)" }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 700, damping: 30, mass: 0.5 }}
              />
              <AnimatePresence>
                {lit ? (
                  <motion.span
                    key="pill"
                    aria-hidden="true"
                    initial={anim.reducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={anim.reducedMotion ? instant : chartMotion.hover}
                    className={cn(blockReset, "pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-pui-sm bg-pui-chart-tooltip-fg px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-pui-chart-tooltip-bg shadow-pui-md")}
                  >
                    {fmt(v)}
                    {(original[k] ?? 0) !== 0 && Math.abs(v - (original[k] ?? 0)) >= step / 2 ? <span className={cn(blockReset, "ms-1 opacity-75")}>{pct((v - (original[k] as number)) / (original[k] as number))}</span> : null}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
        <AnimatePresence>
          {hover !== null && !dragging && hover < from ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, left: `${(xAt(hover) / W) * 100}%` }}
              animate={{ opacity: 1, left: `${(xAt(hover) / W) * 100}%` }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={anim.reducedMotion ? instant : chartMotion.hover}
              className={cn(blockReset, "pointer-events-none absolute top-1 z-20 w-max")}
            >
              <div
                className={cn(blockReset, "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-xs text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: `translateX(${xAt(hover) > W * 0.6 ? "calc(-100% - 10px)" : "10px"})` }}
              >
                <div className={cn(blockReset, "font-semibold")}>{labels[hover]}</div>
                <div className={cn(blockReset, "mt-1 flex items-center gap-2 tabular-nums")}>
                  <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: color }} />
                  {actualLabel}
                  <span className={cn(blockReset, "ms-auto ps-3 font-semibold")}>{fmt(values[hover] ?? 0)}</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {tipK >= 0 && (dragging || hover !== null) ? (
          <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute bottom-8 right-5 rounded-pui-md bg-pui-background/85 px-2 py-1 text-[11px] tabular-nums text-pui-muted-foreground shadow-pui-sm backdrop-blur")}>
            {(() => {
              const v = fc[tipK] ?? 0;
              const [b0, b1] = bandAt(v, tipK);
              return `${labels[from + tipK]}: ${fmt(v)} \u00b7 range ${tickFmt(b0)}\u2013${tickFmt(b1)} \u00b7 plan ${fmt(original[tipK] ?? 0)}`;
            })()}
          </div>
        ) : null}
      </div>
      <div aria-hidden="true" className={cn(blockReset, "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pui-muted-foreground")}>
        <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
          <span className={cn(blockReset, "h-0.5 w-4 rounded-pui-full")} style={{ background: color }} />
          {actualLabel}
        </span>
        <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
          <span className={cn(blockReset, "h-0.5 w-4 rounded-pui-full")} style={{ background: forecastColor }} />
          {forecastLabel} (drag the points; Shift scales the rest)
        </span>
        <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
          <span className={cn(blockReset, "h-2.5 w-4 rounded-[3px]")} style={{ background: withOpacity(forecastColor, 0.2) }} />
          Confidence band
        </span>
        <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
          <span className={cn(blockReset, "w-4 border-t-2 border-dashed border-pui-muted-foreground")} />
          Original plan
        </span>
      </div>
      <span id={`${uid}-help`} className={srOnly}>
        Up and down arrows change the value (Shift for 10 steps, Alt also scales the later points), left and right move between points, Home and End jump to the limits.
      </span>
      <p id={`${uid}-desc`} className={srOnly}>
        {summary}
      </p>
      <ChartLiveRegion text={announcement} />
      <table className={srOnly}>
        <caption>{nameText}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            <th scope="col">Value</th>
            <th scope="col">Plan</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l}</th>
              <td>{fmt(i < from ? (values[i] ?? 0) : (fc[i - from] ?? 0))}</td>
              <td>{i < from ? actualLabel : fmt(original[i - from] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Draggable forecast: move points (or Shift-drag to scale everything after), and the confidence
 * band, totals and the delta against plan recompute live, with the original as a ghost line.
 */
export const WhatIfChart = React.forwardRef(WhatIfChartInner) as (<T>(props: WhatIfChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
WhatIfChart.displayName = "WhatIfChart";
