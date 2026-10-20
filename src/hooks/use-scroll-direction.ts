"use client";
import { useEffect, useState, type RefObject } from "react";
import { useLatestRef } from "../lib/use-latest-ref";

/** "top" while within `topOffset` of the start, otherwise the direction of the last real move. */
export type ScrollDirection = "up" | "down" | "top";

export interface UseScrollDirectionOptions {
  /** Pixels of travel before the direction flips (ignores trackpad jitter). Default 8. */
  threshold?: number;
  /** Scroll offset that still counts as "top". Default 0. */
  topOffset?: number;
  /** Scroll box to watch. Default: the window. */
  container?: RefObject<HTMLElement | null>;
  /** Default true. */
  enabled?: boolean;
}

export type UseScrollDirectionResult = ScrollDirection;

/**
 * "up" / "down" / "top" for hide-on-scroll headers and shrinking navbars. Reads scroll position in
 * a passive listener, at most once per frame, and re-renders only when the direction changes.
 * SSR-safe: "top" on the server.
 */
export function useScrollDirection({
  threshold = 8,
  topOffset = 0,
  container,
  enabled = true,
}: UseScrollDirectionOptions = {}): UseScrollDirectionResult {
  const [direction, setDirection] = useState<ScrollDirection>("top");
  const containerRef = useLatestRef(container);
  useEffect(() => {
    if (!enabled) return;
    const box = containerRef.current?.current ?? null;
    const target: HTMLElement | Window = box ?? window;
    const read = () => (box ? box.scrollTop : window.scrollY);
    let anchor = read();
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = read();
      if (y <= topOffset) {
        anchor = y;
        setDirection("top");
        return;
      }
      const delta = y - anchor;
      if (Math.abs(delta) < threshold) return;
      anchor = y;
      setDirection(delta > 0 ? "down" : "up");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    // Pick up a restored scroll position (reload, back navigation) without a synchronous setState.
    frame = requestAnimationFrame(update);
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, threshold, topOffset, containerRef]);
  return enabled ? direction : "top";
}
