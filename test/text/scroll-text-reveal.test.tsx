import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollTextReveal } from "../../src/text/scroll-text-reveal";

describe("ScrollTextReveal", () => {
  it("renders the requested tag, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <ScrollTextReveal ref={ref} as="h2" className="mt-4">
        Hello world
      </ScrollTextReveal>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("H2");
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
  });

  it("exposes the whole text once (a11y)", () => {
    render(<ScrollTextReveal>Readable text</ScrollTextReveal>);
    expect(screen.getByText("Readable text")).toHaveClass("sr-only");
  });

  it("shows every word at full opacity under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ScrollTextReveal>Calm words</ScrollTextReveal>
      </MotionConfig>,
    );
    const word = container.querySelector("[aria-hidden='true'] span") as HTMLElement;
    expect(word.style.opacity).toBe("1");
  });

  it("renders the full text on the server", () => {
    const html = renderToString(<ScrollTextReveal>Server text</ScrollTextReveal>);
    expect(html).toContain("Server text");
  });
});
