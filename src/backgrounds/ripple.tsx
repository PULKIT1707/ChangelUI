"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface RippleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of rings. Default 8. */
  count?: number;
  /** Innermost ring diameter in px (each ring adds 70). Default 210. */
  baseSize?: number;
  /** Innermost ring opacity (each ring subtracts 0.03). Default 0.24. */
  baseOpacity?: number;
  /** Seconds per pulse. Default 2. */
  duration?: number;
  /** Default "fade-bottom". */
  mask?: PatternMask;
}

/** Concentric pulsing rings (design 7.4 #57). */
export const Ripple = React.forwardRef<HTMLDivElement, RippleProps>(function Ripple(
  { count = 8, baseSize = 210, baseOpacity = 0.24, duration = 2, mask = "fade-bottom", className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rings = Math.max(0, Math.floor(count));
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "select-none overflow-hidden", patternMasks[mask], className)}
    >
      {Array.from({ length: rings }, (_, i) => {
        const size = baseSize + i * 70;
        return (
          <div
            key={i}
            data-pui-ripple-ring=""
            style={{
              width: size,
              height: size,
              opacity: Math.max(baseOpacity - i * 0.03, 0),
              animationDelay: `${(i * 0.06).toFixed(2)}s`,
              animationDuration: `${duration}s`,
              borderStyle: i === rings - 1 ? "dashed" : "solid",
              transform: "translate(-50%, -50%)",
            }}
            className={cn(
              blockReset,
              "absolute left-1/2 top-1/2 rounded-pui-full border border-pui-ripple bg-pui-ripple/15 shadow-pui-lg",
              !reduced && "motion-safe:animate-pui-ripple",
            )}
          />
        );
      })}
    </div>
  );
});
