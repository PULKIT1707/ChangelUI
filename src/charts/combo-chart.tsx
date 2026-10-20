"use client";

// Combo chart: bars, lines and areas on one band axis with a left and an optional right value
// axis. alignZero (default on) puts zero at the same height on both axes, which ends the classic
// misaligned-baseline dual-axis chart. The tooltip groups rows by axis, axis captions are colored
// by their series, and every Chart kit interaction (crosshair, legend toggle/solo, keyboard,
// selection, morphing updates) comes along.
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { Chart, useChartLayer, type ChartProps } from "./core/cartesian";
import { readAccessor, type Accessor, type ResolvedSeries } from "./core/cartesian-model";
import { ChartCrosshair, ChartGrid, ReferenceLine, XAxis, YAxis, type ReferenceLineProps, type XAxisProps } from "./core/cartesian-parts";
import { AreaSeries, BarSeries, LineSeries } from "./core/cartesian-series";
import { ChartLegend, ChartTooltip, type ChartTooltipContext } from "./core/cartesian-tooltip";
import { categoricalColor } from "./core/color";
import { getNumberFormat, type NumberFormat } from "./core/format";
import type { Curve } from "./core/path";
import { nice } from "./core/ticks";

export interface ComboSeries<T> {
  id: string;
  type: "bar" | "line" | "area";
  y: Accessor<T, number | null | undefined>;
  label?: string;
  color?: string;
  /** "left" (default) or "right". */
  axis?: "left" | "right";
  format?: NumberFormat;
  /** Lines: dashed (a plan, a forecast). */
  dashed?: boolean;
  curve?: Curve;
  hidden?: boolean;
}

export interface ComboAxis {
  /** Caption shown above the axis ("Signups"). */
  label?: string;
  format?: NumberFormat;
  min?: number;
  max?: number;
  tickCount?: number;
}

export interface ComboChartProps<T> extends Omit<ChartProps<T>, "children" | "stackOffset" | "xScale"> {
  series: readonly ComboSeries<T>[];
  leftAxis?: ComboAxis;
  rightAxis?: ComboAxis;
  /** Zero sits at the same height on both axes. Default true. */
  alignZero?: boolean;
  /** Stack the bars on each axis instead of grouping them. Default false. */
  stackBars?: boolean;
  /** Bar corner radius. Default 4. */
  radius?: number;
  /** Default "top". */
  legend?: "top" | "bottom" | "none";
  /** Default true. */
  grid?: boolean;
  /** Tooltip shows the change from the previous point. Default true. */
  showDelta?: boolean;
  xAxis?: XAxisProps;
  referenceLines?: readonly ReferenceLineProps[];
  children?: React.ReactNode;
}

const LEFT = "y";
const RIGHT = "right";

type Domain = [number, number];

/** Extent per axis of the visible series (bars from zero; stacked bars summed by sign). */
function axisExtent<T>(data: readonly T[], list: readonly ComboSeries<T>[], stacked: boolean): Domain | null {
  if (!list.length) return null;
  let lo = Infinity;
  let hi = -Infinity;
  let zero = false;
  const pos = new Array<number>(data.length).fill(0);
  const neg = new Array<number>(data.length).fill(0);
  for (const s of list) {
    if (s.type !== "line") zero = true;
    data.forEach((d, i) => {
      const v = Number(readAccessor(s.y, d, i));
      if (!Number.isFinite(v)) return;
      if (stacked && s.type === "bar") {
        if (v >= 0) pos[i] = (pos[i] as number) + v;
        else neg[i] = (neg[i] as number) + v;
        return;
      }
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    });
  }
  if (stacked) {
    for (let i = 0; i < data.length; i++) {
      hi = Math.max(hi, pos[i] as number);
      lo = Math.min(lo, neg[i] as number);
    }
  }
  if (!Number.isFinite(lo)) return null;
  if (zero || lo >= 0) lo = Math.min(lo, 0);
  if (zero || hi <= 0) hi = Math.max(hi, 0);
  if (lo === hi) hi = lo + 1;
  return [lo, hi];
}

/**
 * Stretches the axes so zero is at the same fraction of the height on each: the axis with the
 * largest negative-to-positive ratio sets the ratio for all.
 */
export function alignZeroDomains(domains: readonly Domain[]): Domain[] {
  const ratios = domains.map(([lo, hi]) => (hi > 0 ? Math.max(0, -lo) / hi : Infinity));
  const finite = ratios.filter(Number.isFinite);
  if (!finite.length) return domains.map((d) => [d[0], d[1]]);
  const k = Math.max(...finite);
  return domains.map(([lo, hi]) => {
    if (hi <= 0) return [lo, k > 0 ? -lo / k : 1];
    return [Math.min(lo, -k * hi), hi];
  });
}

