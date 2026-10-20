import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResizableHandle, ResizablePanel, ResizablePanels } from "../../src/components/resizable-panels";

const layout = (onLayout?: (s: number[]) => void) => (
  <ResizablePanels onLayout={onLayout}>
    <ResizablePanel defaultSize={30} collapsible>
      Left
    </ResizablePanel>
    <ResizableHandle aria-label="Resize" />
    <ResizablePanel>Right</ResizablePanel>
  </ResizablePanels>
);

describe("ResizablePanels", () => {
  it("renders a separator with the previous panel size", () => {
    render(layout());
    const handle = screen.getByRole("separator", { name: "Resize" });
    expect(handle).toHaveAttribute("aria-valuenow", "30");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
  });
  it("collapses with Enter", () => {
    const onLayout = vi.fn();
    render(layout(onLayout));
    fireEvent.keyDown(screen.getByRole("separator"), { key: "Enter" });
    expect(onLayout).toHaveBeenCalledWith([0, 100]);
  });
  it("renders default sizes on the server", () => {
    expect(renderToString(layout())).toContain("flex-grow:30");
  });
});
