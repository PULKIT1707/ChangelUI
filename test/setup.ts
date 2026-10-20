// Global test setup (design 11.1). Also runs for `@vitest-environment node` suites, so every
// DOM polyfill and stub is guarded by `typeof window !== "undefined"`.
import "@testing-library/jest-dom/vitest";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeEach, vi } from "vitest";
import { isConsoleErrorAllowed, resetConsoleErrorAllowance } from "./utils/console";
import { matchMediaMock, MockIntersectionObserver, MockResizeObserver, resetEnv } from "./utils/env";

// motion 12.43.0 exports MotionGlobalConfig from both "motion" and "motion/react" (same object).
// Skipping animations makes AnimatePresence exits finish synchronously.
MotionGlobalConfig.skipAnimations = true;

let cleanup: (() => void) | undefined;

if (typeof window !== "undefined") {
  ({ cleanup } = await import("@testing-library/react"));

  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMediaMock });
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(window, "ResizeObserver", { configurable: true, writable: true, value: MockResizeObserver });

  if (typeof window.PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
      readonly pointerId: number;
      readonly pointerType: string;
      readonly isPrimary: boolean;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
        this.isPrimary = init.isPrimary ?? true;
      }
    }
    Object.defineProperty(window, "PointerEvent", { configurable: true, writable: true, value: PointerEventPolyfill });
  }

  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => {};
  }

  if (typeof window.requestAnimationFrame !== "function") {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  }

  // jsdom 30 reports getContext as "not implemented" through console.error; return null instead.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement["getContext"];

  // Missing in jsdom 30; Slider and drag code call them.
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
const consoleErrors: unknown[][] = [];

beforeEach(() => {
  consoleErrors.length = 0;
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args);
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()), readText: vi.fn(() => Promise.resolve("")) },
    });
  }
});

afterEach(() => {
  cleanup?.();
  vi.useRealTimers();
  resetEnv();
  consoleErrorSpy?.mockRestore();
  const allowed = isConsoleErrorAllowed();
  resetConsoleErrorAllowance();
  if (!allowed && consoleErrors.length > 0) {
    const text = consoleErrors.map((args) => args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
    throw new Error(`console.error was called during the test:\n${text.join("\n")}`);
  }
});
