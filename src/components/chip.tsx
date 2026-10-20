"use client";

import { motion, type Variants } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { CheckIcon, XIcon } from "../lib/icons";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";

export type ChipVariant = "solid" | "soft" | "outline";

export interface ChipProps extends MotionSafeHTMLProps<HTMLElement> {
  /** Default "soft". */
  variant?: ChipVariant;
  /** Default "neutral". */
  tone?: Tone;
  /** Default "md". */
  size?: "sm" | "md";
  icon?: React.ReactNode;
  /** Any of selected / defaultSelected / onSelectedChange makes the chip a toggle. */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Renders a trailing remove button; Backspace or Delete on the chip's buttons also calls it. */
  onRemove?: () => void;
  /** Accessible name of the remove button. Default "Remove" (pass e.g. "Remove React"). */
  removeLabel?: string;
  disabled?: boolean;
}

const variants: Record<ChipVariant, string> = {
  solid: "bg-(--pui-tone) text-(--pui-tone-fg)",
  soft: "bg-(--pui-tone)/12 text-(--pui-tone-text)",
  outline: "border border-(--pui-tone)/40 text-(--pui-tone-text)",
};
const selectedClasses = "border-transparent bg-(--pui-tone) text-(--pui-tone-fg)";

const sizes = { sm: "h-6 gap-1 px-2.5 text-xs", md: "h-8 gap-1.5 px-3 text-sm" } as const;
const removablePad = { sm: "pr-1", md: "pr-1.5" } as const;
const togglePad = { sm: "gap-1 pl-2.5 pr-1", md: "gap-1.5 pl-3 pr-1.5" } as const;
const iconSizes = { sm: "size-3", md: "size-3.5" } as const;
/** The remove button is a 24x24 target (WCAG 2.5.8); negative margins keep the chip's size. */
const removeMargins = { sm: "-my-0 -me-1", md: "-my-1 -me-1" } as const;

/** Layout + exit variants so a list wrapped in AnimatePresence animates additions and removals. */
const chipMotion: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

const base =
  "inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-pui-full font-medium leading-none transition-colors duration-(--pui-duration-fast)";

/**
 * Compact tag: static, selectable (toggle), removable, or both (design 7.1 #7). A <button> never
 * contains another <button>: selectable + removable renders a role="group" span with two sibling buttons.
 */
export const Chip = React.forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    variant = "soft",
    tone = "neutral",
    size = "md",
    icon,
    selected: selectedProp,
    defaultSelected,
    onSelectedChange,
    onRemove,
    removeLabel = "Remove",
    disabled = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const selectable = selectedProp !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined;
  const removable = onRemove !== undefined;
  const [selected, setSelected] = useControllableState({
    value: selectedProp,
    defaultValue: defaultSelected ?? false,
    onChange: onSelectedChange,
    name: "selected",
  });

  const onRemoveKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!removable || disabled) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onRemove();
    }
  };

  const state = selectable ? (selected ? "on" : "off") : undefined;
  const tint = selectable && selected ? selectedClasses : variants[variant];
  // Server HTML and hydration render the visible state; only client mounts pop in.
  const isClient = useIsClient();
  const motionProps = {
    layout: true,
    variants: chipMotion,
    initial: isClient ? "hidden" : false,
    animate: "visible",
    exit: "hidden",
  } as const;
  const common = {
    "data-variant": variant,
    "data-tone": tone,
    "data-size": size,
    "data-state": state,
    "data-disabled": disabled ? "" : undefined,
  };

  const leading = (
    <>
      {selectable && selected ? <CheckIcon className={iconSizes[size]} /> : null}
      {icon ? <span className={cn(blockReset, "inline-flex shrink-0", iconSizes[size])}>{icon}</span> : null}
    </>
  );

  const removeButton = removable ? (
    <button
      type="button"
      aria-label={removeLabel}
      disabled={disabled}
      onClick={() => onRemove()}
      onKeyDown={onRemoveKey}
      className={cn(
        controlReset,
        "group/remove inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-pui-full disabled:pointer-events-none",
        removeMargins[size],
        focusRing,
      )}
    >
      <span
        aria-hidden
        className={cn(
          blockReset,
          "inline-flex rounded-pui-full p-0.5 opacity-70 transition-opacity group-hover/remove:bg-current/15 group-hover/remove:opacity-100",
        )}
      >
        <XIcon className={iconSizes[size]} />
      </span>
    </button>
  ) : null;

  if (selectable && !removable) {
    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        {...common}
        {...motionProps}
        {...props}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) setSelected(!selected);
        }}
        className={cn(
          controlReset,
          base,
          "cursor-pointer disabled:pointer-events-none disabled:opacity-50",
          focusRing,
          sizes[size],
          tint,
          toneClasses[tone],
          className,
        )}
      >
        {leading}
        {children}
      </motion.button>
    );
  }

  if (selectable && removable) {
    return (
      <motion.span
        ref={ref}
        role="group"
        {...common}
        {...motionProps}
        {...props}
        className={cn(
          blockReset,
          base,
          disabled && "pointer-events-none opacity-50",
          sizes[size],
          "gap-0.5 px-0",
          removablePad[size],
          tint,
          toneClasses[tone],
          className,
        )}
      >
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => setSelected(!selected)}
          onKeyDown={onRemoveKey}
          className={cn(
            controlReset,
            "inline-flex h-full cursor-pointer items-center rounded-pui-full",
            focusRing,
            togglePad[size],
          )}
        >
          {leading}
          {children}
        </button>
        {removeButton}
      </motion.span>
    );
  }

  return (
    <motion.span
      ref={ref}
      {...common}
      {...motionProps}
      {...props}
      className={cn(
        blockReset,
        base,
        disabled && "opacity-50",
        sizes[size],
        removable && removablePad[size],
        tint,
        toneClasses[tone],
        className,
      )}
    >
      {leading}
      {children}
      {removeButton}
    </motion.span>
  );
});
