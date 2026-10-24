// The pure parts of the dist post-processing and inspection scripts.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SourceMapConsumer, SourceMapGenerator } from "source-map-js";
import { describe, expect, it } from "vitest";
import { checkNoTelemetry, checkReleasedEntries, machineNeedles, machinePathFailures } from "../scripts/check-dist.ts";
import { relativeCjsMap } from "../scripts/fix-cjs-sourcemaps.ts";
import { RELEASED_NAMES } from "../scripts/released-entries.ts";

describe("relativeCjsMap", () => {
  it("drops the absolute self-reference, keeps real mappings and relativizes other absolute sources", () => {
    const output = "/build/pkg/dist/x.cjs";
    const generator = new SourceMapGenerator({ file: output });
    generator.addMapping({ generated: { line: 1, column: 0 }, original: { line: 1, column: 0 }, source: output });
    generator.addMapping({
      generated: { line: 1, column: 10 },
      original: { line: 3, column: 2 },
      source: "../src/a.ts",
      name: "foo",
    });
    generator.addMapping({ generated: { line: 2, column: 0 }, original: { line: 1, column: 0 }, source: "/build/pkg/src/b.ts" });
    generator.setSourceContent("../src/a.ts", "A");
    generator.setSourceContent("/build/pkg/src/b.ts", "B");

    const fixed = relativeCjsMap(generator.toJSON(), output);
    expect(fixed.file).toBe("x.cjs");
    expect(fixed.sources).toEqual(["../src/a.ts", "../src/b.ts"]);
    expect(fixed.sourcesContent).toEqual(["A", "B"]);
    expect(JSON.stringify(fixed)).not.toContain("/build/");
    const consumer = new SourceMapConsumer(fixed);
    expect(consumer.originalPositionFor({ line: 1, column: 0 }).source).toBeNull();
    expect(consumer.originalPositionFor({ line: 1, column: 12 })).toEqual({
      source: "../src/a.ts",
      line: 3,
      column: 2,
      name: "foo",
    });
    expect(consumer.originalPositionFor({ line: 2, column: 0 }).source).toBe("../src/b.ts");
    // Idempotent.
    expect(relativeCjsMap(fixed, output)).toEqual(fixed);
  });
});

describe("checkReleasedEntries", () => {
  it("fails once per missing released name and accepts extra entries", () => {
    expect(checkReleasedEntries(RELEASED_NAMES)).toEqual([]);
    expect(checkReleasedEntries([...RELEASED_NAMES, "sample-panel"])).toEqual([]);
    const failures = checkReleasedEntries(RELEASED_NAMES.filter((name) => name !== "kbd" && name !== "ripple"));
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain("kbd");
    expect(failures[1]).toContain("ripple");
  });
});

describe("machinePathFailures", () => {
  it("flags home roots, the home directory and the username without printing them", () => {
    // Built at runtime so the repo's tracked-file path scan does not match this fixture.
    const macRoot = `/${"Users"}/`;
    const map = `{"file":"${macRoot}alice/proj/dist/x.cjs"}`;
    const failures = machinePathFailures("dist/x.cjs.map", map, machineNeedles(`${macRoot}alice`, "alice"));
    expect(failures).toEqual([
      `dist/x.cjs.map: contains "${macRoot}" (absolute build path)`,
      "dist/x.cjs.map: contains the home directory (absolute build path)",
      "dist/x.cjs.map: contains the OS username (absolute build path)",
    ]);
    expect(failures.join("\n")).not.toContain("alice");
    expect(machinePathFailures("a.map", "C:\\\\Users\\\\bob\\\\x", machineNeedles("C:\\Users\\bob", "bob"))).toHaveLength(2);
  });

  it("matches the username only as a path segment", () => {
    const code = ":root{} const root = node.parentNode; // node_modules";
    expect(machinePathFailures("a.js", code, machineNeedles("/root", "root"))).toEqual([]);
    expect(machinePathFailures("a.js", code, machineNeedles("/srv/node", "node"))).toEqual([]);
  });
});

describe("checkNoTelemetry", () => {
  it("flags every file that mentions posthog, in nested folders too", () => {
    const dir = mkdtempSync(join(tmpdir(), "pui-telemetry-"));
    try {
      writeFileSync(join(dir, "clean.js"), "export const a = 1;\n");
      mkdirSync(join(dir, "nested"));
      writeFileSync(join(dir, "nested", "dirty.js.map"), '{"sources":["../node_modules/PostHog-js/x.js"]}');
      expect(checkNoTelemetry(dir)).toEqual(['dist/nested/dirty.js.map: contains telemetry marker "posthog"']);
      rmSync(join(dir, "nested"), { recursive: true });
      expect(checkNoTelemetry(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
