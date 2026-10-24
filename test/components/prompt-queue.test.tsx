import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PromptQueue, type QueuedPrompt } from "../../src/components/prompt-queue";

const items: QueuedPrompt[] = [
  { id: "1", text: "Also update the README" },
  { id: "2", text: "Then run the tests", attachments: ["log.txt"] },
  { id: "3", text: "Open a draft PR" },
  { id: "4", text: "Ping the team" },
];

describe("PromptQueue", () => {
  it("shows what happens next and folds extra rows", () => {
    const ref = createRef<HTMLElement>();
    render(<PromptQueue ref={ref} items={items} onItemsChange={() => {}} running />);
    expect(ref.current?.tagName).toBe("SECTION");
    expect(screen.getByText("Sends when the agent finishes")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.queryByText("Ping the team")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1 more queued" }));
    expect(screen.getByText("Ping the team")).toBeInTheDocument();
  });

  it("removes, sends now and pauses", () => {
    const onItemsChange = vi.fn();
    const onSendNow = vi.fn();
    const onPausedChange = vi.fn();
    render(<PromptQueue items={items} onItemsChange={onItemsChange} onSendNow={onSendNow} onPausedChange={onPausedChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove: Also update the README" }));
    expect(onItemsChange).toHaveBeenCalledWith(items.slice(1));
    fireEvent.click(screen.getByRole("button", { name: "Send now: Then run the tests" }));
    expect(onSendNow).toHaveBeenCalledWith(items[1]);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("edits in place with Enter", () => {
    const onItemsChange = vi.fn();
    render(<PromptQueue items={items} onItemsChange={onItemsChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit: Open a draft PR" }));
    const box = screen.getByRole("textbox", { name: "Edit queued prompt" });
    fireEvent.change(box, { target: { value: "Open a ready PR" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onItemsChange).toHaveBeenCalledWith([items[0], items[1], { ...items[2], text: "Open a ready PR" }, items[3]]);
  });

  it("renders on the server", () => {
    expect(renderToString(<PromptQueue items={items} onItemsChange={() => {}} />)).toContain("Also update the README");
  });
});
