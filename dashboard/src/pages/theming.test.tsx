import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Theming } from "./theming";

describe("Theming page", () => {
  it("renders exactly one island of each theme, each with one island card and glow", () => {
    render(<Theming />);
    expect(screen.getByRole("heading", { level: 1, name: "Theming" })).toBeInTheDocument();
    const light = screen.getAllByTestId("island-light");
    const dark = screen.getAllByTestId("island-dark");
    expect(light).toHaveLength(1);
    expect(dark).toHaveLength(1);
    const [lightIsland] = light as [HTMLElement];
    const [darkIsland] = dark as [HTMLElement];
    expect(lightIsland).toHaveAttribute("data-theme", "light");
    expect(lightIsland).toHaveClass("rounded-pui-lg", "border", "border-pui-border", "bg-pui-background", "p-4", "text-pui-foreground");
    expect(darkIsland).toHaveClass("dark", "bg-pui-background", "text-pui-foreground");
    for (const island of [lightIsland, darkIsland]) {
      expect(within(island).getAllByTestId("island-card")).toHaveLength(1);
      expect(within(island).getAllByTestId("island-glow")).toHaveLength(1);
      expect(within(island).getAllByRole("button")).toHaveLength(2);
      // No dark: variants inside islands (design 10.3).
      for (const el of island.querySelectorAll("[class]")) expect(el.getAttribute("class")).not.toMatch(/(^|\s)dark:/);
    }
    for (const id of ["page-card", "page-glow", "scope-card", "scope-glow"]) expect(screen.getAllByTestId(id)).toHaveLength(1);
    const scope = screen.getByTestId("scope-demo");
    expect(scope).toHaveAttribute("data-pui-scope", "");
    expect(scope.style.getPropertyValue("--pui-primary")).toBe("var(--pui-success)");
    expect(scope.style.getPropertyValue("--pui-primary-foreground")).toBe("var(--pui-success-foreground)");
    expect(scope.style.getPropertyValue("--pui-primary-text")).toBe("var(--pui-success-text)");
    expect(within(scope).getByTestId("scope-card")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Color tokens in the current theme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy theme.css" })).toBeInTheDocument();
  });
});
