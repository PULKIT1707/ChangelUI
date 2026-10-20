"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { easings } from "../lib/motion";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, disabledStyles, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface CollapsibleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Render the single child element as the root instead of a div. */
  asChild?: boolean;
}

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render the single child element (e.g. a library Button) as the trigger. */
  asChild?: boolean;
}

export interface CollapsibleContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /**
   * Keep the content mounted while closed (hidden from layout, focus and assistive tech once the
   * close animation ends), so find-in-page state, form values and SEO text survive. Default false.
   */
  forceMount?: boolean;
  /** Height animation length in seconds. Default 0.25. */
  duration?: number;
}

interface CollapsibleContextValue {
  open: boolean;
  disabled: boolean;
  toggle: () => void;
  triggerId: string;
  contentId: string;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible(part: string): CollapsibleContextValue {
  const context = React.useContext(CollapsibleContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside Collapsible`);
  return context;
}

/** Read the open state of the closest Collapsible (e.g. to rotate a custom icon). */
export function useCollapsibleState(): { open: boolean; disabled: boolean } {
  const context = useCollapsible("useCollapsibleState");
  return { open: context.open, disabled: context.disabled };
}

/** Headless disclosure: one trigger shows and hides one region with an auto-height animation. */
export const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
  { open: openProp, defaultOpen = false, onOpenChange, disabled = false, asChild = false, className, ...props },
  ref,
) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const context = React.useMemo<CollapsibleContextValue>(
    () => ({
      open,
      disabled,
      toggle: () => {
        if (!disabled) setOpen(!open);
      },
      triggerId: `${id}-trigger`,
      contentId: `${id}-content`,
    }),
    [open, disabled, setOpen, id],
  );
  const shared = {
    "data-state": open ? "open" : "closed",
    "data-disabled": disabled ? "" : undefined,
    ...props,
  };
  return (
    <CollapsibleContext.Provider value={context}>
      {asChild ? (
        <Slot ref={ref} {...shared} className={className} />
      ) : (
        <div ref={ref} {...shared} className={cn(blockReset, className)} />
      )}
    </CollapsibleContext.Provider>
  );
});

export const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  function CollapsibleTrigger({ asChild = false, type, onClick, className, ...props }, ref) {
    const collapsible = useCollapsible("CollapsibleTrigger");
    const shared = {
      id: collapsible.triggerId,
      "aria-expanded": collapsible.open,
      "aria-controls": collapsible.contentId,
      "data-state": collapsible.open ? "open" : "closed",
      "data-disabled": collapsible.disabled ? "" : undefined,
      disabled: collapsible.disabled || undefined,
      ...props,
      onClick: composeEventHandlers(onClick, collapsible.toggle),
    };
    // asChild: the child applies its own reset; a reset here would strip its variant classes.
    if (asChild) return <Slot ref={ref} {...shared} className={className} />;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        {...shared}
        className={cn(controlReset, "cursor-pointer", focusRing, disabledStyles, className)}
      />
    );
  },
);

export const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  function CollapsibleContent({ forceMount = false, duration = 0.25, className, children, style, ...props }, ref) {
    const collapsible = useCollapsible("CollapsibleContent");
    const reduced = usePrefersReducedMotion();
    const transition = reduced ? { duration: 0 } : { duration, ease: easings.out };
    const shared = {
      id: collapsible.contentId,
      role: "region" as const,
      "aria-labelledby": collapsible.triggerId,
      "data-state": collapsible.open ? "open" : "closed",
    };

    if (forceMount) {
      const { open } = collapsible;
      return (
        <motion.div
          ref={ref}
          {...shared}
          aria-hidden={open ? undefined : true}
          initial={false}
          animate={
            open
              ? { height: "auto", opacity: 1, visibility: "visible" }
              : { height: 0, opacity: 0, transitionEnd: { visibility: "hidden" } }
          }
          transition={transition}
          {...props}
          style={style}
          className={cn(blockReset, "overflow-hidden", className)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <AnimatePresence initial={false}>
        {collapsible.open ? (
          <motion.div
            key="content"
            ref={ref}
            {...shared}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            {...props}
            style={style}
            className={cn(blockReset, "overflow-hidden", className)}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  },
);
