// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registryMeta } from "../dashboard/src/registry/meta";
import {
  exportedNames,
  identifierNames,
  moduleSpecifiers,
  parseBarrel,
  parseEntries,
  parseFixtures,
  parseMeta,
  parseSource,
  readEntries,
  readMeta,
  ScaffoldError,
  splice,
} from "../scripts/catalog-source.ts";
import { ENTRIES } from "../scripts/entries.ts";
import { nodeIo } from "../scripts/item-scaffold.ts";
import { fixtures, hookProbes } from "./fixtures";

const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("catalog readers", () => {
  it("readEntries evaluates scripts/entries.ts exactly like the module (D3)", () => {
    const source = readEntries(root, nodeIo);
    expect(source.elements.map((el) => el.entry)).toEqual(ENTRIES);
    for (const { entry, range } of source.elements) {
      expect(source.text.slice(range.start, range.end), entry.name).toContain(`"${entry.name}"`);
      expect(range.trailing).toBe(",");
    }
  });

  it("readMeta finds every registryMeta row in order", () => {
    const meta = readMeta(root, nodeIo);
    expect(meta.elements.map((m) => m.slug)).toEqual(registryMeta.map((m) => m.slug));
    expect(meta.elements.map((m) => m.exports)).toEqual(registryMeta.map((m) => m.exports));
  });

  it("parseBarrel lists one value export * line per entry plus the type-only star", () => {
    const barrel = parseBarrel(read("src/index.ts"));
    expect(barrel.lines).toHaveLength(ENTRIES.length);
    expect(barrel.starSpecs).toContain("./lib/types");
    expect(barrel.lines.map((l) => l.spec)).not.toContain("./lib/types");
  });

  it("parseFixtures finds every fixture, hook probe and ../src/index specifier", () => {
    const source = parseFixtures(read("test/fixtures.tsx"));
    expect(source.fixtures.map((f) => f.name)).toEqual(fixtures.map((f) => f.name));
    expect(source.fixtures.map((f) => f.covers)).toEqual(fixtures.map((f) => f.covers));
    expect(source.hookProbes.map((p) => p.name)).toEqual(Object.keys(hookProbes));
    expect(source.imports.map((i) => i.name)).toContain("Accordion");
    expect(source.text.slice(source.importClose.offset)).toMatch(/^\} from "\.\.\/src\/index";/);
  });

  it("exportedNames collects declarations and export lists, values and types", () => {
    const names = exportedNames("src/effects/reveal.tsx", read("src/effects/reveal.tsx"));
    for (const name of ["Reveal", "RevealProps", "revealPresets", "RevealPreset"]) expect(names.has(name), name).toBe(true);
    const sample = exportedNames(
      "a.ts",
      "const a = 1; type B = 2; export { a as c }; export type { B }; export const { d, e: [f] } = x; export * as ns from './n';",
    );
    expect([...sample].sort()).toEqual(["B", "c", "d", "f", "ns"]);
  });

  it("identifierNames ignores strings and comments; moduleSpecifiers sees imports, import() and require()", () => {
    const sf = parseSource(
      "a.tsx",
      'import { A } from "./a";\nexport * from "./b";\nconst s = "Hidden"; // Comment\nconst c = <Shown />;\nvoid import("./c");\nrequire("./d");',
    );
    const ids = identifierNames(sf);
    expect(ids.has("A")).toBe(true);
    expect(ids.has("Shown")).toBe(true);
    expect(ids.has("Hidden")).toBe(false);
    expect(ids.has("Comment")).toBe(false);
    expect(moduleSpecifiers(sf)).toEqual(["./a", "./b", "./c", "./d"]);
  });
});

describe("splice", () => {
  it("inserting then deleting the same lines is the identity", () => {
    const text = "a\nb\nc\n";
    const inserted = splice(text, [{ start: 2, end: 2, insert: "x\n" }]);
    expect(inserted).toBe("a\nx\nb\nc\n");
    expect(splice(inserted, [{ start: 2, end: 4, insert: "" }])).toBe(text);
  });

  it("applies several edits and keeps same-offset inserts in order", () => {
    expect(
      splice("0123456789", [
        { start: 8, end: 9, insert: "" },
        { start: 2, end: 2, insert: "a" },
        { start: 2, end: 2, insert: "b" },
      ]),
    ).toBe("01ab2345679");
    expect(() =>
      splice("0123", [
        { start: 0, end: 2, insert: "" },
        { start: 1, end: 3, insert: "" },
      ]),
    ).toThrow(/overlapping/);
  });
});

describe("readers fail with ScaffoldError on unexpected shapes", () => {
  it.each([
    ["entries", () => parseEntries("export const OTHER = [];")],
    ["entries row", () => parseEntries('export const ENTRIES = [\n  makeEntry("x"),\n];')],
    ["shared line", () => parseEntries('export const ENTRIES = [component("a", "A"), component("b", "B")];')],
    ["barrel", () => parseBarrel("export {};")],
    ["meta", () => parseMeta("export const rows = [];")],
    ["fixtures import", () => parseFixtures('import { A } from "./a";')],
    ["fixtures array", () => parseFixtures('import {\n  A,\n} from "../src/index";\nexport const hookProbes = {\n};')],
    ["hook probes", () => parseFixtures('import {\n  A,\n} from "../src/index";\nexport const fixtures = [\n];')],
  ])("%s", (_label, run) => {
    expect(run).toThrow(ScaffoldError);
  });
});
