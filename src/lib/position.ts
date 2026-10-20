"use client";

import { useState, type RefObject } from "react";
import { devWarn } from "./dev";
import type { Align, Side } from "./types";
import { useIsomorphicLayoutEffect } from "./use-latest-ref";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ComputePositionOptions {
  side: Side;
  align: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  arrowPadding?: number;
  /** Arrow element size; arrowX/arrowY are undefined without it. */
  arrow?: Dimensions;
}

export interface ComputedPosition {
  /** position: fixed left/top in px */
  x: number;
  y: number;
  side: Side;
  align: Align;
  /** Arrow left offset inside the content (top/bottom sides). */
  arrowX?: number;
  /** Arrow top offset inside the content (left/right sides). */
  arrowY?: number;
}

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function mainAxis(side: Side, anchor: Rect, floating: Dimensions, offset: number): number {
  switch (side) {
    case "top":
      return anchor.y - floating.height - offset;
    case "bottom":
      return anchor.y + anchor.height + offset;
    case "left":
      return anchor.x - floating.width - offset;
    case "right":
      return anchor.x + anchor.width + offset;
  }
}

function overflows(side: Side, pos: number, floating: Dimensions, viewport: Dimensions, padding: number): boolean {
  switch (side) {
    case "top":
      return pos < padding;
    case "bottom":
      return pos + floating.height > viewport.height - padding;
    case "left":
      return pos < padding;
    case "right":
      return pos + floating.width > viewport.width - padding;
  }
}

function room(side: Side, anchor: Rect, viewport: Dimensions): number {
  switch (side) {
    case "top":
      return anchor.y;
    case "bottom":
      return viewport.height - (anchor.y + anchor.height);
    case "left":
      return anchor.x;
    case "right":
      return viewport.width - (anchor.x + anchor.width);
  }
}

/**
 * Pure placement math (plan P6, design 6 Positioning steps 1-7): main axis + offset, cross-axis
 * alignment, flip when the side overflows and the opposite side has more room, shift into the
 * viewport padding, and a clamped arrow offset.
 */
export function computePosition(
  anchor: Rect,
  floating: Dimensions,
  viewport: Dimensions,
  {
    side: requestedSide,
    align,
    sideOffset = 8,
    alignOffset = 0,
    collisionPadding = 8,
    arrowPadding = 8,
    arrow,
  }: ComputePositionOptions,
): ComputedPosition {
  let side = requestedSide;
  let main = mainAxis(side, anchor, floating, sideOffset);
  if (overflows(side, main, floating, viewport, collisionPadding)) {
    const opposite = OPPOSITE[side];
    if (room(opposite, anchor, viewport) > room(side, anchor, viewport)) {
      side = opposite;
      main = mainAxis(side, anchor, floating, sideOffset);
    }
  }

  const vertical = side === "top" || side === "bottom";
  const anchorStart = vertical ? anchor.x : anchor.y;
  const anchorSize = vertical ? anchor.width : anchor.height;
  const size = vertical ? floating.width : floating.height;
  const viewportSize = vertical ? viewport.width : viewport.height;

  let cross =
    align === "start"
      ? anchorStart + alignOffset
      : align === "end"
        ? anchorStart + anchorSize - size - alignOffset
        : anchorStart + (anchorSize - size) / 2 + alignOffset;
  cross = clamp(cross, collisionPadding, viewportSize - size - collisionPadding);

  const x = vertical ? cross : main;
  const y = vertical ? main : cross;
  const result: ComputedPosition = { x, y, side, align };
  if (arrow) {
    const arrowSize = vertical ? arrow.width : arrow.height;
    const offset = clamp(anchorStart + anchorSize / 2 - cross - arrowSize / 2, arrowPadding, size - arrowPadding - arrowSize);
    if (vertical) result.arrowX = offset;
    else result.arrowY = offset;
  }
  return result;
}

export interface UsePositionOptions {
  anchor: RefObject<Element | null>;
  floating: RefObject<HTMLElement | null>;
  arrow?: RefObject<HTMLElement | null>;
  open: boolean;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  arrowPadding?: number;
}

export interface PositionState extends ComputedPosition {
  /** false until the first measurement; render content with visibility:hidden until then. */
  ready: boolean;
}

/**
 * Measures and positions floating content (design 6). State is set only from ResizeObserver,
 * rAF, resize and scroll callbacks; the first measurement comes from ResizeObserver's initial
 * notification (or a rAF without ResizeObserver).
 */
export function usePosition({
  anchor,
  floating,
  arrow,
  open,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 8,
  arrowPadding = 8,
}: UsePositionOptions): PositionState {
  const initial: PositionState = { x: 0, y: 0, side, align, ready: false };
  const [state, setState] = useState<PositionState>(initial);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setState(initial);
  }

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const anchorEl = anchor.current;
    const floatingEl = floating.current;
    if (!anchorEl || !floatingEl) {
      devWarn("position:no-anchor", "Positioned content is open but its anchor or content element is missing.");
      return;
    }
    let frame = 0;
    const update = () => {
      const a = anchorEl.getBoundingClientRect();
      const f = floatingEl.getBoundingClientRect();
      const arrowEl = arrow?.current;
      const next = computePosition(
        { x: a.left, y: a.top, width: a.width, height: a.height },
        { width: f.width, height: f.height },
        { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight },
        {
          side,
          align,
          sideOffset,
          alignOffset,
          collisionPadding,
          arrowPadding,
          arrow: arrowEl ? { width: arrowEl.offsetWidth, height: arrowEl.offsetHeight } : undefined,
        },
      );
      setState((prev) =>
        prev.ready &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.side === next.side &&
        prev.align === next.align &&
        prev.arrowX === next.arrowX &&
        prev.arrowY === next.arrowY
          ? prev
          : { ...next, ready: true },
      );
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      }
    };
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(anchorEl);
      observer.observe(floatingEl);
    } else {
      schedule();
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, anchor, floating, arrow, side, align, sideOffset, alignOffset, collisionPadding, arrowPadding]);

  return state;
}
