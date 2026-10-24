"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, listReset } from "../lib/styles";
import type { Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface UsageMeterSegment {
  label: string;
  value: number;
  /** CSS color for the segment. Default: the chart palette (--pui-chart-1..8) in order. */
  color?: string;
}
export type UsageMeterStatus = "ok" | "warning" | "critical" | "over";
export interface UsageMeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Visible name of the quota, e.g. "Storage". Also the meter's accessible name. */
  label: React.ReactNode;
  /** Amount used. Default: the sum of `segments`. */
  value?: number;
  /** The plan limit (must be > 0). */
  max: number;
  /** Breakdown of what uses the quota; drawn as stacked segments with a legend. */
  segments?: readonly UsageMeterSegment[];
  /** Forecast usage at the end of the period; drawn as a dashed marker with a ghost fill. */
  projected?: number;
  /** Fractions of max where the bar turns warning and critical. Default { warning: 0.8, critical: 0.95 }. */
  thresholds?: { warning?: number; critical?: number };
  /** Formats amounts. Default: Intl number, max 1 decimal, plus ` ${unit}` when given. */
  formatValue?: (value: number) => string;
  /** Unit appended by the default formatter, e.g. "GB". */
  unit?: string;
  /** Footer text, e.g. "Resets in 6 days". */
  resetLabel?: React.ReactNode;
  /** Slot at the end of the header, e.g. an "Upgrade" button. */
  action?: React.ReactNode;
  /** Show the segment legend. Default true when there are segments. */
  showLegend?: boolean;
  /** Default "md". */
  size?: "sm" | "md";
}
const statusTone: Record<UsageMeterStatus, Tone> = { ok: "primary", warning: "warning", critical: "danger", over: "danger" };
const toneVar: Record<Tone, string> = {
  neutral: "var(--pui-foreground)",
  primary: "var(--pui-primary)",
  success: "var(--pui-success)",
  warning: "var(--pui-warning)",
  danger: "var(--pui-danger)",
  info: "var(--pui-info)",
};
const toneText: Record<Tone, string> = {
  neutral: "text-pui-foreground",
  primary: "text-pui-muted-foreground",
  success: "text-pui-success-text",
  warning: "text-pui-warning-text",
  danger: "text-pui-danger-text",
  info: "text-pui-info-text",
};
const trackHeight = { sm: "h-1.5", md: "h-2.5" } as const;
const finite = (n: number | undefined, fallback = 0) => (n !== undefined && Number.isFinite(n) ? n : fallback);
/** Status of a usage amount against a limit and its thresholds. */
export function usageStatus(value: number, max: number, thresholds: { warning?: number; critical?: number } = {}): UsageMeterStatus {
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 1) return "over";
  if (ratio >= (thresholds.critical ?? 0.95)) return "critical";
  if (ratio >= (thresholds.warning ?? 0.8)) return "warning";
  return "ok";
}
/**
 * Plan quota meter: a stacked breakdown of what uses the quota, warning and critical tones as the
 * limit nears, a dashed projected-usage marker with a ghost fill and a hatched overage. One
 * role="meter" carries the numbers for assistive tech; the legend is a plain list.
 */
