import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Parallax, ParallaxLayer } from "../../src/effects/parallax";

describe("Parallax", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Parallax ref={ref} className="mt-4"><ParallaxLayer speed={0.3}>Layer</ParallaxLayer></Parallax>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><Parallax><ParallaxLayer speed={0.3}>Layer</ParallaxLayer></Parallax></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<Parallax><ParallaxLayer speed={0.3}>Layer</ParallaxLayer></Parallax>)).toContain("Layer");
  });
});
