"use client";

// Radial bar chart: concentric bars on faint tracks, for a few progress or comparison values in a
// compact square. Bars sweep in on a spring one after another; labels sit in the gap before the
// start so the eye reads label -> bar. Partial sweeps (a 180° arc) crop the drawing to the arc.
// Hover a bar or a legend row (or Tab through the legend) to spotlight it in the middle; click to
// pin. Every bar is also a meter for screen readers. Micro: own SVG, only core math.
import { animate, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { srOnly } from "./core/a11y";
import { categoricalColor, mix } from "./core/color";
import { ChartTable, useChartUid } from "./core/frame";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { arcPath, polar } from "./core/path";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const DEG = Math.PI / 180;

export interface RadialBarDatum {
  label: string;
  value: number;
  /** Per-bar goal (progress mode). Default the chart's `max`. */
  max?: number;
  /** Any CSS color or token. Default: the chart palette in order. */
  color?: string;
  /** Stable identity. Default the label. */
  key?: string;
}

export interface RadialBarChartProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** Bars from the outside in. */
  data: readonly RadialBarDatum[];
  /** Value of a full sweep. Default the largest value (bars compare against each other). */
  max?: number;
  /** Drawing size in px (scales down with the container). Default 260. */
  size?: number;
  /** Degrees a full bar covers. Default 270. */
  sweep?: number;
  /** Where bars start, in degrees clockwise from 12 o'clock. Default 0. */
  startAngle?: number;
  /** Hole as a share of the radius. Default 0.3. */
  innerRadius?: number;
  /** Space between bars in px. Default 4. */
  gap?: number;
  /** Round bar ends. Default true. */
  rounded?: boolean;
  /** Track strength (0-1). Default 0.14. */
  trackOpacity?: number;
  /** Labels in the gap before the start (bars starting at 12 o'clock with a sweep up to 275°). Default "start". */
  labels?: "start" | "none";
  /** Sort bars by value. Default "none" (data order). */
  sort?: "none" | "desc" | "asc";
  /** Legend with a meter per bar. Default "bottom". */
  legend?: "bottom" | "right" | "none";
  /** Middle content when nothing is spotlighted. Default the total (or the average progress with goals). */
  center?: React.ReactNode;
  /** Controlled spotlight (key or label). */
  active?: string | null;
  onActiveChange?: (key: string | null) => void;
  format?: NumberFormat;
  locale?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Accessible name when there is no string title. Default "Radial bar chart". */
  chartLabel?: string;
  animation?: ChartAnimation;
}

interface BarGeo {
  key: string;
  label: string;
  value: number;
  max: number;
  color: string;
  share: number;
  r: number;
}

function Bar({
  geo,
  index,
  c,
  thickness,
  start,
  sweep,
  rounded,
  dim,
  entrance,
  updates,
}: {
  geo: BarGeo;
  index: number;
  c: number;
  thickness: number;
  start: number;
  sweep: number;
  rounded: boolean;
  dim: boolean;
  entrance: boolean;
  updates: boolean;
}) {
  const target = Math.min(1, Math.max(0, geo.share)) * sweep;
  const span = useMotionValue(entrance ? 0 : target);
  React.useEffect(() => {
    if (!updates) {
      span.set(target);
      return;
    }
    const controls = animate(span, target, entrance ? { ...chartMotion.rings, delay: index * 0.08 } : chartMotion.update);
    return () => controls.stop();
  }, [span, target, updates, entrance, index]);
  const r0 = geo.r - thickness / 2;
  const r1 = geo.r + thickness / 2;
  const d = useTransform(span, (s) =>
    arcPath({
      innerRadius: r0,
      outerRadius: r1,
      startAngle: start,
      endAngle: start + Math.max(0.0001, Math.min(sweep * 1.04, s)),
      cornerRadius: rounded ? thickness / 2 : 1,
      cx: c,
      cy: c,
    }),
  );
  const opacity = useTransform(span, (s) => (s > 0.004 ? 1 : 0));
  return (
    <g style={{ opacity: dim ? 0.3 : 1, transition: "opacity 160ms" }}>
      <motion.path d={d} fill={geo.color} style={{ opacity }} />
    </g>
  );
}

