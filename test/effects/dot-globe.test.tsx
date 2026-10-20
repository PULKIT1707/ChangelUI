import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotGlobe } from "../../src/effects/dot-globe";

describe("DotGlobe", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <DotGlobe ref={ref} className="mt-4">
        Float
      </DotGlobe>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("is decorative by default and an image when labelled (a11y)", () => {
    const { container } = render(<DotGlobe />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    render(<DotGlobe label="Our offices" />);
    expect(screen.getByRole("img", { name: "Our offices" })).toBeInTheDocument();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <DotGlobe>Still</DotGlobe>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<DotGlobe>Server</DotGlobe>)).toContain('data-state="animated"');
  });
});
