import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Badge } from "../../src/components/badge";

describe("Badge", () => {
  it("renders a span with defaults and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>New</Badge>);
    const badge = screen.getByText("New");
    expect(ref.current).toBe(badge);
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-variant", "soft");
    expect(badge).toHaveAttribute("data-tone", "neutral");
    expect(badge).toHaveAttribute("data-size", "sm");
    expect(badge.className).toContain("h-5");
  });

  it("renders a decorative dot that pings only with pulse", () => {
    const { container, rerender } = render(
      <Badge dot tone="success" variant="solid" size="md">
        Live
      </Badge>,
    );
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector("[data-pui-pulse]")).toBeNull();
    rerender(
      <Badge dot pulse>
        Live
      </Badge>,
    );
    expect(container.querySelector("[data-pui-pulse]")?.className).toContain("motion-safe:animate-ping");
  });

  it("does not ping under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Badge dot pulse variant="outline">
          Live
        </Badge>
      </MotionConfig>,
    );
    expect(container.querySelector("[data-pui-pulse]")).toBeNull();
  });
});
