import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { WordRotate } from "../../src/text/word-rotate";

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("WordRotate", () => {
  it("exposes the current word sr-only and rotates after intervalMs", async () => {
    const ref = createRef<HTMLElement>();
    const onIndexChange = vi.fn();
    const { container } = render(
      <WordRotate ref={ref} words={["alpha", "beta"]} intervalMs={30} onIndexChange={onIndexChange} />,
    );
    const srOnly = container.querySelector(".sr-only");
    expect(ref.current).toBe(container.firstElementChild);
    expect(srOnly).toHaveTextContent("alpha");
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("alpha");
    await waitFor(() => expect(srOnly).toHaveTextContent("beta"));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    await waitFor(() => expect(srOnly).toHaveTextContent("alpha"));
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it("does not rotate while paused", async () => {
    const { container } = render(<WordRotate words={["one", "two"]} intervalMs={20} paused />);
    await wait(80);
    expect(container.querySelector(".sr-only")).toHaveTextContent("one");
    expect(container.firstElementChild).toHaveAttribute("data-state", "paused");
  });

  it("pauses while the document is hidden", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const { container } = render(<WordRotate words={["one", "two"]} intervalMs={20} />);
    await wait(80);
    expect(container.querySelector(".sr-only")).toHaveTextContent("one");
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(container.querySelector(".sr-only")).toHaveTextContent("two"));
    hidden.mockRestore();
  });

  it("resets to the first word when the words change", async () => {
    const { container, rerender } = render(<WordRotate words={["a", "b"]} intervalMs={20} />);
    await waitFor(() => expect(container.querySelector(".sr-only")).toHaveTextContent("b"));
    rerender(<WordRotate words={["x", "y"]} intervalMs={1000} />);
    expect(container.querySelector(".sr-only")).toHaveTextContent("x");
  });

  it("renders nothing for empty words and sets perspective for flip", () => {
    const { container, rerender } = render(<WordRotate words={[]} />);
    expect(container.firstElementChild).toBeNull();
    rerender(<WordRotate words={["a"]} variant="flip" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.perspective).toBe("600px");
    expect(root).toHaveAttribute("data-variant", "flip");
  });
});
