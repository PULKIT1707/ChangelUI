import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { ShineBorder } from "../../src/effects/shine-border";

describe("ShineBorder", () => {
  it("masks an animated radial gradient to the border", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ShineBorder ref={ref} borderWidth={3} duration={8} colors={["var(--a)", "var(--b)"]} />);
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.style.getPropertyValue("--pui-shine-width")).toBe("3px");
    expect(el.style.getPropertyValue("--pui-shine-duration")).toBe("8s");
    expect(el.style.backgroundImage).toContain("var(--a), var(--b)");
    expect(el.className).toContain("[mask-composite:exclude]");
    expect(el.className).toContain("motion-safe:animate-pui-shine");
  });

  it("is a static gradient border under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ShineBorder />
      </MotionConfig>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("data-state", "static");
    expect(el.className).not.toContain("animate");
    expect(el.style.backgroundImage).toContain("var(--pui-beam-from)");
  });
});
