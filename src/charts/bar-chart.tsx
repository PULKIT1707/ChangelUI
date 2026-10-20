"use client";

import * as React from "react";
import { Chart, type ChartProps } from "./core/cartesian";
import type { Accessor } from "./core/cartesian-model";
import {
  ChartCrosshair,
  ChartGrid,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  type ReferenceAreaProps,
  type ReferenceLineProps,
  type XAxisProps,
  type YAxisProps,
} from "./core/cartesian-parts";
import { BarSeries } from "./core/cartesian-series";
import { useChartLayer } from "./core/cartesian";
import { readAccessor } from "./core/cartesian-model";
import { ChartBreadcrumb, focusChartOverlay, useDrillStack, type BreadcrumbItem } from "./core/drill";
import { mergeRefs } from "../lib/compose";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { ChartLegend, ChartTooltip } from "./core/cartesian-tooltip";
import { formatNumber, type NumberFormat } from "./core/format";
import type { ChartPattern } from "./core/color";

export interface BarChartSeries<T> {
  id: string;
  y: Accessor<T, number | null | undefined>;
  label?: string;
  color?: string;
  format?: NumberFormat;
  hidden?: boolean;
  /** Fill pattern as a redundant encoding (see `patterns`). */
  pattern?: ChartPattern;
}

export interface BarChartDrill<T> {
  /** Child rows of a category; categories with children open into them on click or Enter. */
  children: (datum: T, index: number) => readonly T[] | null | undefined;
  /** Breadcrumb label of an opened category. Default: its x value. */
  label?: (datum: T, index: number) => string;
  /** First breadcrumb. Default "All". */
  rootLabel?: string;
  /** Called with the breadcrumb labels below the root after every drill. */
  onDrillChange?: (path: string[]) => void;
}

export type BarChartMode = "grouped" | "stacked" | "expand" | "diverging" | "butterfly";

export interface BarChartProps<T> extends Omit<ChartProps<T>, "children" | "stackOffset" | "xScale"> {
  series: readonly BarChartSeries<T>[];
  /**
   * "grouped" side by side, "stacked" piles, "expand" 100% stacks, "diverging" stacks positives up
   * and negatives down from zero, "butterfly" puts the first two series back to back (a population
   * pyramid) on a horizontal layout. Default "grouped".
   */
  mode?: BarChartMode;
  /** Order categories by their visible total; legend toggles re-rank with a slide. Default "none". */
  sort?: "none" | "asc" | "desc";
  /** Corner radius of the value end. Default 4. */
  radius?: number;
  /** Print values at the bar ends. Default false. */
  valueLabels?: boolean;
  /** Default "top" when there are 2+ series, else "none". */
  legend?: "top" | "bottom" | "none";
  /** Default true. */
  grid?: boolean;
  /** Tooltip mode: "axis" lists every series in the category; "item" only the hovered bar. Default "axis". */
  tooltip?: ChartProps<T>["tooltip"];
  showDelta?: boolean;
  yAxis?: Omit<YAxisProps, "id" | "side">;
  xAxis?: XAxisProps;
  referenceLines?: readonly ReferenceLineProps[];
  referenceAreas?: readonly ReferenceAreaProps[];
  /**
   * Drill-down: click or Enter on a category opens its children (the bars regrow), Escape or
   * Backspace goes up a level, and a breadcrumb above the chart shows the path.
   */
  drill?: BarChartDrill<T>;
  children?: React.ReactNode;
}

