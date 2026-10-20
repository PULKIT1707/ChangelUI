"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { hiddenInputClasses, useAccessibleNameWarning, useFormReset } from "../lib/form";
import { springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange" | "defaultChecked"> {
  checked?: CheckedState;
  /** Default false. */
  defaultChecked?: CheckedState;
  /** A user action always yields a boolean (indeterminate -> true). */
  onCheckedChange?: (checked: boolean) => void;
  /** Default "md". */
  size?: Size;
  /** Default "primary". */
  tone?: Tone;
  /** Renders a hidden checkbox input for native form submission. */
  name?: string;
  /** Submitted value when checked. Default "on". */
  value?: string;
  required?: boolean;
}

const boxes: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };
const marks: Record<Size, string> = { sm: "size-2.5", md: "size-3", lg: "size-3.5" };

/** Tri-state checkbox with a drawn check mark (design 7.1 #15). */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    size = "md",
    tone = "primary",
    name,
    value = "on",
    required,
    disabled,
    className,
    onClick,
    onKeyDown,
    ...props
  },
  ref,
) {
  const [checked, setChecked] = useControllableState<CheckedState>({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange ? (next) => onCheckedChange(next === true) : undefined,
    name: "checked",
  });
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);

  useFormReset(localRef, () => setChecked(defaultChecked));
  useAccessibleNameWarning(localRef, props, "checkbox:label", "Checkbox needs an aria-label, aria-labelledby or a <label>.");

  const indeterminate = checked === "indeterminate";
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "unchecked";
  const on = checked !== false;

  return (
    <>
      <button
        ref={mergedRef}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        aria-required={required || undefined}
        data-state={state}
        data-size={size}
        data-tone={tone}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setChecked(indeterminate ? true : !checked);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Native checkboxes do not toggle on Enter.
          if (event.key === "Enter") event.preventDefault();
        }}
        className={cn(
          controlReset,
          "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-pui-sm border transition-colors duration-(--pui-duration-fast)",
          on ? "border-(--pui-tone) bg-(--pui-tone) text-(--pui-tone-fg)" : "border-pui-input bg-transparent",
          focusRing,
          disabledStyles,
          boxes[size],
          toneClasses[tone],
          className,
        )}
      >
        {/* initial={false}: the first render (server, hydration, client mount) shows the final state; toggles animate. */}
        <AnimatePresence initial={false}>
          {checked === true ? (
            <svg
              key="check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
              data-pui-check=""
              className={cn(blockReset, "block shrink-0", marks[size])}
            >
              <motion.path
                d="M20 6 9 17l-5-5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </svg>
          ) : null}
          {indeterminate ? (
            <motion.span
              key="indeterminate"
              data-pui-indeterminate=""
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={springs.snappy}
              className={cn(blockReset, "block h-0.5 w-1/2 rounded-pui-full bg-current")}
            />
          ) : null}
        </AnimatePresence>
      </button>
      {name !== undefined ? (
        <input
          type="checkbox"
          aria-hidden="true"
          tabIndex={-1}
          readOnly
          name={name}
          value={value}
          checked={checked === true}
          required={required}
          disabled={disabled}
          className={cn(controlReset, hiddenInputClasses)}
        />
      ) : null}
    </>
  );
});
