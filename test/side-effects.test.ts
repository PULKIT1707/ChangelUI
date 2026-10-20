import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ENTRIES } from "../scripts/entries.ts";

const root = join(import.meta.dirname, "..");

function puiSymbols(): string[] {
  return Object.getOwnPropertySymbols(globalThis)
    .map((s) => s.description ?? "")
    .filter((d) => d.startsWith("changelui/"));
}

function htmlAttributes(): string {
  return [...document.documentElement.attributes].map((a) => `${a.name}=${a.value}`).join(" ");
}

describe("import is side-effect free (NFR-4)", () => {
  it("importing every entry creates no globals and leaves the DOM untouched", async () => {
    vi.resetModules();
    const before = {
      symbols: puiSymbols(),
      html: htmlAttributes(),
      body: document.body.outerHTML,
      head: document.head.innerHTML,
    };
    expect(before.symbols).toEqual([]);

    for (const entry of [{ file: "src/index.ts" }, ...ENTRIES]) {
      const mod = (await import(/* @vite-ignore */ pathToFileURL(join(root, entry.file)).href)) as object;
      expect(Object.keys(mod).length, entry.file).toBeGreaterThan(0);
    }

    expect(puiSymbols()).toEqual([]);
    expect(htmlAttributes()).toBe(before.html);
    expect(document.body.outerHTML).toBe(before.body);
    expect(document.head.innerHTML).toBe(before.head);
  });
});
