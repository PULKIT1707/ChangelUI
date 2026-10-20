"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { springs } from "../lib/motion";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { Size } from "../lib/types";

export interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Default "md". */
  size?: Size;
  /** Stretch to the container; items share the width. Default false. */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Wrap arrow navigation. Default true. */
  loop?: boolean;
}

export interface SegmentedControlItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedContextValue {
  id: string;
  value: string | undefined;
  select: (value: string) => void;
  disabled: boolean;
  size: Size;
  fullWidth: boolean;
}

const SegmentedContext = React.createContext<SegmentedContextValue | null>(null);

const itemSizes: Record<Size, string> = {
  sm: "h-6 gap-1 px-2.5 text-xs",
  md: "h-7 gap-1.5 px-3 text-sm",
  lg: "h-9 gap-2 px-4 text-base",
};

/**
 * Pill-style single choice with a sliding indicator (design 7.1 #20). Radiogroup semantics with
 * selection following focus, like RadioGroup (horizontal).
 */
export const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(function SegmentedControl(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    size = "md",
    fullWidth = false,
    disabled = false,
    loop = true,
    className,
    onKeyDown,
    onFocus,
    children,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const [value, setValue] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const { containerProps, value: rovingValue } = useRovingFocus({
    orientation: "horizontal",
    loop,
    selectedKey: value ?? null,
    onActivate: (key) => setValue(key),
  });

  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  React.useEffect(() => {
    if (!label && !labelledBy) {
      devWarn("segmented-control:label", "SegmentedControl needs an aria-label or aria-labelledby.");
    }
  }, [label, labelledBy]);

  const context = React.useMemo<SegmentedContextValue>(
    () => ({ id, value, select: (next) => setValue(next), disabled, size, fullWidth }),
    [id, value, setValue, disabled, size, fullWidth],
  );

  return (
    <RovingFocusProvider value={rovingValue}>
      <SegmentedContext.Provider value={context}>
        <div
          ref={ref}
          role="radiogroup"
          aria-orientation="horizontal"
          aria-disabled={disabled || undefined}
          data-size={size}
          data-disabled={disabled ? "" : undefined}
          {...props}
          {...containerProps}
          tabIndex={containerProps.tabIndex}
          onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
          onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
          className={cn(
            blockReset,
            "items-center gap-0.5 rounded-pui-md bg-pui-muted p-1",
            fullWidth ? "flex w-full" : "inline-flex",
            focusRing,
            className,
          )}
        >
          {children}
        </div>
      </SegmentedContext.Provider>
    </RovingFocusProvider>
  );
});

export const SegmentedControlItem = React.forwardRef<HTMLButtonElement, SegmentedControlItemProps>(
  function SegmentedControlItem({ value, icon, disabled: disabledProp, className, onClick, onFocus, children, ...props }, ref) {
    const group = React.useContext(SegmentedContext);
    if (!group) throw new Error("[changelui] SegmentedControlItem must be used inside SegmentedControl");
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
          "relative isolate inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-pui-sm font-medium transition-colors duration-(--pui-duration-fast)",
          checked ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
          focusRing,
          disabledStyles,
          itemSizes[group.size],
          group.fullWidth && "flex-1",
          className,
        )}
      >
        {checked ? (
          <motion.span
            layoutId={`${group.id}-indicator`}
            transition={springs.snappy}
            data-pui-segment-indicator=""
            aria-hidden="true"
            className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-sm bg-pui-background shadow-pui-sm")}
          />
        ) : null}
        {icon ? <span className={cn(blockReset, "inline-flex shrink-0")}>{icon}</span> : null}
        {children}
      </button>
    );
  },
);
