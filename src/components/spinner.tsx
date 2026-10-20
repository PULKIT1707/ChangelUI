"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SpinnerVariant = "ring" | "dots" | "bars" | "pulse";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Default "ring". */
  variant?: SpinnerVariant;
  /** 16 / 20 / 24 px. Default "md". */
  size?: Size;
  /** Screen-reader text (role="status"). Default "Loading". */
  label?: string;
  /** true: aria-hidden and no role (for use inside a labelled control). Default false. */
  decorative?: boolean;
}

const sizes: Record<Size, string> = { sm: "size-4", md: "size-5", lg: "size-6" };
const dotDelays = ["[animation-delay:-0.32s]", "[animation-delay:-0.16s]", "[animation-delay:0s]"] as const;
const barDelays = ["[animation-delay:-0.24s]", "[animation-delay:-0.12s]", "[animation-delay:0s]"] as const;
/** Spinners keep animating under reduced motion (essential feedback), just slower (C15). */
const slow = "[animation-duration:1.5s]";

/** Loading indicator in currentColor with four variants (design 7.1 #11). */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { variant = "ring", size = "md", label = "Loading", decorative = false, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const speed = cn("motion-reduce:[animation-duration:1.5s]", reduced && slow);

  let visual: React.ReactNode;
  if (variant === "dots") {
    visual = dotDelays.map((delay) => (
      <span
        key={delay}
        className={cn(blockReset, "block size-1/4 rounded-pui-full bg-current animate-pui-dot-bounce", delay, speed)}
      />
    ));
  } else if (variant === "bars") {
    visual = barDelays.map((delay) => (
      <span
        key={delay}
        className={cn(blockReset, "block h-full w-1/6 rounded-pui-sm bg-current animate-pui-bar-scale", delay, speed)}
      />
    ));
  } else if (variant === "pulse") {
    visual = (
      <>
        <span className={cn(blockReset, "absolute inset-0 rounded-pui-full bg-current opacity-60 animate-ping", speed)} />
        <span className={cn(blockReset, "relative block size-1/2 rounded-pui-full bg-current")} />
      </>
    );
  } else {
    visual = (
      <span
        className={cn(
          blockReset,
          "block size-full rounded-pui-full border-2 border-current border-r-transparent animate-spin",
          speed,
        )}
      />
    );
  }

  return (
    <span
      ref={ref}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative ? true : undefined}
      data-variant={variant}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "relative inline-flex shrink-0 items-center justify-center gap-[12%] text-current",
        sizes[size],
        className,
      )}
    >
      {visual}
      {decorative ? null : <span className={cn(blockReset, "sr-only")}>{label}</span>}
    </span>
  );
});
