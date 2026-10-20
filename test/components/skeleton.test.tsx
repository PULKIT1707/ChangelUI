import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "../../src/components/skeleton";

describe("Skeleton", () => {
  it("is aria-hidden with a shimmer by default and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Skeleton ref={ref} className="h-10 w-20" />);
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveAttribute("data-animation", "shimmer");
    expect(el.className).toContain("motion-safe:animate-pui-skeleton-shimmer");
    expect(el.className).toContain("rounded-pui-md");
  });

  it("supports circle and pulse", () => {
    const { container } = render(<Skeleton shape="circle" animation="pulse" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("rounded-pui-full");
    expect(el.className).toContain("motion-safe:animate-pulse");
  });

  it("renders text lines with a 60% last line", () => {
    const { container } = render(<Skeleton shape="text" lines={3} animation="none" />);
    const lines = (container.firstElementChild as HTMLElement).children;
    expect(lines).toHaveLength(3);
    expect(lines[2]?.className).toContain("w-3/5");
    expect(lines[0]?.className).not.toContain("w-3/5");
    expect(lines[0]?.className).not.toContain("animate");
  });

  it("uses no animation under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Skeleton />
      </MotionConfig>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("data-animation", "none");
    expect(el.className).not.toContain("animate");
  });
});
