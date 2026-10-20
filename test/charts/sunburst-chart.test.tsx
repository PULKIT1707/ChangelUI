import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SunburstChart } from "../../src/charts/sunburst-chart";
const tree = {
  name: "All",
  value: 0,
  children: [
    { name: "Tech", value: 0, children: [{ name: "Apple", value: 30 }, { name: "Microsoft", value: 28 }] },
    { name: "Energy", value: 12 },
  ],
};
describe("SunburstChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<SunburstChart ref={ref} className="max-w-sm" data={tree} value="value" label="name" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders on the server", () => {
    const html = renderToString(<SunburstChart data={tree} value="value" label="name" />);
    expect(html).toContain('aria-roledescription="chart"');
  });
});
