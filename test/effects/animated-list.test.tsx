import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedList } from "../../src/effects/animated-list";

describe("AnimatedList", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<AnimatedList ref={ref} className="mt-4"><div key="a">Item</div></AnimatedList>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><AnimatedList><div key="a">Item</div></AnimatedList></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<AnimatedList><div key="a">Item</div></AnimatedList>)).toContain("Item");
  });
});
