import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PromptInput } from "../../src/components/prompt-input";
describe("PromptInput", () => {
  it("renders a form with a labelled field, merges className and forwards the ref", () => {
    const ref = createRef<HTMLFormElement>();
    render(<PromptInput ref={ref} className="mt-4" />);
    expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(ref.current?.tagName).toBe("FORM");
    expect(ref.current?.className).toContain("mt-4");
  });
  it("submits on Enter and clears, and shows Stop while streaming (a11y)", () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(<PromptInput onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(field, { target: { value: "Hello" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith({ text: "Hello", files: [] });
    rerender(<PromptInput onSubmit={onSubmit} status="streaming" onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(onStop).toHaveBeenCalled();
  });
  it("fills the field from a suggestion", () => {
    render(<PromptInput suggestions={["Summarize this"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Summarize this" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("Summarize this");
  });
  it("renders on the server", () => {
    expect(renderToString(<PromptInput defaultValue="Server" />)).toContain("Server");
  });
});
