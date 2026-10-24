import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathDraw } from "../../src/effects/path-draw";
function Drawing() {
  return (
    <svg viewBox="0 0 100 20" aria-label="Signature" role="img">
      <path d="M0 10h100" stroke="currentColor" fill="none" />
    </svg>
  );
}
afterEach(() => {
  Reflect.deleteProperty(SVGElement.prototype, "getTotalLength");
});
describe("PathDraw", () => {
  it("renders a div around the drawing, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PathDraw ref={ref} className="mt-4">
        <Drawing />
      </PathDraw>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root).toHaveAttribute("data-trigger", "inView");
    expect(root?.className).toContain("mt-4");
  });
  it("keeps the drawing's own semantics (a11y)", () => {
    render(
      <PathDraw>
        <Drawing />
      </PathDraw>,
    );
    expect(screen.getByRole("img", { name: "Signature" })).toBeVisible();
  });
  it("measures strokes and finishes drawn when animations are unavailable", async () => {
    Object.defineProperty(SVGElement.prototype, "getTotalLength", { value: () => 100, configurable: true });
    const onComplete = vi.fn();
    const { container } = render(
      <PathDraw trigger="mount" onComplete={onComplete}>
        <Drawing />
      </PathDraw>,
    );
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const path = container.querySelector("path") as SVGPathElement;
    expect(path.style.strokeDashoffset).toBe("");
    expect(path.style.opacity).toBe("");
  });
  it("leaves the drawing untouched under reduced motion", () => {
    Object.defineProperty(SVGElement.prototype, "getTotalLength", { value: () => 100, configurable: true });
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <PathDraw>
          <Drawing />
        </PathDraw>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
    expect((container.querySelector("path") as SVGPathElement).style.strokeDasharray).toBe("");
  });
  it("renders the finished drawing on the server", () => {
    const html = renderToString(
      <PathDraw>
        <Drawing />
      </PathDraw>,
    );
    expect(html).toContain('data-state="animated"');
    expect(html).not.toContain("stroke-dasharray");
  });
});
