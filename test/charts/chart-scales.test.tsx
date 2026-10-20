import { describe, expect, it } from "vitest";
import { linePath, scaleLinear, ticks } from "../../src/charts/chart-scales";
describe("chart-scales", () => {
  it("exposes the pure chart math", () => {
    expect(scaleLinear([0, 10], [0, 100])(5)).toBe(50);
    expect(ticks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(linePath([[0, 0], [10, 10]], { curve: "linear" }).startsWith("M0,0")).toBe(true);
  });
});
