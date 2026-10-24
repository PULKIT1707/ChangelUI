import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseScrubValue, ScrubInput } from "../../src/components/scrub-input";
describe("ScrubInput", () => {
  it("renders a labelled spinbutton, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<ScrubInput ref={ref} className="mt-4" label="Width" defaultValue={24} unit="px" min={0} max={100} />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    const spin = screen.getByRole("spinbutton", { name: "Width" });
    expect(spin).toHaveAttribute("aria-valuenow", "24");
    expect(spin).toHaveAttribute("aria-valuemin", "0");
    expect(spin).toHaveAttribute("aria-valuetext", "24px");
  });
  it("steps with arrows, Shift, Page, Home and End, clamped to the range (keyboard)", () => {
    const onCommit = vi.fn();
    render(<ScrubInput label="Gap" defaultValue={10} min={0} max={50} onValueCommit={onCommit} />);
    const spin = screen.getByRole("spinbutton", { name: "Gap" });
    fireEvent.keyDown(spin, { key: "ArrowUp" });
    expect(spin).toHaveAttribute("aria-valuenow", "11");
    fireEvent.keyDown(spin, { key: "ArrowUp", shiftKey: true });
    expect(spin).toHaveAttribute("aria-valuenow", "21");
    fireEvent.keyDown(spin, { key: "PageDown" });
    expect(spin).toHaveAttribute("aria-valuenow", "11");
    fireEvent.keyDown(spin, { key: "End" });
    expect(spin).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(spin, { key: "ArrowUp" });
    expect(spin).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(spin, { key: "Home" });
    expect(spin).toHaveAttribute("aria-valuenow", "0");
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });
  it("types a value with arithmetic and units; Escape cancels", () => {
    const onChange = vi.fn();
    render(<ScrubInput label="Size" defaultValue={8} onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });
    const input = screen.getByRole("spinbutton", { name: "Size" }) as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    fireEvent.change(input, { target: { value: "16*2px" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(32);
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });
    const again = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(again, { target: { value: "999" } });
    fireEvent.keyDown(again, { key: "Escape" });
    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "32");
  });
  it("scrubs with a horizontal drag", () => {
    const onCommit = vi.fn();
    const { container } = render(<ScrubInput label="X" defaultValue={0} sensitivity={2} onValueCommit={onCommit} />);
    const root = container.firstElementChild as HTMLElement;
    act(() => {
      fireEvent.pointerDown(root, { pointerId: 1, button: 0, clientX: 100 });
      fireEvent.pointerMove(root, { pointerId: 1, clientX: 110 });
      fireEvent.pointerMove(root, { pointerId: 1, clientX: 120 });
      fireEvent.pointerUp(root, { pointerId: 1, clientX: 120 });
    });
    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "10");
    expect(onCommit).toHaveBeenCalledWith(10);
  });
  it("parses numbers, units and simple arithmetic without eval", () => {
    expect(parseScrubValue("24px")).toBe(24);
    expect(parseScrubValue("(4 + 2) * 8")).toBe(48);
    expect(parseScrubValue("-1.5")).toBe(-1.5);
    expect(parseScrubValue("100 / 4%")).toBe(25);
    expect(parseScrubValue("alert(1)")).toBeNull();
    expect(parseScrubValue("")).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<ScrubInput label="Opacity" defaultValue={0.5} step={0.01} />)).toContain("Opacity");
  });
});
