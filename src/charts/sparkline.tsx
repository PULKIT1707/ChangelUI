"use client";

// Sparkline: a tiny inline line, area, bar or win/loss chart for tables, cards and sentences.
// Micro: it uses only core math (no chart runtime). It draws itself once it scrolls into view,
// morphs on data changes, shows a scrub dot with a value pill on hover, and is a single keyboard
// stop whose arrow keys move the dot and announce the value.
import { animate, motion, useInView, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion } from "./core/a11y";
import { categoricalColor, trendColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { areaToBaseline, linePath, roundedRectPath, type Curve, type Point } from "./core/path";
import { scaleLinear } from "./core/scale";
import { chartMotion, useChartAnimation, useDataTween, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };

export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "color"> {
  /** Values, oldest first. null leaves a gap. */
  data: readonly (number | null)[];
  /** Default "line". */
  variant?: "line" | "area" | "bar" | "winloss";
  /** Width in px (also the pre-measure width when fluid). Default 120. */
  width?: number;
  /** Fill the container's width instead of a fixed width. Default false. */
  fluid?: boolean;
  /** Height in px. Default 32. */
  height?: number;
  /** Any CSS color or token. Default: --pui-chart-1 (bars and win/loss use up/down tones by sign). */
  color?: string;
  /** Color by trend: last vs first value (up = success, down = danger). Default false. */
  trendColored?: boolean;
  curve?: Curve;
  strokeWidth?: number;
  /** Dot on the last value. Default true for line and area. */
  showDot?: boolean;
  /** Also mark the min and max points. Default false. */
  showExtremes?: boolean;
  /** Print the last value and the change after the chart. Default false. */
  showValue?: boolean;
  /** Hover / keyboard scrub with a value pill. Default true. */
  interactive?: boolean;
  /** A dashed reference line (a target, a baseline). */
  referenceValue?: number;
  /** A shaded normal range. */
  band?: readonly [number, number];
  /** Value range (default: the data extent, with the reference and band). */
  min?: number;
  max?: number;
  format?: NumberFormat;
  locale?: string;
  /** Labels per point for the pill and announcements (e.g. dates). */
  labels?: readonly string[];
  /** Name used in the accessible summary. Default "Trend". */
  label?: string;
  animation?: ChartAnimation;
  /** The scrubbed point (hover or keyboard), or null when it ends. */
  onActiveChange?: (index: number | null) => void;
}

const PAD = 3;

function ScrubDot({ tween, index, color, height }: { tween: MotionValue<Float64Array>; index: number; color: string; height: number }) {
  const x = useTransform(tween, (g) => g[index * 2] ?? 0);
  const y = useTransform(tween, (g) => {
    const v = g[index * 2 + 1];
    return v !== undefined && Number.isFinite(v) ? v : -99;
  });
  return (
    <>
      <motion.line x1={x} x2={x} y1={0} y2={height} stroke="var(--pui-chart-crosshair)" strokeDasharray="2 2" />
      <motion.circle cx={x} cy={y} r={6} fill={color} opacity={0.18} />
      <motion.circle cx={x} cy={y} r={2.75} fill={color} stroke="var(--pui-background)" strokeWidth={1.5} />
    </>
  );
}

function EndDot({ tween, index, color, pulse, draw }: { tween: MotionValue<Float64Array>; index: number; color: string; pulse: boolean; draw: MotionValue<number> }) {
  // Appears when the draw-in reaches the end of the line.
  const opacity = useTransform(draw, (p) => (p > 0.92 ? 1 : 0));
  const x = useTransform(tween, (g) => g[index * 2] ?? 0);
  const y = useTransform(tween, (g) => {
    const v = g[index * 2 + 1];
    return v !== undefined && Number.isFinite(v) ? v : -99;
  });
  return (
    <motion.g style={{ x, y, opacity }}>
      {pulse ? (
        <motion.circle r={2.75} fill={color} initial={{ opacity: 0.45, scale: 1 }} animate={{ opacity: 0, scale: 3 }} transition={{ duration: 1.4, repeat: 2, ease: "easeOut" }} />
      ) : null}
      <circle r={2.75} fill={color} stroke="var(--pui-background)" strokeWidth={1.5} />
    </motion.g>
  );
}

/** A tiny trend chart for inline use (role="img" with a computed description). */
export const Sparkline = React.forwardRef<HTMLElement, SparklineProps>(function Sparkline(
  {
    data,
    variant = "line",
    width = 120,
    fluid = false,
    height = 32,
    color,
    trendColored = false,
    curve = "monotone",
    strokeWidth = 1.75,
    showDot,
    showExtremes = false,
    showValue = false,
    interactive = true,
    referenceValue,
    band,
    min,
    max,
    format,
    locale = "en-US",
    labels,
    label = "Trend",
    animation = "auto",
    onActiveChange,
    className,
    style,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = React.useRef<HTMLSpanElement>(null);
  const size = useChartSize(boxRef, { initialWidth: width, height });
  const inView = useInView(boxRef, { once: true, amount: 0.4 });
  const anim = useChartAnimation(animation);
  const [active, setActive] = React.useState<number | null>(null);
  const onActiveRef = useLatestRef(onActiveChange);
  const firstActive = React.useRef(true);
  React.useEffect(() => {
    if (firstActive.current) {
      firstActive.current = false;
      return;
    }
    onActiveRef.current?.(active);
  }, [active, onActiveRef]);
  const [announcement, setAnnouncement] = React.useState("");
  const W = size.width;
  const H = height;
  const n = data.length;

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const values = React.useMemo(() => data.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null)), [data]);
  const finite = values.filter((v): v is number => v !== null);
  const first = finite[0];
  const last = finite[finite.length - 1];
  let lastIndex = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (values[i] !== null) {
      lastIndex = i;
      break;
    }
  }
  const change = first !== undefined && last !== undefined && first !== 0 ? (last - first) / Math.abs(first) : null;
  const up = change === null ? true : change >= 0;
  const base = color ?? (trendColored ? trendColor(up ? "up" : "down") : categoricalColor(0));
  const bars = variant === "bar" || variant === "winloss";
  const bandLo = band?.[0];
  const bandHi = band?.[1];

  const { geometry, y, lo, hi, step } = React.useMemo(() => {
    let a = min ?? Infinity;
    let b = max ?? -Infinity;
    for (const v of values) {
      if (v === null) continue;
      if (min === undefined && v < a) a = v;
      if (max === undefined && v > b) b = v;
    }
    for (const extra of [referenceValue, bandLo, bandHi]) {
      if (extra === undefined) continue;
      if (min === undefined) a = Math.min(a, extra);
      if (max === undefined) b = Math.max(b, extra);
    }
    if (bars && min === undefined) a = Math.min(a, 0);
    if (bars && max === undefined) b = Math.max(b, 0);
    if (!Number.isFinite(a)) {
      a = 0;
      b = 1;
    }
    if (a === b) {
      a -= 1;
      b += 1;
    }
    const yScale = variant === "winloss" ? scaleLinear([-1, 1], [H - PAD, PAD]) : scaleLinear([a, b], [H - PAD, PAD]);
    const slot = bars ? W / Math.max(1, n) : 0;
    const xAt = (i: number) => (bars ? slot * (i + 0.5) : PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2));
    const g = new Float64Array(n * 2);
    values.forEach((v, i) => {
      g[i * 2] = xAt(i);
      g[i * 2 + 1] = v === null ? Number.NaN : yScale(variant === "winloss" ? Math.sign(v) : v);
    });
    return { geometry: g, y: yScale, lo: a, hi: b, step: slot };
  }, [values, variant, W, H, min, max, referenceValue, bandLo, bandHi, bars, n]);

  const tween = useDataTween(geometry, { enabled: anim.updates, resetKey: `${W}x${H}x${variant}` });
  const points = (g: Float64Array): Array<Point | null> => {
    const out: Array<Point | null> = [];
    for (let i = 0; i + 1 < g.length; i += 2) {
      const py = g[i + 1] as number;
      out.push(Number.isFinite(py) ? [g[i] as number, py] : null);
    }
    return out;
  };
  const lineD = useTransform(tween, (g) => (bars ? "" : linePath(points(g), { curve })));
  const areaD = useTransform(tween, (g) => (variant === "area" ? areaToBaseline(points(g), H, { curve }) : ""));

  // Draw once in view (client mounts only; the server HTML is already final).
  const draw = useMotionValue(anim.entrance ? 0 : 1);
  React.useEffect(() => {
    if (!anim.entrance) {
      draw.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(draw, 1, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [anim.entrance, inView, draw]);
  const clipW = useTransform(draw, (p) => p * (W + 8));

  const pick = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !n) return null;
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = bars ? Math.floor(px / Math.max(1, step)) : Math.round(((px - PAD) / Math.max(1, W - PAD * 2)) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  };
  const pointLabel = (i: number) => labels?.[i] ?? `point ${i + 1}`;
  const describe = (i: number) => {
    const v = values[i];
    return `${pointLabel(i)}: ${v === null || v === undefined ? "no data" : fmt(v)}`;
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!n) return;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = active === null ? 0 : Math.min(n - 1, active + 1);
    else if (event.key === "ArrowLeft") next = active === null ? n - 1 : Math.max(0, active - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "Escape" && active !== null) next = -1;
    if (next === null) return;
    event.preventDefault();
    if (next < 0) {
      setActive(null);
      return;
    }
    setActive(next);
    setAnnouncement(`${describe(next)}. ${next + 1} of ${n}.`);
  };

  // Accessible description.
  const pct = (v: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(v));
  const summary =
    first === undefined || last === undefined
      ? `${label}: no data`
      : `${label}: ${change === null || Math.abs(change) < 0.0005 ? "flat" : `${up ? "up" : "down"} ${pct(change)}`}, from ${fmt(first)} to ${fmt(last)}; low ${fmt(Math.min(...finite))}, high ${fmt(Math.max(...finite))}, ${n} points.`;

  let minI = -1;
  let maxI = -1;
  values.forEach((v, i) => {
    if (v === null) return;
    if (minI < 0 || v < (values[minI] as number)) minI = i;
    if (maxI < 0 || v > (values[maxI] as number)) maxI = i;
  });

  const dot = showDot ?? !bars;
  const activeValue = active !== null ? values[active] : null;
  const pillText = active !== null ? `${labels?.[active] ? `${labels[active]} \u00b7 ` : ""}${activeValue === null || activeValue === undefined ? "\u2013" : fmt(activeValue)}` : "";
  const pillW = estimateTextWidth(pillText, 10.5) + 12;
  const activeX = active !== null ? (geometry[active * 2] ?? 0) : 0;
  const clipId = `${uid}-draw`;
  const gradId = `${uid}-fill`;
  const radius = Math.min(2, Math.max(0.5, step * 0.18));

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      {...rest}
      className={cn(blockReset, fluid ? "flex w-full" : "inline-flex max-w-full", "items-center gap-2 align-middle text-pui-foreground", className)}
      style={style}
    >
      <span
        ref={boxRef}
        role="img"
        aria-label={summary}
        tabIndex={interactive ? 0 : undefined}
        aria-roledescription={interactive ? "sparkline" : undefined}
        onPointerMove={interactive ? (event) => setActive(pick(event.clientX)) : undefined}
        onPointerLeave={interactive ? () => setActive(null) : undefined}
        onKeyDown={interactive ? onKeyDown : undefined}
        onBlur={interactive ? () => setActive(null) : undefined}
        className={cn(blockReset, interactive ? focusRing : "", "relative inline-block min-w-0 flex-1 rounded-[3px]", interactive ? "cursor-crosshair" : "")}
        style={{ width: fluid ? "100%" : width, height, maxWidth: "100%", touchAction: "pan-y" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <clipPath id={clipId}>
              <motion.rect x={-4} y={-8} height={H + 16} style={{ width: clipW }} />
            </clipPath>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: base, stopOpacity: 0.32 }} />
              <stop offset="100%" style={{ stopColor: base, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {band ? <rect x={0} width={W} y={Math.min(y(band[0]), y(band[1]))} height={Math.abs(y(band[1]) - y(band[0]))} fill="color-mix(in oklab, var(--pui-success) 12%, transparent)" /> : null}
          {referenceValue !== undefined && referenceValue >= lo && referenceValue <= hi ? (
            <line x1={0} x2={W} y1={y(referenceValue)} y2={y(referenceValue)} stroke="var(--pui-muted-foreground)" strokeOpacity={0.6} strokeDasharray="3 3" />
          ) : null}
          <g clipPath={`url(#${clipId})`}>
            {bars ? (
              values.map((v, i) => {
                if (v === null) return null;
                const x = (geometry[i * 2] ?? 0) - step * 0.36;
                const w = Math.max(1, step * 0.72);
                const zero = variant === "winloss" ? y(0) : y(Math.max(lo, Math.min(hi, 0)));
                const top = geometry[i * 2 + 1] ?? zero;
                const y0 = variant === "winloss" ? (v >= 0 ? y(0.92) : zero + 1) : Math.min(top, zero);
                const h = variant === "winloss" ? Math.max(1, Math.abs(y(0.92) - zero) - 1) : Math.max(1, Math.abs(zero - top));
                const fill = variant === "winloss" || color === undefined ? (v >= 0 ? (variant === "winloss" ? trendColor("up") : base) : trendColor("down")) : base;
                const dim = active !== null && active !== i;
                return (
                  <motion.path
                    key={i}
                    initial={false}
                    animate={{ d: roundedRectPath(x, y0, w, h, radius), opacity: dim ? 0.35 : active === i || (active === null && i === lastIndex) ? 1 : 0.72 }}
                    transition={anim.updates ? { ...chartMotion.update, opacity: chartMotion.fade } : instant}
                    fill={fill}
                  />
                );
              })
            ) : (
              <>
                {variant === "area" ? <motion.path d={areaD} fill={`url(#${gradId})`} /> : null}
                <motion.path d={lineD} fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </>
            )}
            {showExtremes && !bars && minI >= 0 && maxI >= 0
              ? [minI, maxI].map((i, k) => (
                  <circle key={k} cx={geometry[i * 2]} cy={geometry[i * 2 + 1]} r={2} fill="var(--pui-background)" stroke={k ? trendColor("up") : trendColor("down")} strokeWidth={1.25} />
                ))
              : null}
          </g>
          {dot && lastIndex >= 0 && active === null ? <EndDot tween={tween} index={lastIndex} color={base} pulse={anim.entrance && inView} draw={draw} /> : null}
          {active !== null && !bars ? <ScrubDot tween={tween} index={active} color={base} height={H} /> : null}
        </svg>
        {active !== null ? (
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-pui-sm bg-pui-chart-tooltip-fg px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-pui-chart-tooltip-bg shadow-pui-md",
            )}
            style={{ left: `${Math.max(0, Math.min(W - pillW, activeX - pillW / 2)) / Math.max(1, W) * 100}%` }}
          >
            {pillText}
          </span>
        ) : null}
      </span>
      {showValue && last !== undefined ? (
        <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 items-baseline gap-1 tabular-nums")}>
          <span className={cn(blockReset, "text-sm font-semibold")}>{fmt(last)}</span>
          {change !== null ? (
            <span className={cn(blockReset, "text-[11px] font-semibold", up ? "text-pui-success-text" : "text-pui-danger-text")}>
              {up ? "\u25b2" : "\u25bc"} {pct(change)}
            </span>
          ) : null}
        </span>
      ) : null}
      {interactive ? <ChartLiveRegion text={announcement} /> : null}
    </span>
  );
});
