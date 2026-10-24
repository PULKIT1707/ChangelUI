"use client";

// Liquid gauge: one fill level as liquid in a round (or rounded-square) tank. Two offset waves
// drift across the surface, the level settles on a soft spring and sloshes a little when it
// changes, and the label inverts color wherever the liquid covers it (the text is drawn twice, the
// second copy clipped by the wave). The loop pauses offscreen and in background tabs; reduced
// motion shows a flat, still surface. Micro: own SVG, only core math.
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { useDocumentVisible } from "../lib/use-document-visible";
import { categoricalColor, withOpacity } from "./core/color";
import { formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { ChartTip } from "./core/frame";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const V = 100;
const INSET = 7;
const WAVELENGTH = 56;
const level = { type: "spring", stiffness: 60, damping: 14 } as const;
const slosh = { type: "spring", stiffness: 90, damping: 9 } as const;

export interface LiquidGaugeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  value: number;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Middle readout: the share of the range (default) or the formatted value. */
  display?: "percent" | "value";
  /** Value format (display="value", the hover card and the value text). */
  format?: NumberFormat;
  locale?: string;
  /** Caption inside the tank, under the readout. */
  label?: string;
  /** Liquid color, or a function of the fill ratio (0..1), e.g. red when low. Default chart-1. */
  color?: string | ((ratio: number) => string);
  /** "circle" (default) or "square" (a rounded tank). */
  shape?: "circle" | "square";
  /** Width in px (scales down with the container). Default 180. */
  size?: number;
  /** Wave height in viewBox units (the tank is 100). Default 4. */
  waveAmplitude?: number;
  /** Seconds per wave cycle. Default 3. */
  waveSpeed?: number;
  /** 1 or 2 waves. Default 2. */
  waves?: 1 | 2;
  /** Tiny bubbles rising through the liquid. Default false. */
  bubbles?: boolean;
  /** Accessible name. Default the label, else "Fill level". */
  gaugeLabel?: string;
  /** aria-valuetext. Default "62 of 100 (62%)". */
  formatValueText?: (value: number, ratio: number) => string;
  animation?: ChartAnimation;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The closed liquid shape: a sine surface at height `y` shifted by `phase`, filled to the bottom. */
export function liquidPath(y: number, amplitude: number, phase: number, wavelength = WAVELENGTH): string {
  const start = -wavelength + (((phase % wavelength) + wavelength) % wavelength) - wavelength;
  const steps = 10;
  let d = "";
  for (let x = start; x <= V + wavelength; x += wavelength / steps) {
    const py = y + amplitude * Math.sin(((x - start) / wavelength) * Math.PI * 2);
    d += `${d ? "L" : "M"}${x.toFixed(2)},${py.toFixed(2)}`;
  }
  return `${d}L${(V + wavelength).toFixed(2)},${V + 10}L${start.toFixed(2)},${V + 10}Z`;
}

function useLoop(enabled: boolean, seconds: number): MotionValue<number> {
  const t = useMotionValue(0);
  React.useEffect(() => {
    if (!enabled) return;
    const from = t.get();
    const controls = animate(t, from + WAVELENGTH, { duration: seconds, ease: "linear", repeat: Infinity, repeatType: "loop" });
    return () => controls.stop();
  }, [enabled, seconds, t]);
  return t;
}

/** A wave-filled gauge whose label inverts color under the liquid, with slosh on change and a paused loop offscreen. */
export const LiquidGauge = React.forwardRef<HTMLDivElement, LiquidGaugeProps>(function LiquidGauge(
  {
    value,
    min = 0,
    max = 100,
    display = "percent",
    format,
    locale = "en-US",
    label,
    color,
    shape = "circle",
    size = 180,
    waveAmplitude = 4,
    waveSpeed = 3,
    waves = 2,
    bubbles = false,
    gaugeLabel,
    formatValueText,
    animation = "auto",
    className,
    onPointerEnter,
    onPointerLeave,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  // Motion's useInView builds an IntersectionObserver unguarded; without one, treat it as in view.
  const noRef = React.useRef<HTMLDivElement | null>(null);
  const hasObserver = typeof IntersectionObserver !== "undefined";
  const observed = useInView(hasObserver ? rootRef : noRef);
  const inView = observed || !hasObserver;
  const docVisible = useDocumentVisible();
  const [hover, setHover] = React.useState(false);

  const span = max - min || 1;
  const v = clamp(value, Math.min(min, max), Math.max(min, max));
  const ratio = clamp((v - min) / span, 0, 1);
  const fill = typeof color === "function" ? color(ratio) : (color ?? categoricalColor(0));
  const fmt = React.useCallback((n: number) => formatNumber(n, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const pct = React.useMemo(() => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const readoutOf = React.useCallback((r: number) => (display === "value" ? fmt(min + r * span) : pct.format(r)), [display, fmt, min, span, pct]);
  const valueText = formatValueText ? formatValueText(v, ratio) : `${fmt(v)} of ${fmt(max)} (${pct.format(ratio)})`;
  const name = gaugeLabel ?? label ?? "Fill level";

  // Level and slosh springs.
  const lvl = useMotionValue(anim.entrance ? 0 : ratio);
  const amp = useMotionValue(anim.reducedMotion ? 0 : waveAmplitude);
  React.useEffect(() => {
    if (!anim.updates) {
      lvl.set(ratio);
      amp.set(anim.reducedMotion ? 0 : waveAmplitude);
      return;
    }
    const a = animate(lvl, ratio, level);
    const delta = Math.abs(lvl.get() - ratio);
    amp.set(waveAmplitude * (1 + Math.min(1.6, delta * 6)));
    const b = animate(amp, waveAmplitude, slosh);
    return () => {
      a.stop();
      b.stop();
    };
  }, [ratio, anim.updates, anim.reducedMotion, waveAmplitude, lvl, amp]);

  // Wave loop: only while visible, on screen and allowed to move.
  const looping = anim.updates && !anim.reducedMotion && inView && docVisible;
  const front = useLoop(looping, waveSpeed);
  const back = useLoop(looping && waves === 2, waveSpeed * 1.45);

  const top = INSET;
  const bottom = V - INSET;
  const surfaceY = (r: number) => bottom - r * (bottom - top);
  // Keep the crest inside the tank at 0% and 100% so empty looks empty and full looks full.
  const frontD = useTransform([lvl, amp, front] as MotionValue<number>[], ([r, a, ph]) => {
    const rr = r as number;
    const edge = rr <= 0.001 ? 0 : rr >= 0.999 ? 0 : (a as number);
    return liquidPath(surfaceY(rr) + (rr <= 0.001 ? 3 : rr >= 0.999 ? -3 : 0), edge, -(ph as number));
  });
  const backD = useTransform([lvl, amp, back] as MotionValue<number>[], ([r, a, ph]) => {
    const rr = r as number;
    const edge = rr <= 0.001 || rr >= 0.999 ? 0 : (a as number) * 0.8;
    return liquidPath(surfaceY(rr) - 1.2 + (rr <= 0.001 ? 3 : rr >= 0.999 ? -3 : 0), edge, (ph as number) + WAVELENGTH * 0.4);
  });
  // The readout follows the level spring; storing the ratio (not the text) keeps format changes live.
  const [shownRatio, setShownRatio] = React.useState(() => (anim.entrance ? 0 : ratio));
  useMotionValueEvent(lvl, "change", (r) => setShownRatio(clamp(r, 0, 1)));
  const readoutText = readoutOf(anim.updates ? shownRatio : ratio);

  const tankId = `${uid}-tank`;
  const liquidId = `${uid}-liquid`;
  const tank =
    shape === "square" ? (
      <rect x={INSET} y={INSET} width={V - INSET * 2} height={V - INSET * 2} rx={16} />
    ) : (
      <circle cx={V / 2} cy={V / 2} r={V / 2 - INSET} />
    );
  const valueY = label ? 50 : 54;
  const textLayer = (fillColor: string) => (
    <>
      <text x={V / 2} y={valueY} textAnchor="middle" fontSize={21} fontWeight={650} fill={fillColor} style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        {readoutText}
      </text>
      {label ? (
        <text x={V / 2} y={valueY + 12} textAnchor="middle" fontSize={7.5} fontWeight={500} fill={fillColor} opacity={0.85}>
          {label}
        </text>
      ) : null}
    </>
  );
  const bubbleSpecs = [
    { x: 34, r: 1.4, d: 3.4, delay: 0 },
    { x: 58, r: 1, d: 2.8, delay: 1.1 },
    { x: 46, r: 1.8, d: 4.2, delay: 2 },
    { x: 66, r: 1.2, d: 3.1, delay: 0.6 },
  ];

  return (
    <div
      ref={setRefs}
      role="meter"
      aria-label={name}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={v}
      aria-valuetext={valueText}
      {...rest}
      onPointerEnter={(e) => {
        setHover(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHover(false);
        onPointerLeave?.(e);
      }}
      className={cn(blockReset, "relative inline-block w-full select-none text-pui-foreground", className)}
      style={{ maxWidth: size, ...rest.style }}
    >
      <svg viewBox={`0 0 ${V} ${V}`} width="100%" aria-hidden="true" className={cn(blockReset, "block h-auto overflow-visible")}>
        <defs>
          <clipPath id={tankId}>{tank}</clipPath>
          <clipPath id={liquidId}>
            <motion.path d={frontD} />
          </clipPath>
        </defs>
        {/* Rim */}
        {shape === "square" ? (
          <rect x={2} y={2} width={V - 4} height={V - 4} rx={20} fill="none" stroke={withOpacity(fill, 0.4)} strokeWidth={1.6} style={{ transition: "stroke 300ms" }} />
        ) : (
          <circle cx={V / 2} cy={V / 2} r={V / 2 - 2} fill="none" stroke={withOpacity(fill, 0.4)} strokeWidth={1.6} style={{ transition: "stroke 300ms" }} />
        )}
        <g clipPath={`url(#${tankId})`}>
          <rect x={0} y={0} width={V} height={V} fill={withOpacity(fill, 0.08)} style={{ transition: "fill 300ms" }} />
          {textLayer("var(--pui-foreground)")}
          {waves === 2 ? <motion.path d={backD} fill={withOpacity(fill, 0.45)} style={{ transition: "fill 300ms" }} /> : null}
          <motion.path d={frontD} fill={fill} style={{ transition: "fill 300ms" }} />
          <g clipPath={`url(#${liquidId})`}>
            {bubbles && looping
              ? bubbleSpecs.map((b, i) => (
                  <motion.circle
                    key={i}
                    cx={b.x}
                    r={b.r}
                    fill="var(--pui-background)"
                    initial={{ cy: V - INSET, opacity: 0 }}
                    animate={{ cy: [V - INSET, INSET + 10], opacity: [0, 0.55, 0.55, 0] }}
                    transition={{ duration: b.d, delay: b.delay, repeat: Infinity, ease: "easeIn" }}
                  />
                ))
              : null}
            {textLayer("var(--pui-background)")}
          </g>
        </g>
      </svg>
      <ChartTip left={0.5} top={0.04} open={hover} reducedMotion={anim.reducedMotion} className="min-w-0">
        <div className={cn(blockReset, "text-xs font-semibold tabular-nums")}>
          {fmt(v)} <span className={cn(blockReset, "font-normal text-pui-muted-foreground")}>of {fmt(max)}</span>
        </div>
        <div className={cn(blockReset, "text-[11px] tabular-nums text-pui-muted-foreground")}>{getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(ratio)} full</div>
      </ChartTip>
    </div>
  );
});
