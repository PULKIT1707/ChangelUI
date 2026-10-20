import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor } from "./color";

describe("color", () => {
  it("parses oklch and rgb", () => {
    expect(parseColor("oklch(1 0 0)")?.map((c) => Math.round(c * 1000) / 1000)).toEqual([1, 1, 1]);
    expect(parseColor("rgb(0, 0, 0)")).toEqual([0, 0, 0]);
    expect(parseColor("rgb(255 255 255)")).toEqual([1, 1, 1]);
    expect(parseColor("oklch(0.5 0.1 250 / 0.4)")).toBeNull();
    expect(parseColor("rgba(0, 0, 0, 0.5)")).toBeNull();
    expect(parseColor("")).toBeNull();
    expect(parseColor("var(--x)")).toBeNull();
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")).toBeCloseTo(21, 5);
    expect(contrastRatio("oklch(0.141 0.005 285.823)", "oklch(1 0 0)")).toBeGreaterThan(15);
    expect(contrastRatio("nope", "oklch(1 0 0)")).toBeNull();
  });
});
