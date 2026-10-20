import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MorphingText } from "../../src/text/morphing-text";
describe("MorphingText", () => {
  it("renders the requested tag, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<MorphingText ref={ref} as="h2" className="mt-4" words={["Hello", "World"]} />);
    expect(ref.current?.tagName).toBe("H2");
    expect(ref.current?.className).toContain("mt-4");
  });
  it("exposes the current word to assistive tech (a11y)", () => {
    render(<MorphingText words={["Readable", "Other"]} />);
    const words = screen.getAllByText("Readable");
    expect(words.some((el) => el.closest("[aria-hidden='true']") === null)).toBe(true);
  });
  it("skips the threshold filter under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <MorphingText words={["Calm", "Still"]} />
      </MotionConfig>,
    );
    expect(container.innerHTML).not.toContain("url(#");
  });
  it("renders the first word on the server", () => {
    expect(renderToString(<MorphingText words={["Server", "Side"]} />)).toContain("Server");
  });
});
