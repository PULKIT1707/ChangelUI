import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarHeatmap } from "../../src/charts/calendar-heatmap";

const rows = [{ d: "2026-01-02", c: 3 }, { d: "2026-01-05", c: 8 }];

describe("CalendarHeatmap", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<CalendarHeatmap ref={ref} className="max-w-sm" data={rows} date="d" value="c" year={2026} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<CalendarHeatmap data={rows} date="d" value="c" year={2026} />);
    expect(html).toContain("aria-roledescription");
  });
});
