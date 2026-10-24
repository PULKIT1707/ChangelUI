import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatPhone, PhoneInput } from "../../src/components/phone-input";
describe("PhoneInput", () => {
  it("formats national digits and emits E.164", () => {
    const onValueChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(<PhoneInput ref={ref} aria-label="Phone" onValueChange={onValueChange} />);
    expect(ref.current?.type).toBe("tel");
    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), { target: { value: "4155550132" } });
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("(415) 555-0132");
    expect(onValueChange).toHaveBeenLastCalledWith("+14155550132", expect.objectContaining({ valid: true, digits: "4155550132" }));
  });
  it("switches country from a pasted international number and drops the trunk 0", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput aria-label="Phone" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), { target: { value: "+44 (0)7911 123456" } });
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("7911 123456");
    expect(screen.getByRole("combobox", { name: /United Kingdom \+44/ })).toBeInTheDocument();
    expect(onValueChange).toHaveBeenLastCalledWith("+447911123456", expect.objectContaining({ valid: true }));
  });
  it("adopts a controlled value", () => {
    const { rerender } = render(<PhoneInput aria-label="Phone" value="+819012345678" />);
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("90-1234-5678");
    rerender(<PhoneInput aria-label="Phone" value="" />);
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("");
  });
  it("formats with a pattern", () => {
    expect(formatPhone("79111", "#### ######")).toBe("7911 1");
    expect(formatPhone("", "(###) ###-####")).toBe("");
  });
  it("renders on the server", () => {
    expect(renderToString(<PhoneInput aria-label="Phone" defaultValue="+14155550132" />)).toContain("(415) 555-0132");
  });
});
