import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CursorTrail } from "../../src/effects/cursor-trail";

describe("CursorTrail", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <CursorTrail ref={ref} className="mt-4">
        Float
      </CursorTrail>,
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
      <CursorTrail>
        <button type="button">Go</button>
      </CursorTrail>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <CursorTrail>Still</CursorTrail>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<CursorTrail>Server</CursorTrail>)).toContain('data-state="animated"');
  });
});
