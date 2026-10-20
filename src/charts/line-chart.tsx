"use client";

import * as React from "react";
import { Chart, type ChartProps } from "./core/cartesian";
import type { Accessor } from "./core/cartesian-model";
import {
  ChartAnnotation,
  ChartCrosshair,
  ChartDirectLabels,
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
import { LineSeries } from "./core/cartesian-series";
import { ChartLegend, ChartTooltip } from "./core/cartesian-tooltip";
import { estimateTextWidth, type NumberFormat } from "./core/format";
import type { Curve } from "./core/path";
import type { DecimateMode } from "./core/decimate";
import type { ChartPattern } from "./core/color";

export interface LineChartSeries<T> {
  id: string;
  y: Accessor<T, number | null | undefined>;
  label?: string;
  color?: string;
  curve?: Curve;
  dashed?: boolean;
  format?: NumberFormat;
  /** "right" plots against the right axis (see `rightAxis`). Default "y". */
  yAxisId?: string;
  /** Gradient fill under this line. */
  area?: boolean;
  strokeWidth?: number;
  /** Start hidden (toggle it back on from the legend). */
  hidden?: boolean;
  /** Dash rhythm as a redundant encoding (see `patterns`). */
  pattern?: ChartPattern;
}

export interface LineChartProps<T> extends Omit<ChartProps<T>, "children" | "stackOffset" | "barGap"> {
  series: readonly LineChartSeries<T>[];
  /** Default "monotone". */
  curve?: Curve;
  /** Point markers: always, never, or "auto" (24 points or fewer). Default "auto". */
  markers?: boolean | "auto";
  /** Gradient fill under every line. Default false. */
  area?: boolean;
  /** Soft glow under each stroke. Default false. */
  glow?: boolean;
  connectNulls?: boolean;
  /** Default "top"; "none" hides it. */
  legend?: "top" | "bottom" | "none";
  /** Horizontal grid lines. Default true. */
  grid?: boolean;
  /** Also draw a horizontal crosshair line with a value pill. Default false. */
  crosshairY?: boolean;
  /** Tooltip shows the change from the previous point. Default true. */
  showDelta?: boolean;
  yAxis?: Omit<YAxisProps, "id" | "side">;
  /** Adds a right axis with id "right". */
  rightAxis?: Omit<YAxisProps, "id" | "side">;
  xAxis?: XAxisProps;
  referenceLines?: readonly ReferenceLineProps[];
  referenceAreas?: readonly ReferenceAreaProps[];
  /** Label each line at its end. Default false. */
  directLabels?: boolean;
  /** Callouts pinned to points or x values (launches, incidents, records). */
  annotations?: readonly ChartAnnotationProps[];
  /** Downsample big series to about two points per pixel. Default "auto". */
  decimate?: DecimateMode;
  /** Extra chart parts (annotations, more reference marks). */
  children?: React.ReactNode;
}

function LineChartInner<T>(
  {
    series,
    curve = "monotone",
    markers = "auto",
    area = false,
    glow = false,
    connectNulls,
    legend = "top",
    grid = true,
    crosshairY = false,
    showDelta = true,
    yAxis,
    rightAxis,
    xAxis,
    referenceLines,
    referenceAreas,
    directLabels = false,
    annotations,
    decimate = "auto",
    children,
    margin,
    ...rest
  }: LineChartProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const labelRoom = directLabels ? Math.min(140, Math.max(0, ...series.map((s) => estimateTextWidth(s.label ?? s.id, 11))) + 18) : undefined;
  return (
    <Chart<T> ref={ref} margin={labelRoom ? { right: labelRoom, ...margin } : margin} {...rest}>
      {legend !== "none" ? <ChartLegend position={legend} /> : null}
      {grid ? <ChartGrid /> : null}
      {referenceAreas?.map((a, i) => <ReferenceArea key={`a${i}`} {...a} />)}
      <XAxis {...xAxis} />
      <YAxis {...yAxis} />
      {rightAxis ? <YAxis id="right" side="right" {...rightAxis} /> : null}
      {series.map((s) => (
        <LineSeries<T>
          key={s.id}
          id={s.id}
          y={s.y}
          label={s.label}
          color={s.color}
          curve={s.curve ?? curve}
          dashed={s.dashed}
          format={s.format}
          yAxisId={s.yAxisId}
          hidden={s.hidden}
          strokeWidth={s.strokeWidth}
          area={s.area ?? area}
          glow={glow}
          markers={markers}
          connectNulls={connectNulls}
          pattern={s.pattern}
          decimate={decimate}
        />
      ))}
      {referenceLines?.map((l, i) => <ReferenceLine key={`l${i}`} {...l} />)}
      {directLabels ? <ChartDirectLabels /> : null}
      {annotations?.map((a, i) => <ChartAnnotation key={`n${i}`} {...a} />)}
      <ChartCrosshair y={crosshairY} />
      <ChartTooltip showDelta={showDelta} />
      {children}
    </Chart>
  );
}

/**
 * Line chart preset: monotone curves, snapping crosshair, rich tooltip with deltas, legend
 * toggles, keyboard exploration, and animated data updates.
 */
export const LineChart = React.forwardRef(LineChartInner) as (<T>(props: LineChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
LineChart.displayName = "LineChart";
