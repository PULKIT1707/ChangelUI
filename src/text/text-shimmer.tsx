"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface TextShimmerProps extends Omit<TextBaseProps, "trigger" | "once"> {
  children: string;
  /** Seconds per sweep. Default 2. */
  duration?: number;
  /** Highlight band width in px per character. Default 2. */
  spread?: number;
}

const shimmer =
  "bg-clip-text text-transparent [background-repeat:no-repeat,padding-box] [background-size:250%_100%,auto] [background-image:linear-gradient(90deg,transparent_calc(50%_-_var(--pui-text-shimmer-spread)),var(--pui-foreground),transparent_calc(50%_+_var(--pui-text-shimmer-spread))),linear-gradient(var(--pui-muted-foreground),var(--pui-muted-foreground))] motion-safe:animate-pui-text-shimmer motion-reduce:bg-none motion-reduce:text-pui-muted-foreground";

/** Text with a light band sweeping across it (design 7.2 #35). */
export const TextShimmer = React.forwardRef<HTMLElement, TextShimmerProps>(function TextShimmer(
  { children, duration = 2, spread = 2, as = "span", delay = 0, className, style, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const vars = {
    "--pui-text-shimmer-spread": `${children.length * spread}px`,
    animationDuration: `${duration}s`,
    animationDelay: delay ? `${delay}s` : undefined,
  } as React.CSSProperties;
  const MotionTag = motionTagMap[as];

  return (
    <MotionTag
      ref={ref}
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(blockReset, "inline-block", reduced ? "text-pui-muted-foreground" : shimmer, className)}
    >
      {children}
    </MotionTag>
  );
});
