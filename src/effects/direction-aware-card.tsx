"use client";
import { motion, useAnimate } from "motion/react";
import * as React from "react";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { durations, easings, springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type CardEdge = "top" | "right" | "bottom" | "left";
export interface DirectionAwareCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The media (image, video, illustration). It fills the card. */
  children?: React.ReactNode;
  /** Content that slides in from the edge the pointer entered (title, tags, actions). */
  overlay: React.ReactNode;
  /** Class for the overlay layer (background, padding, alignment). */
  overlayClassName?: string;
  /** "push" also nudges the media away from the incoming overlay; "slide" moves the overlay only. Default "push". */
  mode?: "slide" | "push";
  /** Edge used when the overlay opens from keyboard focus. Default "bottom". */
  focusEdge?: CardEdge;
  /** Keep the overlay shown on devices that cannot hover (phones). Default true. */
  showOnTouch?: boolean;
  /** Called with the edge when the overlay enters or leaves. */
  onEdgeChange?: (edge: CardEdge, phase: "enter" | "leave") => void;
}
const EDGES: readonly CardEdge[] = ["top", "right", "bottom", "left"];
const OFFSET: Record<CardEdge, { x: string; y: string }> = {
  top: { x: "0%", y: "-100%" },
  right: { x: "100%", y: "0%" },
  bottom: { x: "0%", y: "100%" },
  left: { x: "-100%", y: "0%" },
};
/** Which edge the point is closest to, corrected for the card's aspect ratio. */
function edgeFromPoint(rect: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): CardEdge {
  const { width: w, height: h } = rect;
  if (w <= 0 || h <= 0) return "bottom";
  const x = (clientX - rect.left - w / 2) * (w > h ? h / w : 1);
  const y = (clientY - rect.top - h / 2) * (h > w ? w / h : 1);
  const index = (Math.round((Math.atan2(y, x) * (180 / Math.PI) + 180) / 90) + 3) % 4;
  return EDGES[index] ?? "bottom";
}
/**
 * A media card whose overlay slides in from the side the pointer came from and leaves through the
 * side it exits, so a grid of cards feels connected to the hand moving over it. Keyboard focus
 * opens it from `focusEdge`, the overlay stays in the DOM for screen readers, phones show it at
 * rest, and reduced motion swaps the slide for a fade.
 */
export const DirectionAwareCard = React.forwardRef<HTMLDivElement, DirectionAwareCardProps>(function DirectionAwareCard(
  {
    children,
    overlay,
    overlayClassName,
    mode = "push",
    focusEdge = "bottom",
    showOnTouch = true,
    onEdgeChange,
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const noHover = useMediaQuery("(hover: none)");
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref, scope), [ref, scope]);
  const state = React.useRef({ hovered: false, focused: false, open: false });
  const [view, setView] = React.useState<{ open: boolean; edge: CardEdge }>({ open: false, edge: focusEdge });
  const latest = useLatestRef({ onEdgeChange, reduced, mode });
  const pinned = showOnTouch && noHover;
  React.useEffect(() => {
    if (!pinned) return;
    animate("[data-dac-overlay]", { x: "0%", y: "0%", opacity: 1 }, { duration: 0 });
  }, [pinned, animate]);
  const show = (edge: CardEdge) => {
    if (state.current.open || pinned) return;
    state.current.open = true;
    setView({ open: true, edge });
    const { reduced: still, mode: m, onEdgeChange: cb } = latest.current;
    cb?.(edge, "enter");
    if (still) {
      animate("[data-dac-overlay]", { x: "0%", y: "0%" }, { duration: 0 });
      animate("[data-dac-overlay]", { opacity: 1 }, { duration: durations.base });
      return;
    }
    const from = OFFSET[edge];
    animate("[data-dac-overlay]", { x: from.x, y: from.y, opacity: 1 }, { duration: 0 });
    animate("[data-dac-overlay]", { x: "0%", y: "0%" }, springs.smooth);
    if (m === "push") {
      // The media drifts away from the incoming overlay, like the overlay is nudging it.
      const nudge = { x: from.x === "0%" ? "0%" : from.x.startsWith("-") ? "4%" : "-4%", y: from.y === "0%" ? "0%" : from.y.startsWith("-") ? "4%" : "-4%" };
      animate("[data-dac-media]", { x: nudge.x, y: nudge.y, scale: 1.06 }, springs.gentle);
    }
  };
  const hide = (edge: CardEdge) => {
    if (!state.current.open || pinned) return;
    state.current.open = false;
    setView({ open: false, edge });
    const { reduced: still, onEdgeChange: cb } = latest.current;
    cb?.(edge, "leave");
    if (still) {
      animate("[data-dac-overlay]", { opacity: 0 }, { duration: durations.fast });
    } else {
      const to = OFFSET[edge];
      animate("[data-dac-overlay]", { x: to.x, y: to.y }, { duration: durations.slow, ease: easings.out });
    }
    animate("[data-dac-media]", { x: "0%", y: "0%", scale: 1 }, still ? { duration: 0 } : springs.gentle);
  };
  const edgeOf = (event: React.PointerEvent<HTMLDivElement>) => edgeFromPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
  const open = pinned || view.open;
  return (
    <div
      ref={refs}
      data-state={open ? "open" : "closed"}
      data-edge={view.edge}
      {...props}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType === "touch") return;
        state.current.hovered = true;
        show(edgeOf(event));
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (event.pointerType === "touch") return;
        state.current.hovered = false;
        if (!state.current.focused) hide(edgeOf(event));
      }}
      onFocus={(event) => {
        onFocus?.(event);
        state.current.focused = true;
        show(focusEdge);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.currentTarget.contains(event.relatedTarget)) return;
        state.current.focused = false;
        if (!state.current.hovered) hide(focusEdge);
      }}
      className={cn(blockReset, "group/dac relative isolate overflow-hidden rounded-pui-xl bg-pui-muted text-pui-foreground", className)}
    >
      <motion.div data-dac-media="" className={cn(blockReset, "size-full [&>img]:block [&>img]:size-full [&>img]:object-cover")}>
        {children}
      </motion.div>
      <motion.div
        data-dac-overlay=""
        className={cn(
          blockReset,
          "absolute inset-0 flex flex-col justify-end bg-linear-to-t from-pui-surface/95 via-pui-surface/70 to-pui-surface/0 p-4 text-pui-surface-foreground",
          overlayClassName,
        )}
        style={{ x: "0%", y: "100%", opacity: 0 }}
      >
        {overlay}
      </motion.div>
    </div>
  );
});
