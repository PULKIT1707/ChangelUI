import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Combobox } from "../../src/components/combobox";

const fruits = ["Apple", "Apricot", "Banana", "Cherry"];

describe("Combobox", () => {
  it("renders a combobox input and forwards the ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Combobox ref={ref} aria-label="Fruit" options={fruits} className="mt-4" />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(ref.current).toBe(input);
    expect(input.className).toContain("mt-4");
  });

  it("filters while typing and selects with Enter (a11y)", () => {
    render(<Combobox aria-label="Fruit" options={fruits} />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    fireEvent.change(input, { target: { value: "ban" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("Banana");
  });

  it("renders the selected label on the server", () => {
    expect(renderToString(<Combobox aria-label="Fruit" options={fruits} defaultValue="Cherry" />)).toContain("Cherry");
  });
});
