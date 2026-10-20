"use client";
// Chart insights: automatic, deterministic annotations for any <Chart> series (peaks and lows,
// MAD anomalies, CUSUM level shifts, threshold crossings and streaks), a natural-language summary
// card, and an insight list that drives the chart. No AI: the same data always reads the same way.
import { AnimatePresence, motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useChart, useChartLayer, useChartState, type ChartContextValue } from "./core/cartesian";
import { seriesValuePx, type CartesianModel, type ResolvedSeries } from "./core/cartesian-model";
import { toneColor, type ChartTone } from "./core/cartesian-parts";
import { estimateTextWidth, formatNumber } from "./core/format";
import { detectInsights, type Insight } from "./core/insights";
import { placeLabels } from "./core/label-layout";
import { useSharedChartValue } from "./core/shared-value";
import { summarizeSeries } from "./core/summary";
import { chartMotion } from "./core/use-chart-motion";
const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;
export type InsightKind = "extrema" | "anomalies" | "change" | "threshold" | "streak";
export type { Insight };
/** An insight with display text, a tone and a rank. */
export interface RankedInsight {
  /** Stable id, e.g. "anomaly-14". */
  id: string;
  insight: Insight;
  /** The data index the insight points at (the start of a streak). */
  index: number;
  title: string;
  detail: string;
  tone: ChartTone;
  priority: number;
}
export interface DescribeContext {
  xLabel: (index: number) => string;
  format: (value: number) => string;
}
const KIND_OF: Record<Insight["type"], InsightKind> = { max: "extrema", min: "extrema", anomaly: "anomalies", change: "change", crossing: "threshold", streak: "streak" };
/** Title, detail and tone for one insight ("Unusual spike", "1.2K on Mar 4, 4.1x the typical spread"). */
export function describeInsight(insight: Insight, ctx: DescribeContext): Pick<RankedInsight, "title" | "detail" | "tone"> {
  switch (insight.type) {
    case "max":
      return { title: "Peak", detail: `${ctx.format(insight.value)} on ${ctx.xLabel(insight.index)}`, tone: "primary" };
    case "min":
      return { title: "Low point", detail: `${ctx.format(insight.value)} on ${ctx.xLabel(insight.index)}`, tone: "info" };
    case "anomaly":
      return {
        title: insight.score > 0 ? "Unusual spike" : "Unusual dip",
        detail: `${ctx.format(insight.value)} on ${ctx.xLabel(insight.index)}, ${Math.abs(insight.score).toFixed(1)}\u00d7 the typical spread`,
        tone: "warning",
      };
    case "change":
      return {
        title: insight.delta > 0 ? "Level shift up" : "Level shift down",
        detail: `Average ${insight.delta > 0 ? "+" : "\u2212"}${ctx.format(Math.abs(insight.delta))} from ${ctx.xLabel(insight.index)}`,
        tone: insight.delta > 0 ? "success" : "danger",
      };
    case "crossing":
      return {
        title: `${insight.direction === "up" ? "Crossed above" : "Fell below"} ${ctx.format(insight.threshold)}`,
        detail: `Around ${ctx.xLabel(insight.index)}`,
        tone: insight.direction === "up" ? "success" : "danger",
      };
    case "streak":
      return {
        title: `${insight.length}-step ${insight.direction === "up" ? "climb" : "slide"}`,
        detail: `${ctx.xLabel(insight.start)} \u2192 ${ctx.xLabel(insight.end)}`,
        tone: insight.direction === "up" ? "success" : "danger",
      };
  }
}
function priorityOf(i: Insight, range: number): number {
  switch (i.type) {
    case "anomaly":
      return 4 + Math.min(2, Math.abs(i.score) / 10);
    case "change":
      return 3 + Math.min(1, Math.abs(i.delta) / (range || 1));
    case "max":
      return 2.6;
    case "min":
      return 2.4;
    case "crossing":
      return 1.8;
    case "streak":
      return 1 + Math.min(0.9, i.length / 20);
  }
}
export interface RankInsightsOptions {
  detect?: readonly InsightKind[];
  thresholds?: readonly number[];
  anomalyThreshold?: number;
  streakMin?: number;
}
/** Detects, filters by kind, describes and ranks the insights of one series (highest priority first). */
export function rankInsights(ys: ReadonlyArray<number | null | undefined>, ctx: DescribeContext, options: RankInsightsOptions = {}): RankedInsight[] {
  const detect = new Set(options.detect ?? ["extrema", "anomalies", "change", "threshold"]);
  const found = detectInsights(ys, {
    anomalyThreshold: options.anomalyThreshold,
    thresholds: detect.has("threshold") ? options.thresholds : [],
    changePoints: detect.has("change"),
    streakMin: options.streakMin,
  });
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of ys) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const range = hi - lo;
  // An anomaly that is also the peak reads better as the anomaly; drop the duplicate extreme.
  const anomalous = new Set(found.filter((f) => f.type === "anomaly").map((f) => (f as { index: number }).index));
  return found
    .filter((f) => detect.has(KIND_OF[f.type]))
    .filter((f) => !((f.type === "max" || f.type === "min") && anomalous.has(f.index)))
    .map((insight) => {
      const index = "index" in insight ? insight.index : insight.start;
      return { id: `${insight.type}-${index}`, insight, index, priority: priorityOf(insight, range), ...describeInsight(insight, ctx) };
    })
    .sort((a, b) => b.priority - a.priority || a.index - b.index);
}
// ---------------------------------------------------------------------------------------------
// Shared hook

