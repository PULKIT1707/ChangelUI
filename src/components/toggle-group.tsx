"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { toIdPart } from "../lib/ids";
import { easings, springs } from "../lib/motion";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { Orientation, Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type ToggleVariant = "soft" | "outline" | "ghost";

export interface ToggleGroupBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Default "horizontal". */
  orientation?: Orientation;
  /** Default "md". */
  size?: Size;
  /** soft: muted track (default); outline: bordered with a tinted pill; ghost: no track. */
  variant?: ToggleVariant;
  disabled?: boolean;
  /** Arrow keys wrap. Default true. */
  loop?: boolean;
  /** Stretch items to fill the width. Default false. */
  fullWidth?: boolean;
}

export interface ToggleGroupSingleProps {
  type?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Pressing the pressed item clears the value. Default true. */
  allowEmpty?: boolean;
}

export interface ToggleGroupMultipleProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  allowEmpty?: never;
}

export type ToggleGroupProps = ToggleGroupBaseProps & (ToggleGroupSingleProps | ToggleGroupMultipleProps);

export interface ToggleGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
  /** Leading icon; icon-only items need an aria-label. */
  icon?: React.ReactNode;
}

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Default "md". */
  size?: Size;
  /** Default "soft". */
  variant?: ToggleVariant;
  icon?: React.ReactNode;
  /** Icon shown while pressed; swaps in with a small spin. */
  pressedIcon?: React.ReactNode;
}

interface GroupContextValue {
  id: string;
  type: "single" | "multiple";
  isPressed: (value: string) => boolean;
  toggle: (value: string) => void;
  disabled: boolean;
  size: Size;
  variant: ToggleVariant;
  fullWidth: boolean;
  reduced: boolean;
}

const GroupContext = React.createContext<GroupContextValue | null>(null);

const itemSizes: Record<Size, string> = {
  sm: "h-7 min-w-7 gap-1 px-2 text-xs [&_svg]:size-3.5",
  md: "h-8 min-w-8 gap-1.5 px-2.5 text-sm [&_svg]:size-4",
  lg: "h-10 min-w-10 gap-2 px-3.5 text-base [&_svg]:size-5",
};
const iconOnly: Record<Size, string> = { sm: "px-0", md: "px-0", lg: "px-0" };
const track: Record<ToggleVariant, string> = {
  soft: "bg-pui-muted p-1",
  outline: "border border-pui-border bg-pui-background p-1 shadow-pui-xs",
  ghost: "",
};
const pill: Record<ToggleVariant, string> = {
  soft: "bg-pui-background shadow-pui-sm",
  outline: "bg-pui-primary/12 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pui-primary)_35%,transparent)]",
  ghost: "bg-pui-muted",
};
const pressedText: Record<ToggleVariant, string> = {
  soft: "text-pui-foreground",
  outline: "text-pui-primary-text",
  ghost: "text-pui-foreground",
};
const itemBase =
  "relative isolate inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-pui-sm font-medium transition-[color,transform] duration-(--pui-duration-fast) active:scale-[0.96]";

/**
 * Toolbar and filter toggles (roadmap W2). Single mode slides one pill between items (like
 * SegmentedControl, but each item is a toggle button that can be cleared); multiple mode fades
 * each pressed item's background. Roving focus with arrow keys, Home and End; aria-pressed.
 */
