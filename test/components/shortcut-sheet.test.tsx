import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ShortcutSheet, type ShortcutGroup } from "../../src/components/shortcut-sheet";
const groups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: "mod+k", label: "Open command menu" },
      { keys: ["?", "shift+/"], label: "Show shortcuts" },
    ],
  },
  { title: "Navigation", shortcuts: [{ keys: "g i", label: "Go to inbox", keywords: ["mail"] }] },
];
describe("ShortcutSheet", () => {
  it("opens with the ? hotkey, labels the dialog and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const onOpenChange = vi.fn();
    render(<ShortcutSheet ref={ref} groups={groups} onOpenChange={onOpenChange} platform="other" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: "?" });
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(ref.current).toBe(dialog);
    expect(screen.getByText("Open command menu")).toBeInTheDocument();
    expect(screen.getAllByText("Ctrl").length).toBeGreaterThan(0);
  });
  it("ignores the hotkey while typing in a field", () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <input aria-label="Note" />
        <ShortcutSheet groups={groups} onOpenChange={onOpenChange} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("Note"), { key: "?" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it("filters by label, keyword and key, and announces the count", () => {
    render(<ShortcutSheet groups={groups} defaultOpen platform="other" />);
    const search = screen.getByRole("searchbox", { name: "Search shortcuts" });
    fireEvent.change(search, { target: { value: "mail" } });
    expect(screen.getByText("Go to inbox")).toBeInTheDocument();
    expect(screen.queryByText("Open command menu")).toBeNull();
    expect(screen.getByText("1 shortcut found")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(/No shortcuts match/)).toBeInTheDocument();
  });
  it("lights the keys you hold and checks the matching row", () => {
    render(<ShortcutSheet groups={groups} defaultOpen platform="mac" />);
    act(() => {
      fireEvent.keyDown(window, { key: "Meta" });
      fireEvent.keyDown(window, { key: "k" });
    });
    const row = screen.getByText("Open command menu").closest("li");
    expect(row).toHaveAttribute("data-matched");
    expect(screen.getByText("Command K")).toBeInTheDocument();
    act(() => {
      fireEvent.keyUp(window, { key: "Meta" });
    });
    expect(row).not.toHaveAttribute("data-matched");
  });
  it("keeps practiced combos from reaching the page while open", () => {
    const onPage = vi.fn();
    document.addEventListener("keydown", onPage);
    render(<ShortcutSheet groups={groups} defaultOpen platform="other" />);
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(onPage).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "x" });
    expect(onPage).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", onPage);
  });
  it("renders on the server without opening", () => {
    expect(renderToString(<ShortcutSheet groups={groups} />)).toBe("");
  });
});
