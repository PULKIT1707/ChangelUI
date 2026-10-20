import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DonutChart, PieChart } from "../../src/charts/pie-chart";
const rows = [
  { name: "Search", share: 42 },
  { name: "Social", share: 21 },
  { name: "Email", share: 12 },
];
describe("PieChart", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<PieChart ref={ref} className="max-w-sm" data={rows} value="share" label="name" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders the final donut on the server", () => {
    const html = renderToString(<DonutChart data={rows} value="share" label="name" />);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-roledescription="chart"');
  });
});
