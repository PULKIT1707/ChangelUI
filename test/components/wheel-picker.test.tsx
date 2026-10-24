import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WheelPicker } from "../../src/components/wheel-picker";

const HOURS = ["09", "10", "11", "12", { value: "13", label: "13", disabled: true }, "14"];

describe("WheelPicker", () => {
  it("renders a labelled listbox, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<WheelPicker ref={ref} aria-label="Hour" options={HOURS} defaultValue="11" className="mt-4" />);
    const list = screen.getByRole("listbox", { name: "Hour" });
    expect(ref.current).toBe(list);
    expect(container.firstElementChild?.className).toContain("mt-4");
    expect(screen.getByRole("option", { name: "11" })).toHaveAttribute("aria-selected", "true");
    expect(list.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "11" }).id);
  });
  it("moves with the keyboard, skips disabled options and supports type-ahead (a11y)", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="Hour" options={HOURS} defaultValue="12" onValueChange={onValueChange} />);
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenLastCalledWith("14");
    fireEvent.keyDown(list, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith("09");
    fireEvent.keyDown(list, { key: "1" });
    expect(onValueChange).toHaveBeenLastCalledWith("10");
  });
  it("selects an option on click", () => {
    const onValueChange = vi.fn();
    render(<WheelPicker aria-label="Hour" options={HOURS} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("option", { name: "12" }));
    expect(onValueChange).toHaveBeenCalledWith("12");
  });
  it("renders on the server", () => {
    expect(renderToString(<WheelPicker aria-label="Hour" options={HOURS} />)).toContain('role="listbox"');
  });
});
