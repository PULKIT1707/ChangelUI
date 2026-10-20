import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createRovingStore,
  RovingFocusProvider,
  useRovingFocus,
  useRovingItem,
  type RovingOrientation,
} from "../../src/lib/roving-focus";

interface ItemSpec {
  key: string;
  disabled?: boolean;
}

function Item({ itemKey, disabled }: { itemKey: string; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const props = useRovingItem(itemKey, { ref, disabled });
  return (
    <button ref={ref} type="button" disabled={disabled} {...props}>
      {itemKey}
    </button>
  );
}

function Group({
  items,
  selectedKey,
  orientation = "horizontal",
  loop,
  manageTabStop,
  onActivate,
  dir,
}: {
  items: ItemSpec[];
  selectedKey?: string | null;
  orientation?: RovingOrientation;
  loop?: boolean;
  manageTabStop?: boolean;
  onActivate?: (key: string) => void;
  dir?: "rtl";
}) {
  const { containerProps, value } = useRovingFocus({ orientation, loop, selectedKey, manageTabStop, onActivate });
  return (
    <RovingFocusProvider value={value}>
      <div role="group" aria-label="group" dir={dir} style={dir ? { direction: "rtl" } : undefined} {...containerProps}>
        {items.map((item) => (
          <Item key={item.key} itemKey={item.key} disabled={item.disabled} />
        ))}
      </div>
    </RovingFocusProvider>
  );
}

const abc: ItemSpec[] = [{ key: "a" }, { key: "b" }, { key: "c" }];
const tabStops = () => screen.getAllByRole("button").filter((b) => b.tabIndex === 0).map((b) => b.textContent);

describe("roving focus: tab stop resolution", () => {
  it("selected wins when registered and enabled", () => {
    render(<Group items={abc} selectedKey="b" />);
    expect(tabStops()).toEqual(["b"]);
    expect(screen.getByRole("group")).not.toHaveAttribute("tabindex");
  });

  it("falls back to the first enabled item with no selection, a stale or a disabled selection", () => {
    const { rerender } = render(<Group items={abc} selectedKey={null} />);
    expect(tabStops()).toEqual(["a"]);
    rerender(<Group items={abc} selectedKey="zzz" />);
    expect(tabStops()).toEqual(["a"]);
    rerender(<Group items={[{ key: "a", disabled: true }, { key: "b" }, { key: "c", disabled: true }]} selectedKey="c" />);
    expect(tabStops()).toEqual(["b"]);
    expect(screen.getByRole("group")).not.toHaveAttribute("tabindex");
  });

  it("uses the focused item when nothing is selected, and keeps it across re-renders", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Group items={abc} />);
    await user.click(screen.getByText("c"));
    expect(tabStops()).toEqual(["c"]);
    rerender(<Group items={abc} loop={false} />);
    expect(tabStops()).toEqual(["c"]);
  });

  it("orders newly inserted items by DOM position", () => {
    const { rerender } = render(<Group items={[{ key: "b" }, { key: "c" }]} />);
    expect(tabStops()).toEqual(["b"]);
    rerender(<Group items={[{ key: "a" }, { key: "b" }, { key: "c" }]} />);
    expect(tabStops()).toEqual(["a"]);
  });

  it("store returns null when everything is disabled or unregistered", () => {
    const store = createRovingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getTabStopKey()).toBeNull();
    const el = document.createElement("button");
    expect(store.isEmpty()).toBe(true);
    const unregister = store.register({ key: "x", el, disabled: true });
    expect(store.getTabStopKey()).toBeNull();
    expect(store.isEmpty()).toBe(false);
    unregister();
    expect(store.isEmpty()).toBe(true);
    // Only the empty flag changed (twice); the tab stop stayed null.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("a fully disabled widget has no tab stop after mount, not even the container", () => {
    render(<Group items={abc.map((item) => ({ ...item, disabled: true }))} />);
    expect(tabStops()).toEqual([]);
    expect(screen.getByRole("group")).not.toHaveAttribute("tabindex");
  });

  it("manageTabStop false keeps every item at -1", () => {
    render(<Group items={abc} selectedKey="a" manageTabStop={false} />);
    expect(tabStops()).toEqual([]);
    expect(screen.getByRole("group")).not.toHaveAttribute("tabindex");
  });
});

describe("roving focus: server render", () => {
  it("puts the tab stop on the selected item", () => {
    const html = renderToString(<Group items={abc} selectedKey="b" />);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toMatch(/tabindex="0"[^>]*data-key="b"/);
  });

  it("puts the tab stop on the container with no value", () => {
    const html = renderToString(<Group items={abc} />);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toMatch(/role="group"[^>]*tabindex="0"/);
  });

  it("never gives a disabled selected item the tab stop", () => {
    const html = renderToString(<Group items={[{ key: "a", disabled: true }, { key: "b" }]} selectedKey="a" />);
    expect(html).not.toMatch(/tabindex="0"/);
  });
});

describe("roving focus: navigation", () => {
  it("arrows move, wrap, skip disabled and call onActivate; Home/End jump", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Group items={[{ key: "a" }, { key: "b", disabled: true }, { key: "c" }]} onActivate={onActivate} />);
    await user.tab();
    expect(screen.getByText("a")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("c")).toHaveFocus();
    expect(onActivate).toHaveBeenLastCalledWith("c");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("a")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("c")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByText("a")).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByText("c")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("c")).toHaveFocus();
  });

  it("does not wrap without loop", async () => {
    const user = userEvent.setup();
    render(<Group items={abc} loop={false} />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("a")).toHaveFocus();
    await user.keyboard("{End}{ArrowRight}");
    expect(screen.getByText("c")).toHaveFocus();
  });

  it("vertical uses Up/Down; both accepts all arrows", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Group items={abc} orientation="vertical" />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("a")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("b")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("a")).toHaveFocus();
    unmount();
    render(<Group items={abc} orientation="both" />);
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(screen.getByText("c")).toHaveFocus();
  });

  it("flips Left/Right in RTL", async () => {
    const user = userEvent.setup();
    render(<Group items={abc} dir="rtl" />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("b")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("a")).toHaveFocus();
  });

  it("the container forwards focus to the tab stop item", () => {
    render(<Group items={abc} selectedKey="b" />);
    const group = screen.getByRole("group");
    group.tabIndex = 0;
    group.focus();
    expect(screen.getByText("b")).toHaveFocus();
  });

  it("throws when an item is outside its widget", () => {
    expect(() => renderToString(<Item itemKey="x" />)).toThrow("useRovingItem must be used inside its widget");
  });
});
