import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BumpChart } from "../../src/charts/bump-chart";
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
describe("BumpChart", () => {
  it("renders a chart figure", () => {
    const { container } = render(<BumpChart data={ranked} x="p" series="t" value="v" />);
    expect(container.querySelector("figure")).not.toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<BumpChart data={ranked} x="p" series="t" value="v" />)).toContain("figure");
  });
});
