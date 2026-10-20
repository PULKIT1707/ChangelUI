import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParallelCoordinates } from "../../src/charts/parallel-coordinates";

const rows = [{ a: 1, b: 4 }, { a: 3, b: 2 }];

describe("ParallelCoordinates", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ParallelCoordinates ref={ref} className="max-w-sm" data={rows} dimensions={[{ key: "a" }, { key: "b" }]} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<ParallelCoordinates data={rows} dimensions={[{ key: "a" }, { key: "b" }]} />);
    expect(html).toContain("aria-roledescription");
  });
});
