"use client";

// Activity rings: concentric goal rings that sweep in on a spring, one after another. Past 100% a
// ring keeps going on a second lap, and its head gets a cap shadow so the overlap reads as depth.
// Hover a ring or a legend row, or Tab through the legend, to spotlight one and read it in the
// middle; click to pin it. Every ring is also a meter for screen readers. Micro: own SVG, only core math.
import { animate, motion, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { srOnly } from "./core/a11y";
import { categoricalColor, mix, withOpacity } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { polar } from "./core/path";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };
const TAU = Math.PI * 2;
/** Laps drawn at most (3 = 300%); the text still says the real percentage. */
const MAX_LAPS = 3;

export interface ActivityRing {
  label: string;
  value: number;
  /** The goal. Must be > 0. */
  max: number;
  /** Any CSS color or token. Default: the chart palette in order. */
  color?: string;
  /** Shown after the numbers ("kcal", "min"). */
  unit?: string;
  /** Stable identity. Default the label. */
  key?: string;
}

export interface ActivityRingsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  rings: readonly ActivityRing[];
  /** Drawing size in px (scales down with the container). Default 160. */
  size?: number;
  /** Ring thickness in px. Default size / 9. */
  thickness?: number;
  /** Space between rings in px. Default 3. */
  gap?: number;
  /** Legend with a meter per ring. Default "right". */
  legend?: "right" | "bottom" | "none";
  /** Middle content when no ring is spotlighted. */
  center?: React.ReactNode;
  /** Soft glow behind each ring head. Default true. */
  glow?: boolean;
  format?: NumberFormat;
  locale?: string;
  /** Accessible name of the group. Default "Activity rings". */
  chartLabel?: string;
  animation?: ChartAnimation;
}

interface RingGeo {
  key: string;
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
  progress: number;
  r: number;
}

function Ring({
  geo,
  index,
  c,
  thickness,
  dim,
  glow,
  uid,
  entrance,
  updates,
}: {
  geo: RingGeo;
  index: number;
  c: number;
  thickness: number;
  dim: boolean;
  glow: boolean;
  uid: string;
  entrance: boolean;
  updates: boolean;
}) {
  const target = Math.min(MAX_LAPS, Math.max(0, geo.progress));
  const p = useMotionValue(entrance ? 0 : target);
  React.useEffect(() => {
    if (!updates) {
      p.set(target);
      return;
    }
    const controls = animate(p, target, { ...chartMotion.rings, delay: entrance ? index * 0.12 : 0 });
    return () => controls.stop();
  }, [p, target, updates, entrance, index]);
  return <RingMarks p={p} geo={geo} c={c} thickness={thickness} dim={dim} glow={glow} uid={uid} />;
}

