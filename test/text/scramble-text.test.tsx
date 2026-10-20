import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ScrambleText } from "../../src/text/scramble-text";

function visual(container: HTMLElement): HTMLElement {
  return container.querySelector('[aria-hidden="true"]') as HTMLElement;
}

describe("ScrambleText", () => {
  it("scrambles left to right, keeps spaces fixed and ends exactly on text", async () => {
    const ref = createRef<HTMLElement>();
    const onComplete = vi.fn();
    const frames: string[] = [];
    const { container } = render(
      <ScrambleText ref={ref} text="AB CD" characters="x" duration={0.12} speedMs={0} onComplete={onComplete} />,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelector(".sr-only")).toHaveTextContent("AB CD");
    const el = visual(container);
    const observer = new MutationObserver(() => frames.push(el.textContent ?? ""));
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    observer.disconnect();
    expect(el.textContent).toBe("AB CD");
    const scrambled = frames.filter((f) => f !== "AB CD");
    expect(scrambled.length).toBeGreaterThan(0);
    for (const frame of scrambled) {
      expect(frame).toHaveLength(5);
      expect(frame[2]).toBe(" ");
      // resolved characters only ever form a prefix
      expect(frame).toMatch(/^(A|x)(B|x) (C|x)(D|x)$/);
      if (frame[1] === "B") expect(frame[0]).toBe("A");
    }
  });

  it("with trigger hover, renders text until pointerenter or focus", async () => {
    const onComplete = vi.fn();
    const { container } = render(
      <ScrambleText text="Hover" trigger="hover" duration={0.05} speedMs={0} onComplete={onComplete} />,
    );
    await act(() => new Promise((r) => setTimeout(r, 60)));
    expect(onComplete).not.toHaveBeenCalled();
    expect(visual(container)).toHaveTextContent("Hover");
    fireEvent.pointerEnter(container.firstElementChild as HTMLElement);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    fireEvent.focus(container.firstElementChild as HTMLElement);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(visual(container)).toHaveTextContent("Hover");
  });

  it("restores the real text when the text changes mid-run", async () => {
    const { container, rerender } = render(<ScrambleText text="first" duration={5} speedMs={0} />);
    await act(() => new Promise((r) => setTimeout(r, 40)));
    rerender(<ScrambleText text="second" duration={5} speedMs={0} trigger="hover" />);
    expect(visual(container)).toHaveTextContent("second");
  });
});
