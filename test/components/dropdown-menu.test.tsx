import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuItemProps,
} from "../../src/components/dropdown-menu";
import { setResizeObserverMode } from "../utils/env";
import { setupFakeTimers } from "../utils/timers";

function Menu({
  onSelect,
  onCheckedChange,
  contentRef,
}: {
  onSelect?: DropdownMenuItemProps["onSelect"];
  onCheckedChange?: (checked: boolean) => void;
  contentRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent ref={contentRef}>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onSelect} shortcut="⌘P" icon={<span />}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Sharing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Security</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem onCheckedChange={onCheckedChange}>Notifications</DropdownMenuCheckboxItem>
          <DropdownMenuItem tone="danger">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button">Outside</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Actions" });
const item = (name: string) => screen.getByRole("menuitem", { name: new RegExp(`^${name}`) });

describe("DropdownMenu", () => {
  it("ArrowDown on the trigger opens the menu and focuses the first item", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(<Menu contentRef={ref} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu");
    expect(ref.current).toBe(menu);
    expect(menu).toHaveAttribute("aria-labelledby", trigger().id);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", menu.id);
    expect(item("Profile")).toHaveFocus();
    expect(item("Profile")).toHaveAttribute("data-highlighted");
    expect(screen.getAllByRole("menuitem").every((el) => el.tabIndex === -1)).toBe(true);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("waits for the position before focusing (async ResizeObserver)", async () => {
    setResizeObserverMode("async");
    render(<Menu />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    expect(screen.getByRole("menu", { hidden: true }).style.visibility).toBe("hidden");
    expect(trigger()).toHaveFocus();
    await waitFor(() => expect(item("Profile")).toHaveFocus());
  });

  it("ArrowUp opens on the last item; arrows loop and skip disabled items; Home/End jump", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    trigger().focus();
    await user.keyboard("{ArrowUp}");
    expect(item("Sign out")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Profile")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Settings")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Sign out")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Profile")).toHaveFocus();
  });

  it("typeahead focuses the first match and repeated letters cycle", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await user.keyboard("s");
    expect(item("Settings")).toHaveFocus();
    await user.keyboard("s");
    expect(item("Security")).toHaveFocus();
    await user.keyboard("s");
    expect(item("Sign out")).toHaveFocus();
  });

  it("typeahead resets after 500ms", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Menu />);
    fireEvent.keyDown(trigger(), { key: "Enter" });
    await waitFor(() => expect(item("Profile")).toHaveFocus());
    fireEvent.keyDown(item("Profile"), { key: "s" });
    fireEvent.keyDown(item("Settings"), { key: "e" });
    expect(item("Settings")).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.keyDown(item("Settings"), { key: "p" });
    expect(item("Profile")).toHaveFocus();
  });

  it("Enter fires onSelect, closes and refocuses the trigger", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Menu onSelect={onSelect} />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toBeInstanceOf(Event);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("preventDefault in onSelect keeps the menu open", async () => {
    const user = userEvent.setup();
    render(<Menu onSelect={(event) => event.preventDefault()} />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("Escape closes and returns focus; Tab closes and focuses the trigger", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    trigger().focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.tab();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("checkbox items toggle aria-checked, then close", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Menu onCheckedChange={onCheckedChange} />);
    await user.click(trigger());
    const checkbox = screen.getByRole("menuitemcheckbox", { name: "Notifications" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("checkbox items flip in place when onSelect keeps the menu open, and can be controlled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem defaultChecked onSelect={(event) => event.preventDefault()}>
            Grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange} onSelect={(e) => e.preventDefault()}>
            Rulers
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const grid = screen.getByRole("menuitemcheckbox", { name: "Grid" });
    expect(grid).toHaveAttribute("aria-checked", "true");
    expect(grid).toHaveAttribute("data-state", "checked");
    await user.click(grid);
    expect(grid).toHaveAttribute("aria-checked", "false");
    const rulers = screen.getByRole("menuitemcheckbox", { name: "Rulers" });
    await user.click(rulers);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(rulers).toHaveAttribute("aria-checked", "false");
  });

  it("a pointer click focuses the content with nothing highlighted; pointer movement focuses items", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(trigger());
    const menu = screen.getByRole("menu");
    expect(menu).toHaveFocus();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    fireEvent.pointerMove(item("Settings"));
    expect(item("Settings")).toHaveFocus();
    expect(item("Settings")).toHaveAttribute("data-highlighted");
    expect(item("Settings").querySelector("[data-pui-menu-highlight]")).not.toBeNull();
    fireEvent.pointerLeave(item("Settings"));
    expect(menu).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Profile")).toHaveFocus();
    fireEvent.pointerMove(item("Sharing"));
    expect(item("Sharing")).not.toHaveFocus();
  });

  it("an outside pointerdown closes; clicking the trigger again closes", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(trigger());
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await user.click(trigger());
    await user.click(trigger());
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("disabled items ignore activation; danger tone and asChild items render", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled onSelect={onSelect}>
            Off
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="#docs">Docs</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const off = screen.getByRole("menuitem", { name: "Off" });
    expect(off).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(off);
    expect(onSelect).not.toHaveBeenCalled();
    const link = screen.getByRole("menuitem", { name: "Docs" });
    expect(link.tagName).toBe("A");
    await user.click(link);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

function SubMenu({
  onSelect,
  onValueChange,
  defaultValue = "date",
}: {
  onSelect?: DropdownMenuItemProps["onSelect"];
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>New file</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={onSelect}>Copy link</DropdownMenuItem>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Slack</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup defaultValue={defaultValue} onValueChange={onValueChange} aria-label="Sort by">
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const subTrigger = () => screen.getByRole("menuitem", { name: "Share" });
const menus = () => screen.queryAllByRole("menu");

async function openRoot(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("button", { name: "Options" }).focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "New file" })).toHaveFocus();
}

describe("DropdownMenu submenus", () => {
  it("ArrowRight opens the submenu and focuses its first item; ArrowLeft returns", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}");
    expect(subTrigger()).toHaveFocus();
    expect(subTrigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(subTrigger()).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowRight}");
    const sub = await screen.findByRole("menu", { name: "Share" });
    expect(subTrigger()).toHaveAttribute("aria-expanded", "true");
    expect(subTrigger()).toHaveAttribute("aria-controls", sub.id);
    expect(subTrigger()).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toHaveFocus();
    // The trigger stays highlighted while its submenu has focus.
    expect(subTrigger()).toHaveAttribute("data-highlighted");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Share" })).toBeNull());
    expect(subTrigger()).toHaveFocus();
    expect(menus()).toHaveLength(1);
  });

  it("ArrowLeft on a root-level SubTrigger does nothing", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(subTrigger()).toHaveFocus();
    expect(menus()).toHaveLength(1);
  });

  it("Escape in the submenu closes only the submenu", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Copy link" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(menus()).toHaveLength(1));
    expect(subTrigger()).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(menus()).toHaveLength(0));
    expect(screen.getByRole("button", { name: "Options" })).toHaveFocus();
  });

  it("selecting a submenu item closes everything and focuses the root trigger", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SubMenu onSelect={onSelect} />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{ }");
    expect(await screen.findByRole("menuitem", { name: "Copy link" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(menus()).toHaveLength(0));
    expect(screen.getByRole("button", { name: "Options" })).toHaveFocus();
  });

  it("typeahead works inside the submenu without moving the root", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(await screen.findByRole("menuitem", { name: "Copy link" })).toHaveFocus();
    await user.keyboard("s");
    expect(screen.getByRole("menuitem", { name: "Slack" })).toHaveFocus();
    expect(menus()).toHaveLength(2);
  });

  it("Tab in the submenu closes the whole menu", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{ArrowRight}");
    await screen.findByRole("menu", { name: "Share" });
    await user.keyboard("{Tab}");
    await waitFor(() => expect(menus()).toHaveLength(0));
  });

  it("hover opens the submenu after 100ms without moving focus into it", async () => {
    setupFakeTimers();
    render(<SubMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.pointerMove(subTrigger());
    expect(subTrigger()).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(menus()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("menu", { name: "Share" })).toBeInTheDocument();
    expect(subTrigger()).toHaveFocus();
  });

  it("the pointer can cross a sibling inside the safe triangle without closing the submenu", async () => {
    setupFakeTimers();
    render(<SubMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.pointerMove(subTrigger());
    act(() => {
      vi.advanceTimersByTime(120);
    });
    const sub = screen.getByRole("menu", { name: "Share" });
    // Submenu to the right of the trigger: x 200..360, y 40..160.
    vi.spyOn(sub, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 200, y: 40, width: 160, height: 120 }));
    const rename = screen.getByRole("menuitem", { name: "Rename" });
    fireEvent.pointerLeave(subTrigger(), { clientX: 190, clientY: 60 });
    expect(subTrigger()).toHaveFocus();
    // Diagonally down-right over the sibling, still inside the triangle.
    fireEvent.pointerMove(document, { clientX: 195, clientY: 70 });
    fireEvent.pointerMove(rename, { clientX: 195, clientY: 70 });
    expect(rename).not.toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("menu", { name: "Share" })).toBeInTheDocument();
    // Into the submenu: transit ends and the items take focus again.
    fireEvent.pointerMove(document, { clientX: 220, clientY: 80 });
    fireEvent.pointerMove(screen.getByRole("menuitem", { name: "Email" }));
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
  });

  it("leaving the trigger away from the submenu closes it after a grace period", async () => {
    setupFakeTimers();
    render(<SubMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.pointerMove(subTrigger());
    act(() => {
      vi.advanceTimersByTime(120);
    });
    const sub = screen.getByRole("menu", { name: "Share" });
    vi.spyOn(sub, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 200, y: 40, width: 160, height: 120 }));
    fireEvent.pointerLeave(subTrigger(), { clientX: 190, clientY: 60 });
    fireEvent.pointerMove(document, { clientX: 60, clientY: 140 });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("menu", { name: "Share" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Share" })).toBeNull());
    expect(menus()).toHaveLength(1);
  });

  it("a pointerdown on a root item closes only the submenu", async () => {
    const user = userEvent.setup();
    render(<SubMenu />);
    await openRoot(user);
    await user.keyboard("{ArrowDown}{ArrowRight}");
    await screen.findByRole("menu", { name: "Share" });
    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "Rename" }));
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Share" })).toBeNull());
    expect(menus()).toHaveLength(1);
  });
});

describe("DropdownMenu radio items", () => {
  it("renders menuitemradio with aria-checked from the uncontrolled default", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SubMenu onValueChange={onValueChange} />);
    await openRoot(user);
    const radios = screen.getAllByRole("menuitemradio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios[1]).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("group", { name: "Sort by" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitemradio", { name: "Size" }));
    expect(onValueChange).toHaveBeenCalledWith("size");
    await waitFor(() => expect(menus()).toHaveLength(0));
    await openRoot(user);
    expect(screen.getByRole("menuitemradio", { name: "Size" })).toHaveAttribute("aria-checked", "false");
  });

  it("a controlled group reflects the parent's value and keeps the menu open on preventDefault", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="a">Alpha</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b" onSelect={(e) => e.preventDefault()}>
              Beta
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Beta" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("menuitemradio", { name: "Beta" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    rerender(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="b" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="a">Alpha</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Beta</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("menuitemradio", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
  });
});
