import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { DotPattern } from "../../src/backgrounds/dot-pattern";

describe("DotPattern", () => {
  it("is a decorative SVG with a unique, url-safe pattern id", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <div>
        <DotPattern ref={ref} gap={20} dotSize={2} />
        <DotPattern mask="none" />
      </div>,
    );
    const [first, second] = [...container.querySelectorAll("svg")];
    expect(ref.current).toBe(first);
    expect(first).toHaveAttribute("aria-hidden", "true");
    const cls = first?.getAttribute("class") ?? "";
    expect(cls).toContain("pointer-events-none");
    expect(cls).toContain("absolute");
    expect(cls).toContain("inset-0");
    expect(cls).toContain("[mask-image:radial-gradient");
    expect(second?.getAttribute("class")).not.toContain("mask-image");
    const pattern = first?.querySelector("pattern");
    const id = pattern?.getAttribute("id") ?? "";
    expect(id).toMatch(/^pui-dots-[A-Za-z0-9_-]+$/);
    expect(id).not.toBe(second?.querySelector("pattern")?.getAttribute("id"));
    expect(first?.querySelector("rect")).toHaveAttribute("fill", `url(#${id})`);
    expect(pattern).toHaveAttribute("width", "20");
    expect(pattern?.querySelector("circle")).toHaveAttribute("r", "2");
  });
});
