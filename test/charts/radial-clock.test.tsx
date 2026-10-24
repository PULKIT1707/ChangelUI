import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { clockLabel, RadialClock } from "../../src/charts/radial-clock";
const hours = Array.from({ length: 24 }, (_, h) => (h === 14 ? 300 : h === 3 ? 2 : 40 + h));
describe("RadialClock", () => {
  it("renders a figure, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<RadialClock ref={ref} data={hours} className="max-w-sm" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
    expect(container.innerHTML).not.toContain('d="undefined"');
  });
  it("summarizes the peak and quiet hours and moves with the keyboard (a11y)", () => {
    const onSelect = vi.fn();
    render(<RadialClock data={hours} unit="tickets" chartLabel="Tickets" onSelect={onSelect} />);
    expect(screen.getByRole("group", { name: "Tickets" })).toHaveAccessibleDescription(/Busiest 14:00–15:00: 300 tickets; quietest 03:00–04:00: 2 tickets/);
    const app = screen.getByRole("application");
    fireEvent.keyDown(app, { key: "ArrowRight" });
    fireEvent.keyDown(app, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ bin: 0, hour: 0, value: 40 }));
  });
  it("formats hours and renders the week layout on the server", () => {
    expect(clockLabel(13.5)).toBe("13:30");
    expect(clockLabel(0, "12h", true)).toBe("12a");
    const matrix = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => d + h));
    const html = renderToString(<RadialClock matrix={matrix} />);
    expect(html).toContain('data-layout="week"');
    expect(renderToString(<RadialClock data={[]} />)).toContain("Radial clock: no data.");
  });
});