export interface ChartInsightsOptions extends RankInsightsOptions {
  /** Series to analyze. Default: the first visible series. */
  seriesId?: string;
  /** Insights shown (on the plot and in the list). Default 4. */
  max?: number;
}
function pickSeries(model: CartesianModel, id?: string): ResolvedSeries | null {
  return (id ? model.series.find((s) => s.id === id) : model.series.find((s) => !s.hidden)) ?? null;
}
function useInsightList(options: ChartInsightsOptions): { series: ResolvedSeries | null; insights: RankedInsight[]; ctx: DescribeContext } {
  const { model } = useChart();
  const series = pickSeries(model, options.seriesId);
  const { detect, thresholds, anomalyThreshold, streakMin, max = 4 } = options;
  const detectKey = detect?.join(",") ?? "";
  const thresholdKey = thresholds?.join(",") ?? "";
  const values = series?.values;
  const ctx = React.useMemo<DescribeContext>(
    () => ({ xLabel: (i) => model.formatX(i), format: (v) => (series ? model.formatValue(series, v) : formatNumber(v)) }),
    [model, series],
  );
  const insights = React.useMemo(() => {
    if (!values) return [];
    const opts: RankInsightsOptions = {
      detect: detectKey ? (detectKey.split(",") as InsightKind[]) : undefined,
      thresholds: thresholdKey ? thresholdKey.split(",").map(Number) : undefined,
      anomalyThreshold,
      streakMin,
    };
    return rankInsights(values, ctx, opts).slice(0, Math.max(0, max));
  }, [values, ctx, detectKey, thresholdKey, anomalyThreshold, streakMin, max]);
  return { series, insights, ctx };
}
/** Plot position of an insight's anchor (crossings interpolate between their two points). */
function anchorOf(chart: ChartContextValue, series: ResolvedSeries, r: RankedInsight): { x: number; y: number } | null {
  const { model, tweens } = chart;
  const g = tweens.get(series.id)?.get();
  const at = (i: number) => {
    if (g && series.kind === "line") return { x: g[i * 2] ?? Number.NaN, y: g[i * 2 + 1] ?? Number.NaN };
    if (g && series.kind === "area") return { x: g[i * 3] ?? Number.NaN, y: g[i * 3 + 1] ?? Number.NaN };
    return { x: model.catPos(i), y: seriesValuePx(model, series, i) };
  };
  if (r.insight.type === "crossing") {
    const t = r.insight.at;
    const i0 = Math.floor(t);
    const p0 = at(i0);
    const p1 = at(Math.min(model.n - 1, i0 + 1));
    const scale = model.yScales[series.yAxisId];
    const f = t - i0;
    const y = scale ? scale(r.insight.threshold) : p0.y + (p1.y - p0.y) * f;
    const x = p0.x + (p1.x - p0.x) * f;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }
  const p = at(r.index);
  return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
}
// ---------------------------------------------------------------------------------------------
// Plot layers

