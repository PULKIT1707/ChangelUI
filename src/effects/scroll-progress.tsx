"use client";

import { motion, useScroll, useSpring } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ScrollProgressProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Scroll container to track. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** Default "top". */
  position?: "top" | "bottom";
  /** Bar height in px. Default 3. */
  thickness?: number;
  /** true: fixed to the viewport; false: sticky at the edge of the container. Default true. */
  fixed?: boolean;
  /** Smooth the bar with a spring. Default true. */
  spring?: boolean;
}

const placement = {
  fixed: { top: "fixed inset-x-0 top-0", bottom: "fixed inset-x-0 bottom-0" },
  sticky: { top: "sticky inset-x-0 top-0", bottom: "sticky inset-x-0 bottom-0" },
} as const;

/** Reading progress bar driven by scroll position (design 7.3 #50). */
export const ScrollProgress = React.forwardRef<HTMLDivElement, ScrollProgressProps>(function ScrollProgress(
  { container, position = "top", thickness = 3, fixed = true, spring = true, style, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll(container ? { container } : undefined);
  const smooth = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const scaleX = spring && !reduced ? smooth : scrollYProgress;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      data-position={position}
      {...props}
      style={{ scaleX, height: thickness, ...style }}
      className={cn(
        blockReset,
        "z-(--pui-z-overlay) origin-left bg-linear-to-r from-pui-beam-from to-pui-beam-to",
        placement[fixed ? "fixed" : "sticky"][position],
        className,
      )}
    />
  );
});
