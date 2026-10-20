import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Toggle, ToggleGroup, ToggleGroupItem } from "../../src/components/toggle-group";

describe("ToggleGroup", () => {
  it("renders a group of toggle buttons and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ToggleGroup ref={ref} aria-label="Align" defaultValue="left" className="mt-4">
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(ref.current).toBe(screen.getByRole("group", { name: "Align" }));
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles multiple values (a11y)", () => {
    render(
      <ToggleGroup type="multiple" aria-label="Format">
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    fireEvent.click(screen.getByRole("button", { name: "Italic" }));
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders on the server", () => {
    expect(renderToString(<Toggle aria-label="Mute">M</Toggle>)).toContain('aria-pressed="false"');
  });
});
