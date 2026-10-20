import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useScrollVelocity } from "../../src/hooks/use-scroll-velocity";
describe("useScrollVelocity", () => {
  it("starts at 0", () => {
    const { result } = renderHook(() => useScrollVelocity());
    expect(result.current.get()).toBe(0);
  });
  it("renders 0 on the server", () => {
    function Probe() {
      return createElement("span", null, String(useScrollVelocity({ smooth: false }).get()));
    }
    expect(renderToString(createElement(Probe))).toContain("0");
  });
});
