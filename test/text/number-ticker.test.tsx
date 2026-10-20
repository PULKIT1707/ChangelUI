import { render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { NumberTicker } from "../../src/text/number-ticker";

function visual(container: HTMLElement): HTMLElement {
  return container.querySelector('[aria-hidden="true"]') as HTMLElement;
}

describe("NumberTicker", () => {
  it("animates from `from` to value, with the final value sr-only", async () => {
    const ref = createRef<HTMLElement>();
    const onComplete = vi.fn();
    const { container } = render(<NumberTicker ref={ref} value={1500} from={10} onComplete={onComplete} />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toContain("tabular-nums");
    expect(root.querySelector(".sr-only")).toHaveTextContent("1,500");
    await waitFor(() => expect(visual(container)).toHaveTextContent("1,500"));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("formats with decimals, then formatOptions (en-US by default)", async () => {
    const { container } = render(
      <NumberTicker value={0.256} decimals={1} formatOptions={{ style: "percent", maximumFractionDigits: 1 }} />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent("25.6%");
    await waitFor(() => expect(visual(container)).toHaveTextContent("25.6%"));
  });

  it("animates from the displayed value when value changes", async () => {
    const { container, rerender } = render(<NumberTicker value={5} />);
    await waitFor(() => expect(visual(container)).toHaveTextContent("5"));
    rerender(<NumberTicker value={9} />);
    await waitFor(() => expect(visual(container)).toHaveTextContent("9"));
  });

  it("renders non-finite values statically", () => {
    const { container } = render(<NumberTicker value={Number.POSITIVE_INFINITY} />);
    expect(visual(container)).toHaveTextContent("Infinity");
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });
});
