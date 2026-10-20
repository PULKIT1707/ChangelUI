import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../../src/components/date-picker";

describe("DatePicker", () => {
  it("renders a text field with the formatted value and forwards the ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DatePicker ref={ref} aria-label="Due date" defaultValue="2024-03-09" className="mt-4" />);
    const input = screen.getByRole("textbox", { name: "Due date" });
    expect(ref.current).toBe(input);
    expect(input).toHaveValue("Mar 9, 2024");
    expect(input.className).toContain("mt-4");
  });

  it("parses typed text on Enter (a11y)", () => {
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Due date" today="2024-03-01" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Due date" });
    fireEvent.change(input, { target: { value: "3/15/2024" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("2024-03-15");
  });

  it("renders on the server", () => {
    expect(renderToString(<DatePicker aria-label="Due date" defaultValue="2024-03-09" />)).toContain("Mar 9, 2024");
  });
});
