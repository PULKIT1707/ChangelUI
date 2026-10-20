import { describe, expect, it, vi } from "vitest";
import { playKeyframes } from "../../src/lib/waapi";

const frames: Keyframe[] = [{ transform: "scale(0.9)" }, { transform: "scale(1)" }];

function fakeAnimation() {
  return { cancel: vi.fn(), onfinish: null } as unknown as Animation;
}

describe("playKeyframes", () => {
  it("no-ops for a null element or without Element.animate", () => {
    expect(() => playKeyframes(null, frames, { duration: 100 })).not.toThrow();
    const el = document.createElement("div");
    expect(typeof el.animate).not.toBe("function");
    expect(() => playKeyframes(el, frames, { duration: 100 })).not.toThrow();
  });

  it("calls animate once with the given frames and options", () => {
    const el = document.createElement("div");
    const animate = vi.fn(() => fakeAnimation());
    Object.defineProperty(el, "animate", { configurable: true, value: animate });
    playKeyframes(el, frames, { duration: 120, easing: "ease-out" });
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(frames, { duration: 120, easing: "ease-out" });
  });

  it("cancels the previous animation it started on the same element", () => {
    const el = document.createElement("div");
    const first = fakeAnimation();
    const second = fakeAnimation();
    const animate = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    Object.defineProperty(el, "animate", { configurable: true, value: animate });
    playKeyframes(el, frames, { duration: 100 });
    playKeyframes(el, frames, { duration: 100 });
    expect(first.cancel).toHaveBeenCalledTimes(1);
    expect(second.cancel).not.toHaveBeenCalled();
  });
});
