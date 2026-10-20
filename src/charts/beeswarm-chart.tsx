"use client";

// Beeswarm chart: every data point stays visible. Points keep their exact value on the axis and
// get the smallest offset that clears their neighbours (the core's deterministic dodge), so a
// distribution reads as a shape without hiding a single row. Optional group rows, size and color
// encodings, quartile guides, a hover spotlight with a percentile tooltip, a drag brush along the
// value axis (count, share and median of the selection), and keyboard walking in sorted order.
// Points fly from the axis to their places on entrance and glide on updates.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { dodge } from "./core/dodge";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartChips, ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, toggleHidden, useChartUid } from "./core/frame";
import { scaleLinear, scaleSqrt } from "./core/scale";
import { quantileSorted } from "./core/stats";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface BeeswarmPoint<T> {
  datum: T;
  /** Index in `data`. */
  index: number;
  value: number;
  group: string;
  category: string | null;
  name: string | null;
  size: number | null;
}

export interface BeeswarmChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  /** The measure (position on the axis). */
  value: Accessor<T, number | null | undefined>;
  /** Optional rows: one swarm per group. */
  group?: Accessor<T, string | number>;
  groupOrder?: readonly (string | number)[];
  /** Color category (adds legend chips that toggle categories). */
  color?: Accessor<T, string | number>;
  /** Explicit color per category. Default: the categorical palette. */
  colors?: Record<string, string>;
  /** Size encoding (circle area). */
  size?: Accessor<T, number | null | undefined>;
  /** Point name for tooltips and announcements. */
  name?: Accessor<T, string>;
  /** Stable key per row, so updates glide instead of reshuffling. Default: the index. */
  rowKey?: Accessor<T, string | number>;
  /** Circle radius in px (the largest when `size` is set). Default 4. Shrinks to fit the rows. */
  radius?: number;
  /** Gap between circles in px. Default 1. */
  padding?: number;
  /** Median and interquartile guides on the axis of each row. Default true. */
  showQuartiles?: boolean;
  /** Dashed reference lines. */
  references?: ReadonlyArray<{ value: number; label?: string }>;
  domain?: readonly [number, number];
  /** Name of the measure ("Latency"). */
  label?: string;
  format?: NumberFormat;
  locale?: string;
  /** Allow dragging a range on the value axis. Default true. */
  brush?: boolean;
  /** Controlled brush range. */
  selection?: readonly [number, number] | null;
  defaultSelection?: readonly [number, number] | null;
  onSelectionChange?: (range: [number, number] | null, points: BeeswarmPoint<T>[]) => void;
  onPointClick?: (point: BeeswarmPoint<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  /** Height of one row in px. Default 120 (one row: 200). */
  rowHeight?: number;
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  summary?: string;
  chartLabel?: string;
}

interface Placed {
  i: number;
  cx: number;
  cy: number;
  r: number;
  row: number;
}

