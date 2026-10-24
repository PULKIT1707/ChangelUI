import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BulletChart } from "../../src/charts/bullet-chart";
describe("BulletChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<BulletChart ref={ref} className="max-w-sm" value={62} target={70} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.className).toContain("max-w-sm");
  });
  it("is a meter with the gap in its value text (a11y)", () => {
    render(<BulletChart value={62} target={70} bands={[40, 70, 100]} label="Revenue" />);
    expect(screen.getByRole("meter", { name: "Revenue" })).toHaveAttribute("aria-valuetext", "62, target 70, 8 to target");
  });
  it("renders the final chart on the server", () => {
    expect(renderToString(<BulletChart value={62} />)).toContain('role="meter"');
  });
});
