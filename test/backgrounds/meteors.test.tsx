import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Meteors } from "../../src/backgrounds/meteors";

function meteors(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-pui-meteor]")];
}

describe("Meteors", () => {
  it("renders count meteors with seeded timing inside their ranges", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Meteors ref={ref} count={12} angle={200} duration={[3, 4]} delay={[1, 2]} />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.style.getPropertyValue("--pui-meteor-angle")).toBe("200deg");
    const all = meteors(container);
    expect(all).toHaveLength(12);
    for (const meteor of all) {
      const duration = parseFloat(meteor.style.getPropertyValue("--pui-meteor-duration"));
      const delay = parseFloat(meteor.style.getPropertyValue("--pui-meteor-delay"));
      expect(duration).toBeGreaterThanOrEqual(3);
      expect(duration).toBeLessThanOrEqual(4);
      expect(delay).toBeGreaterThanOrEqual(1);
      expect(delay).toBeLessThanOrEqual(2);
      expect(meteor.className).toContain("before:box-border");
      expect(meteor.className).toContain("motion-safe:animate-pui-meteor");
    }
  });

  it("keeps the same layout across re-renders", () => {
    const { container, rerender } = render(<Meteors count={4} />);
    const before = meteors(container).map((m) => m.style.left);
    rerender(<Meteors count={4} className="opacity-50" />);
    expect(meteors(container).map((m) => m.style.left)).toEqual(before);
  });

  it("clamps count to 0..100 with a dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Meteors count={500} />);
    expect(meteors(container)).toHaveLength(100);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("count"));
    warn.mockRestore();
  });
});
