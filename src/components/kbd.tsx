"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Default "sm". */
  size?: "sm" | "md";
}

const sizes = {
  sm: "h-5 min-w-5 px-1 text-[0.6875rem]",
  md: "h-6 min-w-6 px-1.5 text-xs",
} as const;

/** Keyboard key hint. Platform-specific symbols are the caller's job (design 7.1 #9). */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(function Kbd({ size = "sm", className, ...props }, ref) {
  return (
    <kbd
      ref={ref}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "inline-flex select-none items-center justify-center gap-0.5 rounded-pui-sm border border-b-2 border-pui-border bg-pui-muted font-mono font-medium leading-none text-pui-muted-foreground",
        sizes[size],
        className,
      )}
    />
  );
});
