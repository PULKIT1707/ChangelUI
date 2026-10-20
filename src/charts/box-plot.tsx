"use client";

// Box plot: box, violin or both per group, from raw values (Tukey fences, KDE violins, jittered or
// beeswarm raw points) or precomputed quartiles. Hovering a group shows its five-number summary and
// draws its median across every group for comparison; outliers are hit-tested and selectable. Boxes
// grow outward from the median, violins and boxes morph on updates, and the keyboard walks groups
// and their outliers with announcements like "Group A: median 42, IQR 30 to 55, 3 outliers".
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { mulberry32 } from "../lib/random";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { dodge } from "./core/dodge";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, useChartUid } from "./core/frame";
import { linePath } from "./core/path";
import { scaleBand, scaleLinear } from "./core/scale";
import { boxStats, finite, kde, mean as meanOf } from "./core/stats";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

/** Precomputed summary for one group (when raw values aren't available). */
export interface BoxPlotStats {
  group: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean?: number;
  outliers?: readonly number[];
  /** Sample size, shown in the tooltip. */
  n?: number;
}

export interface BoxPlotGroup {
  group: string;
  index: number;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  lowerWhisker: number;
  upperWhisker: number;
  mean: number | undefined;
  outliers: readonly number[];
}

export interface BoxPlotProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Raw rows: one value each. Ignored when `stats` is set. */
  data?: readonly T[];
  group?: Accessor<T, string | number>;
  value?: Accessor<T, number | null | undefined>;
  /** Precomputed summaries; violins and raw points need raw `data`. */
  stats?: readonly BoxPlotStats[];
  /** Group order. Default: first appearance. */
  groupOrder?: readonly (string | number)[];
  /** Default "box". */
  variant?: "box" | "violin" | "both";
  /** Raw points: "jitter" (seeded), "swarm" (beeswarm, never overlapping) or "none". Default "none". */
  points?: "none" | "jitter" | "swarm";
  /** "vertical" puts groups along x. Default "vertical". */
  orientation?: "vertical" | "horizontal";
  /** Whisker reach in IQRs (Tukey). Default 1.5. */
  whisker?: number;
  /** Mean diamond. Default true. */
  showMean?: boolean;
  /** Color every group from the palette (true) or use one color. Default true. */
  colorByGroup?: boolean;
  color?: string;
  /** Value axis domain. Default: nice extent of all values. */
  domain?: readonly [number, number];
  /** Name of the measure ("Latency"). */
  label?: string;
  format?: NumberFormat;
  locale?: string;
  /** Height in px. Default 300 (horizontal: 56 per group, at least 160). */
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  /** Controlled selected outlier. */
  selectedOutlier?: { group: string; value: number } | null;
  onOutlierClick?: (outlier: { group: string; value: number }, event: React.PointerEvent | React.KeyboardEvent) => void;
  onGroupClick?: (group: BoxPlotGroup, event: React.PointerEvent | React.KeyboardEvent) => void;
  onActiveGroupChange?: (group: BoxPlotGroup | null) => void;
  summary?: string;
  chartLabel?: string;
}