export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(function ToggleGroup(props, ref) {
  const {
    type = "single",
    value: valueProp,
    defaultValue,
    onValueChange,
    allowEmpty = true,
    orientation = "horizontal",
    size = "md",
    variant = "soft",
    disabled = false,
    loop = true,
    fullWidth = false,
    className,
    onKeyDown,
    onFocus,
    children,
    ...rest
  } = props;
  const id = `pui-tg-${toIdPart(React.useId())}`;
  const reduced = usePrefersReducedMotion();
  const multiple = type === "multiple";
  const [value, setValue] = useControllableState<string | null | string[]>({
    value: valueProp,
    defaultValue: defaultValue ?? (multiple ? [] : null),
    onChange: onValueChange as ((next: string | null | string[]) => void) | undefined,
  });
  const list = Array.isArray(value) ? value : value === null ? [] : [value];
  const { containerProps, value: rovingValue } = useRovingFocus({
    orientation,
    loop,
    selectedKey: list[0] ?? null,
  });

  const context: GroupContextValue = {
    id,
    type: multiple ? "multiple" : "single",
    isPressed: (v) => list.includes(v),
    toggle: (v) => {
      if (multiple) setValue(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
      else if (value === v) {
        if (allowEmpty) setValue(null);
      } else setValue(v);
    },
    disabled,
    size,
    variant,
    fullWidth,
    reduced,
  };

  return (
    <RovingFocusProvider value={rovingValue}>
      <GroupContext.Provider value={context}>
        <div
          ref={ref}
          role="group"
          aria-orientation={orientation}
          aria-disabled={disabled || undefined}
          data-orientation={orientation}
          data-type={context.type}
          data-variant={variant}
          data-disabled={disabled ? "" : undefined}
          {...rest}
          {...containerProps}
          onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
          onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
          className={cn(
            blockReset,
            "items-center gap-1 rounded-pui-md",
            orientation === "vertical" ? "inline-flex flex-col items-stretch" : fullWidth ? "flex w-full" : "inline-flex",
            track[variant],
            focusRing,
            className,
          )}
        >
          {children}
        </div>
      </GroupContext.Provider>
    </RovingFocusProvider>
  );
});

/** A toggle button inside ToggleGroup. */
export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(function ToggleGroupItem(
  { value, icon, disabled: disabledProp, className, onClick, onFocus, children, ...props },
  ref,
) {
  const group = React.useContext(GroupContext);
  if (!group) throw new Error("[changelui] ToggleGroupItem must be used inside ToggleGroup");
  const disabled = group.disabled || disabledProp === true;
  const pressed = group.isPressed(value);
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const roving = useRovingItem(value, { ref: localRef, disabled });
  const hasLabel = children !== undefined && children !== null && children !== false;

  return (
    <button
      ref={mergedRef}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      {...props}
      tabIndex={roving.tabIndex}
      data-roving-item={roving["data-roving-item"]}
      data-key={roving["data-key"]}
      onFocus={composeEventHandlers(onFocus, roving.onFocus)}
      onClick={composeEventHandlers(onClick, () => group.toggle(value))}
      className={cn(
        controlReset,
        itemBase,
        pressed ? pressedText[group.variant] : "text-pui-muted-foreground hover:text-pui-foreground",
        !pressed && group.variant !== "soft" && "hover:bg-pui-muted/60",
        focusRing,
        disabledStyles,
        itemSizes[group.size],
        !hasLabel && iconOnly[group.size],
        group.fullWidth && "flex-1",
        className,
      )}
    >
      {group.type === "single" ? (
        pressed ? (
          <motion.span
            layoutId={group.reduced ? undefined : `${group.id}-pill`}
            transition={springs.snappy}
            aria-hidden="true"
            className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-sm", pill[group.variant])}
          />
        ) : null
      ) : (
        <AnimatePresence initial={false}>
          {pressed ? (
            <motion.span
              key="bg"
              initial={{ opacity: 0, scale: group.reduced ? 1 : 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: group.reduced ? 1 : 0.96 }}
              transition={{ duration: 0.12, ease: easings.out }}
              aria-hidden="true"
              className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-sm", pill[group.variant])}
            />
          ) : null}
        </AnimatePresence>
      )}
      {icon ? <span className={cn(blockReset, "inline-flex shrink-0")}>{icon}</span> : null}
      {children}
    </button>
  );
});

/** Standalone two-state button (bold, mute, favorite) with an optional pressed icon swap. */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    pressed: pressedProp,
    defaultPressed = false,
    onPressedChange,
    size = "md",
    variant = "soft",
    icon,
    pressedIcon,
    className,
    onClick,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [pressed, setPressed] = useControllableState({
    value: pressedProp,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
    name: "pressed",
  });
  const shownIcon = pressed && pressedIcon ? pressedIcon : icon;
  const hasLabel = children !== undefined && children !== null && children !== false;
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      data-variant={variant}
      disabled={disabled}
      {...props}
      onClick={composeEventHandlers(onClick, () => setPressed(!pressed))}
      className={cn(
        controlReset,
        itemBase,
        "rounded-pui-md",
        variant === "outline" && "border border-pui-border",
        pressed ? pressedText[variant] : "text-pui-muted-foreground hover:bg-pui-muted/60 hover:text-pui-foreground",
        focusRing,
        disabledStyles,
        itemSizes[size],
        !hasLabel && iconOnly[size],
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {pressed ? (
          <motion.span
            key="bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: easings.out }}
            aria-hidden="true"
            className={cn(blockReset, "absolute inset-0 -z-10 block rounded-[inherit]", variant === "soft" ? "bg-pui-muted" : pill[variant])}
          />
        ) : null}
      </AnimatePresence>
      {shownIcon ? (
        <span className={cn(blockReset, "relative inline-flex shrink-0")}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={pressed && pressedIcon ? "on" : "off"}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: 45 }}
              transition={reduced ? { duration: 0.12 } : springs.bouncy}
              className={cn(blockReset, "inline-flex")}
            >
              {shownIcon}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
      {children}
    </button>
  );
});
