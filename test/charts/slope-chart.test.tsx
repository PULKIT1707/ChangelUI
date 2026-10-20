import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SlopeChart } from "../../src/charts/slope-chart";
const rows = [
  { m: "Jan", a: 3, b: 4 },
  { m: "Feb", a: 6, b: 4 },
  { m: "Mar", a: 5, b: 5 },
  { m: "Apr", a: 2, b: 5 },
];
const ranked = [
  { p: 2024, t: "A", v: 3 },
  { p: 2024, t: "B", v: 5 },
  { p: 2025, t: "A", v: 6 },
  { p: 2025, t: "B", v: 4 },
];
void rows;
void ranked;
describe("SlopeChart", () => {
  it("renders a chart figure", () => {
    const { container } = render(<SlopeChart data={rows} label="m" from="b" to="a" />);
    expect(container.querySelector("figure")).not.toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<SlopeChart data={rows} label="m" from="b" to="a" />)).toContain("figure");
  });
});
