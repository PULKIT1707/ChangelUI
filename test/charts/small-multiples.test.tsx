import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SmallMultiples, facetRows } from "../../src/charts/small-multiples";
const rows = [
  { g: "A", t: 0, v: 3 },
  { g: "A", t: 1, v: 5 },
  { g: "B", t: 0, v: 4 },
  { g: "B", t: 1, v: 8 },
];
describe("SmallMultiples", () => {
  it("renders one facet per group", () => {
    const { getAllByRole } = render(<SmallMultiples data={rows} facet="g" x="t" y="v" />);
    expect(getAllByRole("listitem")).toHaveLength(2);
  });
  it("groups rows with stats", () => {
    const groups = facetRows(rows, "g", "v");
    expect(groups.map((g) => g.stats.last)).toEqual([5, 8]);
  });
  it("renders on the server", () => {
    expect(renderToString(<SmallMultiples data={rows} facet="g" x="t" y="v" />)).toContain("A");
  });
});
