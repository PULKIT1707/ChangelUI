"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ring width in px. Default 1. */
  borderWidth?: number;
  /** Seconds per cycle. Default 14. */
  duration?: number;
  /** Default the two --pui-beam-* tokens. */
  colors?: string[];
}

const defaultColors = ["var(--pui-beam-from)", "var(--pui-beam-to)"];

/** Animated radial-gradient ring masked to the parent's border (design 7.3 #46). */
export const ShineBorder = React.forwardRef<HTMLDivElement, ShineBorderProps>(function ShineBorder(
  { borderWidth = 1, duration = 14, colors = defaultColors, style, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const vars = {
    "--pui-shine-width": `${borderWidth}px`,
    "--pui-shine-duration": `${duration}s`,
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-state={reduced ? "static" : "animated"}
      {...props}
      style={{
        ...vars,
        backgroundImage: `radial-gradient(transparent, transparent, ${colors.join(", ")}, transparent, transparent)`,
        ...style,
      }}
      className={cn(
        blockReset,
        "pointer-events-none absolute inset-0 size-full rounded-[inherit] p-(--pui-shine-width) [background-size:300%_300%]",
        "[mask-image:linear-gradient(black,black),linear-gradient(black,black)] [mask-clip:content-box,border-box] [-webkit-mask-composite:xor] [mask-composite:exclude]",
        !reduced && "motion-safe:animate-pui-shine",
        className,
      )}
    />
  );
});
