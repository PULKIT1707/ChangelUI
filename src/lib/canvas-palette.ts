"use client";
// Cached CSS -> canvas color resolution for canvas backgrounds. Colors (token vars, color-mix, ...)
// resolve through probes under the host, so presets and .dark islands apply, and re-resolve when the
// page theme changes or the colors change. Internal: not exported from the package.
import { useEffect, useRef, type RefObject } from "react";
import { observeTheme, resolveCssColors } from "./css-color";
import { useLatestRef } from "./use-latest-ref";
/**
 * Returns a stable `read(fallback)` for draw callbacks. `undefined` entries in `colors` resolve to
 * `fallback` (usually the canvas frame's computed `color`). Call `read` from effects or rAF only.
 */
export function useCanvasPalette(
  hostRef: RefObject<Element | null>,
  colors: readonly (string | undefined)[],
): (fallback: string) => string[] {
  const colorsRef = useLatestRef(colors);
  const tick = useRef(0);
  const cache = useRef<{ key: string; values: string[] }>({ key: "", values: [] });
  useEffect(
    () =>
      observeTheme(() => {
        tick.current += 1;
      }),
    [],
  );
  const read = useRef((fallback: string): string[] => {
    const list = colorsRef.current;
    const key = `${tick.current}|${fallback}|${list.join(",")}`;
    if (cache.current.key === key) return cache.current.values;
    const host = hostRef.current;
    const values = host
      ? resolveCssColors(
          host,
          list.map((c) => c ?? fallback),
        ).map((value, i) => (list[i] === undefined ? fallback : value))
      : list.map((c) => c ?? fallback);
    cache.current = { key, values };
    return values;
  });
  return read.current;
}