function RingMarks({ p, geo, c, thickness, dim, glow, uid }: { p: MotionValue<number>; geo: RingGeo; c: number; thickness: number; dim: boolean; glow: boolean; uid: string }) {
  const { r, color } = geo;
  // First lap, then the lap on top (both measured with pathLength = 1).
  const firstDash = useTransform(p, (n) => `${Math.min(1, Math.max(0, n))} 1`);
  const firstOpacity = useTransform(p, (n) => (n > 0.002 ? 1 : 0));
  const lapDash = useTransform(p, (n) => {
    const over = n - 1;
    if (over <= 0) return "0 1";
    const frac = over - Math.floor(over);
    return `${frac < 1e-4 ? 1 : frac} 1`;
  });
  const lapOpacity = useTransform(p, (n) => (n > 1.002 ? 1 : 0));
  const head = useTransform(p, (n) => polar(n * TAU, r, c, c));
  const hx = useTransform(head, (h) => h[0]);
  const hy = useTransform(head, (h) => h[1]);
  // The cap shadow falls ahead of the head (onto the lap beneath), so offset it along the tangent.
  const shadow = useTransform(p, (n) => polar(n * TAU + (thickness * 0.22) / r, r, c, c));
  const sx = useTransform(shadow, (h) => h[0]);
  const sy = useTransform(shadow, (h) => h[1]);
  const capOpacity = useTransform(p, (n) => Math.max(0, Math.min(1, (n - 0.96) / 0.06)));
  const glowOpacity = useTransform(p, (n) => (n > 0.02 ? 0.3 : 0));
  const lapColor = mix(color, "var(--pui-foreground)", 0.88);
  return (
    <g style={{ opacity: dim ? 0.3 : 1, transition: "opacity 160ms" }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={withOpacity(color, 0.2)} strokeWidth={thickness} />
      {glow ? <motion.circle cx={hx} cy={hy} r={thickness * 0.75} fill={color} filter={`url(#${uid}-glow)`} style={{ opacity: glowOpacity }} /> : null}
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        pathLength={1}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ strokeDasharray: firstDash, opacity: firstOpacity }}
      />
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={lapColor}
        strokeWidth={thickness}
        strokeLinecap="round"
        pathLength={1}
        transform={`rotate(-90 ${c} ${c})`}
        style={{ strokeDasharray: lapDash, opacity: lapOpacity }}
      />
      <motion.g style={{ opacity: capOpacity }}>
        <motion.circle cx={sx} cy={sy} r={thickness / 2} fill="black" opacity={0.4} filter={`url(#${uid}-shadow)`} />
        <motion.circle cx={hx} cy={hy} r={thickness / 2} fill={lapColor} />
      </motion.g>
    </g>
  );
}

