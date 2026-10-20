import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartExport } from "../../src/charts/chart-export";
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
describe("ChartExport", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ChartExport ref={ref} className="max-w-sm"><svg viewBox="0 0 10 10" /></ChartExport>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders on the server", () => {
    const html = renderToString(<ChartExport ><svg viewBox="0 0 10 10" /></ChartExport>);
    expect(html).toContain('role="toolbar"');
  });
});
