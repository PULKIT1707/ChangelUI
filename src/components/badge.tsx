"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type BadgeVariant = "solid" | "soft" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Default "soft". */
  variant?: BadgeVariant;
  /** Default "neutral". */
  tone?: Tone;
  /** Default "sm". */
  size?: "sm" | "md";
  /** Leading status dot. */
  dot?: boolean;
  /** The dot pings (motion-safe only). */
  pulse?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  solid: "bg-(--pui-tone) text-(--pui-tone-fg)",
  soft: "bg-(--pui-tone)/12 text-(--pui-tone-text)",
  outline: "border border-(--pui-tone)/40 text-(--pui-tone-text)",
};

const sizes = {
  sm: "h-5 gap-1 px-2 text-xs",
  md: "h-6 gap-1.5 px-2.5 text-sm",
} as const;

/** Small status label (design 7.1 #6). */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "soft", tone = "neutral", size = "sm", dot = false, pulse = false, className, children, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const dotColor = variant === "solid" ? "bg-current" : "bg-(--pui-tone)";
  return (
    <span
      ref={ref}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-pui-full font-medium leading-none",
        sizes[size],
        variants[variant],
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden="true" className={cn(blockReset, "relative inline-flex size-1.5 shrink-0")}>
          {pulse && !reduced ? (
            <span
              data-pui-pulse=""
              className={cn(blockReset, "absolute inset-0 rounded-pui-full opacity-75 motion-safe:animate-ping", dotColor)}
            />
          ) : null}
          <span className={cn(blockReset, "relative inline-flex size-1.5 rounded-pui-full", dotColor)} />
        </span>
      ) : null}
      {children}
    </span>
  );
});
