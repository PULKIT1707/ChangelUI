import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker, formatColor, parseColor } from "../../src/components/color-picker";

describe("ColorPicker", () => {
  it("exposes sliders and changes with keys", () => {
    const onValueChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" onValueChange={onValueChange} />);
    expect(screen.getByRole("group", { name: "Color picker" })).toBeInTheDocument();
    const hue = screen.getByRole("slider", { name: "Hue" });
    fireEvent.keyDown(hue, { key: "End" });
    expect(onValueChange).toHaveBeenCalled();
  });
  it("parses and formats colors", () => {
    expect(formatColor(parseColor("#3366ff")!, "hex")).toBe("#3366ff");
    expect(parseColor("rgb(255 0 0 / 50%)")?.a).toBeCloseTo(0.5);
    expect(parseColor("nope")).toBeNull();
  });
  it("renders on the server", () => {
    expect(renderToString(<ColorPicker />)).toContain("slider");
  });
});
