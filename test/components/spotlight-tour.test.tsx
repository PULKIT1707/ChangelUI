import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import type * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpotlightTour, type SpotlightTourStep } from "../../src/components/spotlight-tour";
const steps: SpotlightTourStep[] = [
  { target: "#a", title: "Search", content: "Find anything." },
  { target: "#b", title: "Share", content: "Invite your team." },
];
function Page(props: Partial<React.ComponentProps<typeof SpotlightTour>>) {
  return (
    <MotionConfig reducedMotion="always">
      <button id="a">A</button>
      <button id="b">B</button>
      <SpotlightTour steps={steps} defaultOpen {...props} />
    </MotionConfig>
  );
}
describe("SpotlightTour", () => {
  it("renders nothing while closed and on the server", () => {
    render(<SpotlightTour steps={steps} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(renderToString(<SpotlightTour steps={steps} defaultOpen />)).toBe("");
  });
  it("shows a labelled dialog and steps with buttons and arrow keys (a11y)", () => {
    const onStepChange = vi.fn();
    render(<Page onStepChange={onStepChange} />);
    const dialog = screen.getByRole("dialog", { name: "Search" });
    expect(dialog).toHaveAccessibleDescription("Find anything.");
    expect(dialog).toHaveTextContent("Step 1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("dialog", { name: "Share" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });
  it("finishes on Done and skips on Escape", () => {
    const onFinish = vi.fn();
    const onSkip = vi.fn();
    const onOpenChange = vi.fn();
    const { unmount } = render(<Page defaultStep={1} onFinish={onFinish} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    unmount();
    render(<Page onSkip={onSkip} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onSkip).toHaveBeenCalledWith(0);
  });
});
