import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WavyText } from "../../src/text/wavy-text";
describe("WavyText", () => {
  it("renders the requested tag, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <WavyText ref={ref} as="h2" className="mt-4">
        Hello
      </WavyText>,
    );
    expect(ref.current?.tagName).toBe("H2");
    expect(ref.current?.className).toContain("mt-4");
  });
  it("exposes the text once and hides the letters (a11y)", () => {
    render(<WavyText>Readable</WavyText>);
    expect(screen.getByText("Readable").closest("[aria-hidden='true']")).toBeNull();
  });
  it("does not animate letters under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <WavyText>Calm</WavyText>
      </MotionConfig>,
    );
    expect(container.querySelector(".animate-pui-wave")).toBeNull();
  });
  it("renders the text on the server", () => {
    expect(renderToString(<WavyText>Server</WavyText>)).toContain("Server");
  });
});
