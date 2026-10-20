"use client";

// The composable chart kit: a <Chart> container plus series, axes, grid, tooltip, legend,
// crosshair and reference marks. Presets (LineChart, BarChart, AreaChart, ...) are built from the
// same parts, so anything they do can be rebuilt and extended by hand.
import type * as React from "react";
import { AreaSeries, BarSeries, LineSeries, type AreaSeriesProps, type BarSeriesProps, type LineSeriesProps } from "./core/cartesian-series";
import { Chart, type ChartProps } from "./core/cartesian";

export {
  Chart,
  useChart,
  useChartSeries,
  useChartState,
  type ChartAnnouncementContext,
  type ChartContextValue,
  type ChartProps,
  type TooltipMode,
} from "./core/cartesian";
export type { Accessor, CategorySort, XValue } from "./core/cartesian-model";
export {
  ChartAnnotation,
  ChartDataTable,
  ChartCrosshair,
  ChartGrid,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  type ChartAnnotationProps,
  type ChartCrosshairProps,
  type ChartDataTableProps,
  type ChartGridProps,
  type ChartTone,
  type ReferenceAreaProps,
  type ReferenceLineProps,
  type XAxisProps,
  type YAxisProps,
} from "./core/cartesian-parts";
export { AreaSeries, BarSeries, LineSeries, type AreaSeriesProps, type BarSeriesProps, type LineSeriesProps } from "./core/cartesian-series";
export { ChartLegend, ChartTooltip, type ChartLegendProps, type ChartTooltipContext, type ChartTooltipProps, type TooltipRow } from "./core/cartesian-tooltip";
export { ChartSyncGroup, type ChartSyncGroupProps } from "./core/sync";
export type { ChartItem, SelectionMode } from "./core/store";
export type { Curve } from "./core/path";
export type { DecimateMode } from "./core/decimate";
export { ChartPatterns, patternDash, patternFill } from "./core/patterns";

/** The kit with the row type bound, so column-name accessors autocomplete. Zero runtime cost. */
export function typedChart<T>() {
  return {
    Chart: Chart as (props: ChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement,
    LineSeries: LineSeries as (props: LineSeriesProps<T>) => React.ReactElement | null,
    AreaSeries: AreaSeries as (props: AreaSeriesProps<T>) => React.ReactElement | null,
    BarSeries: BarSeries as (props: BarSeriesProps<T>) => React.ReactElement | null,
  };
}
