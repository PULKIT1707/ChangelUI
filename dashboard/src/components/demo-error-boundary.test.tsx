import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allowConsoleError } from "../../../test/utils/console";
import { analytics } from "../lib/analytics/client";
import { DemoErrorBoundary } from "./demo-error-boundary";

let shouldThrow = true;

function Flaky() {
  if (shouldThrow) throw new TypeError("Failed for jane@example.com at https://example.com/x id 1234567");
  return <p>Demo ok</p>;
}

describe("DemoErrorBoundary", () => {
  afterEach(() => {
    shouldThrow = true;
    vi.restoreAllMocks();
  });

  it("shows the fallback, reports a redacted demo_error once and re-renders on Retry", async () => {
    // React logs the caught render error through console.error.
    allowConsoleError();
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(
      <div>
        <p>Page stays</p>
        <DemoErrorBoundary component="button">
          <Flaky />
        </DemoErrorBoundary>
      </div>,
    );
    expect(screen.getByText("Page stays")).toBeInTheDocument();
    expect(screen.getByText("This demo crashed")).toBeInTheDocument();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("demo_error", {
      component: "button",
      phase: "render",
      error_name: "TypeError",
      error_message: "Failed for [redacted] at [redacted] id [redacted]",
    });

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Demo ok")).toBeInTheDocument();
    expect(screen.queryByText("This demo crashed")).toBeNull();
    expect(track).toHaveBeenCalledTimes(1);
  });
});
