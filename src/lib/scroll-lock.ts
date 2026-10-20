"use client";

import { getGlobal } from "./global";
import { useIsomorphicLayoutEffect } from "./use-latest-ref";

interface ScrollLockState {
  count: number;
  overflow: string;
  paddingRight: string;
}

const getState = () => getGlobal<ScrollLockState>("scroll-lock", () => ({ count: 0, overflow: "", paddingRight: "" }));

/**
 * Ref-counted body scroll lock (design 6). The first lock saves body overflow/paddingRight and
 * compensates for the scrollbar width; the last unlock restores them. Returns an idempotent unlock.
 */
export function lockScroll(): () => void {
  const state = getState();
  const body = document.body;
  if (state.count === 0) {
    state.overflow = body.style.overflow;
    state.paddingRight = body.style.paddingRight;
    const clientWidth = document.documentElement.clientWidth;
    const scrollbar = clientWidth > 0 ? window.innerWidth - clientWidth : 0;
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbar}px`;
    }
  }
  state.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count--;
    if (state.count === 0) {
      body.style.overflow = state.overflow;
      body.style.paddingRight = state.paddingRight;
    }
  };
}

/** Locks body scroll while enabled. */
export function useScrollLock(enabled: boolean): void {
  useIsomorphicLayoutEffect(() => (enabled ? lockScroll() : undefined), [enabled]);
}
