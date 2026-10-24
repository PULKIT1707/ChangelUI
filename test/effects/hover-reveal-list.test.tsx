import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HoverRevealList, type HoverRevealItem } from "../../src/effects/hover-reveal-list";
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const items: HoverRevealItem[] = [
  { title: "Northwind", href: "#northwind", image: PIXEL, meta: "2026" },
  { title: "Lumen", href: "#lumen", image: PIXEL, description: "Brand system" },
];
describe("HoverRevealList", () => {
  it("renders link rows, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<HoverRevealList ref={ref} className="mt-4" items={items} />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("link", { name: /Northwind/ })).toHaveAttribute("href", "#northwind");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
  it("marks the hovered row active and hides previews from assistive tech (a11y)", () => {
    const { container } = render(<HoverRevealList items={items} />);
    fireEvent.pointerEnter(screen.getByRole("link", { name: /Lumen/ }), { pointerType: "mouse", clientX: 10, clientY: 10 });
    expect(container.firstElementChild).toHaveAttribute("data-active", "1");
    for (const img of container.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
    fireEvent.pointerLeave(container.firstElementChild as Element);
    expect(container.firstElementChild).not.toHaveAttribute("data-active");
  });
  it("renders buttons that call onSelect when rows have no href", () => {
    const onSelect = vi.fn();
    render(<HoverRevealList items={[{ title: "Archive", image: PIXEL }]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Archive/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ title: "Archive" }), 0);
  });
  it("renders on the server", () => {
    const html = renderToString(<HoverRevealList items={items} />);
    expect(html).toContain("Northwind");
    expect(html).not.toContain("undefined");
  });
});
