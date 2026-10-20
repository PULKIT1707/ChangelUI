import { act, render, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Magnetic } from "../../src/effects/magnetic";
import { setMediaQuery } from "../utils/env";

function place(el: HTMLElement) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 100,
    width: 100,
    height: 40,
    right: 200,
    bottom: 140,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
}

function move(x: number, y: number) {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" }));
  });
}

describe("Magnetic", () => {
  it("pulls toward a pointer within distance and releases outside it", async () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <Magnetic ref={ref} strength={0.5} distance={50}>
        <button type="button">Pull</button>
      </Magnetic>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el.className).toContain("inline-block");
    place(el);
    move(230, 120); // 30px right of the edge: attracted; offset from center x = 80
    await waitFor(() => expect(el.style.transform).toContain("translateX(40px)"));
    move(400, 120); // far away: released
    await waitFor(() => expect(el.style.transform).not.toContain("translateX(40px)"));
  });

  it("is inactive for coarse pointers, when disabled and under reduced motion", async () => {
    setMediaQuery("(pointer: coarse)", true);
    const { container, rerender } = render(<Magnetic>x</Magnetic>);
    const el = container.firstElementChild as HTMLElement;
    place(el);
    move(150, 120);
    await new Promise((r) => setTimeout(r, 40));
    expect(el.style.transform).toBe("none");
    rerender(<Magnetic disabled>x</Magnetic>);
    expect(container.firstElementChild).toHaveAttribute("data-state", "inactive");
    rerender(
      <MotionConfig reducedMotion="always">
        <Magnetic>x</Magnetic>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "inactive");
  });
});
