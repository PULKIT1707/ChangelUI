import { renderHook } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { usePrefersReducedMotion } from "../../src/hooks/use-prefers-reduced-motion";
describe("usePrefersReducedMotion", () => {
  it("is true under MotionConfig reducedMotion=always", () => {
    const wrapper = ({ children }: { children: ReactNode }) => createElement(MotionConfig, { reducedMotion: "always" }, children);
    const { result } = renderHook(() => usePrefersReducedMotion(), { wrapper });
    expect(result.current).toBe(true);
  });
  it("is false on the server", () => {
    function Probe() {
      return createElement("span", null, String(usePrefersReducedMotion()));
    }
    expect(renderToString(createElement(Probe))).toContain("false");
  });
});
