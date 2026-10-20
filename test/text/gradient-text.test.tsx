import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { GradientText } from "../../src/text/gradient-text";

describe("GradientText", () => {
  it("paints a looping gradient with the given colors and angle", () => {
    const ref = createRef<HTMLElement>();
    const { getByText } = render(
      <GradientText ref={ref} colors={["var(--a)", "var(--b)"]} angle={45} duration={4}>
        Hello
      </GradientText>,
    );
    const el = getByText("Hello");
    expect(ref.current).toBe(el);
    expect(el.style.backgroundImage).toBe("linear-gradient(45deg, var(--a), var(--b), var(--a))");
    expect(el.style.animationDuration).toBe("4s");
    expect(el.className).toContain("motion-safe:animate-pui-gradient-pan");
    expect(el.className).toContain("bg-clip-text");
  });

  it("defaults to the gradient tokens and can be static", () => {
    const { getByText } = render(<GradientText animate={false}>Static</GradientText>);
    const el = getByText("Static");
    expect(el.style.backgroundImage).toContain("var(--pui-gradient-1)");
    expect(el.className).not.toContain("animate");
    expect(el).toHaveAttribute("data-state", "static");
  });

  it("does not pan under reduced motion", () => {
    const { getByText } = render(
      <MotionConfig reducedMotion="always">
        <GradientText as="h1">Calm</GradientText>
      </MotionConfig>,
    );
    const el = getByText("Calm");
    expect(el.tagName).toBe("H1");
    expect(el.className).not.toContain("animate");
  });
});
