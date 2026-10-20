import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../src/components/hover-card";

function Card(props: { openDelayMs?: number }) {
  return (
    <HoverCard openDelayMs={props.openDelayMs ?? 300} closeDelayMs={100}>
      <HoverCardTrigger href="#ada">@ada</HoverCardTrigger>
      <HoverCardContent>Ada Lovelace</HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens after the hover delay and closes after leaving", () => {
    render(<Card />);
    const trigger = screen.getByText("@ada");
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(100));
    expect(trigger).toHaveAttribute("data-state", "closed");
  });

  it("ignores touch hover (a11y: taps follow the link)", () => {
    render(<Card />);
    fireEvent.pointerEnter(screen.getByText("@ada"), { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });

  it("renders only the trigger on the server", () => {
    const html = renderToString(<Card />);
    expect(html).toContain("@ada");
    expect(html).not.toContain("Ada Lovelace");
  });
});
