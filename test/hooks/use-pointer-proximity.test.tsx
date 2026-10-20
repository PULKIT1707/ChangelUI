import { renderHook } from "@testing-library/react";
import { createElement, useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { usePointerProximity } from "../../src/hooks/use-pointer-proximity";
describe("usePointerProximity", () => {
  it("rests at the radius with zero proximity", () => {
    const { result } = renderHook(() => usePointerProximity(useRef<HTMLDivElement>(null), { radius: 120 }));
    expect(result.current.distance.get()).toBe(120);
    expect(result.current.proximity.get()).toBe(0);
  });
  it("renders resting values on the server", () => {
    function Probe() {
      const { proximity } = usePointerProximity(useRef<HTMLDivElement>(null));
      return createElement("span", null, String(proximity.get()));
    }
    expect(renderToString(createElement(Probe))).toContain("0");
  });
});
