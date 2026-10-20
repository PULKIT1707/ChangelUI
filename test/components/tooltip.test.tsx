import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "../../src/components/tooltip";
import { setResizeObserverMode } from "../utils/env";
import { setupFakeTimers } from "../utils/timers";

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

// The warm window is global; let it expire between tests.
afterEach(() => {
  vi.useRealTimers();
});

function Example(props: Partial<React.ComponentProps<typeof Tooltip>>) {
  return (
    <>
      <Tooltip content="Save file" {...props}>
        <button type="button">Save</button>
      </Tooltip>
      <button type="button">Other</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Save" });

describe("Tooltip", () => {
  it("keyboard focus shows it after openDelayMs; Escape hides it; aria-describedby only while open", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(10_000);
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    await user.tab();
    expect(trigger()).toHaveFocus();
    // shouldAdvanceTime lets a few real milliseconds through, so leave slack around the 400ms delay.
    advance(300);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger()).not.toHaveAttribute("aria-describedby");
    advance(100);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Save file");
    expect(trigger()).toHaveAttribute("aria-describedby", tooltip.id);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(trigger()).not.toHaveAttribute("aria-describedby");
    expect(trigger()).toHaveFocus();
  });

  it("touch pointerenter does not open it; mouse hover does after the delay", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(20_000);
    render(<Example openDelayMs={200} />);
    fireEvent.pointerEnter(trigger(), { pointerType: "touch" });
    advance(500);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.hover(trigger());
    advance(200);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("stays open while the pointer moves onto the content, closes after leaving both", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(30_000);
    render(<Example />);
    await user.hover(trigger());
    advance(400);
    const tooltip = screen.getByRole("tooltip");
    await user.unhover(trigger());
    advance(50);
    await user.hover(tooltip);
    advance(500);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.unhover(tooltip);
    advance(100);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("opens at once while warm (another tooltip closed under 300ms ago)", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(40_000);
    render(
      <>
        <Tooltip content="First">
          <button type="button">A</button>
        </Tooltip>
        <Tooltip content="Second">
          <button type="button">B</button>
        </Tooltip>
      </>,
    );
    await user.hover(screen.getByRole("button", { name: "A" }));
    advance(400);
    expect(screen.getByRole("tooltip")).toHaveTextContent("First");
    await user.unhover(screen.getByRole("button", { name: "A" }));
    advance(100);
    await user.hover(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Second");
  });

  it("closes on blur", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(50_000);
    render(<Example openDelayMs={0} />);
    await user.tab();
    advance(0);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.tab();
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("puts ref and className on the content, merges an existing aria-describedby and renders an arrow", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tooltip content="Hint" open arrow className="custom" side="bottom" ref={ref}>
        <button type="button" aria-describedby="help">
          Help
        </button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(ref.current).toBe(tooltip);
    expect(tooltip.className).toContain("custom");
    expect(tooltip).toHaveAttribute("data-side", "bottom");
    expect(tooltip.querySelector("[data-pui-tooltip-arrow]")).not.toBeNull();
    expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", `help ${tooltip.id}`);
  });

  it("stays hidden until positioned (async ResizeObserver)", async () => {
    setResizeObserverMode("async");
    render(<Example defaultOpen />);
    expect(screen.getByRole("tooltip", { hidden: true }).style.visibility).toBe("hidden");
    await waitFor(() => expect(screen.getByRole("tooltip").style.visibility).toBe(""));
  });

  it("controlled open reports requests; disabled never opens", async () => {
    const user = setupFakeTimers();
    vi.setSystemTime(60_000);
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} openDelayMs={0} />);
    await user.hover(trigger());
    advance(0);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("tooltip")).toBeNull();
    rerender(<Example open disabled />);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reflects the parent's open state", () => {
    function Parent() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            hide
          </button>
          <Example open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Parent />);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "hide" }));
    return waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("renders a non-element child without a tooltip and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Tooltip content="x">{"plain text" as unknown as React.ReactElement}</Tooltip>);
    expect(screen.getByText("plain text")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Tooltip expects a single element child"));
    warn.mockRestore();
  });
});
