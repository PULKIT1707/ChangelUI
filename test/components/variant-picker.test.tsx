import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VariantPicker, type ProductVariant, type VariantOption } from "../../src/components/variant-picker";
const OPTIONS: VariantOption[] = [
  {
    name: "color",
    label: "Color",
    values: [
      { value: "red", label: "Red", color: "#d33" },
      { value: "blue", label: "Blue", color: "#33d" },
    ],
  },
  { name: "size", label: "Size", values: [{ value: "S" }, { value: "M" }, { value: "L" }] },
];
const VARIANTS: ProductVariant[] = [
  { id: "rs", options: { color: "red", size: "S" }, stock: 5 },
  { id: "rm", options: { color: "red", size: "M" }, stock: 0 },
  { id: "bs", options: { color: "blue", size: "S" }, stock: 9 },
  { id: "bm", options: { color: "blue", size: "M" }, stock: 2 },
  { id: "bl", options: { color: "blue", size: "L" }, stock: 7 },
];
describe("VariantPicker", () => {
  it("renders labelled radio groups, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<VariantPicker ref={ref} options={OPTIONS} variants={VARIANTS} className="mt-4" />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("radiogroup", { name: "Color" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByText("Pick a color")).toBeInTheDocument();
  });
  it("crosses out sold-out and impossible values for the current picks (a11y)", () => {
    render(<VariantPicker options={OPTIONS} variants={VARIANTS} defaultValue={{ color: "red" }} />);
    expect(screen.getByRole("radio", { name: "M (sold out)" })).toHaveAttribute("data-state", "soldout");
    expect(screen.getByRole("radio", { name: "L (not available with your picks)" })).toHaveAttribute("data-state", "unavailable");
    expect(screen.getByRole("radio", { name: "S" })).toHaveAttribute("data-state", "available");
  });
  it("clears only the conflicting pick and reports the variant with low stock", () => {
    const onChange = vi.fn();
    render(<VariantPicker options={OPTIONS} variants={VARIANTS} defaultValue={{ color: "blue", size: "L" }} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /^Red/ }));
    expect(onChange).toHaveBeenLastCalledWith({ color: "red" }, undefined);
    expect(screen.getByRole("status")).toHaveTextContent("size cleared");
    fireEvent.click(screen.getByRole("radio", { name: /^Blue/ }));
    fireEvent.click(screen.getByRole("radio", { name: /^M/ }));
    expect(onChange).toHaveBeenLastCalledWith({ color: "blue", size: "M" }, VARIANTS[3]);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });
  it("moves and selects with arrow keys", () => {
    render(<VariantPicker options={OPTIONS} variants={VARIANTS} />);
    const red = screen.getByRole("radio", { name: /^Red/ });
    fireEvent.keyDown(red, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /^Blue/ })).toHaveAttribute("aria-checked", "true");
  });
  it("renders on the server", () => {
    expect(renderToString(<VariantPicker options={OPTIONS} variants={VARIANTS} />)).toContain("Color");
  });
});