function InsightRegions({ options }: { options: ChartInsightsOptions }) {
  const chart = useChart();
  const { model, animation } = chart;
  const { series, insights } = useInsightList(options);
  const [hovered] = useSharedChartValue<string | null>("insight-hover", null);
  if (!series || series.hidden) return null;
  const r = insights.find((i) => i.id === hovered);
  const scale = model.yScales[series.yAxisId];
  const t = animation.reducedMotion ? instant : chartMotion.fade;
  let region: React.ReactNode = null;
  if (r) {
    const color = toneColor(r.tone);
    if (r.insight.type === "streak" || r.insight.type === "change") {
      const x0 = model.catPos(r.insight.type === "streak" ? r.insight.start : r.insight.index);
      const x1 = r.insight.type === "streak" ? model.catPos(r.insight.end) : model.plotW;
      region = (
        <motion.rect
          key={r.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t}
          x={Math.min(x0, x1)}
          y={0}
          width={Math.max(1, Math.abs(x1 - x0))}
          height={model.plotH}
          fill={`color-mix(in oklab, ${color} 12%, transparent)`}
        />
      );
    } else if (r.insight.type === "crossing" && scale) {
      region = <motion.line key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t} x1={0} x2={model.plotW} y1={scale(r.insight.threshold)} y2={scale(r.insight.threshold)} stroke={color} strokeWidth={1.5} />;
    } else {
      const x = model.catPos(r.index);
      region = <motion.line key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t} x1={x} x2={x} y1={0} y2={model.plotH} stroke={color} strokeWidth={1} strokeDasharray="3 4" />;
    }
  }
  const thresholds = options.detect && !options.detect.includes("threshold") ? [] : (options.thresholds ?? []);
  return (
    <g aria-hidden="true" pointerEvents="none">
      {scale
        ? thresholds.map((v) => {
            const y = scale(v);
            return Number.isFinite(y) ? <line key={v} x1={0} x2={model.plotW} y1={y} y2={y} stroke="var(--pui-muted-foreground)" strokeOpacity={0.55} strokeDasharray="2 4" /> : null;
          })
        : null}
      <AnimatePresence>{region}</AnimatePresence>
    </g>
  );
}
function InsightMarks({ options, labels }: { options: ChartInsightsOptions; labels: boolean }) {
  const chart = useChart();
  const { model, animation } = chart;
  const { series, insights } = useInsightList(options);
  const [hovered] = useSharedChartValue<string | null>("insight-hover", null);
  const active = useChartState((s) => s.activeIndex);
  if (!series || series.hidden) return null;
  const items = insights
    .map((r) => ({ r, p: anchorOf(chart, series, r) }))
    .filter((e): e is { r: RankedInsight; p: { x: number; y: number } } => !!e.p);
  const boxes = items.map(({ r }) => ({ w: Math.max(estimateTextWidth(r.title, 11) * 1.05, estimateTextWidth(r.detail.length > 26 ? r.detail.slice(0, 26) : r.detail, 10)) + 16, h: 20 }));
  const { margin: m } = model;
  const placed = labels
    ? placeLabels(
        items.map(({ p, r }, k) => ({ x: p.x, y: p.y, width: boxes[k]?.w ?? 60, height: boxes[k]?.h ?? 20, priority: r.priority })),
        { x: -m.left + 2, y: -m.top + 2, width: model.plotW + m.left + m.right - 4, height: model.plotH + m.top - 4 },
        { offset: 14, padding: 4, obstacles: items.map(({ p }) => ({ x: p.x - 6, y: p.y - 6, width: 12, height: 12 })) },
      )
    : [];
  const enterDelay = animation.entrance ? 0.95 : 0;
  const glide = animation.updates ? chartMotion.update : instant;
  return (
    <g aria-hidden="true" pointerEvents="none">
      {items.map(({ r, p }, k) => {
        const color = toneColor(r.tone);
        const on = hovered === r.id || (hovered === null && active !== null && active === r.index);
        const dim = hovered !== null && !on;
        const box = placed[k]?.box ?? null;
        const w = boxes[k]?.w ?? 60;
        const edgeX = box ? Math.max(box.x + 8, Math.min(box.x + w - 8, p.x)) : p.x;
        const edgeY = box ? (box.y > p.y ? box.y : box.y + 20) : p.y;
        const delay = enterDelay + k * 0.08;
        return (
          <motion.g key={r.id} initial={false} animate={{ opacity: dim ? 0.3 : 1 }} transition={animation.reducedMotion ? instant : chartMotion.fade}>
            {box ? (
              <motion.line
                initial={animation.entrance ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y, opacity: 0 } : false}
                animate={{ x1: p.x, y1: p.y, x2: edgeX, y2: edgeY, opacity: 0.75 }}
                transition={animation.reducedMotion ? instant : animation.entrance ? { duration: 0.4, ease: outExpo, delay } : glide}
                stroke={color}
                strokeWidth={1.25}
              />
            ) : null}
            <motion.g initial={false} animate={{ x: p.x, y: p.y }} transition={glide}>
              {r.insight.type === "anomaly" && animation.entrance && !animation.reducedMotion ? (
                <motion.circle r={6} fill="none" stroke={color} strokeWidth={1.5} initial={{ scale: 1, opacity: 0 }} animate={{ scale: [1, 3.2], opacity: [0.8, 0] }} transition={{ duration: 1.2, delay: delay + 0.2, ease: "easeOut" }} />
              ) : null}
              {r.insight.type === "anomaly" ? <circle r={on ? 9 : 7} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="2.5 2.5" /> : null}
              <motion.circle
                r={r.insight.type === "crossing" ? 3.5 : 4.5}
                fill={r.insight.type === "crossing" ? "var(--pui-background)" : color}
                stroke={r.insight.type === "crossing" ? color : "var(--pui-background)"}
                strokeWidth={2}
                initial={animation.entrance ? { scale: 0 } : false}
                animate={{ scale: on ? 1.35 : 1 }}
                transition={animation.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 26, delay: animation.entrance ? delay : 0 }}
              />
            </motion.g>
            {box ? (
              <motion.g
                initial={animation.entrance ? { opacity: 0, x: box.x, y: box.y + 4 } : false}
                animate={{ opacity: 1, x: box.x, y: box.y, scale: on ? 1.05 : 1 }}
                transition={animation.reducedMotion ? instant : { ...glide, opacity: { duration: 0.25, delay: animation.entrance ? delay + 0.15 : 0 } }}
                style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
              >
                <rect
                  width={w}
                  height={20}
                  rx={10}
                  fill={`color-mix(in oklab, ${color} ${on ? 20 : 12}%, var(--pui-background))`}
                  stroke={`color-mix(in oklab, ${color} ${on ? 70 : 40}%, transparent)`}
                  style={{ filter: "drop-shadow(0 2px 5px color-mix(in oklab, var(--pui-foreground) 10%, transparent))" }}
                />
                <text x={w / 2} y={13.5} textAnchor="middle" fontSize={11} fontWeight={650} fill={color}>
                  {r.title}
                </text>
              </motion.g>
            ) : null}
          </motion.g>
        );
      })}
    </g>
  );
}
// ---------------------------------------------------------------------------------------------
// List

