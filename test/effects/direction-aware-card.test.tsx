import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DirectionAwareCard } from "../../src/effects/direction-aware-card";
function rect(el: Element) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
}
describe("DirectionAwareCard", () => {
  it("renders closed, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <DirectionAwareCard ref={ref} className="mt-4" overlay="Details">
        Media
      </DirectionAwareCard>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-state", "closed");
    expect(root?.className).toContain("mt-4");
  });
  it("opens from the edge the pointer entered and leaves through the exit edge", () => {
    const onEdgeChange = vi.fn();
    const { container } = render(
      <DirectionAwareCard overlay="Details" onEdgeChange={onEdgeChange}>
        Media
      </DirectionAwareCard>,
    );
    const root = container.firstElementChild as HTMLElement;
    rect(root);
    fireEvent.pointerEnter(root, { clientX: 2, clientY: 50, pointerType: "mouse" });
    expect(onEdgeChange).toHaveBeenLastCalledWith("left", "enter");
    expect(root).toHaveAttribute("data-state", "open");
    fireEvent.pointerLeave(root, { clientX: 100, clientY: 1, pointerType: "mouse" });
    expect(onEdgeChange).toHaveBeenLastCalledWith("top", "leave");
    expect(root).toHaveAttribute("data-state", "closed");
  });
  it("keeps overlay content in the DOM and opens on keyboard focus (a11y)", () => {
    const { container } = render(
      <DirectionAwareCard overlay={<a href="#case">Read the case study</a>} focusEdge="bottom">
        Media
      </DirectionAwareCard>,
    );
    const link = screen.getByRole("link", { name: "Read the case study" });
    fireEvent.focus(link);
    expect(container.firstElementChild).toHaveAttribute("data-state", "open");
    expect(container.firstElementChild).toHaveAttribute("data-edge", "bottom");
  });
  it("renders on the server with the overlay parked off-card", () => {
    const html = renderToString(<DirectionAwareCard overlay="Details">Media</DirectionAwareCard>);
    expect(html).toContain("Details");
    expect(html).toContain("translateY(100%)");
  });
});
