import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registryMeta } from "../dashboard/src/registry/meta";
import { CATEGORIES, ENTRIES } from "../scripts/entries.ts";
import { RELEASED_ENTRIES, RELEASED_NAMES } from "../scripts/released-entries.ts";
import * as barrel from "../src/index";
import {
  barrelFailures,
  entryFileFailures,
  exportsFailures,
  itemFileFailures,
  metaMatchFailures,
  metaOrderFailures,
  orderFailures,
  uniqueNameFailures,
  type CatalogInput,
} from "./utils/catalog";

const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { exports: unknown };
const SERVER_SAFE = ["chart-scales", "cn", "motion-presets", "theme-builder", "theme-script"];
const catalog: CatalogInput = {
  root,
  entries: ENTRIES,
  meta: registryMeta,
  pkgExports: pkg.exports,
  indexSource: readFileSync(join(root, "src/index.ts"), "utf8"),
};

describe("ENTRIES (design 5.3)", () => {
  it("every entry file exists and its name is the file basename", () => {
    expect(entryFileFailures(catalog)).toEqual([]);
  });

  it("names are unique", () => {
    expect(uniqueNameFailures(catalog)).toEqual([]);
  });

  it("is ordered by category, then alphabetically by name", () => {
    expect(orderFailures(catalog)).toEqual([]);
  });

  it("still lists every entry released in 1.0.0 (AC-1)", () => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, RELEASED_ENTRIES[c].length]));
    expect(counts).toEqual({ components: 33, text: 8, effects: 11, backgrounds: 6, charts: 0, hooks: 8 });
    expect(RELEASED_NAMES).toHaveLength(66);
    for (const category of CATEGORIES) {
      for (const name of RELEASED_ENTRIES[category]) {
        expect(ENTRIES.find((e) => e.name === name)?.category, name).toBe(category);
      }
      // charts was added after 1.0.0 and may still be empty
      if (RELEASED_ENTRIES[category].length) expect(ENTRIES.some((e) => e.category === category), category).toBe(true);
    }
    for (const entry of ENTRIES.filter((e) => e.category !== "hooks")) {
      expect(entry.file, entry.name).toBe(`src/${entry.category}/${entry.name}.tsx`);
    }
    for (const entry of ENTRIES.filter((e) => e.category === "hooks" && e.client)) {
      expect(entry.file, entry.name).toBe(`src/hooks/${entry.name}.ts`);
      expect(entry.name, entry.name).toMatch(/^use-/);
    }
  });

  it("only cn and theme-script are server-safe; only theme-script is undocumented", () => {
    expect(ENTRIES.filter((e) => !e.client).map((e) => e.name)).toEqual(SERVER_SAFE);
    expect(ENTRIES.filter((e) => !e.docs).map((e) => e.name)).toEqual(["theme-script"]);
  });

  it("package.json exports equals the generated map (run npm run sync:exports)", () => {
    expect(exportsFailures(catalog)).toEqual([]);
  });

  it("the barrel re-exports every entry module's runtime exports", async () => {
    const barrelExports = barrel as Record<string, unknown>;
    const expected = new Set<string>();
    for (const entry of ENTRIES) {
      const mod = (await import(/* @vite-ignore */ join(root, entry.file))) as Record<string, unknown>;
      for (const [name, value] of Object.entries(mod)) {
        expected.add(name);
        expect(barrelExports[name], `${entry.file} -> ${name}`).toBe(value);
      }
    }
    expect(Object.keys(barrelExports).sort()).toEqual([...expected].sort());
  });

  it("the barrel has one export * line per entry", () => {
    expect(barrelFailures(catalog)).toEqual([]);
  });
});

describe("dashboard registry agrees with ENTRIES", () => {
  it("every docs entry has a meta row, in ENTRIES order", () => {
    expect(metaOrderFailures(catalog)).toEqual([]);
  });

  it("every meta row matches its entry's title and category", () => {
    expect(metaMatchFailures(catalog)).toEqual([]);
  });

  it("every meta row has an items/<slug>.tsx module", () => {
    expect(itemFileFailures(catalog)).toEqual([]);
  });
});
