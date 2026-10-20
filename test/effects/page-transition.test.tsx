import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageTransition } from "../../src/effects/page-transition";
describe("PageTransition", () => {
  it("renders a div, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PageTransition ref={ref} routeKey="/" className="mt-4">
        Home
      </PageTransition>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-preset", "slide");
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });
  it("keeps interactive children reachable (a11y)", () => {
    render(
      <PageTransition routeKey="/">
        <button type="button">Go</button>
      </PageTransition>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });
  it("swaps pages under reduced motion", () => {
    const { rerender } = render(
      <MotionConfig reducedMotion="always">
        <PageTransition routeKey="a">Page A</PageTransition>
      </MotionConfig>,
    );
    rerender(
      <MotionConfig reducedMotion="always">
        <PageTransition routeKey="b">Page B</PageTransition>
      </MotionConfig>,
    );
    expect(screen.getByText("Page B")).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<PageTransition routeKey="/">Server</PageTransition>)).toContain("Server");
  });
});
