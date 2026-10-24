import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../lib/analytics/client";
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
    vi.restoreAllMocks();
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

  it("opens the privacy page and scrolls to the privacy settings", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    let input = await openPalette(user);
    await user.type(input, "privacy");
    expect(screen.getAllByRole("option").map(optionTitle)).toEqual(expect.arrayContaining(["Privacy", "Privacy settings"]));
    await user.click(screen.getAllByRole("option").find((o) => optionTitle(o) === "Privacy") as HTMLElement);
    await waitFor(() => expect(window.location.hash).toBe("#/docs/privacy"));

    window.location.hash = "";
    const settings = document.createElement("section");
    settings.id = "privacy-settings";
    document.body.append(settings);
    const scroll = vi.spyOn(settings, "scrollIntoView");
    try {
      input = await openPalette(user);
      await user.type(input, "privacy settings");
      expect(optionTitle(activeOption(input))).toBe("Privacy settings");
      await user.keyboard("{Enter}");
      await waitFor(() => expect(window.location.hash).toBe("#/docs/privacy"));
      await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: "start" }));
    } finally {
      settings.remove();
    }
  });

  it("opens Developer's Pick", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = await openPalette(user);
    await user.type(input, "developer");
    expect(optionTitle(activeOption(input))).toBe("Developer's Pick");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.hash).toBe("#/picks"));
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

  describe("analytics", () => {
    it("tracks palette_opened and debounced searches, with the text only for zero results", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const track = vi.spyOn(analytics, "track");
      render(<Harness />);
      const input = await openPalette(user);
      expect(track).toHaveBeenCalledWith("palette_opened", {});

      await user.type(input, "ZZZQQQ");
      const searches = () => track.mock.calls.filter(([name]) => name === "palette_search");
      // Nothing before the debounce ends, then one event for the final query.
      expect(searches()).toEqual([]);
      act(() => vi.advanceTimersByTime(800));
      expect(searches()).toEqual([["palette_search", { query_length: 6, result_count: 0, query: "zzzqqq" }]]);

      await user.clear(input);
      await user.type(input, "button");
      act(() => vi.advanceTimersByTime(800));
      expect(searches()).toHaveLength(2);
      const [, props] = searches()[1] ?? [];
      expect(props).toMatchObject({ query_length: 6 });
      expect(props).not.toHaveProperty("query");
      expect((props as { result_count: number }).result_count).toBeGreaterThan(0);

      // The same query again is not reported twice.
      await user.type(input, " ");
      act(() => vi.advanceTimersByTime(800));
      expect(searches()).toHaveLength(2);
    });

    it("tracks the selected result with its kind, target and position", async () => {
      const user = userEvent.setup();
      const track = vi.spyOn(analytics, "track");
      render(<Harness />);
      const input = await openPalette(user);
      await user.type(input, "butt");
      await user.keyboard("{Enter}");
      await waitFor(() => expect(window.location.hash).toBe("#/components/button"));
      expect(track).toHaveBeenCalledWith("palette_result_selected", { kind: "item", target: "button", position: 0, query_length: 4 });
    });

    it("tracks a copied install command from the palette", async () => {
      const user = userEvent.setup();
      const track = vi.spyOn(analytics, "track");
      render(<Harness />);
      const input = await openPalette(user);
      await user.type(input, "copy install");
      await user.keyboard("{Enter}");
      await waitFor(() => expect(track).toHaveBeenCalledWith("install_command_copied", { surface: "palette" }));
      expect(track).toHaveBeenCalledWith("palette_result_selected", {
        kind: "action",
        target: "action-copy-install",
        position: 0,
        query_length: 12,
      });
    });
  });
});
