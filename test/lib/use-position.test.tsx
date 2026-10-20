import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePosition, type UsePositionOptions } from "../../src/lib/position";
import { setResizeObserverMode } from "../utils/env";

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return { x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) } as DOMRect;
}

function Harness({ open, ...opts }: { open: boolean } & Partial<UsePositionOptions>) {
  const anchor = useRef<HTMLButtonElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const pos = usePosition({ anchor, floating, open, ...opts });
  return (
    <>
      <button ref={anchor} type="button">
        anchor
      </button>
      <div ref={floating} data-testid="floating" data-side={pos.side} data-ready={String(pos.ready)}>
        {`${pos.x},${pos.y}`}
      </div>
    </>
  );
}

describe("usePosition", () => {
  it("measures on the first ResizeObserver notification and resets on close", () => {
    vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect").mockReturnValue(rect(100, 100, 50, 20));
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 0, 80, 40));
    const { rerender } = render(<Harness open={false} />);
    expect(screen.getByTestId("floating").dataset.ready).toBe("false");
    rerender(<Harness open />);
    const floating = screen.getByTestId("floating");
    expect(floating.dataset.ready).toBe("true");
    expect(floating.textContent).toBe("85,128");
    rerender(<Harness open={false} />);
    expect(floating.dataset.ready).toBe("false");
  });

  it("waits for an asynchronous ResizeObserver", async () => {
    setResizeObserverMode("async");
    vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect").mockReturnValue(rect(100, 100, 50, 20));
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 0, 80, 40));
    render(<Harness open side="top" />);
    expect(screen.getByTestId("floating").dataset.ready).toBe("false");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    expect(screen.getByTestId("floating").dataset.ready).toBe("true");
    expect(screen.getByTestId("floating").dataset.side).toBe("top");
  });

  it("falls back to requestAnimationFrame without ResizeObserver and recomputes on resize", async () => {
    const original = window.ResizeObserver;
    // @ts-expect-error simulate a browser without ResizeObserver
    delete window.ResizeObserver;
    const anchorRect = vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect").mockReturnValue(rect(100, 100, 50, 20));
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 0, 80, 40));
    try {
      render(<Harness open />);
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      expect(screen.getByTestId("floating").textContent).toBe("85,128");
      anchorRect.mockReturnValue(rect(200, 100, 50, 20));
      await act(async () => {
        window.dispatchEvent(new Event("resize"));
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      expect(screen.getByTestId("floating").textContent).toBe("185,128");
    } finally {
      window.ResizeObserver = original;
    }
  });

  it("warns and stays hidden when the anchor is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    function Missing() {
      const anchor = useRef<HTMLElement>(null);
      const floating = useRef<HTMLDivElement>(null);
      const pos = usePosition({ anchor, floating, open: true });
      return <div ref={floating}>{String(pos.ready)}</div>;
    }
    render(<Missing />);
    expect(screen.getByText("false")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[changelui]"));
  });
});
