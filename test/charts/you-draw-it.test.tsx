import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { YouDrawIt } from "../../src/charts/you-draw-it";
const rows = [
  { m: "Jan", a: 3 },
  { m: "Feb", a: 5 },
  { m: "Mar", a: 4 },
  { m: "Apr", a: 8 },
];
const frames = [
  { time: 2024, values: { a: 3, b: 5 } },
  { time: 2025, values: { a: 6, b: 4 } },
];
void rows;
void frames;
describe("YouDrawIt", () => {
  it("renders a chart figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<YouDrawIt data={rows} x="m" y="a" revealFrom={2} ref={ref} className="max-w-sm" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });
  it("renders under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <YouDrawIt data={rows} x="m" y="a" revealFrom={2} />
      </MotionConfig>,
    );
    expect(container.querySelector("figure")).not.toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<YouDrawIt data={rows} x="m" y="a" revealFrom={2} />)).toContain("<figure");
  });
});
