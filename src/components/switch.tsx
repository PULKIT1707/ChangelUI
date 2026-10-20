"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { hiddenInputClasses, useAccessibleNameWarning, useFormReset } from "../lib/form";
import { springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange" | "defaultChecked"> {
  checked?: boolean;
  /** Default false. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Default "md". */
  size?: Size;
  /** Default "primary". */
  tone?: Tone;
  /** Renders a hidden checkbox input for native form submission. */
  name?: string;
  /** Submitted value when on. Default "on". */
  value?: string;
  required?: boolean;
  /** Content inside the thumb (for example an icon). */
  thumbIcon?: React.ReactNode;
}

const tracks: Record<Size, string> = { sm: "h-4 w-7", md: "h-5 w-9", lg: "h-6 w-11" };
const thumbs: Record<Size, string> = { sm: "size-3", md: "size-4", lg: "size-5" };
/** About 20% wider while pressed. */
const pressedThumbs: Record<Size, string> = { sm: "w-3.5", md: "w-5", lg: "w-6" };

/** On/off toggle with a spring-animated thumb (design 7.1 #14). */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    size = "md",
    tone = "primary",
    name,
    value = "on",
    required,
    thumbIcon,
    disabled,
    className,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
    ...props
  },
  ref,
) {
  const [checked, setChecked] = useControllableState({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
    name: "checked",
  });
  const [pressed, setPressed] = React.useState(false);
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);

  useFormReset(localRef, () => setChecked(defaultChecked));
  useAccessibleNameWarning(localRef, props, "switch:label", "Switch needs an aria-label, aria-labelledby or a <label>.");

  const state = checked ? "checked" : "unchecked";

  return (
    <>
      <button
        ref={mergedRef}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-required={required || undefined}
        data-state={state}
        data-size={size}
        data-tone={tone}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setChecked(!checked);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          setPressed(true);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          setPressed(false);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setPressed(false);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === " ") setPressed(true);
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          setPressed(false);
        }}
        className={cn(
          controlReset,
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-pui-full p-0.5 transition-colors duration-(--pui-duration-base)",
          checked ? "justify-end bg-(--pui-tone)" : "justify-start bg-pui-input",
          focusRing,
          disabledStyles,
          tracks[size],
          toneClasses[tone],
          className,
        )}
      >
        <motion.span
          layout
          transition={springs.snappy}
          data-state={state}
          className={cn(
            blockReset,
            "pointer-events-none flex items-center justify-center rounded-pui-full bg-pui-background text-pui-foreground shadow-pui-sm",
            thumbs[size],
            pressed && pressedThumbs[size],
          )}
        >
          {thumbIcon}
        </motion.span>
      </button>
      {name !== undefined ? (
        <input
          type="checkbox"
          aria-hidden="true"
          tabIndex={-1}
          readOnly
          name={name}
          value={value}
          checked={checked}
          required={required}
          disabled={disabled}
          className={cn(controlReset, hiddenInputClasses)}
        />
      ) : null}
    </>
  );
});
