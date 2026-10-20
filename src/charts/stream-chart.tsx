"use client";

// Stream chart: a streamgraph of many layers over time. Layers stack around a wiggle (or
// silhouette, expand or zero) baseline in inside-out order, labels sit inside each layer at its
// widest point, and hovering a layer isolates it while an axis crosshair lists every layer at that
// x with its share. Legend toggles collapse a layer's weight so the others re-flow smoothly, and
// the keyboard walks points (left/right) and layers (up/down) with announcements that include the
// share of the total.
import { motion, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { ChartLiveRegion } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { CHART_PATTERNS, categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getDateFormat, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartChips, ChartFigure, ChartTable, ChartTableToggle, ChartTip, TipRow, pointerIn, toggleHidden, useChartUid } from "./core/frame";
import { areaPath, type AreaPoint, type Curve } from "./core/path";
import { ChartPatterns, patternFill } from "./core/patterns";
import { scaleLinear } from "./core/scale";
import { stack, stackOrder, type StackOffset, type StackOrder } from "./core/stack";
import { ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

/** One layer: a key of the row, with an optional label and color. */
export interface StreamSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface StreamChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Wide rows: one per x, one numeric column per layer. */
  data: readonly T[];
  /** The x value of a row (label, number or Date). Points are spaced evenly. */
  x: Accessor<T, string | number | Date>;
  /** Layers: row keys, or objects with label and color. */
  series: readonly (string | StreamSeries)[];
  /** Baseline. "wiggle" (streamgraph, default), "silhouette" (centered), "expand" (100%) or "zero" (stacked area). */
  offset?: "wiggle" | "silhouette" | "expand" | "zero";
  /** Layer order from the baseline out. Default "insideOut" (biggest layers in the middle). */
  order?: "insideOut" | "none" | "ascending" | "descending";
  /** Default "monotone". */
  curve?: Extract<Curve, "linear" | "monotone" | "natural" | "step">;
  /** Labels inside each layer at its widest point. Default "inside". */
  labels?: "inside" | "none";
  /** Default "top". */
  legend?: "top" | "bottom" | "none";
  /** Pattern fills on top of the colors (a second, non-color encoding). */
  patterns?: boolean;
  /** Controlled hidden layer keys. */
  hiddenSeries?: readonly string[];
  defaultHiddenSeries?: readonly string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
  /** Format for values. */
  format?: NumberFormat;
  /** Format for x labels: Intl date options for Date x, or a function. */
  xFormat?: Intl.DateTimeFormatOptions | ((x: string | number | Date, index: number) => string);
  locale?: string;
  /** Unit name for the summary ("listens"). */
  label?: string;
  /** Height in px. Default 320. */
  height?: number;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  tableToggle?: boolean;
  /** Called when the hovered or focused point or layer changes. */
  onActiveChange?: (active: { index: number; key: string | null } | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface Resolved {
  key: string;
  label: string;
  color: string;
  index: number;
}

interface Geo {
  m: number;
  n: number;
  xs: readonly number[];
  top: number;
  bottom: number;
  offset: StackOffset;
  order: readonly number[];
  curve: Curve;
}

/** Stacks flat values (series-major) and maps them to px; returns per-series px bands and paths. */
function streamLayout(flat: ArrayLike<number>, geo: Geo) {
  const { m, n, xs, top, bottom, offset, order, curve } = geo;
  const values: number[][] = Array.from({ length: m }, (_, s) => Array.from({ length: n }, (_, j) => Math.max(0, flat[s * n + j] ?? 0)));
  const { bands } = stack(values, { offset, order: order as number[] });
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of bands) for (const b of s) {
    if (b[0] < lo) lo = b[0];
    if (b[1] > hi) hi = b[1];
  }
  if (offset === "expand") [lo, hi] = [0, 1];
  else if (offset === "none") lo = 0;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi - lo < 1e-9) [lo, hi] = [lo === Infinity ? 0 : lo, (lo === Infinity ? 0 : lo) + 1];
  const y = scaleLinear([lo, hi], [bottom, top]);
  const px = bands.map((s) => s.map((b) => [y(b[0]), y(b[1])] as [number, number]));
  const paths = px.map((s) => areaPath(s.map((b, j): AreaPoint => [xs[j] as number, b[1], b[0]]), { curve }));
  return { px, paths, domain: [lo, hi] as [number, number] };
}

function StreamLayer({ paths, index, ...props }: { paths: MotionValue<string[]>; index: number } & Omit<React.SVGProps<SVGPathElement>, "d" | "ref">) {
  const d = useTransform(paths, (p) => p[index] ?? "");
  return <motion.path d={d} {...(props as object)} />;
}

function StreamChartInner<T>(props: StreamChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    series,
    offset: offsetProp = "wiggle",
    order: orderProp = "insideOut",
    curve = "monotone",
    labels = "inside",
    legend = "top",
    patterns = false,
    hiddenSeries: hiddenProp,
    defaultHiddenSeries: defaultHidden,
    onHiddenSeriesChange: onHiddenChange,
    format,
    xFormat,
    locale = "en-US",
    label = "Value",
    height = 320,
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
    tableToggle = false,
    onActiveChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const H = height;
  const { width } = useChartSize(boxRef, { initialWidth, height: H });
  const W = Math.max(200, width);
  const offset: StackOffset = offsetProp === "zero" ? "none" : offsetProp;

  const resolved: Resolved[] = React.useMemo(
    () =>
      series.map((s, i) => {
        const o = typeof s === "string" ? { key: s } : s;
        return { key: o.key, label: o.label ?? o.key, color: o.color ?? categoricalColor(i), index: i };
      }),
    [series],
  );
  const keys = React.useMemo(() => resolved.map((s) => s.key), [resolved]);

  const [innerHidden, setInnerHidden] = React.useState<ReadonlySet<string>>(() => new Set(defaultHidden ?? []));
  const hidden = React.useMemo(() => (hiddenProp ? new Set(hiddenProp) : innerHidden), [hiddenProp, innerHidden]);
  const setHidden = (next: Set<string>) => {
    if (!hiddenProp) setInnerHidden(next);
    onHiddenChange?.([...next]);
  };

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 0 }, locale), [format, locale]);
  const pctFmt = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const xLabels = React.useMemo(() => {
    const dateFmt = typeof xFormat === "object" ? getDateFormat(locale, xFormat) : getDateFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
    return data.map((d, i) => {
      const v = readAccessor(x, d, i);
      if (typeof xFormat === "function") return xFormat(v, i);
      if (v instanceof Date) return dateFmt.format(v);
      return String(v);
    });
  }, [data, x, xFormat, locale]);

  const m = resolved.length;
  const n = data.length;
  const raw = React.useMemo(
    () =>
      resolved.map((s) =>
        data.map((row) => {
          const v = Number((row as Record<string, unknown>)[s.key]);
          return Number.isFinite(v) ? Math.max(0, v) : 0;
        }),
      ),
    [resolved, data],
  );
  // Order is fixed by the full data (toggles don't reshuffle layers).
  const order = React.useMemo(() => stackOrder(raw, orderProp as StackOrder), [raw, orderProp]);
  const target = React.useMemo(() => {
    const f = new Float64Array(m * n);
    resolved.forEach((s, si) => {
      const on = !hidden.has(s.key);
      for (let j = 0; j < n; j++) f[si * n + j] = on ? (raw[si]?.[j] ?? 0) : 0;
    });
    return f;
  }, [resolved, raw, hidden, m, n]);

  const valueTicksNeeded = offset === "none" || offset === "expand";
  const m0 = { left: valueTicksNeeded ? 44 : 14, right: 14, top: 10, bottom: 26 };
  const xs = React.useMemo(() => {
    const plot = W - m0.left - m0.right;
    return Array.from({ length: n }, (_, j) => m0.left + (n > 1 ? (j * plot) / (n - 1) : plot / 2));
  }, [W, n, m0.left, m0.right]);
  const geo: Geo = React.useMemo(
    () => ({ m, n, xs, top: m0.top, bottom: H - m0.bottom, offset, order, curve }),
    [m, n, xs, m0.top, m0.bottom, H, offset, order, curve],
  );
  const layout = React.useMemo(() => streamLayout(target, geo), [target, geo]);
  const tween = useDataTween(target, { enabled: anim.updates, transition: chartMotion.weight, resetKey: `${m}x${n}:${W}:${H}:${offset}:${order.join(".")}:${curve}` });
  const paths = useTransform(tween, (v) => streamLayout(v, geo).paths);

  // Interaction.
  const [hover, setHover] = React.useState<{ j: number; s: number | null } | null>(null);
  const [focus, setFocus] = React.useState<{ j: number; s: number | null } | null>(null);
  const [chipHover, setChipHover] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const active = focus ?? hover;
  const activeKey = active && active.s !== null ? (resolved[active.s]?.key ?? null) : chipHover;

  const lastActive = React.useRef("");
  React.useEffect(() => {
    const k = active ? `${active.j}:${active.s ?? ""}` : "";
    if (k === lastActive.current) return;
    lastActive.current = k;
    onActiveChange?.(active ? { index: active.j, key: active.s !== null ? (resolved[active.s]?.key ?? null) : null } : null);
  });

  const totals = React.useMemo(() => Array.from({ length: n }, (_, j) => resolved.reduce((a, s, si) => a + (hidden.has(s.key) ? 0 : (raw[si]?.[j] ?? 0)), 0)), [n, resolved, raw, hidden]);

  const layerAt = (px: number, py: number): { j: number; s: number | null } | null => {
    if (!n) return null;
    const step = n > 1 ? (xs[1] as number) - (xs[0] as number) : 1;
    const f = Math.max(0, Math.min(n - 1, (px - (xs[0] as number)) / (step || 1)));
    const j0 = Math.floor(f);
    const j1 = Math.min(n - 1, j0 + 1);
    const t = f - j0;
    let s: number | null = null;
    for (const si of order) {
      if (hidden.has(resolved[si]?.key ?? "")) continue;
      const a = layout.px[si]?.[j0];
      const b = layout.px[si]?.[j1];
      if (!a || !b) continue;
      const y1 = a[1] + (b[1] - a[1]) * t;
      const y0 = a[0] + (b[0] - a[0]) * t;
      if (py >= Math.min(y0, y1) - 0.5 && py <= Math.max(y0, y1) + 0.5) {
        s = si;
        break;
      }
    }
    return { j: Math.round(f), s };
  };

  // Visible layers top to bottom (reverse of the stack order).
  const visibleOrder = order.filter((si) => !hidden.has(resolved[si]?.key ?? ""));
  const topDown = [...visibleOrder].reverse();

  const describe = (j: number, s: number | null) => {
    const total = totals[j] ?? 0;
    if (s === null) return `${xLabels[j]}: total ${fmt(total)} across ${visibleOrder.length} layers. Point ${j + 1} of ${n}.`;
    const r = resolved[s] as Resolved;
    const v = raw[s]?.[j] ?? 0;
    return `${r.label}, ${xLabels[j]}: ${fmt(v)} (${pctFmt.format(total ? v / total : 0)} of ${fmt(total)}). Point ${j + 1} of ${n}.`;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { j: -1, s: null };
    const sIdx = cur.s === null ? -1 : topDown.indexOf(cur.s);
    let next: { j: number; s: number | null } | null = null;
    const jump = Math.max(1, Math.round(n / 10));
    switch (event.key) {
      case "ArrowRight":
        next = { j: Math.min(n - 1, cur.j + 1), s: cur.s };
        break;
      case "ArrowLeft":
        next = { j: cur.j < 0 ? n - 1 : Math.max(0, cur.j - 1), s: cur.s };
        break;
      case "Home":
        next = { j: 0, s: cur.s };
        break;
      case "End":
        next = { j: n - 1, s: cur.s };
        break;
      case "PageUp":
        next = { j: Math.max(0, cur.j - jump), s: cur.s };
        break;
      case "PageDown":
        next = { j: Math.min(n - 1, Math.max(0, cur.j) + jump), s: cur.s };
        break;
      case "ArrowDown":
        if (topDown.length) next = { j: Math.max(0, cur.j), s: topDown[Math.min(topDown.length - 1, sIdx + 1)] as number };
        break;
      case "ArrowUp":
        if (topDown.length) next = { j: Math.max(0, cur.j), s: sIdx <= 0 ? null : (topDown[sIdx - 1] as number) };
        break;
      case "Enter":
      case " ":
        if (focus && focus.s !== null) {
          event.preventDefault();
          const k = resolved[focus.s]?.key as string;
          const nextHidden = toggleHidden(hidden, keys, k, true);
          setHidden(nextHidden);
          setAnnouncement(nextHidden.size ? `Showing only ${resolved[focus.s]?.label}.` : "Showing all layers.");
        }
        return;
      case "Escape":
        if (focus) {
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
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next.j, next.s));
  };

  const onToggle = (id: string, solo: boolean) => {
    const next = toggleHidden(hidden, keys, id, solo);
    setHidden(next);
    const r = resolved.find((s) => s.key === id);
    setAnnouncement(solo ? (next.size ? `Showing only ${r?.label}.` : "Showing all layers.") : `${r?.label} ${next.has(id) ? "hidden" : "shown"}.`);
  };

  // Labels at each layer's widest point.
  const labelNodes =
    labels === "inside"
      ? resolved.map((r, si) => {
          const band = layout.px[si];
          if (!band || hidden.has(r.key)) return null;
          let best = -1;
          let bestJ = 0;
          band.forEach(([a, b], j) => {
            const th = Math.abs(a - b);
            // Prefer interior points: edge labels clip.
            const edge = j === 0 || j === n - 1 ? 0.75 : 1;
            if (th * edge > best) {
              best = th * edge;
              bestJ = j;
            }
          });
          const bb = band[bestJ];
          const th = bb ? Math.abs(bb[0] - bb[1]) : 0;
          if (th < 15) return null;
          const fs = th > 34 ? 12 : 11;
          const tw = estimateTextWidth(r.label, fs);
          const cx = Math.max(m0.left + tw / 2 + 6, Math.min(W - m0.right - tw / 2 - 6, xs[bestJ] as number));
          const cy = bb ? (bb[0] + bb[1]) / 2 : 0;
          const dim = activeKey !== null && activeKey !== r.key;
          return (
            <motion.text
              key={r.key}
              initial={anim.entrance ? { x: cx, y: cy, opacity: 0 } : false}
              animate={{ x: cx, y: cy, opacity: dim ? 0.2 : 1 }}
              transition={anim.reducedMotion ? instant : { x: chartMotion.weight, y: chartMotion.weight, opacity: { duration: 0.2, delay: anim.entrance ? 0.6 : 0 } }}
              dy="0.35em"
              textAnchor="middle"
              fontSize={fs}
              fontWeight={600}
              fill="var(--pui-foreground)"
              stroke="var(--pui-background)"
              strokeWidth={3}
              strokeOpacity={0.75}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {r.label}
            </motion.text>
          );
        })
      : null;

  // Axis ticks.
  const tickCount = Math.max(2, Math.min(n, Math.floor((W - m0.left - m0.right) / 90)));
  const tickIdx = n > 1 ? Array.from(new Set(Array.from({ length: tickCount }, (_, k) => Math.round((k * (n - 1)) / (tickCount - 1))))) : n ? [0] : [];
  const yScale = scaleLinear(layout.domain, [H - m0.bottom, m0.top]);
  const yTicks = valueTicksNeeded ? niceTicks(layout.domain[0], layout.domain[1], Math.max(2, Math.round(H / 60))) : [];

  // Tooltip.
  const aj = active ? active.j : null;
  let tip: { left: number; top: number; flipX: boolean } | null = null;
  if (aj !== null && xs[aj] !== undefined) {
    let ty = m0.top + 8;
    if (active && active.s !== null) {
      const b = layout.px[active.s]?.[aj];
      if (b) ty = Math.min(b[0], b[1]);
    }
    tip = { left: (xs[aj] as number) / W, top: Math.max(m0.top + 60, ty) / H, flipX: (xs[aj] as number) / W > 0.6 };
  }

  const nameText = chartLabel ?? (typeof title === "string" ? title : `${label} by layer`);
  const summaryText = (() => {
    if (summary) return summary;
    if (!m || !n) return "No data.";
    const sums = resolved.map((s, si) => ({ s, total: (raw[si] ?? []).reduce((a, b) => a + b, 0), first: raw[si]?.[0] ?? 0, last: raw[si]?.[n - 1] ?? 0 }));
    const grand = sums.reduce((a, b) => a + b.total, 0) || 1;
    const biggest = [...sums].sort((a, b) => b.total - a.total)[0] as (typeof sums)[number];
    const growth = sums.filter((s) => s.first > 0).map((s) => ({ ...s, g: s.last / s.first - 1 }));
    const fastest = growth.sort((a, b) => b.g - a.g)[0];
    const peakJ = totals.indexOf(Math.max(...totals));
    return `Stream chart of ${m} layers of ${label.toLowerCase()} over ${n} points, from ${xLabels[0]} to ${xLabels[n - 1]}. Largest layer ${biggest.s.label} (${pctFmt.format(biggest.total / grand)} of the total).${
      fastest ? ` Fastest growing ${fastest.s.label} (${fastest.g >= 0 ? "+" : ""}${pctFmt.format(fastest.g)} first to last).` : ""
    } Total peaks at ${fmt(totals[peakJ] ?? 0)} in ${xLabels[peakJ]}.`;
  })();

  const chips = resolved.map((r) => ({
    id: r.key,
    label: r.label,
    color: r.color,
    meta: aj !== null && !hidden.has(r.key) ? fmt(raw[r.index]?.[aj] ?? 0) : undefined,
  }));
  const legendNode =
    legend === "none" ? null : <ChartChips chips={chips} hidden={hidden} onToggle={onToggle} onHover={setChipHover} active={activeKey} reducedMotion={anim.reducedMotion} label="Layers" />;

  const growOrigin = offset === "none" || offset === "expand" ? "100%" : "50%";

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {legend === "top" ? legendNode : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {patterns ? <ChartPatterns idPrefix={`${uid}-p`} /> : null}
          <defs>
            <clipPath id={`${uid}-clip`}>
              <rect x={m0.left} y={m0.top - 2} width={Math.max(0, W - m0.left - m0.right)} height={Math.max(0, H - m0.top - m0.bottom + 4)} />
            </clipPath>
          </defs>
          {/* Grid */}
          {tickIdx.map((j) => (
            <line key={`x${j}`} x1={xs[j]} x2={xs[j]} y1={m0.top} y2={H - m0.bottom} stroke="var(--pui-chart-grid)" strokeDasharray="2 5" />
          ))}
          {yTicks.map((tk) => (
            <g key={`y${tk}`}>
              <line x1={m0.left} x2={W - m0.right} y1={yScale(tk)} y2={yScale(tk)} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={m0.left - 8} y={yScale(tk)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {offset === "expand" ? pctFmt.format(tk) : fmt(tk)}
              </text>
            </g>
          ))}
          {/* Layers */}
          <motion.g
            clipPath={`url(#${uid}-clip)`}
            initial={anim.entrance ? { scaleY: 0, opacity: 0 } : false}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={anim.reducedMotion ? instant : { duration: 0.8, ease: outExpo }}
            style={{ originY: growOrigin, transformBox: "fill-box" }}
          >
            {resolved.map((r, si) => {
              const dim = activeKey !== null && activeKey !== r.key;
              const fade = anim.reducedMotion ? instant : chartMotion.fade;
              const pat = CHART_PATTERNS[si % CHART_PATTERNS.length] as (typeof CHART_PATTERNS)[number];
              return (
                <motion.g key={r.key} initial={false} animate={{ opacity: dim ? 0.25 : 1 }} transition={fade}>
                  <StreamLayer paths={paths} index={si} fill={withOpacity(r.color, activeKey === r.key ? 0.95 : 0.82)} stroke={r.color} strokeWidth={0.75} strokeOpacity={0.9} />
                  {patterns ? <StreamLayer paths={paths} index={si} fill={patternFill(`${uid}-p`, pat)} /> : null}
                </motion.g>
              );
            })}
          </motion.g>
          {labelNodes}
          {/* Crosshair */}
          {aj !== null && xs[aj] !== undefined ? (
            <g pointerEvents="none">
              <motion.line
                initial={false}
                animate={{ x1: xs[aj], x2: xs[aj] }}
                transition={anim.reducedMotion ? instant : chartMotion.hover}
                y1={m0.top}
                y2={H - m0.bottom}
                stroke="var(--pui-chart-crosshair)"
                strokeDasharray="3 3"
              />
              {visibleOrder.map((si) => {
                const b = layout.px[si]?.[aj];
                if (!b) return null;
                const on = active?.s === si;
                return (
                  <motion.circle
                    key={si}
                    initial={false}
                    animate={{ cx: xs[aj], cy: Math.min(b[0], b[1]), r: on ? 4.5 : 2.5 }}
                    transition={anim.reducedMotion ? instant : chartMotion.hover}
                    fill={on ? (resolved[si]?.color ?? "") : "var(--pui-background)"}
                    stroke={resolved[si]?.color}
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          ) : null}
          {/* x labels */}
          {tickIdx.map((j) => (
            <text
              key={`l${j}`}
              x={xs[j]}
              y={H - m0.bottom + 17}
              textAnchor={j === 0 ? "start" : j === n - 1 ? "end" : "middle"}
              fontSize={10}
              fontWeight={aj === j ? 700 : 400}
              fill={aj === j ? "var(--pui-foreground)" : "var(--pui-chart-axis)"}
            >
              {xLabels[j]}
            </text>
          ))}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Left and right arrows move between points, up and down between layers. Enter shows only the focused layer.`}
          aria-describedby={`${uid}-summary`}
          onPointerMove={(event) => {
            const p = pointerIn(event, W, H);
            setHover(p ? layerAt(p.x, p.y) : null);
          }}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-md cursor-crosshair")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} reducedMotion={anim.reducedMotion}>
          {aj !== null ? (
            <>
              <div className={cn(blockReset, "mb-1 flex items-center justify-between gap-4 text-[11px] font-semibold")}>
                <span>{xLabels[aj]}</span>
                <span className={cn(blockReset, "font-normal text-pui-muted-foreground tabular-nums")}>Total {fmt(totals[aj] ?? 0)}</span>
              </div>
              {topDown.slice(0, 8).map((si) => {
                const r = resolved[si] as Resolved;
                const v = raw[si]?.[aj] ?? 0;
                const on = active?.s === si;
                return (
                  <div key={r.key} className={cn(blockReset, "rounded-sm", on ? "bg-pui-muted/70 -mx-1 px-1 font-semibold" : "")}>
                    <TipRow swatch={r.color} label={r.label} value={`${fmt(v)} \u00b7 ${pctFmt.format((totals[aj] ?? 0) ? v / (totals[aj] as number) : 0)}`} />
                  </div>
                );
              })}
              {topDown.length > 8 ? <div className={cn(blockReset, "mt-0.5 text-[10px] text-pui-muted-foreground")}>and {topDown.length - 8} more</div> : null}
            </>
          ) : null}
        </ChartTip>
      </div>
      {legend === "bottom" ? legendNode : null}
      {tableToggle ? <ChartTableToggle visible={tableVisible} onToggle={() => setTableVisible((v) => !v)} controls={`${uid}-table`} /> : null}
      <div id={`${uid}-table`}>
        <ChartTable
          caption={nameText}
          columns={["x", ...resolved.map((r) => r.label), "Total"]}
          rows={xLabels.map((xl, j) => [xl, ...resolved.map((_, si) => fmt(raw[si]?.[j] ?? 0)), fmt(totals[j] ?? 0)])}
          visible={tableVisible}
        />
      </div>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
}

/**
 * Streamgraph: wiggle-baseline layers in inside-out order with inside labels at each layer's
 * widest point, layer isolation on hover, an axis crosshair with shares, legend toggles that
 * re-flow the stream and keyboard navigation over points and layers.
 */
export const StreamChart = React.forwardRef(StreamChartInner) as (<T>(props: StreamChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
StreamChart.displayName = "StreamChart";
