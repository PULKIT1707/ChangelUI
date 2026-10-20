import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlipCard } from "../../src/effects/flip-card";

describe("FlipCard", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FlipCard ref={ref} className="mt-4">
        Float
      </FlipCard>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("keeps interactive children reachable (a11y)", () => {
    render(
      <FlipCard>
        <button type="button">Go</button>
      </FlipCard>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <FlipCard>Still</FlipCard>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<FlipCard>Server</FlipCard>)).toContain('data-state="animated"');
  });
});
