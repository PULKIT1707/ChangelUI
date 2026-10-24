import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { applyMarkdownTool, continueMarkdownList, MarkdownEditor } from "../../src/components/markdown-editor";

describe("MarkdownEditor", () => {
  it("wraps and unwraps the selection", () => {
    expect(applyMarkdownTool("make it bold", 8, 12, "bold")).toEqual({ value: "make it **bold**", selectionStart: 10, selectionEnd: 14 });
    expect(applyMarkdownTool("make it **bold**", 10, 14, "bold").value).toBe("make it bold");
    expect(applyMarkdownTool("", 0, 0, "italic").value).toBe("_italic text_");
    expect(applyMarkdownTool("docs", 0, 4, "link").value).toBe("[docs](https://)");
  });

  it("prefixes and switches list lines", () => {
    expect(applyMarkdownTool("one\ntwo", 0, 7, "numbered").value).toBe("1. one\n2. two");
    expect(applyMarkdownTool("1. one\n2. two", 0, 13, "bulleted").value).toBe("- one\n- two");
    expect(applyMarkdownTool("- one\n- two", 0, 11, "bulleted").value).toBe("one\ntwo");
  });

  it("continues lists and quotes", () => {
    expect(continueMarkdownList("- milk")).toBe("- ");
    expect(continueMarkdownList("  3. eggs")).toBe("  4. ");
    expect(continueMarkdownList("- [x] done")).toBe("- [ ] ");
    expect(continueMarkdownList("> quoted")).toBe("> ");
    expect(continueMarkdownList("- ")).toBe("");
    expect(continueMarkdownList("plain")).toBeNull();
  });

  it("continues a list on Enter, applies shortcuts and submits", () => {
    const onValueChange = vi.fn();
    const onSubmit = vi.fn();
    const ref = createRef<HTMLDivElement>();
    render(<MarkdownEditor ref={ref} defaultValue="- milk" onValueChange={onValueChange} onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox", { name: "Markdown" });
    expect(ref.current).toHaveAttribute("data-mode", "write");
    (field as HTMLTextAreaElement).setSelectionRange(6, 6);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("- milk\n- ");
    (field as HTMLTextAreaElement).setSelectionRange(2, 6);
    fireEvent.keyDown(field, { key: "b", ctrlKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith("- **milk**\n- ");
    fireEvent.keyDown(field, { key: "Enter", metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith("- **milk**\n- ");
  });

  it("switches to a rendered preview", () => {
    render(<MarkdownEditor defaultValue={"## Title\n\nSome **bold** text"} />);
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
  });

  it("renders on the server", () => {
    expect(renderToString(<MarkdownEditor defaultValue="Server text" />)).toContain("Server text");
  });
});
