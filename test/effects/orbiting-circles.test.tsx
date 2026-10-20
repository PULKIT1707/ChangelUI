import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { OrbitingCircles } from "../../src/effects/orbiting-circles";

function items(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-pui-orbit-item]")];
}

describe("OrbitingCircles", () => {
  it("spaces children evenly from startAngle with orbit variables on the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <OrbitingCircles ref={ref} radius={80} duration={10} startAngle={30} itemSize={40}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
        <span>d</span>
      </OrbitingCircles>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.style.getPropertyValue("--pui-orbit-radius")).toBe("80px");
    expect(root.style.getPropertyValue("--pui-orbit-duration")).toBe("10s");
    expect(root.style.minWidth).toBe("200px");
    expect(items(container).map((el) => el.style.getPropertyValue("--pui-orbit-angle"))).toEqual([
      "30deg",
      "120deg",
      "210deg",
      "300deg",
    ]);
    expect(items(container)[0]?.className).toContain("motion-safe:animate-pui-orbit");
    expect(items(container)[0]?.style.width).toBe("40px");
    expect(root.querySelector("circle")).toHaveAttribute("r", "80");
  });

  it("supports reverse and hiding the path", () => {
    const { container } = render(
      <OrbitingCircles reverse showPath={false}>
        <span>a</span>
      </OrbitingCircles>,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(items(container)[0]?.className).toContain("[animation-direction:reverse]");
  });

  it("keeps children at static angles under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <OrbitingCircles>
          <span>a</span>
        </OrbitingCircles>
      </MotionConfig>,
    );
    const item = items(container)[0] as HTMLElement;
    expect(item.className).not.toContain("animate");
    expect(item.style.transform).toContain("rotate(var(--pui-orbit-angle))");
  });
});
