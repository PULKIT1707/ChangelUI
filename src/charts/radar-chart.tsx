"use client";

// Radar (spider) chart: polygon or circular grid, several series that grow from the center and
// morph on data changes, per-axis maxima, axis snapping (hovering a direction highlights every
// series on that axis), nearest-point series snapping, legend toggles that collapse a series to
// the center (Alt+click isolates), and 2D keyboard exploration (axes with left/right, series with
// up/down) announced in a live region.
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { polar, type Point } from "./core/path";
import { nice } from "./core/ticks";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };
const TAU = Math.PI * 2;

export interface RadarSeries<T> {
  id: string;
  value: Accessor<T, number | null | undefined>;
  label?: string;
  color?: string;
  /** Start hidden (toggle it back on from the legend). */
  hidden?: boolean;
}

export interface RadarChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** One row per axis (spoke). */
  data: readonly T[];
  /** Axis name. */
  axis: Accessor<T, string>;
  series: readonly RadarSeries<T>[];
  /** Scale maximum: one number for every axis, or a per-axis accessor. Default: the nice data max. */
  max?: number | Accessor<T, number>;
  /** Scale minimum (the center). Default 0. */
  min?: number;
  /** Grid rings. Default 5. */
  levels?: number;
  /** Default "polygon". */
  grid?: "polygon" | "circle";
  /** Area fill opacity, 0..1. Default 0.18. */
  fillOpacity?: number;
  /** Default "linear". "smooth" draws closed Catmull-Rom curves. */
  curve?: "linear" | "smooth";
  /** Dots at each value. Default true. */
  markers?: boolean;
  /** Diameter of the web in px (scales down with the container). Default 300. */
  size?: number;
  /** Default "top" with 2+ series, else "none". */
  legend?: "top" | "bottom" | "none";
  /** Ring value labels along the first spoke. Default true. */
  levelLabels?: boolean;
  format?: NumberFormat;
  locale?: string;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  hiddenSeries?: string[];
  defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (ids: string[]) => void;
  /** Called with the axis (and series) under the pointer or keyboard focus. */
  onActiveChange?: (active: { axis: number; series: string | null } | null) => void;
  formatAnnouncement?: (ctx: { axis: string; axisIndex: number; axisCount: number; items: Array<{ id: string; label: string; value: string }>; focusedSeries: string | null }) => string;
  summary?: string;
  chartLabel?: string;
}

