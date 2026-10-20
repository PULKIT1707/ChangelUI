import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";

/**
 * Fake timers plus a matching userEvent instance (design 11.1), so user-event's internal delays
 * advance with the fake clock. Call vi.useRealTimers() in afterEach (setup.ts does it globally).
 */
export function setupFakeTimers(): ReturnType<typeof userEvent.setup> {
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "Date",
    ],
  });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}
