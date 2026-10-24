import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadialBarChart } from "../../src/charts/radial-bar-chart";
const data = [
  { label: "Chrome", value: 275 },
  { label: "Safari", value: 200 },
  { label: "Firefox", value: 90 },
];
describe("RadialBarChart", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<RadialBarChart ref={ref} data={data} className="max-w-sm" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("max-w-sm");
    expect(container.innerHTML).not.toContain('d="undefined"');
  });
  it("exposes a meter per bar and pins from the legend (a11y)", () => {
    render(<RadialBarChart data={[{ label: "Storage", value: 30, max: 40 }]} />);
    expect(screen.getByRole("meter", { name: "Storage" })).toHaveAttribute("aria-valuetext", "Storage: 30 of 40, 75%");
    const button = screen.getByRole("button", { name: "Storage: 30 of 40, 75%" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
  it("renders on the server and crops a half sweep", () => {
    const html = renderToString(<RadialBarChart data={data} sweep={180} startAngle={-90} size={200} />);
    expect(html).toMatch(/viewBox="0 0 200 1\d\d/);
    expect(renderToString(<RadialBarChart data={[]} />)).toContain("Radial bar chart: no data.");
  });
});
