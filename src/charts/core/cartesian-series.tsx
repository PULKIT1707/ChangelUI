"use client";
// Line, area and bar series for <Chart>. Geometry comes precomputed from the model; each series
// tweens its Float64Array on data changes (useDataTween) and derives its path with useTransform,
// so a data update re-renders React once and Motion animates the rest.
import { motion, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { useChart, useChartLayer, useChartSeries, useChartState, withChartRole } from "./cartesian";
import type { Accessor } from "./cartesian-model";
import type { NumberFormat } from "./format";
import { estimateTextWidth } from "./format";
import { areaPath, areaToBaseline, linePath, roundedBarPath, type AreaPoint, type BarEnd, type Curve, type Point } from "./path";
import { useIsomorphicLayoutEffect } from "../../lib/use-latest-ref";
import { barDelay, chartMotion, useDataTween } from "./use-chart-motion";
import { decimate as decimateIndices, type DecimateMode } from "./decimate";
import type { ChartPattern } from "./color";
import { patternDash, patternFill } from "./patterns";

const instant: Transition = { duration: 0 };
const EMPTY = new Float64Array(0);

interface BaseSeriesProps<T = never> {
  /** Stable id: legend, selection, tween identity. */
  id: string;
  /** Value per row: a column name or a function. null / undefined leave a gap. */
  y: Accessor<T, number | null | undefined>;
  /** Legend, tooltip and data-table name. Default: the id. */
  label?: string;
  /** Any CSS color, token or var(). Default: the next palette color (--pui-chart-N). */
  color?: string;
  /** Value axis id (see YAxis). Default "y". */
  yAxisId?: string;
  format?: NumberFormat;
  /** Start hidden (uncontrolled legend state). */
  hidden?: boolean;
  /** Redundant encoding: a fill pattern (bars, areas) or dash rhythm (lines). Overrides the chart's `patterns`. */
  pattern?: ChartPattern;
}

/**
 * Indices to draw for a big series: LTTB down to about two points per plot pixel (hover and the
 * tooltip still read the raw data). Recomputed only when the target geometry changes, then applied
 * to every tween frame, so a morph stays cheap.
 */
function useDecimation(geometry: Float64Array, stride: number, mode: DecimateMode, plotW: number): Int32Array | null {
  return React.useMemo(() => {
    const n = Math.floor(geometry.length / stride);
    if (mode === false || n <= Math.max(3, Math.round(2 * plotW))) return null;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    let gaps = false;
    for (let i = 0; i < n; i++) {
      xs[i] = geometry[i * stride] as number;
      const y = geometry[i * stride + 1] as number;
      ys[i] = y;
      if (!Number.isFinite(y)) gaps = true;
    }
    // Gaps survive min/max bucketing (it keeps each bucket's first and last point); LTTB would skip them.
    return Int32Array.from(decimateIndices(xs, ys, plotW, gaps && mode === "auto" ? "minmax" : mode));
  }, [geometry, stride, mode, plotW]);
}

function pick(g: Float64Array, stride: number, keep: Int32Array | null): Float64Array {
  if (!keep) return g;
  const out = new Float64Array(keep.length * stride);
  for (let k = 0; k < keep.length; k++) {
    const i = keep[k] as number;
    for (let j = 0; j < stride; j++) out[k * stride + j] = g[i * stride + j] as number;
  }
  return out;
}

/** Tweens a series' geometry and publishes the live value for overlays (the active dot). */
function useSeriesTween(id: string, geometry: Float64Array): MotionValue<Float64Array> {
  const { animation, tweens } = useChart();
  const resetKey = useResetKey();
  const tween = useDataTween(geometry, { enabled: animation.updates, resetKey });
  useIsomorphicLayoutEffect(() => {
    tweens.set(id, tween);
    return () => {
      if (tweens.get(id) === tween) tweens.delete(id);
    };
  }, [tweens, id, tween]);
  return tween;
}

function useResetKey(): string {
  const { model } = useChart();
  return `${model.plotW}x${model.plotH}`;
}

/** Opacity for a series: hidden, faded by another highlighted series, or full. */
function useSeriesOpacity(id: string, hidden: boolean, faded = 0.22): number {
  const highlighted = useChartState((s) => s.highlight?.seriesId ?? null);
  if (hidden) return 0;
  return highlighted && highlighted !== id ? faded : 1;
}

function toPoints(g: Float64Array): Array<Point | null> {
  const out: Array<Point | null> = [];
  for (let i = 0; i + 1 < g.length; i += 2) {
    const x = g[i] as number;
    const y = g[i + 1] as number;
    out.push(Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Line

export interface LineSeriesProps<T = never> extends BaseSeriesProps<T> {
  /** Default "monotone" (never overshoots the data). */
  curve?: Curve;
  dashed?: boolean;
  /** Default 2. */
  strokeWidth?: number;
  /** Point markers: always, never, or "auto" (when there are 24 points or fewer). Default "auto". */
  markers?: boolean | "auto";
  /** Gradient fill under the line. */
  area?: boolean;
  /** Soft glow under the stroke. */
  glow?: boolean;
  /** Bridge gaps instead of breaking the line. */
  connectNulls?: boolean;
  /** Downsample above two points per pixel: "auto" (LTTB), "lttb", "minmax" or false. Default "auto". */
  decimate?: DecimateMode;
}

function LineDot({ tween, index, color, size }: { tween: MotionValue<Float64Array>; index: number; color: string; size: number }) {
  const cx = useTransform(tween, (g) => g[index * 2] ?? 0);
  const cy = useTransform(tween, (g) => {
    const v = g[index * 2 + 1];
    return v !== undefined && Number.isFinite(v) ? v : -999;
  });
  return <motion.circle cx={cx} cy={cy} r={size} fill="var(--pui-background)" stroke={color} strokeWidth={1.75} />;
}

function LineMarks({ id, curve = "monotone", dashed, strokeWidth = 2, markers = "auto", area, glow, connectNulls, decimate = "auto" }: LineSeriesProps) {
  const { model, animation, uid } = useChart();
  const s = useChartSeries(id);
  const tween = useSeriesTween(id, s?.geometry ?? EMPTY);
  const keep = useDecimation(s?.geometry ?? EMPTY, 2, decimate, model.plotW);
  const d = useTransform(tween, (g) => linePath(toPoints(pick(g, 2, keep)), { curve, connectNulls }));
  const scale = s ? model.yScales[s.yAxisId] : undefined;
  const [d0, d1] = scale ? scale.domain : [0, 1];
  const baseline = scale ? scale(Math.max(Math.min(d0, d1), Math.min(Math.max(d0, d1), 0))) : model.plotH;
  const fillD = useTransform(tween, (g) => (area ? areaToBaseline(toPoints(pick(g, 2, keep)), baseline, { curve, connectNulls }) : ""));
  const opacity = useSeriesOpacity(id, s?.hidden ?? false);
  if (!s) return null;
  const showMarkers = markers === true || (markers === "auto" && model.n <= 24);
  const gradientId = `${uid}-line-${s.index}`;
  const fade = animation.reducedMotion ? instant : chartMotion.fade;
  const dash = dashed ? "6 5" : patternDash(s.pattern);
  const draw = animation.entrance && !dash;
  return (
    <motion.g initial={false} animate={{ opacity }} transition={fade} style={{ pointerEvents: "none" }}>
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.32 }} />
              <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <motion.path
            d={fillD}
            fill={`url(#${gradientId})`}
            initial={animation.entrance ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={chartMotion.areaFill}
          />
        </>
      ) : null}
      {glow ? <motion.path d={d} fill="none" stroke={s.color} strokeWidth={strokeWidth * 4} strokeOpacity={0.14} strokeLinecap="round" strokeLinejoin="round" /> : null}
      <motion.path
        d={d}
        fill="none"
        stroke={s.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
        initial={draw ? { pathLength: 0 } : animation.entrance ? { opacity: 0 } : false}
        animate={draw ? { pathLength: 1 } : animation.entrance ? { opacity: 1 } : undefined}
        transition={chartMotion.drawLine}
      />
      {showMarkers ? (
        <motion.g initial={animation.entrance ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: animation.entrance ? 0.6 : 0 }}>
          {Array.from({ length: model.n }, (_, i) => (s.values[i] === null ? null : <LineDot key={i} tween={tween} index={i} color={s.color} size={3} />))}
        </motion.g>
      ) : null}
    </motion.g>
  );
}

/** The highlighted point: a halo and a dot on the drawn line (read from the series' live tween). */
function ActiveDot({ id }: { id: string }) {
  const { model, tooltip, tweens } = useChart();
  const s = useChartSeries(id);
  const active = useChartState((st) => st.activeIndex);
  const highlighted = useChartState((st) => st.highlight?.seriesId ?? null);
  const tween = tweens.get(id);
  if (!s || s.hidden || !tween || tooltip === "none" || active === null || active >= model.n) return null;
  if (s.values[active] === null || s.values[active] === undefined) return null;
  return <ActiveDotMark tween={tween} index={active} stride={s.kind === "line" ? 2 : 3} color={s.color} emphasized={highlighted === id} dimmed={!!highlighted && highlighted !== id} />;
}

function ActiveDotMark({
  tween,
  index,
  stride,
  color,
  emphasized,
  dimmed,
}: {
  tween: MotionValue<Float64Array>;
  index: number;
  stride: number;
  color: string;
  emphasized: boolean;
  dimmed: boolean;
}) {
  const { animation } = useChart();
  // Snap to the point (no straight-line glide that would cut across the curve), and follow the
  // same tweened geometry as the path, so the dot never leaves the line during a morph.
  const x = useTransform(tween, (g) => g[index * stride] ?? 0);
  const y = useTransform(tween, (g) => {
    const v = g[index * stride + 1];
    return v !== undefined && Number.isFinite(v) ? v : -999;
  });
  const transition = animation.reducedMotion ? instant : chartMotion.hover;
  return (
    <motion.g aria-hidden="true" pointerEvents="none" style={{ x, y }} initial={false} animate={{ opacity: dimmed ? 0.35 : 1 }} transition={transition}>
      <motion.circle
        r={9}
        fill={color}
        initial={animation.reducedMotion ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.16, scale: emphasized ? 1.35 : 1 }}
        transition={transition}
      />
      <circle r={4.5} fill={color} stroke="var(--pui-background)" strokeWidth={2} />
    </motion.g>
  );
}

