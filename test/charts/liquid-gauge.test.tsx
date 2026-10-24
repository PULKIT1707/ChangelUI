import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiquidGauge, liquidPath } from "../../src/charts/liquid-gauge";
describe("LiquidGauge", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<LiquidGauge ref={ref} className="max-w-sm" value={62} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("max-w-sm");
  });
  it("is a meter (a11y)", () => {
    render(<LiquidGauge value={62} label="Storage" />);
    expect(screen.getByRole("meter", { name: "Storage" })).toHaveAttribute("aria-valuetext", "62 of 100 (62%)");
  });
  it("builds a closed liquid path and renders on the server", () => {
    expect(liquidPath(50, 4, 0)).toMatch(/^M.*Z$/);
    expect(renderToString(<LiquidGauge value={40} />)).toContain("40%");
  });
});
