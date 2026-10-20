import { fireEvent, render, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TiltCard } from "../../src/effects/tilt-card";

function withRect(el: HTMLElement) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    right: 100,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("TiltCard", () => {
  it("tilts toward a mouse pointer and springs back on leave", async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<TiltCard ref={ref}>Card</TiltCard>);
    const card = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(card);
    expect(card).toHaveAttribute("data-state", "interactive");
    withRect(card);
    fireEvent.pointerMove(card, { clientX: 100, clientY: 50, pointerType: "mouse" });
    await waitFor(() => expect(card.style.transform).toMatch(/rotateY\(10deg\)/));
    expect(container.querySelector("[data-pui-glare]")).not.toBeNull();
    fireEvent.pointerLeave(card);
    await waitFor(() => expect(card.style.transform).not.toMatch(/rotateY\(10deg\)/));
  });

  it("ignores touch pointers", async () => {
    const { container } = render(<TiltCard>Card</TiltCard>);
    const card = container.firstElementChild as HTMLElement;
    withRect(card);
    fireEvent.pointerMove(card, { clientX: 100, clientY: 100, pointerType: "touch" });
    await new Promise((r) => setTimeout(r, 30));
    expect(card.style.transform).not.toContain("rotateY(10deg)");
  });

  it("is static when disabled or under reduced motion", () => {
    const { container, rerender } = render(<TiltCard disabled>Card</TiltCard>);
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
    expect(container.querySelector("[data-pui-glare]")).toBeNull();
    rerender(
      <MotionConfig reducedMotion="always">
        <TiltCard>Card</TiltCard>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });
});