/** Closed polygon or a closed Catmull-Rom spline through the points. */
function closedPath(points: readonly Point[], smooth: boolean): string {
  const n = points.length;
  if (!n) return "";
  const f = (v: number) => Math.round(v * 100) / 100;
  if (!smooth || n < 3) return `M${points.map((p) => `${f(p[0])},${f(p[1])}`).join("L")}Z`;
  let d = `M${f((points[0] as Point)[0])},${f((points[0] as Point)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n] as Point;
    const p1 = points[i] as Point;
    const p2 = points[(i + 1) % n] as Point;
    const p3 = points[(i + 2) % n] as Point;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)},${f(c1y)},${f(c2x)},${f(c2y)},${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
}

function SeriesShape({
  tween,
  grow,
  offset,
  count,
  radius,
  cx,
  cy,
  smooth,
  color,
  fillOpacity,
  emphasis,
}: {
  tween: MotionValue<Float64Array>;
  grow: MotionValue<number>;
  offset: number;
  count: number;
  radius: number;
  cx: number;
  cy: number;
  smooth: boolean;
  color: string;
  fillOpacity: number;
  emphasis: "normal" | "on" | "off";
}) {
  const d = useTransform(() => {
    const g = tween.get();
    const k = grow.get();
    const pts: Point[] = [];
    for (let i = 0; i < count; i++) pts.push(polar((i / count) * TAU, Math.max(0, (g[offset + i] ?? 0) * radius * k), cx, cy));
    return closedPath(pts, smooth);
  });
  const fill = emphasis === "off" ? fillOpacity * 0.25 : emphasis === "on" ? Math.min(0.5, fillOpacity * 1.8) : fillOpacity;
  return (
    <motion.path
      d={d}
      fill={color}
      stroke={color}
      strokeLinejoin="round"
      initial={false}
      animate={{ fillOpacity: fill, strokeOpacity: emphasis === "off" ? 0.25 : 1, strokeWidth: emphasis === "on" ? 2.75 : 2 }}
      transition={chartMotion.fade}
    />
  );
}

function Marker({ tween, grow, index, radius, angle, cx, cy, color, size, dim }: { tween: MotionValue<Float64Array>; grow: MotionValue<number>; index: number; radius: number; angle: number; cx: number; cy: number; color: string; size: number; dim: boolean }) {
  const x = useTransform(() => polar(angle, Math.max(0, (tween.get()[index] ?? 0) * radius * grow.get()), cx, cy)[0]);
  const y = useTransform(() => polar(angle, Math.max(0, (tween.get()[index] ?? 0) * radius * grow.get()), cx, cy)[1]);
  return (
    <motion.circle
      cx={x}
      cy={y}
      fill={color}
      stroke="var(--pui-background)"
      strokeWidth={1.5}
      initial={false}
      animate={{ r: size, opacity: dim ? 0.25 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  );
}

function RadarChartInner<T>(props: RadarChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    axis,
    series,
    max,
    min = 0,
    levels = 5,
    grid = "polygon",
    fillOpacity = 0.18,
    curve = "linear",
    markers = true,
    size = 300,
    legend: legendProp,
    levelLabels = true,
    format,
    locale = "en-US",
    animation = "auto",
    title,
    description,
    titleAs: TitleTag = "h3",
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
    onActiveChange,
    formatAnnouncement,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;

  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const [innerHidden, setInnerHidden] = React.useState<string[]>(() => defaultHiddenSeries ?? series.filter((s) => s.hidden).map((s) => s.id));
  const hidden = hiddenSeries ?? innerHidden;
  const setHidden = (ids: string[]) => {
    if (hiddenSeries === undefined) setInnerHidden(ids);
    onHiddenSeriesChange?.(ids);
  };
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);
  const [solo, setSolo] = React.useState<{ id: string; restore: string[] } | null>(null);
  const [hoverAxis, setHoverAxis] = React.useState<number | null>(null);
  const [hoverSeries, setHoverSeries] = React.useState<string | null>(null);
  const [legendHover, setLegendHover] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState<{ axis: number; series: number | null } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);

  const n = data.length;
  const axes = React.useMemo(() => data.map((d, i) => String(readAccessor(axis, d, i))), [data, axis]);
  const resolved = React.useMemo(
    () =>
      series.map((s, k) => ({
        id: s.id,
        label: s.label ?? s.id,
        color: s.color ?? categoricalColor(k),
        values: data.map((d, i) => {
          const v = Number(readAccessor(s.value, d, i));
          return Number.isFinite(v) ? v : null;
        }),
      })),
    [series, data],
  );
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const globalMax = React.useMemo(() => {
    const all = resolved.flatMap((s) => s.values.filter((v): v is number => v !== null));
    const hi = Math.max(min + 1e-9, ...all);
    return nice(min, hi, levels)[1];
  }, [resolved, min, levels]);
  const maxes = React.useMemo(
    () => data.map((d, i) => (typeof max === "number" ? max : max ? Number(readAccessor(max, d, i)) || globalMax : globalMax)),
    [data, max, globalMax],
  );
  const perAxis = typeof max === "function" || typeof max === "string";

  // Geometry.
  const widest = Math.max(0, ...axes.map((a) => estimateTextWidth(a, 11)));
  const mx = Math.min(120, Math.ceil(widest) + 14);
  const my = 26;
  const R = size / 2;
  const W = size + mx * 2;
  const H = size + my * 2;
  const cx = W / 2;
  const cy = H / 2;
  const angleOf = (i: number) => (i / Math.max(1, n)) * TAU;

  const target = React.useMemo(() => {
    const g = new Float64Array(resolved.length * n);
    resolved.forEach((s, k) => {
      const off = hiddenSet.has(s.id);
      s.values.forEach((v, i) => {
        const hi = maxes[i] ?? globalMax;
        g[k * n + i] = off || v === null ? 0 : Math.max(0, Math.min(1.08, (v - min) / ((hi - min) || 1)));
      });
    });
    return g;
  }, [resolved, n, hiddenSet, maxes, globalMax, min]);
  const tween = useDataTween(target, { enabled: anim.updates, resetKey: `${resolved.length}x${n}` });
  const grow = useMotionValue(anim.entrance ? 0 : 1);
  React.useEffect(() => {
    if (!anim.entrance) {
      grow.set(1);
      return;
    }
    const controls = animate(grow, 1, { type: "spring", stiffness: 120, damping: 18 });
    return () => controls.stop();
  }, [anim.entrance, grow]);

  const visibleIdx = resolved.map((s, k) => (hiddenSet.has(s.id) ? -1 : k)).filter((k) => k >= 0);
  const activeAxis = focus?.axis ?? hoverAxis;
  const focusedSeriesId = focus?.series !== null && focus?.series !== undefined ? (resolved[focus.series]?.id ?? null) : null;
  const activeSeries = focusedSeriesId ?? hoverSeries ?? legendHover;

  const lastActive = React.useRef<string>("");
  React.useEffect(() => {
    const keyNow = activeAxis === null ? "" : `${activeAxis}:${activeSeries ?? ""}`;
    if (keyNow === lastActive.current) return;
    lastActive.current = keyNow;
    onActiveChange?.(activeAxis === null ? null : { axis: activeAxis, series: activeSeries });
  }, [activeAxis, activeSeries, onActiveChange]);

  const itemsAt = (i: number) =>
    visibleIdx
      .map((k) => resolved[k])
      .filter((s): s is NonNullable<typeof s> => !!s && s.values[i] !== null)
      .map((s) => ({ id: s.id, label: s.label, color: s.color, raw: s.values[i] as number, value: fmt(s.values[i] as number) }));

  const announce = (axisIndex: number, seriesIndex: number | null) => {
    const items = itemsAt(axisIndex);
    const focused = seriesIndex !== null ? (resolved[seriesIndex]?.id ?? null) : null;
    if (formatAnnouncement) {
      setAnnouncement(formatAnnouncement({ axis: axes[axisIndex] ?? "", axisIndex, axisCount: n, items, focusedSeries: focused }));
      return;
    }
    const hi = maxes[axisIndex] ?? globalMax;
    if (focused) {
      const it = items.find((x) => x.id === focused);
      setAnnouncement(`${it?.label ?? focused}, ${axes[axisIndex]}: ${it ? it.value : "no data"} of ${fmt(hi)}. Axis ${axisIndex + 1} of ${n}.`);
    } else {
      setAnnouncement(`${axes[axisIndex]}: ${items.map((x) => `${x.label} ${x.value}`).join(", ") || "no data"}. Axis ${axisIndex + 1} of ${n}.`);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !n) return;
    const x = ((event.clientX - rect.left) / rect.width) * W - cx;
    const y = ((event.clientY - rect.top) / rect.height) * H - cy;
    const r = Math.hypot(x, y);
    if (r > R + 34) {
      setHoverAxis(null);
      setHoverSeries(null);
      return;
    }
    let a = Math.atan2(x, -y);
    if (a < 0) a += TAU;
    const i = Math.round(a / (TAU / n)) % n;
    setHoverAxis(i);
    // Nearest visible series point on that axis (within 18 px).
    const g = tween.get();
    let best: string | null = null;
    let bestD = 18;
    for (const k of visibleIdx) {
      const s = resolved[k];
      if (!s) continue;
      const [px, py] = polar(angleOf(i), (g[k * n + i] ?? 0) * R, 0, 0);
      const dist = Math.hypot(px - x, py - y);
      if (dist < bestD) {
        bestD = dist;
        best = s.id;
      }
    }
    setHoverSeries(best);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n || event.metaKey || event.ctrlKey) return;
    const cur = focus ?? { axis: -1, series: null };
    let next: { axis: number; series: number | null } | null = null;
    if (event.key === "ArrowRight") next = { axis: (cur.axis + 1 + n) % n, series: cur.series };
    else if (event.key === "ArrowLeft") next = { axis: cur.axis < 0 ? n - 1 : (cur.axis - 1 + n) % n, series: cur.series };
    else if (event.key === "Home") next = { axis: 0, series: cur.series };
    else if (event.key === "End") next = { axis: n - 1, series: cur.series };
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!visibleIdx.length) return;
      const pos = cur.series === null ? -1 : visibleIdx.indexOf(cur.series);
      const dir = event.key === "ArrowDown" ? 1 : -1;
      const np = pos < 0 ? (dir > 0 ? 0 : visibleIdx.length - 1) : pos + dir;
      next = { axis: Math.max(0, cur.axis), series: np < 0 || np >= visibleIdx.length ? null : (visibleIdx[np] as number) };
    } else if (event.key === "Escape" && focus) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (!next) return;
    event.preventDefault();
    setFocus(next);
    announce(next.axis, next.series);
  };

  const toggle = (id: string, alt: boolean) => {
    if (alt) {
      if (solo?.id === id) {
        setHidden(solo.restore);
        setSolo(null);
      } else {
        setSolo({ id, restore: solo ? solo.restore : hidden });
        setHidden(resolved.map((s) => s.id).filter((x) => x !== id));
      }
      return;
    }
    setSolo(null);
    setHidden(hiddenSet.has(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
  };

  // Grid.
  const ring = (t: number) => (grid === "circle" ? null : closedPath(axes.map((_, i) => polar(angleOf(i), R * t, cx, cy)), false));
  const legend = legendProp ?? (series.length > 1 ? "top" : "none");
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Radar chart");
  const titleId = `${uid}-title`;
  const descId = `${uid}-summary`;
  const summaryText =
    summary ??
    (n && visibleIdx.length
      ? `${n} axes, ${visibleIdx.length} series. ` +
        visibleIdx
          .slice(0, 4)
          .map((k) => {
            const s = resolved[k];
            if (!s) return "";
            let bi = -1;
            let wi = -1;
            const norm = (j: number) => ((s.values[j] as number) - min) / ((maxes[j] ?? globalMax) - min || 1);
            s.values.forEach((v, i) => {
              if (v === null) return;
              if (bi < 0 || norm(i) > norm(bi)) bi = i;
              if (wi < 0 || norm(i) < norm(wi)) wi = i;
            });
            if (bi < 0) return `${s.label} has no data.`;
            return `${s.label} is strongest in ${axes[bi]} (${fmt(s.values[bi] ?? 0)}) and weakest in ${axes[wi]} (${fmt(s.values[wi] ?? 0)}).`;
          })
          .join(" ")
      : "No data.");

  // Tooltip anchor at the axis end.
  let tip: { left: number; top: number; flip: boolean; items: ReturnType<typeof itemsAt> } | null = null;
  if (activeAxis !== null && activeAxis < n) {
    const [tx, ty] = polar(angleOf(activeAxis), R * 0.62, cx, cy);
    tip = { left: tx / W, top: ty / H, flip: tx > cx + 4, items: itemsAt(activeAxis).sort((a, b) => b.raw - a.raw) };
  }
  const pct = (v: number, hi: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format((v - min) / ((hi - min) || 1));

  const legendNode =
    legend === "none" ? null : (
      <div role="group" aria-label="Series" className={cn(blockReset, "flex flex-wrap justify-center gap-1")}>
        {resolved.map((s) => {
          const off = hiddenSet.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={!off}
              title="Click to toggle, Alt+click to show only this series"
              onClick={(event) => toggle(s.id, event.altKey)}
              onPointerEnter={() => !off && setLegendHover(s.id)}
              onPointerLeave={() => setLegendHover(null)}
              onFocus={() => !off && setLegendHover(s.id)}
              onBlur={() => setLegendHover(null)}
              className={cn(
                controlReset,
                focusRing,
                "inline-flex min-h-6 cursor-pointer items-center gap-2 rounded-pui-md px-2 py-1 text-xs transition-[opacity,background-color] duration-150 hover:bg-pui-muted",
                off ? "text-pui-muted-foreground" : "text-pui-foreground",
                activeSeries && activeSeries !== s.id ? "opacity-55" : "",
              )}
            >
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ scale: off ? 0.7 : 1, opacity: off ? 0.4 : 1 }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 30 }}
                className={cn(blockReset, "size-2.5 rounded-[3px]")}
                style={{ background: s.color }}
              />
              <span className={off ? "line-through decoration-1" : ""}>{s.label}</span>
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
      {legend === "top" ? legendNode : null}
      <div className={cn(blockReset, "relative mx-auto w-full select-none")} style={{ maxWidth: W, aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          {/* Grid rings (alternate bands) */}
          {Array.from({ length: levels }, (_, k) => {
            const t = (levels - k) / levels;
            const d = ring(t);
            const fill = k % 2 === 0 ? withOpacity("var(--pui-muted)", 0.45) : "transparent";
            return d ? (
              <path key={k} d={d} fill={fill} stroke="var(--pui-chart-grid)" strokeWidth={1} />
            ) : (
              <circle key={k} cx={cx} cy={cy} r={R * t} fill={fill} stroke="var(--pui-chart-grid)" strokeWidth={1} />
            );
          })}
          {/* Spokes */}
          {axes.map((_, i) => {
            const [x, y] = polar(angleOf(i), R, cx, cy);
            const on = activeAxis === i;
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={on ? "var(--pui-chart-crosshair)" : "var(--pui-chart-grid)"}
                strokeWidth={on ? 1.5 : 1}
                strokeDasharray={on ? "4 4" : undefined}
              />
            );
          })}
          {/* Level labels along the first spoke */}
          {levelLabels && !perAxis
            ? Array.from({ length: levels }, (_, k) => {
                const t = (k + 1) / levels;
                const [x, y] = polar(0, R * t, cx, cy);
                return (
                  <text key={k} x={x + 4} y={y} dy="0.35em" fontSize={9} fill="var(--pui-muted-foreground)" className="tabular-nums" opacity={0.8}>
                    {fmt(min + (globalMax - min) * t)}
                  </text>
                );
              })
            : null}
          {/* Series */}
          {resolved.map((s, k) => (
            <SeriesShape
              key={s.id}
              tween={tween}
              grow={grow}
              offset={k * n}
              count={n}
              radius={R}
              cx={cx}
              cy={cy}
              smooth={curve === "smooth"}
              color={s.color}
              fillOpacity={hiddenSet.has(s.id) ? 0 : fillOpacity}
              emphasis={activeSeries === null ? "normal" : activeSeries === s.id ? "on" : "off"}
            />
          ))}
          {markers
            ? resolved.map((s, k) =>
                hiddenSet.has(s.id)
                  ? null
                  : axes.map((_, i) => (
                      <Marker
                        key={`${s.id}-${i}`}
                        tween={tween}
                        grow={grow}
                        index={k * n + i}
                        radius={R}
                        angle={angleOf(i)}
                        cx={cx}
                        cy={cy}
                        color={s.color}
                        size={activeAxis === i ? (activeSeries === s.id ? 6 : 4.5) : 3}
                        dim={activeSeries !== null && activeSeries !== s.id}
                      />
                    )),
              )
            : null}
          {/* Axis labels */}
          {axes.map((a, i) => {
            const ang = angleOf(i);
            const [x, y] = polar(ang, R + 12, cx, cy);
            const sin = Math.sin(ang);
            const cos = Math.cos(ang);
            const on = activeAxis === i;
            return (
              <g key={i}>
                <text
                  x={x}
                  y={y}
                  dy={cos > 0.3 ? "-0.2em" : cos < -0.3 ? "0.9em" : "0.35em"}
                  textAnchor={sin > 0.2 ? "start" : sin < -0.2 ? "end" : "middle"}
                  fontSize={11}
                  fontWeight={on ? 700 : 500}
                  fill={on ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}
                  style={{ transition: "fill 150ms" }}
                >
                  {a}
                </text>
                {perAxis ? (
                  <text x={x} y={y} dy={cos > 0.3 ? "-1.4em" : cos < -0.3 ? "2.1em" : "1.55em"} textAnchor={sin > 0.2 ? "start" : sin < -0.2 ? "end" : "middle"} fontSize={9} fill="var(--pui-muted-foreground)" opacity={0.75} className="tabular-nums">
                    max {fmt(maxes[i] ?? globalMax)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="interactive chart"
          aria-label={`${nameText}. Use arrow keys to explore.`}
          aria-describedby={`${uid}-help`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setHoverAxis(null);
            setHoverSeries(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-0 rounded-pui-lg")}
          style={{ touchAction: "pan-y" }}
        />
        <AnimatePresence>
          {tip && tip.items.length ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
              animate={{ opacity: 1, scale: 1, left: `${tip.left * 100}%`, top: `${tip.top * 100}%` }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={anim.reducedMotion ? instant : glide}
              className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
            >
              <div
                className={cn(blockReset, "min-w-40 rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: `translate(${tip.flip ? "16px" : "calc(-100% - 16px)"}, -50%)` }}
              >
                <div className={cn(blockReset, "mb-1 flex items-baseline justify-between gap-3 text-[11px] font-semibold text-pui-muted-foreground")}>
                  <span>{activeAxis !== null ? axes[activeAxis] : ""}</span>
                  <span className={cn(blockReset, "font-normal tabular-nums")}>of {fmt(maxes[activeAxis ?? 0] ?? globalMax)}</span>
                </div>
                <div className={cn(blockReset, "flex flex-col gap-0.5")}>
                  {tip.items.map((it) => {
                    const on = activeSeries === it.id;
                    return (
                      <div
                        key={it.id}
                        className={cn(blockReset, "-mx-1.5 flex items-center gap-2 rounded-pui-sm px-1.5 py-0.5 text-xs transition-colors", on ? "bg-pui-muted" : "", activeSeries && !on ? "opacity-60" : "")}
                      >
                        <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: it.color }} />
                        <span className={cn(blockReset, "min-w-0 flex-1 truncate")}>{it.label}</span>
                        <span className={cn(blockReset, "text-[10px] tabular-nums text-pui-muted-foreground")}>{pct(it.raw, maxes[activeAxis ?? 0] ?? globalMax)}</span>
                        <span className={cn(blockReset, "font-semibold tabular-nums")}>{it.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {legend === "bottom" ? legendNode : null}
      <span id={`${uid}-help`} className={srOnly}>
        Left and right arrows move between axes, up and down move between series, Home and End jump to the first and last axis, Escape clears, T shows the data table.
      </span>
      <p id={descId} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
      <div className={tableVisible ? cn(blockReset, "max-h-64 overflow-auto rounded-pui-md border border-pui-border text-xs") : srOnly}>
        <table className={cn(blockReset, "w-full border-collapse text-left tabular-nums")}>
          <caption className={cn(blockReset, tableVisible ? "px-3 py-2 text-left font-medium" : "")}>{nameText}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                Axis
              </th>
              {resolved.map((s) => (
                <th key={s.id} scope="col" className={cn(blockReset, "px-3 py-1.5 font-medium")}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {axes.map((a, i) => (
              <tr key={`${a}-${i}`} className={cn(blockReset, "border-t border-pui-border")}>
                <th scope="row" className={cn(blockReset, "px-3 py-1 font-normal")}>
                  {a}
                </th>
                {resolved.map((s) => (
                  <td key={s.id} className={cn(blockReset, "px-3 py-1")}>
                    {hiddenSet.has(s.id) ? "hidden" : s.values[i] === null ? "no data" : fmt(s.values[i] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Radar chart: polygon or circle grid, series that grow from the center and morph on updates,
 * axis and point snapping with a rich tooltip, legend toggles and 2D keyboard exploration.
 */
export const RadarChart = React.forwardRef(RadarChartInner) as (<T>(props: RadarChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
RadarChart.displayName = "RadarChart";
