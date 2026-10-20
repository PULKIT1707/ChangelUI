"use client";
// DiffChart: an actual line against a baseline (a target, a forecast, another series or the same
// series one period earlier), with the area between them filled by sign. The fill is the band
// between the two curves clipped to either side of the baseline curve, so crossings are exact for
// every curve type, and both edges share the series' live tweens, so data updates morph as one.
import { motion, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { Chart, useChart, useChartLayer, useChartSeries, useChartState, type ChartAnnouncementContext, type ChartProps } from "./core/cartesian";
import { readAccessor, type Accessor, type XValue } from "./core/cartesian-model";
import { ChartCrosshair, ChartGrid, ReferenceLine, XAxis, YAxis, toneColor, type ChartTone, type ReferenceLineProps, type XAxisProps, type YAxisProps } from "./core/cartesian-parts";
import { LineSeries } from "./core/cartesian-series";
import { ChartLegend, ChartTooltip, type ChartTooltipContext } from "./core/cartesian-tooltip";
import { TipRow } from "./core/frame";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { areaPath, type AreaPoint, type Curve } from "./core/path";
import { ChartPatterns, patternFill } from "./core/patterns";
import { useSharedChartValue } from "./core/shared-value";
import { chartMotion, useDataTween } from "./core/use-chart-motion";
const instant: Transition = { duration: 0 };
const A = "a";
const B = "b";
type Side = "above" | "below";
// ---------------------------------------------------------------------------------------------
// Pure helpers

export interface DiffStats {
  /** Points where both values exist. */
  count: number;
  above: number;
  below: number;
  /** Sum of a - b over the points where both exist. */
  net: number;
  /** Largest positive and negative gap (a - b), with its index. */
  maxAbove: { index: number; delta: number } | null;
  maxBelow: { index: number; delta: number } | null;
  /** Where a crosses b: fractional indices (linear between points) and the direction a moves. */
  crossings: Array<{ at: number; direction: "up" | "down" }>;
}
const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
/** Above/below counts, the net gap, the extreme gaps and the exact crossings of a against b. */
export function diffStats(a: ReadonlyArray<number | null | undefined>, b: ReadonlyArray<number | null | undefined>): DiffStats {
  const out: DiffStats = { count: 0, above: 0, below: 0, net: 0, maxAbove: null, maxBelow: null, crossings: [] };
  let prev: { i: number; d: number } | null = null;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const va = a[i];
    const vb = b[i];
    if (!finite(va) || !finite(vb)) {
      prev = null;
      continue;
    }
    const d = va - vb;
    out.count++;
    out.net += d;
    if (d > 0) out.above++;
    else if (d < 0) out.below++;
    if (d > 0 && (!out.maxAbove || d > out.maxAbove.delta)) out.maxAbove = { index: i, delta: d };
    if (d < 0 && (!out.maxBelow || d < out.maxBelow.delta)) out.maxBelow = { index: i, delta: d };
    if (prev && Math.sign(prev.d) !== Math.sign(d) && d !== 0) {
      // Linear segments cross where the difference hits zero.
      const t = prev.d / (prev.d - d);
      if (prev.d !== 0) out.crossings.push({ at: prev.i + t * (i - prev.i), direction: d > 0 ? "up" : "down" });
    }
    if (d !== 0 || !prev) prev = { i, d };
  }
  return out;
}
// ---------------------------------------------------------------------------------------------
// Fill

