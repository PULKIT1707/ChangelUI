"use client";

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { useLayer } from "../lib/layers";
import { Portal } from "../lib/portal";
import { usePosition } from "../lib/position";
import { Slot } from "../lib/slot";
import { blockReset, controlReset } from "../lib/styles";
import type { Align, MotionSafeHTMLProps, Side } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface PopoverContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Default "bottom". */
  side?: Side;
  /** Default "center". */
  align?: Align;
  /** Default 8 px. */
  sideOffset?: number;
  /** Show an arrow pointing at the trigger. Default false. */
  arrow?: boolean;
  /** "first" (default): first tabbable, else the content. "content": the content itself. */
  initialFocus?: "first" | "content";
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
}

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
  /** Closes and moves focus back to the trigger (Escape, PopoverClose). */
  closeAndFocus: () => void;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover(part: string): PopoverContextValue {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside Popover`);
  return context;
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const enterOffset: Record<Side, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

const arrowSide: Record<Side, string> = {
  top: "-bottom-1 border-b border-e",
  bottom: "-top-1 border-t border-s",
  left: "-right-1 border-t border-e",
  right: "-left-1 border-b border-s",
};

/** Non-modal floating panel anchored to its trigger (design 7.1 #24). */
export function Popover({ open: openProp, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const context = React.useMemo<PopoverContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      contentId: `${id}-content`,
      closeAndFocus: () => {
        setOpen(false);
        triggerRef.current?.focus();
      },
    }),
    [open, setOpen, id],
  );
  return <PopoverContext.Provider value={context}>{children}</PopoverContext.Provider>;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(function PopoverTrigger(
  { asChild = false, type, onClick, onBlur, className, ...props },
  ref,
) {
  const popover = usePopover("PopoverTrigger");
  const mergedRef = React.useMemo(() => mergeRefs(popover.triggerRef, ref), [popover.triggerRef, ref]);
  const shared = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": popover.open,
    "aria-controls": popover.open ? popover.contentId : undefined,
    "data-state": popover.open ? "open" : "closed",
    ...props,
    onClick: composeEventHandlers(onClick, () => popover.setOpen(!popover.open)),
    onBlur: composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (popover.open && next instanceof Node && !popover.contentRef.current?.contains(next)) popover.setOpen(false);
    }),
  };
  // asChild: the child (often a library Button) applies its own reset. controlReset here would
  // land after the child's variant classes and strip its border, padding and background.
  if (asChild) return <Slot ref={mergedRef} {...shared} className={className} />;
  return <button ref={mergedRef} type={type ?? "button"} {...shared} className={cn(controlReset, className)} />;
});

type ContentImplProps = Omit<PopoverContentProps, "container"> & { forwardedRef: React.Ref<HTMLDivElement> };

function PopoverContentImpl({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  arrow = false,
  initialFocus = "first",
  forwardedRef,
  className,
  style,
  onBlur,
  children,
  ...props
}: ContentImplProps) {
  const popover = usePopover("PopoverContent");
  const isPresent = useIsPresent();
  const reduced = usePrefersReducedMotion();
  const arrowRef = React.useRef<HTMLSpanElement>(null);
  const focusedRef = React.useRef(false);
  const ref = React.useMemo(() => mergeRefs(popover.contentRef, forwardedRef), [popover.contentRef, forwardedRef]);
  const position = usePosition({
    anchor: popover.triggerRef,
    floating: popover.contentRef,
    arrow: arrow ? arrowRef : undefined,
    open: true,
    side,
    align,
    sideOffset,
  });

  useLayer(isPresent, {
    kind: "popover",
    onEscape: popover.closeAndFocus,
    onPointerDownOutside: () => popover.setOpen(false),
    contentEls: () => [popover.contentRef.current, popover.triggerRef.current],
  });

  // Initial focus waits for the first measurement (hidden content cannot take focus), once per opening.
  const { ready } = position;
  React.useEffect(() => {
    const content = popover.contentRef.current;
    if (!isPresent || !ready || focusedRef.current || !content) return;
    focusedRef.current = true;
    const target = initialFocus === "first" ? content.querySelector<HTMLElement>(TABBABLE) : null;
    (target ?? content).focus({ preventScroll: true });
  }, [isPresent, ready, initialFocus, popover.contentRef]);

  const offset = reduced ? {} : enterOffset[side];
  return (
    <motion.div
      ref={ref}
      id={popover.contentId}
      role="dialog"
      tabIndex={-1}
      data-state={isPresent ? "open" : "closed"}
      data-side={position.side}
      data-align={position.align}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96, ...offset }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      {...props}
      onBlur={composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLDivElement>) => {
        const next = event.relatedTarget;
        if (
          next instanceof Node &&
          !event.currentTarget.contains(next) &&
          !popover.triggerRef.current?.contains(next)
        ) {
          popover.setOpen(false);
        }
      })}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        visibility: position.ready ? undefined : "hidden",
        ...style,
      }}
      className={cn(
        blockReset,
        "z-(--pui-z-popover) w-72 max-w-[calc(100vw-1rem)] rounded-pui-lg border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) p-4 text-sm text-pui-surface-foreground shadow-pui-lg outline-hidden",
        className,
      )}
    >
      {children}
      {arrow ? (
        <span
          ref={arrowRef}
          aria-hidden="true"
          data-pui-popover-arrow=""
          style={{ left: position.arrowX, top: position.arrowY }}
          className={cn(
            blockReset,
            "absolute block size-2.5 rotate-45 border-pui-border bg-pui-surface",
            arrowSide[position.side],
          )}
        />
      ) : null}
    </motion.div>
  );
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent(
  { container, ...props },
  ref,
) {
  const popover = usePopover("PopoverContent");
  return (
    <Portal container={container}>
      <AnimatePresence>
        {popover.open ? <PopoverContentImpl key="popover" {...props} forwardedRef={ref} /> : null}
      </AnimatePresence>
    </Portal>
  );
});

export const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(function PopoverClose(
  { asChild = false, type, onClick, className, ...props },
  ref,
) {
  const popover = usePopover("PopoverClose");
  const shared = { ...props, onClick: composeEventHandlers(onClick, popover.closeAndFocus) };
  // asChild: the child applies its own reset (see PopoverTrigger).
  if (asChild) return <Slot ref={ref} {...shared} className={className} />;
  return <button ref={ref} type={type ?? "button"} {...shared} className={cn(controlReset, className)} />;
});
