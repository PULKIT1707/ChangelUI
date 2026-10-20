import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadarChart } from "../../src/charts/radar-chart";
const rows = [
  { name: "Speed", a: 4, b: 0.2 },
  { name: "Range", a: 7, b: 0.4 },
  { name: "Comfort", a: 5, b: 0.3 },
];
const items = [
  { label: "/home", value: 420 },
  { label: "/pricing", value: 210 },
];
const cells = [
  { x: "Mon", y: "AM", v: 3 },
  { x: "Tue", y: "AM", v: 5 },
  { x: "Mon", y: "PM", v: 8 },
];
void rows;
void items;
void cells;
describe("RadarChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement & HTMLDivElement>();
    const { container } = render(<RadarChart ref={ref} className="max-w-sm" data={rows} axis="name" series={[{ id: "a", value: "a" }]} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders the final chart on the server", () => {
    const html = renderToString(<RadarChart data={rows} axis="name" series={[{ id: "a", value: "a" }]} />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
