import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BoxPlot } from "../../src/charts/box-plot";
const rows = [
  { g: "A", v: 3 },
  { g: "A", v: 5 },
  { g: "A", v: 4 },
  { g: "B", v: 8 },
  { g: "B", v: 6 },
];
const steps = [
  { label: "Visit", value: 1000 },
  { label: "Signup", value: 400 },
  { label: "Paid", value: 90 },
];
const bridge = [
  { label: "Start", value: 100 },
  { label: "Sales", value: 40 },
  { label: "Costs", value: -25 },
];
void rows;
void steps;
void bridge;
describe("BoxPlot", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<BoxPlot ref={ref} className="max-w-sm" data={rows} group="g" value="v" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders on the server", () => {
    const html = renderToString(<BoxPlot data={rows} group="g" value="v" />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
