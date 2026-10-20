import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  type PopoverProps,
} from "../../src/components/popover";
import { setResizeObserverMode } from "../utils/env";

function Example({ content, ...props }: Partial<PopoverProps> & { content?: React.ComponentProps<typeof PopoverContent> }) {
  return (
    <>
      <Popover {...props}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label="Details" {...content}>
          <button type="button">First</button>
          <PopoverClose>Close</PopoverClose>
        </PopoverContent>
      </Popover>
      <input aria-label="Outside" />
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Open" });

describe("Popover", () => {
  it("wires the trigger, opens a non-modal dialog and focuses the first tabbable", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(<Example content={{ ref, arrow: true, side: "top" }} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");
    await user.click(trigger());
    const dialog = screen.getByRole("dialog", { name: "Details" });
    expect(ref.current).toBe(dialog);
    expect(dialog).not.toHaveAttribute("aria-modal");
    // jsdom has no layout, so "top" (no room above a 0x0 trigger) flips to the side with more room.
    expect(dialog).toHaveAttribute("data-side", "bottom");
    expect(dialog.querySelector("[data-pui-popover-arrow]")).not.toBeNull();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", dialog.id);
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("initialFocus waits until the content is positioned (async ResizeObserver)", async () => {
    setResizeObserverMode("async");
    render(<Example />);
    trigger().focus();
    fireEvent.click(trigger());
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog.style.visibility).toBe("hidden");
    expect(trigger()).toHaveFocus();
    await waitFor(() => expect(screen.getByRole("button", { name: "First" })).toHaveFocus());
    expect(dialog.style.visibility).toBe("");
  });

  it('initialFocus="content" focuses the panel', async () => {
    const user = userEvent.setup();
    render(<Example content={{ initialFocus: "content" }} />);
    await user.click(trigger());
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("Escape closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("PopoverClose closes and returns focus; the trigger toggles", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
    await user.click(trigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(trigger());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("an outside pointerdown closes it without moving focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    const first = screen.getByRole("button", { name: "First" });
    expect(first).toHaveFocus();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).not.toHaveFocus();
  });

  it("closes when focus leaves both the content and the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    screen.getByRole("textbox", { name: "Outside" }).focus();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the popover open when focus moves between content and trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger());
    trigger().focus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    screen.getByRole("button", { name: "First" }).focus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("controlled open reports requests and follows the parent", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = render(<Example open={false} onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    function Parent() {
      const [open, setOpen] = useState(false);
      return <Example open={open} onOpenChange={setOpen} />;
    }
    render(<Parent />);
    await user.click(trigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("supports asChild triggers and closers", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger asChild>
          <span role="button" tabIndex={0}>
            Custom
          </span>
        </PopoverTrigger>
        <PopoverContent aria-label="Panel">
          <PopoverClose asChild>
            <a href="#done">Done</a>
          </PopoverClose>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByRole("link", { name: "Done" })).toHaveFocus();
    await user.click(screen.getByRole("link", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