function BeeswarmChartInner<T>(props: BeeswarmChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    value,
    group,
    groupOrder,
    color,
    colors,
    size,
    name,
    rowKey,
    radius = 4,
    padding = 1,
    showQuartiles = true,
    references,
    domain,
    label = "Value",
    format,
    locale = "en-US",
    brush = true,
    selection: selectionProp,
    defaultSelection = null,
    onSelectionChange,
    onPointClick,
    rowHeight,
    height,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);

  // Rows of points.
  const model = React.useMemo(() => {
    const points: BeeswarmPoint<T>[] = [];
    const groups: string[] = groupOrder ? groupOrder.map(String) : [];
    const cats: string[] = [];
    data.forEach((d, i) => {
      const v = readAccessor(value, d, i);
      if (typeof v !== "number" || !Number.isFinite(v)) return;
      const g = group ? String(readAccessor(group, d, i)) : "";
      if (!groups.includes(g)) {
        if (groupOrder) return;
        groups.push(g);
      }
      const c = color ? String(readAccessor(color, d, i)) : null;
      if (c !== null && !cats.includes(c)) cats.push(c);
      const s = size ? readAccessor(size, d, i) : null;
      points.push({ datum: d, index: i, value: v, group: g, category: c, name: name ? readAccessor(name, d, i) : null, size: typeof s === "number" && Number.isFinite(s) ? s : null });
    });
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      if (p.value < lo) lo = p.value;
      if (p.value > hi) hi = p.value;
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
    // Sorted indices (into points) per row, for keyboard order and quartiles.
    const byRow = groups.map((g) => points.map((p, k) => ({ p, k })).filter((d) => d.p.group === g).sort((a, b) => a.p.value - b.p.value || a.p.index - b.p.index).map((d) => d.k));
    return { points, groups, cats, lo, hi, byRow };
  }, [data, value, group, groupOrder, color, size, name]);
  const { points, groups, cats, byRow } = model;
  const keyOf = (p: BeeswarmPoint<T>) => (rowKey ? String(readAccessor(rowKey, p.datum, p.index)) : String(p.index));

  const catColor = React.useCallback((c: string | null) => (c === null ? categoricalColor(0) : (colors?.[c] ?? categoricalColor(model.cats.indexOf(c)))), [colors, model.cats]);
  const [hiddenCats, setHiddenCats] = React.useState<ReadonlySet<string>>(() => new Set());
  const [chipHover, setChipHover] = React.useState<string | null>(null);

  const multi = groups.length > 1 || (groups[0] ?? "") !== "";
  const rowH = rowHeight ?? (groups.length > 1 ? 120 : 200);
  const m = { top: 14, bottom: 28, right: 18, left: multi ? Math.min(150, Math.max(...groups.map((g) => estimateTextWidth(g, 11)), 12) + 18) : 18 };
  const H = height ?? Math.max(140, groups.length * rowH + m.top + m.bottom);
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(220, width);
  const [d0, d1] = domain ? [domain[0], domain[1]] : nice(model.lo, model.hi, 6);
  const xScale = React.useMemo(() => scaleLinear([d0, d1], [m.left, W - m.right]), [d0, d1, m.left, m.right, W]);
  const bandH = (H - m.top - m.bottom) / Math.max(1, groups.length);
  const rowCenter = (row: number) => m.top + bandH * (row + 0.5);

  // Dodge per row; shrink the radius until every swarm fits its row.
  const placed: Placed[] = React.useMemo(() => {
    const sizes = points.map((p) => p.size).filter((s): s is number => s !== null);
    const smax = sizes.length ? Math.max(...sizes) : 1;
    const half = bandH / 2 - 2;
    let k = 1;
    let out: Placed[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const rOf = size ? scaleSqrt([0, smax || 1], [Math.max(1.5, radius * 0.3 * k), radius * k]) : null;
      out = new Array<Placed>(points.length);
      let worst = 0;
      byRow.forEach((idx, row) => {
        const xs = idx.map((pi) => xScale((points[pi] as BeeswarmPoint<T>).value));
        const radii = idx.map((pi) => {
          const s = (points[pi] as BeeswarmPoint<T>).size;
          return rOf && s !== null ? rOf(Math.max(0, s)) : radius * k;
        });
        const off = dodge(xs, { radius: size ? radii : radius * k, padding });
        const cy = rowCenter(row);
        idx.forEach((pi, j) => {
          const o = off[j] as number;
          const r = radii[j] as number;
          worst = Math.max(worst, Math.abs(o) + r);
          out[pi] = { i: pi, cx: xs[j] as number, cy: cy - o, r, row };
        });
      });
      if (worst <= half || k < 0.3) break;
      k *= Math.max(0.55, Math.sqrt(half / worst));
    }
    return out;
    // rowCenter depends on bandH and m.top only.
  }, [points, byRow, xScale, radius, padding, size, bandH, m.top]);

  // Brush selection.
  const [innerSel, setInnerSel] = React.useState<readonly [number, number] | null>(defaultSelection);
  const sel = selectionProp !== undefined ? selectionProp : innerSel;
  const inSel = (v: number) => !sel || (v >= Math.min(sel[0], sel[1]) && v <= Math.max(sel[0], sel[1]));
  const setSel = (r: readonly [number, number] | null) => {
    const norm: [number, number] | null = r ? [Math.min(r[0], r[1]), Math.max(r[0], r[1])] : null;
    if (selectionProp === undefined) setInnerSel(norm);
    const chosen = norm ? points.filter((p) => p.value >= norm[0] && p.value <= norm[1] && !(p.category !== null && hiddenCats.has(p.category))) : [];
    onSelectionChange?.(norm, chosen);
    setAnnouncement(norm ? `Selected ${chosen.length} of ${points.length} points, ${fmt(norm[0])} to ${fmt(norm[1])}.` : "Selection cleared.");
  };
  const dragRef = React.useRef<{ x0: number; moved: boolean } | null>(null);
  const [drag, setDrag] = React.useState<[number, number] | null>(null);

  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activePoint = active !== null ? (points[active] ?? null) : null;

  const visible = (p: BeeswarmPoint<T>) => !(p.category !== null && hiddenCats.has(p.category));
  const percentile = (pi: number) => {
    const p = points[pi] as BeeswarmPoint<T>;
    const row = groups.indexOf(p.group);
    const list = byRow[row] ?? [];
    const pos = list.indexOf(pi);
    return list.length > 1 ? pos / (list.length - 1) : 1;
  };
  const describe = (pi: number) => {
    const p = points[pi] as BeeswarmPoint<T>;
    const row = groups.indexOf(p.group);
    const list = byRow[row] ?? [];
    return `${p.name ?? label}: ${fmt(p.value)}${multi ? `, ${p.group}` : ""}${p.category !== null ? `, ${p.category}` : ""}. ${ordinalPct(percentile(pi))} percentile. Point ${list.indexOf(pi) + 1} of ${list.length}.`;
  };

  const pick = (x: number, y: number) => {
    let best = Infinity;
    let at: number | null = null;
    for (const q of placed) {
      if (!q) continue;
      const p = points[q.i] as BeeswarmPoint<T>;
      if (!visible(p)) continue;
      const d = Math.hypot(q.cx - x, q.cy - y) - q.r;
      if (d < best) {
        best = d;
        at = q.i;
      }
    }
    return best <= 6 ? at : null;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!brush || (event.pointerType === "mouse" && event.button !== 0)) return;
    const pt = pointerIn(event, W, H);
    if (!pt) return;
    dragRef.current = { x0: pt.x, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pt = pointerIn(event, W, H);
    if (!pt) return;
    const dr = dragRef.current;
    if (dr) {
      if (Math.abs(pt.x - dr.x0) > 4) dr.moved = true;
      if (dr.moved) {
        const clamp = (v: number) => Math.max(m.left, Math.min(W - m.right, v));
        setDrag([clamp(dr.x0), clamp(pt.x)]);
        setHover(null);
        return;
      }
    }
    setHover(pick(pt.x, pt.y));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dr = dragRef.current;
    dragRef.current = null;
    if (dr?.moved && drag) {
      setSel([xScale.invert(drag[0]), xScale.invert(drag[1])]);
      setDrag(null);
      return;
    }
    setDrag(null);
    const pt = pointerIn(event, W, H);
    const hit = pt ? pick(pt.x, pt.y) : null;
    if (hit !== null) onPointClick?.(points[hit] as BeeswarmPoint<T>, event);
    else if (sel && selectionProp === undefined && dr) setSel(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!points.length || event.metaKey || event.ctrlKey) return;
    const vis = byRow.map((list) => list.filter((pi) => visible(points[pi] as BeeswarmPoint<T>)));
    const curRow = focus !== null ? groups.indexOf((points[focus] as BeeswarmPoint<T>).group) : -1;
    const list = vis[Math.max(0, curRow)] ?? [];
    const pos = focus !== null ? list.indexOf(focus) : -1;
    const jump = Math.max(1, Math.round(list.length / 10));
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = list[pos < 0 ? 0 : Math.min(list.length - 1, pos + 1)] ?? null;
        break;
      case "ArrowLeft":
        next = list[pos < 0 ? list.length - 1 : Math.max(0, pos - 1)] ?? null;
        break;
      case "PageDown":
        next = list[Math.min(list.length - 1, Math.max(0, pos) + jump)] ?? null;
        break;
      case "PageUp":
        next = list[Math.max(0, pos - jump)] ?? null;
        break;
      case "Home":
        next = list[0] ?? null;
        break;
      case "End":
        next = list[list.length - 1] ?? null;
        break;
      case "ArrowDown":
      case "ArrowUp": {
        if (groups.length < 2) return;
        const nr = Math.max(0, Math.min(groups.length - 1, (curRow < 0 ? 0 : curRow) + (event.key === "ArrowDown" ? 1 : -1)));
        const target = focus !== null ? (points[focus] as BeeswarmPoint<T>).value : -Infinity;
        const nl = vis[nr] ?? [];
        let best = Infinity;
        for (const pi of nl) {
          const d = Math.abs((points[pi] as BeeswarmPoint<T>).value - target);
          if (d < best) {
            best = d;
            next = pi;
          }
        }
        break;
      }
      case "Enter":
      case " ":
        if (focus !== null) {
          event.preventDefault();
          onPointClick?.(points[focus] as BeeswarmPoint<T>, event);
        }
        return;
      case "Escape":
        if (sel && selectionProp === undefined) {
          event.preventDefault();
          event.stopPropagation();
          setSel(null);
        } else if (focus !== null) {
          event.preventDefault();
          setFocus(null);
        }
        return;
      case "t":
      case "T":
        event.preventDefault();
        setTableVisible((v) => !v);
        return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next));
  };

  // Row stats.
  const rowStats = byRow.map((list) => {
    const vs = list.map((pi) => (points[pi] as BeeswarmPoint<T>).value).filter((_, j) => visible(points[list[j] as number] as BeeswarmPoint<T>));
    return { n: vs.length, q1: quantileSorted(vs, 0.25), median: quantileSorted(vs, 0.5), q3: quantileSorted(vs, 0.75) };
  });

  const selected = sel ? points.filter((p) => visible(p) && inSel(p.value)) : [];
  const selMedian = sel ? quantileSorted(selected.map((p) => p.value).sort((a, b) => a - b), 0.5) : undefined;
  const visibleCount = points.filter(visible).length;

  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} distribution`);
  const summaryText =
    summary ??
    (points.length
      ? `Beeswarm of ${points.length} points of ${label.toLowerCase()}${multi ? ` in ${groups.length} groups` : ""}. ${groups
          .map((g, row) => {
            const s = rowStats[row];
            return s && s.median !== undefined ? `${multi ? `${g}: ` : ""}median ${fmt(s.median)}, IQR ${fmt(s.q1 ?? 0)} to ${fmt(s.q3 ?? 0)} (n = ${s.n})` : "";
          })
          .filter(Boolean)
          .join("; ")}.`
      : "No data.");

  const xTicks = niceTicks(d0, d1, Math.max(2, Math.floor((W - m.left - m.right) / 90)));
  const fade = anim.reducedMotion ? instant : chartMotion.fade;
  const spring = anim.reducedMotion ? instant : chartMotion.layout;

  // Order for the entrance stagger: by x.
  const entranceRank = React.useMemo(() => {
    const order = placed.map((q, k) => ({ k, x: q ? q.cx : 0 })).sort((a, b) => a.x - b.x);
    const r = new Array<number>(placed.length);
    order.forEach((o, j) => {
      r[o.k] = j;
    });
    return r;
  }, [placed]);

  let tip: { left: number; top: number; flipX: boolean; below: boolean } | null = null;
  const aq = active !== null ? placed[active] : undefined;
  if (aq && !drag) tip = { left: aq.cx / W, top: (aq.cy - aq.r - 4) / H, flipX: aq.cx / W > 0.62, below: aq.cy < 110 };

  const brushPx = drag ?? (sel ? [xScale(sel[0]), xScale(sel[1])] : null);

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {cats.length ? (
        <ChartChips
          chips={cats.map((c) => ({ id: c, label: c, color: catColor(c), meta: points.filter((p) => p.category === c).length }))}
          hidden={hiddenCats}
          onToggle={(c, solo) => setHiddenCats((prev) => toggleHidden(prev, cats, c, solo))}
          onHover={setChipHover}
          active={chipHover}
          reducedMotion={anim.reducedMotion}
          label="Categories"
        />
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {xTicks.map((tk) => (
            <g key={tk}>
              <line x1={xScale(tk)} x2={xScale(tk)} y1={m.top} y2={H - m.bottom} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={xScale(tk)} y={H - m.bottom + 17} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {fmt(tk)}
              </text>
            </g>
          ))}
          {/* Rows: label, axis, quartile guides */}
          {groups.map((g, row) => {
            const cy = rowCenter(row);
            const s = rowStats[row];
            const on = activePoint?.group === g;
            return (
              <g key={g || "all"}>
                {row > 0 ? <line x1={m.left} x2={W - m.right} y1={m.top + bandH * row} y2={m.top + bandH * row} stroke="var(--pui-border)" /> : null}
                {multi ? (
                  <text x={m.left - 12} y={cy} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={on ? 700 : 500} fill={on ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                    {g}
                  </text>
                ) : null}
                {showQuartiles && s && s.median !== undefined && s.q1 !== undefined && s.q3 !== undefined ? (
                  <g pointerEvents="none">
                    <motion.rect
                      initial={false}
                      animate={{ x: xScale(s.q1), width: Math.max(1, xScale(s.q3) - xScale(s.q1)) }}
                      transition={spring}
                      y={cy - bandH / 2 + 3}
                      height={bandH - 6}
                      rx={6}
                      fill="var(--pui-muted)"
                      opacity={0.5}
                    />
                    <motion.line initial={false} animate={{ x1: xScale(s.median), x2: xScale(s.median) }} transition={spring} y1={cy - bandH / 2 + 3} y2={cy + bandH / 2 - 3} stroke="var(--pui-foreground)" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 3" />
                  </g>
                ) : null}
              </g>
            );
          })}
          {references?.map((r) => (
            <g key={`${r.value}-${r.label ?? ""}`} pointerEvents="none">
              <line x1={xScale(r.value)} x2={xScale(r.value)} y1={m.top} y2={H - m.bottom} stroke="var(--pui-muted-foreground)" strokeDasharray="5 4" strokeWidth={1.25} />
              {r.label ? (
                <text x={xScale(r.value) + 4} y={m.top + 10} fontSize={10} fontWeight={600} fill="var(--pui-muted-foreground)">
                  {r.label}
                </text>
              ) : null}
            </g>
          ))}
          {/* Brush */}
          {brushPx ? (
            <rect
              x={Math.min(brushPx[0], brushPx[1])}
              y={m.top}
              width={Math.abs(brushPx[1] - brushPx[0])}
              height={H - m.top - m.bottom}
              rx={4}
              fill="var(--pui-primary)"
              fillOpacity={0.1}
              stroke="var(--pui-primary)"
              strokeOpacity={0.6}
              strokeDasharray="4 3"
            />
          ) : null}
          {/* Points */}
          <g>
            {placed.map((q, k) => {
              if (!q) return null;
              const p = points[k] as BeeswarmPoint<T>;
              const col = catColor(p.category);
              const show = visible(p);
              const isActive = active === k;
              let opacity = show ? 0.85 : 0;
              if (show && brushPx) {
                const a = Math.min(brushPx[0], brushPx[1]);
                const b = Math.max(brushPx[0], brushPx[1]);
                if (q.cx < a || q.cx > b) opacity = 0.18;
              }
              if (show && chipHover !== null && p.category !== chipHover) opacity = Math.min(opacity, 0.15);
              if (show && activePoint && !isActive) opacity = Math.min(opacity, activePoint.category !== null && activePoint.category === p.category ? 0.85 : 0.4);
              const delay = anim.entrance ? Math.min(0.6, (entranceRank[k] ?? 0) * 0.002) : 0;
              return (
                <motion.circle
                  key={keyOf(p)}
                  initial={anim.entrance ? { cx: q.cx, cy: rowCenter(q.row), r: q.r, opacity: 0 } : false}
                  animate={{ cx: q.cx, cy: q.cy, r: isActive ? q.r + 1.5 : q.r, opacity }}
                  transition={anim.reducedMotion ? instant : { cx: spring, cy: { ...spring, delay }, r: chartMotion.hover, opacity: anim.entrance ? { duration: 0.25, delay } : fade }}
                  fill={col}
                  stroke={isActive ? "var(--pui-foreground)" : withOpacity("var(--pui-background)", 0.7)}
                  strokeWidth={isActive ? 1.5 : 0.75}
                />
              );
            })}
          </g>
          {aq ? <circle cx={aq.cx} cy={aq.cy} r={aq.r + 4} fill="none" stroke="var(--pui-ring, var(--pui-primary))" strokeWidth={2} pointerEvents="none" /> : null}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Left and right arrows walk points in sorted order${groups.length > 1 ? ", up and down change rows" : ""}.${brush ? " Drag to select a range." : ""}`}
          aria-describedby={`${uid}-summary`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            if (!dragRef.current) setHover(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md", hover !== null ? "cursor-pointer" : brush ? "cursor-crosshair" : "cursor-default")}
          style={{ touchAction: brush ? "none" : "pan-y" }}
        />
        {sel ? (
          <div className={cn(blockReset, "absolute right-2 top-2 z-10 flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface/90 py-1 pl-3 pr-1 text-[11px] shadow-pui-sm backdrop-blur")}>
            <span className={cn(blockReset, "tabular-nums")}>
              <strong className="font-semibold">{selected.length}</strong> selected ({pctFmt.format(visibleCount ? selected.length / visibleCount : 0)})
              {selMedian !== undefined ? <span className="text-pui-muted-foreground"> &middot; median {fmt(selMedian)}</span> : null}
            </span>
            {selectionProp === undefined ? (
              <button type="button" onClick={() => setSel(null)} className={cn(controlReset, focusRing, "rounded-pui-full px-2 py-0.5 text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground")}>
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} below={tip?.below} reducedMotion={anim.reducedMotion}>
          {activePoint && active !== null ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold")}>
                <span className={cn(blockReset, "flex items-center gap-1.5")}>
                  <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-full")} style={{ background: catColor(activePoint.category) }} />
                  {activePoint.name ?? label}
                </span>
                {multi ? <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>{activePoint.group}</span> : null}
              </div>
              <TipRow label={label} value={fmt(activePoint.value)} />
              {activePoint.category !== null ? <TipRow label="Category" value={activePoint.category} tone="muted" /> : null}
              {activePoint.size !== null ? <TipRow label="Size" value={fmt(activePoint.size)} tone="muted" /> : null}
              {(() => {
                const s = rowStats[groups.indexOf(activePoint.group)];
                return s?.median !== undefined ? (
                  <TipRow
                    label="vs median"
                    value={`${activePoint.value >= s.median ? "+" : "\u2212"}${fmt(Math.abs(activePoint.value - s.median))}`}
                    tone={activePoint.value >= s.median ? "up" : "down"}
                  />
                ) : null;
              })()}
              <div className={cn(blockReset, "mt-1.5 flex items-center gap-2 text-[10px] text-pui-muted-foreground")}>
                <span className={cn(blockReset, "relative h-1.5 flex-1 overflow-hidden rounded-full bg-pui-muted")}>
                  <span className={cn(blockReset, "absolute inset-y-0 left-0 rounded-full")} style={{ width: `${percentile(active) * 100}%`, background: catColor(activePoint.category) }} />
                </span>
                {ordinalPct(percentile(active))} pct
              </div>
            </>
          ) : null}
        </ChartTip>
      </div>
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={nameText}
          columns={[name ? "Name" : "#", ...(multi ? ["Group"] : []), ...(cats.length ? ["Category"] : []), label]}
          rows={points.map((p, k) => [p.name ?? String(k + 1), ...(multi ? [p.group] : []), ...(cats.length ? [p.category ?? ""] : []), fmt(p.value)])}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

function ordinalPct(t: number): string {
  const n = Math.round(t * 100);
  const mod10 = n % 10;
  const mod100 = n % 100;
  const suffix = mod10 === 1 && mod100 !== 11 ? "st" : mod10 === 2 && mod100 !== 12 ? "nd" : mod10 === 3 && mod100 !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

/**
 * Beeswarm: every point visible without overlap (deterministic dodge), optional group rows, size
 * and color encodings, quartile guides, hover spotlight, a drag brush with selection stats and
 * keyboard walking in sorted order.
 */
export const BeeswarmChart = React.forwardRef(BeeswarmChartInner) as (<T>(props: BeeswarmChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
BeeswarmChart.displayName = "BeeswarmChart";
