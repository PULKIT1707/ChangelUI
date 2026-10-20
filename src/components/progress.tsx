"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { devWarn } from "../lib/dev";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** null / undefined (or NaN): indeterminate. Clamped to [0, max]. */
  value?: number | null;
  /** Default 100. */
  max?: number;
  /** Default "primary". */
  tone?: Tone;
  /** Track 4 / 8 / 12 px. Default "md". */
  size?: Size;
  /** Show the formatted value next to the bar. Default false. */
  showValue?: boolean;
  /** Default: rounded percent ("42%"). Also used for aria-valuetext. */
  formatValue?: (value: number, max: number) => string;
  /** Animated stripes (motion-safe). Default false. */
  striped?: boolean;
  /** Accessible name; omitted when aria-labelledby is passed. Default "Progress". */
  label?: string;
}

export interface CircularProgressProps extends Omit<ProgressProps, "striped"> {
  /** Stroke width in px. Default sm 3, md 4, lg 5. Size sm / md / lg = 32 / 48 / 64 px. */
  thickness?: number;
}

const defaultFormat = (value: number, max: number) => `${Math.round((value / max) * 100)}%`;

interface Normalized {
  indeterminate: boolean;
  value: number;
  max: number;
  percent: number;
}

function normalize(value: number | null | undefined, max: number | undefined, component: string): Normalized {
  let safeMax = max ?? 100;
  if (!Number.isFinite(safeMax) || safeMax <= 0) {
    devWarn(`${component}:max`, `${component} max must be a positive number; using 100.`);
    safeMax = 100;
  }
  if (value === null || value === undefined) return { indeterminate: true, value: 0, max: safeMax, percent: 0 };
  if (Number.isNaN(value)) {
    devWarn(`${component}:nan`, `${component} received NaN; rendering as indeterminate.`);
    return { indeterminate: true, value: 0, max: safeMax, percent: 0 };
  }
  const clamped = Math.min(Math.max(value, 0), safeMax);
  return { indeterminate: false, value: clamped, max: safeMax, percent: (clamped / safeMax) * 100 };
}

function progressAria(
  n: Normalized,
  label: string,
  labelledBy: string | undefined,
  format: (value: number, max: number) => string,
) {
  return {
    role: "progressbar" as const,
    "aria-label": labelledBy ? undefined : label,
    "aria-labelledby": labelledBy,
    "aria-valuemin": 0,
    "aria-valuemax": n.max,
    "aria-valuenow": n.indeterminate ? undefined : n.value,
    "aria-valuetext": n.indeterminate ? undefined : format(n.value, n.max),
    "data-state": n.indeterminate ? "indeterminate" : n.value >= n.max ? "complete" : "loading",
  };
}

const trackSizes: Record<Size, string> = { sm: "h-1", md: "h-2", lg: "h-3" };
const valueText: Record<Size, string> = { sm: "text-xs", md: "text-xs", lg: "text-sm" };
const stripes =
  "bg-[linear-gradient(45deg,color-mix(in_oklab,var(--pui-tone-fg)_22%,transparent)_25%,transparent_25%,transparent_50%,color-mix(in_oklab,var(--pui-tone-fg)_22%,transparent)_50%,color-mix(in_oklab,var(--pui-tone-fg)_22%,transparent)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]";

/** Linear progress bar with determinate, indeterminate and striped modes (design 7.1 #13). */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    max,
    tone = "primary",
    size = "md",
    showValue = false,
    formatValue = defaultFormat,
    striped = false,
    label = "Progress",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const n = normalize(value, max, "Progress");

  return (
    <div
      ref={ref}
      {...progressAria(n, label, props["aria-labelledby"], formatValue)}
      data-tone={tone}
      data-size={size}
      {...props}
      className={cn(blockReset, "flex w-full items-center gap-3", toneClasses[tone], className)}
    >
      <span
        className={cn(blockReset, "relative block flex-1 overflow-hidden rounded-pui-full bg-(--pui-tone)/15", trackSizes[size])}
      >
        {n.indeterminate ? (
          <span
            data-pui-progress-indicator=""
            className={cn(
              blockReset,
              "absolute inset-y-0 left-0 block w-2/5 rounded-pui-full bg-(--pui-tone)",
              reduced ? "left-[30%]" : "motion-safe:animate-pui-indeterminate motion-reduce:left-[30%]",
            )}
          />
        ) : (
          <motion.span
            data-pui-progress-indicator=""
            className={cn(blockReset, "relative block h-full overflow-hidden rounded-pui-full bg-(--pui-tone)")}
            initial={false}
            animate={{ width: `${n.percent}%` }}
            transition={springs.smooth}
          >
            {striped && !reduced ? (
              <motion.span
                data-pui-stripes=""
                className={cn(blockReset, "absolute inset-0 block", stripes)}
                animate={{ backgroundPositionX: ["0rem", "1rem"] }}
                transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
              />
            ) : null}
          </motion.span>
        )}
      </span>
      {showValue && !n.indeterminate ? (
        <span
          aria-hidden="true"
          className={cn(blockReset, "shrink-0 font-medium tabular-nums text-pui-muted-foreground", valueText[size])}
        >
          {formatValue(n.value, n.max)}
        </span>
      ) : null}
    </div>
  );
});

const circleSizes: Record<Size, number> = { sm: 32, md: 48, lg: 64 };
const circleThickness: Record<Size, number> = { sm: 3, md: 4, lg: 5 };
const circleText: Record<Size, string> = { sm: "text-[0.625rem]", md: "text-xs", lg: "text-sm" };

/** Circular progress ring (design 7.1 #13). */
export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(function CircularProgress(
  {
    value,
    max,
    tone = "primary",
    size = "md",
    showValue = false,
    formatValue = defaultFormat,
    label = "Progress",
    thickness,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const n = normalize(value, max, "CircularProgress");
  const box = circleSizes[size];
  const stroke = thickness ?? circleThickness[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = n.indeterminate ? circumference * (reduced ? 0.6 : 0.75) : circumference * (1 - n.percent / 100);

  return (
    <div
      ref={ref}
      {...progressAria(n, label, props["aria-labelledby"], formatValue)}
      data-tone={tone}
      data-size={size}
      {...props}
      style={{ width: box, height: box, ...style }}
      className={cn(blockReset, "relative inline-flex shrink-0 items-center justify-center", toneClasses[tone], className)}
    >
      <svg
        viewBox={`0 0 ${box} ${box}`}
        width={box}
        height={box}
        aria-hidden="true"
        focusable="false"
        className={cn(
          blockReset,
          "block shrink-0 -rotate-90",
          n.indeterminate && !reduced && "animate-spin motion-reduce:animate-none",
        )}
      >
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-(--pui-tone)/15"
        />
        <motion.circle
          data-pui-progress-indicator=""
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="stroke-(--pui-tone)"
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={springs.smooth}
        />
      </svg>
      {showValue && !n.indeterminate ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "absolute inset-0 flex items-center justify-center font-medium tabular-nums text-pui-foreground",
            circleText[size],
          )}
        >
          {formatValue(n.value, n.max)}
        </span>
      ) : null}
    </div>
  );
});
