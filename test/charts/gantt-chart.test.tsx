import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GanttChart } from "../../src/charts/gantt-chart";

const rows = [{ id: "a", name: "Design", start: "2026-01-05", end: "2026-01-09" }, { id: "b", name: "Build", start: "2026-01-12", end: "2026-01-23", dependsOn: ["a"] }];

describe("GanttChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<GanttChart ref={ref} className="max-w-sm" tasks={rows} today="2026-01-08" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<GanttChart tasks={rows} today="2026-01-08" />);
    expect(html).toContain("aria-roledescription");
  });
});
