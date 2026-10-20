import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { CircularProgress, Progress } from "../../src/components/progress";

describe("Progress", () => {
  it("exposes full progressbar ARIA with the default label and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={42} />);
    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(ref.current).toBe(bar);
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
    expect(bar).toHaveAttribute("data-state", "loading");
    expect(bar).toHaveAttribute("data-tone", "primary");
  });

  it("omits aria-label when aria-labelledby is given", () => {
    render(
      <>
        <span id="lbl">Upload</span>
        <Progress value={10} aria-labelledby="lbl" label="ignored" />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).not.toHaveAttribute("aria-label");
  });

  it("clamps, formats and shows the value", () => {
    const { rerender } = render(<Progress value={150} max={50} showValue formatValue={(v, m) => `${v} of ${m}`} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(bar).toHaveAttribute("aria-valuetext", "50 of 50");
    expect(bar).toHaveAttribute("data-state", "complete");
    expect(bar).toHaveTextContent("50 of 50");
    rerender(<Progress value={-5} />);
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("is indeterminate for null/undefined and NaN (with a dev warning)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container, rerender } = render(<Progress value={null} showValue />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(container.querySelector("[data-pui-progress-indicator]")?.className).toContain("animate-pui-indeterminate");
    rerender(<Progress value={Number.NaN} max={0} />);
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("NaN"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("max must be a positive number"));
    warn.mockRestore();
  });

  it("indeterminate is a static segment under reduced motion; stripes render only with motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Progress />
        <Progress value={30} striped />
      </MotionConfig>,
    );
    const indicator = container.querySelector("[data-pui-progress-indicator]");
    expect(indicator?.className).not.toContain("animate-pui-indeterminate");
    expect(indicator?.className).toContain("w-2/5");
    expect(container.querySelector("[data-pui-stripes]")).toBeNull();
  });

  it("renders stripes when striped", () => {
    const { container } = render(<Progress value={30} striped size="lg" tone="success" />);
    expect(container.querySelector("[data-pui-stripes]")).not.toBeNull();
  });
});

describe("CircularProgress", () => {
  it("has progressbar ARIA, a size-derived box and a centered value", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<CircularProgress ref={ref} value={25} size="lg" showValue />);
    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(ref.current).toBe(bar);
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar.style.width).toBe("64px");
    expect(bar).toHaveTextContent("25%");
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    expect(container.querySelector("circle")).toHaveAttribute("stroke-width", "5");
  });

  it("rotates an arc when indeterminate, static under reduced motion", () => {
    const { container, rerender } = render(<CircularProgress thickness={2} size="sm" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
    expect(container.querySelector("circle")).toHaveAttribute("stroke-width", "2");
    rerender(
      <MotionConfig reducedMotion="always">
        <CircularProgress />
      </MotionConfig>,
    );
    expect(container.querySelector("svg")?.getAttribute("class")).not.toContain("animate-spin");
  });
});
