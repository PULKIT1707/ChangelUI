import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Highlighter } from "../../src/text/highlighter";

describe("Highlighter", () => {
  it("draws a background mark that wraps across lines, with sr-only text", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Highlighter ref={ref}>key point</Highlighter>);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.querySelector(".sr-only")).toHaveTextContent("key point");
    expect(root.querySelector('[aria-hidden="true"]')).toHaveTextContent("key point");
    expect(root.className).toContain("box-decoration-clone");
    expect(root.style.backgroundImage).toBe("linear-gradient(var(--pui-highlight), var(--pui-highlight))");
    expect(root).toHaveAttribute("data-variant", "highlight");
    expect(root).toHaveAttribute("data-state", "drawn");
  });

  it("positions underline and strike marks by strokeWidth", () => {
    const { container, rerender } = render(
      <Highlighter variant="underline" color="var(--x)" strokeWidth={3}>
        u
      </Highlighter>,
    );
    let root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundPosition).toMatch(/^0(px)? 100%$/);
    rerender(<Highlighter variant="strike">s</Highlighter>);
    root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundPosition).toMatch(/^0(px)? 55%$/);
  });

  it("box draws a rotated SVG rect with pathLength", () => {
    const { container } = render(
      <Highlighter variant="box" as="strong">
        boxed
      </Highlighter>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("STRONG");
    const svg = root.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.getAttribute("class")).toContain("-rotate-1");
    expect(svg.querySelector("rect")).not.toBeNull();
  });

  it("keeps rich children accessible as-is", () => {
    const { container } = render(
      <Highlighter>
        <a href="#x">link</a>
      </Highlighter>,
    );
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(container.querySelector("a")?.closest('[aria-hidden="true"]')).toBeNull();
  });
});
