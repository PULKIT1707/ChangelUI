import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatOffset, TimezonePicker, timeZoneOffset } from "../../src/components/timezone-picker";
const now = Date.UTC(2026, 0, 15, 12, 0);
describe("TimezonePicker", () => {
  it("forwards the ref to the input and finds zones by city alias", () => {
    const ref = createRef<HTMLInputElement>();
    const onValueChange = vi.fn();
    render(<TimezonePicker ref={ref} aria-label="Time zone" now={now} showLocal={false} onValueChange={onValueChange} />);
    expect(ref.current?.tagName).toBe("INPUT");
    fireEvent.change(screen.getByRole("combobox", { name: "Time zone" }), { target: { value: "Seattle" } });
    const option = screen.getByRole("option", { name: /Los Angeles/ });
    expect(option).toHaveTextContent("GMT−8");
    fireEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith("America/Los_Angeles");
  });
  it("matches offsets and shows pinned zones first", () => {
    render(<TimezonePicker aria-label="Time zone" now={now} showLocal={false} pinned={["Asia/Tokyo"]} defaultOpen />);
    expect(screen.getByText("Pinned").closest("[role=group]")).toHaveTextContent("Tokyo");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "+5:30" } });
    expect(screen.getAllByRole("option", { hidden: true }).map((o) => o.getAttribute("data-value"))).toEqual(["Asia/Kolkata"]);
  });
  it("computes and formats offsets", () => {
    expect(timeZoneOffset("Asia/Kolkata", now)).toBe(330);
    expect(formatOffset(330)).toBe("GMT+5:30");
    expect(formatOffset(-480)).toBe("GMT−8");
    expect(formatOffset(0)).toBe("GMT");
  });
  it("renders on the server", () => {
    expect(renderToString(<TimezonePicker aria-label="Time zone" />)).toContain("combobox");
  });
});
