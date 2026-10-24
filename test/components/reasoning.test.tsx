import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatThinkingDuration, Reasoning } from "../../src/components/reasoning";
describe("Reasoning", () => {
  it("shows the duration label, toggles the region, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Reasoning ref={ref} className="mt-4" duration={12}>
        Step by step
      </Reasoning>,
    );
    const trigger = screen.getByRole("button", { name: /Thought for 12 seconds/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(ref.current?.className).toContain("mt-4");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region")).toHaveTextContent("Step by step");
  });
  it("opens while streaming and collapses when done (a11y)", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Reasoning streaming>Thinking text</Reasoning>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByText("3s")).toBeInTheDocument();
      rerender(<Reasoning streaming={false}>Thinking text</Reasoning>);
      expect(screen.getByRole("button", { name: /Thought for 3 seconds/ })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByRole("status")).toHaveTextContent("Thought for 3 seconds");
    } finally {
      vi.useRealTimers();
    }
  });
  it("renders steps with their status", () => {
    render(
      <Reasoning defaultOpen steps={[{ title: "Plan" }, { title: "Search", status: "active" }, { title: "Answer", status: "pending" }]} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Search").closest("li")).toHaveAttribute("aria-current", "step");
  });
  it("formats durations", () => {
    expect(formatThinkingDuration(0.4)).toBe("a few seconds");
    expect(formatThinkingDuration(1)).toBe("1 second");
    expect(formatThinkingDuration(125)).toBe("2m 5s");
  });
  it("renders on the server", () => {
    expect(renderToString(<Reasoning streaming>Server</Reasoning>)).toContain("Thinking");
  });
});
