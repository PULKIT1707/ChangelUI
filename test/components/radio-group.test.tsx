import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { RadioGroup, RadioGroupItem, type RadioGroupProps } from "../../src/components/radio-group";

function Group(props: RadioGroupProps & { disabledItems?: string[]; ref?: Ref<HTMLDivElement> }) {
  const { disabledItems = [], ...rest } = props;
  return (
    <RadioGroup aria-label="Fruit" {...rest}>
      {["apple", "banana", "cherry"].map((v) => (
        <RadioGroupItem key={v} value={v} aria-label={v} disabled={disabledItems.includes(v)} />
      ))}
    </RadioGroup>
  );
}

const radios = () => screen.getAllByRole("radio");
const tabStops = () => radios().filter((r) => r.tabIndex === 0);

describe("RadioGroup", () => {
  it("renders radiogroup semantics and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Group ref={ref} defaultValue="banana" required />);
    const group = screen.getByRole("radiogroup", { name: "Fruit" });
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute("aria-orientation", "vertical");
    expect(group).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("radio", { name: "banana" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "banana" }).querySelector("[data-pui-radio-dot]")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "apple" }).querySelector("[data-pui-radio-dot]")).toBeNull();
  });

  it("arrow keys move focus and select, skip disabled items and wrap", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Group defaultValue="apple" disabledItems={["banana"]} onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "apple" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    const cherry = screen.getByRole("radio", { name: "cherry" });
    expect(cherry).toHaveFocus();
    expect(cherry).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("cherry");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "apple" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowUp}");
    expect(cherry).toHaveAttribute("aria-checked", "true");
    expect(tabStops()).toEqual([cherry]);
  });

  it("Space selects the focused item; there is exactly one tab stop", async () => {
    const user = userEvent.setup();
    render(<Group />);
    expect(tabStops()).toHaveLength(1);
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("tabindex");
    await user.tab();
    const apple = screen.getByRole("radio", { name: "apple" });
    expect(apple).toHaveFocus();
    expect(apple).toHaveAttribute("aria-checked", "false");
    await user.keyboard(" ");
    expect(apple).toHaveAttribute("aria-checked", "true");
  });

  it("a stale value and a disabled-only value each leave one tab stop on the first enabled item", () => {
    const { rerender } = render(<Group value="zzz" />);
    expect(tabStops().map((r) => r.getAttribute("aria-label"))).toEqual(["apple"]);
    rerender(<Group value="apple" disabledItems={["apple"]} />);
    expect(tabStops().map((r) => r.getAttribute("aria-label"))).toEqual(["banana"]);
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("tabindex");
  });

  it("a re-render keeps the single tab stop", () => {
    const { rerender } = render(<Group value="cherry" />);
    rerender(<Group value="cherry" orientation="horizontal" />);
    expect(tabStops().map((r) => r.getAttribute("aria-label"))).toEqual(["cherry"]);
  });

  it("controlled stays fixed until the parent updates", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Group value="apple" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "cherry" }));
    expect(onValueChange).toHaveBeenCalledWith("cherry");
    expect(screen.getByRole("radio", { name: "apple" })).toHaveAttribute("aria-checked", "true");
    rerender(<Group value="cherry" onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "cherry" })).toHaveAttribute("aria-checked", "true");
  });

  it("group disabled disables every item", () => {
    render(<Group disabled />);
    for (const radio of radios()) expect(radio).toBeDisabled();
  });

  it.each([undefined, "apple"])("a fully disabled group has no tab stop after mount (defaultValue %s)", (defaultValue) => {
    const { container } = render(<Group disabled defaultValue={defaultValue} />);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("tabindex");
  });

  it("uncontrolled restores its default on form reset and mirrors the value in a hidden input", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Group name="fruit" defaultValue="banana" />
      </form>,
    );
    const input = container.querySelector("input[name='fruit']") as HTMLInputElement;
    expect(input.type).toBe("hidden");
    expect(input.value).toBe("banana");
    await user.click(screen.getByRole("radio", { name: "cherry" }));
    expect(input.value).toBe("cherry");
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(screen.getByRole("radio", { name: "banana" })).toHaveAttribute("aria-checked", "true");
    expect(input.value).toBe("banana");
  });

  it("without defaultValue a reset clears an uncontrolled selection and calls no callback", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <form>
        <Group onValueChange={onValueChange} />
      </form>,
    );
    await user.click(screen.getByRole("radio", { name: "apple" }));
    onValueChange.mockClear();
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(radios().every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("warns in development when the group is unlabeled; items need a group", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <RadioGroup>
        <RadioGroupItem value="a" aria-label="a" />
      </RadioGroup>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RadioGroup needs an aria-label"));
    warn.mockRestore();
  });
});
