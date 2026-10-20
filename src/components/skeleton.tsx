"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SkeletonAnimation = "shimmer" | "pulse" | "none";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "rect". */
  shape?: "rect" | "circle" | "text";
  /** Text lines (shape "text" only); the last line is 60% wide. Default 1. */
  lines?: number;
  /** Default "shimmer"; reduced motion gives "none". */
  animation?: SkeletonAnimation;
}

const animations: Record<SkeletonAnimation, string> = {
  shimmer:
    "bg-[linear-gradient(90deg,var(--pui-skeleton)_0%,var(--pui-skeleton-highlight)_50%,var(--pui-skeleton)_100%)] bg-[length:200%_100%] motion-safe:animate-pui-skeleton-shimmer",
  pulse: "motion-safe:animate-pulse",
  none: "",
};
const shapes = {
  rect: "rounded-pui-md",
  circle: "aspect-square rounded-pui-full",
  text: "h-4 w-full rounded-pui-sm",
} as const;

/**
 * Loading placeholder. It is aria-hidden: set aria-busy on the region that is loading (design 7.1 #12).
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { shape = "rect", lines = 1, animation = "shimmer", className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const effective: SkeletonAnimation = reduced ? "none" : animation;
  const count = Math.max(1, Math.floor(lines));

  if (shape === "text" && count > 1) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-shape={shape}
        data-animation={effective}
        {...props}
        className={cn(blockReset, "flex w-full flex-col gap-2", className)}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={cn(
              blockReset,
              "bg-pui-skeleton",
              shapes.text,
              animations[effective],
              i === count - 1 && "w-3/5",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-shape={shape}
      data-animation={effective}
      {...props}
      className={cn(blockReset, "bg-pui-skeleton", shapes[shape], animations[effective], className)}
    />
  );
});
