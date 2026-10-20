import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageTrail } from "../../src/effects/image-trail";

const images = ["data:image/gif;base64,R0lGODlhAQABAAAAACw="];

describe("ImageTrail", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ImageTrail images={images} ref={ref} className="mt-4">
        Float
      </ImageTrail>,
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
      <ImageTrail images={images}>
        <button type="button">Go</button>
      </ImageTrail>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ImageTrail images={images}>Still</ImageTrail>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<ImageTrail images={images}>Server</ImageTrail>)).toContain('data-state="animated"');
  });
});
