import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef, type CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { ShimmerButton } from "../../src/components/shimmer-button";

describe("ShimmerButton", () => {
  it("maps props to --pui-shimmer-* vars merged before the user's style", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ShimmerButton ref={ref} duration={5} shimmerColor="red" radius="8px" style={{ "--pui-shimmer-radius": "2px" } as CSSProperties}>
        Go
      </ShimmerButton>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button.style.getPropertyValue("--pui-shimmer-duration")).toBe("5s");
    expect(button.style.getPropertyValue("--pui-shimmer-color")).toBe("red");
    expect(button.style.getPropertyValue("--pui-shimmer-size")).toBe("0.05em");
    expect(button.style.getPropertyValue("--pui-shimmer-background")).toBe("var(--pui-shimmer-bg)");
    // user style wins
    expect(button.style.getPropertyValue("--pui-shimmer-radius")).toBe("2px");
    expect(button.querySelector("[data-pui-shimmer]")).not.toBeNull();
    expect(button.querySelector(".animate-pui-spin-around")).not.toBeNull();
  });

  it("is a static button under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <ShimmerButton>Go</ShimmerButton>
      </MotionConfig>,
    );
    const button = screen.getByRole("button");
    expect(button.querySelector("[data-pui-shimmer]")).toBeNull();
    expect(button.querySelector(".animate-pui-shimmer-slide")).toBeNull();
  });
});
