import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LineChart } from "../../src/charts/line-chart";

const rows = [
  { month: "Jan", revenue: 30, cost: 20 },
  { month: "Feb", revenue: 50, cost: 26 },
  { month: "Mar", revenue: 40, cost: 31 },
  { month: "Apr", revenue: 80, cost: 35 },
];

describe("LineChart", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<LineChart ref={ref} className="max-w-sm" data={rows} x="month" series={[{ id: "revenue", y: "revenue" }]} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders the final chart on the server", () => {
    const html = renderToString(<LineChart data={rows} x="month" series={[{ id: "revenue", y: "revenue" }]} />);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-roledescription="chart"');
  });
});
