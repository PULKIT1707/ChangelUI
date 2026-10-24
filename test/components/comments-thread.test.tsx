import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommentsThread, type ThreadComment } from "../../src/components/comments-thread";
const me = { id: "me", name: "Sam Lee" };
const ana = { id: "ana", name: "Ana Diaz" };
const comments: ThreadComment[] = [
  { id: "c1", author: ana, body: "Should this be 12px? @samlee", createdAt: 0, reactions: [{ emoji: "👍", count: 1 }] },
  { id: "c2", author: me, body: "Good catch, fixing.", createdAt: 120_000 },
];
describe("CommentsThread", () => {
  it("renders comments with mentions and relative times and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<CommentsThread ref={ref} className="mt-4" comments={comments} currentUser={me} now={3_600_000} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByText("@samlee")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
  });
  it("sends with Cmd+Enter and toggles reactions", async () => {
    const onReply = vi.fn(() => Promise.resolve());
    const onReact = vi.fn();
    render(<CommentsThread comments={comments} currentUser={me} onReply={onReply} onReact={onReact} now={0} />);
    const box = screen.getByRole("combobox", { name: "Reply" });
    fireEvent.change(box, { target: { value: "Done" } });
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    await waitFor(() => expect(box).toHaveValue(""));
    expect(onReply).toHaveBeenCalledWith("Done");
    fireEvent.click(screen.getByRole("button", { name: "👍 1" }));
    expect(onReact).toHaveBeenCalledWith("c1", "👍");
    expect(screen.getByRole("button", { name: "👍 2, you reacted" })).toHaveAttribute("aria-pressed", "true");
  });
  it("suggests people after @", () => {
    render(<CommentsThread comments={comments} currentUser={me} now={0} />);
    const box = screen.getByRole("combobox", { name: "Reply" });
    fireEvent.change(box, { target: { value: "@an", selectionStart: 3 } });
    expect(screen.getByRole("option", { name: /Ana Diaz/ })).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box).toHaveValue("@anadiaz ");
  });
  it("collapses to a summary when resolved", () => {
    const onResolvedChange = vi.fn();
    render(<CommentsThread comments={comments} currentUser={me} onResolvedChange={onResolvedChange} now={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolvedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: /Resolved · 2 comments/ })).toHaveAttribute("aria-expanded", "false");
  });
  it("renders on the server", () => {
    expect(renderToString(<CommentsThread comments={comments} currentUser={me} />)).toContain("Good catch");
  });
});
