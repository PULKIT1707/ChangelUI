import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "../../src/components/calendar";

describe("Calendar", () => {
  it("renders a labelled group with a month grid, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} month="2024-03" className="mt-4" />);
    const root = screen.getByRole("group", { name: "Calendar" });
    expect(ref.current).toBe(root);
    expect(root.className).toContain("mt-4");
    expect(screen.getByRole("grid", { name: "March 2024" })).toBeInTheDocument();
  });

  it("selects a day and reports the ISO value (a11y)", () => {
    const onValueChange = vi.fn();
    render(<Calendar month="2024-03" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Saturday, March 9, 2024" }));
    expect(onValueChange).toHaveBeenCalledWith("2024-03-09");
  });

  it("picks a range start then end", () => {
    const onValueChange = vi.fn();
    render(<Calendar mode="range" month="2024-03" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Monday, March 4, 2024" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: "2024-03-04", end: null });
    fireEvent.click(screen.getByRole("button", { name: "Sunday, March 10, 2024" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: "2024-03-04", end: "2024-03-10" });
  });

  it("renders on the server", () => {
    expect(renderToString(<Calendar month="2024-03" />)).toContain("March 2024");
  });
});
