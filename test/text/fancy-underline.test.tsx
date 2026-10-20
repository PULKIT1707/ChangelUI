import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FancyUnderline } from "../../src/text/fancy-underline";

describe("FancyUnderline", () => {
  it("renders a native link with href, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <FancyUnderline ref={ref} href="#post" className="mt-4">
        Read more
      </FancyUnderline>,
    );
    const link = screen.getByRole("link", { name: "Read more" });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute("href", "#post");
    expect(link.className).toContain("box-border");
    expect(link.className).toContain("mt-4");
  });

  it("renders a type=button button and hides the line (a11y)", () => {
    const { container } = render(
      <FancyUnderline as="button" variant="squiggle">
        Action
      </FancyUnderline>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute("type", "button");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the line statically under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <FancyUnderline>Calm</FancyUnderline>
      </MotionConfig>,
    );
    expect(container.querySelector("[aria-hidden='true']")?.className).toContain("scale-x-100");
  });

  it("marks active on the server", () => {
    const html = renderToString(<FancyUnderline active>Server</FancyUnderline>);
    expect(html).toContain("Server");
    expect(html).toContain("data-active");
  });
});
