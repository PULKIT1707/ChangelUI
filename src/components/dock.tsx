"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Tooltip } from "./tooltip";

export interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Resting item size. Default 40 px. */
  itemSize?: number;
  /** Size of the item under the pointer (or keyboard focus). Default 64 px. */
  magnifiedSize?: number;
  /** Pointer influence radius. Default 140 px. */
  distance?: number;
}

export interface DockItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: the accessible name and the tooltip content. */
  label: string;
  /** Shows the indicator dot. */
  active?: boolean;
  asChild?: boolean;
}

export type DockSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

interface DockContextValue {
  mouseX: MotionValue<number>;
  itemSize: number;
  magnifiedSize: number;
  distance: number;
  magnify: boolean;
}

const DockContext = React.createContext<DockContextValue | null>(null);

const SPRING = { mass: 0.1, stiffness: 150, damping: 12 };

/** macOS-style toolbar with pointer magnification and roving focus (design 7.1 #33). */
export const Dock = React.forwardRef<HTMLDivElement, DockProps>(function Dock(
  {
    itemSize = 40,
    magnifiedSize = 64,
    distance = 140,
    className,
    onKeyDown,
    onFocus,
    onPointerMove,
    onPointerLeave,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const mouseX = useMotionValue(Infinity);
  const { containerProps, value: rovingValue } = useRovingFocus({ orientation: "horizontal", loop: true });
  const context = React.useMemo<DockContextValue>(
    () => ({ mouseX, itemSize, magnifiedSize, distance, magnify: !reduced }),
    [mouseX, itemSize, magnifiedSize, distance, reduced],
  );
  return (
    <RovingFocusProvider value={rovingValue}>
      <DockContext.Provider value={context}>
        <div
          ref={ref}
          role="toolbar"
          aria-label="Dock"
          aria-orientation="horizontal"
          {...props}
          {...containerProps}
          tabIndex={containerProps.tabIndex}
          onKeyDown={composeEventHandlers(onKeyDown, containerProps.onKeyDown)}
          onFocus={composeEventHandlers(onFocus, containerProps.onFocus)}
          onPointerMove={composeEventHandlers(onPointerMove, (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.pointerType !== "touch") mouseX.set(event.clientX);
          })}
          onPointerLeave={composeEventHandlers(onPointerLeave, () => mouseX.set(Infinity))}
          className={cn(
            blockReset,
            "inline-flex items-end gap-2 rounded-pui-xl border border-pui-border bg-pui-surface px-2 pb-2 pt-2 shadow-pui-lg",
            focusRing,
            className,
          )}
        >
          {children}
        </div>
      </DockContext.Provider>
    </RovingFocusProvider>
  );
});

export const DockItem = React.forwardRef<HTMLButtonElement, DockItemProps>(function DockItem(
  { label, active = false, asChild = false, type, className, onFocus, onBlur, children, ...props },
  ref,
) {
  const dock = React.useContext(DockContext);
  if (!dock) throw new Error("[changelui] DockItem must be used inside Dock");
  const { mouseX, itemSize, magnifiedSize, distance, magnify } = dock;
  const key = React.useId();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const localRef = React.useRef<HTMLButtonElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const roving = useRovingItem(key, { ref: localRef });
  const focusBoost = useMotionValue(0);

  React.useEffect(() => {
    if (!label.trim()) devWarn("dock-item:label", "DockItem needs a non-empty label.");
  }, [label]);

  const target = useTransform<number, number>([mouseX, focusBoost], ([x = Infinity, boost = 0]) => {
    if (boost) return magnifiedSize;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(x)) return itemSize;
    const offset = Math.abs(x - (rect.left + rect.width / 2));
    if (offset >= distance) return itemSize;
    return itemSize + (magnifiedSize - itemSize) * (1 - offset / distance);
  });
  const size = useSpring(target, SPRING);

  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <motion.div
      ref={wrapperRef}
      data-pui-dock-item=""
      data-active={active ? "" : undefined}
      style={{ width: magnify ? size : itemSize, height: magnify ? size : itemSize }}
      className={cn(blockReset, "relative flex shrink-0 items-end justify-center")}
    >
      <Tooltip content={label} side="top">
        <Comp
          ref={mergedRef}
          type={asChild ? undefined : (type ?? "button")}
          aria-label={label}
          {...props}
          tabIndex={roving.tabIndex}
          data-roving-item={roving["data-roving-item"]}
          data-key={roving["data-key"]}
          onFocus={composeEventHandlers(onFocus, (event: React.FocusEvent<HTMLElement>) => {
            roving.onFocus();
            let visible = true;
            try {
              visible = event.currentTarget.matches(":focus-visible");
            } catch {
              // Older engines without :focus-visible.
            }
            if (visible) focusBoost.set(1);
          })}
          onBlur={composeEventHandlers(onBlur, () => focusBoost.set(0))}
          className={cn(
            controlReset,
            "flex size-full cursor-pointer items-center justify-center rounded-pui-full bg-pui-muted text-pui-foreground no-underline transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted/70 [&_svg]:size-1/2",
            focusRing,
            className,
          )}
        >
          {children}
        </Comp>
      </Tooltip>
      {active ? (
        <span
          aria-hidden="true"
          data-pui-dock-indicator=""
          className={cn(blockReset, "absolute -bottom-1.5 left-1/2 block size-1 -translate-x-1/2 rounded-pui-full bg-pui-primary")}
        />
      ) : null}
    </motion.div>
  );
});

export const DockSeparator = React.forwardRef<HTMLDivElement, DockSeparatorProps>(function DockSeparator(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      {...props}
      className={cn(blockReset, "mx-1 h-8 w-px shrink-0 self-center bg-pui-border", className)}
    />
  );
});
