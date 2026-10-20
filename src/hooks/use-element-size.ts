"use client";
import { useEffect, useState, type RefObject } from "react";

export interface UseElementSizeOptions {
  /** Which box to measure. Default "content-box" (excludes padding and border). */
  box?: "content-box" | "border-box";
  /** Round to whole pixels so sub-pixel jitter doesn't re-render. Default true. */
  round?: boolean;
}

export interface UseElementSizeResult {
  /** px; 0 on the server and before the first measurement. */
  width: number;
  height: number;
}

const ZERO: UseElementSizeResult = { width: 0, height: 0 };

/**
 * The element's size as state, kept current by a ResizeObserver (charts, beams, carousels).
 * SSR-safe: returns { width: 0, height: 0 } until the element is measured on the client.
 */
export function useElementSize(
  ref: RefObject<Element | null>,
  { box = "content-box", round = true }: UseElementSizeOptions = {},
): UseElementSizeResult {
  const [size, setSize] = useState<UseElementSizeResult>(ZERO);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const boxSize = box === "border-box" ? entry.borderBoxSize?.[0] : entry.contentBoxSize?.[0];
      let width = boxSize ? boxSize.inlineSize : entry.contentRect.width;
      let height = boxSize ? boxSize.blockSize : entry.contentRect.height;
      if (round) {
        width = Math.round(width);
        height = Math.round(height);
      }
      // The observer fires once on observe(), so the first measurement needs no synchronous setState.
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(el, { box });
    return () => observer.disconnect();
  }, [ref, box, round]);
  return size;
}
