// Server-safe chart math (no "use client", no React): scales, ticks, formatters, path generators,
// layouts, statistics, decimation, label placement and plain-language summaries. The same code
// powers every ChangelUI chart, and it runs anywhere: React Server Components, Node scripts that
// render OG images, e-mails or PDFs, canvas renderers, and other chart libraries.

export {
  scaleBand,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scalePow,
  scaleQuantize,
  scaleSqrt,
  scaleSymlog,
  scaleTime,
  scaleUtc,
  type BandOptions,
  type BandScale,
  type ContinuousKind,
  type ContinuousOptions,
  type ContinuousScale,
  type OrdinalScale,
  type QuantizeScale,
} from "./core/scale";
export {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  WEEK,
  logTicks,
  nice,
  niceTime,
  pickTimeInterval,
  tickIncrement,
  tickStep,
  ticks,
  timeInterval,
  timeTicks,
  type TimeInterval,
  type TimeOptions,
  type TimeTicks,
  type TimeUnit,
} from "./core/ticks";
export {
  estimateTextWidth,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  getDateFormat,
  getNumberFormat,
  multiTimeFormat,
  tickFormat,
  timeTickFormat,
  type DateFormat,
  type NumberFormat,
} from "./core/format";
export {
  PathBuilder,
  arcCentroid,
  arcPath,
  areaPath,
  areaToBaseline,
  linePath,
  polar,
  radialLinePath,
  ribbonPath,
  roundedBarPath,
  roundedRectPath,
  type ArcOptions,
  type AreaPoint,
  type BarEnd,
  type Corners,
  type Curve,
  type PathOptions,
  type Point,
  type RadialOptions,
  type RibbonOptions,
} from "./core/path";
export { pie, mergeSmallSlices, type PieOptions, type PieSlice, type PieSort } from "./core/pie";
export { stack, stackOrder, stackTotals, type StackBand, type StackOffset, type StackOptions, type StackOrder, type StackResult } from "./core/stack";
export {
  bin,
  bollinger,
  boxStats,
  deviation,
  ema,
  extent,
  finite,
  kde,
  linearRegression,
  mad,
  mean,
  median,
  quantile,
  quantileSorted,
  silvermanBandwidth,
  sma,
  sum,
  thresholdFreedmanDiaconis,
  thresholdSturges,
  variance,
  type Bin,
  type BinOptions,
  type BollingerBands,
  type BoxStats,
  type KdeOptions,
  type Regression,
} from "./core/stats";
export { decimate, lttb, minMaxPerPixel, type DecimateMode } from "./core/decimate";
export { describePoint, summarizeChart, summarizeSeries, ENGLISH_PHRASES, type PointDescription, type SummaryOptions, type SummaryPhrases, type SummarySeries } from "./core/summary";
export { anomalies, changePoints, crossings, detectInsights, extremes, streaks, type Insight, type InsightOptions } from "./core/insights";
export {
  ancestors,
  descendants,
  eachAfter,
  eachBefore,
  findNode,
  fromNested,
  leaves,
  partition,
  sortHierarchy,
  stratify,
  sumHierarchy,
  tileBinary,
  tileDice,
  tileSlice,
  tileSliceDice,
  tileSquarify,
  treemap,
  type HierarchyNode,
  type PartitionOptions,
  type Tile,
  type TreemapOptions,
} from "./core/hierarchy";
export { sankeyLayout, type SankeyAlign, type SankeyGraph, type SankeyLink, type SankeyNode, type SankeyOptions } from "./core/sankey";
export { createForceSimulation, type ForceLinkInput, type ForceNodeInput, type ForceOptions, type ForceSimulation, type SimLink, type SimNode } from "./core/force";
export { dodge, type DodgeOptions, type DodgeSide } from "./core/dodge";
export { alignPolygon, arcPolygon, circlePolygon, interpolatePolygon, morphPair, polygonArea, polygonCentroid, polygonLength, polygonPath, rectPolygon, resamplePolygon, type Polygon } from "./core/polygon";
export { dodgeLabels, placeLabels, type DodgeLabel, type Placement, type PlacementLabel } from "./core/label-layout";
export { categoricalColor, divergingColor, sequentialColor, sequentialColors, trendColor, withOpacity, CHART_PATTERNS, type ChartPattern } from "./core/color";
export { GridIndex, bisectLeft, bisectRight, nearestIndex } from "./core/spatial";
export { brushDomain, clampDomain, isZoomed, keyboardPan, keyboardZoom, panBy, pinchFactor, rubberBand, wheelZoomFactor, zoomAround, type ZoomLimits } from "./core/zoom";
