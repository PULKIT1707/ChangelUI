import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { TextShimmer } from "../../src/text/text-shimmer";

describe("TextShimmer", () => {
  it("clips a moving gradient to the text and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { getByText } = render(
      <TextShimmer ref={ref} duration={3} spread={3} style={{ color: "inherit" }}>
        Thinking
      </TextShimmer>,
    );
    const el = getByText("Thinking");
    expect(ref.current).toBe(el);
    expect(el.className).toContain("bg-clip-text");
    expect(el.className).toContain("motion-safe:animate-pui-text-shimmer");
    expect(el.style.getPropertyValue("--pui-text-shimmer-spread")).toBe("24px");
    expect(el.style.animationDuration).toBe("3s");
    expect(el).toHaveAttribute("data-state", "animated");
  });

  it("renders as the requested tag", () => {
    const { container } = render(<TextShimmer as="h3">Title</TextShimmer>);
    expect(container.firstElementChild?.tagName).toBe("H3");
  });

  it("is static muted text under reduced motion", () => {
    const { getByText } = render(
      <MotionConfig reducedMotion="always">
        <TextShimmer>Static</TextShimmer>
      </MotionConfig>,
    );
    const el = getByText("Static");
    expect(el).toHaveAttribute("data-state", "static");
    expect(el.className).toContain("text-pui-muted-foreground");
    expect(el.className).not.toContain("animate");
  });
});
