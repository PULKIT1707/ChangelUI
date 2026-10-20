"use client";

import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface NumberTickerProps extends Omit<TextBaseProps, "as"> {
  value: number;
  /** Start value. Default 0. */
  from?: number;
  /** Fraction digits. Default 0. */
  decimals?: number;
  /** Fixed for SSR/hydration determinism. Default "en-US". */
  locale?: string;
  /** Spread after the decimals options. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Seconds (spring, no bounce). Default 1.2. */
  duration?: number;
  onComplete?: () => void;
}

/** Counts up (or down) to a number without re-rendering per frame (design 7.2 #39). */
export const NumberTicker = React.forwardRef<HTMLElement, NumberTickerProps>(function NumberTicker(
  {
    value,
    from = 0,
    decimals = 0,
    locale = "en-US",
    formatOptions,
    duration = 1.2,
    onComplete,
    trigger = "inView",
    once = true,
    delay = 0,
    className,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const active = useInViewTrigger(rootRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const onCompleteRef = useLatestRef(onComplete);
  const finite = Number.isFinite(value);

  const optionsKey = JSON.stringify(formatOptions ?? null);
  const format = React.useMemo(() => {
    const options = JSON.parse(optionsKey) as Intl.NumberFormatOptions | null;
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      ...options,
    });
    return (n: number) => formatter.format(n);
  }, [locale, decimals, optionsKey]);

  const motionValue = useMotionValue(from);
  // React renders this text once; later frames write textContent directly.
  const [initialText] = React.useState(() => format(from));

  useMotionValueEvent(motionValue, "change", (latest) => {
    if (textRef.current) textRef.current.textContent = format(latest);
  });

  useIsomorphicLayoutEffect(() => {
    if (!finite || !active || !reduced) return;
    motionValue.jump(value);
    if (textRef.current) textRef.current.textContent = format(value);
  }, [finite, active, reduced, value, format, motionValue]);

  React.useEffect(() => {
    if (!finite || !active || reduced) return;
    const controls = animate(motionValue, value, {
      type: "spring",
      duration,
      bounce: 0,
      delay,
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => controls.stop();
  }, [finite, active, reduced, value, duration, delay, motionValue, onCompleteRef]);

  const finalText = finite ? format(value) : String(value);

  return (
    <span
      ref={mergedRef}
      data-state={finite ? (active ? "active" : "idle") : "static"}
      {...props}
      className={cn(blockReset, "inline-block tabular-nums", className)}
    >
      <span className={cn(blockReset, "sr-only")}>{finalText}</span>
      <span ref={textRef} aria-hidden="true" className={cn(blockReset)}>
        {finite ? initialText : finalText}
      </span>
    </span>
  );
});
