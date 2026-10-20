import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlipCounter } from "../../src/text/flip-counter";
describe("FlipCounter", () => {
  it("merges className and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<FlipCounter ref={ref} className="mt-4" value={42} />);
    expect(ref.current?.className).toContain("mt-4");
  });
  it("exposes the value once to assistive tech (a11y)", () => {
    render(<FlipCounter value="12:45" />);
    expect(screen.getByText("12:45").closest("[aria-hidden='true']")).toBeNull();
  });
  it("jumps straight to new values under reduced motion", () => {
    const { rerender, container } = render(
      <MotionConfig reducedMotion="always">
        <FlipCounter value={1} />
      </MotionConfig>,
    );
    rerender(
      <MotionConfig reducedMotion="always">
        <FlipCounter value={7} />
      </MotionConfig>,
    );
    expect(container.querySelector("[data-flipping]")).toBeNull();
  });
  it("renders the value on the server", () => {
    expect(renderToString(<FlipCounter value={2048} />)).toContain("2048");
  });
});