function LineSeriesImpl<T>(props: LineSeriesProps<T>) {
  const layer = useChartLayer();
  if (layer === "marks") return <LineMarks {...(props as LineSeriesProps)} />;
  if (layer === "front") return <ActiveDot id={props.id} />;
  return null;
}

/** A line through every point (gaps for null values). */
export const LineSeries = withChartRole(LineSeriesImpl, { kind: "series", series: "line" });

// ---------------------------------------------------------------------------------------------
// Area

export interface AreaSeriesProps<T = never> extends BaseSeriesProps<T> {
  /** Series with the same stack id stack on each other. */
  stack?: string;
  curve?: Curve;
  /** Default "gradient". */
  fill?: "gradient" | "solid" | "none";
  /** Outline width; 0 hides it. Default 2 (1 for range bands). */
  strokeWidth?: number;
  connectNulls?: boolean;
  /**
   * Lower edge: turns the area into a range band from y0 to y (a min/max envelope, a forecast
   * interval). Ignored when the series is stacked.
   */
  y0?: Accessor<T, number | null | undefined>;
  /** Downsample above two points per pixel. Default "auto". */
  decimate?: DecimateMode;
}

function AreaMarks({ id, curve = "monotone", fill = "gradient", strokeWidth, connectNulls, decimate = "auto" }: AreaSeriesProps) {
  const { model, animation, uid } = useChart();
  const s = useChartSeries(id);
  const tween = useSeriesTween(id, s?.geometry ?? EMPTY);
  const keep = useDecimation(s?.geometry ?? EMPTY, 3, decimate, model.plotW);
  const range = !!s?.lows;
  const stroke = strokeWidth ?? (range ? 1 : 2);
  const areaD = useTransform(tween, (raw) => {
    const g = pick(raw, 3, keep);
    const pts: Array<AreaPoint | null> = [];
    for (let i = 0; i + 2 < g.length; i += 3) {
      const x = g[i] as number;
      const top = g[i + 1] as number;
      const base = g[i + 2] as number;
      pts.push(Number.isFinite(top) && Number.isFinite(base) ? [x, top, base] : null);
    }
    return areaPath(pts, { curve, connectNulls });
  });
  const lineD = useTransform(tween, (raw) => {
    const g = pick(raw, 3, keep);
    const pts: Array<Point | null> = [];
    for (let i = 0; i + 2 < g.length; i += 3) {
      const top = g[i + 1] as number;
      pts.push(Number.isFinite(top) ? [g[i] as number, top] : null);
    }
    return linePath(pts, { curve, connectNulls });
  });
  // Range bands also outline their lower edge.
  const lowD = useTransform(tween, (raw) => {
    if (!range) return "";
    const g = pick(raw, 3, keep);
    const pts: Array<Point | null> = [];
    for (let i = 0; i + 2 < g.length; i += 3) {
      const base = g[i + 2] as number;
      pts.push(Number.isFinite(base) ? [g[i] as number, base] : null);
    }
    return linePath(pts, { curve, connectNulls });
  });
  const opacity = useSeriesOpacity(id, s?.hidden ?? false, 0.3);
  if (!s) return null;
  const gradientId = `${uid}-area-${s.index}`;
  const stacked = s.stack !== undefined || range;
  const fade = animation.reducedMotion ? instant : chartMotion.fade;
  return (
    <motion.g initial={false} animate={{ opacity }} transition={fade} style={{ pointerEvents: "none" }}>
      {fill === "gradient" ? (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: s.color, stopOpacity: stacked ? 0.55 : 0.38 }} />
            <stop offset="100%" style={{ stopColor: s.color, stopOpacity: stacked ? 0.22 : 0.02 }} />
          </linearGradient>
        </defs>
      ) : null}
      {fill !== "none" ? (
        <motion.path
          d={areaD}
          fill={fill === "gradient" ? `url(#${gradientId})` : `color-mix(in oklab, ${s.color} ${stacked ? 70 : 30}%, transparent)`}
          initial={animation.entrance ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={chartMotion.areaFill}
        />
      ) : null}
      {s.pattern && fill !== "none" ? (
        <motion.path
          d={areaD}
          fill={patternFill(`${uid}-pat`, s.pattern)}
          initial={animation.entrance ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={chartMotion.areaFill}
        />
      ) : null}
      {stroke > 0 ? (
        <>
          <motion.path
            d={lineD}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeOpacity={range ? 0.7 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animation.entrance ? { pathLength: 0 } : false}
            animate={animation.entrance ? { pathLength: 1 } : undefined}
            transition={chartMotion.drawLine}
          />
          {range ? (
            <motion.path
              d={lowD}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeOpacity={0.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animation.entrance ? { pathLength: 0 } : false}
              animate={animation.entrance ? { pathLength: 1 } : undefined}
              transition={chartMotion.drawLine}
            />
          ) : null}
        </>
      ) : null}
    </motion.g>
  );
}

