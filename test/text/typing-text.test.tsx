import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { TypingText } from "../../src/text/typing-text";
import { setupFakeTimers } from "../utils/timers";

function typed(container: HTMLElement): string {
  return container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
}

function advance(ms: number, times = 1) {
  for (let i = 0; i < times; i++) act(() => vi.advanceTimersByTime(ms));
}

describe("TypingText", () => {
  it("types the text one character at a time with the full text sr-only", () => {
    setupFakeTimers();
    const ref = createRef<HTMLElement>();
    const { container } = render(<TypingText ref={ref} text="Hey" as="p" />);
    expect(ref.current?.tagName).toBe("P");
    expect(container.querySelector(".sr-only")).toHaveTextContent("Hey");
    expect(typed(container)).toBe("");
    advance(50);
    expect(typed(container)).toBe("H");
    advance(50, 2);
    expect(typed(container)).toBe("Hey");
  });

  it("calls onComplete once a non-looping sequence finishes", () => {
    setupFakeTimers();
    const onComplete = vi.fn();
    const { container } = render(<TypingText text="ab" typeSpeedMs={10} onComplete={onComplete} />);
    advance(10, 2);
    advance(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild).toHaveAttribute("data-state", "complete");
  });

  it("cycles through an array: type, pause, delete, next", () => {
    setupFakeTimers();
    const { container } = render(
      <TypingText text={["ab", "cd"]} typeSpeedMs={10} deleteSpeedMs={5} pauseMs={100} />,
    );
    advance(10, 2);
    expect(typed(container)).toBe("ab");
    advance(100);
    advance(5);
    expect(typed(container)).toBe("a");
    advance(5);
    expect(typed(container)).toBe("");
    advance(10);
    expect(container.querySelector(".sr-only")).toHaveTextContent("cd");
    advance(10);
    expect(typed(container)).toBe("c");
  });

  it("restarts when the text changes", () => {
    setupFakeTimers();
    const { container, rerender } = render(<TypingText text="abc" typeSpeedMs={10} />);
    advance(10, 3);
    expect(typed(container)).toBe("abc");
    rerender(<TypingText text="xyz" typeSpeedMs={10} />);
    expect(typed(container)).toBe("");
    advance(10);
    expect(typed(container)).toBe("x");
  });

  it("waits for delay before the first character", () => {
    setupFakeTimers();
    const { container } = render(<TypingText text="a" typeSpeedMs={10} delay={1} />);
    advance(500);
    expect(typed(container)).toBe("");
    advance(510);
    expect(typed(container)).toBe("a");
  });

  it("renders the cursor variants; an empty string renders just the cursor", () => {
    const { container, rerender } = render(<TypingText text="" />);
    const cursor = container.querySelector("[data-pui-cursor]");
    expect(cursor?.className).toContain("w-[2px]");
    expect(cursor?.className).toContain("motion-safe:animate-pui-blink");
    expect(typed(container)).toBe("");
    rerender(<TypingText text="" cursor="underscore" blinkCursor={false} />);
    expect(container.querySelector("[data-pui-cursor]")?.className).not.toContain("animate");
    rerender(<TypingText text="" cursor="none" />);
    expect(container.querySelector("[data-pui-cursor]")).toBeNull();
  });
});
