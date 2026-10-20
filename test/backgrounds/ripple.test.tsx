import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Ripple } from "../../src/backgrounds/ripple";

function rings(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-pui-ripple-ring]")];
}

describe("Ripple", () => {
  it("renders growing, fading rings with staggered delays", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Ripple ref={ref} count={3} baseSize={100} baseOpacity={0.3} duration={4} />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current).toHaveAttribute("aria-hidden", "true");
    const all = rings(container);
    expect(all.map((r) => r.style.width)).toEqual(["100px", "170px", "240px"]);
    expect(all.map((r) => r.style.animationDelay)).toEqual(["0s", "0.06s", "0.12s"]);
    expect(all[1]?.style.opacity).toBe("0.27");
    expect(all[2]?.style.borderStyle).toBe("dashed");
    expect(all[0]?.style.animationDuration).toBe("4s");
    expect(all[0]?.className).toContain("motion-safe:animate-pui-ripple");
    expect(all[0]?.className).toContain("border-pui-ripple");
  });

  it("is static under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Ripple count={2} />
      </MotionConfig>,
    );
    expect(rings(container)[0]?.className).not.toContain("animate");
  });
});
