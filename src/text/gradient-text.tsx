"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface GradientTextProps extends Omit<TextBaseProps, "trigger" | "once"> {
  children: React.ReactNode;
  /** CSS colors. Default the three --pui-gradient-* tokens. */
  colors?: string[];
  /** Pan the gradient (motion-safe). Default true. */
  animate?: boolean;
  /** Seconds per pan cycle. Default 8. */
  duration?: number;
  /** Gradient angle in degrees. Default 90. */
  angle?: number;
}

const defaultColors = ["var(--pui-gradient-1)", "var(--pui-gradient-2)", "var(--pui-gradient-3)"];

/** Text filled with a (optionally panning) multi-stop gradient (design 7.2 #36). */
export const GradientText = React.forwardRef<HTMLElement, GradientTextProps>(function GradientText(
  {
    children,
    colors = defaultColors,
    animate = true,
    duration = 8,
    angle = 90,
    as = "span",
    delay = 0,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const animated = animate && !reduced;
  // Repeat the first color at the end so the pan loops seamlessly.
  const stops = colors.length > 0 ? [...colors, colors[0]] : defaultColors;
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={ref}
      data-state={animated ? "animated" : "static"}
      {...props}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, ${stops.join(", ")})`,
        animationDuration: `${duration}s`,
        animationDelay: delay ? `${delay}s` : undefined,
        ...style,
      }}
      className={cn(
        blockReset,
        "box-decoration-clone bg-clip-text text-transparent [background-size:300%_100%]",
        animated && "motion-safe:animate-pui-gradient-pan",
        className,
      )}
    >
      {children}
    </MotionTag>
  );
});
