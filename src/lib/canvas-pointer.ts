"use client";
// Pointer position relative to a (pointer-events: none) background element, for canvas draw loops.
// Listens on window so the content above the background keeps its own events. Mouse and pen only.
// Internal: not exported from the package.
import { useEffect, useRef, type RefObject } from "react";
export interface CanvasPointer {
  /** CSS px relative to the element's top-left corner. */
  x: number;
  y: number;
  /** True while the pointer is over the element's box. */
  inside: boolean;
}
export function useCanvasPointer(elementRef: RefObject<Element | null>, enabled: boolean): RefObject<CanvasPointer> {
  const pointer = useRef<CanvasPointer>({ x: 0, y: 0, inside: false });
  useEffect(() => {
    const el = elementRef.current;
    if (!enabled || !el) return;
    const state = pointer.current;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      state.x = event.clientX - rect.left;
      state.y = event.clientY - rect.top;
      state.inside = state.x >= 0 && state.y >= 0 && state.x <= rect.width && state.y <= rect.height;
    };
    const onLeave = () => {
      state.inside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      state.inside = false;
    };
  }, [elementRef, enabled]);
  return pointer;
}
