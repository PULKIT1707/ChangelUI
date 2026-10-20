import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScatterChart } from "../../src/charts/scatter-chart";
const rows = [
  { spend: 10, revenue: 32, team: "A" },
  { spend: 20, revenue: 48, team: "B" },
  { spend: 30, revenue: 71, team: "A" },
];
describe("ScatterChart", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ScatterChart ref={ref} className="max-w-sm" data={rows} x="spend" y="revenue" series="team" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders the final chart on the server", () => {
    const html = renderToString(<ScatterChart data={rows} x="spend" y="revenue" trend="linear" />);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-roledescription="chart"');
  });
});
