"use client";

import { useEffect, type RefObject } from "react";
import { useLatestRef } from "../lib/use-latest-ref";

type ElementRef = RefObject<HTMLElement | null>;

export interface UseClickOutsideOptions {
  /** Default true. */
  enabled?: boolean;
  /** Default "pointerdown". */
  event?: "pointerdown" | "click";
}

function toList(refs: ElementRef | ReadonlyArray<ElementRef>): ReadonlyArray<ElementRef> {
  return "current" in refs ? [refs] : refs;
}

/**
 * Calls handler when a pointer event lands outside every given element (design 8 #62).
 * Capture-phase document listener; shadow-DOM safe via composedPath(); ignores disconnected targets.
 */
export function useClickOutside(
  refs: ElementRef | ReadonlyArray<ElementRef>,
  handler: (event: PointerEvent) => void,
  { enabled = true, event = "pointerdown" }: UseClickOutsideOptions = {},
): void {
  const handlerRef = useLatestRef(handler);
  const refsRef = useLatestRef(refs);

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Node) || !target.isConnected) return;
      const path = e.composedPath();
      const inside = toList(refsRef.current).some((ref) => {
        const el = ref.current;
        return el !== null && (path.includes(el) || el.contains(target));
      });
      if (!inside) handlerRef.current(e as PointerEvent);
    };
    document.addEventListener(event, listener, true);
    return () => document.removeEventListener(event, listener, true);
  }, [enabled, event, handlerRef, refsRef]);
}
