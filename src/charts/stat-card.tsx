"use client";

// KPI card: a label, a rolling headline value, a delta badge toned by its sign (inverted for
// "lower is better" metrics), a sparkline whose scrub drives the headline, a period switch with a
// gliding pill, an optional progress-to-target meter and a loading skeleton.
import { AnimatePresence, LayoutGroup, motion, type Transition } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { RollingNumber } from "../text/rolling-number";
import { srOnly } from "./core/a11y";
import { trendColor } from "./core/color";
import { formatNumber, getNumberFormat } from "./core/format";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { Sparkline } from "./sparkline";

const instant: Transition = { duration: 0 };
const pill: Transition = { type: "spring", stiffness: 500, damping: 38 };

export interface StatCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** What the number is ("Monthly recurring revenue"). */
  label: React.ReactNode;
  value: number;
  /** Intl number options for the value (currency, percent, compact, ...). */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  /** The comparison value; gives the delta when `delta` is not set. */
  previousValue?: number;
  /** Change as a fraction (0.12 = +12%) or, with deltaType "absolute", in value units. */
  delta?: number;
  /** "percent" (default) or "absolute" (formatted like the value, with a sign). */
  deltaType?: "percent" | "absolute";
  /** Lower is better (churn, latency): a fall is good news and turns green. Default false. */
  invertDelta?: boolean;
  /** Text after the delta. Default "vs previous period". */
  deltaCaption?: string;
  /** Recent values, oldest first; the last one is usually `value`. */
  trend?: readonly number[];
  /** Labels per trend point (dates), shown while scrubbing. */
  trendLabels?: readonly string[];
  /** Default "area". */
  trendVariant?: "line" | "area" | "bar";
  /** Sparkline color. Default: green or red by the delta's meaning, else the first chart color. */
  trendColor?: string;
  /** Adds a progress-to-target meter. */
  target?: number;
  /** Default "Target". */
  targetLabel?: string;
  /** Period switch options ("7D", "30D", "90D"). */
  periods?: readonly string[];
  period?: string;
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  /** A small icon in a tinted chip. */
  icon?: React.ReactNode;
  /** Extra content at the bottom (a link, a breakdown). */
  footer?: React.ReactNode;
  /** Shows a skeleton with the same footprint. */
  loading?: boolean;
  animation?: ChartAnimation;
}

function Arrow({ up, reducedMotion }: { up: boolean; reducedMotion: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn(blockReset, "size-3")}
      initial={false}
      animate={{ rotate: up ? 0 : 180 }}
      transition={reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 22 }}
    >
      <path d="M6 2.25 9.75 6.5H7.25v3.25h-2.5V6.5H2.25z" fill="currentColor" />
    </motion.svg>
  );
}

/**
 * KPI card with a rolling value, a toned delta badge, a scrubbable sparkline that drives the
 * headline, a period switch and an optional target meter.
 */
