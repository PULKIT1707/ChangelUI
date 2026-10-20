import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GooeyButton } from "../../src/effects/gooey-button";

describe("GooeyButton", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <GooeyButton ref={ref} className="mt-4">
        Float
      </GooeyButton>,
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
      <GooeyButton>
        <button type="button">Go</button>
      </GooeyButton>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <GooeyButton>Still</GooeyButton>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<GooeyButton>Server</GooeyButton>)).toContain('data-state="animated"');
  });
});
