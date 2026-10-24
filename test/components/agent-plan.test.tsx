import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AgentPlan, formatElapsed, type AgentPlanStep } from "../../src/components/agent-plan";
const steps: AgentPlanStep[] = [
  { id: "read", title: "Read the repo", status: "done", durationMs: 4200 },
  { id: "plan", title: "Draft the change", status: "done" },
  {
    id: "edit",
    title: "Edit files",
    status: "running",
    startedAt: 0,
    detail: "Updating the router",
    substeps: [
      { id: "a", title: "router.ts", done: true },
      { id: "b", title: "routes.test.ts" },
    ],
  },
  { id: "test", title: "Run tests" },
];
describe("AgentPlan", () => {
  it("shows progress, marks the running step and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<AgentPlan ref={ref} className="mt-4" title="Fix routing" steps={steps} now={12_000} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(ref.current).toHaveAttribute("data-status", "working");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("Edit files").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("0:12")).toBeInTheDocument();
    expect(screen.getByText("4.2s")).toBeInTheDocument();
    expect(screen.getByText("routes.test.ts")).toBeInTheDocument();
  });
  it("offers retry on failed steps and skip on queued ones", () => {
    const onRetry = vi.fn();
    const onSkip = vi.fn();
    render(
      <AgentPlan
        steps={[
          { id: "a", title: "Deploy", status: "failed", error: "Timed out" },
          { id: "b", title: "Notify" },
        ]}
        onRetry={onRetry}
        onSkip={onSkip}
      />,
    );
    expect(screen.getByText("Timed out")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Deploy" }));
    expect(onRetry).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("button", { name: "Skip Notify" }));
    expect(onSkip).toHaveBeenCalledWith("b");
  });
  it("folds finished steps", () => {
    render(<AgentPlan collapseCompleted steps={steps} now={0} />);
    fireEvent.click(screen.getByRole("button", { name: /2 steps done/ }));
    expect(screen.getByText("Read the repo")).toBeInTheDocument();
  });
  it("formats elapsed time", () => {
    expect(formatElapsed(7_000)).toBe("0:07");
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
  });
  it("renders on the server", () => {
    expect(renderToString(<AgentPlan steps={steps} />)).toContain("Edit files");
  });
});
