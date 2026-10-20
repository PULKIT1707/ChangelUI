"use client";

// Gauge: one value against a known range. Two looks: a modern "arc" (progress ring colored by the
// band it falls in, with a glowing end knob) and a classic "needle" (band segments, ticks and an
// underdamped needle spring). Rolling value in the middle, band hover labels, a target marker,
// and an optional editable mode (onValueChange) that turns it into a draggable dial slider.
import { animate, AnimatePresence, motion, useMotionValue, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, focusRing } from "../lib/styles";
import { RollingNumber } from "../text/rolling-number";
import { formatNumber } from "./core/format";
import { arcPath, polar } from "./core/path";
import { ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const DEG = Math.PI / 180;
const instant: Transition = { duration: 0 };

export type GaugeTone = "success" | "warning" | "danger" | "info" | "primary" | "neutral";

export interface GaugeBand {
  /** Upper bound of the band (the previous band's `to`, or min, is the lower bound). */
  to: number;
  tone?: GaugeTone;
  /** Any CSS color or token; overrides tone. */
  color?: string;
  /** Shown on hover and announced ("Healthy"). */
  label?: string;
}

export interface GaugeChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title" | "onChange"> {
  value: number;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Colored ranges, ascending by `to`. */
  bands?: readonly GaugeBand[];
  /** "arc" (progress ring) or "needle" (dial). Default "arc". */
  variant?: "arc" | "needle";
  /** Degrees, 0 = 12 o'clock, clockwise. Default -120 and 120. */
  startAngle?: number;
  endAngle?: number;
  /** Ring thickness as a fraction of the radius. Default 0.16 (needle 0.12). */
  thickness?: number;
  /** Intl options for the value and tick labels. */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  /** Caption under the value. */
  label?: React.ReactNode;
  /** A marker on the scale (a goal, an SLO). */
  target?: number;
  targetLabel?: string;
  /** Tick labels: true (auto), a count, or false. Default: needle true, arc false. */
  ticks?: boolean | number;
  /** Width of the drawing in px (scales down with the container). Default 240. */
  size?: number;
  /** Makes the gauge an adjustable dial (role="slider"): drag it, or use the arrow keys. */
  onValueChange?: (value: number) => void;
  /** Step for the keyboard and dragging. Default (max - min) / 100. */
  step?: number;
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Accessible name. Default: the title or label, else "Gauge". */
  gaugeLabel?: string;
  /** aria-valuetext. Default: "62%, Healthy". */
  formatValueText?: (value: number, band: GaugeBand | null) => string;
  animation?: ChartAnimation;
}

