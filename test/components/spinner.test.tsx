import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Spinner } from "../../src/components/spinner";

describe("Spinner", () => {
  it("is a status with an sr-only label and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} />);
    const status = screen.getByRole("status");
    expect(ref.current).toBe(status);
    expect(status).toHaveTextContent("Loading");
    expect(status).toHaveAttribute("data-variant", "ring");
    expect(status.className).toContain("size-5");
    expect(status.querySelector(".animate-spin")).not.toBeNull();
  });

  it("decorative is aria-hidden with no role", () => {
    const { container } = render(<Spinner decorative label="x" />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container).not.toHaveTextContent("x");
  });

  it("renders each variant", () => {
    const { container, rerender } = render(<Spinner variant="dots" size="sm" label="Busy" />);
    expect(container.querySelectorAll(".animate-pui-dot-bounce")).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("Busy");
    rerender(<Spinner variant="bars" size="lg" />);
    expect(container.querySelectorAll(".animate-pui-bar-scale")).toHaveLength(3);
    rerender(<Spinner variant="pulse" />);
    expect(container.querySelector(".animate-ping")).not.toBeNull();
  });

  it("keeps animating under reduced motion at 1.5s per cycle", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Spinner />
      </MotionConfig>,
    );
    const ring = container.querySelector(".animate-spin");
    expect(ring?.className).toContain("[animation-duration:1.5s]");
  });
});
