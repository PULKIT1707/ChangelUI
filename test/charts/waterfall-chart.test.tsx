import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WaterfallChart } from "../../src/charts/waterfall-chart";
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
describe("WaterfallChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<WaterfallChart ref={ref} className="max-w-sm" data={bridge} label="label" value="value" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders on the server", () => {
    const html = renderToString(<WaterfallChart data={bridge} label="label" value="value" />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