function toneColor(tone: GaugeTone | undefined): string {
  switch (tone) {
    case "success":
      return "var(--pui-success)";
    case "warning":
      return "var(--pui-warning)";
    case "danger":
      return "var(--pui-danger)";
    case "info":
      return "var(--pui-info)";
    case "neutral":
      return "var(--pui-muted-foreground)";
    default:
      return "var(--pui-chart-1, var(--pui-primary))";
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A gauge for one value in a known range, with bands, a needle spring and an editable dial mode. */
export const GaugeChart = React.forwardRef<HTMLDivElement, GaugeChartProps>(function GaugeChart(
  {
    value,
    min = 0,
    max = 100,
    bands,
    variant = "arc",
    startAngle = -120,
    endAngle = 120,
    thickness,
    format,
    locale = "en-US",
    label,
    target,
    targetLabel = "Target",
    ticks,
    size = 240,
    onValueChange,
    step,
    title,
    titleAs: TitleTag = "h3",
    gaugeLabel,
    formatValueText,
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const needle = variant === "needle";
  const editable = !!onValueChange;
  const span = max - min || 1;
  const v = clamp(value, Math.min(min, max), Math.max(min, max));
  const stepSize = step ?? span / 100;
  const fmt = React.useCallback((n: number) => formatNumber(n, format ?? { maximumFractionDigits: 0 }, locale), [format, locale]);

  // Geometry.
  const a0 = startAngle * DEG;
  const a1 = endAngle * DEG;
  const W = size;
  const pad = needle && ticks !== false ? 10 : 6;
  const R = W / 2 - pad;
  const thick = R * (thickness ?? (needle ? 0.12 : 0.16));
  const inner = R - thick;
  let down = Math.max(-Math.cos(a0), -Math.cos(a1));
  for (let a = Math.ceil(a0 / (Math.PI / 2)) * (Math.PI / 2); a < a1; a += Math.PI / 2) down = Math.max(down, -Math.cos(a));
  const cx = W / 2;
  const cy = pad + R;
  // Needle dials put the readout on a solid plate below the hub, so the needle (which sweeps
  // below the center on dials wider than 180 degrees) passes under it and never covers the value.
  const readoutSize = Math.max(18, Math.min(40, R * 0.3));
  const plateTop = cy + 16;
  const plateH = Math.ceil(readoutSize * 1.2 + (label || bands?.some((b) => b.label) ? 18 : 0) + 10);
  const H = Math.round(cy + Math.max(R * down + thick * 0.2, needle ? 16 + plateH + 4 : 30) + pad);
  const angleOf = (n: number) => a0 + ((clamp(n, min, max) - min) / span) * (a1 - a0);

  // Bands with their lower bounds.
  const resolvedBands = React.useMemo(() => {
    let from = min;
    return (bands ?? []).map((b) => {
      const out = { ...b, from, color: b.color ?? toneColor(b.tone) };
      from = b.to;
      return out;
    });
  }, [bands, min]);
  const bandAt = (n: number) => resolvedBands.find((b) => n <= b.to) ?? resolvedBands[resolvedBands.length - 1] ?? null;
  const currentBand = bandAt(v);
  const valueColor = currentBand?.color ?? "var(--pui-chart-1, var(--pui-primary))";

  // The animated value (arc sweep or needle spring).
  const mv = useMotionValue(anim.entrance ? min : v);
  React.useEffect(() => {
    if (!anim.updates) {
      mv.set(v);
      return;
    }
    const controls = animate(mv, v, needle ? chartMotion.needle : { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, v, needle, anim.updates]);
  const progressD = useTransform(mv, (n) => {
    const a = angleOf(n);
    if (a - a0 < 1e-4) return "";
    return arcPath({ innerRadius: inner, outerRadius: R, startAngle: a0, endAngle: a, cornerRadius: thick / 2, cx, cy });
  });
  const knob = useTransform(mv, (n) => polar(angleOf(n), R - thick / 2, cx, cy));
  const knobX = useTransform(knob, (p) => p[0]);
  const knobY = useTransform(knob, (p) => p[1]);
  const needleTransform = useTransform(mv, (n) => `rotate(${angleOf(n) / DEG} ${cx} ${cy})`);

  // Ticks.
  const tickCount = ticks === false || (ticks === undefined && !needle) ? 0 : typeof ticks === "number" ? ticks : 5;
  const tickValues = tickCount ? niceTicks(min, max, tickCount).filter((t) => t >= min && t <= max) : [];
  const minorTicks = needle ? Array.from({ length: 41 }, (_, k) => min + (k / 40) * span) : [];

  // Interaction: hover bands, drag to edit.
  const [hoverBand, setHoverBand] = React.useState<{ index: number; x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const local = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return null;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    return { x, y, r: Math.hypot(x - cx, y - cy), angle: Math.atan2(x - cx, -(y - cy)), px: event.clientX - rect.left, py: event.clientY - rect.top };
  };
  const valueFromAngle = (angle: number) => {
    let a = angle;
    const mid = (a0 + a1) / 2;
    while (a < mid - Math.PI) a += 2 * Math.PI;
    while (a > mid + Math.PI) a -= 2 * Math.PI;
    const t = clamp((a - a0) / (a1 - a0), 0, 1);
    const raw = min + t * span;
    return clamp(Math.round(raw / stepSize) * stepSize, min, max);
  };
  const commit = (next: number) => {
    const n = clamp(Number(next.toFixed(10)), min, max);
    if (n === v) return;
    onValueChange?.(n);
  };
  const valueText = (n: number) => {
    const b = bandAt(n);
    if (formatValueText) return formatValueText(n, b);
    return `${fmt(n)}${b?.label ? `, ${b.label}` : ""}`;
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const p = local(event);
    if (!p) return;
    if (dragging.current) {
      commit(valueFromAngle(p.angle));
      return;
    }
    const onRing = p.r >= inner - 8 && p.r <= R + 8;
    if (!onRing || !resolvedBands.length) {
      setHoverBand(null);
      return;
    }
    const n = valueFromAngle(p.angle);
    const idx = resolvedBands.findIndex((b) => n <= b.to);
    setHoverBand(idx < 0 ? null : { index: idx, x: p.px, y: p.py });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = v + stepSize;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = v - stepSize;
    else if (event.key === "PageUp") next = v + stepSize * 10;
    else if (event.key === "PageDown") next = v - stepSize * 10;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    commit(next);
  };

  const name = gaugeLabel ?? (typeof title === "string" ? title : typeof label === "string" ? label : "Gauge");
  const titleId = `${uid}-title`;
  const hovered = hoverBand ? resolvedBands[hoverBand.index] : undefined;
  const targetAngle = target !== undefined ? angleOf(target) : null;

  return (
    <div ref={ref} {...rest} className={cn(blockReset, "flex min-w-0 flex-col items-center gap-2 text-pui-foreground", className)}>
      {title ? (
        <TitleTag id={titleId} className={cn(blockReset, "self-start text-sm font-semibold tracking-tight")}>
          {title}
        </TitleTag>
      ) : null}
      <div className={cn(blockReset, "relative w-full select-none")} style={{ maxWidth: W, aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Track */}
          <path
            d={arcPath({ innerRadius: inner, outerRadius: R, startAngle: a0, endAngle: a1, cornerRadius: needle ? 2 : thick / 2, cx, cy })}
            fill={needle && resolvedBands.length ? "transparent" : "var(--pui-muted)"}
          />
          {/* Bands: full segments (needle) or a thin outer guide (arc) */}
          {resolvedBands.map((b, i) => {
            const s = angleOf(b.from);
            const e = angleOf(b.to);
            if (e - s < 1e-4) return null;
            const on = hoverBand?.index === i;
            return needle ? (
              <path
                key={i}
                d={arcPath({ innerRadius: inner, outerRadius: R + (on ? 3 : 0), startAngle: s, endAngle: e, padAngle: 0.012, cornerRadius: 2, cx, cy })}
                fill={b.color}
                opacity={hoverBand && !on ? 0.45 : 0.9}
                style={{ transition: "opacity 150ms" }}
              />
            ) : (
              <path
                key={i}
                d={arcPath({ innerRadius: R + 3, outerRadius: R + (on ? 7 : 5), startAngle: s, endAngle: e, padAngle: 0.02, cornerRadius: 1, cx, cy })}
                fill={b.color}
                opacity={on ? 1 : 0.55}
                style={{ transition: "opacity 150ms" }}
              />
            );
          })}
          {/* Minor and major ticks (needle) */}
          {minorTicks.map((t, k) => {
            const a = angleOf(t);
            const major = k % 5 === 0;
            const [x1, y1] = polar(a, inner - 3, cx, cy);
            const [x2, y2] = polar(a, inner - (major ? 10 : 6), cx, cy);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--pui-muted-foreground)" strokeWidth={major ? 1.5 : 1} opacity={major ? 0.8 : 0.4} />;
          })}
          {tickValues.map((t) => {
            const [x, y] = polar(angleOf(t), needle ? inner - 22 : R + 14, cx, cy);
            return (
              <text key={t} x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={10} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {fmt(t)}
              </text>
            );
          })}
          {/* Progress (arc variant) */}
          {!needle ? (
            <>
              <motion.path d={progressD} fill={valueColor} style={{ transition: "fill 300ms" }} />
              <motion.circle cx={knobX} cy={knobY} r={thick * 0.7} fill={valueColor} opacity={0.35} filter={`url(#${uid}-glow)`} />
              <motion.circle cx={knobX} cy={knobY} r={thick * 0.32} fill="var(--pui-background)" />
            </>
          ) : null}
          {/* Target marker */}
          {targetAngle !== null ? (
            (() => {
              const [x1, y1] = polar(targetAngle, inner - 4, cx, cy);
              const [x2, y2] = polar(targetAngle, R + 6, cx, cy);
              return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--pui-foreground)" strokeWidth={2.5} strokeLinecap="round" />;
            })()
          ) : null}
          {/* Needle */}
          {needle ? (
            <g>
              <motion.g transform={needleTransform}>
                <path d={`M${cx - 4},${cy} L${cx - 1},${cy - R + thick * 0.4} L${cx + 1},${cy - R + thick * 0.4} L${cx + 4},${cy} Z`} fill="var(--pui-foreground)" />
              </motion.g>
              <circle cx={cx} cy={cy} r={9} fill="var(--pui-foreground)" />
              <circle cx={cx} cy={cy} r={4} fill={valueColor} style={{ transition: "fill 300ms" }} />
            </g>
          ) : null}
          {/* Min / max labels (arc without ticks) */}
          {!tickValues.length ? (
            <>
              <text x={polar(a0, R - thick / 2, cx, cy)[0]} y={polar(a0, R - thick / 2, cx, cy)[1] + thick + 6} textAnchor="middle" fontSize={10} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {fmt(min)}
              </text>
              <text x={polar(a1, R - thick / 2, cx, cy)[0]} y={polar(a1, R - thick / 2, cx, cy)[1] + thick + 6} textAnchor="middle" fontSize={10} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {fmt(max)}
              </text>
            </>
          ) : null}
        </svg>
        {/* Center readout */}
        <div
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute flex flex-col items-center",
            needle
              ? "left-1/2 -translate-x-1/2 rounded-pui-lg border border-pui-border bg-pui-background px-3 py-1 shadow-pui-sm"
              : "inset-x-0 -translate-y-1/2",
          )}
          style={{ top: `${((needle ? plateTop : down < 0.3 ? cy - R * 0.18 : cy) / H) * 100}%` }}
        >
          <span className={cn(blockReset, "font-semibold leading-tight tracking-tight tabular-nums")} style={{ fontSize: readoutSize }}>
            <RollingNumber value={v} format={format ?? { maximumFractionDigits: 0 }} locale={locale} />
          </span>
          {label || currentBand?.label ? (
            <span className={cn(blockReset, "flex items-center gap-1.5 text-xs text-pui-muted-foreground")}>
              {currentBand?.label ? <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: currentBand.color, transition: "background 300ms" }} /> : null}
              {label ?? currentBand?.label}
            </span>
          ) : null}
        </div>
        {/* Interaction surface */}
        <div
          role={editable ? "slider" : "meter"}
          tabIndex={editable ? 0 : undefined}
          aria-label={title ? undefined : name}
          aria-labelledby={title ? titleId : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-valuetext={valueText(v)}
          onPointerDown={
            editable
              ? (event) => {
                  const p = local(event);
                  if (!p || p.r < inner * 0.35) return;
                  dragging.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  commit(valueFromAngle(p.angle));
                }
              : undefined
          }
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onPointerLeave={() => setHoverBand(null)}
          onKeyDown={onKeyDown}
          className={cn(blockReset, "absolute inset-0 rounded-pui-lg", editable ? cn(focusRing, "cursor-grab active:cursor-grabbing") : "")}
          style={{ touchAction: editable ? "none" : "pan-y" }}
        />
        <AnimatePresence>
          {hovered && hoverBand && !dragging.current ? (
            <motion.div
              key="band"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1, left: hoverBand.x, top: hoverBand.y }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, transition: { duration: 0.1 } }}
              transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }}
              className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
            >
              <div
                className={cn(blockReset, "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-2.5 py-1.5 text-xs text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: "translate(-50%, calc(-100% - 12px))" }}
              >
                <div className={cn(blockReset, "flex items-center gap-1.5 font-semibold")}>
                  <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: hovered.color }} />
                  {hovered.label ?? `Band ${hoverBand.index + 1}`}
                </div>
                <div className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>
                  {fmt(hovered.from)} to {fmt(hovered.to)}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {target !== undefined ? (
        <span className={cn(blockReset, "text-[11px] text-pui-muted-foreground")}>
          {targetLabel} {fmt(target)} &middot; {v >= target ? `${fmt(v - target)} over` : `${fmt(target - v)} to go`}
        </span>
      ) : null}
    </div>
  );
});
