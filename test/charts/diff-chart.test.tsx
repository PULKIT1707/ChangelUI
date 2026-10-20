import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiffChart, diffStats } from "../../src/charts/diff-chart";
const rows = [
  { m: "Jan", a: 3, b: 4 },
  { m: "Feb", a: 6, b: 4 },
  { m: "Mar", a: 5, b: 5 },
  { m: "Apr", a: 2, b: 5 },
];
describe("DiffChart", () => {
  it("renders a chart figure", () => {
    const { container } = render(<DiffChart data={rows} x="m" a="a" b="b" />);
    expect(container.querySelector("figure")).not.toBeNull();
  });
  it("counts sides and exact crossings", () => {
    const s = diffStats([3, 6, 5, 2], [4, 4, 5, 5]);
    expect(s.above).toBe(1);
    expect(s.below).toBe(2);
    expect(s.crossings.length).toBe(2);
  });
  it("renders on the server", () => {
    expect(renderToString(<DiffChart data={rows} x="m" a="a" compare="previous-period" />)).toContain("figure");
  });
});
