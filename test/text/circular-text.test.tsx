import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CircularText } from "../../src/text/circular-text";
describe("CircularText", () => {
  it("merges className and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<CircularText ref={ref} className="mt-4" text="Scroll down" />);
    expect(ref.current?.className).toContain("mt-4");
  });
  it("labels the ring as an image and uses textPath (a11y)", () => {
    const { container } = render(<CircularText text="Scroll down" />);
    expect(screen.getByRole("img", { name: "Scroll down" })).toBeInTheDocument();
    expect(container.querySelector("textPath")).not.toBeNull();
  });
  it("stays still under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <CircularText text="Calm" />
      </MotionConfig>,
    );
    expect(screen.getByRole("img", { name: "Calm" }).closest("[data-state]")).toHaveAttribute("data-state", "paused");
  });
  it("renders the full SVG on the server", () => {
    expect(renderToString(<CircularText text="Server" />)).toContain("textPath");
  });
});