function BoxPlotInner<T>(props: BoxPlotProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    group,
    value,
    stats,
    groupOrder,
    variant = "box",
    points = "none",
    orientation = "vertical",
    whisker = 1.5,
    showMean = true,
    colorByGroup = true,
    color,
    domain,
    label = "Value",
    format,
    locale = "en-US",
    height,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    selectedOutlier,
    onOutlierClick,
    onGroupClick,
    onActiveGroupChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const horizontal = orientation === "horizontal";
  const [hover, setHover] = React.useState<{ g: number; o: number | null } | null>(null);
  const [focus, setFocus] = React.useState<{ g: number; o: number | null } | null>(null);
  const [innerSel, setInnerSel] = React.useState<{ group: string; value: number } | null>(null);
  const sel = selectedOutlier !== undefined ? selectedOutlier : innerSel;
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const countFmt = React.useMemo(() => getNumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  // Groups and their statistics.
  const model = React.useMemo(() => {
    const raw = new Map<string, number[]>();
    const order: string[] = groupOrder ? groupOrder.map(String) : [];
    if (!stats && data && group && value) {
      data.forEach((d, i) => {
        const g = String(readAccessor(group, d, i));
        const v = readAccessor(value, d, i);
        if (!raw.has(g)) {
          if (groupOrder && !order.includes(g)) return;
          raw.set(g, []);
          if (!groupOrder) order.push(g);
        }
        if (typeof v === "number" && Number.isFinite(v)) (raw.get(g) as number[]).push(v);
      });
    }
    const groups: BoxPlotGroup[] = [];
    if (stats) {
      const byName = new Map(stats.map((s) => [s.group, s]));
      const names = groupOrder ? order : stats.map((s) => s.group);
      names.forEach((name) => {
        const s = byName.get(name);
        if (!s) return;
        groups.push({
          group: s.group,
          index: groups.length,
          n: s.n ?? 0,
          min: s.min,
          q1: s.q1,
          median: s.median,
          q3: s.q3,
          max: s.max,
          lowerWhisker: s.outliers?.length ? Math.max(s.min, s.q1 - whisker * (s.q3 - s.q1)) : s.min,
          upperWhisker: s.outliers?.length ? Math.min(s.max, s.q3 + whisker * (s.q3 - s.q1)) : s.max,
          mean: s.mean,
          outliers: s.outliers ?? [],
        });
      });
    } else {
      for (const name of order) {
        const vs = raw.get(name) ?? [];
        const b = boxStats(vs, whisker);
        if (!b) continue;
        groups.push({ group: name, index: groups.length, n: vs.length, ...b, mean: meanOf(vs) });
      }
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const g of groups) {
      lo = Math.min(lo, g.min);
      hi = Math.max(hi, g.max);
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
    return { groups, raw, lo, hi };
  }, [data, group, value, stats, groupOrder, whisker]);
  const { groups } = model;

  // Geometry.
  const H = height ?? (horizontal ? Math.max(160, groups.length * 56 + 40) : 300);
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(160, width);
  const [d0, d1] = domain ? [domain[0], domain[1]] : nice(model.lo, model.hi, 5);
  const valueTicks = niceTicks(d0, d1, horizontal ? Math.max(2, Math.floor(W / 90)) : Math.max(2, Math.round(H / 55)));
  const tickW = Math.max(...valueTicks.map((t) => estimateTextWidth(fmt(t), 10)), 12);
  const groupW = Math.max(...groups.map((g) => estimateTextWidth(g.group, 11)), 12);
  const m = horizontal ? { left: Math.min(160, groupW + 14), right: 16, top: 10, bottom: 26 } : { left: tickW + 14, right: 12, top: 12, bottom: 28 };
  const { vScale, band, at } = React.useMemo(() => {
    const vs = horizontal ? scaleLinear([d0, d1], [m.left, W - m.right]) : scaleLinear([d0, d1], [H - m.bottom, m.top]);
    const bs = scaleBand(
      groups.map((g) => g.group),
      horizontal ? [m.top, H - m.bottom] : [m.left, W - m.right],
      { paddingInner: 0.3, paddingOuter: 0.2 },
    );
    // (category px, value px) -> svg [x, y]
    const toXY = (c: number, v: number): [number, number] => (horizontal ? [v, c] : [c, v]);
    return { vScale: vs, band: bs, at: toXY };
  }, [horizontal, d0, d1, m.left, m.right, m.top, m.bottom, W, H, groups]);
  const bw = band.bandwidth;
  const centerOf = (g: BoxPlotGroup) => band(g.group) + bw / 2;

  const colorOf = (g: BoxPlotGroup) => color ?? (colorByGroup ? categoricalColor(g.index) : categoricalColor(0));

  // Violins and points per group (px space).
  const shapes = React.useMemo(() => {
    return groups.map((g) => {
      const vs = finite(model.raw.get(g.group) ?? []);
      const c = band(g.group) + bw / 2;
      let violin = "";
      let flat = "";
      if (variant !== "box" && vs.length > 1) {
        const pad = (g.max - g.min) * 0.04 || 1;
        const dens = kde(vs, { samples: 48, domain: [g.min - pad, g.max + pad] });
        const peak = Math.max(...dens.map((p) => p[1])) || 1;
        const half = bw * 0.48;
        const side = dens.map(([v, d]) => [vScale(v), (d / peak) * half] as const);
        const outline = [...side.map(([p, w]) => at(c + w, p)), ...[...side].reverse().map(([p, w]) => at(c - w, p))];
        violin = `${linePath(outline, { curve: "linear" })}Z`;
        flat = `${linePath(
          [...side.map(([p]) => at(c, p)), ...[...side].reverse().map(([p]) => at(c, p))],
          { curve: "linear" },
        )}Z`;
      }
      let pts: Array<{ v: number; c: number }> = [];
      if (points !== "none" && vs.length) {
        if (points === "swarm") {
          const px = vs.map((v) => vScale(v));
          const off = dodge(px, { radius: 2.4, padding: 0.6 });
          const lim = bw * 0.48;
          pts = vs.map((v, i) => ({ v, c: c + Math.max(-lim, Math.min(lim, off[i] as number)) }));
        } else {
          const rand = mulberry32(g.index * 7919 + vs.length);
          pts = vs.map((v) => ({ v, c: c + (rand() - 0.5) * bw * (variant === "box" ? 0.7 : 0.5) }));
        }
      }
      return { violin, flat, pts };
    });
  }, [groups, model.raw, variant, points, bw, band, vScale, at]);

  const activeRef = focus ?? hover;
  const activeGroup = activeRef ? (groups[activeRef.g] ?? null) : null;
  const activeOutlier = activeRef && activeGroup && activeRef.o !== null ? (activeGroup.outliers[activeRef.o] ?? null) : null;

  const lastActive = React.useRef<string>("");
  React.useEffect(() => {
    const k = activeGroup ? activeGroup.group : "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveGroupChange?.(activeGroup);
  });

  const describeGroup = (g: BoxPlotGroup) =>
    `${g.group}: median ${fmt(g.median)}, IQR ${fmt(g.q1)} to ${fmt(g.q3)}, ${g.outliers.length} outlier${g.outliers.length === 1 ? "" : "s"}. Group ${g.index + 1} of ${groups.length}.`;

  const selectOutlier = (o: { group: string; value: number }, event: React.PointerEvent | React.KeyboardEvent) => {
    const same = sel && sel.group === o.group && sel.value === o.value;
    if (selectedOutlier === undefined) setInnerSel(same ? null : o);
    onOutlierClick?.(o, event);
    setAnnouncement(same ? "Outlier deselected." : `Selected outlier ${fmt(o.value)} in ${o.group}.`);
  };

  // Pointer.
  const local = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const p = local(event);
    if (!p || !groups.length) return null;
    const cpx = horizontal ? p.y : p.x;
    const vpx = horizontal ? p.x : p.y;
    const name = band.at(cpx);
    const g = groups.find((gr) => gr.group === name);
    if (!g) return null;
    let o: number | null = null;
    let best = 8;
    g.outliers.forEach((v, k) => {
      const d = Math.hypot(vScale(v) - vpx, centerOf(g) - cpx);
      if (d < best) {
        best = d;
        o = k;
      }
    });
    return { g: g.index, o };
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!groups.length || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { g: -1, o: null };
    const nextKey = horizontal ? "ArrowDown" : "ArrowRight";
    const prevKey = horizontal ? "ArrowUp" : "ArrowLeft";
    const outUp = horizontal ? "ArrowRight" : "ArrowUp";
    const outDown = horizontal ? "ArrowLeft" : "ArrowDown";
    let next: { g: number; o: number | null } | null = null;
    if (event.key === nextKey) next = { g: Math.min(groups.length - 1, cur.g + 1), o: null };
    else if (event.key === prevKey) next = { g: cur.g < 0 ? groups.length - 1 : Math.max(0, cur.g - 1), o: null };
    else if (event.key === "Home") next = { g: 0, o: null };
    else if (event.key === "End") next = { g: groups.length - 1, o: null };
    else if ((event.key === outUp || event.key === outDown) && cur.g >= 0) {
      const g = groups[cur.g] as BoxPlotGroup;
      if (!g.outliers.length) {
        event.preventDefault();
        setAnnouncement(`${g.group} has no outliers.`);
        return;
      }
      // Outliers sorted ascending: up walks to higher values.
      const sorted = g.outliers.map((v, k) => ({ v, k })).sort((a, b) => a.v - b.v);
      const pos = cur.o === null ? -1 : sorted.findIndex((s) => s.k === cur.o);
      const np = event.key === outUp ? (pos < 0 ? 0 : Math.min(sorted.length - 1, pos + 1)) : pos < 0 ? sorted.length - 1 : Math.max(0, pos - 1);
      next = { g: cur.g, o: (sorted[np] as { k: number }).k };
    } else if ((event.key === "Enter" || event.key === " ") && focus) {
      event.preventDefault();
      const g = groups[focus.g];
      if (!g) return;
      if (focus.o !== null) selectOutlier({ group: g.group, value: g.outliers[focus.o] as number }, event);
      else onGroupClick?.(g, event);
      return;
    } else if (event.key === "Escape") {
      if (sel && selectedOutlier === undefined) {
        event.preventDefault();
        event.stopPropagation();
        setInnerSel(null);
        setAnnouncement("Outlier deselected.");
      } else if (focus) {
        event.preventDefault();
        setFocus(null);
      }
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    const g = groups[next.g] as BoxPlotGroup;
    setAnnouncement(next.o !== null ? `Outlier ${fmt(g.outliers[next.o] as number)} in ${g.group}, outside ${fmt(g.lowerWhisker)} to ${fmt(g.upperWhisker)}.` : describeGroup(g));
  };

  // Summary.
  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} by group`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!groups.length) return "No data.";
    const byMedian = [...groups].sort((a, b) => b.median - a.median);
    const widest = [...groups].sort((a, b) => b.q3 - b.q1 - (a.q3 - a.q1))[0] as BoxPlotGroup;
    const outliers = groups.reduce((s, g) => s + g.outliers.length, 0);
    const hiG = byMedian[0] as BoxPlotGroup;
    const loG = byMedian[byMedian.length - 1] as BoxPlotGroup;
    return `${groups.length} groups of ${label.toLowerCase()}. Highest median ${hiG.group} (${fmt(hiG.median)}), lowest ${loG.group} (${fmt(loG.median)}). Widest spread ${widest.group} (IQR ${fmt(widest.q1)} to ${fmt(widest.q3)}). ${outliers} outlier${outliers === 1 ? "" : "s"} in total.`;
  })();

  // Tooltip.
  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  if (activeGroup) {
    const c = centerOf(activeGroup);
    const v = vScale(activeOutlier ?? activeGroup.upperWhisker);
    const [tx, ty] = at(horizontal ? c - bw / 2 : c, horizontal ? v + 8 : v);
    tip = horizontal ? { left: tx / W, top: Math.max(0, ty) / H, flipX: tx / W > 0.6, below: ty < 80 } : { left: tx / W, top: ty / H, flipX: tx / W > 0.62, below: ty < 110 };
  }

  const spring = anim.updates ? chartMotion.layout : instant;
  const t = (delay = 0): Transition => (anim.reducedMotion ? instant : { ...spring, delay: anim.entrance ? delay : 0 });

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Value grid + labels */}
          {valueTicks.map((tk) => {
            const p = vScale(tk);
            return horizontal ? (
              <g key={tk}>
                <line x1={p} x2={p} y1={m.top} y2={H - m.bottom} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
                <text x={p} y={H - m.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                  {fmt(tk)}
                </text>
              </g>
            ) : (
              <g key={tk}>
                <line x1={m.left} x2={W - m.right} y1={p} y2={p} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
                <text x={m.left - 8} y={p} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                  {fmt(tk)}
                </text>
              </g>
            );
          })}
          {/* Active group band + its median carried across all groups */}
          {activeGroup ? (
            <g pointerEvents="none">
              {horizontal ? (
                <rect x={m.left} y={band(activeGroup.group) - bw * 0.12} width={W - m.left - m.right} height={bw * 1.24} rx={6} fill="var(--pui-muted)" opacity={0.6} />
              ) : (
                <rect x={band(activeGroup.group) - bw * 0.12} y={m.top} width={bw * 1.24} height={H - m.top - m.bottom} rx={6} fill="var(--pui-muted)" opacity={0.6} />
              )}
              {(() => {
                const p = vScale(activeGroup.median);
                const [ax, ay] = at(horizontal ? m.top : m.left, p);
                const [bx, by] = at(horizontal ? H - m.bottom : W - m.right, p);
                return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={colorOf(activeGroup)} strokeWidth={1} strokeDasharray="4 4" opacity={0.9} />;
              })()}
            </g>
          ) : null}
          {groups.map((g, gi) => {
            const c = centerOf(g);
            const col = colorOf(g);
            const shape = shapes[gi];
            const dim = activeGroup !== null && activeGroup.group !== g.group;
            const boxW = variant === "both" ? Math.min(18, bw * 0.2) : Math.min(56, bw * 0.55);
            const q1 = vScale(g.q1);
            const q3 = vScale(g.q3);
            const med = vScale(g.median);
            const lo = Math.min(q1, q3);
            const len = Math.abs(q3 - q1);
            const wLo = vScale(g.lowerWhisker);
            const wHi = vScale(g.upperWhisker);
            const delay = gi * 0.06;
            const rect = horizontal
              ? { x: lo, y: c - boxW / 2, width: Math.max(1, len), height: boxW }
              : { x: c - boxW / 2, y: lo, width: boxW, height: Math.max(1, len) };
            const collapsed = horizontal ? { x: med, y: c - boxW / 2, width: 0.01, height: boxW } : { x: c - boxW / 2, y: med, width: boxW, height: 0.01 };
            const cap = boxW * 0.45;
            const seg = (a: [number, number], b: [number, number]) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
            return (
              <motion.g key={g.group} initial={false} animate={{ opacity: dim ? 0.4 : 1 }} transition={anim.reducedMotion ? instant : chartMotion.fade}>
                {/* Violin */}
                {shape?.violin ? (
                  <motion.path
                    initial={anim.entrance ? { d: shape.flat } : false}
                    animate={{ d: shape.violin }}
                    transition={t(delay)}
                    fill={withOpacity(col, variant === "both" ? 0.22 : 0.32)}
                    stroke={col}
                    strokeWidth={1.25}
                    strokeLinejoin="round"
                  />
                ) : null}
                {/* Raw points */}
                {shape?.pts.map((p, k) => {
                  const [px, py] = at(p.c, vScale(p.v));
                  return (
                    <motion.circle
                      key={k}
                      r={points === "swarm" ? 2.4 : 2}
                      initial={anim.entrance ? { cx: px, cy: py, opacity: 0 } : false}
                      animate={{ cx: px, cy: py, opacity: 0.55 }}
                      transition={anim.reducedMotion ? instant : { ...spring, opacity: { duration: 0.3, delay: anim.entrance ? delay + 0.3 + Math.min(0.4, k * 0.004) : 0 } }}
                      fill={col}
                    />
                  );
                })}
                {/* Whiskers */}
                {variant !== "violin" ? (
                  <motion.g initial={anim.entrance ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={anim.reducedMotion ? instant : { duration: 0.3, delay: anim.entrance ? delay + 0.25 : 0 }}>
                    <motion.line initial={false} animate={seg(at(c, wLo), at(c, q1))} transition={t()} stroke={col} strokeWidth={1.5} />
                    <motion.line initial={false} animate={seg(at(c, wHi), at(c, q3))} transition={t()} stroke={col} strokeWidth={1.5} />
                    <motion.line initial={false} animate={seg(at(c - cap, wLo), at(c + cap, wLo))} transition={t()} stroke={col} strokeWidth={1.5} strokeLinecap="round" />
                    <motion.line initial={false} animate={seg(at(c - cap, wHi), at(c + cap, wHi))} transition={t()} stroke={col} strokeWidth={1.5} strokeLinecap="round" />
                  </motion.g>
                ) : null}
                {/* Box, grown outward from the median */}
                {variant !== "violin" ? (
                  <motion.rect
                    initial={anim.entrance ? collapsed : false}
                    animate={rect}
                    transition={anim.reducedMotion ? instant : { ...chartMotion.size, delay: anim.entrance ? delay : 0 }}
                    rx={Math.min(5, boxW / 4)}
                    fill={variant === "both" ? "var(--pui-background)" : withOpacity(col, 0.22)}
                    stroke={col}
                    strokeWidth={1.75}
                  />
                ) : null}
                {/* Median */}
                <motion.line
                  initial={false}
                  animate={seg(at(c - (variant === "violin" ? bw * 0.18 : boxW / 2), med), at(c + (variant === "violin" ? bw * 0.18 : boxW / 2), med))}
                  transition={t()}
                  stroke={variant === "violin" ? "var(--pui-foreground)" : col}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Mean */}
                {showMean && g.mean !== undefined ? (
                  (() => {
                    const [mx, my] = at(c, vScale(g.mean));
                    const diamond = `M${mx},${my - 4}L${mx + 4},${my}L${mx},${my + 4}L${mx - 4},${my}Z`;
                    return (
                      <motion.path
                        initial={anim.entrance ? { d: diamond, opacity: 0 } : false}
                        animate={{ d: diamond, opacity: 1 }}
                        transition={anim.reducedMotion ? instant : { d: spring, opacity: { duration: 0.3, delay: anim.entrance ? delay + 0.35 : 0 } }}
                        fill="var(--pui-background)"
                        stroke="var(--pui-foreground)"
                        strokeWidth={1.25}
                      />
                    );
                  })()
                ) : null}
                {/* Outliers */}
                {g.outliers.map((v, k) => {
                  const [ox, oy] = at(c, vScale(v));
                  const isSel = !!sel && sel.group === g.group && sel.value === v;
                  const isActive = activeRef?.g === gi && activeRef.o === k;
                  return (
                    <g key={k}>
                      {isSel || isActive ? <circle cx={ox} cy={oy} r={7} fill="none" stroke={isSel ? "var(--pui-ring, var(--pui-primary))" : col} strokeWidth={2} /> : null}
                      <motion.circle
                        initial={anim.entrance ? { cx: ox, cy: oy, scale: 0 } : false}
                        animate={{ cx: ox, cy: oy, scale: 1 }}
                        transition={anim.reducedMotion ? instant : { ...spring, scale: { type: "spring", stiffness: 400, damping: 18, delay: anim.entrance ? delay + 0.4 : 0 } }}
                        r={3.5}
                        fill={isSel ? col : "var(--pui-background)"}
                        stroke={col}
                        strokeWidth={1.5}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    </g>
                  );
                })}
              </motion.g>
            );
          })}
          {/* Group labels */}
          {groups.map((g) => {
            const c = centerOf(g);
            const on = activeGroup?.group === g.group;
            return horizontal ? (
              <text key={g.group} x={m.left - 10} y={c} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={on ? 700 : 500} fill={on ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                {g.group}
              </text>
            ) : (
              <text key={g.group} x={c} y={H - m.bottom + 18} textAnchor="middle" fontSize={11} fontWeight={on ? 700 : 500} fill={on ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                {g.group}
              </text>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to move between groups and outliers.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={(event) => setHover(pick(event))}
          onPointerLeave={() => setHover(null)}
          onPointerUp={(event) => {
            const p = pick(event);
            if (!p) return;
            const g = groups[p.g];
            if (!g) return;
            if (p.o !== null) selectOutlier({ group: g.group, value: g.outliers[p.o] as number }, event);
            else onGroupClick?.(g, event);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover?.o !== null && hover ? "cursor-pointer" : "cursor-default")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activeGroup ? (
            activeOutlier !== null ? (
              <>
                <div className={cn(blockReset, "mb-1 text-[11px] font-semibold text-pui-muted-foreground")}>{activeGroup.group} &middot; outlier</div>
                <TipRow swatch={colorOf(activeGroup)} label={label} value={fmt(activeOutlier)} />
                <TipRow
                  label="vs median"
                  value={`${activeOutlier > activeGroup.median ? "+" : "\u2212"}${fmt(Math.abs(activeOutlier - activeGroup.median))}`}
                  tone={activeOutlier > activeGroup.median ? "up" : "down"}
                />
                <TipRow label="Fence" value={`${fmt(activeGroup.lowerWhisker)} \u2013 ${fmt(activeGroup.upperWhisker)}`} tone="muted" />
              </>
            ) : (
              <>
                <div className={cn(blockReset, "mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold")}>
                  <span className={cn(blockReset, "flex items-center gap-1.5")}>
                    <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf(activeGroup) }} />
                    {activeGroup.group}
                  </span>
                  {activeGroup.n ? <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>n = {countFmt.format(activeGroup.n)}</span> : null}
                </div>
                {/* A mini five-number ruler */}
                <svg viewBox="0 0 120 14" className="mb-1 block h-3.5 w-full" aria-hidden="true">
                  {(() => {
                    const s = scaleLinear([activeGroup.min, activeGroup.max === activeGroup.min ? activeGroup.min + 1 : activeGroup.max], [3, 117]);
                    const colr = colorOf(activeGroup);
                    return (
                      <>
                        <line x1={s(activeGroup.lowerWhisker)} x2={s(activeGroup.upperWhisker)} y1={7} y2={7} stroke={colr} strokeWidth={1.25} />
                        <rect x={s(activeGroup.q1)} y={2} width={Math.max(1, s(activeGroup.q3) - s(activeGroup.q1))} height={10} rx={2} fill={withOpacity(colr, 0.25)} stroke={colr} />
                        <line x1={s(activeGroup.median)} x2={s(activeGroup.median)} y1={1} y2={13} stroke={colr} strokeWidth={2} />
                      </>
                    );
                  })()}
                </svg>
                <TipRow label="Max" value={fmt(activeGroup.upperWhisker)} tone="muted" />
                <TipRow label="Q3" value={fmt(activeGroup.q3)} />
                <TipRow label="Median" value={fmt(activeGroup.median)} />
                <TipRow label="Q1" value={fmt(activeGroup.q1)} />
                <TipRow label="Min" value={fmt(activeGroup.lowerWhisker)} tone="muted" />
                <div className={cn(blockReset, "my-1 border-t border-pui-chart-tooltip-border")} />
                <TipRow label="IQR" value={fmt(activeGroup.q3 - activeGroup.q1)} />
                {activeGroup.mean !== undefined ? <TipRow label="Mean" value={fmt(activeGroup.mean)} /> : null}
                <TipRow label="Outliers" value={countFmt.format(activeGroup.outliers.length)} tone={activeGroup.outliers.length ? "down" : "muted"} />
              </>
            )
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} /> : null}
      <span id={`${uid}-help`} className="sr-only">
        {horizontal ? "Up and down arrows move between groups; left and right walk the outliers." : "Left and right arrows move between groups; up and down walk the outliers."} Enter selects, Escape clears, T shows the data table.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["Group", "n", "Min", "Q1", "Median", "Q3", "Max", "Outliers"]}
        rows={groups.map((g) => [g.group, g.n ? countFmt.format(g.n) : "", fmt(g.min), fmt(g.q1), fmt(g.median), fmt(g.q3), fmt(g.max), g.outliers.map(fmt).join(", ")])}
      />
    </ChartFigure>
  );
}

/**
 * Box plot, violin or both, from raw values or quartiles, with beeswarm points, Tukey outliers,
 * a five-number tooltip, cross-group median guides and keyboard outlier exploration.
 */
export const BoxPlot = React.forwardRef(BoxPlotInner) as (<T>(props: BoxPlotProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
BoxPlot.displayName = "BoxPlot";
