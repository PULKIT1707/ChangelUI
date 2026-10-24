import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SlotPicker } from "../../src/components/slot-picker";
const SLOTS = [
  "2026-10-27T09:00:00Z",
  "2026-10-27T09:30:00Z",
  { start: "2026-10-27T14:00:00Z", available: false },
  "2026-10-27T18:00:00Z",
  "2026-10-29T10:00:00Z",
];
describe("SlotPicker", () => {
  it("renders day tabs with open counts, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<SlotPicker ref={ref} slots={SLOTS} days={["2026-10-28"]} timeZone="UTC" className="mt-4" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAccessibleName("Tuesday, October 27, 3 times open");
    expect(tabs[1]).toHaveAccessibleName("Wednesday, October 28, no times");
    expect(screen.getByRole("heading", { name: "Evening" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2:00 PM, taken" })).toBeDisabled();
  });
  it("offers the next open day on an empty day and moves tabs with arrows (a11y)", () => {
    render(<SlotPicker slots={SLOTS} days={["2026-10-28"]} timeZone="UTC" />);
    const [first] = screen.getAllByRole("tab");
    fireEvent.keyDown(first as HTMLElement, { key: "ArrowRight" });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: /Next open: Thu, Oct 29/ }));
    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-selected", "true");
  });
  it("picks a time and confirms it through a promise", async () => {
    const onChange = vi.fn();
    const onConfirm = vi.fn(() => Promise.resolve());
    render(<SlotPicker slots={SLOTS} timeZone="UTC" duration={30} onValueChange={onChange} onConfirm={onConfirm} />);
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "9:30 AM" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-27T09:30:00Z");
    expect(screen.getByText("Tue, Oct 27 · 9:30 AM – 10:00 AM")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });
    expect(onConfirm).toHaveBeenCalledWith("2026-10-27T09:30:00Z");
    expect(await screen.findByRole("button", { name: "Booked" })).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<SlotPicker slots={SLOTS} timeZone="UTC" />)).toContain("Morning");
  });
});