export const StatCard = React.forwardRef<HTMLElement, StatCardProps>(function StatCard(
  {
    label,
    value,
    format,
    locale = "en-US",
    previousValue,
    delta: deltaProp,
    deltaType = "percent",
    invertDelta = false,
    deltaCaption = "vs previous period",
    trend,
    trendLabels,
    trendVariant = "area",
    trendColor: trendColorProp,
    target,
    targetLabel = "Target",
    periods,
    period: periodProp,
    defaultPeriod,
    onPeriodChange,
    icon,
    footer,
    loading = false,
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartAnimation(animation);
  const [period, setPeriod] = useControllableState<string | undefined>({
    value: periodProp,
    defaultValue: defaultPeriod ?? periods?.[0],
    onChange: (p) => p !== undefined && onPeriodChange?.(p),
    name: "period",
  });
  const [scrub, setScrub] = React.useState<number | null>(null);
  const periodRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const fmt = (v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale);
  const scrubbing = scrub !== null && trend && trend[scrub] !== undefined;
  const shown = scrubbing ? (trend[scrub] as number) : value;

  // Delta: explicit, from previousValue, or (while scrubbing) vs the previous trend point.
  let delta: number | null = null;
  let type = deltaType;
  if (scrubbing) {
    const prev = scrub > 0 ? trend[scrub - 1] : undefined;
    delta = prev !== undefined && prev !== 0 ? (shown - prev) / Math.abs(prev) : null;
    type = "percent";
  } else if (deltaProp !== undefined) delta = deltaProp;
  else if (previousValue !== undefined) delta = deltaType === "absolute" ? value - previousValue : previousValue !== 0 ? (value - previousValue) / Math.abs(previousValue) : null;
  const flat = delta === null || Math.abs(delta) < (type === "percent" ? 0.0005 : 1e-9);
  const up = (delta ?? 0) > 0;
  const good = flat ? null : up !== invertDelta;
  const deltaText =
    delta === null
      ? ""
      : type === "percent"
        ? getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(delta))
        : fmt(Math.abs(delta));
  const caption = scrubbing ? (trendLabels?.[scrub] ?? `Point ${scrub + 1}`) + (scrub > 0 ? " vs previous" : "") : deltaCaption;
  const deltaLabel = delta === null ? "" : flat ? `no change ${caption}` : `${up ? "up" : "down"} ${deltaText} ${caption}`;

  const lineColor =
    trendColorProp ??
    (good === null ? "var(--pui-chart-1, var(--pui-primary))" : trendColor(good ? "up" : "down"));
  const progress = target !== undefined && target > 0 ? Math.max(0, Math.min(1, value / target)) : null;
  const labelId = `${uid}-label`;
  const deltaId = `${uid}-delta`;

  const onPeriodKey = (event: React.KeyboardEvent, index: number) => {
    if (!periods?.length) return;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % periods.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + periods.length) % periods.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = periods.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setPeriod(periods[next]);
    periodRefs.current[next]?.focus();
  };

  return (
    <section
      ref={ref}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={delta !== null && !loading ? deltaId : undefined}
      aria-busy={loading || undefined}
      {...rest}
      className={cn(
        blockReset,
        "relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-sm",
        className,
      )}
    >
      <div className={cn(blockReset, "flex min-w-0 items-start justify-between gap-3")}>
        <div className={cn(blockReset, "flex min-w-0 items-center gap-2")}>
          {icon ? (
            <span aria-hidden="true" className={cn(blockReset, "inline-flex size-7 shrink-0 items-center justify-center rounded-pui-md bg-pui-primary/12 text-pui-primary-text [&_svg]:size-4")}>
              {icon}
            </span>
          ) : null}
          <span id={labelId} className={cn(blockReset, "min-w-0 truncate text-sm font-medium text-pui-muted-foreground")}>
            {label}
          </span>
        </div>
        {periods?.length ? (
          <LayoutGroup id={`${uid}-periods`}>
            <div role="radiogroup" aria-label="Period" className={cn(blockReset, "relative flex shrink-0 rounded-pui-md bg-pui-muted p-0.5")}>
              {periods.map((p, i) => {
                const on = p === period;
                return (
                  <button
                    key={p}
                    ref={(el) => {
                      periodRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on || (period === undefined && i === 0) ? 0 : -1}
                    onClick={() => setPeriod(p)}
                    onKeyDown={(event) => onPeriodKey(event, i)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "relative min-h-6 min-w-6 cursor-pointer rounded-pui-sm px-2 text-[11px] font-semibold tabular-nums transition-colors",
                      on ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                    )}
                  >
                    {on ? (
                      <motion.span
                        layoutId="pill"
                        aria-hidden="true"
                        transition={anim.reducedMotion ? instant : pill}
                        className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-background shadow-pui-xs")}
                      />
                    ) : null}
                    <span className={cn(blockReset, "relative")}>{p}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        ) : null}
      </div>

      {loading ? (
        <div aria-hidden="true" className={cn(blockReset, "flex flex-col gap-3")}>
          <div className={cn(blockReset, "h-8 w-32 rounded-pui-md bg-pui-skeleton motion-safe:animate-pulse")} />
          <div className={cn(blockReset, "h-4 w-40 rounded-pui-md bg-pui-skeleton motion-safe:animate-pulse")} />
          {trend ? <div className={cn(blockReset, "h-12 w-full rounded-pui-md bg-pui-skeleton motion-safe:animate-pulse")} /> : null}
        </div>
      ) : (
        <>
          <div className={cn(blockReset, "flex min-w-0 flex-col gap-1.5")}>
            <span className={cn(blockReset, "text-3xl font-semibold tracking-tight tabular-nums text-pui-foreground")}>
              <RollingNumber value={shown} format={format ?? { maximumFractionDigits: 1 }} locale={locale} duration={scrubbing ? 0.35 : 0.6} />
            </span>
            {delta !== null ? (
              <div className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-2 text-xs")}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={flat ? "flat" : good ? "good" : "bad"}
                    initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    transition={anim.reducedMotion ? instant : { duration: 0.2, delay: 0.1 }}
                    aria-hidden="true"
                    className={cn(
                      blockReset,
                      "inline-flex items-center gap-1 rounded-pui-full px-2 py-0.5 font-semibold tabular-nums",
                      flat ? "bg-pui-muted text-pui-muted-foreground" : good ? "bg-pui-success/12 text-pui-success-text" : "bg-pui-danger/12 text-pui-danger-text",
                    )}
                  >
                    {flat ? null : <Arrow up={up} reducedMotion={anim.reducedMotion} />}
                    {flat ? "0%" : `${up ? "+" : "\u2212"}${deltaText}`}
                  </motion.span>
                </AnimatePresence>
                <span aria-hidden="true" className={cn(blockReset, "min-w-0 truncate text-pui-muted-foreground")}>
                  {caption}
                </span>
                <span id={deltaId} className={srOnly}>
                  {deltaLabel}
                </span>
              </div>
            ) : null}
          </div>
          {trend?.length ? (
            <Sparkline
              data={trend}
              labels={trendLabels}
              variant={trendVariant}
              fluid
              height={48}
              color={lineColor}
              format={format}
              locale={locale}
              label={typeof label === "string" ? label : "Trend"}
              animation={animation}
              onActiveChange={setScrub}
              className="w-full"
            />
          ) : null}
          {progress !== null && target !== undefined ? (
            <div className={cn(blockReset, "flex flex-col gap-1.5")}>
              <div className={cn(blockReset, "flex items-center justify-between gap-2 text-[11px] text-pui-muted-foreground")}>
                <span>
                  {targetLabel} {fmt(target)}
                </span>
                <span className={cn(blockReset, "font-semibold tabular-nums text-pui-foreground")}>
                  {getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value / target)}
                </span>
              </div>
              <div
                role="meter"
                aria-label={`${typeof label === "string" ? label : "Value"}: ${targetLabel.toLowerCase()}`}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={Math.max(0, Math.min(target, value))}
                aria-valuetext={`${fmt(value)} of ${fmt(target)}`}
                className={cn(blockReset, "h-1.5 overflow-hidden rounded-pui-full bg-pui-muted")}
              >
                <motion.div
                  className={cn(blockReset, "h-full origin-left rounded-pui-full")}
                  style={{ background: progress >= 1 ? "var(--pui-success)" : "var(--pui-chart-1, var(--pui-primary))" }}
                  initial={anim.entrance ? { scaleX: 0 } : false}
                  animate={{ scaleX: progress }}
                  transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 120, damping: 20, delay: anim.entrance ? 0.2 : 0 }}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
      {footer ? <div className={cn(blockReset, "border-t border-pui-border pt-3 text-xs")}>{footer}</div> : null}
    </section>
  );
});
