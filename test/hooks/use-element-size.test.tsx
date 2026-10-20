import { renderHook } from "@testing-library/react";
import { createElement, useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useElementSize } from "../../src/hooks/use-element-size";
describe("useElementSize", () => {
  it("starts at zero before measuring", () => {
    const { result } = renderHook(() => useElementSize(useRef<HTMLDivElement>(null)));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });
  it("renders zero on the server", () => {
    function Probe() {
      const size = useElementSize(useRef<HTMLDivElement>(null));
      return createElement("span", null, `${size.width}x${size.height}`);
    }
    expect(renderToString(createElement(Probe))).toContain("0x0");
  });
});
