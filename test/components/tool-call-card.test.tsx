import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ToolCallCard } from "../../src/components/tool-call-card";
describe("ToolCallCard", () => {
  it("renders a named article with status, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<ToolCallCard ref={ref} className="mt-4" name="search_docs" status="success" input={{ q: "auth" }} output={{ hits: 3 }} durationMs={420} />);
    const card = screen.getByRole("article", { name: /search_docs/ });
    expect(ref.current).toBe(card);
    expect(card.className).toContain("mt-4");
    expect(card).toHaveAttribute("data-status", "success");
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("420ms")).toBeInTheDocument();
  });
  it("toggles the input and output panes (a11y)", () => {
    render(<ToolCallCard name="search_docs" status="success" input={{ q: "auth" }} output={{ hits: 3 }} />);
    const toggle = screen.getByRole("button", { name: "Show details for search_docs" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("region", { name: "Input" })).toHaveTextContent('"q": "auth"');
    expect(screen.getByRole("region", { name: "Output" })).toHaveTextContent('"hits": 3');
  });
  it("asks for approval and opens the details", () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    render(<ToolCallCard name="send_email" status="awaiting-approval" input={{ to: "team@example.com" }} onApprove={onApprove} onDeny={onDeny} />);
    expect(screen.getByRole("region", { name: "Input" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run send_email" }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Deny send_email" }));
    expect(onDeny).not.toHaveBeenCalled();
  });
  it("shows the error", () => {
    render(<ToolCallCard name="fetch" status="error" error="Timed out after 30s" />);
    expect(screen.getByText("Timed out after 30s")).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<ToolCallCard name="server_tool" status="running" />)).toContain("server_tool");
  });
});
