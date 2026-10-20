import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NumberInput } from "../../src/components/number-input";

describe("NumberInput", () => {
  it("renders a spinbutton group, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<NumberInput ref={ref} aria-label="Quantity" className="mt-4" defaultValue={3} min={0} max={5} />);
    const input = screen.getByRole("spinbutton", { name: "Quantity" });
    expect(input).toHaveAttribute("aria-valuenow", "3");
    expect(ref.current?.className).toContain("mt-4");
  });

  it("steps with the arrow keys and clamps at max (a11y)", () => {
    render(<NumberInput aria-label="Quantity" defaultValue={4} max={5} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-valuenow", "5");
  });

  it("renders on the server", () => {
    expect(renderToString(<NumberInput aria-label="Server" defaultValue={7} />)).toContain("7");
  });
});
