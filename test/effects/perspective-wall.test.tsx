import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PerspectiveWall } from "../../src/effects/perspective-wall";
const items = ["One", "Two", "Three", "Four", "Five"];
describe("PerspectiveWall", () => {
  it("renders a labelled region, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PerspectiveWall ref={ref} items={items} className="mt-4" label="Customer stories" />);
    expect(ref.current).toBe(screen.getByRole("region", { name: "Customer stories" }));
    expect(ref.current?.className).toContain("mt-4");
    expect(ref.current).toHaveAttribute("data-state", "running");
  });
  it("exposes each item once and hides loop copies and repeats (a11y)", () => {
    render(<PerspectiveWall items={items} columns={2} />);
    for (const item of items) expect(screen.getAllByText(item).filter((el) => !el.closest("[aria-hidden='true']"))).toHaveLength(1);
  });
  it("pauses with the control button", () => {
    render(<PerspectiveWall items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause gallery motion" }));
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "paused");
    expect(screen.getByRole("button", { name: "Play gallery motion" })).toHaveAttribute("aria-pressed", "true");
  });
  it("renders static without controls under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <PerspectiveWall items={items} />
      </MotionConfig>,
    );
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "static");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<PerspectiveWall items={items} />)).toContain("One");
  });
});
