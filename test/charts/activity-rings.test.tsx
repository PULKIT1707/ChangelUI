import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityRings } from "../../src/charts/activity-rings";
const rings = [
  { label: "Move", value: 420, max: 500, unit: "kcal" },
  { label: "Exercise", value: 45, max: 30, unit: "min" },
];
describe("ActivityRings", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ActivityRings ref={ref} className="max-w-sm" rings={rings} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("max-w-sm");
  });
  it("exposes a meter per ring (a11y)", () => {
    render(<ActivityRings rings={rings} />);
    expect(screen.getByRole("meter", { name: "Exercise" })).toHaveAttribute("aria-valuetext", "Exercise: 45 of 30 min, 150%");
  });
  it("renders the final chart on the server", () => {
    expect(renderToString(<ActivityRings rings={rings} />)).toContain('role="meter"');
  });
});