/** Concentric radial bars on tracks with label-in-the-gap, spotlight, pinning and a meter legend. */
export const RadialBarChart = React.forwardRef<HTMLElement, RadialBarChartProps>(function RadialBarChart(
  {
    data,
    max: maxProp,
    size = 260,
    sweep: sweepDeg = 270,
    startAngle: startDeg = 0,
    innerRadius = 0.3,
    gap = 4,
    rounded = true,
    trackOpacity = 0.14,
    labels = "start",
    sort = "none",
    legend = "bottom",
    center,
    active: activeProp,
    onActiveChange,
    format,
    locale = "en-US",
    title,
    description,
    titleAs: TitleTag = "h3",
    chartLabel = "Radial bar chart",
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const [hover, setHover] = React.useState<string | null>(null);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const [pinnedInner, setPinnedInner] = React.useState<string | null>(null);
  const pinned = activeProp !== undefined ? activeProp : pinnedInner;
  const setPinned = (k: string | null) => {
    if (activeProp === undefined) setPinnedInner(k);
    onActiveChange?.(k);
  };
  const spot = hover ?? focusKey ?? pinned;
  const fmt = (n: number) => formatNumber(n, format ?? { maximumFractionDigits: 0 }, locale);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const sweepRad = Math.min(360, Math.max(30, sweepDeg)) * DEG;
  const start = startDeg * DEG;
  const S = size;
  const c = S / 2;
  const R = c - 4;
  const hole = R * Math.min(0.8, Math.max(0.05, innerRadius));
  const ordered = React.useMemo(() => {
    const rows = data.map((d, i) => ({ d, i }));
    if (sort === "desc") rows.sort((a, b) => b.d.value - a.d.value);
    if (sort === "asc") rows.sort((a, b) => a.d.value - b.d.value);
    return rows;
  }, [data, sort]);
  const n = Math.max(1, ordered.length);
  const thickness = Math.max(4, (R - hole - gap * (n - 1)) / n);
  const dataMax = Math.max(1e-9, ...data.map((d) => (Number.isFinite(d.value) ? d.value : 0)));
  const max = maxProp && maxProp > 0 ? maxProp : dataMax;
  const geos: BarGeo[] = ordered.map(({ d, i }, k) => {
    const m = d.max && d.max > 0 ? d.max : max;
    const v = Number.isFinite(d.value) ? Math.max(0, d.value) : 0;
    return { key: d.key ?? d.label, label: d.label, value: v, max: m, color: d.color ?? categoricalColor(i), share: v / m, r: R - thickness / 2 - k * (thickness + gap) };
  });
  const total = geos.reduce((a, g) => a + g.value, 0);
  const spotGeo = geos.find((g) => g.key === spot);
  const goalMode = data.some((d) => d.max && d.max > 0) || (maxProp !== undefined && maxProp > 0);
  const textOf = (g: BarGeo) => `${g.label}: ${fmt(g.value)}${goalMode ? ` of ${fmt(g.max)}, ${pct.format(g.share)}` : ""}`;
  const summary = geos.length ? `${geos.map(textOf).join("; ")}.` : `${chartLabel}: no data.`;

  // Crop the viewBox to the arc (a 180° sweep only needs the top half).
  const box = React.useMemo(() => {
    let x0 = c - hole * 0.9;
    let x1 = c + hole * 0.9;
    let y0 = c - hole * 0.9;
    let y1 = c + hole * 0.6;
    const steps = Math.ceil(sweepRad / (2 * DEG));
    for (let k = 0; k <= steps; k++) {
      const [x, y] = polar(start + (sweepRad * k) / steps, R, c, c);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const p = 4;
    return { x: Math.max(0, x0 - p), y: Math.max(0, y0 - p), w: Math.min(S, x1 + p) - Math.max(0, x0 - p), h: Math.min(S, y1 + p) - Math.max(0, y0 - p) };
  }, [c, hole, R, S, sweepRad, start]);

  const showLabels = labels === "start" && sweepRad <= 275 * DEG && Math.abs(((startDeg % 360) + 360) % 360) < 0.5 && thickness >= 11;
  const labelFont = Math.min(12, Math.max(11, thickness * 0.6));

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const x = box.x + ((event.clientX - rect.left) / rect.width) * box.w - c;
    const y = box.y + ((event.clientY - rect.top) / rect.height) * box.h - c;
    const d = Math.hypot(x, y);
    const g = geos.find((b) => Math.abs(d - b.r) <= thickness / 2 + gap / 2);
    return g ? g.key : null;
  };

  const half = sweepRad <= Math.PI + 0.01;
  const centerContent = spotGeo ? (
    <motion.span
      key={spotGeo.key}
      initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={anim.reducedMotion ? instant : chartMotion.hover}
      className={cn(blockReset, "flex flex-col items-center leading-none")}
    >
      <span className={cn(blockReset, "max-w-full truncate text-[11px] font-medium text-pui-muted-foreground")}>{spotGeo.label}</span>
      <span className={cn(blockReset, "mt-1 font-semibold tracking-tight tabular-nums")} style={{ fontSize: Math.max(14, Math.min(28, hole * 0.42)), color: mix(spotGeo.color, "var(--pui-foreground)", 0.55) }}>
        {goalMode ? pct.format(spotGeo.share) : fmt(spotGeo.value)}
      </span>
      {goalMode ? <span className={cn(blockReset, "mt-1 text-[11px] tabular-nums text-pui-muted-foreground")}>{`${fmt(spotGeo.value)} / ${fmt(spotGeo.max)}`}</span> : null}
    </motion.span>
  ) : (
    center ?? (
      <span className={cn(blockReset, "flex flex-col items-center leading-none")}>
        <span className={cn(blockReset, "font-semibold tracking-tight tabular-nums")} style={{ fontSize: Math.max(14, Math.min(28, hole * 0.42)) }}>
          {goalMode ? pct.format(geos.length ? geos.reduce((a, g) => a + Math.min(1, g.share), 0) / geos.length : 0) : fmt(total)}
        </span>
        <span className={cn(blockReset, "mt-1 text-[11px] text-pui-muted-foreground")}>{goalMode ? "Avg. progress" : "Total"}</span>
      </span>
    )
  );

  const drawing = (
    <div className={cn(blockReset, "relative shrink-0")} style={{ width: box.w, maxWidth: "100%", aspectRatio: `${box.w} / ${box.h}` }}>
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
        {geos.map((g) => (
          <path
            key={`${g.key}-track`}
            d={arcPath({ innerRadius: g.r - thickness / 2, outerRadius: g.r + thickness / 2, startAngle: start, endAngle: start + sweepRad, cornerRadius: rounded ? thickness / 2 : 1, cx: c, cy: c })}
            fill={mix(g.color, "var(--pui-muted)", Math.min(1, Math.max(0, trackOpacity)))}
            style={{ opacity: spot && spot !== g.key ? 0.5 : 1, transition: "opacity 160ms" }}
          />
        ))}
        {geos.map((g, i) => (
          <Bar
            key={g.key}
            geo={g}
            index={i}
            c={c}
            thickness={thickness}
            start={start}
            sweep={sweepRad}
            rounded={rounded}
            dim={!!spot && spot !== g.key}
            entrance={anim.entrance}
            updates={anim.updates}
          />
        ))}
        {showLabels
          ? geos.map((g) => {
              const room = g.r - 6;
              const value = fmt(g.value);
              const full = `${g.label}  ${value}`;
              const text = estimateTextWidth(full, labelFont) <= room ? full : estimateTextWidth(g.label, labelFont) <= room ? g.label : null;
              if (!text) return null;
              const [x, y] = polar(start - 0.06, g.r, c, c);
              const split = text === full;
              return (
                <text
                  key={`${g.key}-label`}
                  x={x - 4}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={labelFont}
                  style={{ opacity: spot && spot !== g.key ? 0.45 : 1, transition: "opacity 160ms" }}
                >
                  <tspan fill="var(--pui-foreground)" fontWeight={500}>
                    {g.label}
                  </tspan>
                  {split ? (
                    <tspan fill="var(--pui-muted-foreground)" dx={6} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {value}
                    </tspan>
                  ) : null}
                </text>
              );
            })
          : null}
      </svg>
      {hole > 22 ? (
        <div
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute flex items-center justify-center text-center")}
          style={{
            left: `${((c - box.x) / box.w) * 100}%`,
            top: `${((c - box.y) / box.h) * 100}%`,
            width: hole * 1.6,
            transform: half ? "translate(-50%, -100%)" : "translate(-50%, -50%)",
          }}
        >
          {centerContent}
        </div>
      ) : null}
      <div
        aria-hidden="true"
        onPointerMove={(event) => setHover(pick(event))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(event) => {
          const k = pick(event);
          if (k !== null) setPinned(pinned === k ? null : k);
        }}
        className={cn(blockReset, "absolute inset-0", hover !== null ? "cursor-pointer" : "")}
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );

  const titleId = `${uid}-title`;
  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : chartLabel}
      aria-describedby={`${uid}-summary`}
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
      <div className={cn(blockReset, "flex min-w-0", legend === "right" ? "flex-wrap items-center justify-center gap-5" : "flex-col items-center gap-3")}>
        {drawing}
        <div className={srOnly}>
          {geos.map((g) => (
            <div key={g.key} role="meter" aria-label={g.label} aria-valuemin={0} aria-valuemax={g.max} aria-valuenow={Math.min(g.max, g.value)} aria-valuetext={textOf(g)} />
          ))}
        </div>
        {legend !== "none" && geos.length ? (
          <ul className={cn(listReset, legend === "right" ? "flex min-w-0 flex-col gap-1" : "flex max-w-full flex-wrap justify-center gap-1")}>
            {geos.map((g) => (
              <li key={g.key} className={cn(blockReset, "min-w-0 transition-opacity duration-150", spot && spot !== g.key ? "opacity-50" : "")}>
                <button
                  type="button"
                  aria-pressed={pinned === g.key}
                  aria-label={textOf(g)}
                  onClick={() => setPinned(pinned === g.key ? null : g.key)}
                  onPointerEnter={() => setHover(g.key)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setFocusKey(g.key)}
                  onBlur={() => setFocusKey(null)}
                  className={cn(
                    controlReset,
                    focusRing,
                    "inline-flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-pui-md px-2 py-1 text-left text-xs hover:bg-pui-muted",
                    pinned === g.key ? "bg-pui-muted" : "",
                  )}
                >
                  <span aria-hidden="true" className={cn(blockReset, "size-2.5 shrink-0 rounded-pui-full")} style={{ background: g.color }} />
                  <span className={cn(blockReset, "truncate text-pui-foreground")}>{g.label}</span>
                  <span className={cn(blockReset, "ms-auto ps-1 font-medium tabular-nums text-pui-muted-foreground")}>{goalMode ? pct.format(g.share) : fmt(g.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p id={`${uid}-summary`} className={srOnly}>
        {summary}
      </p>
      <ChartTable
        caption={typeof title === "string" ? title : chartLabel}
        columns={goalMode ? ["Bar", "Value", "Goal", "Progress"] : ["Bar", "Value"]}
        rows={geos.map((g) => (goalMode ? [g.label, fmt(g.value), fmt(g.max), pct.format(g.share)] : [g.label, fmt(g.value)]))}
        visible={false}
      />
    </figure>
  );
});
