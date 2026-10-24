import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VanishInput } from "../../src/components/vanish-input";
describe("VanishInput", () => {
  it("forwards the ref to the input, styles the field with className and uses the first placeholder", () => {
    const ref = createRef<HTMLInputElement>();
    render(<VanishInput ref={ref} className="mt-4" placeholders={["Search the docs", "Ask anything"]} />);
    const input = screen.getByPlaceholderText("Search the docs");
    expect(ref.current).toBe(input);
    expect(screen.getByRole("search").className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
  it("submits the trimmed text on Enter, clears the field and announces it (a11y)", () => {
    const onSubmit = vi.fn();
    render(<VanishInput aria-label="Prompt" onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox", { name: "Prompt" });
    fireEvent.change(input, { target: { value: "  hello world " } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    fireEvent.submit(screen.getByRole("search"));
    expect(onSubmit).toHaveBeenCalledWith("hello world");
    expect(input).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Sent: hello world");
  });
  it("ignores blank submits and can keep the text", () => {
    const onSubmit = vi.fn();
    render(<VanishInput aria-label="Prompt" clearOnSubmit={false} onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox", { name: "Prompt" });
    fireEvent.submit(screen.getByRole("search"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "keep me" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(onSubmit).toHaveBeenCalledWith("keep me");
    expect(input).toHaveValue("keep me");
  });
  it("renders on the server with the first placeholder", () => {
    const html = renderToString(<VanishInput placeholders={["Find a file"]} />);
    expect(html).toContain("Find a file");
    expect(html).not.toContain("undefined");
  });
});
