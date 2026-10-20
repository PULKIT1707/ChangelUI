import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useScrollDirection } from "../../src/hooks/use-scroll-direction";
describe("useScrollDirection", () => {
  it('starts at "top"', () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current).toBe("top");
  });
  it('renders "top" on the server', () => {
    function Probe() {
      return createElement("span", null, useScrollDirection({ threshold: 4 }));
    }
    expect(renderToString(createElement(Probe))).toContain("top");
  });
});
