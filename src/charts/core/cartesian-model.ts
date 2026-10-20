// Cartesian layout model: turns rows, accessors and the declared series/axes into pixel geometry.
// Pure (no React), so the server and the client compute the same chart, and every mark reads one
// precomputed Float64Array per series (stable identity until the inputs change, which is what
// useDataTween keys on).
import { categoricalColor, CHART_PATTERNS, type ChartPattern } from "./color";
import { estimateTextWidth, formatDate, formatNumber, getNumberFormat, multiTimeFormat, tickFormat, type NumberFormat } from "./format";
import type { Curve } from "./path";
import { scaleBand, scaleLinear, scaleUtc, type BandScale, type ContinuousScale } from "./scale";
import { nearestIndex } from "./spatial";
import { stack, type StackOffset } from "./stack";
import { timeTicks } from "./ticks";

export type XValue = number | Date | string;
/** A column name or a function that reads the value from a row. */
export type Accessor<T, V> = (keyof T & string) | ((datum: T, index: number) => V);
export type SeriesKind = "line" | "area" | "bar";
export type XScaleKind = "band" | "time" | "linear";
export type ChartLayout = "vertical" | "horizontal";
/** Category order on band axes: data order, or sorted by the visible total. */
export type CategorySort = "none" | "asc" | "desc";

export function readAccessor<T, V>(accessor: Accessor<T, V>, datum: T, index: number): V {
  return typeof accessor === "function" ? accessor(datum, index) : ((datum as Record<string, unknown>)[accessor] as V);
}

/** What a series element declares (read statically from the Chart's children). */
export interface SeriesSpec {
  kind: SeriesKind;
  id: string;
  y: Accessor<never, number | null | undefined>;
  /** Areas: the lower edge (a range band from y0 to y) instead of the baseline. */
  y0?: Accessor<never, number | null | undefined>;
  label?: string;
  color?: string;
  yAxisId?: string;
  stack?: string;
  format?: NumberFormat;
  curve?: Curve;
  dashed?: boolean;
  /** Redundant encoding (see CHART_PATTERNS); overrides the chart's `patterns` cycle. */
  pattern?: ChartPattern;
  /** Initially hidden (uncontrolled legend state). */
  hidden?: boolean;
}

export interface YAxisSpec {
  id: string;
  side: "left" | "right";
  min?: number;
  max?: number;
  includeZero?: boolean;
  format?: NumberFormat;
  tickCount?: number;
  /** Rendered (an axis can exist only to scale a series). */
  visible: boolean;
  width?: number;
}

