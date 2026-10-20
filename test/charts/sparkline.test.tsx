import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sparkline } from "../../src/charts/sparkline";

const data = [3, 5, 4, 8, 6, 9];

describe("Sparkline", () => {
  it("renders a figure with a smooth line, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Sparkline ref={ref} data={data} className="max-w-sm" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root).toHaveAttribute("data-points", "6");
    expect(root?.className).toContain("max-w-sm");
    const line = container.querySelector('path[fill="none"]');
    expect(line?.getAttribute("d")?.startsWith("M8,")).toBe(true);
    expect(line?.getAttribute("d")).toContain("C");
  });

  it("names the chart with a generated summary (a11y)", () => {
    render(<Sparkline data={data} label="Signups" />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Signups rises 200% from 3 (point 1) to 9 (point 6). Peak 9 in point 6; low 3 in point 1.",
    );
  });

  it("is a static chart, identical under reduced motion", () => {
    const plain = render(<Sparkline data={data} />).container.innerHTML;
    const reduced = render(
      <MotionConfig reducedMotion="always">
        <Sparkline data={data} />
      </MotionConfig>,
    ).container.innerHTML;
    expect(reduced).toBe(plain);
  });

  it("renders the final chart on the server, and copes with no data", () => {
    const html = renderToString(<Sparkline data={data} height={90} />);
    expect(html).toContain('viewBox="0 0 320 90"');
    expect(html).toContain('d="M8,');
    expect(renderToString(<Sparkline data={[]} />)).toContain("Trend: no data.");
  });
});
