"use client";

// Pie and donut charts: an original layout (core/pie) and arc generator (core/path) with padded,
// rounded slices, a sweep entrance, angle tweens on data changes (no re-sweep), hover explode,
// legend toggles that collapse slices smoothly, a rolling center total, inside or outside labels
// with collision-free leader lines, and full keyboard exploration with live announcements.
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { dodgeLabels } from "./core/label-layout";
import { arcPath, polar } from "./core/path";
import { pie } from "./core/pie";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { ChartBreadcrumb, focusChartOverlay, useDrillStack } from "./core/drill";
import { mergeRefs } from "../lib/compose";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };
const DEG = Math.PI / 180;

export interface PieSliceInfo<T> {
  /** Position in the (merged) data. */
  index: number;
  key: string;
  label: string;
  value: number;
  /** Share of the visible total, 0..1. */
  share: number;
  color: string;
  /** The row, or null for the merged "Other" slice. */
  datum: T | null;
  /** Rows merged into "Other". */
  merged: T[];
}

export interface PieCenterContext {
  total: number;
  /** The hovered, focused or selected slice. */
  active: PieSliceInfo<unknown> | null;
  formatted: string;
}

export interface PieChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "onSelect" | "color"> {
  data: readonly T[];
  /** Slice value: a column name or a function. Negative values count as 0. */
  value: Accessor<T, number>;
  /** Slice name (legend, tooltip, key). */
  label: Accessor<T, string>;
  /** Per-slice color (any CSS color or token). Default: the chart palette. */
  color?: Accessor<T, string | undefined>;
  /** Hole size as a fraction of the radius, 0..0.95. Default 0 (DonutChart: 0.62). */
  innerRadius?: number;
  /** Gap between slices in degrees. Default 0 (DonutChart: 1.4). */
  padAngle?: number;
  /** Rounded slice corners in px. Default 0 (DonutChart: 5). */
  cornerRadius?: number;
  /** Degrees, 0 = 12 o'clock, clockwise. Default 0 and 360 (use -90 / 90 for a half donut). */
  startAngle?: number;
  endAngle?: number;
  /** Slice order. Default "none" (data order, the most predictable for legends). */
  sort?: "none" | "descending" | "ascending";
  /** Merge slices below this share (0..1) into one "Other" slice. Default 0 (off). */
  otherThreshold?: number;
  otherLabel?: string;
  /** Size of the drawing in px (it scales down with the container). Default 280. */
  height?: number;
  /** Slice labels. Default "inside" (DonutChart: "none"). */
  labels?: "none" | "inside" | "outside";
  /** What labels print. Default "percent". */
  labelContent?: "percent" | "value" | "label";
  /** Donut center content: false hides it; a function gets the total and the active slice. */
  centerLabel?: false | React.ReactNode | ((ctx: PieCenterContext) => React.ReactNode);
  /** Caption above the center total. Default "Total". */
  centerTitle?: string;
  /** Default "right" (wraps under the chart on narrow screens). */
  legend?: "right" | "bottom" | "none";
  /** Hover push-out in px. Default 8. */
  explode?: number;
  format?: NumberFormat;
  locale?: string;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Selected slice index (controlled), or null. */
  selected?: number | null;
  defaultSelected?: number | null;
  onSelectedChange?: (index: number | null) => void;
  /** Hidden slice keys (labels), controlled. */
  hiddenSlices?: string[];
  defaultHiddenSlices?: string[];
  onHiddenSlicesChange?: (keys: string[]) => void;
  onSliceClick?: (slice: PieSliceInfo<T>, event: React.PointerEvent | React.KeyboardEvent) => void;
  /** Tooltip on hover and focus. Default: on for pies, off for donuts (the center shows the slice). */
  tooltip?: boolean;
  /** Live-region text for the focused slice. */
  formatAnnouncement?: (slice: PieSliceInfo<T>, position: { index: number; count: number }) => string;
  /** Replaces the generated screen-reader summary. */
  summary?: string;
  /** Accessible name of the plot. Default: the title, else "Pie chart". */
  chartLabel?: string;
  /** Content between the caption and the chart (filters, a breadcrumb). */
  toolbar?: React.ReactNode;
  /**
   * Drill-down: slices with children open into them on click or Enter (the new slices sweep in),
   * Escape or Backspace goes up a level, and a breadcrumb above the chart shows the path.
   */
  drill?: PieChartDrill<T>;
}

