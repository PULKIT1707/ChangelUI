"use client";

// Live chart: a realtime stream in "scroll" mode (a ticker that glides left continuously between
// pushes, with one interval of lag so new points slide in from the edge) or "sweep" mode (an ECG
// / oscilloscope cursor that wraps and erases ahead with a gap). Glowing head dots ride the line,
// values over a threshold turn the danger color, the y axis glides to fit the window, and a stats
// strip shows the current value and the window's min / avg / max. Hover or focus pauses it
// (WCAG 2.2.2), so the paused frame can be explored with a crosshair or the arrow keys; a counter
// shows how many points arrived meanwhile. The live region speaks at most once every 5 seconds.
import { motion, motionValue, useInView, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { categoricalColor, withOpacity } from "./core/color";
import { formatDate, formatNumber, getNumberFormat, type DateFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTip, TipRow, useChartUid } from "./core/frame";
import { useGlide } from "./core/glide";
import { areaToBaseline, linePath } from "./core/path";
import { nice, ticks as niceTicks } from "./core/ticks";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

/** One sample: `t` (epoch ms) plus one number per series key. */
export type LiveDatum = { t: number } & Record<string, number>;

export interface LiveSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface UseChartStreamOptions {
  /** Max points kept. Default 600. */
  capacity?: number;
  /** Drop points older than this (relative to the newest). Default: keep by capacity only. */
  windowMs?: number;
  initial?: readonly LiveDatum[];
}

export interface ChartStream {
  data: readonly LiveDatum[];
  push: (point: LiveDatum | readonly LiveDatum[]) => void;
  clear: () => void;
}

/** A bounded ring of samples for LiveChart: push points as they arrive, render `data`. */
export function useChartStream({ capacity = 600, windowMs, initial = [] }: UseChartStreamOptions = {}): ChartStream {
  const [data, setData] = React.useState<readonly LiveDatum[]>(initial);
  const push = React.useCallback(
    (point: LiveDatum | readonly LiveDatum[]) =>
      setData((prev) => {
        const add = (Array.isArray(point) ? point : [point]) as readonly LiveDatum[];
        let next = prev.concat(add);
        if (next.length > capacity) next = next.slice(next.length - capacity);
        if (windowMs !== undefined && next.length) {
          const cut = (next[next.length - 1] as LiveDatum).t - windowMs * 1.2;
          let k = 0;
          while (k < next.length - 2 && (next[k] as LiveDatum).t < cut) k++;
          if (k) next = next.slice(k);
        }
        return next;
      }),
    [capacity, windowMs],
  );
  const clear = React.useCallback(() => setData([]), []);
  return { data, push, clear };
}

export interface LiveChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  data: readonly LiveDatum[];
  /** Default [{ key: "value" }]. */
  series?: readonly LiveSeries[];
  /** Default "scroll". */
  mode?: "scroll" | "sweep";
  /** Visible time span. Default 30000. */
  windowMs?: number;
  /** Expected time between pushes (sets the scroll speed). Default 1000. */
  intervalMs?: number;
  /** "auto" fits the window (gliding). Default "auto". */
  yDomain?: "auto" | readonly [number, number];
  /** Values above it turn the danger color. */
  threshold?: number;
  thresholdLabel?: string;
  /** Gradient area under the first series. Default true. */
  area?: boolean;
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** Hover / focus pause the view. Default true. */
  pauseOnHover?: boolean;
  /** Current value and window stats. Default true. */
  stats?: boolean;
  /** Polite update at most every 5 s. Default true. */
  announce?: boolean;
  /** Plot height in px. Default 200. */
  height?: number;
  format?: NumberFormat;
  timeFormat?: DateFormat;
  locale?: string;
  timeZone?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  summary?: string;
  chartLabel?: string;
}

