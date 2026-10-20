import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useMousePosition } from "../../src/hooks/use-mouse-position";

function Harness({ withTarget = true, enabled = true }: { withTarget?: boolean; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useMousePosition({ target: withTarget ? ref : undefined, enabled });
  return (
    <div ref={ref} data-testid="target">
      {JSON.stringify(pos)}
    </div>
  );
}

function read() {
  return JSON.parse(screen.getByTestId("target").textContent ?? "{}") as Record<string, number | boolean>;
}

function move(x: number, y: number) {
  act(() => {
    fireEvent.pointerMove(window, { clientX: x, clientY: y });
    vi.advanceTimersByTime(20);
  });
}

describe("useMousePosition", () => {
  it("starts at zero and reports element coordinates once per frame", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout"] });
    render(<Harness />);
    expect(read()).toEqual({ x: 0, y: 0, elementX: 0, elementY: 0, isInside: false });
    vi.spyOn(screen.getByTestId("target"), "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 100,
      height: 50,
    } as DOMRect);
    move(60, 40);
    expect(read()).toEqual({ x: 60, y: 40, elementX: 50, elementY: 20, isInside: true });
    move(300, 300);
    expect(read()).toMatchObject({ elementX: 290, elementY: 280, isInside: false });
  });

  it("mirrors viewport coordinates without a target", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout"] });
    render(<Harness withTarget={false} />);
    move(5, 6);
    expect(read()).toEqual({ x: 5, y: 6, elementX: 5, elementY: 6, isInside: true });
  });

  it("does not listen when disabled", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout"] });
    render(<Harness enabled={false} />);
    move(5, 6);
    expect(read()).toMatchObject({ x: 0, y: 0 });
  });
});
