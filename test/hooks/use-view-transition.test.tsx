import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { supportsViewTransitions, useViewTransition } from "../../src/hooks/use-view-transition";
describe("useViewTransition", () => {
  it("runs the update directly when the API is missing", async () => {
    const { result } = renderHook(() => useViewTransition());
    const update = vi.fn();
    const handle = result.current(update);
    expect(update).toHaveBeenCalledOnce();
    expect(handle.skipped).toBe(supportsViewTransitions() ? false : true);
    await expect(handle.ready).resolves.toBe(false);
  });
  it("keeps run stable across renders", () => {
    const { result, rerender } = renderHook(() => useViewTransition());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
  it("renders on the server", () => {
    function Probe() {
      return createElement("span", null, typeof useViewTransition());
    }
    expect(renderToString(createElement(Probe))).toContain("function");
  });
});
