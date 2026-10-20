"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { devWarn } from "../lib/dev";
import { djb2 } from "../lib/ids";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface MeteorsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of meteors (0..100). Default 20. */
  count?: number;
  /** Travel angle in degrees. Default 215. */
  angle?: number;
  /** [min, max] seconds per fall. Default [2, 8]. */
  duration?: [min: number, max: number];
  /** [min, max] seconds of start delay. Default [0, 1]. */
  delay?: [min: number, max: number];
  /** Default "none". */
  mask?: PatternMask;
}

const defaultDuration: [number, number] = [2, 8];
const defaultDelay: [number, number] = [0, 1];

/** Shooting-star streaks (design 7.4 #55). Layout is seeded per instance and rendered after mount. */
export const Meteors = React.forwardRef<HTMLDivElement, MeteorsProps>(function Meteors(
  {
    count = 20,
    angle = 215,
    duration = defaultDuration,
    delay = defaultDelay,
    mask = "none",
    style,
    className,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const isClient = useIsClient();
  const reduced = usePrefersReducedMotion();
  const safeCount = Math.min(Math.max(Math.floor(Number.isFinite(count) ? count : 0), 0), 100);
  if (safeCount !== count) devWarn("meteors:count", "Meteors count must be an integer in 0..100; clamping.");
  const [dMin, dMax] = duration;
  const [lMin, lMax] = delay;

  const meteors = React.useMemo(() => {
    const random = mulberry32(djb2(id));
    return Array.from({ length: safeCount }, () => ({
      left: `${(random() * 110 - 5).toFixed(2)}%`,
      top: `${(random() * 40 - 10).toFixed(2)}%`,
      duration: dMin + random() * (dMax - dMin),
      delay: lMin + random() * (lMax - lMin),
    }));
  }, [id, safeCount, dMin, dMax, lMin, lMax]);

  if (reduced) return null;

  const vars = { "--pui-meteor-angle": `${angle}deg` } as React.CSSProperties;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      {...props}
      style={{ ...vars, ...style }}
      className={cn(blockReset, backgroundBase, "overflow-hidden text-pui-muted-foreground", patternMasks[mask], className)}
    >
      {isClient
        ? meteors.map((meteor, i) => (
            <span
              key={i}
              data-pui-meteor=""
              style={
                {
                  "--pui-meteor-delay": `${meteor.delay.toFixed(2)}s`,
                  "--pui-meteor-duration": `${meteor.duration.toFixed(2)}s`,
                  left: meteor.left,
                  top: meteor.top,
                  animationDelay: "var(--pui-meteor-delay)",
                  animationDuration: "var(--pui-meteor-duration)",
                } as React.CSSProperties
              }
              className={cn(
                blockReset,
                "absolute size-0.5 rounded-pui-full bg-current shadow-[0_0_0_1px_color-mix(in_oklab,currentColor_15%,transparent)] motion-safe:animate-pui-meteor",
                "before:absolute before:box-border before:top-1/2 before:h-px before:w-12 before:-translate-y-1/2 before:bg-linear-to-r before:from-current before:to-transparent before:content-['']",
              )}
            />
          ))
        : null}
    </div>
  );
});
