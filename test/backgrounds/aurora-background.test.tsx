import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AuroraBackground } from "../../src/backgrounds/aurora-background";

describe("AuroraBackground", () => {
  it("renders drifting bands with intensity classes and the radial mask", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<AuroraBackground ref={ref} intensity="subtle" duration={30} />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("aria-hidden", "true");
    const layer = root.querySelector("[data-pui-aurora]") as HTMLElement;
    expect(layer.className).toContain("opacity-30");
    expect(layer.className).toContain("blur-[40px]");
    expect(layer.className).toContain("[mask-image:radial-gradient(ellipse_at_100%_0%");
    expect(layer.className).toContain("motion-safe:animate-pui-aurora");
    expect(layer.style.animationDuration).toBe("30s");
    expect(layer.style.backgroundImage).toContain("var(--pui-aurora-2)");
  });

  it("supports custom colors, no radial mask and a static gradient under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <AuroraBackground colors={["var(--a)", "var(--b)"]} radialMask={false} intensity="vivid" />
      </MotionConfig>,
    );
    const layer = container.querySelector("[data-pui-aurora]") as HTMLElement;
    expect(layer.style.backgroundImage).toContain("var(--a)");
    expect(layer.className).not.toContain("mask-image");
    expect(layer.className).not.toContain("animate");
    expect(layer.className).toContain("opacity-70");
  });
});
