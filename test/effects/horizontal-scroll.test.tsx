import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HorizontalScroll } from "../../src/effects/horizontal-scroll";

describe("HorizontalScroll", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<HorizontalScroll ref={ref} className="mt-4"><div>Panel</div></HorizontalScroll>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><HorizontalScroll><div>Panel</div></HorizontalScroll></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<HorizontalScroll><div>Panel</div></HorizontalScroll>)).toContain("Panel");
  });
});
