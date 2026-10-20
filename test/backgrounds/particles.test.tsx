import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Particles } from "../../src/backgrounds/particles";

/** A minimal 2D context that records draw calls. */
function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
  };
}

describe("Particles", () => {
  const original = HTMLCanvasElement.prototype.getContext;
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = original;
  });

  it("renders the marker root with one canvas and survives a null context", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Particles ref={ref} className="text-pui-primary" />);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-pui-particles", "");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("pointer-events-none");
    expect(root.querySelectorAll("canvas")).toHaveLength(1);
    warn.mockRestore();
  });

  it("draws one static frame under reduced motion and cleans up on unmount", () => {
    const ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement["getContext"];
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { unmount } = render(
      <MotionConfig reducedMotion="always">
        <Particles quantity={5} color="var(--pui-primary)" />
      </MotionConfig>,
    );
    expect(ctx.arc).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    unmount();
    raf.mockRestore();
  });

  it("animates with a canvas context and re-reads the color on theme change", () => {
    const ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement["getContext"];
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const { unmount } = render(<Particles quantity={3} vx={1} />);
    expect(raf).toHaveBeenCalled();
    document.documentElement.classList.add("dark");
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 5, clientY: 5 }));
    document.documentElement.classList.remove("dark");
    unmount();
    raf.mockRestore();
  });

  it("listens to pointermove only while the canvas is in view", () => {
    const ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement["getContext"];
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const callbacks: IntersectionObserverCallback[] = [];
    const OriginalIO = window.IntersectionObserver;
    class ControlledIO {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    window.IntersectionObserver = ControlledIO as unknown as typeof IntersectionObserver;
    const report = (isIntersecting: boolean) =>
      callbacks.at(-1)?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    const pointerAdds = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter((call) => call[0] === "pointermove").length;
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    try {
      const { unmount } = render(<Particles quantity={2} />);
      expect(pointerAdds(add)).toBe(0);
      report(false);
      expect(pointerAdds(add)).toBe(0);
      report(true);
      report(true);
      expect(pointerAdds(add)).toBe(1);
      report(false);
      expect(pointerAdds(remove)).toBe(1);
      report(true);
      expect(pointerAdds(add)).toBe(2);
      unmount();
      expect(pointerAdds(remove)).toBe(2);
    } finally {
      window.IntersectionObserver = OriginalIO;
      raf.mockRestore();
    }
  });

  it('variant="links" marks the root and strokes lines between nearby particles', () => {
    const ctx = { ...fakeContext(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), strokeStyle: "", lineWidth: 0 };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement["getContext"];
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Particles quantity={3} variant="links" linkDistance={50} />
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-variant", "links");
    // All three particles share a position, so each static frame links every pair (3 lines).
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(ctx.stroke.mock.calls.length % 3).toBe(0);
    vi.restoreAllMocks();
  });

  it("defaults to the particle color token and the dots variant", () => {
    const { container } = render(<Particles />);
    expect(container.firstElementChild?.className).toContain("text-pui-particle");
    expect(container.firstElementChild).toHaveAttribute("data-variant", "dots");
  });

  it("clamps quantity above 500 with a dev warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Particles quantity={900} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("quantity"));
    warn.mockRestore();
  });
});
