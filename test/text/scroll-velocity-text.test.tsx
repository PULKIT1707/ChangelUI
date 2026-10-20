import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollVelocityText } from "../../src/text/scroll-velocity-text";

describe("ScrollVelocityText", () => {
  it("renders one row per string, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ScrollVelocityText ref={ref} rows={["One", "Two"]} className="mt-4" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
    expect(root.querySelectorAll(".sr-only")).toHaveLength(2);
  });

  it("reads each row once and hides the repeats (a11y)", () => {
    const { container } = render(<ScrollVelocityText rows={["Readable"]} />);
    const copies = container.querySelectorAll("[aria-hidden='true']");
    expect(copies.length).toBeGreaterThan(0);
    expect(container.querySelector(".sr-only")?.textContent).toBe("Readable");
  });

  it("stays static under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ScrollVelocityText rows={["Calm"]} />
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders static rows on the server", () => {
    const html = renderToString(<ScrollVelocityText rows={["Server"]} />);
    expect(html).toContain("Server");
  });
});