function BarChartBaseInner<T>(
  {
    series,
    mode = "grouped",
    radius = 4,
    valueLabels = false,
    legend,
    grid = true,
    showDelta = false,
    yAxis,
    xAxis,
    referenceLines,
    referenceAreas,
    children,
    selectionMode = "single",
    locale = "en-US",
    layout,
    margin,
    ...rest
  }: BarChartProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const butterfly = mode === "butterfly";
  const stacked = mode !== "grouped";
  const legendPosition = legend ?? (series.length > 1 ? "top" : "none");
  // Butterfly: the first series grows left (negated), and every label shows magnitudes.
  const shown = React.useMemo(() => {
    if (!butterfly) return series;
    return series.slice(0, 2).map((s, k) => {
      const abs = (v: number) => formatNumber(Math.abs(v), s.format ?? { maximumFractionDigits: 2 }, locale);
      if (k > 0) return { ...s, format: abs };
      const y = s.y;
      const negated = (d: T, i: number) => {
        const v = typeof y === "function" ? y(d, i) : ((d as Record<string, unknown>)[y] as number | null | undefined);
        return typeof v === "number" ? -v : v;
      };
      return { ...s, y: negated, format: abs };
    });
  }, [butterfly, series, locale]);
  // A symmetric value axis keeps the center line in the middle and leaves room for labels.
  const data = rest.data;
  const reach = React.useMemo(() => {
    if (!butterfly) return null;
    let peak = 0;
    shown.forEach((s) => {
      data.forEach((d, i) => {
        const v = typeof s.y === "function" ? s.y(d, i) : ((d as Record<string, unknown>)[s.y] as number | null | undefined);
        if (typeof v === "number" && Number.isFinite(v)) peak = Math.max(peak, Math.abs(v));
      });
    });
    return peak > 0 ? peak * (valueLabels ? 1.22 : 1.05) : null;
  }, [butterfly, shown, data, valueLabels]);
  const axisFormat = yAxis?.format;
  const butterflyAxis = React.useMemo(
    () => (butterfly ? (v: number) => formatNumber(Math.abs(v), typeof axisFormat === "object" ? axisFormat : { notation: "compact", maximumFractionDigits: 1 }, locale) : undefined),
    [butterfly, axisFormat, locale],
  );
  return (
    <Chart<T>
      ref={ref}
      xScale="band"
      layout={butterfly ? "horizontal" : layout}
      // Horizontal value labels sit past the bar ends: leave room for them.
      margin={valueLabels && (butterfly || layout === "horizontal") ? { right: 44, ...margin } : margin}
      locale={locale}
      stackOffset={mode === "expand" ? "expand" : mode === "diverging" || butterfly ? "diverging" : "none"}
      selectionMode={selectionMode}
      {...rest}
    >
      {legendPosition !== "none" ? <ChartLegend position={legendPosition} /> : null}
      {grid ? <ChartGrid /> : null}
      {referenceAreas?.map((a, i) => <ReferenceArea key={`a${i}`} {...a} />)}
      <XAxis line={false} {...xAxis} />
      <YAxis {...yAxis} min={yAxis?.min ?? (reach ? -reach : undefined)} max={yAxis?.max ?? (reach ?? undefined)} format={butterflyAxis ?? yAxis?.format} />
      {shown.map((s) => (
        <BarSeries<T>
          key={s.id}
          id={s.id}
          y={s.y}
          label={s.label}
          color={s.color}
          format={s.format}
          hidden={s.hidden}
          pattern={s.pattern}
          stack={stacked ? "total" : undefined}
          radius={radius}
          valueLabels={valueLabels}
        />
      ))}
      {referenceLines?.map((l, i) => <ReferenceLine key={`l${i}`} {...l} />)}
      <ChartCrosshair />
      <ChartTooltip showDelta={showDelta} showTotal={butterfly ? false : "auto"} />
      {children}
    </Chart>
  );
}

const BarChartBase = React.forwardRef(BarChartBaseInner) as <T>(props: Omit<BarChartProps<T>, "drill"> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement;

/** The breadcrumb, rendered in the chart's top legend slot. */
function DrillCrumbs({ items, onNavigate }: { items: BreadcrumbItem[]; onNavigate: (index: number) => void }) {
  const layer = useChartLayer();
  const reducedMotion = usePrefersReducedMotion();
  if (layer !== "legend-top") return null;
  return <ChartBreadcrumb items={items} onNavigate={onNavigate} reducedMotion={reducedMotion} />;
}

function DrillBarChart<T>({ drill, forwardedRef, ...props }: BarChartProps<T> & { drill: BarChartDrill<T>; forwardedRef: React.ForwardedRef<HTMLElement> }) {
  const { data, onItemClick, onKeyDown, children, x } = props;
  const stack = useDrillStack(data, drill.rootLabel ?? "All");
  const figureRef = React.useRef<HTMLElement>(null);
  const ref = React.useMemo(() => mergeRefs(forwardedRef, figureRef), [forwardedRef]);
  const viaKeyboard = React.useRef(false);
  const { onDrillChange } = drill;
  const labels = stack.crumbs.slice(1).map((c) => c.label).join("\u0000");
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onDrillChange?.(labels ? labels.split("\u0000") : []);
    if (viaKeyboard.current) focusChartOverlay(figureRef.current);
    viaKeyboard.current = false;
  }, [labels, onDrillChange]);
  return (
    <BarChartBase<T>
      key={stack.key}
      ref={ref}
      {...props}
      data={stack.data}
      onItemClick={(item, datum, event) => {
        onItemClick?.(item, datum, event);
        const kids = drill.children(datum, item.index);
        if (!kids?.length) return;
        viaKeyboard.current = event.type === "keydown";
        stack.push(drill.label?.(datum, item.index) ?? String(readAccessor(x, datum, item.index)), kids);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || !stack.level || (event.key !== "Escape" && event.key !== "Backspace")) return;
        event.preventDefault();
        viaKeyboard.current = true;
        stack.goTo(stack.level - 1);
      }}
    >
      {children}
      <DrillCrumbs items={stack.crumbs} onNavigate={stack.goTo} />
    </BarChartBase>
  );
}

function BarChartInner<T>({ drill, ...props }: BarChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  if (drill) return <DrillBarChart<T> {...props} drill={drill} forwardedRef={ref} />;
  return <BarChartBase<T> ref={ref} {...props} />;
}

/**
 * Bar chart preset: grouped, stacked, 100% or diverging bars, vertical or horizontal
 * (`layout="horizontal"`), with rounded value ends, a band cursor, click-to-select and value labels.
 */
export const BarChart = React.forwardRef(BarChartInner) as (<T>(props: BarChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
BarChart.displayName = "BarChart";
