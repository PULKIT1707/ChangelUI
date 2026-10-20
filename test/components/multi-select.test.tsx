import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MultiSelect } from "../../src/components/multi-select";

const frameworks = ["React", "Vue", "Svelte", "Solid"];

describe("MultiSelect", () => {
  it("renders chips for the value and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<MultiSelect ref={ref} aria-label="Frameworks" options={frameworks} defaultValue={["React"]} className="mt-4" />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Remove React" })).toBeInTheDocument();
  });

  it("removes the last chip with Backspace (a11y)", () => {
    render(<MultiSelect aria-label="Frameworks" options={frameworks} defaultValue={["React", "Vue"]} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.queryByRole("button", { name: "Remove Vue" })).toBeNull();
  });

  it("renders chips on the server", () => {
    expect(renderToString(<MultiSelect aria-label="Frameworks" options={frameworks} defaultValue={["Svelte"]} />)).toContain("Svelte");
  });
});
