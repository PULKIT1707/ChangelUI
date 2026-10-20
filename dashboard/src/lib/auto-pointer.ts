import { useEffect, type RefObject } from "react";

/**
 * Bento Minis are non-interactive, so pointer-driven effects demo themselves: this moves a
 * synthetic pointer along an ellipse around the element. "element" dispatches bubbling
 * pointermove events on the element (React handlers); "window" dispatches them on window.
 */
export function useAutoPointer(ref: RefObject<HTMLElement | null>, target: "element" | "window" = "element"): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof PointerEvent === "undefined") return;
    let t = 0;
    const id = window.setInterval(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      t += 0.08;
      const init: PointerEventInit = {
        bubbles: true,
        pointerType: "mouse",
        clientX: rect.left + rect.width / 2 + Math.cos(t) * rect.width * 0.4,
        clientY: rect.top + rect.height / 2 + Math.sin(t * 1.3) * rect.height * 0.4,
      };
      if (target === "window") window.dispatchEvent(new PointerEvent("pointermove", init));
      else {
        el.dispatchEvent(new PointerEvent("pointerover", init));
        el.dispatchEvent(new PointerEvent("pointermove", init));
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [ref, target]);
}