export interface XAxisSpec {
  format?: Intl.DateTimeFormatOptions | Intl.NumberFormatOptions | ((value: XValue) => string);
  tickCount?: number;
  visible: boolean;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Tick {
  value: number;
  /** Position along the axis in plot px. */
  pos: number;
  label: string;
  /** Stable key for enter/exit animation. */
  key: string;
}

export interface ResolvedSeries extends Omit<SeriesSpec, "y" | "y0" | "pattern"> {
  label: string;
  color: string;
  yAxisId: string;
  /** Position among all series (palette order). */
  index: number;
  hidden: boolean;
  /** Raw values (null for gaps). */
  values: Array<number | null>;
  /** Range areas: the lower edge per point (null when the series is not a range). */
  lows: Array<number | null> | null;
  /** Resolved redundant encoding, or null. */
  pattern: Exclude<ChartPattern, "none"> | null;
  /** Stacked [lower, upper] in data units (lower = baseline when not stacked). */
  bands: Array<[number, number]> | null;
  /**
   * Plot-space geometry, flattened: line [c, v] pairs, area [c, top, base] triples, bar
   * [x, y, w, h] quads (already oriented for the layout).
   */
  geometry: Float64Array;
  /** Bars: the outermost segment of its stack at each point (gets the rounded end). */
  outer?: boolean[];
}

export interface CartesianModel {
  n: number;
  width: number;
  height: number;
  margin: Margin;
  plotW: number;
  plotH: number;
  layout: ChartLayout;
  xKind: XScaleKind;
  xValues: XValue[];
  /** Numeric x (epoch ms, numbers, or the index for band scales). */
  xNum: number[];
  /** Center of point i along the category axis, plot px. */
  catPos: (i: number) => number;
  /** Band width (0 for continuous x). */
  bandwidth: number;
  /** Category-axis length in px. */
  catLength: number;
  /** Value-axis length in px. */
  valueLength: number;
  /** Nearest point index for a category-axis pixel. */
  indexAt: (px: number) => number;
  /** Band axes with a sort: data index per visual slot, and the slot of each data index. */
  order: number[] | null;
  rank: number[] | null;
  /** Category-axis pixel for an arbitrary x value (NaN when it is not on the axis). */
  catValue: (x: XValue) => number;
  catTicks: Tick[];
  yScales: Record<string, ContinuousScale>;
  yTicks: Record<string, Tick[]>;
  yAxes: YAxisSpec[];
  xAxis: XAxisSpec | null;
  series: ResolvedSeries[];
  stackOffset: StackOffset;
  /** Full-precision x label (tooltip heading, announcements, data table). */
  formatX: (i: number) => string;
  /** Full-precision label for any numeric x (epoch ms on time axes; an index on band axes). */
  formatXValue: (value: number) => string;
  /** Value label for a series. */
  formatValue: (series: ResolvedSeries, value: number) => string;
  /** Short tick-style label for a value axis. */
  formatAxisValue: (axisId: string, value: number) => string;
  hasBars: boolean;
}

export interface ModelInput<T> {
  data: readonly T[];
  x: Accessor<T, XValue>;
  xScale: "auto" | XScaleKind;
  layout: ChartLayout;
  width: number;
  height: number;
  margin?: Partial<Margin>;
  series: readonly SeriesSpec[];
  yAxes: readonly YAxisSpec[];
  xAxis: XAxisSpec | null;
  hidden: readonly string[];
  stackOffset: StackOffset;
  /** Band padding between categories, 0..1. */
  barGap: number;
  locale: string;
  timeZone: string;
  xDomain: readonly [number, number] | null;
  /** With an xDomain (zoom), fit the value axes to the points inside the window. Default false. */
  fitY?: boolean;
  formatX?: (value: XValue) => string;
  /** Band axes: order categories by their visible total. Default "none". */
  sort?: CategorySort;
  /** Assign CHART_PATTERNS to series by order. Default false. */
  patterns?: boolean;
}

const FONT = 11;
const DEFAULT_AXIS = "y";

function formatXValue(value: XValue, kind: XScaleKind, spec: XAxisSpec | null, locale: string, timeZone: string, long: boolean): string {
  const f = spec?.format;
  if (typeof f === "function") return f(value);
  if (kind === "band") return String(value instanceof Date ? formatDate(value, { dateStyle: "medium" }, locale, timeZone) : value);
  if (kind === "time") {
    const opts = (f as Intl.DateTimeFormatOptions | undefined) ?? (long ? { dateStyle: "medium" } : { month: "short", day: "numeric" });
    return formatDate(+value, opts, locale, timeZone);
  }
  return formatNumber(+value, (f as Intl.NumberFormatOptions | undefined) ?? { maximumFractionDigits: 2 }, locale);
}

/** Builds every scale, tick and geometry array for one render. */
export function buildCartesianModel<T>(input: ModelInput<T>): CartesianModel {
  const { data, layout, width, height, locale, timeZone, stackOffset } = input;
  const horizontal = layout === "horizontal";
  const n = data.length;
  const xValues = data.map((d, i) => readAccessor(input.x, d, i));
  const hasBars = input.series.some((s) => s.kind === "bar");
  const first = xValues.find((v) => v !== null && v !== undefined);
  const xKind: XScaleKind =
    input.xScale !== "auto"
      ? input.xScale
      : hasBars || typeof first === "string" || first === undefined
        ? "band"
        : first instanceof Date
          ? "time"
          : "linear";
  const xNum = xValues.map((v, i) => (xKind === "band" ? i : +(v as number | Date)));

  // Series values and stacks.
  const hidden = new Set(input.hidden);
  const resolved: ResolvedSeries[] = input.series.map((spec, index) => {
    const values = data.map((d, i) => {
      const v = readAccessor(spec.y as Accessor<T, number | null | undefined>, d, i);
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    });
    const y0 = spec.kind === "area" && spec.stack === undefined ? spec.y0 : undefined;
    const lows = y0
      ? data.map((d, i) => {
          const v = readAccessor(y0 as Accessor<T, number | null | undefined>, d, i);
          return typeof v === "number" && Number.isFinite(v) ? v : null;
        })
      : null;
    const pattern = spec.pattern ?? (input.patterns ? (CHART_PATTERNS[index % CHART_PATTERNS.length] ?? null) : null);
    const { y: _y, y0: _y0, pattern: _pattern, ...rest } = spec;
    void _y;
    void _y0;
    void _pattern;
    return {
      ...rest,
      lows,
      pattern: pattern === "none" ? null : pattern,
      label: spec.label ?? spec.id,
      color: spec.color ?? categoricalColor(index),
      yAxisId: spec.yAxisId ?? DEFAULT_AXIS,
      index,
      hidden: hidden.has(spec.id),
      values,
      bands: null,
      geometry: new Float64Array(0),
    };
  });

  const groups = new Map<string, ResolvedSeries[]>();
  for (const s of resolved) {
    if (s.stack === undefined) continue;
    const key = `${s.yAxisId}\u0000${s.stack}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  for (const members of groups.values()) {
    // Hidden series stack as zeros, so neighbors re-flow smoothly instead of jumping.
    const result = stack(
      members.map((s) => (s.hidden ? s.values.map(() => 0) : s.values)),
      { offset: stackOffset === "none" ? "none" : stackOffset },
    );
    members.forEach((s, k) => {
      s.bands = (result.bands[k] ?? []).map((b, i) => (s.values[i] === null && !s.hidden ? [Number.NaN, Number.NaN] : [b[0], b[1]]));
    });
  }
  for (const s of resolved) {
    if (s.bands || s.kind === "line") continue;
    const lows = s.lows;
    if (lows) {
      // Range band: hidden collapses onto the midline, so a legend toggle shrinks it in place.
      s.bands = s.values.map((v, i) => {
        const lo = lows[i];
        if (v === null || lo === null || lo === undefined) return [Number.NaN, Number.NaN];
        const mid = (v + lo) / 2;
        return s.hidden ? [mid, mid] : [lo, v];
      });
      continue;
    }
    s.bands = s.values.map((v) => (v === null ? [Number.NaN, Number.NaN] : [0, s.hidden ? 0 : v]));
  }

  // Category sort (band axes): by the visible total, so legend toggles re-rank too.
  let order: number[] | null = null;
  let rank: number[] | null = null;
  if (input.sort && input.sort !== "none" && n > 1) {
    const totals = xValues.map((_, i) => resolved.reduce((a, s) => (s.hidden ? a : a + (s.values[i] ?? 0)), 0));
    const dir = input.sort === "asc" ? 1 : -1;
    const sorted = totals.map((_, i) => i).sort((a, b) => dir * ((totals[a] as number) - (totals[b] as number)) || a - b);
    const ranks = new Array<number>(n);
    sorted.forEach((i, k) => {
      ranks[i] = k;
    });
    order = sorted;
    rank = ranks;
  }

  // Value domains per axis.
  const axisSpecs: YAxisSpec[] = [...input.yAxes];
  for (const s of resolved) {
    if (!axisSpecs.some((a) => a.id === s.yAxisId)) axisSpecs.push({ id: s.yAxisId, side: "left", visible: false });
  }
  if (!axisSpecs.length) axisSpecs.push({ id: DEFAULT_AXIS, side: "left", visible: false });
  const expand = stackOffset === "expand";
  // Zoomed: only points inside the window (plus one neighbor each side, so edges stay in view).
  const win = input.fitY && input.xDomain && xKind !== "band" ? input.xDomain : null;
  const inWindow = (i: number) => {
    if (!win) return true;
    const v = xNum[i] as number;
    if (v >= win[0] && v <= win[1]) return true;
    const after = xNum[i + 1];
    const before = xNum[i - 1];
    return (v < win[0] && after !== undefined && after >= win[0]) || (v > win[1] && before !== undefined && before <= win[1]);
  };
  const domains: Record<string, [number, number]> = {};
  for (const axis of axisSpecs) {
    let lo = Infinity;
    let hi = -Infinity;
    let wantsZero = false;
    for (const s of resolved) {
      if (s.yAxisId !== axis.id || s.hidden) continue;
      if (s.kind !== "line" && !s.lows) wantsZero = true;
      for (let i = 0; i < n; i++) {
        if (!inWindow(i)) continue;
        const band = s.bands?.[i];
        const pair = band ? band : [s.values[i] ?? null];
        for (const v of pair) {
          if (v === null || !Number.isFinite(v)) continue;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    if (axis.includeZero ?? wantsZero) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.1 || 1;
      lo -= pad;
      hi += pad;
    } else if (!(axis.includeZero ?? wantsZero)) {
      // Lines: breathing room so the curve never sits on the frame.
      const pad = (hi - lo) * 0.06;
      lo -= pad;
      hi += pad;
    }
    if (expand && wantsZero) {
      lo = Math.min(0, lo);
      hi = Math.max(1, hi);
    }
    domains[axis.id] = [axis.min ?? lo, axis.max ?? hi];
  }

  const valueFormat = (axis: YAxisSpec, d: [number, number], count: number) => {
    if (axis.format) return (v: number) => formatNumber(v, axis.format as NumberFormat, locale);
    if (expand) return (v: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(v);
    return tickFormat(d[0], d[1], count, { locale, compact: true });
  };

  // Estimate tick labels before the margins are known (two passes would differ server/client).
  const valueLengthGuess = horizontal ? width - 80 : height - 40;
  const tickCountFor = (axis: YAxisSpec, length: number) => axis.tickCount ?? Math.max(2, Math.min(10, Math.round(length / (horizontal ? 90 : 52))));
  const axisLabelWidth: Record<string, number> = {};
  const niceDomains: Record<string, [number, number]> = {};
  for (const axis of axisSpecs) {
    const count = tickCountFor(axis, valueLengthGuess);
    const d = domains[axis.id] as [number, number];
    const niced = axis.min !== undefined && axis.max !== undefined ? scaleLinear(d, [0, 1]) : scaleLinear(d, [0, 1]).nice(count);
    const nd: [number, number] = [axis.min ?? niced.domain[0], axis.max ?? niced.domain[1]];
    niceDomains[axis.id] = nd;
    const fmt = valueFormat(axis, nd, count);
    axisLabelWidth[axis.id] = Math.max(0, ...niced.ticks(count).map((t) => estimateTextWidth(fmt(t), FONT)));
  }

  // Category labels (for horizontal margins and band tick thinning).
  const catLabel = (i: number) => formatXValue(xValues[i] as XValue, xKind, input.xAxis, locale, timeZone, false);
  const m = input.margin ?? {};
  const xAxisVisible = !!input.xAxis?.visible;
  const leftAxis = axisSpecs.find((a) => a.visible && a.side === "left");
  const rightAxis = axisSpecs.find((a) => a.visible && a.side === "right");
  let margin: Margin;
  if (horizontal) {
    const widest = xAxisVisible && xKind === "band" ? Math.max(0, ...xValues.map((_, i) => estimateTextWidth(catLabel(i), FONT + 1))) : 0;
    margin = {
      top: m.top ?? 8,
      right: m.right ?? 20,
      bottom: m.bottom ?? (leftAxis || rightAxis ? 28 : 8),
      left: m.left ?? (xAxisVisible ? Math.min(180, Math.ceil(widest) + 14) : 8),
    };
  } else {
    margin = {
      top: m.top ?? 12,
      right: m.right ?? (rightAxis ? Math.ceil(rightAxis.width ?? (axisLabelWidth[rightAxis.id] ?? 0) + 14) : 14),
      bottom: m.bottom ?? (xAxisVisible ? 28 : 8),
      left: m.left ?? (leftAxis ? Math.ceil(leftAxis.width ?? (axisLabelWidth[leftAxis.id] ?? 0) + 14) : 8),
    };
  }
  const plotW = Math.max(1, width - margin.left - margin.right);
  const plotH = Math.max(1, height - margin.top - margin.bottom);
  const catLength = horizontal ? plotH : plotW;
  const valueLength = horizontal ? plotW : plotH;

  // Category scale.
  let catPos: (i: number) => number;
  let indexAt: (px: number) => number;
  let catValue: (x: XValue) => number;
  let bandwidth = 0;
  let catTicks: Tick[] = [];
  const tickCount = input.xAxis?.tickCount ?? Math.max(2, Math.round(catLength / (horizontal ? 40 : 96)));
  if (xKind === "band") {
    const keys = xValues.map((_, i) => i);
    const band: BandScale<number> = hasBars
      ? scaleBand(keys, [0, catLength], { paddingInner: input.barGap, paddingOuter: input.barGap / 2 })
      : scaleBand(keys, [0, catLength], { paddingInner: 1, paddingOuter: 0.5 });
    bandwidth = band.bandwidth;
    // Slots are visual positions; with a sort, slot k shows data index order[k].
    const slotOf = (i: number) => (rank ? (rank[i] ?? i) : i);
    catPos = (i) => band(slotOf(i)) + band.bandwidth / 2;
    indexAt = (px) => {
      const k = band.at(px) ?? 0;
      return order ? (order[k] ?? k) : k;
    };
    catValue = (value) => {
      const i = xValues.findIndex((v) => v === value || String(v) === String(value) || (v instanceof Date && +v === +value));
      return i < 0 ? Number.NaN : catPos(i);
    };
    // Thin labels until they fit along the axis.
    const widest = horizontal ? FONT + 6 : Math.max(0, ...keys.map((i) => estimateTextWidth(catLabel(i), FONT))) + 10;
    const every = Math.max(1, Math.ceil(widest / Math.max(1, band.step)));
    // Keyed by data index, so sorted labels slide along with their bars.
    catTicks = keys
      .filter((k) => k % every === 0)
      .map((k) => (order ? (order[k] ?? k) : k))
      .map((i) => ({ value: i, pos: catPos(i), label: catLabel(i), key: `b${i}` }));
  } else {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of xNum) {
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    const domain: [number, number] = input.xDomain ? [input.xDomain[0], input.xDomain[1]] : [lo, hi === lo ? lo + 1 : hi];
    const scale: ContinuousScale = xKind === "time" ? scaleUtc(domain, [0, catLength]) : scaleLinear(domain, [0, catLength]);
    catPos = (i) => scale(xNum[i] as number);
    catValue = (value) => (typeof value === "string" ? Number.NaN : scale(+value));
    indexAt = (px) => {
      const target = scale.invert(px);
      return nearestIndex(xNum, target);
    };
    if (xKind === "time") {
      const { ticks } = timeTicks(domain[0], domain[1], tickCount);
      const custom = input.xAxis?.format;
      const fmt =
        typeof custom === "function"
          ? (t: number) => custom(t)
          : custom
            ? (t: number) => formatDate(t, custom as Intl.DateTimeFormatOptions, locale, timeZone)
            : multiTimeFormat(locale, timeZone);
      catTicks = ticks.map((t) => ({ value: t, pos: scale(t), label: fmt(t), key: `t${t}` }));
    } else {
      const fmt = tickFormat(domain[0], domain[1], tickCount, { locale });
      catTicks = scale.ticks(tickCount).map((t) => ({ value: t, pos: scale(t), label: fmt(t), key: `n${t}` }));
    }
  }

  // Value scales and ticks.
  const yScales: Record<string, ContinuousScale> = {};
  const yTicks: Record<string, Tick[]> = {};
  for (const axis of axisSpecs) {
    const count = tickCountFor(axis, valueLength);
    const d = niceDomains[axis.id] as [number, number];
    const range: [number, number] = horizontal ? [0, plotW] : [plotH, 0];
    const scale = scaleLinear(d, range);
    yScales[axis.id] = scale;
    const fmt = valueFormat(axis, d, count);
    yTicks[axis.id] = scale.ticks(count).map((t) => ({ value: t, pos: scale(t), label: fmt(t), key: `${axis.id}:${t}` }));
  }

  // Geometry.
  const barSeries = resolved.filter((s) => s.kind === "bar");
  const slotKeys: string[] = [];
  for (const s of barSeries) {
    const key = s.stack !== undefined ? `s:${s.yAxisId}:${s.stack}` : `b:${s.id}`;
    if (!slotKeys.includes(key)) slotKeys.push(key);
  }
  const slotOf = (s: ResolvedSeries) => slotKeys.indexOf(s.stack !== undefined ? `s:${s.yAxisId}:${s.stack}` : `b:${s.id}`);
  const slotWeight: number[] = slotKeys.map((key) => (barSeries.some((s) => !s.hidden && slotOf(s) === slotKeys.indexOf(key)) ? 1 : 0));
  const visibleSlots = slotWeight.reduce((a, b) => a + b, 0) || 1;
  const gap = slotKeys.length > 1 ? Math.min(4, bandwidth * 0.06) : 0;
  const slotW = Math.max(0, (bandwidth - gap * (visibleSlots - 1)) / visibleSlots);

  for (const s of resolved) {
    const scale = yScales[s.yAxisId] as ContinuousScale;
    const v = (value: number) => (Number.isFinite(value) ? scale(value) : Number.NaN);
    if (s.kind === "line") {
      const g = new Float64Array(n * 2);
      for (let i = 0; i < n; i++) {
        const value = s.values[i];
        g[i * 2] = catPos(i);
        g[i * 2 + 1] = value === null || value === undefined ? Number.NaN : v(value);
      }
      s.geometry = g;
    } else if (s.kind === "area") {
      const g = new Float64Array(n * 3);
      const bands = s.bands ?? [];
      for (let i = 0; i < n; i++) {
        const b = bands[i] ?? [Number.NaN, Number.NaN];
        g[i * 3] = catPos(i);
        g[i * 3 + 1] = v(b[1]);
        g[i * 3 + 2] = v(b[0]);
      }
      s.geometry = g;
    } else {
      const g = new Float64Array(n * 4);
      const slot = slotOf(s);
      let offset = 0;
      for (let k = 0; k < slot; k++) offset += (slotWeight[k] ?? 0) * (slotW + gap);
      const w = (slotWeight[slot] ?? 0) * slotW;
      const bands = s.bands ?? [];
      for (let i = 0; i < n; i++) {
        const b = bands[i] ?? [Number.NaN, Number.NaN];
        const c0 = catPos(i) - bandwidth / 2 + offset;
        const p0 = v(Math.min(b[0], b[1]));
        const p1 = v(Math.max(b[0], b[1]));
        if (horizontal) {
          g.set([Math.min(p0, p1), c0, Math.abs(p1 - p0), w], i * 4);
        } else {
          g.set([c0, Math.min(p0, p1), w, Math.abs(p1 - p0)], i * 4);
        }
      }
      s.geometry = g;
    }
  }
  // Rounded ends only on the outermost visible segment of each stack (per sign).
  for (const s of barSeries) {
    s.outer = s.values.map((_, i) => {
      const b = s.bands?.[i];
      if (!b || s.hidden) return false;
      if (s.stack === undefined) return true;
      // The sign of the value, not of the band edge: a diverging negative band is [lo, 0].
      const positive = (s.values[i] ?? 0) >= 0;
      const peers = barSeries.filter((p) => !p.hidden && p.stack === s.stack && p.yAxisId === s.yAxisId);
      const edge = positive ? Math.max(b[0], b[1]) : Math.min(b[0], b[1]);
      return peers.every((p) => {
        const pb = p.bands?.[i];
        if (!pb || p === s || pb[0] === pb[1]) return true;
        return positive ? Math.max(pb[0], pb[1]) <= edge : Math.min(pb[0], pb[1]) >= edge;
      });
    });
  }

  const axisById = Object.fromEntries(axisSpecs.map((a) => [a.id, a]));
  return {
    n,
    width,
    height,
    margin,
    plotW,
    plotH,
    layout,
    xKind,
    xValues,
    xNum,
    catPos,
    bandwidth,
    catLength,
    valueLength,
    indexAt,
    order,
    rank,
    catValue,
    catTicks,
    yScales,
    yTicks,
    yAxes: axisSpecs,
    xAxis: input.xAxis,
    series: resolved,
    stackOffset,
    formatX: (i) => {
      const value = xValues[i] as XValue;
      if (input.formatX) return input.formatX(value);
      return formatXValue(value, xKind, input.xAxis, locale, timeZone, true);
    },
    formatXValue: (value) => {
      if (xKind === "band") {
        const i = Math.max(0, Math.min(n - 1, Math.round(value)));
        const v = xValues[i] as XValue;
        return input.formatX ? input.formatX(v) : formatXValue(v, xKind, input.xAxis, locale, timeZone, true);
      }
      const v: XValue = xKind === "time" ? new Date(value) : value;
      return input.formatX ? input.formatX(v) : formatXValue(v, xKind, input.xAxis, locale, timeZone, true);
    },
    formatValue: (s, value) => {
      const f = s.format ?? axisById[s.yAxisId]?.format ?? { maximumFractionDigits: 2 };
      return formatNumber(value, f, locale);
    },
    formatAxisValue: (axisId, value) => {
      const axis = axisById[axisId] ?? axisSpecs[0];
      const d = niceDomains[axisId] ?? [0, 1];
      return axis ? valueFormat(axis, d, 6)(value) : String(value);
    },
    hasBars,
  };
}

/** The plot-space value of series `s` at point `i` used for hit-testing and tooltips (top edge). */
export function seriesValuePx(model: CartesianModel, s: ResolvedSeries, i: number): number {
  const g = s.geometry;
  if (s.kind === "line") return g[i * 2 + 1] ?? Number.NaN;
  if (s.kind === "area") return g[i * 3 + 1] ?? Number.NaN;
  const horizontal = model.layout === "horizontal";
  const value = s.values[i] ?? 0;
  const x = g[i * 4] ?? 0;
  const y = g[i * 4 + 1] ?? 0;
  const w = g[i * 4 + 2] ?? 0;
  const h = g[i * 4 + 3] ?? 0;
  if (horizontal) return value < 0 ? x : x + w;
  return value < 0 ? y + h : y;
}
