import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SparklesText } from "../../src/text/sparkles-text";

describe("SparklesText", () => {
  it("renders the requested tag, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <SparklesText ref={ref} as="h2" className="mt-4">
        Hello
      </SparklesText>,
    );
    const root = screen.getByRole("heading", { name: "Hello" });
    expect(ref.current).toBe(root);
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
  });

  it("keeps the text in the accessibility tree (a11y)", () => {
    render(<SparklesText>Readable</SparklesText>);
    expect(screen.getByText("Readable").closest("[aria-hidden='true']")).toBeNull();
  });

  it("renders no sparkles under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <SparklesText>Calm</SparklesText>
      </MotionConfig>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders only the text on the server", () => {
    const html = renderToString(<SparklesText>Server</SparklesText>);
    expect(html).toContain("Server");
    expect(html).not.toContain("<svg");
  });
});
