import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatTokens, SubagentList, type Subagent } from "../../src/components/subagent-list";

const agents: Subagent[] = [
  { id: "a", name: "Researcher", status: "done", startedAt: 0, endedAt: 42_000, tokens: 12_400, step: "Found 6 sources", log: [{ text: "Searching", at: 1000 }] },
  { id: "b", name: "Coder", status: "running", startedAt: 10_000, lastActivityAt: 10_000, tokens: 800, step: "Editing api.ts" },
  { id: "c", name: "Reviewer", status: "failed", startedAt: 5000, endedAt: 9000, error: "Rate limited" },
];

describe("SubagentList", () => {
  it("formats tokens", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(12_400)).toBe("12k");
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(1_250_000)).toBe("1.25M");
  });

  it("summarizes, flags quiet agents and offers actions", () => {
    const onRetry = vi.fn();
    const onCancel = vi.fn();
    const ref = createRef<HTMLElement>();
    render(<SubagentList ref={ref} agents={agents} now={70_000} onRetry={onRetry} onCancel={onCancel} />);
    expect(ref.current?.tagName).toBe("SECTION");
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 done");
    expect(screen.getByText("1 quiet")).toBeInTheDocument();
    expect(screen.getByText(/No activity for 1:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Reviewer" }));
    expect(onRetry).toHaveBeenCalledWith("c");
    fireEvent.click(screen.getByRole("button", { name: "Stop Coder" }));
    expect(onCancel).toHaveBeenCalledWith("b");
  });

  it("opens a row into its transcript", () => {
    render(<SubagentList agents={agents} now={70_000} />);
    const row = screen.getByRole("button", { name: /Researcher/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Searching")).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<SubagentList agents={agents} />)).toContain("Researcher");
  });
});