/** Concentric goal rings with overshoot laps, a cap shadow, spotlight and a meter legend. */
export const ActivityRings = React.forwardRef<HTMLDivElement, ActivityRingsProps>(function ActivityRings(
  {
    rings,
    size = 160,
    thickness: thicknessProp,
    gap = 3,
    legend = "right",
    center,
    glow = true,
    format,
    locale = "en-US",
    chartLabel = "Activity rings",
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);
  const active = hover ?? focus ?? pinned;
  const fmt = (n: number) => formatNumber(n, format ?? { maximumFractionDigits: 0 }, locale);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const S = size;
  const c = S / 2;
  const thickness = thicknessProp ?? Math.max(6, Math.round(S / 9));
  const pad = thickness * 0.2 + 2;
  const geos: RingGeo[] = rings.map((ring, i) => ({
    key: ring.key ?? ring.label,
    label: ring.label,
    value: ring.value,
    max: ring.max,
    unit: ring.unit,
    color: ring.color ?? categoricalColor(i),
    progress: ring.max > 0 ? Math.max(0, ring.value) / ring.max : 0,
    r: c - pad - thickness / 2 - i * (thickness + gap),
  }));
  const visible = geos.filter((g) => g.r > thickness / 2);
  const innerR = (visible[visible.length - 1]?.r ?? c) - thickness / 2;

  const textOf = (g: RingGeo) => `${g.label}: ${fmt(g.value)} of ${fmt(g.max)}${g.unit ? ` ${g.unit}` : ""}, ${pct.format(g.progress)}`;
  const spot = active !== null ? visible[active] : undefined;

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const x = ((event.clientX - rect.left) / rect.width) * S;
    const y = ((event.clientY - rect.top) / rect.height) * S;
    const d = Math.hypot(x - c, y - c);
    const i = visible.findIndex((g) => Math.abs(d - g.r) <= thickness / 2 + gap / 2);
    return i < 0 ? null : i;
  };
  const centerSize = Math.max(12, Math.min(28, innerR * 0.5));
  const drawing = (
    <div className={cn(blockReset, "relative shrink-0")} style={{ width: S, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
        <defs>
          <filter id={`${uid}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={thickness * 0.35} />
          </filter>
          <filter id={`${uid}-shadow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={thickness * 0.16} />
          </filter>
        </defs>
        {visible.map((g, i) => (
          <Ring key={g.key} geo={g} index={i} c={c} thickness={thickness} dim={active !== null && active !== i} glow={glow} uid={uid} entrance={anim.entrance} updates={anim.updates} />
        ))}
      </svg>
      {innerR > 14 ? (
        <div
          aria-hidden="true"
          className={cn(blockReset, "pointer-events-none absolute flex flex-col items-center justify-center overflow-hidden rounded-pui-full text-center")}
          style={{ inset: `${((c - innerR + 2) / S) * 100}%` }}
        >
          {spot ? (
            <motion.div
              key={spot.key}
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={anim.reducedMotion ? instant : chartMotion.hover}
              className={cn(blockReset, "flex flex-col items-center leading-none")}
            >
              <span className={cn(blockReset, "font-semibold tracking-tight tabular-nums")} style={{ fontSize: centerSize, color: mix(spot.color, "var(--pui-foreground)", 0.55) }}>
                {pct.format(spot.progress)}
              </span>
              {innerR > 30 ? <span className={cn(blockReset, "mt-1 max-w-full truncate text-[10px] font-medium text-pui-muted-foreground")}>{spot.label}</span> : null}
            </motion.div>
          ) : (
            center
          )}
        </div>
      ) : null}
      <div
        aria-hidden="true"
        onPointerMove={(event) => setHover(pick(event))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(event) => {
          const i = pick(event);
          if (i !== null) setPinned((p) => (p === i ? null : i));
        }}
        className={cn(blockReset, "absolute inset-0 rounded-pui-full", hover !== null ? "cursor-pointer" : "")}
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={chartLabel}
      {...rest}
      className={cn(
        blockReset,
        "flex min-w-0 text-pui-foreground",
        legend === "bottom" ? "flex-col items-center gap-3" : "flex-wrap items-center gap-5",
        className,
      )}
    >
      {drawing}
      <div className={srOnly}>
        {visible.map((g) => (
          <div
            key={g.key}
            role="meter"
            aria-label={g.label}
            aria-valuemin={0}
            aria-valuemax={g.max}
            aria-valuenow={Math.min(g.max, Math.max(0, g.value))}
            aria-valuetext={textOf(g)}
          />
        ))}
      </div>
      {legend !== "none" && visible.length ? (
        <ul className={cn(listReset, "flex min-w-0 flex-col gap-2", legend === "bottom" ? "w-full max-w-xs" : "")}>
          {visible.map((g, i) => (
            <li key={g.key} className={cn(blockReset, "min-w-0 transition-opacity duration-150", active !== null && active !== i ? "opacity-50" : "")}>
              <button
                type="button"
                aria-pressed={pinned === i}
                onClick={() => setPinned((p) => (p === i ? null : i))}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setFocus(i)}
                onBlur={() => setFocus(null)}
                className={cn(
                  controlReset,
                  focusRing,
                  "flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-pui-md py-0.5 pe-2 text-left hover:bg-pui-muted",
                  pinned === i ? "bg-pui-muted" : "",
                )}
              >
                <span aria-hidden="true" className={cn(blockReset, "h-7 w-1 shrink-0 rounded-pui-full")} style={{ background: g.color }} />
                <span className={cn(blockReset, "flex min-w-0 flex-col leading-tight")}>
                  <span className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>{g.label}</span>
                  <span className={cn(blockReset, "whitespace-nowrap text-sm tabular-nums")}>
                    <span className={cn(blockReset, "font-semibold text-pui-foreground")}>{fmt(g.value)}</span>
                    <span className={cn(blockReset, "text-pui-muted-foreground")}>
                      {" "}
                      / {fmt(g.max)}
                      {g.unit ? ` ${g.unit}` : ""}
                    </span>
                    {g.progress >= 1 ? <span className={cn(blockReset, "ms-1.5 text-[11px] font-semibold text-pui-success-text")}>{pct.format(g.progress)}</span> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
