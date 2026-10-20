"use client";

import { useEffect, useState, type RefObject } from "react";
import { useLatestRef } from "../lib/use-latest-ref";

export interface UseMousePositionOptions {
  /** Element for elementX/elementY/isInside. Without it they mirror the viewport position. */
  target?: RefObject<HTMLElement | null>;
  /** Default true. */
  enabled?: boolean;
}

export interface MousePosition {
  /** Viewport coordinates (clientX/clientY). */
  x: number;
  y: number;
  /** Coordinates relative to the target's top-left corner. */
  elementX: number;
  elementY: number;
  /** Whether the pointer is inside the target (always true without a target, after the first move). */
  isInside: boolean;
}

const INITIAL: MousePosition = { x: 0, y: 0, elementX: 0, elementY: 0, isInside: false };

/** Tracks the pointer with a passive window listener, throttled to one update per frame (design 8 #64). */
export function useMousePosition({ target, enabled = true }: UseMousePositionOptions = {}): MousePosition {
  const [position, setPosition] = useState<MousePosition>(INITIAL);
  const targetRef = useLatestRef(target);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const flush = () => {
      frame = 0;
      if (!last) return;
      const { clientX: x, clientY: y } = last;
      const el = targetRef.current?.current;
      if (!el) {
        setPosition({ x, y, elementX: x, elementY: y, isInside: true });
        return;
      }
      const rect = el.getBoundingClientRect();
      const elementX = x - rect.left;
      const elementY = y - rect.top;
      const isInside = elementX >= 0 && elementY >= 0 && elementX <= rect.width && elementY <= rect.height;
      setPosition({ x, y, elementX, elementY, isInside });
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, targetRef]);

  return position;
}
