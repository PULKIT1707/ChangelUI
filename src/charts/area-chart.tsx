"use client";

import * as React from "react";
import { Chart, type ChartProps } from "./core/cartesian";
import type { Accessor } from "./core/cartesian-model";
import {
  ChartAnnotation,
  ChartCrosshair,
  ChartGrid,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  type ChartAnnotationProps,
  type ReferenceAreaProps,
  type ReferenceLineProps,
  type XAxisProps,
  type YAxisProps,
} from "./core/cartesian-parts";
import { AreaSeries } from "./core/cartesian-series";
import { ChartLegend, ChartTooltip } from "./core/cartesian-tooltip";
import type { NumberFormat } from "./core/format";
import type { Curve } from "./core/path";
import type { ChartPattern } from "./core/color";

export interface AreaChartSeries<T> {
  id: string;
  y: Accessor<T, number | null | undefined>;
  label?: string;
  color?: string;
  format?: NumberFormat;
  hidden?: boolean;
  /**
   * Lower edge: makes this series a range band from y0 to y (min/max envelope, forecast interval).
   * Range bands never stack.
   */
  y0?: Accessor<T, number | null | undefined>;
  /** Fill pattern as a redundant encoding (see `patterns`). */
  pattern?: ChartPattern;
}

export interface AreaChartProps<T> extends Omit<ChartProps<T>, "children" | "stackOffset" | "barGap" | "layout"> {
  series: readonly AreaChartSeries<T>[];
  /** "none" overlaps the areas, "stack" piles them up, "expand" shows shares of 100%. Default "none". */
  stack?: "none" | "stack" | "expand";
  /** Default "gradient". */
  fill?: "gradient" | "solid";
  /** Default "monotone". */
  curve?: Curve;
  /** Outline width (0 hides it). Default 2. */
  strokeWidth?: number;
  connectNulls?: boolean;
  /** Default "top"; "none" hides it. */
  legend?: "top" | "bottom" | "none";
  /** Default true. */
  grid?: boolean;
  /** Tooltip shows the change from the previous point. Default false. */
  showDelta?: boolean;
  yAxis?: Omit<YAxisProps, "id" | "side">;
  xAxis?: XAxisProps;
  referenceLines?: readonly ReferenceLineProps[];
  referenceAreas?: readonly ReferenceAreaProps[];
  /** Callouts pinned to points or x values. */
  annotations?: readonly ChartAnnotationProps[];
  children?: React.ReactNode;
}

function AreaChartInner<T>(
  {
    series,
    stack = "none",
    fill = "gradient",
    curve = "monotone",
    strokeWidth = 2,
    connectNulls,
    legend = "top",
    grid = true,
    showDelta = false,
    yAxis,
    xAxis,
    referenceLines,
    referenceAreas,
    annotations,
    children,
    ...rest
  }: AreaChartProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const stacked = stack !== "none";
  return (
    <Chart<T> ref={ref} stackOffset={stack === "expand" ? "expand" : "none"} {...rest}>
      {legend !== "none" ? <ChartLegend position={legend} /> : null}
      {grid ? <ChartGrid /> : null}
      {referenceAreas?.map((a, i) => <ReferenceArea key={`a${i}`} {...a} />)}
      <XAxis {...xAxis} />
      <YAxis {...yAxis} />
      {series.map((s) => (
        <AreaSeries<T>
          key={s.id}
          id={s.id}
          y={s.y}
          label={s.label}
          color={s.color}
          format={s.format}
          hidden={s.hidden}
          stack={stacked && !s.y0 ? "total" : undefined}
          y0={s.y0}
          pattern={s.pattern}
          curve={curve}
          fill={fill}
          strokeWidth={s.y0 ? undefined : strokeWidth}
          connectNulls={connectNulls}
        />
      ))}
      {referenceLines?.map((l, i) => <ReferenceLine key={`l${i}`} {...l} />)}
      {annotations?.map((a, i) => <ChartAnnotation key={`n${i}`} {...a} />)}
      <ChartCrosshair />
      <ChartTooltip showDelta={showDelta} />
      {children}
    </Chart>
  );
}

/**
 * Area chart preset: overlapping, stacked or 100% areas. Hovering a stacked layer isolates it,
 * and legend toggles collapse a layer so its neighbors re-flow smoothly.
 */
export const AreaChart = React.forwardRef(AreaChartInner) as (<T>(props: AreaChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
AreaChart.displayName = "AreaChart";
