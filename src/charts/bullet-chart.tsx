"use client";

// Bullet chart (after Stephen Few): one KPI against its target on qualitative bands, in a single
// row. The measure grows in, the target tick drops in after it, an optional ghost marker shows last
// period, and hover or focus opens a card with value, target and the gap. Stack several with the
// same labelWidth for a dense KPI panel. Micro: plain HTML, only core math.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { categoricalColor, mix } from "./core/color";
import { formatNumber, type NumberFormat } from "./core/format";
import { ChartTip, TipRow } from "./core/frame";
import { ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";

const instant: Transition = { duration: 0 };

export interface BulletBand {
  /** Upper bound of the band (ascending). */
  to: number;
  /** Shown in the card and the value text ("Good"). */
  label?: string;
}

export interface BulletChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "color"> {
  value: number;
  /** The goal: a tick across the bar. */
  target?: number;
  /** Last period: a hollow ghost marker. */
  previous?: number;
  /** Qualitative ranges, ascending, as numbers or { to, label }. The last one sets max by default. */
  bands?: ReadonlyArray<number | BulletBand>;
  /** Default 0. */
  min?: number;
  /** Default: the largest of the last band, the target and the value (rounded up to a nice tick). */
  max?: number;
  /** Default "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Row title, e.g. "Revenue". */
  label?: React.ReactNode;
  /** Muted text under the label, e.g. "USD, thousands". */
  sublabel?: React.ReactNode;
  /** Width of the label column (horizontal), so stacked bullets line up. Default 120. */
  labelWidth?: number;
  /** Lower is better (costs, latency): bands shade the other way and "over" is bad. Default false. */
  invert?: boolean;
  /** Measure color. Default: chart-1, or success/danger when `toneByTarget`. */
  color?: string;
  /** Color the measure by whether it meets the target. Default false. */
  toneByTarget?: boolean;
  /** Axis tick labels. Default false. */
  ticks?: boolean;
  /** Show the value at the end of the row. Default true. */
  showValue?: boolean;
  format?: NumberFormat;
  locale?: string;
  /** Bar thickness in px. Default 22 (vertical: the width). */
  size?: number;
  /** Vertical only: plot height in px. Default 180. */
  height?: number;
  /** Accessible name when the label is not a string. */
  chartLabel?: string;
  animation?: ChartAnimation;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A compact KPI bar: the measure against a target tick on qualitative bands, with a hover/focus card. */
export const BulletChart = React.forwardRef<HTMLDivElement, BulletChartProps>(function BulletChart(
  {
    value,
    target,
    previous,
    bands,
    min = 0,
    max: maxProp,
    orientation = "horizontal",
    label,
    sublabel,
    labelWidth = 120,
    invert = false,
    color,
    toneByTarget = false,
    ticks = false,
    showValue = true,
    format,
    locale = "en-US",
    size = 22,
    height = 180,
    chartLabel,
    animation = "auto",
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const anim = useChartAnimation(animation);
  const vertical = orientation === "vertical";
  const [open, setOpen] = React.useState(false);
  const fmt = (n: number) => formatNumber(n, format ?? { maximumFractionDigits: 1 }, locale);

  const resolvedBands = React.useMemo(() => (bands ?? []).map((b) => (typeof b === "number" ? { to: b } : b)).sort((a, b) => a.to - b.to), [bands]);
  const max = React.useMemo(() => {
    if (maxProp !== undefined) return maxProp;
    const top = Math.max(resolvedBands[resolvedBands.length - 1]?.to ?? 0, target ?? 0, value, previous ?? 0);
    if (resolvedBands.length && top === resolvedBands[resolvedBands.length - 1]?.to) return top;
    const t = niceTicks(min, top, 4);
    return Math.max(top, t[t.length - 1] ?? top);
  }, [maxProp, resolvedBands, target, value, previous, min]);
  const span = max - min || 1;
  const pos = (n: number) => (clamp(n, min, max) - min) / span;

  const met = target === undefined ? null : invert ? value <= target : value >= target;
  const fill = color ?? (toneByTarget && met !== null ? (met ? "var(--pui-success)" : "var(--pui-danger)") : categoricalColor(0));
  const bandAt = (n: number) => resolvedBands.find((b) => n <= b.to) ?? resolvedBands[resolvedBands.length - 1];
  const band = bandAt(value);
  const gap = target === undefined ? null : value - target;
  const gapText = gap === null ? "" : Math.abs(gap) < 1e-9 ? "on target" : gap > 0 ? `${fmt(gap)} over target` : `${fmt(-gap)} to target`;
  const name = chartLabel ?? (typeof label === "string" ? label : "Bullet chart");
  const valueText = [fmt(value), target !== undefined ? `target ${fmt(target)}, ${gapText}` : null, band?.label ?? null, previous !== undefined ? `previous ${fmt(previous)}` : null]
    .filter(Boolean)
    .join(", ");
  const tickValues = ticks ? niceTicks(min, max, vertical ? 4 : 5).filter((t) => t >= min && t <= max) : [];

  // Band shades: darkest at the "bad" end (Few), mixed from the foreground so both themes work.
  const shades = resolvedBands.map((_, i) => {
    const n = resolvedBands.length;
    const t = n === 1 ? 0.1 : invert ? 0.06 + (i / (n - 1)) * 0.14 : 0.2 - (i / (n - 1)) * 0.14;
    return mix("var(--pui-foreground)", "var(--pui-background)", t);
  });

  const measure = pos(value);
  const targetPos = target !== undefined ? pos(target) : null;
  const prevPos = previous !== undefined ? pos(previous) : null;
  const along = (t: number) => `${t * 100}%`;
  const measureThickness = Math.max(4, Math.round(size * 0.36));

  const plot = (
    <div
      className={cn(blockReset, "relative rounded-pui-sm", vertical ? "mx-auto" : "w-full")}
      style={vertical ? { width: size, height } : { height: size }}
    >
      {/* Bands (or a plain track) */}
      <div aria-hidden="true" className={cn(blockReset, "absolute inset-0 overflow-hidden rounded-pui-sm")} style={{ background: resolvedBands.length ? undefined : "var(--pui-muted)" }}>
        {resolvedBands.map((b, i) => {
          const from = i === 0 ? 0 : pos(resolvedBands[i - 1]?.to ?? min);
          const to = pos(b.to);
          return (
            <span
              key={i}
              className={cn(blockReset, "absolute block")}
              style={vertical ? { left: 0, right: 0, bottom: along(from), height: along(to - from), background: shades[i] } : { top: 0, bottom: 0, left: along(from), width: along(to - from), background: shades[i] }}
            />
          );
        })}
      </div>
      {/* Measure */}
      <motion.span
        aria-hidden="true"
        className={cn(blockReset, "absolute block rounded-[3px]")}
        style={
          vertical
            ? { bottom: 0, left: "50%", width: measureThickness, marginLeft: -measureThickness / 2, background: fill }
            : { left: 0, top: "50%", height: measureThickness, marginTop: -measureThickness / 2, background: fill }
        }
        initial={anim.entrance ? (vertical ? { height: "0%" } : { width: "0%" }) : false}
        animate={vertical ? { height: along(measure) } : { width: along(measure) }}
        transition={anim.reducedMotion ? instant : chartMotion.growBar}
      />
      {/* Previous period ghost */}
      {prevPos !== null ? (
        <motion.span
          aria-hidden="true"
          className={cn(blockReset, "absolute block size-2.5 rounded-pui-full border-2 bg-pui-background")}
          style={{ borderColor: fill, ...(vertical ? { left: "50%", marginLeft: -5, marginBottom: -5 } : { top: "50%", marginTop: -5, marginLeft: -5 }) }}
          initial={anim.entrance ? { opacity: 0 } : false}
          animate={vertical ? { bottom: along(prevPos), opacity: 1 } : { left: along(prevPos), opacity: 1 }}
          transition={anim.reducedMotion ? instant : { ...chartMotion.layout, delay: anim.entrance ? 0.3 : 0 }}
        />
      ) : null}
      {/* Target tick drops in after the measure */}
      {targetPos !== null ? (
        <motion.span
          aria-hidden="true"
          className={cn(blockReset, "absolute block rounded-pui-full bg-pui-foreground")}
          style={vertical ? { left: "12%", right: "12%", height: 3, marginBottom: -1.5 } : { top: "12%", bottom: "12%", width: 3, marginLeft: -1.5 }}
          initial={anim.entrance ? (vertical ? { opacity: 0, x: -8, bottom: along(targetPos) } : { opacity: 0, y: -8, left: along(targetPos) }) : false}
          animate={vertical ? { opacity: 1, x: 0, bottom: along(targetPos) } : { opacity: 1, y: 0, left: along(targetPos) }}
          transition={anim.reducedMotion ? instant : { ...chartMotion.growBar, delay: anim.entrance ? 0.2 : 0 }}
        />
      ) : null}
      <ChartTip left={vertical ? 0.5 : measure} top={vertical ? 1 - measure : 0} flipX={!vertical && measure > 0.6} open={open} reducedMotion={anim.reducedMotion}>
        <div className={cn(blockReset, "mb-1 text-xs font-semibold")}>{name}</div>
        <TipRow swatch={fill} label="Value" value={fmt(value)} />
        {target !== undefined ? <TipRow label="Target" value={fmt(target)} /> : null}
        {gap !== null ? <TipRow label="Gap" value={`${gap > 0 ? "+" : ""}${fmt(gap)}`} tone={Math.abs(gap) < 1e-9 ? "muted" : met ? "up" : "down"} /> : null}
        {previous !== undefined ? <TipRow label="Previous" value={fmt(previous)} tone="muted" /> : null}
        {band?.label ? <TipRow label="Band" value={band.label} tone="muted" /> : null}
      </ChartTip>
    </div>
  );

  const axis = tickValues.length ? (
    <div aria-hidden="true" className={cn(blockReset, "relative text-[10px] tabular-nums text-pui-muted-foreground", vertical ? "" : "mt-1 h-3.5 w-full")} style={vertical ? { height, width: 32 } : undefined}>
      {tickValues.map((t) => (
        <span
          key={t}
          className={cn(blockReset, "absolute leading-none")}
          style={vertical ? { bottom: along(pos(t)), right: 0, transform: "translateY(50%)" } : { left: along(pos(t)), transform: pos(t) > 0.98 ? "translateX(-100%)" : pos(t) < 0.02 ? undefined : "translateX(-50%)" }}
        >
          {fmt(t)}
        </span>
      ))}
    </div>
  ) : null;

  const valueBadge = showValue ? (
    <span aria-hidden="true" className={cn(blockReset, "flex flex-col tabular-nums leading-tight", vertical ? "items-center" : "w-20 shrink-0 items-end")}>
      <span className={cn(blockReset, "text-sm font-semibold text-pui-foreground")}>{fmt(value)}</span>
      {gap !== null ? (
        <span className={cn(blockReset, "text-[11px] font-medium", Math.abs(gap) < 1e-9 ? "text-pui-muted-foreground" : met ? "text-pui-success-text" : "text-pui-danger-text")}>
          {gap > 0 ? "+" : ""}
          {fmt(gap)}
        </span>
      ) : null}
    </span>
  ) : null;

  const labels =
    label || sublabel ? (
      <span aria-hidden="true" className={cn(blockReset, "flex min-w-0 flex-col leading-tight", vertical ? "items-center text-center" : "shrink-0 text-right")} style={vertical ? undefined : { width: labelWidth }}>
        {label ? <span className={cn(blockReset, "truncate text-sm font-medium text-pui-foreground")}>{label}</span> : null}
        {sublabel ? <span className={cn(blockReset, "truncate text-[11px] text-pui-muted-foreground")}>{sublabel}</span> : null}
      </span>
    ) : null;

  return (
    <div
      ref={ref}
      role="meter"
      aria-label={name}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamp(value, min, max)}
      aria-valuetext={valueText}
      {...rest}
      onPointerEnter={(e) => {
        setOpen(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setOpen(false);
        onPointerLeave?.(e);
      }}
      onFocus={(e) => {
        setOpen(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setOpen(false);
        onBlur?.(e);
      }}
      className={cn(
        blockReset,
        "min-w-0 rounded-pui-md text-pui-foreground",
        vertical ? "inline-flex flex-col items-center gap-2" : "flex w-full items-center gap-3",
        className,
      )}
    >
      {vertical ? (
        <>
          {valueBadge}
          <div className={cn(blockReset, "flex items-stretch gap-1.5")}>
            {axis}
            {plot}
          </div>
          {labels}
        </>
      ) : (
        <>
          {labels}
          <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
            {plot}
            {axis}
          </div>
          {valueBadge}
        </>
      )}
    </div>
  );
});
