import { fireEvent, render, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SpotlightCard } from "../../src/effects/spotlight-card";

function rect(el: HTMLElement) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 50,
    width: 200,
    height: 100,
    right: 300,
    bottom: 150,
    x: 100,
    y: 50,
    toJSON: () => ({}),
  });
}

function spotlight(container: HTMLElement): HTMLElement {
  return container.querySelector("[data-pui-spotlight]") as HTMLElement;
}

describe("SpotlightCard", () => {
  it("is a surface card whose spotlight follows the pointer", async () => {
    const ref = createRef<HTMLDivElement>();
    const onPointerMove = vi.fn();
    const { container } = render(
      <SpotlightCard ref={ref} spotlightSize={200} onPointerMove={onPointerMove}>
        <button type="button">Action</button>
      </SpotlightCard>,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(card);
    expect(card.className).toContain("bg-pui-surface");
    expect(card.style.getPropertyValue("--pui-spotlight-size")).toBe("200px");
    rect(card);
    fireEvent.pointerMove(card, { clientX: 130, clientY: 70 });
    expect(onPointerMove).toHaveBeenCalled();
    await waitFor(() => expect(spotlight(container).style.getPropertyValue("--pui-spotlight-x")).toBe("30px"));
    expect(spotlight(container).style.getPropertyValue("--pui-spotlight-y")).toBe("20px");
    expect(container.querySelector("[data-pui-spotlight-border]")).not.toBeNull();
  });

  it("centers the spotlight for keyboard focus", async () => {
    const { container, getByRole } = render(
      <SpotlightCard borderGlow={false}>
        <button type="button">Action</button>
      </SpotlightCard>,
    );
    const card = container.firstElementChild as HTMLElement;
    Object.defineProperty(card, "offsetWidth", { value: 240 });
    Object.defineProperty(card, "offsetHeight", { value: 120 });
    fireEvent.focus(getByRole("button"));
    await waitFor(() => expect(spotlight(container).style.getPropertyValue("--pui-spotlight-x")).toBe("120px"));
    expect(container.querySelector("[data-pui-spotlight-border]")).toBeNull();
  });

  it("does not follow the pointer under reduced motion (centered on hover)", async () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <SpotlightCard>Card</SpotlightCard>
      </MotionConfig>,
    );
    const card = container.firstElementChild as HTMLElement;
    Object.defineProperty(card, "offsetWidth", { value: 100 });
    Object.defineProperty(card, "offsetHeight", { value: 60 });
    rect(card);
    fireEvent.pointerEnter(card, { clientX: 110, clientY: 60 });
    fireEvent.pointerMove(card, { clientX: 290, clientY: 140 });
    await waitFor(() => expect(spotlight(container).style.getPropertyValue("--pui-spotlight-x")).toBe("50px"));
    expect(card).toHaveAttribute("data-state", "static");
  });
});