function KindIcon({ insight }: { insight: Insight }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let d = "M4 12h16";
  if (insight.type === "max") d = "M5 15l7-7 7 7";
  else if (insight.type === "min") d = "M5 9l7 7 7-7";
  else if (insight.type === "anomaly") d = "M3 14h4l2-8 4 14 2-6h6";
  else if (insight.type === "change") d = insight.delta > 0 ? "M3 16h7V8h11" : "M3 8h7v8h11";
  else if (insight.type === "crossing") d = "M3 12h18M6 18L18 6";
  else if (insight.type === "streak") d = insight.direction === "up" ? "M3 18l5-5 4 3 9-9M15 7h6v6" : "M3 6l5 5 4-3 9 9M15 17h6v-6";
  return (
    <svg viewBox="0 0 24 24" className={cn(blockReset, "size-3.5")} aria-hidden="true">
      <path d={d} {...common} />
    </svg>
  );
}
export interface InsightListProps extends ChartInsightsOptions {
  /** Default "bottom". */
  position?: "top" | "bottom";
  /** Accessible list name. Default "Insights". */
  listLabel?: string;
  onInsightClick?: (insight: RankedInsight) => void;
  className?: string;
}
function InsightListLayer({ listLabel = "Insights", onInsightClick, className, position: _position, ...options }: InsightListProps) {
  const { store, overlayRef, animation } = useChart();
  const { series, insights } = useInsightList(options);
  const [hovered, setHovered] = useSharedChartValue<string | null>("insight-hover", null);
  if (!series || !insights.length) return null;
  const ordered = [...insights].sort((a, b) => a.index - b.index);
  const enter = (r: RankedInsight) => {
    setHovered(r.id);
    if (!store.getState().focus) store.setActiveIndex(r.index);
  };
  const leave = () => {
    setHovered(null);
    const s = store.getState();
    if (!s.focus && !s.pointer) store.setActiveIndex(null);
  };
  const pick = (r: RankedInsight) => {
    // Hand the point to the chart: its overlay takes focus, so arrow keys continue from here.
    overlayRef.current?.focus({ preventScroll: true });
    store.setFocus({ seriesId: series.id, index: r.index });
    store.setActiveIndex(r.index);
    store.announce(`${r.title}. ${r.detail}.`);
    onInsightClick?.(r);
  };
  return (
    <ol aria-label={listLabel} className={cn(listReset, "grid gap-1.5 sm:grid-cols-2", className)}>
      {ordered.map((r, k) => {
        const color = toneColor(r.tone);
        const on = hovered === r.id;
        return (
          <motion.li
            key={r.id}
            initial={animation.entrance ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={animation.reducedMotion ? instant : { duration: 0.25, delay: animation.entrance ? 1 + k * 0.05 : 0 }}
          >
            <button
              type="button"
              onPointerEnter={() => enter(r)}
              onPointerLeave={leave}
              onFocus={() => enter(r)}
              onBlur={leave}
              onClick={() => pick(r)}
              className={cn(
                controlReset,
                focusRing,
                "flex w-full items-start gap-2.5 rounded-pui-md border px-2.5 py-2 text-left transition-colors",
                on ? "border-transparent bg-pui-muted" : "border-pui-border hover:bg-pui-muted",
              )}
            >
              <span aria-hidden="true" className={cn(blockReset, "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-pui-full")} style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
                <KindIcon insight={r.insight} />
              </span>
              <span className={cn(blockReset, "flex min-w-0 flex-col")}>
                <span className={cn(blockReset, "text-xs font-semibold")}>{r.title}</span>
                <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{r.detail}</span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ol>
  );
}
/** The detected insights as a list; hovering one highlights its region, clicking focuses its point. */
export function InsightList(props: InsightListProps) {
  return useChartLayer() === `legend-${props.position ?? "bottom"}` ? <InsightListLayer {...props} /> : null;
}
// ---------------------------------------------------------------------------------------------
// Summary

export interface ChartSummaryOptions extends ChartInsightsOptions {
  /** Mention the top insights after the trend sentence. Default 2. */
  insightSentences?: number;
}
/** The natural-language summary of the enclosing chart's series, with its strongest insights. */
export function useChartSummary(options: ChartSummaryOptions = {}): string {
  const { model, locale } = useChart();
  const { series, insights } = useInsightList(options);
  if (!series) return "No data.";
  const base = summarizeSeries({ label: series.label, xs: model.xValues.map((_, i) => model.formatX(i)), ys: series.values, format: series.format }, { locale, anomalies: false });
  const extra = insights
    .filter((r) => r.insight.type !== "max" && r.insight.type !== "min")
    .slice(0, options.insightSentences ?? 2)
    .map((r) => `${r.title}: ${r.detail}.`);
  return [base, ...extra].join(" ");
}
export interface ChartSummaryProps extends ChartSummaryOptions {
  /** Default "top". */
  position?: "top" | "bottom";
  /** Card heading. Default "Summary". */
  heading?: string;
  className?: string;
}
function SummaryLayer({ heading = "Summary", className, position: _position, ...options }: ChartSummaryProps) {
  const text = useChartSummary(options);
  const { animation } = useChart();
  return (
    <motion.div
      initial={animation.entrance ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={animation.reducedMotion ? instant : { duration: 0.3, delay: animation.entrance ? 0.3 : 0 }}
      className={cn(blockReset, "flex gap-2.5 rounded-pui-md border border-pui-border bg-pui-muted/50 px-3 py-2.5", className)}
    >
      <span aria-hidden="true" className={cn(blockReset, "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-pui-full bg-pui-primary/12 text-pui-primary")}>
        <svg viewBox="0 0 24 24" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      </span>
      <p className={cn(blockReset, "text-xs leading-relaxed")}>
        <span className={cn(blockReset, "font-semibold")}>{heading}. </span>
        <span className={cn(blockReset, "text-pui-muted-foreground")} aria-live="polite">
          {text}
        </span>
      </p>
    </motion.div>
  );
}
/** A natural-language summary card for the chart (deterministic, updates with the data). */
export function ChartSummary(props: ChartSummaryProps) {
  return useChartLayer() === `legend-${props.position ?? "top"}` ? <SummaryLayer {...props} /> : null;
}
// ---------------------------------------------------------------------------------------------
// ChartInsights

export interface ChartInsightsProps extends ChartInsightsOptions {
  /** Pill labels on the plot (markers only when false). Default true. */
  labels?: boolean;
  /** Also render an InsightList. Default false. */
  list?: "top" | "bottom" | false;
  /** Also render a ChartSummary card. Default false. */
  summary?: "top" | "bottom" | false;
  onInsightClick?: (insight: RankedInsight) => void;
}
/**
 * Automatic annotations for a series inside any <Chart> (LineChart, AreaChart, the kit):
 * markers and pill labels placed without overlaps, leader lines that draw in after the series,
 * an anomaly pulse, hover regions for streaks and level shifts, plus an optional list and summary.
 */
export function ChartInsights({ labels = true, list = false, summary = false, onInsightClick, ...options }: ChartInsightsProps) {
  const layer = useChartLayer();
  if (layer === "back") return <InsightRegions options={options} />;
  if (layer === "front") return <InsightMarks options={options} labels={labels} />;
  if (list && layer === `legend-${list}`) return <InsightListLayer {...options} onInsightClick={onInsightClick} />;
  if (summary && layer === `legend-${summary}`) return <SummaryLayer {...options} />;
  return null;
}
