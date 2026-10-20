"use client";

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { useLayer } from "../lib/layers";
import { easings } from "../lib/motion";
import { Portal } from "../lib/portal";
import { usePosition } from "../lib/position";
import { Slot } from "../lib/slot";
import { blockReset } from "../lib/styles";
import type { Align, MotionSafeHTMLProps, Side } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hover or keyboard focus time before opening. Default 500 ms. */
  openDelayMs?: number;
  /** Grace period after the pointer leaves the trigger and card. Default 150 ms. */
  closeDelayMs?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

export interface HoverCardTriggerProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render the single child element (a link, a button, an avatar) as the trigger. */
  asChild?: boolean;
}

export interface HoverCardContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Default "bottom". */
  side?: Side;
  /** Default "center". */
  align?: Align;
  /** Default 8 px. */
  sideOffset?: number;
  /** Show an arrow pointing at the trigger. Default false. */
  arrow?: boolean;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
}

interface HoverCardContextValue {
  open: boolean;
  /** Schedule an open after openDelayMs (cancels a pending close). */
  scheduleOpen: () => void;
  /** Schedule a close after closeDelayMs (cancels a pending open). */
  scheduleClose: () => void;
  /** Keep the card open (pointer over it, focus inside it). */
  cancelClose: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
  disabled: boolean;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCard(part: string): HoverCardContextValue {
  const context = React.useContext(HoverCardContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside HoverCard`);
  return context;
}

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

const origin: Record<Side, string> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * Rich preview that opens after a hover or keyboard-focus delay (user cards, link previews).
 * The content is supplementary: it is not announced and holds no focus of its own unless the
 * user tabs into it.
 */
export function HoverCard({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelayMs = 500,
  closeDelayMs = 150,
  disabled = false,
  children,
}: HoverCardProps) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef({ open: 0, close: 0 });
  const setOpenRef = useLatestRef(setOpen);
  const delays = useLatestRef({ openDelayMs, closeDelayMs });

  const api = React.useMemo(() => {
    const clear = () => {
      window.clearTimeout(timers.current.open);
      window.clearTimeout(timers.current.close);
      timers.current.open = 0;
      timers.current.close = 0;
    };
    return {
      clear,
      scheduleOpen() {
        window.clearTimeout(timers.current.close);
        timers.current.close = 0;
        if (timers.current.open) return;
        timers.current.open = window.setTimeout(() => {
          timers.current.open = 0;
          setOpenRef.current(true);
        }, delays.current.openDelayMs);
      },
      scheduleClose() {
        window.clearTimeout(timers.current.open);
        timers.current.open = 0;
        window.clearTimeout(timers.current.close);
        timers.current.close = window.setTimeout(() => {
          timers.current.close = 0;
          setOpenRef.current(false);
        }, delays.current.closeDelayMs);
      },
      cancelClose() {
        window.clearTimeout(timers.current.close);
        timers.current.close = 0;
      },
      close() {
        clear();
        setOpenRef.current(false);
      },
    };
  }, [setOpenRef, delays]);

  React.useEffect(() => api.clear, [api]);

  const context = React.useMemo<HoverCardContextValue>(
    () => ({
      open: open && !disabled,
      scheduleOpen: api.scheduleOpen,
      scheduleClose: api.scheduleClose,
      cancelClose: api.cancelClose,
      close: api.close,
      triggerRef,
      contentRef,
      contentId: `${id}-content`,
      disabled,
    }),
    [open, disabled, api, id],
  );
  return <HoverCardContext.Provider value={context}>{children}</HoverCardContext.Provider>;
}

export const HoverCardTrigger = React.forwardRef<HTMLAnchorElement, HoverCardTriggerProps>(function HoverCardTrigger(
  { asChild = false, onPointerEnter, onPointerLeave, onFocus, onBlur, onClick, className, ...props },
  ref,
) {
  const card = useHoverCard("HoverCardTrigger");
  const mergedRef = React.useMemo(() => mergeRefs(card.triggerRef, ref), [card.triggerRef, ref]);
  const shared = {
    "data-state": card.open ? "open" : "closed",
    ...props,
    onPointerEnter: composeEventHandlers(onPointerEnter, (event: React.PointerEvent<HTMLElement>) => {
      // Touch has no hover: a tap follows the link instead of flashing a card.
      if (event.pointerType !== "touch" && !card.disabled) card.scheduleOpen();
    }),
    onPointerLeave: composeEventHandlers(onPointerLeave, (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") card.scheduleClose();
    }),
    onFocus: composeEventHandlers(onFocus, (event: React.FocusEvent<HTMLElement>) => {
      // Keyboard focus only; a mouse click focusing the link must not reopen a dismissed card.
      if (!card.disabled && event.currentTarget.matches(":focus-visible")) card.scheduleOpen();
    }),
    onBlur: composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && card.contentRef.current?.contains(next)) return;
      card.scheduleClose();
    }),
    onClick: composeEventHandlers(onClick, () => card.cancelClose()),
  };
  // asChild: the child keeps its own reset and classes.
  if (asChild) return <Slot ref={mergedRef} {...shared} className={className} />;
  return (
    <a
      ref={mergedRef}
      {...shared}
      className={cn(
        blockReset,
        "rounded-pui-sm font-medium text-pui-primary-text underline decoration-pui-primary/40 underline-offset-4 transition-colors duration-(--pui-duration-fast) hover:decoration-pui-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-pui-ring",
        className,
      )}
    />
  );
});

type ContentImplProps = Omit<HoverCardContentProps, "container"> & { forwardedRef: React.Ref<HTMLDivElement> };

function HoverCardContentImpl({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  arrow = false,
  forwardedRef,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  children,
  ...props
}: ContentImplProps) {
  const card = useHoverCard("HoverCardContent");
  const isPresent = useIsPresent();
  const reduced = usePrefersReducedMotion();
  const arrowRef = React.useRef<HTMLSpanElement>(null);
  const ref = React.useMemo(() => mergeRefs(card.contentRef, forwardedRef), [card.contentRef, forwardedRef]);
  const position = usePosition({
    anchor: card.triggerRef,
    floating: card.contentRef,
    arrow: arrow ? arrowRef : undefined,
    open: true,
    side,
    align,
    sideOffset,
  });

  // A "popover" layer that never takes focus: Escape and outside presses close it, and it sits
  // above (or below) other layers in the shared stack.
  useLayer(isPresent, {
    kind: "popover",
    takesFocus: false,
    onEscape: card.close,
    onPointerDownOutside: card.close,
    contentEls: () => [card.contentRef.current, card.triggerRef.current],
  });

  const offset = reduced ? {} : enterOffset[position.side];
  return (
    <motion.div
      ref={ref}
      id={card.contentId}
      data-state={isPresent ? "open" : "closed"}
      data-side={position.side}
      data-align={position.align}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96, ...offset }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.96, transition: { duration: 0.1, ease: easings.out } }}
      transition={{ duration: 0.15, ease: easings.out }}
      {...props}
      onPointerEnter={composeEventHandlers(onPointerEnter, (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "touch") card.cancelClose();
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "touch") card.scheduleClose();
      })}
      onFocus={composeEventHandlers(onFocus, card.cancelClose)}
      onBlur={composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLDivElement>) => {
        const next = event.relatedTarget;
        if (next instanceof Node && (event.currentTarget.contains(next) || card.triggerRef.current?.contains(next))) return;
        card.scheduleClose();
      })}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        visibility: position.ready ? undefined : "hidden",
        transformOrigin: origin[position.side],
        ...style,
      }}
      className={cn(
        blockReset,
        "z-(--pui-z-popover) w-80 max-w-[calc(100vw-1rem)] rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground shadow-pui-lg outline-hidden backdrop-blur-(--pui-surface-blur)",
        className,
      )}
    >
      {children}
      {arrow ? (
        <span
          ref={arrowRef}
          aria-hidden="true"
          data-pui-hover-card-arrow=""
          style={{ left: position.arrowX, top: position.arrowY }}
          className={cn(blockReset, "absolute block size-2.5 rotate-45 border-pui-border bg-pui-surface", arrowSide[position.side])}
        />
      ) : null}
    </motion.div>
  );
}

export const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(function HoverCardContent(
  { container, ...props },
  ref,
) {
  const card = useHoverCard("HoverCardContent");
  return (
    <Portal container={container}>
      <AnimatePresence>{card.open ? <HoverCardContentImpl key="card" {...props} forwardedRef={ref} /> : null}</AnimatePresence>
    </Portal>
  );
});
