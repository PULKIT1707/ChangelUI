import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../src/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../src/components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/components/popover";
import { Tooltip } from "../../src/components/tooltip";

// Design 6 (layer stack) and 11.3 (Layer stack, Dialog + DropdownMenu).
describe("layer stack", () => {
  it.each([
    [true, "stays open"],
    [false, "closes"],
  ])("an inner Escape handler with preventDefault=%s: the Dialog %s", async (consume) => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Outer</DialogTitle>
          <input
            aria-label="Combobox"
            onKeyDown={(event) => {
              if (consume && event.key === "Escape") event.preventDefault();
            }}
          />
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("textbox", { name: "Combobox" })).toHaveFocus();
    await user.keyboard("{Escape}");
    if (consume) expect(screen.getByRole("dialog")).toBeInTheDocument();
    else await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("a DropdownMenu inside a Dialog takes focus, and Escape closes the menu first", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger>More</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const more = screen.getByRole("button", { name: "More" });
    more.focus();
    await user.keyboard("{ArrowDown}");
    // The menu is portaled outside the dialog; the paused trap does not pull focus back.
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(more).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Open dialog" })).toHaveFocus();
  });

  it("a Tooltip inside a Dialog closes on Escape before the Dialog", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>With hint</DialogTitle>
          <Tooltip content="Hint" defaultOpen>
            <button type="button">Help</button>
          </Tooltip>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("a Tooltip on top of a Popover does not block the Popover's outside-click dismissal", async () => {
    const ui = (tooltipOpen: boolean) => (
      <div>
        <span>Outside</span>
        <Popover defaultOpen>
          <PopoverTrigger>Filters</PopoverTrigger>
          <PopoverContent aria-label="Filters">
            <Tooltip content="Hint" open={tooltipOpen}>
              <button type="button">Help</button>
            </Tooltip>
          </PopoverContent>
        </Popover>
      </div>
    );
    const { rerender } = render(ui(false));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    // Opening the tooltip after the popover puts the tooltip layer on top of the stack.
    rerender(ui(true));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Outside"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
  });

  it("a pointerdown on a Tooltip bubble keeps the Popover beneath it open", async () => {
    const ui = (tooltipOpen: boolean) => (
      <Popover defaultOpen>
        <PopoverTrigger>Filters</PopoverTrigger>
        <PopoverContent aria-label="Filters">
          <Tooltip content="Hint" open={tooltipOpen}>
            <button type="button">Help</button>
          </Tooltip>
        </PopoverContent>
      </Popover>
    );
    const { rerender } = render(ui(false));
    rerender(ui(true));
    const bubble = screen.getByRole("tooltip");
    // The bubble is portaled to body, outside the popover's content.
    expect(screen.getByRole("dialog", { name: "Filters" })).not.toContainElement(bubble);
    fireEvent.pointerDown(bubble);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });

  it("a pointerdown on a Tooltip bubble keeps the DropdownMenu beneath it open", async () => {
    const ui = (tooltipOpen: boolean) => (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>More</DropdownMenuTrigger>
        <DropdownMenuContent>
          <Tooltip content="Hint" open={tooltipOpen}>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const { rerender } = render(ui(false));
    rerender(ui(true));
    fireEvent.pointerDown(screen.getByRole("tooltip"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("an open Tooltip's trigger outside a Popover still counts as outside the Popover", async () => {
    const ui = (tooltipOpen: boolean) => (
      <div>
        <Tooltip content="Hint" open={tooltipOpen}>
          <button type="button">Help</button>
        </Tooltip>
        <Popover defaultOpen>
          <PopoverTrigger>Filters</PopoverTrigger>
          <PopoverContent aria-label="Filters">Body</PopoverContent>
        </Popover>
      </div>
    );
    const { rerender } = render(ui(false));
    rerender(ui(true));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Help" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
  });
});
