import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollStack, ScrollStackItem } from "../../src/effects/scroll-stack";

describe("ScrollStack", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ScrollStack ref={ref} className="mt-4"><ScrollStackItem>Card</ScrollStackItem></ScrollStack>);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("renders under reduced motion", () => {
    const { container } = render(<MotionConfig reducedMotion="always"><ScrollStack><ScrollStackItem>Card</ScrollStackItem></ScrollStack></MotionConfig>);
    expect(container.firstElementChild).toBeTruthy();
  });

  it("renders on the server", () => {
    expect(renderToString(<ScrollStack><ScrollStackItem>Card</ScrollStackItem></ScrollStack>)).toContain("Card");
  });
});
