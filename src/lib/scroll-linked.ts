"use client";
// Shared helpers for scroll-linked effects (roadmap I-11): the sticky "viewport" of a scroll scene is
// the window by default, or the scroll box passed as `container`, whose height is measured here.
import { useEffect, useState, type RefObject } from "react";

/**
 * Height in px of `container` (tracked with a ResizeObserver), or undefined when there is no
 * container, before the first measurement, and on the server. Use undefined to mean "100vh".
 */
export function useContainerHeight(container: RefObject<HTMLElement | null> | undefined): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = container?.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [container]);
  return container ? height : undefined;
}

/** CSS length for a sticky scene viewport: the measured container height, else the full viewport. */
export function sceneHeight(measured: number | undefined, override?: string): string {
  if (override) return override;
  return measured !== undefined ? `${measured}px` : "100vh";
}