function AreaSeriesImpl<T>(props: AreaSeriesProps<T>) {
  const layer = useChartLayer();
  if (layer === "marks") return <AreaMarks {...(props as AreaSeriesProps)} />;
  if (layer === "front") return <ActiveDot id={props.id} />;
  return null;
}

/** A filled area to the baseline, or stacked on the series below it (`stack`). */
export const AreaSeries = withChartRole(AreaSeriesImpl, { kind: "series", series: "area" });

// ---------------------------------------------------------------------------------------------
// Bar

export interface BarSeriesProps<T = never> extends BaseSeriesProps<T> {
  /** Series with the same stack id share one bar per category. */
  stack?: string;
  /** Corner radius of the value end. Default 4. */
  radius?: number;
  /** Print the value at the end of each bar (the stack total for stacks). */
  valueLabels?: boolean;
}

function Bar({
  tween,
  index,
  color,
  radius,
  end,
  opacity,
  selected,
  entrance,
  delay,
  horizontal,
  negative,
  reducedMotion,
  patternUrl,
}: {
  patternUrl: string | null;
  tween: MotionValue<Float64Array>;
  index: number;
  color: string;
  radius: number;
  end: BarEnd;
  opacity: number;
  selected: boolean;
  entrance: boolean;
  delay: number;
  horizontal: boolean;
  negative: boolean;
  reducedMotion: boolean;
}) {
  const d = useTransform(tween, (g) => {
    const x = g[index * 4] as number;
    const y = g[index * 4 + 1] as number;
    const w = g[index * 4 + 2] as number;
    const h = g[index * 4 + 3] as number;
    if (!Number.isFinite(x + y + w + h) || w <= 0 || h <= 0) return "";
    return roundedBarPath(x, y, w, h, Math.min(radius, w / 2, h), end);
  });
  const origin = horizontal ? { originX: negative ? 1 : 0, originY: 0.5 } : { originX: 0.5, originY: negative ? 0 : 1 };
  const grow = horizontal ? { scaleX: 0 } : { scaleY: 0 };
  const full = horizontal ? { scaleX: 1 } : { scaleY: 1 };
  return (
    <motion.g
      initial={entrance ? grow : false}
      animate={full}
      transition={{ ...chartMotion.growBar, delay }}
      style={{ ...origin, transformBox: "fill-box" }}
    >
      <motion.path
        d={d}
        fill={color}
        stroke={selected ? "var(--pui-ring)" : "transparent"}
        strokeWidth={2}
        initial={false}
        animate={{ opacity }}
        transition={reducedMotion ? instant : chartMotion.fade}
      />
      {patternUrl ? (
        <motion.path d={d} fill={patternUrl} initial={false} animate={{ opacity }} transition={reducedMotion ? instant : chartMotion.fade} />
      ) : null}
    </motion.g>
  );
}

