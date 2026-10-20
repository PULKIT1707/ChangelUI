import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RECENT_KEY } from "../lib/recent";
import { CommandPalette } from "./command-palette";

function Harness({ onThemeClick = () => {} }: { onThemeClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const themeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button">before</button>
      <button type="button" ref={themeRef} onClick={onThemeClick}>
        theme
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} themeToggleRef={themeRef} />
    </>
  );
}

function activeOption(input: HTMLElement): HTMLElement {
  const id = input.getAttribute("aria-activedescendant");
  const option = id ? document.getElementById(id) : null;
  if (!option) throw new Error("no active option");
  return option;
}

const optionTitle = (option: HTMLElement) => option.firstElementChild?.textContent;

async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard("{Control>}k{/Control}");
  const input = await screen.findByRole("combobox");
  await waitFor(() => expect(input).toHaveFocus());
  return input;
}

describe("CommandPalette", () => {
  afterEach(() => {
    window.location.hash = "";
    window.localStorage.clear();
  });

  it("opens with Ctrl+K, ranks Button first, opens it with Enter and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const before = screen.getByRole("button", { name: "before" });
    before.focus();

    const input = await openPalette(user);
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("maxLength", "100");
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-controls", listbox.id);

    await user.type(input, "butt");
    const option = activeOption(input);
    expect(optionTitle(option)).toBe("Button");
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(within(listbox).getByRole("group", { name: "Components" })).toContainElement(option);

    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.hash).toBe("#/components/button"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]")).toEqual(["button"]);

    before.focus();
    await openPalette(user);
    // The empty query lists recent items first.
    expect(screen.getByRole("group", { name: "Recent" })).toHaveTextContent("Button");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(before).toHaveFocus());
  });

  it("wraps arrow navigation, shows an empty state and runs actions", async () => {
    const user = userEvent.setup();
    const onThemeClick = vi.fn();
    render(<Harness onThemeClick={onThemeClick} />);
    const input = await openPalette(user);

    const options = screen.getAllByRole("option");
    expect(optionTitle(activeOption(input))).toBe(optionTitle(options[0] as HTMLElement));
    await user.keyboard("{ArrowUp}");
    expect(activeOption(input)).toBe(options[options.length - 1]);
    await user.keyboard("{ArrowDown}");
    expect(activeOption(input)).toBe(options[0]);

    await user.type(input, "zzzqqq");
    expect(screen.getByRole("status")).toHaveTextContent("No results for “zzzqqq”");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.clear(input);
    await user.type(input, "toggle theme");
    expect(optionTitle(activeOption(input))).toBe("Toggle theme");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onThemeClick).toHaveBeenCalledTimes(1));

    await openPalette(user);
    await user.type(screen.getByRole("combobox"), "theming");
    await user.click(screen.getAllByRole("option").find((o) => optionTitle(o) === "Theming") as HTMLElement);
    await waitFor(() => expect(window.location.hash).toBe("#/docs/theming"));
  });

  it("copies the install command", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub, so spy on whatever is there now.
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<Harness />);
    const input = await openPalette(user);
    await user.type(input, "copy install");
    expect(optionTitle(activeOption(input))).toBe("Copy install command");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("npm install changelui motion"));
  });
});
