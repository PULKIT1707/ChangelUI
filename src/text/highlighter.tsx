"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type HighlighterVariant = "highlight" | "underline" | "strike" | "box";

export interface HighlighterProps extends TextBaseProps {
  children: React.ReactNode;
  /** Default "highlight". */
  variant?: HighlighterVariant;
  /** Mark color. Default "var(--pui-highlight)". */
  color?: string;
  /** Line width in px (underline, strike, box). Default 2. */
  strokeWidth?: number;
  /** Seconds to draw. Default 0.6. */
  duration?: number;
}

/** Background mark geometry: [size at rest, position]. The width animates from 0% to 100%. */
function markGeometry(variant: Exclude<HighlighterVariant, "box">, strokeWidth: number) {
  if (variant === "highlight") return { height: "85%", position: "0 90%" };
  if (variant === "underline") return { height: `${strokeWidth}px`, position: "0 100%" };
  return { height: `${strokeWidth}px`, position: "0 55%" };
}

/** Hand-drawn style highlight, underline, strike or box around inline text (design 7.2 #41). */
export const Highlighter = React.forwardRef<HTMLElement, HighlighterProps>(function Highlighter(
  {
    children,
    variant = "highlight",
    color = "var(--pui-highlight)",
    strokeWidth = 2,
    duration = 0.6,
    as = "span",
    trigger = "inView",
    once = true,
    delay = 0,
    className,
    style,
    ...props
  },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const drawn = active || reduced;
  const transition = reduced ? { duration: 0 } : { duration, delay, ease: easings.out };
  const MotionTag = motionTagMap[as];

  // Plain text gets the C16 pattern (sr-only copy, decorative visual); rich children stay as-is.
  const isText = typeof children === "string" || typeof children === "number";
  const content = isText ? (
    <>
      <span className={cn(blockReset, "sr-only")}>{children}</span>
      <span aria-hidden="true" className={cn(blockReset, "relative")}>
        {children}
      </span>
    </>
  ) : (
    children
  );

  if (variant === "box") {
    return (
      <MotionTag
        ref={mergedRef}
        data-variant={variant}
        data-state={drawn ? "drawn" : "hidden"}
        {...props}
        style={style}
        className={cn(blockReset, "relative inline-block", className)}
      >
        {content}
        <svg
          aria-hidden="true"
          focusable="false"
          className={cn(
            blockReset,
            "pointer-events-none absolute -inset-x-1.5 -inset-y-1 block h-[calc(100%+0.5rem)] w-[calc(100%+0.75rem)] -rotate-1 overflow-visible",
          )}
        >
          <motion.rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="6"
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ stroke: color }}
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: drawn ? 1 : 0 }}
            transition={transition}
          />
        </svg>
      </MotionTag>
    );
  }

  const { height, position } = markGeometry(variant, strokeWidth);
  return (
    <MotionTag
      ref={mergedRef}
      data-variant={variant}
      data-state={drawn ? "drawn" : "hidden"}
      {...props}
      initial={{ backgroundSize: `${reduced ? 100 : 0}% ${height}` }}
      animate={{ backgroundSize: `${drawn ? 100 : 0}% ${height}` }}
      transition={transition}
      style={{
        backgroundImage: `linear-gradient(${color}, ${color})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: position,
        ...style,
      }}
      className={cn(blockReset, "box-decoration-clone rounded-[0.15em] px-[0.1em]", className)}
    >
      {content}
    </MotionTag>
  );
});