/** The signed fill between the two lines (marks layer, under the strokes). */
function DiffFill({ curve, positive, negative, opacity, patterns }: { curve: Curve; positive: string; negative: string; opacity: number; patterns: boolean }) {
  const { model, animation, uid } = useChart();
  const sa = useChartSeries(A);
  const sb = useChartSeries(B);
  const [focusSide] = useSharedChartValue<Side | null>("diff-side", null);
  const n = model.n;
  // One tween over [ax, ay, bx, by] per point, on the series' own spring, so the fill edges move
  // exactly with the strokes (and stay in step when either changes).
  const target = React.useMemo(() => {
    const out = new Float64Array(n * 4);
    const ga = sa?.geometry;
    const gb = sb?.geometry;
    for (let i = 0; i < n; i++) {
      out[i * 4] = ga?.[i * 2] ?? Number.NaN;
      out[i * 4 + 1] = ga?.[i * 2 + 1] ?? Number.NaN;
      out[i * 4 + 2] = gb?.[i * 2] ?? Number.NaN;
      out[i * 4 + 3] = gb?.[i * 2 + 1] ?? Number.NaN;
    }
    return out;
  }, [n, sa?.geometry, sb?.geometry]);
  const tween = useDataTween(target, { enabled: animation.updates, resetKey: `${model.plotW}x${model.plotH}` });
  const H = model.plotH;
  const pts = (g: Float64Array, which: "band" | "above" | "below"): Array<AreaPoint | null> => {
    const out: Array<AreaPoint | null> = [];
    for (let i = 0; i < g.length / 4; i++) {
      const x = g[i * 4] as number;
      const ya = g[i * 4 + 1] as number;
      const yb = g[i * 4 + 3] as number;
      if (!Number.isFinite(x) || !Number.isFinite(ya) || !Number.isFinite(yb)) {
        out.push(null);
        continue;
      }
      // Pixel y grows downward: "above the baseline" is the region from b up to the top edge.
      out.push(which === "band" ? [x, ya, yb] : which === "above" ? [x, yb, -H] : [x, yb, H * 2]);
    }
    return out;
  };
  const band = useTransform(tween, (g) => areaPath(pts(g, "band"), { curve }));
  const above = useTransform(tween, (g) => areaPath(pts(g, "above"), { curve }));
  const below = useTransform(tween, (g) => areaPath(pts(g, "below"), { curve }));
  const off = !sa || !sb || sa.hidden || sb.hidden;
  const fade = (side: Side) => (off ? 0 : focusSide && focusSide !== side ? opacity * 0.25 : focusSide === side ? Math.min(0.85, opacity * 1.6) : opacity);
  const t = animation.reducedMotion ? instant : chartMotion.fade;
  const enter = animation.entrance ? { opacity: 0 } : false;
  const delay = animation.entrance ? 0.45 : 0;
  return (
    <g aria-hidden="true">
      {patterns ? <ChartPatterns idPrefix={`${uid}-dpat`} opacity={0.6} /> : null}
      <defs>
        <clipPath id={`${uid}-diff-above`}>
          <motion.path d={above} />
        </clipPath>
        <clipPath id={`${uid}-diff-below`}>
          <motion.path d={below} />
        </clipPath>
      </defs>
      {(["above", "below"] as const).map((side) => {
        const color = side === "above" ? positive : negative;
        return (
          <g key={side} clipPath={`url(#${uid}-diff-${side})`}>
            <motion.path d={band} initial={enter} animate={{ opacity: fade(side) }} transition={animation.entrance ? { duration: 0.5, delay } : t} fill={color} />
            {patterns ? (
              <motion.path
                d={band}
                initial={enter}
                animate={{ opacity: off ? 0 : 1 }}
                transition={animation.reducedMotion ? instant : { duration: 0.3, delay }}
                fill={patternFill(`${uid}-dpat`, side === "above" ? "diagonal" : "dots")}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
/** The gap at the active x: a bracket from b to a with a signed pill (front layer). */
function DiffGap({ positive, negative, format, locale }: { positive: string; negative: string; format?: NumberFormat; locale: string }) {
  const { model, animation, tweens } = useChart();
  const active = useChartState((s) => s.activeIndex);
  const sa = useChartSeries(A);
  const sb = useChartSeries(B);
  if (active === null || !sa || !sb || sa.hidden || sb.hidden) return null;
  const va = sa.values[active];
  const vb = sb.values[active];
  if (!finite(va) || !finite(vb)) return null;
  const ga = tweens.get(A)?.get() ?? sa.geometry;
  const gb = tweens.get(B)?.get() ?? sb.geometry;
  const x = ga[active * 2] as number;
  const ya = ga[active * 2 + 1] as number;
  const yb = gb[active * 2 + 1] as number;
  if (![x, ya, yb].every(Number.isFinite)) return null;
  const d = va - vb;
  const color = d >= 0 ? positive : negative;
  const pct = vb ? d / Math.abs(vb) : null;
  const text = `${d > 0 ? "+" : d < 0 ? "\u2212" : ""}${pct === null ? formatNumber(Math.abs(d), format ?? { notation: "compact", maximumFractionDigits: 1 }, locale) : getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(pct))}`;
  const w = text.length * 6.6 + 14;
  const mid = (ya + yb) / 2;
  const left = x + 10 + w > model.plotW ? x - 10 - w : x + 10;
  const t = animation.reducedMotion ? instant : chartMotion.hover;
  return (
    <motion.g aria-hidden="true" pointerEvents="none" initial={false} animate={{ opacity: 1 }}>
      <motion.line initial={false} animate={{ x1: x, x2: x, y1: ya, y2: yb }} transition={t} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
      <motion.circle initial={false} animate={{ cx: x, cy: yb }} transition={t} r={3.5} fill="var(--pui-background)" stroke="var(--pui-muted-foreground)" strokeWidth={1.5} />
      <motion.g initial={false} animate={{ x: left, y: mid - 10 }} transition={t}>
        <rect width={w} height={20} rx={10} fill={`color-mix(in oklab, ${color} 18%, var(--pui-background))`} stroke={`color-mix(in oklab, ${color} 55%, transparent)`} />
        <text x={w / 2} y={13.5} textAnchor="middle" fontSize={11} fontWeight={700} fill={color} style={{ fontVariantNumeric: "tabular-nums" }}>
          {text}
        </text>
      </motion.g>
    </motion.g>
  );
}
/** Above / below / net chips over the plot; hovering one spotlights that side of the fill. */
function DiffStrip({ stats, labels, positive, negative, format, locale, positiveLabel, negativeLabel }: {
  stats: DiffStats;
  labels: { a: string; b: string };
  positive: string;
  negative: string;
  format?: NumberFormat;
  locale: string;
  positiveLabel: string;
  negativeLabel: string;
}) {
  const [side, setSide] = useSharedChartValue<Side | null>("diff-side", null);
  const fmt = (v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${fmt(Math.abs(v))}`;
  const chip = (s: Side, color: string, label: string, count: number) => (
    <button
      type="button"
      aria-pressed={side === s}
      onPointerEnter={() => setSide(s)}
      onPointerLeave={() => setSide(null)}
      onFocus={() => setSide(s)}
      onBlur={() => setSide(null)}
      onClick={() => setSide(side === s ? null : s)}
      className={cn(
        controlReset,
        focusRing,
        "inline-flex items-center gap-1.5 rounded-pui-full border px-2.5 py-1 text-xs tabular-nums transition-colors",
        side === s ? "border-transparent bg-pui-muted" : "border-pui-border",
      )}
    >
      <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: color }} />
      <span className={cn(blockReset, "text-pui-muted-foreground")}>{label}</span>
      <span className={cn(blockReset, "font-semibold")}>
        {count}
        <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>/{stats.count}</span>
      </span>
    </button>
  );
  return (
    <div className={cn(blockReset, "flex flex-wrap items-center gap-2")} role="group" aria-label={`${labels.a} versus ${labels.b}`}>
      {chip("above", positive, positiveLabel, stats.above)}
      {chip("below", negative, negativeLabel, stats.below)}
      <span className={cn(blockReset, "inline-flex items-center gap-1.5 px-1 text-xs tabular-nums")}>
        <span className={cn(blockReset, "text-pui-muted-foreground")}>Net</span>
        <span className={cn(blockReset, "font-semibold", stats.net > 0 ? "text-pui-success-text" : stats.net < 0 ? "text-pui-danger-text" : "")}>{signed(stats.net)}</span>
      </span>
      <span className={cn(blockReset, "inline-flex items-center gap-1.5 px-1 text-xs tabular-nums")}>
        <span className={cn(blockReset, "text-pui-muted-foreground")}>Crossings</span>
        <span className={cn(blockReset, "font-semibold")}>{stats.crossings.length}</span>
      </span>
    </div>
  );
}
function Layer({ name, children }: { name: "marks" | "front" | "legend-top"; children: React.ReactNode }) {
  return useChartLayer() === name ? <>{children}</> : null;
}
// ---------------------------------------------------------------------------------------------
// DiffChart

export interface DiffChartProps<T> extends Omit<ChartProps<T>, "children" | "stackOffset" | "barGap" | "tooltip" | "patterns" | "sort"> {
  /** The actual values. */
  a: Accessor<T, number | null | undefined>;
  /** The baseline (compare="series"): a target, forecast or another series. */
  b?: Accessor<T, number | null | undefined>;
  /** "series" compares a with b; "previous-period" compares a with itself `period` points earlier. Default "series". */
  compare?: "series" | "previous-period";
  /** Points per period for compare="previous-period" (7 for week over week on daily data, 12 for year over year on months). Default 1. */
  period?: number;
  /** Legend, tooltip and summary names. Default { a: "Actual", b: "Baseline" or "Previous period" }. */
  labels?: { a?: string; b?: string };
  /** Fill where a is above b. Default "success". */
  positiveTone?: ChartTone;
  /** Fill where a is below b. Default "danger". */
  negativeTone?: ChartTone;
  /** Chip labels for the two sides. Default "Above" / "Below". */
  sideLabels?: { above?: string; below?: string };
  /** Default "monotone". */
  curve?: Curve;
  /** Fill opacity. Default 0.26. */
  fillOpacity?: number;
  /** Hatched (above) and dotted (below) fills, so the sides never rely on color alone. Default false. */
  patterns?: boolean;
  /** Value format for both series, the gap pill and the strip. */
  format?: NumberFormat;
  /** Above/below counts, net gap and crossings over the plot. Default true. */
  strip?: boolean;
  /** Default "bottom"; "none" hides the legend. */
  legend?: "top" | "bottom" | "none";
  grid?: boolean;
  markers?: boolean | "auto";
  yAxis?: Omit<YAxisProps, "id" | "side">;
  xAxis?: XAxisProps;
  referenceLines?: readonly ReferenceLineProps[];
}
function DiffChartInner<T>(
  {
    data,
    a,
    b,
    compare = "series",
    period = 1,
    labels,
    positiveTone = "success",
    negativeTone = "danger",
    sideLabels,
    curve = "monotone",
    fillOpacity = 0.26,
    patterns = false,
    format,
    strip = true,
    legend = "bottom",
    grid = true,
    markers = "auto",
    yAxis,
    xAxis,
    referenceLines,
    locale = "en-US",
    summary,
    formatAnnouncement,
    ...rest
  }: DiffChartProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const names = { a: labels?.a ?? "Actual", b: labels?.b ?? (compare === "previous-period" ? "Previous period" : "Baseline") };
  const lag = Math.max(1, Math.round(period));
  const baseline = React.useMemo<Accessor<T, number | null | undefined>>(() => {
    if (compare === "previous-period") return (_row: T, i: number) => (i >= lag ? readAccessor(a, data[i - lag] as T, i - lag) : null);
    return b ?? (() => null);
  }, [compare, lag, a, b, data]);
  const values = React.useMemo(() => {
    const va = data.map((row, i) => readAccessor(a, row, i));
    const vb = data.map((row, i) => readAccessor(baseline, row, i));
    return { va, vb, stats: diffStats(va, vb) };
  }, [data, a, baseline]);
  const positive = toneColor(positiveTone);
  const negative = toneColor(negativeTone);
  const posLabel = sideLabels?.above ?? "Above";
  const negLabel = sideLabels?.below ?? "Below";
  const fmt = (v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const pctFmt = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const describeGap = (i: number) => {
    const va = values.va[i];
    const vb = values.vb[i];
    if (!finite(va) || !finite(vb)) return "";
    const d = va - vb;
    if (d === 0) return `level with ${names.b}`;
    const rel = vb ? `${pctFmt.format(Math.abs(d / vb))}` : fmt(Math.abs(d));
    return `${rel} ${d > 0 ? "above" : "below"} ${names.b}`;
  };
  const { stats } = values;
  let generated = `${names.a} versus ${names.b}: no overlapping data.`;
  if (stats.count) {
    generated = `${names.a} ran above ${names.b} on ${stats.above} of ${stats.count} points and below on ${stats.below}, a net gap of ${stats.net >= 0 ? "+" : "-"}${fmt(Math.abs(stats.net))}.`;
    if (stats.crossings.length) generated += ` The lines cross ${stats.crossings.length} time${stats.crossings.length === 1 ? "" : "s"}.`;
  }
  const announce = (ctx: ChartAnnouncementContext) => {
    const gap = describeGap(ctx.index);
    return `${ctx.xLabel}: ${ctx.items.map((r) => `${r.label} ${r.value}`).join(", ")}${gap ? `. ${gap}` : ""}. Point ${ctx.index + 1} of ${ctx.count}.`;
  };
  const tooltip = (ctx: ChartTooltipContext) => {
    const va = values.va[ctx.index];
    const vb = values.vb[ctx.index];
    const d = finite(va) && finite(vb) ? va - vb : null;
    return (
      <div className={cn(blockReset, "flex min-w-44 flex-col gap-1")}>
        <div className={cn(blockReset, "text-[11px] font-semibold text-pui-muted-foreground")}>{ctx.title}</div>
        {ctx.rows.map((r) => (
          <TipRow key={r.series.id} swatch={r.series.color} label={r.series.label} value={r.formatted} />
        ))}
        {d !== null ? (
          <div className={cn(blockReset, "mt-0.5 border-t border-pui-chart-tooltip-border pt-1")}>
            <TipRow label={"\u0394"} value={`${d > 0 ? "+" : d < 0 ? "\u2212" : ""}${fmt(Math.abs(d))}`} tone={d > 0 ? "up" : d < 0 ? "down" : "muted"} />
            {finite(vb) && vb !== 0 ? <TipRow label={"\u0394%"} value={`${d > 0 ? "+" : d < 0 ? "\u2212" : ""}${pctFmt.format(Math.abs(d / vb))}`} tone={d > 0 ? "up" : d < 0 ? "down" : "muted"} /> : null}
          </div>
        ) : null}
      </div>
    );
  };
  return (
    <Chart<T>
      ref={ref}
      data={data}
      locale={locale}
      summary={summary ?? generated}
      formatAnnouncement={formatAnnouncement ?? announce}
      {...rest}
    >
      {strip ? (
        <Layer name="legend-top">
          <DiffStrip stats={stats} labels={names} positive={positive} negative={negative} format={format} locale={locale} positiveLabel={posLabel} negativeLabel={negLabel} />
        </Layer>
      ) : null}
      {legend !== "none" ? <ChartLegend position={legend} /> : null}
      {grid ? <ChartGrid /> : null}
      <XAxis {...xAxis} />
      <YAxis {...yAxis} />
      <Layer name="marks">
        <DiffFill curve={curve} positive={positive} negative={negative} opacity={fillOpacity} patterns={patterns} />
      </Layer>
      <LineSeries<T> id={B} y={baseline} label={names.b} color="var(--pui-muted-foreground)" curve={curve} dashed format={format} markers={false} strokeWidth={1.75} />
      <LineSeries<T> id={A} y={a} label={names.a} color="var(--pui-chart-1)" curve={curve} format={format} markers={markers} strokeWidth={2.25} />
      {referenceLines?.map((l, i) => <ReferenceLine key={`l${i}`} {...l} />)}
      <ChartCrosshair />
      <Layer name="front">
        <DiffGap positive={positive} negative={negative} format={format} locale={locale} />
      </Layer>
      <ChartTooltip content={tooltip} />
    </Chart>
  );
}
/**
 * Actual vs baseline with the gap filled by sign: exact crossings for any curve, a live gap
 * bracket with a signed pill, Δ and Δ% in the tooltip, and above/below chips that spotlight a side.
 */
export const DiffChart = React.forwardRef(DiffChartInner) as (<T>(props: DiffChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
DiffChart.displayName = "DiffChart";
