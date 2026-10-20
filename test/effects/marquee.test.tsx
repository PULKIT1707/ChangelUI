import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Marquee } from "../../src/effects/marquee";

function copies(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-pui-marquee-copy]")];
}

describe("Marquee", () => {
  it("renders repeat copies; copies 2..n are aria-hidden and inert", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Marquee ref={ref} repeat={3}>
        <a href="#a">Item</a>
      </Marquee>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    const all = copies(container);
    expect(all).toHaveLength(3);
    expect(all[0]).not.toHaveAttribute("aria-hidden");
    expect(all[0]?.inert).not.toBe(true);
    for (const copy of all.slice(1)) {
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy.inert).toBe(true);
    }
  });

  it("maps gap and duration to CSS variables and animates horizontally by default", () => {
    const { container } = render(
      <Marquee gap="2rem" duration={12}>
        x
      </Marquee>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--pui-marquee-gap")).toBe("2rem");
    expect(root.style.getPropertyValue("--pui-marquee-duration")).toBe("12s");
    expect(root.className).toContain("overflow-hidden");
    expect(root.className).toContain("[mask-image:linear-gradient(to_right");
    const first = copies(container)[0] as HTMLElement;
    expect(first.className).toContain("motion-safe:animate-pui-marquee-x");
    expect(first.className).toContain("group-hover:[animation-play-state:paused]");
    expect(first.className).toContain("group-focus-within:[animation-play-state:paused]");
  });

  it("supports vertical, reverse, paused and no fade", () => {
    const { container } = render(
      <Marquee direction="down" paused pauseOnHover={false} fade={false}>
        x
      </Marquee>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("flex-col");
    expect(root.className).not.toContain("mask-image");
    expect(root).toHaveAttribute("data-state", "paused");
    const first = copies(container)[0] as HTMLElement;
    expect(first.className).toContain("motion-safe:animate-pui-marquee-y");
    expect(first.className).toContain("[animation-direction:reverse]");
    expect(first.className).toContain("[animation-play-state:paused]");
    expect(first.className).not.toContain("group-hover");
  });

  it("clamps repeat below 1 with a dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Marquee repeat={0}>x</Marquee>);
    expect(copies(container)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("repeat"));
    warn.mockRestore();
  });
});