export interface PieChartDrill<T> {
  /** Child rows of a slice. */
  children: (datum: T) => readonly T[] | null | undefined;
  /** First breadcrumb. Default "All". */
  rootLabel?: string;
  /** Called with the breadcrumb labels below the root after every drill. */
  onDrillChange?: (path: string[]) => void;
}

function useControlled<V>(value: V | undefined, initial: V, onChange?: (v: V) => void): [V, (v: V) => void] {
  const [inner, setInner] = React.useState(initial);
  const current = value !== undefined ? value : inner;
  const set = (v: V) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  return [current, set];
}

interface Row<T> {
  key: string;
  label: string;
  value: number;
  color: string;
  datum: T | null;
  merged: T[];
}

function Slice({
  tween,
  sweep,
  index,
  base,
  inner,
  outer,
  pad,
  corner,
  color,
  offset,
  opacity,
  selected,
  reducedMotion,
}: {
  tween: MotionValue<Float64Array>;
  sweep: MotionValue<number>;
  index: number;
  base: number;
  inner: number;
  outer: number;
  pad: number;
  corner: number;
  color: string;
  offset: { x: number; y: number };
  opacity: number;
  selected: boolean;
  reducedMotion: boolean;
}) {
  const d = useTransform(() => {
    const g = tween.get();
    const p = sweep.get();
    const a0 = base + ((g[index * 2] ?? base) - base) * p;
    const a1 = base + ((g[index * 2 + 1] ?? base) - base) * p;
    if (a1 - a0 <= 1e-4) return "";
    return arcPath({ innerRadius: inner, outerRadius: outer, startAngle: a0, endAngle: a1, padAngle: pad, cornerRadius: corner });
  });
  return (
    <motion.g initial={false} animate={{ x: offset.x, y: offset.y, opacity }} transition={reducedMotion ? instant : { ...chartMotion.layout, opacity: chartMotion.fade }}>
      <motion.path d={d} fill={color} stroke={selected ? "var(--pui-ring)" : "var(--pui-background)"} strokeWidth={selected ? 2.5 : inner > 0 ? 0 : 1.25} strokeLinejoin="round" />
    </motion.g>
  );
}

