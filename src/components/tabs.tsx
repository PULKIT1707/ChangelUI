"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { toIdPart } from "../lib/ids";
import { springs } from "../lib/motion";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps, Orientation, Size } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type TabsVariant = "pill" | "underline" | "enclosed";

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Default "horizontal". */
  orientation?: Orientation;
  /** "automatic" (default): selection follows focus. "manual": arrows move focus, Enter/Space selects. */
  activationMode?: "automatic" | "manual";
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "pill". */
  variant?: TabsVariant;
  /** Default "md". */
  size?: Size;
  /** Wrap arrow navigation. Default true. */
  loop?: boolean;
  /** Stretch the list to its container; triggers share the width. Default false. */
  fullWidth?: boolean;
}

export interface TabsTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  value: string;
  /** Keep the panel mounted (hidden) while inactive. Default false. */
  forceMount?: boolean;
}

interface TabsContextValue {
  id: string;
  value: string | undefined;
  select: (value: string) => void;
  orientation: Orientation;
  activationMode: "automatic" | "manual";
}

interface TabsListContextValue {
  variant: TabsVariant;
  size: Size;
  fullWidth: boolean;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);
const TabsListContext = React.createContext<TabsListContextValue>({ variant: "pill", size: "md", fullWidth: false });

function useTabsContext(part: string): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside Tabs`);
  return context;
}

const triggerId = (id: string, value: string) => `${id}-item-${toIdPart(value)}-trigger`;
const contentId = (id: string, value: string) => `${id}-item-${toIdPart(value)}-content`;

const listVariants: Record<TabsVariant, Record<Orientation, string>> = {
  pill: { horizontal: "rounded-pui-md bg-pui-muted p-1", vertical: "rounded-pui-md bg-pui-muted p-1" },
  underline: { horizontal: "border-b border-pui-border", vertical: "border-e border-pui-border" },
  enclosed: {
    horizontal: "rounded-pui-lg border border-pui-border bg-pui-muted p-1",
    vertical: "rounded-pui-lg border border-pui-border bg-pui-muted p-1",
  },
};

const indicatorVariants: Record<TabsVariant, Record<Orientation, string>> = {
  pill: {
    horizontal: "inset-0 rounded-pui-sm bg-pui-background shadow-pui-sm",
    vertical: "inset-0 rounded-pui-sm bg-pui-background shadow-pui-sm",
  },
  underline: {
    horizontal: "inset-x-0 -bottom-px h-0.5 rounded-pui-full bg-pui-foreground",
    vertical: "inset-y-0 -end-px w-0.5 rounded-pui-full bg-pui-foreground",
  },
  enclosed: {
    horizontal: "inset-0 rounded-pui-md border border-pui-border bg-pui-surface shadow-pui-sm",
    vertical: "inset-0 rounded-pui-md border border-pui-border bg-pui-surface shadow-pui-sm",
  },
};

const triggerSizes: Record<Size, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-8 gap-2 px-3 text-sm",
  lg: "h-10 gap-2 px-4 text-base",
};

/** Tabbed panels with roving focus and a sliding indicator (design 7.1 #21). */
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    activationMode = "automatic",
    className,
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
  const context = React.useMemo<TabsContextValue>(
    () => ({ id, value, select: (next) => setValue(next), orientation, activationMode }),
    [id, value, setValue, orientation, activationMode],
  );
  return (
    <TabsContext.Provider value={context}>
      <div
        ref={ref}
        data-orientation={orientation}
        {...props}
        className={cn(blockReset, "flex gap-3", orientation === "vertical" ? "flex-row" : "flex-col", className)}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
});

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { variant = "pill", size = "md", loop = true, fullWidth = false, className, onKeyDown, onFocus, children, ...props },
  ref,
) {
  const tabs = useTabsContext("TabsList");
  const { containerProps, value: rovingValue } = useRovingFocus({
    orientation: tabs.orientation,
    loop,
    selectedKey: tabs.value ?? null,
    onActivate: tabs.activationMode === "automatic" ? (key) => tabs.select(key) : undefined,
  });
  const listContext = React.useMemo(() => ({ variant, size, fullWidth }), [variant, size, fullWidth]);
  const vertical = tabs.orientation === "vertical";
  return (
    <RovingFocusProvider value={rovingValue}>
      <TabsListContext.Provider value={listContext}>
        <div
          ref={ref}
          role="tablist"
          aria-orientation={tabs.orientation}
          data-variant={variant}
          data-size={size}
          data-orientation={tabs.orientation}
          {...props}
          {...containerProps}
          tabIndex={containerProps.tabIndex}
          onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
          onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
          className={cn(
            blockReset,
            "relative items-stretch gap-1",
            vertical ? "flex-col" : "flex-row",
            fullWidth ? "flex w-full" : "inline-flex",
            listVariants[variant][tabs.orientation],
            focusRing,
            className,
          )}
        >
          {children}
        </div>
      </TabsListContext.Provider>
    </RovingFocusProvider>
  );
});

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(function TabsTrigger(
  { value, icon, disabled = false, className, onClick, onFocus, children, ...props },
  ref,
) {
  const tabs = useTabsContext("TabsTrigger");
  const list = React.useContext(TabsListContext);
  const selected = tabs.value === value;
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const roving = useRovingItem(value, { ref: localRef, disabled });
  return (
    <button
      ref={mergedRef}
      type="button"
      role="tab"
      id={triggerId(tabs.id, value)}
      aria-selected={selected}
      aria-controls={contentId(tabs.id, value)}
      data-state={selected ? "active" : "inactive"}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      {...props}
      tabIndex={roving.tabIndex}
      data-roving-item={roving["data-roving-item"]}
      data-key={roving["data-key"]}
      onFocus={composeEventHandlers(onFocus, roving.onFocus)}
      onClick={composeEventHandlers(onClick, () => tabs.select(value))}
      className={cn(
        controlReset,
        "relative isolate inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-pui-sm font-medium transition-colors duration-(--pui-duration-fast)",
        selected ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
        tabs.orientation === "vertical" && "justify-start",
        focusRing,
        disabledStyles,
        triggerSizes[list.size],
        list.fullWidth && "flex-1",
        className,
      )}
    >
      {selected ? (
        <motion.span
          layoutId={`${tabs.id}-indicator`}
          transition={springs.snappy}
          aria-hidden="true"
          data-pui-tabs-indicator=""
          className={cn(blockReset, "absolute -z-10 block", indicatorVariants[list.variant][tabs.orientation])}
        />
      ) : null}
      {icon ? <span className={cn(blockReset, "inline-flex shrink-0")}>{icon}</span> : null}
      {children}
    </button>
  );
});

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(function TabsContent(
  { value, forceMount = false, className, children, ...props },
  ref,
) {
  const tabs = useTabsContext("TabsContent");
  const reduced = usePrefersReducedMotion();
  // Server HTML and hydration render the visible panel; only panels mounted afterwards fade in.
  const isClient = useIsClient();
  const active = tabs.value === value;
  if (!active && !forceMount) return null;
  return (
    <motion.div
      ref={ref}
      role="tabpanel"
      id={contentId(tabs.id, value)}
      aria-labelledby={triggerId(tabs.id, value)}
      tabIndex={0}
      hidden={!active}
      data-state={active ? "active" : "inactive"}
      initial={isClient && !reduced ? { opacity: 0, y: 4 } : false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...props}
      className={cn(blockReset, "flex-1 rounded-pui-sm", focusRing, className)}
    >
      {children}
    </motion.div>
  );
});
