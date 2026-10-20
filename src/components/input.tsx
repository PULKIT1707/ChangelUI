"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Default "md". */
  size?: Size;
  /** aria-invalid + danger boundary. */
  invalid?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Classes for the wrapper, which renders only when an icon is present. */
  wrapperClassName?: string;
}

const heights: Record<Size, string> = { sm: "h-8 px-2.5", md: "h-9 px-3", lg: "h-11 px-3.5" };
const leadingPad: Record<Size, string> = { sm: "ps-8", md: "ps-9", lg: "ps-10" };
const trailingPad: Record<Size, string> = { sm: "pe-8", md: "pe-9", lg: "pe-10" };
const iconSlot: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };
const iconInset: Record<Size, { start: string; end: string }> = {
  sm: { start: "start-2.5", end: "end-2.5" },
  md: { start: "start-3", end: "end-3" },
  lg: { start: "start-3.5", end: "end-3.5" },
};

/** Text input; ref and className go to the native <input> (design 7.1 #17). */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid = false, leadingIcon, trailingIcon, wrapperClassName, className, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      {...props}
      className={cn(
        controlReset,
        fieldClasses,
        heights[size],
        textSize[size],
        invalid && invalidClasses,
        leadingIcon ? leadingPad[size] : null,
        trailingIcon ? trailingPad[size] : null,
        className,
      )}
    />
  );

  if (!leadingIcon && !trailingIcon) return control;

  return (
    <div className={cn(blockReset, "relative flex w-full items-center", wrapperClassName)}>
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute inline-flex items-center justify-center text-pui-muted-foreground",
            iconSlot[size],
            iconInset[size].start,
          )}
        >
          {leadingIcon}
        </span>
      ) : null}
      {control}
      {trailingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute inline-flex items-center justify-center text-pui-muted-foreground",
            iconSlot[size],
            iconInset[size].end,
          )}
        >
          {trailingIcon}
        </span>
      ) : null}
    </div>
  );
});
