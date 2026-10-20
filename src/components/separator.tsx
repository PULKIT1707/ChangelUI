"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { Orientation } from "../lib/types";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "horizontal". */
  orientation?: Orientation;
  /** true: role="none" (visual only). false: role="separator" + aria-orientation. Default true. */
  decorative?: boolean;
  /** Centered text such as "OR" (horizontal only). */
  label?: React.ReactNode;
}

/** Horizontal or vertical divider, optionally with a centered label (design 7.1 #10). */
export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { orientation = "horizontal", decorative = true, label, className, ...props },
  ref,
) {
  const a11y = decorative
    ? { role: "none" as const }
    : { role: "separator" as const, "aria-orientation": orientation };
  const withLabel = label !== undefined && label !== null && orientation === "horizontal";

  if (withLabel) {
    return (
      <div
        ref={ref}
        {...a11y}
        data-orientation={orientation}
        {...props}
        className={cn(
          blockReset,
          "flex w-full items-center gap-3 text-xs font-medium text-pui-muted-foreground",
          className,
        )}
      >
        <span aria-hidden="true" className={cn(blockReset, "h-px flex-1 bg-pui-border")} />
        <span className={cn(blockReset, "shrink-0")}>{label}</span>
        <span aria-hidden="true" className={cn(blockReset, "h-px flex-1 bg-pui-border")} />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      {...a11y}
      data-orientation={orientation}
      {...props}
      className={cn(
        blockReset,
        "shrink-0 bg-pui-border",
        orientation === "horizontal" ? "h-px w-full" : "min-h-4 w-px self-stretch",
        className,
      )}
    />
  );
});
