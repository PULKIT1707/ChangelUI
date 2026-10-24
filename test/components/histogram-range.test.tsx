import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HistogramRange } from "../../src/components/histogram-range";
const DATA = [10, 12, 15, 20, 20, 22, 35, 40, 48, 50];
describe("HistogramRange", () => {
  it("renders labelled thumbs, the matching count and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<HistogramRange ref={ref} label="Price" data={DATA} bins={4} className="mt-4" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
    expect(sliders[0]).toHaveAttribute("aria-valuenow", "10");
    expect(sliders[1]).toHaveAttribute("aria-valuenow", "50");
    expect(container.querySelector("[data-pui-histogram-count]")).toHaveTextContent("10 of 10");
    expect(container.querySelectorAll("[data-pui-histogram] > span[data-in-range]")).toHaveLength(4);
  });
  it("narrows with the keyboard, dims bars outside and announces the count (a11y)", () => {
    const onCommit = vi.fn();
    const { container } = render(<HistogramRange label="Price" data={DATA} bins={4} defaultValue={[10, 50]} onValueCommit={onCommit} />);
    const [low] = screen.getAllByRole("slider");
    fireEvent.keyDown(low as HTMLElement, { key: "PageUp" });
    fireEvent.keyDown(low as HTMLElement, { key: "PageUp" });
    expect(onCommit).toHaveBeenLastCalledWith([30, 50]);
    expect(container.querySelector("[data-pui-histogram-count]")).toHaveTextContent("4 of 10");
    expect(container.querySelectorAll("[data-pui-histogram] > span[data-in-range]")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("4 of 10 match");
  });
  it("applies typed values, clamped to the bounds and the other thumb", () => {
    const onChange = vi.fn();
    render(<HistogramRange label="Price" data={DATA} defaultValue={[20, 40]} onValueChange={onChange} />);
    const max = screen.getByRole("textbox", { name: "Maximum" });
    fireEvent.focus(max);
    fireEvent.change(max, { target: { value: "999" } });
    fireEvent.keyDown(max, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith([20, 50]);
    const min = screen.getByRole("textbox", { name: "Minimum" });
    fireEvent.focus(min);
    fireEvent.change(min, { target: { value: "$70" } });
    fireEvent.blur(min);
    expect(onChange).toHaveBeenLastCalledWith([50, 50]);
  });
  it("renders on the server", () => {
    expect(renderToString(<HistogramRange label="Price" data={DATA} />)).toContain("Price");
  });
});
