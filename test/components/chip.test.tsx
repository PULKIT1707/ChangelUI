import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "../../src/components/chip";

describe("Chip", () => {
  it("static mode renders a span root", () => {
    const ref = createRef<HTMLElement>();
    render(<Chip ref={ref}>Static</Chip>);
    const chip = screen.getByText("Static");
    expect(ref.current).toBe(chip);
    expect(chip.tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("selectable only renders a toggle button root with aria-pressed", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const ref = createRef<HTMLElement>();
    render(
      <Chip ref={ref} defaultSelected={false} onSelectedChange={onSelectedChange}>
        React
      </Chip>,
    );
    const toggle = screen.getByRole("button", { name: "React" });
    expect(ref.current).toBe(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-state", "on");
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("controlled selection stays fixed until the parent updates", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { rerender } = render(
      <Chip selected={false} onSelectedChange={onSelectedChange}>
        A
      </Chip>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(
      <Chip selected onSelectedChange={onSelectedChange}>
        A
      </Chip>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("removable only renders a span with a labelled remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const ref = createRef<HTMLElement>();
    render(
      <Chip ref={ref} onRemove={onRemove} removeLabel="Remove React">
        React
      </Chip>,
    );
    expect(ref.current?.tagName).toBe("SPAN");
    const remove = screen.getByRole("button", { name: "Remove React" });
    await user.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    remove.focus();
    await user.keyboard("{Delete}");
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it("selectable + removable renders role=group with two sibling buttons and Backspace removes", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const ref = createRef<HTMLElement>();
    render(
      <Chip ref={ref} defaultSelected onRemove={onRemove} removeLabel="Remove Vue">
        Vue
      </Chip>,
    );
    const group = screen.getByRole("group");
    expect(ref.current).toBe(group);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.parentElement).toBe(group);
      expect(button.querySelector("button")).toBeNull();
    }
    const toggle = screen.getByRole("button", { pressed: true });
    expect(toggle).toHaveTextContent("Vue");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    toggle.focus();
    await user.keyboard("{Backspace}");
    expect(onRemove).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Remove Vue" }).focus();
    await user.keyboard("{Backspace}");
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  it.each(["sm", "md"] as const)("the %s remove button is a 24px target", (size) => {
    render(
      <Chip size={size} onRemove={() => {}} removeLabel="Remove A">
        A
      </Chip>,
    );
    const remove = screen.getByRole("button", { name: "Remove A" });
    expect(remove).toHaveClass("size-6");
    expect(remove.querySelector("svg")?.closest("[aria-hidden]")).not.toBeNull();
  });

  it("selectable + removable keeps the 24px remove button a sibling of the toggle", () => {
    render(
      <Chip size="sm" defaultSelected onRemove={() => {}} removeLabel="Remove B">
        B
      </Chip>,
    );
    const toggle = screen.getByRole("button", { pressed: true });
    const remove = screen.getByRole("button", { name: "Remove B" });
    expect(remove).toHaveClass("size-6");
    expect(toggle.contains(remove)).toBe(false);
    expect(remove.contains(toggle)).toBe(false);
    expect(toggle.parentElement).toBe(remove.parentElement);
  });

  it("disabled chips ignore input", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <Chip defaultSelected onRemove={onRemove} disabled>
        X
      </Chip>,
    );
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    expect(screen.getByRole("group")).toHaveAttribute("data-disabled", "");
    await user.keyboard("{Backspace}");
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("removing a chip from a plain list unmounts it without errors", async () => {
    const user = userEvent.setup();
    function List() {
      const [items, setItems] = useState(["a", "b"]);
      return (
        <div>
          {items.map((name) => (
            <Chip key={name} onRemove={() => setItems((l) => l.filter((n) => n !== name))} removeLabel={`Remove ${name}`}>
              {name}
            </Chip>
          ))}
        </div>
      );
    }
    render(<List />);
    await user.click(screen.getByRole("button", { name: "Remove a" }));
    expect(screen.queryByText("a")).toBeNull();
    expect(screen.getByText("b")).toBeInTheDocument();
  });
});
