"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { hiddenInputClasses, useFormReset } from "../lib/form";
import { springs } from "../lib/motion";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Orientation, Size, Tone } from "../lib/types";

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Default "vertical". */
  orientation?: Orientation;
  /** Wrap arrow navigation. Default true. */
  loop?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Renders a hidden input for native form submission. */
  name?: string;
  /** Default "md". */
  size?: Size;
  /** Default "primary". */
  tone?: Tone;
}

export interface RadioGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "children"> {
  value: string;
  disabled?: boolean;
}

interface RadioGroupContextValue {
  value: string | undefined;
  select: (value: string) => void;
  disabled: boolean;
  size: Size;
  tone: Tone;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

const items: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };
const dots: Record<Size, string> = { sm: "size-1.5", md: "size-2", lg: "size-2.5" };

/** Single-choice group; arrow keys move focus and selection (design 7.1 #16). */
export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    orientation = "vertical",
    loop = true,
    disabled = false,
    required,
    name,
    size = "md",
    tone = "primary",
    className,
    onKeyDown,
    onFocus,
    children,
    ...props
  },
  ref,
) {
  const [value, setValue] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    // A reset to "no selection" (undefined) only updates uncontrolled state; the callback takes strings.
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);

  const { containerProps, value: rovingValue } = useRovingFocus({
    orientation,
    loop,
    selectedKey: value ?? null,
    onActivate: (key) => setValue(key),
  });

  useFormReset(localRef, () => setValue(defaultValue));

  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  React.useEffect(() => {
    if (!label && !labelledBy) devWarn("radio-group:label", "RadioGroup needs an aria-label or aria-labelledby.");
  }, [label, labelledBy]);

  const context = React.useMemo<RadioGroupContextValue>(
    () => ({ value, select: (next) => setValue(next), disabled, size, tone }),
    [value, setValue, disabled, size, tone],
  );

  return (
    <>
      <RovingFocusProvider value={rovingValue}>
        <RadioGroupContext.Provider value={context}>
          <div
            ref={mergedRef}
            role="radiogroup"
            aria-orientation={orientation}
            aria-required={required || undefined}
            aria-disabled={disabled || undefined}
            data-orientation={orientation}
            data-disabled={disabled ? "" : undefined}
            {...props}
            {...containerProps}
            tabIndex={containerProps.tabIndex}
            onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
            onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
            className={cn(
              blockReset,
              "flex gap-3",
              orientation === "vertical" ? "flex-col" : "flex-row flex-wrap items-center",
              toneClasses[tone],
              className,
            )}
          >
            {children}
          </div>
        </RadioGroupContext.Provider>
      </RovingFocusProvider>
      {name !== undefined ? (
        <input
          type="hidden"
          aria-hidden="true"
          tabIndex={-1}
          readOnly
          name={name}
          value={value ?? ""}
          className={cn(controlReset, hiddenInputClasses)}
        />
      ) : null}
    </>
  );
});

/** One radio button; label it with a wrapping <label> or htmlFor (design 7.1 #16). */
export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(function RadioGroupItem(
  { value, disabled: disabledProp, className, onClick, onFocus, ...props },
  ref,
) {
  const group = React.useContext(RadioGroupContext);
  if (!group) throw new Error("[changelui] RadioGroupItem must be used inside RadioGroup");
  const disabled = group.disabled || disabledProp === true;
  const checked = group.value === value;
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const roving = useRovingItem(value, { ref: localRef, disabled });

  return (
    <button
      ref={mergedRef}
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      {...props}
      tabIndex={roving.tabIndex}
      data-roving-item={roving["data-roving-item"]}
      data-key={roving["data-key"]}
      onFocus={composeEventHandlers(onFocus, roving.onFocus)}
      onClick={composeEventHandlers(onClick, () => group.select(value))}
      className={cn(
        controlReset,
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-pui-full border transition-colors duration-(--pui-duration-fast)",
        checked ? "border-(--pui-tone)" : "border-pui-input",
        focusRing,
        disabledStyles,
        items[group.size],
        className,
      )}
    >
      {/* initial={false}: the first render (server, hydration, client mount) shows the dot; selection changes animate. */}
      <AnimatePresence initial={false}>
        {checked ? (
          <motion.span
            key="dot"
            data-pui-radio-dot=""
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springs.bouncy}
            className={cn(blockReset, "block rounded-pui-full bg-(--pui-tone)", dots[group.size])}
          />
        ) : null}
      </AnimatePresence>
    </button>
  );
});
