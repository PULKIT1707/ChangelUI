import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { GridPattern } from "../../src/backgrounds/grid-pattern";

describe("GridPattern", () => {
  it("draws grid cells and highlighted squares", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <GridPattern
        ref={ref}
        cellSize={20}
        mask="fade-bottom"
        strokeDasharray="4 2"
        squares={[
          [1, 2],
          [3, 0],
        ]}
      />,
    );
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(ref.current).toBe(svg);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.getAttribute("class")).toContain("[mask-image:linear-gradient(to_bottom,black_40%,transparent)]");
    expect(svg.querySelector("pattern")?.getAttribute("id")).toMatch(/^pui-grid-/);
    expect(svg.querySelector("path")).toHaveAttribute("stroke-dasharray", "4 2");
    const squares = svg.querySelectorAll("[data-pui-grid-square]");
    expect(squares).toHaveLength(2);
    expect(squares[0]).toHaveAttribute("x", "20");
    expect(squares[0]).toHaveAttribute("y", "40");
    expect(squares[0]?.getAttribute("class")).toBe("fill-pui-muted");
  });
});