export const UsageMeter = React.forwardRef<HTMLDivElement, UsageMeterProps>(function UsageMeter(
  {
    label,
    value: valueProp,
    max: maxProp,
    segments,
    projected,
    thresholds,
    formatValue,
    unit,
    resetLabel,
    action,
    showLegend,
    size = "md",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  const max = finite(maxProp) > 0 ? maxProp : 1;
  const segs = segments ?? [];
  const value = Math.max(0, finite(valueProp, segs.reduce((sum, s) => sum + Math.max(0, finite(s.value)), 0)));
  const status = usageStatus(value, max, thresholds);
  const tone = statusTone[status];
  const format = React.useMemo(() => {
    if (formatValue) return formatValue;
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
    return (n: number) => (unit ? `${nf.format(n)} ${unit}` : nf.format(n));
  }, [formatValue, unit]);
  // Over the limit, the scale grows so the overage is visible past a limit tick.
  const scale = Math.max(max, value, finite(projected));
  const pct = (n: number) => `${(Math.max(0, n) / scale) * 100}%`;
  const percent = Math.round((value / max) * 100);
  const over = value - max;
  const showProjected = projected !== undefined && Number.isFinite(projected) && projected > value;
  const projectedOver = showProjected && (projected) > max;
  const legend = showLegend ?? segs.length > 0;
  const grow = reduced
    ? { initial: false as const }
    : { initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: springs.smooth };
  // Single bar unless there is a breakdown; segments take the chart palette, the single bar the tone.
  const bars =
    segs.length > 0
      ? segs.map((s, i) => ({ label: s.label, value: Math.max(0, finite(s.value)), color: s.color ?? `var(--pui-chart-${(i % 8) + 1})` }))
      : [{ label: "", value, color: toneVar[tone] }];
  const valueText = `${format(value)} of ${format(max)} (${percent}%)${status === "over" ? `, ${format(over)} over the limit` : ""}${
    showProjected ? `, projected ${format(projected)}` : ""
  }`;
  return (
    <div
      ref={ref}
      data-status={status}
      data-size={size}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col text-pui-foreground", size === "sm" ? "gap-1.5" : "gap-2.5", className)}
    >
      <div className={cn(blockReset, "flex items-baseline justify-between gap-3")}>
        <span id={labelId} className={cn(blockReset, "min-w-0 truncate font-medium", size === "sm" ? "text-xs" : "text-sm")}>
          {label}
        </span>
        <span className={cn(blockReset, "flex shrink-0 items-baseline gap-3")}>
          <span className={cn(blockReset, "tabular-nums", size === "sm" ? "text-xs" : "text-sm")}>
            <span className={cn(blockReset, "font-semibold")}>{format(value)}</span>
            <span className={cn(blockReset, "text-pui-muted-foreground")}> / {format(max)}</span>
          </span>
          {action}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-valuetext={valueText}
        className={cn(blockReset, "relative w-full overflow-hidden rounded-pui-full bg-pui-muted", trackHeight[size])}
      >
        {showProjected ? (
          <span
            aria-hidden="true"
            data-part="projected-fill"
            className={cn(blockReset, "absolute inset-y-0 start-0 rounded-pui-full opacity-25")}
            style={{ width: pct(projected), backgroundColor: projectedOver ? toneVar.danger : toneVar[tone] }}
          />
        ) : null}
        <motion.span
          aria-hidden="true"
          {...grow}
          className={cn(
            blockReset,
            "absolute inset-y-0 start-0 flex origin-left gap-px overflow-hidden rounded-pui-full transition-[width] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none rtl:origin-right",
          )}
          style={{ width: pct(value) }}
        >
          {bars.map((bar, i) => (
            <span
              key={`${bar.label}-${i}`}
              data-part="segment"
              className={cn(blockReset, "h-full min-w-0.5 transition-[flex-grow,background-color] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none")}
              style={{ flexGrow: bar.value, flexBasis: 0, backgroundColor: bar.color }}
            />
          ))}
        </motion.span>
        {status === "over" ? (
          <span
            aria-hidden="true"
            data-part="overage"
            className={cn(blockReset, "absolute inset-y-0 rounded-e-pui-full")}
            style={{
              insetInlineStart: pct(max),
              width: pct(over),
              backgroundImage: `repeating-linear-gradient(135deg, ${toneVar.danger} 0 3px, transparent 3px 6px)`,
            }}
          />
        ) : null}
        {scale > max ? (
          <span
            aria-hidden="true"
            data-part="limit"
            className={cn(blockReset, "absolute inset-y-0 w-0.5 -translate-x-1/2 bg-pui-foreground rtl:translate-x-1/2")}
            style={{ insetInlineStart: pct(max) }}
          />
        ) : null}
        {showProjected ? (
          <span
            aria-hidden="true"
            data-part="projected"
            className={cn(blockReset, "absolute inset-y-0 w-0 -translate-x-1/2 border-s-2 border-dashed rtl:translate-x-1/2")}
            style={{ insetInlineStart: pct(projected), borderColor: projectedOver ? toneVar.danger : "var(--pui-foreground)" }}
          />
        ) : null}
      </div>
      {legend && segs.length > 0 ? (
        <ul className={cn(listReset, "flex flex-wrap gap-x-4 gap-y-1 text-xs text-pui-muted-foreground")}>
          {bars.map((bar, i) => (
            <li key={`${bar.label}-${i}`} className={cn(blockReset, "flex items-center gap-1.5")}>
              <span aria-hidden="true" className={cn(blockReset, "size-2 rounded-pui-full")} style={{ backgroundColor: bar.color }} />
              <span className={cn(blockReset, "text-pui-foreground")}>{bar.label}</span>
              <span className={cn(blockReset, "tabular-nums")}>{format(bar.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {status !== "ok" || showProjected || resetLabel ? (
        <div className={cn(blockReset, "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs")}>
          <span className={cn(blockReset, "flex items-center gap-1.5", toneText[tone])}>
            {status === "over"
              ? `${format(over)} over your limit`
              : status === "critical"
                ? value >= max
                  ? "At your limit"
                  : `${percent}% used, almost at your limit`
                : status === "warning"
                  ? `${percent}% used`
                  : null}
            {showProjected ? (
              <span className={cn(blockReset, projectedOver ? "text-pui-danger-text" : "text-pui-muted-foreground")}>
                {status !== "ok" ? " · " : ""}
                Projected {format(projected)}
                {projectedOver ? ` (${format((projected) - max)} over)` : ""}
              </span>
            ) : null}
          </span>
          {resetLabel ? <span className={cn(blockReset, "text-pui-muted-foreground")}>{resetLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
});
