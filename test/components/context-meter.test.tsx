import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ContextMeter, ContextMeterPanel, contextStatus } from "../../src/components/context-meter";
const breakdown = [
  { label: "System prompt", tokens: 4_000 },
  { label: "Messages", tokens: 90_000 },
  { label: "Files", tokens: 26_000 },
];
describe("ContextMeterPanel", () => {
  it("sums the breakdown into one meter, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ContextMeterPanel ref={ref} className="mt-4" max={128_000} breakdown={breakdown} />);
    expect(ref.current?.className).toContain("mt-4");
    const meter = screen.getByRole("meter", { name: "Context window" });
    expect(meter).toHaveAttribute("aria-valuenow", "120000");
    expect(meter.getAttribute("aria-valuetext")).toContain("94%");
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(ref.current).toHaveAttribute("data-status", "critical");
  });
  it("shows the cost and runs compact", () => {
    const onCompact = vi.fn();
    render(<ContextMeterPanel used={50_000} max={200_000} pricePerMillion={3} onCompact={onCompact} />);
    expect(screen.getByText(/0\.15/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compact conversation" }));
    expect(onCompact).toHaveBeenCalled();
  });
  it("classifies status", () => {
    expect(contextStatus(10, 100)).toBe("ok");
    expect(contextStatus(80, 100)).toBe("warning");
    expect(contextStatus(95, 100)).toBe("critical");
    expect(contextStatus(100, 100)).toBe("full");
  });
});
describe("ContextMeter", () => {
  it("names the trigger with the fill and opens the panel", () => {
    render(<ContextMeter used={32_000} max={128_000} />);
    const trigger = screen.getByRole("button", { name: /25%/ });
    fireEvent.click(trigger);
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<ContextMeterPanel used={1000} max={8000} />)).toContain("Context window");
  });
});
