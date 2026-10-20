"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default "md". */
  size?: Size;
  /** Shimmer color. Default "var(--pui-shimmer)". */
  shimmerColor?: string;
  /** Width of the shimmering edge. Default "0.05em". */
  shimmerSize?: string;
  /** Button background. Default "var(--pui-shimmer-bg)" (text uses --pui-shimmer-fg). */
  background?: string;
  /** Corner radius. Default "9999px". */
  radius?: string;
  /** Seconds per sweep. Default 3. */
  duration?: number;
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-6 text-sm",
  lg: "h-12 px-8 text-base",
};

/** Button with a conic shimmer travelling around its perimeter (design 7.1 #3, magicui-style). */
export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(function ShimmerButton(
  {
    size = "md",
    shimmerColor = "var(--pui-shimmer)",
    shimmerSize = "0.05em",
    background = "var(--pui-shimmer-bg)",
    radius = "9999px",
    duration = 3,
    type,
    style,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const vars = {
    "--pui-shimmer-color": shimmerColor,
    "--pui-shimmer-size": shimmerSize,
    "--pui-shimmer-background": background,
    "--pui-shimmer-radius": radius,
    "--pui-shimmer-duration": `${duration}s`,
  } as React.CSSProperties;

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      data-size={size}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(
        controlReset,
        "group relative isolate z-0 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium",
        "rounded-(--pui-shimmer-radius) border border-(--pui-shimmer-fg)/10 bg-(--pui-shimmer-background) text-pui-shimmer-fg",
        "transform-gpu transition-transform duration-(--pui-duration-slow) ease-pui-out active:translate-y-px",
        focusRing,
        disabledStyles,
        sizes[size],
        className,
      )}
    >
      {reduced ? null : (
        <span
          aria-hidden="true"
          data-pui-shimmer=""
          className={cn(blockReset, "absolute inset-0 -z-30 overflow-visible blur-[2px] [container-type:size] motion-reduce:hidden")}
        >
          <span
            className={cn(
              blockReset,
              "absolute inset-0 block aspect-square h-[100cqh] animate-pui-shimmer-slide [border-radius:0] [mask:none]",
            )}
          >
            <span
              className={cn(
                blockReset,
                "absolute -inset-full block w-auto rotate-0 animate-pui-spin-around [translate:0_0]",
                "[background:conic-gradient(from_225deg,transparent_0,var(--pui-shimmer-color)_90deg,transparent_90deg)]",
              )}
            />
          </span>
        </span>
      )}
      {children}
      <span
        aria-hidden="true"
        className={cn(
          blockReset,
          "pointer-events-none absolute inset-0 block size-full rounded-(--pui-shimmer-radius)",
          "shadow-[inset_0_-8px_10px_color-mix(in_oklab,var(--pui-shimmer-fg)_12%,transparent)]",
          "transform-gpu transition-shadow duration-(--pui-duration-slow) ease-pui-out",
          "group-hover:shadow-[inset_0_-6px_10px_color-mix(in_oklab,var(--pui-shimmer-fg)_25%,transparent)]",
          "group-active:shadow-[inset_0_-10px_10px_color-mix(in_oklab,var(--pui-shimmer-fg)_25%,transparent)]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          blockReset,
          "absolute -z-20 block rounded-(--pui-shimmer-radius) bg-(--pui-shimmer-background) [inset:var(--pui-shimmer-size)]",
        )}
      />
    </button>
  );
});
