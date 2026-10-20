import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import * as library from "../src/index";
import { fixtures, hookProbes } from "./fixtures";

/** Plan P14: uppercase name and a function or a React exotic object ($$typeof). */
export function isComponentExport(name: string, value: unknown): boolean {
  if (!/^[A-Z]/.test(name)) return false;
  if (typeof value === "function") return true;
  return typeof value === "object" && value !== null && "$$typeof" in value;
}

const exportsByName = Object.entries(library);
const componentNames = exportsByName.filter(([n, v]) => isComponentExport(n, v)).map(([n]) => n);
const hookNames = exportsByName.filter(([n, v]) => /^use[A-Z]/.test(n) && typeof v === "function").map(([n]) => n);

describe("smoke", () => {
  it("classifies exports per P14", () => {
    expect(isComponentExport("Button", () => null)).toBe(true);
    expect(isComponentExport("Tabs", { $$typeof: Symbol.for("react.forward_ref") })).toBe(true);
    expect(isComponentExport("cn", () => "")).toBe(false);
    expect(isComponentExport("Sizes", { a: 1 })).toBe(false);
  });

  it("every component export is covered by a fixture", () => {
    const covered = new Set(fixtures.flatMap((f) => f.covers));
    expect(componentNames.filter((n) => !covered.has(n))).toEqual([]);
  });

  it("every fixture covers real exports", () => {
    const names = new Set(exportsByName.map(([n]) => n));
    for (const fixture of fixtures) for (const name of fixture.covers) expect(names.has(name), name).toBe(true);
  });

  it("every hook export has a probe and every probe is an export", () => {
    expect(Object.keys(hookProbes).sort()).toEqual([...hookNames].sort());
  });

  for (const fixture of fixtures) {
    for (const theme of ["light", "dark"] as const) {
      it(`${fixture.name} renders in ${theme}`, () => {
        const ref = createRef<Element>();
        render(<div className={theme}>{fixture.element(ref)}</div>);
        if (fixture.ref !== false) expect(ref.current).toBeInstanceOf(Element);
      });
    }
  }

  for (const [name, probe] of Object.entries(hookProbes)) {
    for (const theme of ["light", "dark"] as const) {
      it(`${name} runs inside a component (${theme})`, () => {
        let result: unknown = "unset";
        function Probe() {
          result = probe();
          return null;
        }
        render(
          <div className={theme}>
            <Probe />
          </div>,
        );
        expect(result).not.toBe("unset");
      });
    }
  }
});
