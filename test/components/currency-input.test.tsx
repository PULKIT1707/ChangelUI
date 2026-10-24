import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput, parseMoney } from "../../src/components/currency-input";
describe("CurrencyInput", () => {
  it("groups digits as you type and reports minor units", () => {
    const onValueChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(<CurrencyInput ref={ref} aria-label="Amount" locale="en-US" onValueChange={onValueChange} />);
    expect(ref.current?.tagName).toBe("INPUT");
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "1234567" } });
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("1,234,567");
    expect(onValueChange).toHaveBeenLastCalledWith(1234567, { minor: 123456700, formatted: "1,234,567" });
  });
  it("expands shorthand and pads the fraction on blur", () => {
    render(<CurrencyInput aria-label="Amount" locale="en-US" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.change(input, { target: { value: "2.5k" } });
    expect(input).toHaveValue("2,500");
    fireEvent.blur(input);
    expect(input).toHaveValue("2,500.00");
  });
  it("clamps to max on blur", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" locale="en-US" max={100} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("100.00");
    expect(onValueChange).toHaveBeenLastCalledWith(100, expect.objectContaining({ minor: 10000 }));
  });
  it("uses the locale's separators", () => {
    render(<CurrencyInput aria-label="Amount" locale="de-DE" currency="EUR" defaultValue={1234.5} />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("1.234,50");
  });
  it("parses loose money text", () => {
    expect(parseMoney("$1,234.50")).toBe(1234.5);
    expect(parseMoney("1.234,5 €", ",")).toBe(1234.5);
    expect(parseMoney("1,5")).toBe(1.5);
    expect(parseMoney("1.2m")).toBe(1_200_000);
    expect(parseMoney("abc")).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<CurrencyInput aria-label="Amount" locale="en-US" defaultValue={9.99} />)).toContain("9.99");
  });
});
