"use client";
import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses, variantClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "md". */
  size?: Size;
  /** Danger border and ring, and aria-invalid on the control. */
  invalid?: boolean;
  /** Disables the control and every InputGroupButton inside. */
  disabled?: boolean;
}

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Where the addon sits, whatever its place in the markup. Default "inline-start". */
  align?: InputGroupAddonAlign;
}

export type InputGroupInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">;

export interface InputGroupTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with the content up to this many px. Default 192. */
  maxHeight?: number;
}

type MotionConflicts = "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration";

export interface InputGroupButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, MotionConflicts> {
  /** Default "ghost". */
  variant?: "ghost" | "soft" | "solid" | "outline";
  /** Default "neutral" ("primary" for solid). */
  tone?: Tone;
  /** "xs" is a compact text button, "icon" a square one. Default "xs". */
  size?: "xs" | "sm" | "icon";
}

export type InputGroupTextProps = React.HTMLAttributes<HTMLSpanElement>;

interface InputGroupContextValue {
  size: Size;
  invalid: boolean;
  disabled: boolean;
}

const InputGroupContext = React.createContext<InputGroupContextValue>({ size: "md", invalid: false, disabled: false });

const CONTROL = "[data-slot=input-group-control]";
const INTERACTIVE = "button, a, input, select, textarea, [role=button], [role=combobox], [tabindex]";

const rootSize: Record<Size, string> = {
  sm: "min-h-8 gap-x-1.5 px-2.5 text-xs",
  md: "min-h-9 gap-x-2 px-3 text-sm",
  lg: "min-h-11 gap-x-2.5 px-3.5 text-base",
};
const controlHeight: Record<Size, string> = { sm: "h-8", md: "h-9", lg: "h-11" };

const order: Record<InputGroupAddonAlign, string> = {
  "block-start": "order-[-2] basis-full pt-2 pb-1",
  "inline-start": "order-[-1]",
  "inline-end": "order-1",
  "block-end": "order-2 basis-full pt-1 pb-2",
};

/**
 * One field built from parts: text, icons, buttons, keyboard hints or selects on either side
 * (inline) or above and below (block), sharing a single border and focus ring. Addons keep their
 * place whatever the markup order, clicking addon text focuses the control, and size, invalid and
 * disabled flow down from the group. The ref and props go to the group element.
 */
export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  { size = "md", invalid = false, disabled = false, className, children, ...props },
  ref,
) {
  const value = React.useMemo(() => ({ size, invalid, disabled }), [size, invalid, disabled]);
  return (
    <InputGroupContext.Provider value={value}>
      <div
        ref={ref}
        role="group"
        data-slot="input-group"
        data-size={size}
        data-invalid={invalid ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        {...props}
        className={cn(
          blockReset,
          "relative flex w-full min-w-0 flex-wrap items-center rounded-pui-md border border-pui-input bg-transparent text-pui-foreground shadow-pui-xs",
          "transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
          "has-[[data-slot=input-group-control]:focus-visible]:border-pui-ring has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
          invalid &&
            "border-pui-danger has-[[data-slot=input-group-control]:focus-visible]:border-pui-danger has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-danger)_25%,transparent)]",
          disabled && "cursor-not-allowed opacity-50",
          rootSize[size],
          className,
        )}
      >
        {children}
      </div>
    </InputGroupContext.Provider>
  );
});

/** A slot beside, above or below the control. Pointer-down on its non-interactive parts focuses the control. */
export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(function InputGroupAddon(
  { align = "inline-start", className, onMouseDown, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      // A layout slot: pointer-down only forwards focus to the control, which is already in the tab order.
      role="presentation"
      data-slot="input-group-addon"
      data-align={align}
      {...props}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (event.defaultPrevented) return;
        const target = event.target as HTMLElement;
        if (target.closest(INTERACTIVE)) return;
        const control = event.currentTarget.closest("[data-slot=input-group]")?.querySelector<HTMLElement>(CONTROL);
        if (!control) return;
        event.preventDefault();
        control.focus();
      }}
      className={cn(
        blockReset,
        "flex shrink-0 cursor-text select-none items-center gap-1.5 text-pui-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        order[align],
        align.startsWith("block") && "w-full",
        className,
      )}
    />
  );
});

/** The text control inside an InputGroup; ref and props go to the native input. */
export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(function InputGroupInput(
  { className, disabled, ...props },
  ref,
) {
  const group = React.useContext(InputGroupContext);
  return (
    <input
      ref={ref}
      data-slot="input-group-control"
      aria-invalid={group.invalid || props["aria-invalid"] || undefined}
      disabled={disabled ?? group.disabled}
      {...props}
      className={cn(
        controlReset,
        "order-0 w-0 min-w-0 flex-1 text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground disabled:cursor-not-allowed",
        controlHeight[group.size],
        className,
      )}
    />
  );
});

/** A textarea that grows with its content; pair it with block addons for toolbars and counters. */
export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(function InputGroupTextarea(
  { className, disabled, maxHeight = 192, rows = 2, style, ...props },
  ref,
) {
  const group = React.useContext(InputGroupContext);
  return (
    <textarea
      ref={ref}
      data-slot="input-group-control"
      rows={rows}
      aria-invalid={group.invalid || props["aria-invalid"] || undefined}
      disabled={disabled ?? group.disabled}
      {...props}
      style={{ maxHeight, ...style }}
      className={cn(
        controlReset,
        "order-0 block w-full min-w-0 flex-1 basis-full resize-none py-2 text-pui-foreground outline-hidden [field-sizing:content] placeholder:text-pui-muted-foreground disabled:cursor-not-allowed",
        className,
      )}
    />
  );
});

const buttonSize = {
  xs: "h-6 gap-1 rounded-pui-sm px-2 text-xs [&_svg]:size-3.5",
  sm: "h-7 gap-1.5 rounded-pui-md px-2.5 text-xs [&_svg]:size-3.5",
  icon: "size-7 rounded-pui-md p-0 [&_svg]:size-4",
} as const;

/** A compact button sized to sit inside the field. Presses spring; disabled follows the group. */
export const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(function InputGroupButton(
  { variant = "ghost", tone, size = "xs", type = "button", disabled, className, ...props },
  ref,
) {
  const group = React.useContext(InputGroupContext);
  const reduced = usePrefersReducedMotion();
  const resolvedTone = tone ?? (variant === "solid" ? "primary" : "neutral");
  const isDisabled = disabled ?? group.disabled;
  return (
    <motion.button
      ref={ref}
      type={type}
      data-slot="input-group-button"
      disabled={isDisabled}
      whileTap={reduced || isDisabled ? undefined : { scale: 0.92 }}
      transition={springs.press}
      {...props}
      className={cn(
        controlReset,
        focusRing,
        "inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,color,box-shadow] duration-(--pui-duration-fast)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        toneClasses[resolvedTone],
        variantClasses[variant],
        variant === "ghost" && resolvedTone === "neutral" && "text-pui-muted-foreground hover:text-pui-foreground",
        buttonSize[size],
        className,
      )}
    />
  );
});

/** Muted inline text or icon for an addon: units, prefixes, counters. */
export const InputGroupText = React.forwardRef<HTMLSpanElement, InputGroupTextProps>(function InputGroupText(
  { className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      {...props}
      className={cn(blockReset, "inline-flex items-center gap-1.5 whitespace-nowrap text-pui-muted-foreground [&_svg]:size-4", className)}
    />
  );
});