function RollingNumber({ value, format, reducedMotion }: { value: number; format: (v: number) => string; reducedMotion: boolean }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  React.useEffect(() => {
    if (reducedMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value, reducedMotion]);
  return <motion.span>{text}</motion.span>;
}

function PieChartBaseInner<T>(props: Omit<PieChartProps<T>, "drill">, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    value,
    label,
    color,
    innerRadius = 0,
    padAngle = 0,
    cornerRadius = 0,
    startAngle = 0,
    endAngle = 360,
    sort = "none",
    otherThreshold = 0,
    otherLabel = "Other",
    height = 280,
    labels = "inside",
    labelContent = "percent",
    centerLabel,
    centerTitle = "Total",
    legend = "right",
    explode = 8,
    format,
    locale = "en-US",
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    selected: selectedProp,
    defaultSelected = null,
    onSelectedChange,
    hiddenSlices,
    defaultHiddenSlices = [],
    onHiddenSlicesChange,
    onSliceClick,
    tooltip: tooltipProp,
    formatAnnouncement,
    summary,
    chartLabel,
    toolbar,
    className,
    ...rest
  } = props;

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const [selected, setSelected] = useControlled<number | null>(selectedProp, defaultSelected, onSelectedChange);
  const [hidden, setHidden] = useControlled<string[]>(hiddenSlices, defaultHiddenSlices, onHiddenSlicesChange);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [solo, setSolo] = React.useState<{ key: string; restore: string[] } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  // Rows, with small slices merged into "Other".
  const rows = React.useMemo<Row<T>[]>(() => {
    const base = data.map((d, i) => {
      const v = Number(readAccessor(value, d, i));
      return {
        key: String(readAccessor(label, d, i)),
        label: String(readAccessor(label, d, i)),
        value: Number.isFinite(v) && v > 0 ? v : 0,
        color: (color ? readAccessor(color, d, i) : undefined) ?? categoricalColor(i),
        datum: d as T | null,
        merged: [] as T[],
      };
    });
    if (!(otherThreshold > 0)) return base;
    const total = base.reduce((a, r) => a + r.value, 0);
    const small = base.filter((r) => total > 0 && r.value / total < otherThreshold);
    if (small.length < 2) return base;
    const keep = base.filter((r) => !small.includes(r));
    return [
      ...keep,
      {
        key: `__other`,
        label: otherLabel,
        value: small.reduce((a, r) => a + r.value, 0),
        color: "var(--pui-chart-8, var(--pui-muted-foreground))",
        datum: null,
        merged: small.map((r) => r.datum as T),
      },
    ];
  }, [data, value, label, color, otherThreshold, otherLabel]);

  const n = rows.length;
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);
  const visibleTotal = rows.reduce((a, r) => a + (hiddenSet.has(r.key) ? 0 : r.value), 0);
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pctFmt = React.useCallback((v: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: v < 0.1 ? 1 : 0 }).format(v), [locale]);
  const info = React.useCallback(
    (i: number): PieSliceInfo<T> => {
      const r = rows[i] as Row<T>;
      const share = visibleTotal > 0 && !hiddenSet.has(r.key) ? r.value / visibleTotal : 0;
      return { index: i, key: r.key, label: r.label, value: r.value, share, color: r.color, datum: r.datum, merged: r.merged };
    },
    [rows, visibleTotal, hiddenSet],
  );

  // Geometry (fixed viewBox, so the server renders the final chart).
  const outside = labels === "outside";
  const H = height;
  const W = outside ? Math.round(H * 1.7) : H;
  const cx = W / 2;
  const cy = H / 2;
  const outer = Math.max(10, H / 2 - explode - (outside ? 18 : 2));
  const inner = Math.max(0, Math.min(0.95, innerRadius)) * outer;
  const a0 = startAngle * DEG;
  const a1 = endAngle * DEG;
  const pad = Math.max(0, padAngle) * DEG;

  const slices = React.useMemo(
    () => pie(rows, (r) => (hiddenSet.has(r.key) ? 0 : r.value), { startAngle: a0, endAngle: a1, padAngle: pad, sort: sort === "none" ? "none" : sort }),
    [rows, hiddenSet, a0, a1, pad, sort],
  );
  const target = React.useMemo(() => {
    const g = new Float64Array(n * 2);
    slices.forEach((s, i) => {
      g[i * 2] = s.startAngle;
      g[i * 2 + 1] = s.endAngle;
    });
    return g;
  }, [slices, n]);
  const tween = useDataTween(target, { enabled: anim.updates, resetKey: rows.map((r) => r.key).join("\u0000") });
  const sweep = useMotionValue(anim.entrance ? 0 : 1);
  React.useEffect(() => {
    if (!anim.entrance) {
      sweep.set(1);
      return;
    }
    const controls = animate(sweep, 1, { ...chartMotion.sweep, duration: 0.9 });
    return () => controls.stop();
  }, [anim.entrance, sweep]);

  const active = focus ?? hover ?? selected;
  const activeInfo = active !== null && active < n && !hiddenSet.has((rows[active] as Row<T>).key) ? info(active) : null;
  const mid = (i: number) => {
    const s = slices[i];
    return s ? (s.startAngle + s.endAngle) / 2 : 0;
  };

  // --- interaction ---------------------------------------------------------------------------
  const hitTest = (event: React.PointerEvent<HTMLDivElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const x = ((event.clientX - rect.left) / rect.width) * W - cx;
    const y = ((event.clientY - rect.top) / rect.height) * H - cy;
    const r = Math.hypot(x, y);
    if (r > outer + explode || r < inner - 2) return null;
    let angle = Math.atan2(x, -y); // 0 at 12 o'clock, clockwise
    const lo = Math.min(a0, a1);
    while (angle < lo) angle += 2 * Math.PI;
    while (angle > lo + 2 * Math.PI) angle -= 2 * Math.PI;
    const hit = slices.findIndex((s) => s.endAngle - s.startAngle > 1e-6 && angle >= Math.min(s.startAngle, s.endAngle) - s.padAngle / 2 && angle <= Math.max(s.startAngle, s.endAngle) + s.padAngle / 2);
    return hit < 0 ? null : hit;
  };
  const announce = (i: number) => {
    const s = info(i);
    const visibleIdx = rows.filter((r) => !hiddenSet.has(r.key)).findIndex((r) => r.key === s.key);
    const count = rows.length - hiddenSet.size;
    setAnnouncement(
      formatAnnouncement
        ? formatAnnouncement(s, { index: visibleIdx, count })
        : `${s.label}: ${fmt(s.value)}, ${pctFmt(s.share)} of ${fmt(visibleTotal)}. Slice ${visibleIdx + 1} of ${count}.`,
    );
  };
  const visibleOrder = slices
    .map((s, i) => ({ i, order: s.order }))
    .filter(({ i }) => !hiddenSet.has((rows[i] as Row<T>).key) && (rows[i] as Row<T>).value > 0)
    .sort((a, b) => a.order - b.order)
    .map(({ i }) => i);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) return;
    const pos = focus === null ? -1 : visibleOrder.indexOf(focus);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = visibleOrder[pos < 0 ? 0 : (pos + 1) % visibleOrder.length] ?? null;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = visibleOrder[pos < 0 ? visibleOrder.length - 1 : (pos - 1 + visibleOrder.length) % visibleOrder.length] ?? null;
    else if (event.key === "Home") next = visibleOrder[0] ?? null;
    else if (event.key === "End") next = visibleOrder[visibleOrder.length - 1] ?? null;
    else if ((event.key === "Enter" || event.key === " ") && focus !== null) {
      event.preventDefault();
      setSelected(selected === focus ? null : focus);
      onSliceClick?.(info(focus), event);
      return;
    } else if (event.key === "Escape" && selected !== null) {
      event.preventDefault();
      setSelected(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    announce(next);
  };

  const toggle = (key: string, alt: boolean) => {
    if (alt) {
      if (solo?.key === key) {
        setHidden(solo.restore);
        setSolo(null);
      } else {
        setSolo({ key, restore: solo ? solo.restore : hidden });
        setHidden(rows.map((r) => r.key).filter((k) => k !== key));
      }
      return;
    }
    setSolo(null);
    setHidden(hiddenSet.has(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
  };

  // --- labels -----------------------------------------------------------------------------------
  const labelText = (i: number) => {
    const s = info(i);
    return labelContent === "value" ? fmt(s.value) : labelContent === "label" ? s.label : pctFmt(s.share);
  };
  const outsideLabels = React.useMemo(() => {
    if (!outside) return [];
    const items = slices
      .map((s, i) => ({ i, angle: (s.startAngle + s.endAngle) / 2, span: s.endAngle - s.startAngle }))
      .filter((it) => it.span > 0.02);
    const out: Array<{ i: number; side: 1 | -1; ex: number; ey: number; y: number }> = [];
    for (const side of [1, -1] as const) {
      const group = items.filter((it) => (Math.sin(it.angle) >= 0 ? 1 : -1) === side).sort((p, q) => -Math.cos(p.angle) - -Math.cos(q.angle));
      const ys = dodgeLabels(
        group.map((it) => ({ position: cy - Math.cos(it.angle) * (outer + 14), size: 28 })),
        12,
        H - 12,
        3,
      );
      group.forEach((it, k) => {
        const [ex, ey] = polar(it.angle, outer + 4, cx, cy);
        out.push({ i: it.i, side, ex, ey, y: ys[k] ?? ey });
      });
    }
    return out;
  }, [outside, slices, cx, cy, outer, H]);

  // --- render -----------------------------------------------------------------------------------
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Pie chart");
  const largest = rows.reduce<number>((best, r, i) => (!hiddenSet.has(r.key) && r.value > ((rows[best] as Row<T> | undefined)?.value ?? -1) ? i : best), 0);
  const summaryText =
    summary ??
    (n && visibleTotal > 0
      ? `${n - hiddenSet.size} slices totaling ${fmt(visibleTotal)}. Largest: ${info(largest).label} at ${pctFmt(info(largest).share)} (${fmt(info(largest).value)}).`
      : "No data.");
  const transition = anim.reducedMotion ? instant : glide;
  const showCenter = inner > 0 && centerLabel !== false;
  const tooltip = tooltipProp ?? !showCenter;
  const centerCtx: PieCenterContext = { total: visibleTotal, active: activeInfo as PieSliceInfo<unknown> | null, formatted: fmt(visibleTotal) };

  // Tooltip anchor: just outside the active slice, in % of the drawing.
  let tip: { left: number; top: number; flip: boolean } | null = null;
  if (tooltip && activeInfo && active !== null) {
    const [tx, ty] = polar(mid(active), inner > 0 ? (inner + outer) / 2 + explode : outer * 0.62 + explode, cx, cy);
    tip = { left: tx / W, top: ty / H, flip: tx > cx };
  }

  const legendNode =
    legend === "none" ? null : (
      <div role="group" aria-label="Slices" className={cn(blockReset, "flex min-w-0 flex-wrap gap-1", legend === "right" ? "flex-col sm:min-w-44" : "flex-row justify-center")}>
        {rows.map((r, i) => {
          const off = hiddenSet.has(r.key);
          const s = info(i);
          const dim = activeInfo && activeInfo.key !== r.key;
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={!off}
              title="Click to toggle, Alt+click to show only this slice"
              onClick={(event) => toggle(r.key, event.altKey)}
              onPointerEnter={() => !off && setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => !off && setHover(i)}
              onBlur={() => setHover(null)}
              className={cn(
                controlReset,
                focusRing,
                "group inline-flex min-h-6 cursor-pointer items-center gap-2 rounded-pui-md px-2 py-1 text-left text-xs transition-[opacity,background-color] duration-150 hover:bg-pui-muted",
                off ? "text-pui-muted-foreground" : "text-pui-foreground",
                dim ? "opacity-55" : "",
              )}
            >
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ scale: off ? 0.7 : 1, opacity: off ? 0.4 : 1 }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 30 }}
                className={cn(blockReset, "size-2.5 shrink-0 rounded-[3px]")}
                style={{ background: r.color }}
              />
              <span className={cn(blockReset, "min-w-0 flex-1 truncate", off ? "line-through decoration-1" : "")}>{r.label}</span>
              {off ? null : (
                <span className={cn(blockReset, "ms-2 tabular-nums text-pui-muted-foreground")}>
                  <span className={cn(blockReset, "font-semibold text-pui-foreground")}>{pctFmt(s.share)}</span>
                  {legend === "right" ? ` \u00b7 ${fmt(r.value)}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={descId}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={titleId} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      {toolbar}
      <div className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-4", legend === "bottom" ? "flex-col" : "justify-center")}>
        <div className={cn(blockReset, "relative w-full select-none")} style={{ maxWidth: W, aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
            <g transform={`translate(${cx},${cy})`}>
              {inner > 0 ? (
                // The empty track behind the ring (follows partial sweeps such as half donuts).
                <path d={arcPath({ innerRadius: inner, outerRadius: outer, startAngle: a0, endAngle: a1, cornerRadius })} fill="var(--pui-muted)" opacity={0.5} />
              ) : null}
              {rows.map((r, i) => {
                const off = hiddenSet.has(r.key);
                const isActive = active === i && !off;
                const isSelected = selected === i && !off;
                const [ox, oy] = isActive || isSelected ? polar(mid(i), explode) : [0, 0];
                let opacity = 1;
                if (selected !== null && !isSelected && hover === null && focus === null) opacity = 0.45;
                else if (active !== null && !isActive) opacity = 0.55;
                return (
                  <Slice
                    key={r.key}
                    tween={tween}
                    sweep={sweep}
                    index={i}
                    base={a0}
                    inner={inner}
                    outer={outer}
                    pad={pad}
                    corner={cornerRadius}
                    color={r.color}
                    offset={{ x: ox, y: oy }}
                    opacity={opacity}
                    selected={isSelected}
                    reducedMotion={anim.reducedMotion}
                  />
                );
              })}
            </g>
            {labels === "inside"
              ? slices.map((s, i) => {
                  const span = s.endAngle - s.startAngle;
                  const text = labelText(i);
                  const r = inner > 0 ? (inner + outer) / 2 : outer * 0.64;
                  if (span * r < estimateTextWidth(text, 11) + 10 || span < 0.2) return null;
                  const [lx, ly] = polar((s.startAngle + s.endAngle) / 2, r, cx, cy);
                  const isActive = active === i;
                  return (
                    <motion.text
                      key={(rows[i] as Row<T>).key}
                      initial={anim.entrance ? { opacity: 0, x: lx, y: ly } : false}
                      animate={{ opacity: active !== null && !isActive ? 0.5 : 1, x: lx, y: ly }}
                      transition={anim.reducedMotion ? instant : anim.entrance ? { ...chartMotion.update, opacity: { duration: 0.3, delay: 0.6 } } : chartMotion.update}
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={11}
                      fontWeight={700}
                      fill="var(--pui-background)"
                      className="tabular-nums"
                      pointerEvents="none"
                    >
                      {text}
                    </motion.text>
                  );
                })
              : null}
            {outside
              ? outsideLabels.map(({ i, side, ex, ey, y }) => {
                  const r = rows[i] as Row<T>;
                  const ix = cx + side * (outer + 16);
                  const tx = cx + side * (outer + 22);
                  return (
                    <motion.g
                      key={r.key}
                      initial={anim.entrance ? { opacity: 0 } : false}
                      animate={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
                      transition={anim.entrance ? { duration: 0.3, delay: 0.7 } : chartMotion.fade}
                      pointerEvents="none"
                    >
                      <motion.path initial={false} animate={{ d: `M${ex},${ey}L${ix},${y}L${tx - side * 2},${y}` }} transition={anim.reducedMotion ? instant : chartMotion.update} fill="none" stroke={r.color} strokeWidth={1.25} />
                      <motion.text initial={false} animate={{ y }} transition={anim.reducedMotion ? instant : chartMotion.update} x={tx} textAnchor={side > 0 ? "start" : "end"} fontSize={11}>
                        <tspan dy="-0.15em" fill="var(--pui-foreground)" fontWeight={600}>
                          {r.label}
                        </tspan>
                        <tspan x={tx} dy="1.25em" fill="var(--pui-muted-foreground)" className="tabular-nums">
                          {labelContent === "value" ? fmt(r.value) : `${pctFmt(info(i).share)} \u00b7 ${fmt(r.value)}`}
                        </tspan>
                      </motion.text>
                    </motion.g>
                  );
                })
              : null}
          </svg>
          {showCenter ? (
            <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 flex items-center justify-center")}>
              <div className={cn(blockReset, "flex flex-col items-center text-center")} style={{ maxWidth: `${((inner * 1.5) / W) * 100}%` }}>
                {typeof centerLabel === "function" ? (
                  centerLabel(centerCtx)
                ) : centerLabel !== undefined ? (
                  centerLabel
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={activeInfo ? activeInfo.key : "__total"}
                      initial={anim.reducedMotion ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.12 } }}
                      transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 32 }}
                      className={cn(blockReset, "flex flex-col items-center")}
                    >
                      <span className={cn(blockReset, "max-w-full truncate text-[11px] font-medium text-pui-muted-foreground")}>{activeInfo ? activeInfo.label : centerTitle}</span>
                      <span className={cn(blockReset, "text-xl font-semibold tabular-nums tracking-tight")} style={{ fontSize: Math.max(14, Math.min(28, inner * 0.3)) }}>
                        {activeInfo ? fmt(activeInfo.value) : <RollingNumber value={visibleTotal} format={fmt} reducedMotion={anim.reducedMotion} />}
                      </span>
                      {activeInfo ? <span className={cn(blockReset, "text-[11px] font-semibold tabular-nums")} style={{ color: activeInfo.color }}>{pctFmt(activeInfo.share)}</span> : null}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          ) : null}
          <div
            tabIndex={0}
            role="application"
            aria-roledescription="interactive chart"
            aria-label={`${nameText}. Use arrow keys to move between slices.`}
            aria-describedby={`${uid}-help`}
            onPointerMove={(event) => setHover(hitTest(event))}
            onPointerLeave={() => setHover(null)}
            onPointerUp={(event) => {
              const i = hitTest(event);
              if (i === null) return;
              setSelected(selected === i ? null : i);
              onSliceClick?.(info(i), event);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setFocus(null)}
            className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-full", hover !== null ? "cursor-pointer" : "cursor-default")}
            style={{ touchAction: "pan-y" }}
          />
          <AnimatePresence>
            {tip && activeInfo ? (
              <motion.div
                key="tip"
                role="presentation"
                aria-hidden="true"
                initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
                animate={{ opacity: 1, scale: 1, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
                exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                transition={transition}
                className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
              >
                <div
                  className={cn(
                    blockReset,
                    "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md transition-transform duration-200 ease-pui-out",
                  )}
                  style={{ transform: `translate(${tip.flip ? "16px" : "calc(-100% - 16px)"}, -50%)` }}
                >
                  <div className={cn(blockReset, "flex items-center gap-2")}>
                    <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: activeInfo.color }} />
                    <span className={cn(blockReset, "text-xs font-semibold")}>{activeInfo.label}</span>
                  </div>
                  <div className={cn(blockReset, "mt-1 flex items-baseline gap-2")}>
                    <span className={cn(blockReset, "text-sm font-semibold tabular-nums")}>{fmt(activeInfo.value)}</span>
                    <span className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>{pctFmt(activeInfo.share)} of total</span>
                  </div>
                  <div className={cn(blockReset, "mt-1.5 h-1 w-32 overflow-hidden rounded-pui-full bg-pui-muted")}>
                    <motion.div
                      className={cn(blockReset, "h-full rounded-pui-full")}
                      style={{ background: activeInfo.color }}
                      initial={false}
                      animate={{ width: `${activeInfo.share * 100}%` }}
                      transition={anim.reducedMotion ? instant : chartMotion.update}
                    />
                  </div>
                  {activeInfo.merged.length ? (
                    <div className={cn(blockReset, "mt-1.5 max-w-48 text-[11px] text-pui-muted-foreground")}>
                      Includes {activeInfo.merged.map((d) => String(readAccessor(label, d, 0))).join(", ")}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {legendNode}
      </div>
      <span id={`${uid}-help`} className={srOnly}>
        Arrow keys move between slices, Home and End jump to the ends, Enter selects, Escape clears, T shows the data table.
      </span>
      <p id={descId} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
      <div className={tableVisible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : srOnly}>
        <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
          <caption className={cn(blockReset, tableVisible ? "px-3 py-2 text-left font-medium" : "")}>{typeof title === "string" ? title : nameText}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                Slice
              </th>
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                Value
              </th>
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={cn(blockReset, "border-t border-pui-border")}>
                <th scope="row" className={cn(blockReset, "px-3 py-1 font-normal")}>
                  {r.label}
                </th>
                <td className={cn(blockReset, "px-3 py-1")}>{fmt(r.value)}</td>
                <td className={cn(blockReset, "px-3 py-1")}>{hiddenSet.has(r.key) ? "hidden" : pctFmt(info(i).share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const PieChartBase = React.forwardRef(PieChartBaseInner) as <T>(props: Omit<PieChartProps<T>, "drill"> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement;

function DrillPieChart<T>({ drill, forwardedRef, ...props }: PieChartProps<T> & { drill: PieChartDrill<T>; forwardedRef: React.ForwardedRef<HTMLElement> }) {
  const { data, onSliceClick, onKeyDown, toolbar } = props;
  const stack = useDrillStack(data, drill.rootLabel ?? "All");
  const figureRef = React.useRef<HTMLElement>(null);
  const ref = React.useMemo(() => mergeRefs(forwardedRef, figureRef), [forwardedRef]);
  const viaKeyboard = React.useRef(false);
  const reducedMotion = usePrefersReducedMotion();
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
    <PieChartBase<T>
      key={stack.key}
      ref={ref}
      {...props}
      data={stack.data}
      defaultSelected={null}
      toolbar={
        <>
          <ChartBreadcrumb items={stack.crumbs} onNavigate={stack.goTo} reducedMotion={reducedMotion} />
          {toolbar}
        </>
      }
      onSliceClick={(slice, event) => {
        onSliceClick?.(slice, event);
        const kids = slice.datum ? drill.children(slice.datum) : null;
        if (!kids?.length) return;
        viaKeyboard.current = event.type === "keydown";
        stack.push(slice.label, kids);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || !stack.level || (event.key !== "Escape" && event.key !== "Backspace")) return;
        event.preventDefault();
        viaKeyboard.current = true;
        stack.goTo(stack.level - 1);
      }}
    />
  );
}

function PieChartInner<T>({ drill, ...props }: PieChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  if (drill) return <DrillPieChart<T> {...props} drill={drill} forwardedRef={ref} />;
  return <PieChartBase<T> ref={ref} {...props} />;
}

/**
 * Pie chart: padded, rounded slices with a sweep entrance, hover explode, rich tooltip, legend
 * toggles (Alt+click isolates), inside or outside labels, "Other" bucketing and keyboard support.
 */
export const PieChart = React.forwardRef(PieChartInner) as (<T>(props: PieChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
PieChart.displayName = "PieChart";

function DonutChartInner<T>({ innerRadius = 0.62, padAngle = 1.4, cornerRadius = 5, labels = "none", ...props }: PieChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  return <PieChart<T> ref={ref} innerRadius={innerRadius} padAngle={padAngle} cornerRadius={cornerRadius} labels={labels} {...props} />;
}

/** PieChart with a hole: rounded padded ring, rolling center total, active slice in the center. */
export const DonutChart = React.forwardRef(DonutChartInner) as (<T>(props: PieChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
DonutChart.displayName = "DonutChart";