function HeadDot({ x, y, color, glow }: { x: number | MotionValue<number>; y: MotionValue<number>; color: string; glow: boolean }) {
  return (
    <motion.g style={{ x, y }}>
      {glow ? (
        <motion.circle r={5} fill={color} initial={{ opacity: 0.5, scale: 1 }} animate={{ opacity: [0.5, 0], scale: [1, 3] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} />
      ) : null}
      <circle r={4.5} fill={color} stroke="var(--pui-background)" strokeWidth={2} />
    </motion.g>
  );
}

const DEFAULT_SERIES: readonly LiveSeries[] = [{ key: "value", label: "Value" }];

export const LiveChart = React.forwardRef<HTMLElement, LiveChartProps>(function LiveChart(
  {
    data: liveData,
    series = DEFAULT_SERIES,
    mode = "scroll",
    windowMs = 30_000,
    intervalMs = 1000,
    yDomain = "auto",
    threshold,
    thresholdLabel,
    area = true,
    paused: pausedProp,
    defaultPaused = false,
    onPausedChange,
    pauseOnHover = true,
    stats = true,
    announce = true,
    height = 200,
    format,
    timeFormat = { hour: "numeric", minute: "2-digit", second: "2-digit" },
    locale = "en-US",
    timeZone = "UTC",
    initialWidth = 640,
    animation = "auto",
    title,
    description,
    titleAs,
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
  const { width } = useChartSize(boxRef, { initialWidth, height });
  const inView = useInView(boxRef);
  const visible = useDocumentVisible();
  const [pausedLocal, setPausedLocal] = React.useState(defaultPaused);
  const userPaused = pausedProp ?? pausedLocal;
  const setUserPaused = (p: boolean) => {
    if (pausedProp === undefined) setPausedLocal(p);
    onPausedChange?.(p);
  };
  const [hovering, setHovering] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [hoverPx, setHoverPx] = React.useState<number | null>(null);
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const paused = userPaused || (pauseOnHover && (hovering || focused));
  // The frame shown while paused.
  const [frozen, setFrozen] = React.useState<readonly LiveDatum[] | null>(null);
  const [wasPaused, setWasPaused] = React.useState(paused);
  if (wasPaused !== paused) {
    setWasPaused(paused);
    setFrozen(paused ? liveData : null);
    if (!paused) {
      setHoverPx(null);
      setFocusIndex(null);
    }
  }
  const data = paused && frozen ? frozen : liveData;
  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const fmtTime = (t: number) => formatDate(t, timeFormat, locale, timeZone);

  // Geometry.
  const W = Math.max(200, width);
  const m = { left: 8, right: 46, top: 10, bottom: 22 };
  const plotW = W - m.left - m.right;
  const H = height;
  const plotH = H - m.top - m.bottom;
  const pxPerMs = plotW / windowMs;
  const n = data.length;
  const last = data[n - 1];
  const tLast = last?.t ?? 0;

  // Window rows and y domain.
  const windowRows = React.useMemo(() => data.filter((d) => d.t >= tLast - windowMs - intervalMs * 2), [data, tLast, windowMs, intervalMs]);
  const targetDomain = React.useMemo(() => {
    if (yDomain !== "auto") return [yDomain[0], yDomain[1]];
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of windowRows)
      for (const s of series) {
        const v = d[s.key];
        if (typeof v === "number" && Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    if (threshold !== undefined) {
      lo = Math.min(lo, threshold);
      hi = Math.max(hi, threshold);
    }
    if (!Number.isFinite(lo)) return [0, 1];
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
    return nice(lo - pad, hi + pad, 4);
  }, [yDomain, windowRows, series, threshold]);
  const dom = useGlide(targetDomain, anim.updates);
  const [y0, y1] = [dom[0] as number, dom[1] as number];
  const yOf = (v: number) => m.top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;
  const yTicks = niceTicks(y0, y1, 4).filter((t) => t >= y0 - 1e-9 && t <= y1 + 1e-9);
  const plotRight = m.left + plotW;
  const sweep = mode === "sweep";
  // Scroll mode renders relative to the newest point; the group then glides by `slide`.
  const baseX = (t: number) => plotRight - (tLast - t) * pxPerMs;
  const sweepX = (t: number) => m.left + ((((t % windowMs) + windowMs) % windowMs) / windowMs) * plotW;
  const smooth = !sweep && !paused && !anim.reducedMotion;

  // Motion values driven by the frame loop (no React renders per frame).
  const slide = React.useMemo(() => motionValue(0), []);
  const heads = React.useRef(new Map<string, MotionValue<number>>());
  const headOf = (key: string) => {
    let mv = heads.current.get(key);
    if (!mv) {
      mv = motionValue(0);
      heads.current.set(key, mv);
    }
    return mv;
  };
  const pushedAt = React.useRef(0);
  const geom = useLatestRef({ intervalMs, pxPerMs, yOf, data, series, smooth });
  useIsomorphicLayoutEffect(() => {
    pushedAt.current = typeof performance !== "undefined" ? performance.now() : 0;
  }, [tLast]);
  React.useEffect(() => {
    const apply = (progress: number) => {
      const g = geom.current;
      const p = Math.max(0, Math.min(1, progress));
      slide.set(g.smooth ? (1 - p) * g.intervalMs * g.pxPerMs : 0);
      const a = g.data[g.data.length - 2];
      const b = g.data[g.data.length - 1];
      for (const s of g.series) {
        const vb = b?.[s.key];
        const va = a?.[s.key] ?? vb;
        if (typeof vb !== "number") continue;
        headOf(s.key).set(g.yOf(g.smooth ? (va as number) + (vb - (va as number)) * p : vb));
      }
    };
    if (!smooth || !inView || !visible) {
      apply(1);
      return;
    }
    let raf = 0;
    const step = () => {
      const g = geom.current;
      apply((performance.now() - pushedAt.current) / Math.max(1, g.intervalMs));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  // Paths.
  const thrY = threshold !== undefined ? yOf(threshold) : null;
  const paths = series.map((s, k) => {
    const color = s.color ?? categoricalColor(k);
    if (sweep) {
      // Wraps at the right edge; the oldest 6% of the window is erased ahead of the cursor.
      const cutoff = tLast - windowMs * 0.94;
      const segs: Array<Array<readonly [number, number]>> = [[]];
      let prevX = -Infinity;
      for (const d of windowRows) {
        const v = d[s.key];
        if (d.t < cutoff || typeof v !== "number") continue;
        const xx = sweepX(d.t);
        if (xx < prevX) segs.push([]);
        prevX = xx;
        (segs[segs.length - 1] as Array<readonly [number, number]>).push([xx, yOf(v)]);
      }
      return { color, line: segs.map((p) => linePath(p, { curve: "monotone" })).join(""), area: k === 0 && area ? segs.map((p) => areaToBaseline(p, m.top + plotH, { curve: "monotone" })).join("") : "" };
    }
    const pts = windowRows.flatMap((d) => (typeof d[s.key] === "number" ? [[baseX(d.t), yOf(d[s.key] as number)] as const] : []));
    return { color, line: linePath(pts, { curve: "monotone" }), area: k === 0 && area ? areaToBaseline(pts, m.top + plotH, { curve: "monotone" }) : "" };
  });

  // Stats of the window (first series).
  const key0 = series[0]?.key ?? "value";
  const vals = windowRows.map((d) => d[key0]).filter((v): v is number => typeof v === "number");
  const current = last?.[key0];
  const first = vals[0];
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const breaches = threshold !== undefined ? vals.filter((v) => v > threshold).length : 0;
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
  const change = typeof current === "number" && typeof first === "number" && first !== 0 ? (current - first) / Math.abs(first) : null;
  const missed = paused && frozen ? liveData.filter((d) => d.t > (frozen[frozen.length - 1]?.t ?? Infinity)).length : 0;

  // Throttled announcements (at most one per 5 s).
  const spokenAt = React.useRef(0);
  React.useEffect(() => {
    if (!announce || paused || typeof current !== "number") return;
    const now = Date.now();
    if (now - spokenAt.current < 5000) return;
    spokenAt.current = now;
    setAnnouncement(`${series[0]?.label ?? "Value"} ${fmt(current)}${change !== null ? `, ${pct.format(change)} over the window` : ""}${threshold !== undefined && current > threshold ? ", above threshold" : ""}.`);
  }, [announce, paused, current, change, fmt, pct, series, threshold]);

  // Crosshair while paused.
  const xOfRow = (d: LiveDatum) => (sweep ? sweepX(d.t) : baseX(d.t));
  let activeRow: LiveDatum | null = null;
  let activeIdx: number | null = null;
  if (paused) {
    if (focusIndex !== null) {
      activeIdx = Math.max(0, Math.min(windowRows.length - 1, focusIndex));
      activeRow = windowRows[activeIdx] ?? null;
    } else if (hoverPx !== null) {
      let bd = Infinity;
      windowRows.forEach((d, i) => {
        const dd = Math.abs(xOfRow(d) - hoverPx);
        if (dd < bd && xOfRow(d) >= m.left && xOfRow(d) <= plotRight) [bd, activeIdx, activeRow] = [dd, i, d];
      });
    }
  }
  const describeRow = (d: LiveDatum) => `${fmtTime(d.t)}: ${series.map((s) => `${s.label ?? s.key} ${typeof d[s.key] === "number" ? fmt(d[s.key] as number) : "no value"}`).join(", ")}.`;
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "p" || event.key === "P") {
      event.preventDefault();
      setUserPaused(!userPaused);
      setAnnouncement(userPaused ? "Resumed." : "Paused.");
      return;
    }
    if (!paused || !windowRows.length) return;
    let next: number | null = null;
    const cur = focusIndex ?? windowRows.length;
    if (event.key === "ArrowLeft") next = Math.max(0, cur - 1);
    else if (event.key === "ArrowRight") next = Math.min(windowRows.length - 1, cur + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = windowRows.length - 1;
    else if (event.key === "Escape") {
      setFocusIndex(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    const row = windowRows[next];
    if (row) setAnnouncement(describeRow(row));
  };

  // Time grid labels (every windowMs / 5, aligned).
  const stepMs = windowMs / 5;
  const timeLabels: number[] = [];
  if (n) {
    if (sweep) for (let k = 0; k <= 4; k++) timeLabels.push(k * stepMs);
    else for (let t = Math.floor(tLast / stepMs) * stepMs; t > tLast - windowMs - stepMs; t -= stepMs) timeLabels.push(t);
  }
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Live chart");
  const summaryText = summary ?? (typeof current === "number" ? `Live ${mode === "sweep" ? "sweep" : "stream"} of ${series.map((s) => s.label ?? s.key).join(", ")} over the last ${Math.round(windowMs / 1000)} seconds. Latest ${fmt(current)}; range ${fmt(min ?? 0)} to ${fmt(max ?? 0)}.` : "Waiting for data.");
  const tip = activeRow ? { left: xOfRow(activeRow) / W, top: yOf((activeRow[key0] as number) ?? y1) / H, flipX: xOfRow(activeRow) / W > 0.6 } : null;
  const breach = threshold !== undefined && typeof current === "number" && current > threshold;
  const showHeads = !sweep && n > 0 && !paused;

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {stats ? (
        <div className={cn(blockReset, "flex flex-wrap items-end gap-x-6 gap-y-2")}>
          <div className={cn(blockReset, "flex flex-col")}>
            <span className={cn(blockReset, "flex items-center gap-2 text-xs text-pui-muted-foreground")}>
              <span
                className={cn(
                  blockReset,
                  "inline-flex items-center gap-1 rounded-pui-full px-1.5 py-px text-[10px] font-bold tracking-wide",
                  paused ? "bg-pui-muted text-pui-muted-foreground" : breach ? "bg-pui-danger text-pui-danger-foreground" : "bg-pui-success text-pui-success-foreground",
                )}
              >
                {!paused && !anim.reducedMotion ? (
                  <motion.span aria-hidden="true" className={cn(blockReset, "size-1.5 rounded-pui-full bg-current")} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                ) : (
                  <span aria-hidden="true" className={cn(blockReset, "size-1.5 rounded-pui-full bg-current")} />
                )}
                {paused ? "PAUSED" : "LIVE"}
              </span>
              {series[0]?.label ?? "Value"}
            </span>
            <span className={cn(blockReset, "text-2xl font-semibold tabular-nums tracking-tight", breach ? "text-pui-danger-text" : "")}>{typeof current === "number" ? fmt(current) : "\u2013"}</span>
          </div>
          {change !== null ? <span className={cn(blockReset, "pb-1 text-xs font-semibold tabular-nums", change >= 0 ? "text-pui-success-text" : "text-pui-danger-text")}>{pct.format(change)}</span> : null}
          <dl className={cn(blockReset, "flex gap-4 pb-1 text-xs tabular-nums")}>
            {(
              [
                ["Min", min],
                ["Avg", avg],
                ["Max", max],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className={cn(blockReset, "flex gap-1")}>
                <dt className="text-pui-muted-foreground">{k}</dt>
                <dd className={cn(blockReset, "font-semibold")}>{v === null ? "\u2013" : fmt(v)}</dd>
              </div>
            ))}
            {threshold !== undefined ? (
              <div className={cn(blockReset, "flex gap-1")}>
                <dt className="text-pui-muted-foreground">Over</dt>
                <dd className={cn(blockReset, "font-semibold", breaches ? "text-pui-danger-text" : "")}>{breaches}</dd>
              </div>
            ) : null}
          </dl>
          <button
            type="button"
            onClick={() => setUserPaused(!userPaused)}
            aria-pressed={userPaused}
            className={cn(controlReset, focusRing, "ms-auto inline-flex h-7 items-center gap-1.5 rounded-pui-md border border-pui-border px-2.5 text-xs font-medium hover:bg-pui-muted")}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true" fill="currentColor">
              {userPaused ? <path d="M5 3.5v9l7-4.5z" /> : <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />}
            </svg>
            {userPaused ? "Resume" : "Pause"}
            {missed > 0 ? <span className={cn(blockReset, "rounded-pui-full bg-pui-primary px-1.5 text-[10px] font-bold text-pui-primary-foreground tabular-nums")}>+{missed}</span> : null}
          </button>
        </div>
      ) : null}
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block")}>
          <defs>
            <clipPath id={`${uid}-plot`}>
              <rect x={m.left} y={0} width={plotW} height={H} />
            </clipPath>
            {thrY !== null ? (
              <clipPath id={`${uid}-over`}>
                <rect x={-1e5} y={-10} width={2e5} height={Math.max(0, thrY + 10)} />
              </clipPath>
            ) : null}
            <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={paths[0]?.color ?? categoricalColor(0)} stopOpacity={0.32} />
              <stop offset="100%" stopColor={paths[0]?.color ?? categoricalColor(0)} stopOpacity={0} />
            </linearGradient>
          </defs>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={plotRight} y1={yOf(t)} y2={yOf(t)} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={plotRight + 6} y={yOf(t)} dy="0.35em" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {fmt(t)}
              </text>
            </g>
          ))}
          <g clipPath={`url(#${uid}-plot)`}>
            <motion.g style={{ x: sweep ? 0 : slide }}>
              {!sweep
                ? timeLabels.map((t) => (
                    <g key={t}>
                      <line x1={baseX(t)} x2={baseX(t)} y1={m.top} y2={m.top + plotH} stroke="var(--pui-chart-grid)" strokeDasharray="2 5" />
                      <text x={baseX(t)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                        {fmtTime(t)}
                      </text>
                    </g>
                  ))
                : null}
              {paths.map((p, k) => (
                <g key={k}>
                  {p.area ? <path d={p.area} fill={`url(#${uid}-fill)`} /> : null}
                  <path d={p.line} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {thrY !== null ? <path d={p.line} fill="none" stroke="var(--pui-danger)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${uid}-over)`} /> : null}
                </g>
              ))}
            </motion.g>
            {sweep && last ? (
              <g>
                <rect x={sweepX(tLast) + 2} y={m.top} width={plotW * 0.06} height={plotH} fill="var(--pui-background)" opacity={0.5} />
                <line x1={sweepX(tLast)} x2={sweepX(tLast)} y1={m.top} y2={m.top + plotH} stroke={withOpacity(paths[0]?.color ?? categoricalColor(0), 0.6)} strokeWidth={1.5} />
                {series.map((s, k) => {
                  const v = last[s.key];
                  return typeof v === "number" ? (
                    <HeadDot key={s.key} x={sweepX(tLast)} y={motionValue(yOf(v))} color={breach && k === 0 ? "var(--pui-danger)" : (paths[k]?.color as string)} glow={!anim.reducedMotion && !paused} />
                  ) : null;
                })}
              </g>
            ) : null}
          </g>
          {sweep
            ? timeLabels.map((t, k) => (
                <text key={k} x={m.left + (t / windowMs) * plotW} y={H - 6} textAnchor={k === 0 ? "start" : k === 4 ? "end" : "middle"} fontSize={10} fill="var(--pui-chart-axis)">
                  {k === 0 ? "0s" : `${Math.round(t / 1000)}s`}
                </text>
              ))
            : null}
          {thrY !== null ? (
            <g pointerEvents="none">
              <line x1={m.left} x2={plotRight} y1={thrY} y2={thrY} stroke="var(--pui-danger)" strokeDasharray="5 4" opacity={0.75} />
              <text x={m.left + 4} y={thrY - 5} fontSize={10} fontWeight={600} fill="var(--pui-danger-text)">
                {thresholdLabel ?? `Threshold ${fmt(threshold as number)}`}
              </text>
            </g>
          ) : null}
          {showHeads
            ? series.map((s, k) =>
                typeof last?.[s.key] === "number" ? (
                  <HeadDot key={s.key} x={plotRight} y={headOf(s.key)} color={breach && k === 0 ? "var(--pui-danger)" : (paths[k]?.color as string)} glow={!anim.reducedMotion} />
                ) : null,
              )
            : null}
          {activeRow ? (
            <g pointerEvents="none">
              <line x1={xOfRow(activeRow)} x2={xOfRow(activeRow)} y1={m.top} y2={m.top + plotH} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 3" />
              {series.map((s, k) =>
                typeof activeRow?.[s.key] === "number" ? <circle key={s.key} cx={xOfRow(activeRow)} cy={yOf(activeRow[s.key] as number)} r={4} fill="var(--pui-background)" stroke={paths[k]?.color} strokeWidth={2} /> : null,
              )}
            </g>
          ) : null}
        </svg>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="live chart"
          aria-label={`${nameText}. Space pauses or resumes; while paused, arrow keys move between points.`}
          aria-describedby={`${uid}-help`}
          onPointerEnter={() => setHovering(true)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHoverPx(((event.clientX - rect.left) / (rect.width || 1)) * W);
          }}
          onPointerLeave={() => {
            setHovering(false);
            setHoverPx(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setFocusIndex(null);
          }}
          onKeyDown={onKeyDown}
          className={cn(blockReset, focusRing, "absolute inset-0 cursor-crosshair rounded-pui-md")}
          style={{ touchAction: "pan-y" }}
        />
        <ChartTip open={!!tip} left={tip?.left ?? 0} top={tip?.top ?? 0} flipX={tip?.flipX} reducedMotion={anim.reducedMotion}>
          {activeRow ? (
            <>
              <div className={cn(blockReset, "mb-1 text-[11px] font-semibold text-pui-muted-foreground tabular-nums")}>{fmtTime(activeRow.t)}</div>
              {series.map((s, k) => (
                <TipRow
                  key={s.key}
                  swatch={paths[k]?.color}
                  label={s.label ?? s.key}
                  value={typeof activeRow?.[s.key] === "number" ? fmt(activeRow[s.key] as number) : "\u2013"}
                  tone={threshold !== undefined && k === 0 && (activeRow?.[s.key] ?? -Infinity) > threshold ? "down" : undefined}
                />
              ))}
              {activeIdx !== null && activeIdx > 0 && typeof windowRows[activeIdx - 1]?.[key0] === "number" && typeof activeRow[key0] === "number" ? (
                <TipRow label="vs previous" value={fmt((activeRow[key0] as number) - (windowRows[activeIdx - 1]?.[key0] as number))} tone="muted" />
              ) : null}
            </>
          ) : null}
        </ChartTip>
        {paused && !userPaused && !anim.reducedMotion ? (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={anim.reducedMotion ? instant : { duration: 0.2 }}
            className={cn(blockReset, "pointer-events-none absolute start-3 top-2 rounded-pui-full bg-pui-muted px-2 py-0.5 text-[10px] font-medium text-pui-muted-foreground")}
          >
            Paused while you explore
          </motion.div>
        ) : null}
      </div>
      <span id={`${uid}-help`} className={srOnly}>
        Space or P pauses and resumes the stream. While paused, left and right arrows move between points, Home and End jump to the ends, Escape clears.
      </span>
      <ChartLiveRegion text={announcement} />
    </ChartFigure>
  );
});
