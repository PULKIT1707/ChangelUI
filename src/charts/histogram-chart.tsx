"use client";

// Histogram: automatic round bins (Freedman-Diaconis, Sturges or a count), an optional KDE curve,
// mean and median markers, a cumulative (ECDF) line, an overlaid comparison distribution, drag to
// brush a range ("412 (31%) selected"), wheel or +/- to change the bin count with bars morphing
// to the new bins, a rich bin tooltip with cumulative share, and keyboard exploration.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { linePath } from "./core/path";
import { scaleLinear } from "./core/scale";
import { bin, deviation, extent, finite, kde as kdeCurve, mean as meanOf, median as medianOf, type Bin } from "./core/stats";
import { ticks as niceTicks } from "./core/ticks";
import { barDelay, chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const MAX_AUTO_BINS = 40;

export interface HistogramSelection {
  /** Selected value range, snapped to bin edges. */
  range: [number, number];
  /** Values inside the range. */
  count: number;
  /** count / total (0..1). */
  share: number;
}

export interface HistogramBinInfo {
  index: number;
  x0: number;
  x1: number;
  count: number;
  /** Share of all values (0..1). */
  share: number;
  /** Share of values at or below x1 (0..1). */
  cumulative: number;
  /** Count of the comparison distribution in the same bin. */
  compareCount?: number;
}

export interface HistogramChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Raw values. Non-finite values are ignored. */
  values: readonly number[];
  /** Bin rule: "fd" (Freedman-Diaconis), "sturges", a target count, or explicit edges. Default "fd". */
  thresholds?: "fd" | "sturges" | number | readonly number[];
  /** Range to bin over. Default: the data extent, widened to round edges. */
  domain?: readonly [number, number];
  /** Name of the measure ("Response time"). */
  label?: string;
  /** A second distribution drawn as an outline on the same bins ("Last week"). */
  compare?: readonly number[];
  compareLabel?: string;
  /** Kernel density curve scaled to the counts. Default false. */
  kde?: boolean;
  /** Mean marker. Default false. */
  showMean?: boolean;
  /** Median marker. Default true. */
  showMedian?: boolean;
  /** Cumulative share line on a right 0-100% axis. Default false. */
  cumulative?: boolean;
  /** Drag across the plot to select a range. Default true. */
  brush?: boolean;
  /** Ctrl/Cmd + wheel and + / - keys change the bin count. Default true. */
  binWheel?: boolean;
  /** Plot height in px. Default 260. */
  height?: number;
  /** Bar color. Default var(--pui-chart-1). */
  color?: string;
  compareColor?: string;
  /** Value format (x axis, tooltip). */
  format?: NumberFormat;
  locale?: string;
  /** Width before measuring (SSR viewBox). Default 640. */
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Show a "Show data" toggle for the visible table. Default false (T toggles it too). */
  tableToggle?: boolean;
  onSelectionChange?: (selection: HistogramSelection | null) => void;
  onBinClick?: (bin: HistogramBinInfo, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveBinChange?: (bin: HistogramBinInfo | null) => void;
  summary?: string;
  chartLabel?: string;
}

function skewness(xs: readonly number[]): number {
  const m = meanOf(xs);
  const sd = deviation(xs);
  if (m === undefined || !sd) return 0;
  let s = 0;
  for (const v of xs) s += ((v - m) / sd) ** 3;
  return s / xs.length;
}

/** Bin count to try next so the nice edges actually change (adjacent counts often round alike). */
function nextBinCount(values: readonly number[], current: number, direction: 1 | -1, domain?: readonly [number, number]): number {
  const base = bin(values, { thresholds: current, domain }).length;
  for (let c = current + direction, k = 0; c >= 1 && c <= 200 && k < 60; c += direction, k++) {
    if (bin(values, { thresholds: c, domain }).length !== base) return c;
  }
  return current;
}

/**
 * Distribution of one measure with round bins, KDE, mean and median markers, cumulative share,
 * an overlay comparison, brush selection and a live bin-count control.
 */
export const HistogramChart = React.forwardRef<HTMLElement, HistogramChartProps>(function HistogramChart(
  {
    values,
    thresholds = "fd",
    domain,
    label = "Value",
    compare,
    compareLabel = "Comparison",
    kde = false,
    showMean = false,
    showMedian = true,
    cumulative = false,
    brush = true,
    binWheel = true,
    height = 260,
    color = categoricalColor(0),
    compareColor = categoricalColor(1),
    format,
    locale = "en-US",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onSelectionChange,
    onBinClick,
    onActiveBinChange,
    summary,
    chartLabel,
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const plotRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [selection, setSelection] = React.useState<[number, number] | null>(null);
  const [drag, setDrag] = React.useState<{ from: number; to: number } | null>(null);
  const [count, setCount] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const [hidden, setHidden] = React.useState<{ main: boolean; compare: boolean }>({ main: false, compare: false });

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 2 }, locale), [format, locale]);
  const countFmt = React.useMemo(() => getNumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale]);

  // Bins (a user-chosen count wins over the rule).
  const model = React.useMemo(() => {
    const xs = finite(values);
    const cs = compare ? finite(compare) : [];
    const all = cs.length ? [...xs, ...cs] : xs;
    const dom = domain ?? (cs.length ? extent(all) : undefined);
    const rule = count ?? (thresholds === "fd" ? undefined : thresholds === "sturges" ? Math.max(1, Math.ceil(Math.log2(Math.max(1, xs.length))) + 1) : thresholds);
    let bins = bin(xs, { thresholds: rule as number | readonly number[] | undefined, domain: dom });
    // Long tails make Freedman-Diaconis ask for slivers; keep the automatic rule readable.
    if (rule === undefined && bins.length > MAX_AUTO_BINS) bins = bin(xs, { thresholds: MAX_AUTO_BINS, domain: dom });
    const edges = bins.length ? [bins[0]?.x0 as number, ...bins.map((b) => b.x1)] : [];
    const cbins: Bin[] = cs.length && edges.length > 1 ? bin(cs, { thresholds: edges, domain: [edges[0] as number, edges[edges.length - 1] as number] }) : [];
    const n = xs.length;
    let run = 0;
    const cum = bins.map((b) => (run += b.count) / Math.max(1, n));
    return {
      xs,
      cs,
      bins,
      cbins,
      cum,
      n,
      mean: meanOf(xs),
      median: medianOf(xs),
      cMedian: cs.length ? medianOf(cs) : undefined,
      skew: skewness(xs),
      density: kde && xs.length > 1 ? kdeCurve(xs, { samples: 72, domain: edges.length > 1 ? [edges[0] as number, edges[edges.length - 1] as number] : undefined }) : [],
    };
  }, [values, compare, domain, thresholds, count, kde]);
  const { bins, cbins, n } = model;

  // Geometry.
  const W = Math.max(160, width);
  const H = height;
  const yMaxRaw = Math.max(1, ...(hidden.main ? [] : bins.map((b) => b.count)), ...(hidden.compare ? [] : cbins.map((b) => b.count)));
  const yTicks = niceTicks(0, yMaxRaw, Math.max(2, Math.round(H / 60)));
  const yMax = Math.max(yMaxRaw, yTicks[yTicks.length - 1] ?? yMaxRaw);
  const yLabelW = Math.max(18, ...yTicks.map((t) => countFmt.format(t).length * 6.4)) + 10;
  const m = { left: yLabelW, right: cumulative ? 40 : 12, top: showMean || showMedian ? 22 : 10, bottom: 26 };
  const x0 = bins[0]?.x0 ?? 0;
  const x1 = bins[bins.length - 1]?.x1 ?? 1;
  const xs = scaleLinear([x0, x1 === x0 ? x0 + 1 : x1], [m.left, W - m.right]);
  const ys = scaleLinear([0, yMax], [H - m.bottom, m.top]);
  const base = H - m.bottom;
  const xTicks = niceTicks(x0, x1, Math.max(2, Math.floor((W - m.left - m.right) / 80)));
  const binW = bins.length ? (x1 - x0) / bins.length : 1;

  const active = focus ?? hover;
  const info = (i: number): HistogramBinInfo | null => {
    const b = bins[i];
    if (!b) return null;
    const c = cbins[i];
    return { index: i, x0: b.x0, x1: b.x1, count: b.count, share: b.count / Math.max(1, n), cumulative: model.cum[i] ?? 0, compareCount: c ? c.count : undefined };
  };
  const activeInfo = active === null ? null : info(active);

  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveBinChange?.(active === null ? null : info(active));
  });

  // Selection, snapped to bin edges.
  const selectionStats = React.useCallback(
    (range: [number, number] | null): HistogramSelection | null => {
      if (!range) return null;
      let c = 0;
      for (const b of bins) if (b.x0 >= range[0] - 1e-9 && b.x1 <= range[1] + 1e-9) c += b.count;
      return { range, count: c, share: c / Math.max(1, n) };
    },
    [bins, n],
  );
  const commitSelection = (range: [number, number] | null) => {
    setSelection(range);
    onSelectionChange?.(selectionStats(range));
    const s = selectionStats(range);
    setAnnouncement(s ? `Selected ${fmt(s.range[0])} to ${fmt(s.range[1])}: ${countFmt.format(s.count)} values, ${pctFmt.format(s.share)}.` : "Selection cleared.");
  };
  // A new binning invalidates the selection.
  const binKey = bins.map((b) => b.x0).join(",");
  const [prevKey, setPrevKey] = React.useState(binKey);
  if (prevKey !== binKey) {
    setPrevKey(binKey);
    if (selection) setSelection(null);
    if (focus !== null && focus >= bins.length) setFocus(bins.length ? bins.length - 1 : null);
  }
  const snapRange = (a: number, b: number): [number, number] | null => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const inside = bins.filter((bn) => bn.x1 > lo && bn.x0 < hi);
    if (!inside.length) return null;
    return [inside[0]?.x0 as number, inside[inside.length - 1]?.x1 as number];
  };
  const shown = drag ? snapRange(drag.from, drag.to) : selection;
  const selStats = drag ? selectionStats(shown) : selectionStats(selection);
  const inSel = (b: Bin) => !shown || (b.x0 >= shown[0] - 1e-9 && b.x1 <= shown[1] + 1e-9);

  // Bin count.
  const currentCount = bins.length;
  const changeBins = React.useCallback(
    (direction: 1 | -1) => {
      const next = nextBinCount(model.xs, Math.max(1, currentCount), direction, domain ?? (model.cs.length ? extent([...model.xs, ...model.cs]) : undefined));
      if (next !== currentCount) {
        setCount(next);
        const b = bin(model.xs, { thresholds: next, domain }).length;
        setAnnouncement(`${b} bins.`);
      }
    },
    [model.xs, model.cs, currentCount, domain],
  );
  React.useEffect(() => {
    const el = plotRef.current;
    if (!el || !binWheel) return;
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey) || Math.abs(event.deltaY) < 1) return;
      event.preventDefault();
      changeBins(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [binWheel, changeBins]);

  const describe = (i: number) => {
    const b = info(i);
    if (!b) return "";
    const cmp = b.compareCount !== undefined ? `, ${compareLabel} ${countFmt.format(b.compareCount)}` : "";
    return `${fmt(b.x0)} to ${fmt(b.x1)}: ${countFmt.format(b.count)} values, ${pctFmt.format(b.share)}${cmp}. ${pctFmt.format(b.cumulative)} at or below. Bin ${i + 1} of ${bins.length}.`;
  };

  const valueAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    return xs.invert(Math.max(m.left, Math.min(W - m.right, px)));
  };
  const binAt = (v: number | null) => {
    if (v === null) return null;
    const i = bins.findIndex((b, k) => v >= b.x0 && (v < b.x1 || k === bins.length - 1));
    return i < 0 ? null : i;
  };
  const press = React.useRef<{ x: number; v: number; id: number } | null>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!bins.length || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? -1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = Math.min(bins.length - 1, cur + 1);
    else if (event.key === "ArrowLeft") next = cur < 0 ? bins.length - 1 : Math.max(0, cur - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = bins.length - 1;
    else if (event.key === "PageDown") next = Math.min(bins.length - 1, Math.max(0, cur) + Math.max(1, Math.round(bins.length / 10)));
    else if (event.key === "PageUp") next = Math.max(0, cur - Math.max(1, Math.round(bins.length / 10)));
    else if ((event.key === "+" || event.key === "=") && binWheel) {
      event.preventDefault();
      changeBins(1);
      return;
    } else if ((event.key === "-" || event.key === "_") && binWheel) {
      event.preventDefault();
      changeBins(-1);
      return;
    } else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      const b = bins[focus];
      if (!b) return;
      if (brush) {
        // Shift extends the selection to the focused bin.
        const range: [number, number] = event.shiftKey && selection ? [Math.min(selection[0], b.x0), Math.max(selection[1], b.x1)] : [b.x0, b.x1];
        commitSelection(range);
      }
      const i = info(focus);
      if (i) onBinClick?.(i, event);
      return;
    } else if (event.key === "Escape") {
      if (selection) {
        event.preventDefault();
        event.stopPropagation();
        commitSelection(null);
      } else if (focus !== null) {
        event.preventDefault();
        setFocus(null);
      }
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next));
  };

  // Paths.
  const peakBin = bins.reduce<Bin | undefined>((a, b) => (!a || b.count > a.count ? b : a), undefined);
  const densityPath = React.useMemo(() => {
    if (!model.density.length) return "";
    const scale = n * binW;
    return linePath(
      model.density.map(([x, d]) => [xs(x), ys(d * scale)] as const),
      { curve: "monotone" },
    );
  }, [model.density, n, binW, xs, ys]);
  const cumY = scaleLinear([0, 1], [H - m.bottom, m.top]);
  const cumPath = cumulative && bins.length ? linePath([[xs(x0), cumY(0)] as const, ...bins.map((b, i) => [xs(b.x1), cumY(model.cum[i] ?? 0)] as const)], { curve: "monotone" }) : "";
  const comparePath = (() => {
    if (!cbins.length) return "";
    let d = `M${xs(cbins[0]?.x0 ?? x0)},${base}`;
    for (const b of cbins) d += `V${ys(b.count)}H${xs(b.x1)}`;
    return `${d}V${base}`;
  })();

  // Summary.
  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} histogram`);
  const skewText = Math.abs(model.skew) < 0.5 ? "roughly symmetric" : model.skew > 0 ? "right-skewed (a long tail of high values)" : "left-skewed (a long tail of low values)";
  const summaryText =
    summary ??
    (n && peakBin
      ? `${countFmt.format(n)} ${label.toLowerCase()} values from ${fmt(bins[0]?.x0 ?? 0)} to ${fmt(x1)} in ${bins.length} bins. Mean ${fmt(model.mean ?? 0)}, median ${fmt(model.median ?? 0)}; ${skewText}. Most common range ${fmt(peakBin.x0)} to ${fmt(peakBin.x1)} with ${countFmt.format(peakBin.count)} values.`
      : "No data.");

  // Tooltip anchor.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeInfo && !drag) {
    const ax = xs((activeInfo.x0 + activeInfo.x1) / 2);
    const top = ys(Math.max(activeInfo.count, activeInfo.compareCount ?? 0));
    tip = { left: ax / W, top: Math.max(m.top, top) / H, flipX: ax / W > 0.62, below: top < 90 };
  }

  const markers: Array<{ key: string; value: number; label: string; color: string; dash?: string }> = [];
  if (showMedian && model.median !== undefined && !hidden.main) markers.push({ key: "median", value: model.median, label: "Median", color: "var(--pui-foreground)" });
  if (showMean && model.mean !== undefined && !hidden.main) markers.push({ key: "mean", value: model.mean, label: "Mean", color: "var(--pui-warning-text, var(--pui-foreground))", dash: "4 3" });
  if (showMedian && model.cMedian !== undefined && !hidden.compare) markers.push({ key: "cmedian", value: model.cMedian, label: compareLabel, color: compareColor, dash: "2 3" });
  // Push apart marker labels that would collide.
  const labelW = (mk: (typeof markers)[number] | undefined) => (mk ? estimateTextWidth(`${mk.label} ${fmt(mk.value)}`, 10) * 1.15 + 6 : 0);
  const markerX = markers.map((mk) => xs(mk.value));
  const labelX = [...markerX];
  const order = markers.map((_, i) => i).sort((a, b) => (markerX[a] as number) - (markerX[b] as number));
  for (let k = 1; k < order.length; k++) {
    const a = order[k - 1] as number;
    const b = order[k] as number;
    const minGap = (labelW(markers[a]) + labelW(markers[b])) / 2 + 8;
    if ((labelX[b] as number) - (labelX[a] as number) < minGap) labelX[b] = (labelX[a] as number) + minGap;
  }

  const spring = anim.updates ? chartMotion.layout : instant;
  const legendItems = compare
    ? ([
        { key: "main" as const, label, color },
        { key: "compare" as const, label: compareLabel, color: compareColor },
      ] as const)
    : [];

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {legendItems.length || binWheel || selStats ? (
        <div className={cn(blockReset, "flex flex-wrap items-center gap-2 text-xs")}>
          {legendItems.map((item) => {
            const off = hidden[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={!off}
                onClick={() => setHidden((h) => ({ ...h, [item.key]: !h[item.key] }))}
                className={cn(
                  controlReset,
                  focusRing,
                  "inline-flex min-h-6 items-center gap-1.5 rounded-pui-md px-1.5 py-0.5 transition-opacity hover:bg-pui-muted",
                  off ? "text-pui-muted-foreground opacity-60" : "text-pui-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(blockReset, "size-2.5 rounded-[3px] border-2")}
                  style={{ borderColor: item.color, background: off ? "transparent" : item.key === "main" ? item.color : withOpacity(item.color, 0.2) }}
                />
                {item.label}
              </button>
            );
          })}
          <span className={cn(blockReset, "ms-auto flex items-center gap-2 text-pui-muted-foreground")}>
            {selStats ? (
              <motion.span
                key="sel"
                initial={anim.reducedMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(blockReset, "rounded-pui-full bg-pui-primary/10 px-2 py-0.5 font-medium tabular-nums text-pui-primary-text")}
              >
                {countFmt.format(selStats.count)} ({pctFmt.format(selStats.share)}) selected
              </motion.span>
            ) : null}
            {binWheel ? (
              <span className={cn(blockReset, "inline-flex items-center gap-1 tabular-nums")}>
                <button
                  type="button"
                  aria-label="Fewer bins"
                  onClick={() => changeBins(-1)}
                  className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}
                >
                  &minus;
                </button>
                <span className={cn(blockReset, "min-w-12 text-center")}>{bins.length} bins</span>
                <button
                  type="button"
                  aria-label="More bins"
                  onClick={() => changeBins(1)}
                  className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}
                >
                  +
                </button>
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <linearGradient id={`${uid}-bar`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          {/* Grid + y axis */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={W - m.right} y1={ys(t)} y2={ys(t)} stroke="var(--pui-chart-grid)" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={m.left - 8} y={ys(t)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {countFmt.format(t)}
              </text>
            </g>
          ))}
          {cumulative
            ? [0, 0.5, 1].map((t) => (
                <text key={t} x={W - m.right + 6} y={cumY(t)} dy="0.35em" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                  {pctFmt.format(t)}
                </text>
              ))
            : null}
          {/* Active bin band */}
          {activeInfo ? <rect x={xs(activeInfo.x0)} y={m.top} width={Math.max(1, xs(activeInfo.x1) - xs(activeInfo.x0))} height={base - m.top} fill="var(--pui-muted)" opacity={0.7} rx={3} /> : null}
          {/* Selection band */}
          {shown ? (
            <rect
              x={xs(shown[0])}
              y={m.top - 4}
              width={Math.max(1, xs(shown[1]) - xs(shown[0]))}
              height={base - m.top + 4}
              fill="var(--pui-primary)"
              fillOpacity={0.1}
              stroke="var(--pui-primary)"
              strokeOpacity={0.6}
              rx={4}
            />
          ) : null}
          {/* Bars, keyed by index so a new bin count morphs instead of re-mounting */}
          {!hidden.main
            ? bins.map((b, i) => {
                const bx = xs(b.x0) + 0.75;
                const bw = Math.max(0.5, xs(b.x1) - xs(b.x0) - 1.5);
                const by = ys(b.count);
                const dim = (shown && !inSel(b)) || (active !== null && active !== i && !shown);
                return (
                  <motion.rect
                    key={i}
                    initial={anim.entrance ? { x: bx, width: bw, y: base, height: 0.01 } : false}
                    // Never exactly 0: spring math near 0 can produce -1e-16, an invalid SVG height.
                    animate={{ x: bx, width: bw, y: by, height: Math.max(0.01, base - by), opacity: dim ? 0.38 : 1 }}
                    transition={
                      anim.reducedMotion
                        ? instant
                        : { ...(anim.updates ? chartMotion.size : instant), opacity: chartMotion.fade, delay: anim.entrance ? barDelay(i, bins.length) : 0 }
                    }
                    rx={Math.min(3, bw / 3)}
                    fill={`url(#${uid}-bar)`}
                    stroke={active === i ? color : "none"}
                    strokeWidth={active === i ? 1.5 : 0}
                  />
                );
              })
            : null}
          {/* Comparison outline */}
          {comparePath && !hidden.compare ? (
            <motion.path
              initial={anim.entrance ? { d: comparePath, pathLength: 0, opacity: 0 } : false}
              animate={{ d: comparePath, pathLength: 1, opacity: 1 }}
              transition={anim.reducedMotion ? instant : { d: spring, pathLength: chartMotion.drawLine, opacity: { duration: 0.3 } }}
              fill={withOpacity(compareColor, 0.12)}
              stroke={compareColor}
              strokeWidth={1.75}
              strokeLinejoin="round"
            />
          ) : null}
          {/* KDE */}
          {densityPath && !hidden.main ? (
            <motion.path
              initial={anim.entrance ? { d: densityPath, pathLength: 0 } : false}
              animate={{ d: densityPath, pathLength: 1 }}
              transition={anim.reducedMotion ? instant : { d: spring, pathLength: { ...chartMotion.drawLine, delay: 0.25 } }}
              fill="none"
              stroke="var(--pui-foreground)"
              strokeOpacity={0.75}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ) : null}
          {/* Cumulative share */}
          {cumPath ? (
            <motion.path
              initial={anim.entrance ? { d: cumPath, pathLength: 0 } : false}
              animate={{ d: cumPath, pathLength: 1 }}
              transition={anim.reducedMotion ? instant : { d: spring, pathLength: { ...chartMotion.drawLine, delay: 0.35 } }}
              fill="none"
              stroke={categoricalColor(3)}
              strokeWidth={2}
              strokeDasharray="1 0"
            />
          ) : null}
          {cumPath && activeInfo ? <circle cx={xs(activeInfo.x1)} cy={cumY(activeInfo.cumulative)} r={4} fill="var(--pui-background)" stroke={categoricalColor(3)} strokeWidth={2} /> : null}
          {/* Mean / median markers */}
          {markers.map((mk, k) => (
            <motion.g key={mk.key} initial={false} animate={{ x: markerX[k] as number }} transition={anim.reducedMotion ? instant : spring}>
              <line x1={0} x2={0} y1={m.top - 2} y2={base} stroke={mk.color} strokeWidth={1.5} strokeDasharray={mk.dash} opacity={0.85} />
              <text x={(labelX[k] as number) - (markerX[k] as number)} y={m.top - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={mk.color} className="tabular-nums">
                {mk.label} {fmt(mk.value)}
              </text>
            </motion.g>
          ))}
          {/* X axis */}
          {xTicks.map((t) => (
            <text key={t} x={xs(t)} y={H - m.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
              {fmt(t)}
            </text>
          ))}
        </svg>
        <div
          ref={plotRef}
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to move between bins.`}
          aria-describedby={`${uid}-help`}
          onPointerDown={(event) => {
            if (!brush || event.button !== 0) return;
            const v = valueAt(event);
            if (v === null) return;
            press.current = { x: event.clientX, v, id: event.pointerId };
          }}
          onPointerMove={(event) => {
            const v = valueAt(event);
            const p = press.current;
            if (p && Math.abs(event.clientX - p.x) > 4) {
              if (!drag) event.currentTarget.setPointerCapture(p.id);
              setDrag({ from: p.v, to: v ?? p.v });
              setHover(null);
              return;
            }
            setHover(binAt(v));
          }}
          onPointerUp={(event) => {
            const p = press.current;
            press.current = null;
            if (drag) {
              commitSelection(snapRange(drag.from, drag.to));
              setDrag(null);
              return;
            }
            if (!p) return;
            const i = binAt(valueAt(event));
            if (selection) commitSelection(null);
            const b = i === null ? null : info(i);
            if (b) onBinClick?.(b, event);
          }}
          onPointerCancel={() => {
            press.current = null;
            setDrag(null);
          }}
          onPointerLeave={() => {
            if (!press.current) setHover(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", brush ? "cursor-crosshair" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeInfo ? (
            <>
              <div className={cn(blockReset, "mb-1 text-[11px] font-semibold text-pui-muted-foreground tabular-nums")}>
                {fmt(activeInfo.x0)} &ndash; {fmt(activeInfo.x1)}
              </div>
              {!hidden.main ? <TipRow swatch={color} label={compare ? label : "Count"} value={countFmt.format(activeInfo.count)} /> : null}
              {activeInfo.compareCount !== undefined && !hidden.compare ? (
                <TipRow
                  swatch={compareColor}
                  label={compareLabel}
                  value={
                    <>
                      {countFmt.format(activeInfo.compareCount)}
                      {activeInfo.compareCount !== activeInfo.count ? (
                        <span className={cn(blockReset, "ms-1.5", activeInfo.count > activeInfo.compareCount ? "text-pui-success-text" : "text-pui-danger-text")}>
                          {activeInfo.count > activeInfo.compareCount ? "+" : "\u2212"}
                          {countFmt.format(Math.abs(activeInfo.count - activeInfo.compareCount))}
                        </span>
                      ) : null}
                    </>
                  }
                />
              ) : null}
              <TipRow label="Share" value={pctFmt.format(activeInfo.share)} tone="muted" />
              <TipRow label={`\u2264 ${fmt(activeInfo.x1)}`} value={pctFmt.format(activeInfo.cumulative)} tone="muted" />
              <div className={cn(blockReset, "mt-1.5 h-1 overflow-hidden rounded-pui-full bg-pui-muted")}>
                <motion.div
                  className={cn(blockReset, "h-full rounded-pui-full")}
                  style={{ background: color }}
                  initial={false}
                  animate={{ width: `${activeInfo.cumulative * 100}%` }}
                  transition={anim.reducedMotion ? instant : chartMotion.hover}
                />
              </div>
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        Left and right arrows move between bins, Home and End jump to the ends{brush ? ", Enter selects the bin and Shift+Enter extends the selection, Escape clears it" : ""}
        {binWheel ? ", plus and minus change the bin count" : ""}, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["Range", "Count", "Share", "Cumulative", ...(cbins.length ? [compareLabel] : [])]}
        rows={bins.map((b, i) => [
          `${fmt(b.x0)} \u2013 ${fmt(b.x1)}`,
          countFmt.format(b.count),
          pctFmt.format(b.count / Math.max(1, n)),
          pctFmt.format(model.cum[i] ?? 0),
          ...(cbins.length ? [countFmt.format(cbins[i]?.count ?? 0)] : []),
        ])}
      />
    </ChartFigure>
  );
});
HistogramChart.displayName = "HistogramChart";