function BarMarks({ id, radius = 4 }: BarSeriesProps) {
  const { model, animation, tooltip, uid } = useChart();
  const s = useChartSeries(id);
  const resetKey = useResetKey();
  const tween = useDataTween(s?.geometry ?? new Float64Array(0), { enabled: animation.updates, resetKey });
  const highlight = useChartState((st) => st.highlight);
  const active = useChartState((st) => st.activeIndex);
  const selection = useChartState((st) => st.selection);
  if (!s) return null;
  const horizontal = model.layout === "horizontal";
  const anySelected = selection.length > 0;
  return (
    <g style={{ pointerEvents: "none" }}>
      {Array.from({ length: model.n }, (_, i) => {
        const value = s.values[i];
        if (value === null || value === undefined) return null;
        const negative = value < 0;
        const end: BarEnd = s.outer?.[i] ? (horizontal ? (negative ? "left" : "right") : negative ? "bottom" : "top") : "none";
        const selected = selection.some((x) => x.seriesId === id && x.index === i);
        let opacity = 1;
        if (s.hidden) opacity = 0;
        else if (anySelected) opacity = selected ? 1 : 0.38;
        else if (highlight && highlight.seriesId !== id) opacity = 0.32;
        else if (tooltip !== "none" && active !== null && active !== i) opacity = 0.62;
        return (
          <Bar
            key={i}
            tween={tween}
            index={i}
            color={s.color}
            radius={radius}
            end={end}
            opacity={opacity}
            selected={selected}
            entrance={animation.entrance}
            delay={animation.entrance ? barDelay(i, model.n) : 0}
            horizontal={horizontal}
            negative={negative}
            reducedMotion={animation.reducedMotion}
            patternUrl={s.pattern ? patternFill(`${uid}-pat`, s.pattern) : null}
          />
        );
      })}
    </g>
  );
}

