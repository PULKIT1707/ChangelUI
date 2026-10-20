import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlitchText } from "../../src/text/glitch-text";
describe("GlitchText", () => {
  it("renders the requested tag, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <GlitchText ref={ref} as="h2" className="mt-4">
        Hello
      </GlitchText>,
    );
    expect(ref.current?.tagName).toBe("H2");
    expect(ref.current?.className).toContain("box-border");
    expect(ref.current?.className).toContain("mt-4");
  });
  it("keeps one readable copy and hides the channels (a11y)", () => {
    render(<GlitchText trigger="loop">Readable</GlitchText>);
    const copies = screen.getAllByText("Readable");
    expect(copies.filter((el) => !el.closest("[aria-hidden='true']"))).toHaveLength(1);
  });
  it("renders no channels under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <GlitchText active>Calm</GlitchText>
      </MotionConfig>,
    );
    expect(screen.getAllByText("Calm")).toHaveLength(1);
  });
  it("renders the text on the server", () => {
    expect(renderToString(<GlitchText>Server</GlitchText>)).toContain("Server");
  });
});
