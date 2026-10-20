import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ZoomParallax } from "../../src/effects/zoom-parallax";

describe("ZoomParallax", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ZoomParallax ref={ref} className="mt-4" images={[{ src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "Pixel" }]}>Headline</ZoomParallax>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><ZoomParallax images={[{ src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "Pixel" }]}>Headline</ZoomParallax></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<ZoomParallax images={[{ src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "Pixel" }]}>Headline</ZoomParallax>)).toContain("Pixel");
  });
});
