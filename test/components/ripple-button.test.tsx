import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfig, MotionGlobalConfig } from "motion/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RippleButton } from "../../src/components/ripple-button";

const rect = { left: 10, top: 20, width: 100, height: 40, right: 110, bottom: 60, x: 10, y: 20, toJSON: () => ({}) };

beforeEach(() => {
  // Keep ripples mounted long enough to inspect them.
  MotionGlobalConfig.skipAnimations = false;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
});

afterEach(() => {
  MotionGlobalConfig.skipAnimations = true;
  vi.restoreAllMocks();
});

const ripples = () => [...document.querySelectorAll<HTMLElement>("[data-pui-ripple]")];

describe("RippleButton", () => {
  it("starts a ripple at the pointer and forwards the ref and onClick", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <RippleButton ref={ref} onClick={onClick}>
        Tap
      </RippleButton>,
    );
    const button = screen.getByRole("button", { name: "Tap" });
    expect(ref.current).toBe(button);
    fireEvent.click(button, { clientX: 30, clientY: 30, detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
    const [ripple] = ripples();
    // size = max(100, 40) * 2 = 200; left = (30 - 10) - 100
    expect(ripple?.style.left).toBe("-80px");
    expect(ripple?.style.top).toBe("-90px");
    expect(ripple?.style.width).toBe("200px");
  });

  it("ripples from the center for keyboard clicks (detail 0)", () => {
    render(<RippleButton>Tap</RippleButton>);
    fireEvent.click(screen.getByRole("button"), { detail: 0 });
    const [ripple] = ripples();
    expect(ripple?.style.left).toBe("-50px");
    expect(ripple?.style.top).toBe("-80px");
  });

  it("keeps at most 5 ripples", () => {
    render(<RippleButton>Tap</RippleButton>);
    const button = screen.getByRole("button");
    for (let i = 0; i < 8; i++) fireEvent.click(button, { clientX: 20, clientY: 30, detail: 1 });
    expect(ripples()).toHaveLength(5);
  });

  it("does not ripple under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <RippleButton>Tap</RippleButton>
      </MotionConfig>,
    );
    fireEvent.click(screen.getByRole("button"), { detail: 1 });
    expect(ripples()).toHaveLength(0);
  });
});
