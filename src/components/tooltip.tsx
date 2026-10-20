"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { getGlobal } from "../lib/global";
import { useLayer } from "../lib/layers";
import { Portal } from "../lib/portal";
import { usePosition } from "../lib/position";
import { Slot } from "../lib/slot";
import { blockReset } from "../lib/styles";
import type { Align, Side } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface TooltipProps {
  content: React.ReactNode;
  /** A single focusable element; it receives the trigger props through Slot. */
  children: React.ReactElement;
  /** Default "top". */
  side?: Side;
  /** Default "center". */
  align?: Align;
  /** Default 8 px. */
  sideOffset?: number;
  /** Default 400 ms. */
  openDelayMs?: number;
  /** Default 100 ms. */
  closeDelayMs?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Show an arrow pointing at the trigger. Default false. */
  arrow?: boolean;
  /** Applied to the content bubble. */
  className?: string;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
}

/** A tooltip that closed (or started closing) within this window makes the next one open at once. */
const WARM_MS = 300;
const getWarm = () => getGlobal<{ last: number }>("tooltip-warm", () => ({ last: 0 }));

const enterOffset: Record<Side, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

const arrowSide: Record<Side, string> = {
  top: "-bottom-1",
  bottom: "-top-1",
  left: "-right-1",
  right: "-left-1",
};

interface BubbleProps {
  id: string;
  anchor: React.RefObject<HTMLElement | null>;
  side: Side;
  align: Align;
  sideOffset: number;
  arrow: boolean;
  className?: string;
  contentRef: React.Ref<HTMLDivElement>;
  /** The bubble element for the tooltip's layer (outside-click evaluation). */
  layerRef: React.Ref<HTMLDivElement>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  children: React.ReactNode;
}

function TooltipBubble({
  id,
  anchor,
  side,
  align,
  sideOffset,
  arrow,
  className,
  contentRef,
  layerRef,
  onPointerEnter,
  onPointerLeave,
  children,
}: BubbleProps) {
  const reduced = usePrefersReducedMotion();
  const localRef = React.useRef<HTMLDivElement>(null);
  const arrowRef = React.useRef<HTMLSpanElement>(null);
  const ref = React.useMemo(() => mergeRefs(localRef, contentRef, layerRef), [contentRef, layerRef]);
  const position = usePosition({
    anchor,
    floating: localRef,
    arrow: arrow ? arrowRef : undefined,
    open: true,
    side,
    align,
    sideOffset,
  });
  const offset = reduced ? {} : enterOffset[side];
  return (
    <motion.div
      ref={ref}
      id={id}
      role="tooltip"
      data-side={position.side}
      data-align={position.align}
      data-state="open"
      initial={{ opacity: 0, scale: reduced ? 1 : 0.96, ...offset }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        visibility: position.ready ? undefined : "hidden",
      }}
      className={cn(
        blockReset,
        "z-(--pui-z-tooltip) max-w-xs rounded-pui-md bg-pui-foreground px-2.5 py-1.5 text-xs leading-snug text-pui-background shadow-pui-md",
        className,
      )}
    >
      {children}
      {arrow ? (
        <span
          ref={arrowRef}
          aria-hidden="true"
          data-pui-tooltip-arrow=""
          style={{ left: position.arrowX, top: position.arrowY }}
          className={cn(blockReset, "absolute block size-2 rotate-45 bg-pui-foreground", arrowSide[position.side])}
        />
      ) : null}
    </motion.div>
  );
}

/**
 * Hover and keyboard-focus hint (design 7.1 #23). Opens on mouse/pen pointerenter or
 * :focus-visible focus after openDelayMs (at once while warm), stays open while the pointer is over
 * the content, and closes on leave, blur or Escape. ref and className go to the content bubble.
 */
export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    content,
    children,
    side = "top",
    align = "center",
    sideOffset = 8,
    openDelayMs = 400,
    closeDelayMs = 100,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    arrow = false,
    className,
    container,
  },
  ref,
) {
  const contentId = `${React.useId()}-content`;
  const triggerRef = React.useRef<HTMLElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef({ open: 0, close: 0 });
  const [openState, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const open = openState && !disabled;
  const openRef = useLatestRef(open);
  const valid = React.isValidElement(children);

  React.useEffect(() => {
    if (!valid) devWarn("tooltip:child", "Tooltip expects a single element child; rendering it without a tooltip.");
  }, [valid]);

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.open);
      window.clearTimeout(t.close);
    };
  }, []);

  const clearTimers = () => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
  };
  const show = () => {
    clearTimers();
    if (disabled) return;
    if (Date.now() - getWarm().last < WARM_MS) setOpen(true);
    else timers.current.open = window.setTimeout(() => setOpen(true), openDelayMs);
  };
  const closeNow = () => {
    clearTimers();
    if (openRef.current) getWarm().last = Date.now();
    setOpen(false);
  };
  const hide = () => {
    clearTimers();
    if (openRef.current) getWarm().last = Date.now();
    timers.current.close = window.setTimeout(() => setOpen(false), closeDelayMs);
  };

  // Only the bubble: a click on it must not dismiss the layer beneath (design 6 layer stack).
  useLayer(open, { kind: "tooltip", onEscape: closeNow, contentEls: () => [bubbleRef.current] });

  if (!valid) return <>{children}</>;

  const child = children as React.ReactElement<{ "aria-describedby"?: string }>;
  const own = child.props["aria-describedby"];
  const describedBy = open ? (own ? `${own} ${contentId}` : contentId) : own;
  const trigger = own && open ? React.cloneElement(child, { "aria-describedby": describedBy }) : child;

  return (
    <>
      <Slot
        ref={triggerRef}
        aria-describedby={describedBy}
        onPointerEnter={(event: React.PointerEvent<HTMLElement>) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={(event: React.PointerEvent<HTMLElement>) => {
          if (event.pointerType !== "touch") hide();
        }}
        onFocus={(event: React.FocusEvent<HTMLElement>) => {
          let visible = true;
          try {
            visible = event.currentTarget.matches(":focus-visible");
          } catch {
            // Older engines without :focus-visible: treat focus as keyboard focus.
          }
          if (visible) show();
        }}
        onBlur={closeNow}
      >
        {trigger}
      </Slot>
      <Portal container={container}>
        <AnimatePresence>
          {open ? (
            <TooltipBubble
              key="tooltip"
              id={contentId}
              anchor={triggerRef}
              side={side}
              align={align}
              sideOffset={sideOffset}
              arrow={arrow}
              className={className}
              contentRef={ref}
              layerRef={bubbleRef}
              onPointerEnter={clearTimers}
              onPointerLeave={hide}
            >
              {content}
            </TooltipBubble>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
});
