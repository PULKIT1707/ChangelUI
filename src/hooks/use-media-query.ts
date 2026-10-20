"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface UseMediaQueryOptions {
  /** Server snapshot, and the value when matchMedia is missing. Default false. */
  defaultValue?: boolean;
}

function getList(query: string): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
}

/** Subscribes to a CSS media query (design 8 #61). */
export function useMediaQuery(query: string, { defaultValue = false }: UseMediaQueryOptions = {}): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = getList(query);
      if (!list) return () => {};
      if (typeof list.addEventListener === "function") {
        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
      }
      // Safari < 14
      list.addListener(onChange);
      return () => list.removeListener(onChange);
    },
    [query],
  );
  const getSnapshot = () => getList(query)?.matches ?? defaultValue;
  const getServerSnapshot = () => defaultValue;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
