"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useLatestRef } from "../lib/use-latest-ref";

export interface UseFocusTrapOptions {
  /** Default true. */
  active?: boolean;
  /** Ref, "first" (default: [data-autofocus], then the first tabbable) or "container". */
  initialFocus?: RefObject<HTMLElement | null> | "first" | "container";
  /** true (default) returns focus to the element focused at activation; a ref returns it there. */
  returnFocus?: boolean | RefObject<HTMLElement | null>;
}

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
  "audio[controls]",
  "video[controls]",
].join(",");

/** Hidden via [hidden], [inert], display:none or visibility:hidden on itself or an ancestor up to the container. */
function isHidden(el: Element, container: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node.hasAttribute("hidden") || node.hasAttribute("inert") || (node as HTMLElement).inert === true) return true;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (node === container) break;
  }
  return false;
}

/** Tabbable elements inside container, in DOM order (no getClientRects, so it works in jsdom). */
function getTabbables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !isHidden(el, container),
  );
}

function focus(el: HTMLElement | null | undefined): void {
  el?.focus({ preventScroll: true });
}

function focusContainer(container: HTMLElement): void {
  if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
  focus(container);
}

/** Keeps Tab focus inside container while active (design 6, 8 #65). */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active = true, initialFocus = "first", returnFocus = true }: UseFocusTrapOptions = {},
): void {
  const optionsRef = useLatestRef({ initialFocus, returnFocus });
  // Survives StrictMode's effect re-run, which starts with focus already inside the container.
  const returnTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement && !container.contains(activeEl)) returnTargetRef.current = activeEl;
    let lastFocused: HTMLElement | null = null;

    if (!container.contains(document.activeElement)) {
      const initial = optionsRef.current.initialFocus;
      if (typeof initial === "object" && initial.current) focus(initial.current);
      else if (initial === "container") focusContainer(container);
      else {
        const target = container.querySelector<HTMLElement>("[data-autofocus]") ?? getTabbables(container)[0];
        if (target) focus(target);
        else focusContainer(container);
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const tabbables = getTabbables(container);
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const current = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
        focusContainer(container);
      } else if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        focus(last);
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        focus(first);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && container.contains(target)) {
        lastFocused = target;
        return;
      }
      const fallback = lastFocused?.isConnected ? lastFocused : getTabbables(container)[0];
      if (fallback) focus(fallback);
      else focusContainer(container);
    };

    // Read at deactivation on purpose: the latest returnFocus option wins.
    const latestReturnFocus = () => optionsRef.current.returnFocus;

    container.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      const option = latestReturnFocus();
      const target = typeof option === "object" ? option.current : option ? returnTargetRef.current : null;
      if (target?.isConnected) focus(target);
    };
  }, [active, containerRef, optionsRef]);
}
