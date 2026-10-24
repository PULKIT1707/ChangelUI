import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ImageHotspots, type Hotspot } from "../../src/effects/image-hotspots";
const SPOTS: Hotspot[] = [
  { id: "lamp", x: 20, y: 30, title: "Arc lamp", body: "Brushed brass" },
  { id: "sofa", x: 70, y: 70, title: "Linen sofa" },
  { id: "rug", x: 50, y: 90, title: "Wool rug" },
];
const IMG = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
describe("ImageHotspots", () => {
  it("renders a named group with markers, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ImageHotspots ref={ref} src={IMG} alt="Living room" spots={SPOTS} className="mt-4" />);
    const group = screen.getByRole("group", { name: "Living room" });
    expect(ref.current).toBe(group);
    expect(group.className).toContain("mt-4");
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Living room" })).toBeInTheDocument();
  });
  it("opens a card, steps with arrows and closes on Escape (a11y)", () => {
    const onChange = vi.fn();
    render(<ImageHotspots src={IMG} alt="Living room" spots={SPOTS} onValueChange={onChange} numbered />);
    const lamp = screen.getByRole("button", { name: "Arc lamp, step 1 of 3" });
    fireEvent.click(lamp);
    expect(lamp).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Arc lamp" })).toHaveTextContent("Brushed brass");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    fireEvent.keyDown(lamp, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("sofa");
    expect(screen.getByRole("button", { name: "Linen sofa, step 2 of 3" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Linen sofa, step 2 of 3" }), { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
  it("steps from the card buttons and wraps around", () => {
    const onChange = vi.fn();
    render(<ImageHotspots src={IMG} alt="Living room" spots={SPOTS} defaultValue="rug" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next point" }));
    expect(onChange).toHaveBeenLastCalledWith("lamp");
  });
  it("renders on the server", () => {
    expect(renderToString(<ImageHotspots src={IMG} alt="Living room" spots={SPOTS} />)).toContain("Arc lamp");
  });
});
