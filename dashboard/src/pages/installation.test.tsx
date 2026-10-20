import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Installation } from "./installation";

describe("Installation page", () => {
  it("documents local installs with build:watch and the Vite dedupe config", () => {
    render(<Installation />);
    const heading = screen.getByRole("heading", { level: 2, name: "Use it in your other projects" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    const scope = within(section as HTMLElement);
    const commands = scope.getByTestId("local-install-code").textContent ?? "";
    for (const text of ["npm run build", "npm install ../changelui", ".tgz", "npm link changelui", "npm run build:watch"]) {
      expect(commands, text).toContain(text);
    }
    expect(scope.getByTestId("vite-dedupe-code").textContent).toContain('dedupe: ["react", "react-dom", "motion"]');
    expect(scope.getByTestId("ts-paths-code").textContent).toContain('"react": ["./node_modules/@types/react/index.d.ts"]');
    expect(scope.getByRole("button", { name: "Copy local install commands" })).toBeInTheDocument();
    expect(scope.getByRole("button", { name: "Copy Vite dedupe config" })).toBeInTheDocument();
  });

  it("gives every copy button a unique name", () => {
    render(<Installation />);
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });
});
