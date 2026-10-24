import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatScroller } from "../../src/components/chat-scroller";

const messages = (ids: string[]) => ids.map((id) => <p key={id}>{`Message ${id}`}</p>);

/** jsdom has no layout: give the viewport a fixed box so scroll math works. */
function sizeViewport(el: HTMLElement, scrollHeight: number) {
  Object.defineProperty(el, "clientHeight", { configurable: true, value: 100 });
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
}

describe("ChatScroller", () => {
  it("renders a labelled log and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ChatScroller ref={ref}>{messages(["1", "2"])}</ChatScroller>);
    expect(screen.getByRole("log", { name: "Conversation" })).toBe(ref.current);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the jump pill with an unread count after scrolling up", () => {
    const onStickChange = vi.fn();
    const { rerender } = render(<ChatScroller onStickChange={onStickChange}>{messages(["1", "2"])}</ChatScroller>);
    const log = screen.getByRole("log");
    sizeViewport(log, 1000);
    log.scrollTop = 200;
    fireEvent.scroll(log);
    expect(onStickChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: /Jump to latest/ })).toBeInTheDocument();
    rerender(<ChatScroller onStickChange={onStickChange}>{messages(["1", "2", "3", "4"])}</ChatScroller>);
    expect(screen.getByRole("button", { name: /2 new messages/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2 new messages/ }));
    expect(onStickChange).toHaveBeenLastCalledWith(true);
  });

  it("asks for older messages near the top", () => {
    const onLoadOlder = vi.fn();
    render(
      <ChatScroller hasOlder onLoadOlder={onLoadOlder}>
        {messages(["1"])}
      </ChatScroller>,
    );
    const log = screen.getByRole("log");
    sizeViewport(log, 1000);
    log.scrollTop = 10;
    fireEvent.scroll(log);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("renders on the server", () => {
    expect(renderToString(<ChatScroller>{messages(["1"])}</ChatScroller>)).toContain("Message 1");
  });
});
