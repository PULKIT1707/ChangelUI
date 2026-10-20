import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusTracker } from "../../src/charts/status-tracker";

const rows = [{ date: "2026-01-01", status: "up" }, { date: "2026-01-02", status: "down" }];

describe("StatusTracker", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<StatusTracker ref={ref} className="max-w-sm" items={rows} label="API" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<StatusTracker items={rows} label="API" />);
    expect(html).toContain("aria-roledescription");
  });
});
