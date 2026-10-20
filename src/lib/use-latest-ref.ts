"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/** useLayoutEffect on the client, useEffect on the server (avoids the SSR warning). */
export const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Ref that always holds the latest value. Written in a layout effect, never during render.
 * The returned ref is stable; list it in dependency arrays (design 6).
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
