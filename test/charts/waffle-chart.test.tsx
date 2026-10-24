import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WaffleChart, waffleRatio, waffleUnits } from "../../src/charts/waffle-chart";
const data = [
  { label: "Mobile", value: 58 },
  { label: "Desktop", value: 34 },
  { label: "Tablet", value: 8 },
];
describe("WaffleChart", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<WaffleChart ref={ref} data={data} className="max-w-sm" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
    expect(container.querySelectorAll("[data-unit]")).toHaveLength(100);
  });
  it("splits units with the largest remainder so they add up", () => {
    expect(waffleUnits([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(waffleUnits([30], 100, 100)).toEqual([30]);
    expect(waffleRatio(30, 100)).toBe("3 in 10");
    expect(waffleRatio(34, 100)).toBe("34 in 100");
  });
  it("labels the legend chips (a11y)", () => {
    render(<WaffleChart data={data} unit="visitors" />);
    expect(screen.getByRole("button", { name: /Mobile: 58/ })).toHaveAttribute("aria-pressed", "false");
  });
  it("renders the final chart on the server", () => {
    const html = renderToString(<WaffleChart data={data} />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
