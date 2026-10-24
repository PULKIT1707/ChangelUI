import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage, parseChatMarkdown } from "../../src/components/chat-message";

describe("ChatMessage", () => {
  it("parses light markdown blocks, including an open fence", () => {
    const blocks = parseChatMarkdown("## Plan\n\nFirst **step**\n- a\n- b\n\n1. one\n2. two\n\n```ts\nconst x = 1;");
    expect(blocks.map((b) => b.type)).toEqual(["h", "p", "ul", "ol", "code"]);
    expect(blocks[4]).toMatchObject({ type: "code", lang: "ts", code: "const x = 1;", open: true });
  });

  it("renders inline markdown safely and drops unsafe links", () => {
    const ref = createRef<HTMLElement>();
    render(<ChatMessage ref={ref} content={"Use `npm ci` and **pin** it. [Docs](https://example.com) [bad](javascript:alert(1))"} />);
    expect(ref.current?.tagName).toBe("ARTICLE");
    expect(screen.getByText("npm ci").tagName).toBe("CODE");
    expect(screen.getByText("pin").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument();
  });

  it("shows a caret and hides actions while streaming", () => {
    const { container, rerender } = render(<ChatMessage content="Thinking about" streaming onRetry={() => {}} />);
    expect(container.querySelector("[data-slot=caret]")).not.toBeNull();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    rerender(<ChatMessage content="Thinking about it." onRetry={() => {}} />);
    expect(container.querySelector("[data-slot=caret]")).toBeNull();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument();
  });

  it("toggles feedback and switches branches", () => {
    const onFeedbackChange = vi.fn();
    const onBranchChange = vi.fn();
    render(<ChatMessage content="Answer" onFeedbackChange={onFeedbackChange} branch={1} branchCount={3} onBranchChange={onBranchChange} />);
    const up = screen.getByRole("button", { name: "Good response" });
    fireEvent.click(up);
    expect(onFeedbackChange).toHaveBeenLastCalledWith("up");
    expect(up).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(up);
    expect(onFeedbackChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("Response 2 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next response" }));
    expect(onBranchChange).toHaveBeenCalledWith(2);
  });

  it("renders on the server", () => {
    expect(renderToString(<ChatMessage from="user" content="Hello there" timestamp={0} />)).toContain("Hello there");
  });
});
