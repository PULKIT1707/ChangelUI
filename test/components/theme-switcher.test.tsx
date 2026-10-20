import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeSwitcher } from "../../src/components/theme-switcher";

describe("ThemeSwitcher", () => {
  it("renders a labelled radiogroup of presets, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ThemeSwitcher ref={ref} className="mt-4" storageKey={null} target={null} />);
    const group = screen.getByRole("radiogroup", { name: "Theme preset" });
    expect(ref.current).toBe(group);
    expect(group.className).toContain("mt-4");
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
  });

  it("renders on the server", () => {
    expect(renderToString(<ThemeSwitcher presets={["sunset"]} storageKey={null} />)).toContain('data-pui-theme="sunset"');
  });
});