/** Value labels at the bar ends (front layer: outside the plot clip, so long labels never cut off). */
function BarLabels({ id }: { id: string }) {
  const { model, animation } = useChart();
  const s = useChartSeries(id);
  if (!s) return null;
  const horizontal = model.layout === "horizontal";
  const transition = animation.reducedMotion ? instant : chartMotion.update;
  return (
    <g style={{ pointerEvents: "none" }} aria-hidden="true">
      {!s.hidden && model.stackOffset !== "expand"
        ? Array.from({ length: model.n }, (_, i) => {
            const value = s.values[i];
            const band = s.bands?.[i];
            if (value === null || value === undefined || !band || (s.stack !== undefined && !s.outer?.[i])) return null;
            const shown = s.stack !== undefined ? (value < 0 ? Math.min(band[0], band[1]) : Math.max(band[0], band[1])) : value;
            const g = s.geometry;
            const bx = g[i * 4] ?? 0;
            const by = g[i * 4 + 1] ?? 0;
            const bw = g[i * 4 + 2] ?? 0;
            const bh = g[i * 4 + 3] ?? 0;
            const text = model.formatValue(s, shown);
            const pos = horizontal
              ? { x: value < 0 ? bx - 6 : bx + bw + 6, y: by + bh / 2 }
              : { x: bx + bw / 2, y: value < 0 ? by + bh + 14 : by - 6 };
            if (!horizontal && estimateTextWidth(text, 10.5) > bw + 14) return null;
            return (
              <motion.text
                key={`l${i}`}
                initial={animation.entrance ? { opacity: 0, ...pos } : false}
                animate={{ opacity: 1, ...pos }}
                transition={animation.entrance ? { ...transition, delay: 0.35 + barDelay(i, model.n) } : transition}
                fontSize={10.5}
                fontWeight={600}
                fill="var(--pui-muted-foreground)"
                textAnchor={horizontal ? (value < 0 ? "end" : "start") : "middle"}
                dy={horizontal ? "0.32em" : undefined}
                className="tabular-nums"
              >
                {text}
              </motion.text>
            );
          })
        : null}
    </g>
  );
}

function BarSeriesImpl<T>(props: BarSeriesProps<T>) {
  const layer = useChartLayer();
  if (layer === "marks") return <BarMarks {...(props as BarSeriesProps)} />;
  if (layer === "front" && props.valueLabels) return <BarLabels id={props.id} />;
  return null;
}

/** Bars from the baseline (grouped side by side, or stacked with `stack`). */
export const BarSeries = withChartRole(BarSeriesImpl, { kind: "series", series: "bar" });
