import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Topography } from "../../src/backgrounds/topography";

describe("Topography", () => {
  it("renders a decorative layer, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Topography ref={ref} className="opacity-50" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-mask", "radial");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root?.className).toContain("opacity-50");
    expect(root?.firstElementChild?.className).toContain("motion-safe:animate-pulse");
  });

  it("is hidden from assistive technology (a11y)", () => {
    const { container } = render(<Topography mask="none" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-mask", "none");
  });

  it("is static under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Topography />
      </MotionConfig>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-state", "static");
    expect(root?.firstElementChild?.className).not.toContain("animate");
  });

  it("renders on the server", () => {
    expect(renderToString(<Topography />)).toContain('aria-hidden="true"');
  });
});
