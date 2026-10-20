import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useMediaQuery } from "../../src/hooks/use-media-query";
import { setMediaQuery } from "../utils/env";

const QUERY = "(min-width: 640px)";

describe("useMediaQuery", () => {
  it("reads the current match and updates on change events", () => {
    setMediaQuery(QUERY, true);
    const { result } = renderHook(() => useMediaQuery(QUERY));
    expect(result.current).toBe(true);
    act(() => setMediaQuery(QUERY, false));
    expect(result.current).toBe(false);
    act(() => setMediaQuery(QUERY, true));
    expect(result.current).toBe(true);
  });

  it("uses defaultValue for the server snapshot", () => {
    setMediaQuery(QUERY, false);
    function Probe() {
      return createElement("span", null, String(useMediaQuery(QUERY, { defaultValue: true })));
    }
    expect(renderToString(createElement(Probe))).toContain("true");
  });

  it("falls back to defaultValue without matchMedia", () => {
    const original = window.matchMedia;
    // @ts-expect-error simulate a browser without matchMedia
    delete window.matchMedia;
    try {
      const { result } = renderHook(() => useMediaQuery(QUERY, { defaultValue: true }));
      expect(result.current).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  it("supports the legacy addListener API", () => {
    const original = window.matchMedia;
    let listener: (() => void) | undefined;
    let matches = false;
    window.matchMedia = ((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addListener: (fn: () => void) => (listener = fn),
      removeListener: () => (listener = undefined),
    })) as unknown as typeof window.matchMedia;
    try {
      const { result, unmount } = renderHook(() => useMediaQuery(QUERY));
      expect(result.current).toBe(false);
      matches = true;
      act(() => listener?.());
      expect(result.current).toBe(true);
      unmount();
      expect(listener).toBeUndefined();
    } finally {
      window.matchMedia = original;
    }
  });
});
