import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { BorderBeam } from "../../src/effects/border-beam";

describe("BorderBeam", () => {
  it("is a decorative inherit-rounded overlay with a gated dot", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <div style={{ borderRadius: "12px" }}>
        <BorderBeam ref={ref} beamSize={80} borderWidth={2} />
      </div>,
    );
    const beam = container.querySelector("[data-pui-border-beam]") as HTMLElement;
    expect(ref.current).toBe(beam);
    expect(beam).toHaveAttribute("aria-hidden", "true");
    expect(beam.className).toContain("pointer-events-none");
    expect(beam.className).toContain("rounded-[inherit]");
    expect(beam.style.getPropertyValue("--pui-beam-size")).toBe("80px");
    expect(beam.style.getPropertyValue("--pui-beam-width")).toBe("2px");
    const dot = beam.querySelector("[data-pui-beam-dot]") as HTMLElement;
    expect(dot.className).toContain("hidden");
    expect(dot.className).toContain("supports-[offset-path:rect(0_auto_auto_0)]:block");
    expect(dot.style.background).toContain("var(--pui-beam-from)");
  });

  it("reads the parent radius into --pui-beam-radius when no radius prop is set", () => {
    const { container } = render(
      <div style={{ borderTopLeftRadius: "12px" }}>
        <BorderBeam />
      </div>,
    );
    const beam = container.querySelector("[data-pui-border-beam]") as HTMLElement;
    expect(beam.style.getPropertyValue("--pui-beam-radius")).toBe("12px");
  });

  it("uses the radius prop when given", () => {
    const { container } = render(
      <div>
        <BorderBeam radius={20} colorFrom="var(--a)" colorTo="var(--b)" />
      </div>,
    );
    const beam = container.querySelector("[data-pui-border-beam]") as HTMLElement;
    expect(beam.style.getPropertyValue("--pui-beam-radius")).toBe("20px");
    expect((beam.querySelector("[data-pui-beam-dot]") as HTMLElement).style.background).toContain("var(--a)");
  });

  it("defaults to an 80px beam with a glow outside the masked ring; glow={false} drops it", () => {
    const { container, rerender } = render(
      <div>
        <BorderBeam />
      </div>,
    );
    const beam = () => container.querySelector("[data-pui-border-beam]") as HTMLElement;
    expect(beam().style.getPropertyValue("--pui-beam-size")).toBe("80px");
    const glow = beam().querySelector("[data-pui-beam-glow]") as HTMLElement;
    expect(glow).not.toBeNull();
    expect(glow.className).toContain("blur-[6px]");
    // The glow's container is not masked; the dot's is.
    expect(glow.parentElement?.className).not.toContain("mask-image");
    expect(beam().querySelector("[data-pui-beam-dot]")?.parentElement?.className).toContain("mask-image");
    rerender(
      <div>
        <BorderBeam glow={false} />
      </div>,
    );
    expect(beam().querySelector("[data-pui-beam-glow]")).toBeNull();
    expect(beam().querySelector("[data-pui-beam-dot]")).not.toBeNull();
  });
});