function Swatch({ series }: { series: ResolvedSeries }) {
  if (series.kind === "line") {
    return (
      <span aria-hidden="true" className={cn(blockReset, "relative inline-flex h-2.5 w-3.5 shrink-0 items-center")}>
        <span className={cn(blockReset, "h-0.5 w-full rounded-pui-full")} style={{ background: series.color, opacity: series.dashed ? 0.7 : 1 }} />
        <span className={cn(blockReset, "absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pui-full")} style={{ background: series.color }} />
      </span>
    );
  }
  return <span aria-hidden="true" className={cn(blockReset, "size-2.5 shrink-0 rounded-[3px]", series.kind === "area" ? "opacity-60" : "")} style={{ background: series.color }} />;
}

function GroupedTooltip({ ctx, captions, showDelta, locale }: { ctx: ChartTooltipContext; captions: Record<string, string>; showDelta: boolean; locale: string }) {
  const groups = [LEFT, RIGHT]
    .map((axis) => ({ axis, rows: ctx.rows.filter((r) => r.series.yAxisId === axis) }))
    .filter((g) => g.rows.length);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  return (
    <div className={cn(blockReset, "flex min-w-44 flex-col gap-1.5")}>
      <div className={cn(blockReset, "text-[11px] font-semibold text-pui-muted-foreground")}>{ctx.title}</div>
      {groups.map((g, gi) => (
        <div key={g.axis} className={cn(blockReset, "flex flex-col gap-0.5", gi > 0 ? "border-t border-pui-chart-tooltip-border pt-1.5" : "")}>
          {groups.length > 1 ? (
            <div className={cn(blockReset, "text-[10px] font-medium uppercase tracking-wide text-pui-muted-foreground")}>
              {captions[g.axis] ?? (g.axis === LEFT ? "Left axis" : "Right axis")}
            </div>
          ) : null}
          {g.rows.map((row) => {
            const on = ctx.highlightedId === row.series.id;
            const up = (row.delta ?? 0) > 0;
            return (
              <div
                key={row.series.id}
                className={cn(blockReset, "-mx-1.5 flex items-center gap-2 rounded-pui-sm px-1.5 py-0.5 transition-colors", on ? "bg-pui-muted" : "", ctx.highlightedId && !on ? "opacity-60" : "")}
              >
                <Swatch series={row.series} />
                <span className={cn(blockReset, "min-w-0 flex-1 truncate text-xs")}>{row.series.label}</span>
                {showDelta && row.delta !== null && Math.abs(row.delta) >= 0.0005 ? (
                  <span className={cn(blockReset, "text-[10px] font-semibold tabular-nums", up ? "text-pui-success-text" : "text-pui-danger-text")}>
                    {up ? "\u25B2" : "\u25BC"} {pct.format(Math.abs(row.delta))}
                  </span>
                ) : null}
                <span className={cn(blockReset, "text-xs font-semibold tabular-nums")}>{row.formatted}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Colored axis captions between the legend and the plot. */
function AxisCaptions({ left, right, leftColor, rightColor }: { left?: string; right?: string; leftColor: string; rightColor: string }) {
  if (useChartLayer() !== "legend-top") return null;
  return (
    <div aria-hidden="true" className={cn(blockReset, "flex items-center justify-between gap-3 px-1 text-[11px] font-medium text-pui-muted-foreground")}>
      <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
        {left ? (
          <>
            <span className={cn(blockReset, "size-2 rounded-[2px]")} style={{ background: leftColor }} />
            {left}
          </>
        ) : null}
      </span>
      <span className={cn(blockReset, "inline-flex items-center gap-1.5")}>
        {right ? (
          <>
            {right}
            <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: rightColor }} />
          </>
        ) : null}
      </span>
    </div>
  );
}

function ComboChartInner<T>(
  {
    series,
    leftAxis,
    rightAxis,
    alignZero = true,
    stackBars = false,
    radius = 4,
    legend = "top",
    grid = true,
    showDelta = true,
    xAxis,
    referenceLines,
    children,
    data,
    hiddenSeries: hiddenProp,
    defaultHiddenSeries,
    onHiddenSeriesChange,
    locale = "en-US",
    className,
    ...rest
  }: ComboChartProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const [innerHidden, setInnerHidden] = React.useState<string[]>(() => defaultHiddenSeries ?? series.filter((s) => s.hidden).map((s) => s.id));
  const hidden = hiddenProp ?? innerHidden;
  const setHidden = (ids: string[]) => {
    if (hiddenProp === undefined) setInnerHidden(ids);
    onHiddenSeriesChange?.(ids);
  };
  const hasRight = series.some((s) => s.axis === "right");

  // Value domains (visible series only), niced, then aligned at zero.
  const domains = React.useMemo(() => {
    const visible = series.filter((s) => !hidden.includes(s.id));
    const sides = [
      { id: LEFT, cfg: leftAxis, ext: axisExtent(data, visible.filter((s) => s.axis !== "right"), stackBars) },
      { id: RIGHT, cfg: rightAxis, ext: hasRight ? axisExtent(data, visible.filter((s) => s.axis === "right"), stackBars) : null },
    ];
    const niced = sides.map(({ cfg, ext }) => {
      if (!ext) return null;
      const lo = cfg?.min ?? ext[0];
      const hi = cfg?.max ?? ext[1];
      const [nl, nh] = nice(lo, hi, cfg?.tickCount ?? 5);
      return [cfg?.min ?? nl, cfg?.max ?? nh] as Domain;
    });
    const present = niced.filter((d): d is Domain => d !== null);
    const aligned = alignZero && present.length > 1 && !sides.some((s) => s.cfg?.min !== undefined || s.cfg?.max !== undefined) ? alignZeroDomains(present) : present;
    const out: Record<string, Domain | undefined> = {};
    let k = 0;
    sides.forEach((s, i) => {
      if (niced[i]) out[s.id] = aligned[k++];
    });
    return out;
  }, [series, hidden, data, leftAxis, rightAxis, hasRight, alignZero, stackBars]);

  const captions: Record<string, string> = {};
  if (leftAxis?.label) captions[LEFT] = leftAxis.label;
  if (rightAxis?.label) captions[RIGHT] = rightAxis.label;
  const captionColor = (side: "left" | "right") => {
    const idx = series.findIndex((s) => (side === "right" ? s.axis === "right" : s.axis !== "right"));
    const s = series[idx];
    return s ? (s.color ?? categoricalColor(idx)) : "var(--pui-muted-foreground)";
  };
  const left = domains[LEFT];
  const right = domains[RIGHT];
  const showCaptions = !!(leftAxis?.label || (hasRight && rightAxis?.label));

  return (
      <Chart<T>
        ref={ref}
        data={data}
        xScale="band"
        locale={locale}
        stackOffset="none"
        hiddenSeries={hidden}
        onHiddenSeriesChange={setHidden}
        className={className}
        {...rest}
      >
        {legend !== "none" ? <ChartLegend position={legend} /> : null}
        {showCaptions ? <AxisCaptions left={leftAxis?.label} right={hasRight ? rightAxis?.label : undefined} leftColor={captionColor("left")} rightColor={captionColor("right")} /> : null}
        {grid ? <ChartGrid /> : null}
        <XAxis line={false} {...xAxis} />
        <YAxis format={leftAxis?.format} tickCount={leftAxis?.tickCount} min={left?.[0]} max={left?.[1]} />
        {hasRight ? <YAxis id={RIGHT} side="right" format={rightAxis?.format} tickCount={rightAxis?.tickCount} min={right?.[0]} max={right?.[1]} /> : null}
        {series.map((s) => {
          const axisId = s.axis === "right" ? RIGHT : LEFT;
          if (s.type === "bar") {
            return (
              <BarSeries<T>
                key={s.id}
                id={s.id}
                y={s.y}
                label={s.label}
                color={s.color}
                format={s.format ?? (s.axis === "right" ? rightAxis?.format : leftAxis?.format)}
                yAxisId={axisId}
                stack={stackBars ? `bars-${axisId}` : undefined}
                radius={radius}
              />
            );
          }
          if (s.type === "area") {
            return (
              <AreaSeries<T>
                key={s.id}
                id={s.id}
                y={s.y}
                label={s.label}
                color={s.color}
                format={s.format ?? (s.axis === "right" ? rightAxis?.format : leftAxis?.format)}
                yAxisId={axisId}
                curve={s.curve ?? "monotone"}
                fill="gradient"
              />
            );
          }
          return (
            <LineSeries<T>
              key={s.id}
              id={s.id}
              y={s.y}
              label={s.label}
              color={s.color}
              format={s.format ?? (s.axis === "right" ? rightAxis?.format : leftAxis?.format)}
              yAxisId={axisId}
              curve={s.curve ?? "monotone"}
              dashed={s.dashed}
              markers
              strokeWidth={2.25}
            />
          );
        })}
        {referenceLines?.map((l, i) => <ReferenceLine key={`l${i}`} {...l} />)}
        <ChartCrosshair />
        <ChartTooltip content={(ctx) => <GroupedTooltip ctx={ctx} captions={captions} showDelta={showDelta} locale={locale} />} />
        {children}
      </Chart>
  );
}

/**
 * Combo chart: bars, lines and areas on a shared band axis with dual value axes whose zeros line
 * up (`alignZero`), a tooltip grouped by axis, and every Chart kit interaction.
 */
export const ComboChart = React.forwardRef(ComboChartInner) as (<T>(props: ComboChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
ComboChart.displayName = "ComboChart";
