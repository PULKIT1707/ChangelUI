// @vitest-environment node
// `npm run new` / `npm run remove` against temp copies of the repo (test/utils/temp-repo.ts). The CLIs
// are called in-process through their main() with an explicit root; the real tree is never written.
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { RegistryMeta } from "../dashboard/src/registry/types";
import type { Category, Entry } from "../scripts/entries.ts";
import { nodeIo, planNew, validateNew } from "../scripts/item-scaffold.ts";
import { deriveNames } from "../scripts/item-templates.ts";
import { main as newMain } from "../scripts/new-item.ts";
import { main as removeMain } from "../scripts/remove-item.ts";
import { renderPackageJson } from "../scripts/sync-exports.ts";
import { catalogFailures } from "./utils/catalog";
import { checkFile, declaredCssVars } from "./utils/hygiene";
import { faultyIo, hashTree, listDirs, makeTempRepo, removeTempRepo, repoRoot } from "./utils/temp-repo";

// One name per category, each between two items released in 1.0.0, so these tests keep their
// expected positions even while sample items scaffolded into the real repo exist.
const CASES: ReadonlyArray<{ name: string; category: Category }> = [
  { name: "pricing-card", category: "components" },
  { name: "glitch-text", category: "text" },
  { name: "float-card", category: "effects" },
  { name: "plasma", category: "backgrounds" },
  // charts was added after 1.0.0; "spark-trend" sorts before any planned chart name.
  { name: "spark-trend", category: "charts" },
  { name: "use-dark-mode", category: "hooks" },
];
const GUARDED = ["scripts/entries.ts", "src/index.ts", "package.json", "test/fixtures.tsx", "dashboard/src/registry/meta.ts"];
const themeVars = declaredCssVars(readFileSync(join(repoRoot, "src/styles/theme.css"), "utf8"));

const temps: string[] = [];
function temp(): string {
  const dir = makeTempRepo();
  temps.push(dir);
  return dir;
}

interface Run {
  code: number;
  out: string;
  err: string;
}

function run(cli: typeof newMain, argv: string[], root: string, extra: Partial<Parameters<typeof newMain>[1]> = {}): Run {
  const out: string[] = [];
  const err: string[] = [];
  const code = cli(argv, { root, log: (l) => out.push(l), error: (l) => err.push(l), env: {}, ...extra });
  return { code, out: out.join("\n"), err: err.join("\n") };
}
const runNew = (argv: string[], root: string, extra = {}) => run(newMain, argv, root, extra);
const runRemove = (argv: string[], root: string, extra = {}) => run(removeMain, argv, root, extra);

const readTemp = (root: string, file: string) => readFileSync(join(root, file), "utf8");

function sha(file: string): string {
  return createHash("sha256").update(readFileSync(join(repoRoot, file))).digest("hex");
}

let guard: Record<string, string> = {};
beforeAll(() => {
  guard = Object.fromEntries(GUARDED.map((f) => [f, sha(f)]));
});
afterEach(() => {
  while (temps.length > 0) removeTempRepo(temps.pop() as string);
});

describe("names (D7)", () => {
  it.each([
    ["sample-panel", "components", "SamplePanel", "SamplePanelProps"],
    ["x-ray-card", "components", "XRayCard", "XRayCardProps"],
    ["button2", "components", "Button2", "Button2Props"],
    ["glitch-text", "text", "GlitchText", "GlitchTextProps"],
    ["use-sample-toggle", "hooks", "useSampleToggle", "UseSampleToggleOptions"],
  ] as const)("%s (%s) -> %s / %s", (name, category, title, props) => {
    const names = deriveNames(name, category);
    expect(names.title).toBe(title);
    expect(names.props).toBe(props);
    expect(names.file).toBe(`src/${category}/${name}.${category === "hooks" ? "ts" : "tsx"}`);
    if (category === "hooks") {
      expect(names.result).toBe("UseSampleToggleResult");
      expect(names.keywords).toEqual(["sample", "toggle"]);
    }
  });

  it.each([
    ["pricing-card", "components"],
    ["a1", "components"],
    ["x-ray-card", "effects"],
    ["use-dark-mode", "hooks"],
    ["use-x2", "hooks"],
  ])("accepts %s (%s)", (name, category) => {
    const root = temp();
    expect(() => validateNew(root, name, category, nodeIo)).not.toThrow();
  });

  it.each([
    ["Sample_Panel", "components", /not a valid name/],
    ["sample--panel", "components", /not a valid name/],
    ["-panel", "components", /not a valid name/],
    ["2panel", "components", /not a valid name/],
    ["a", "components", /not a valid name/],
    [`a${"b".repeat(40)}`, "components", /not a valid name/],
    ["badge", "components", /already exists \(src\/components\/badge\.tsx\)/],
    ["index", "components", /reserved/],
    ["chunk-a", "components", /reserved/],
    ["portal", "components", /internal module \(src\/lib\/portal\.tsx\)/],
    ["dialog-content", "components", /DialogContent is already exported by src\/components\/dialog\.tsx/],
    ["toaster", "components", /Toaster is already exported by src\/components\/toast\.tsx/],
    ["trigger", "components", /Trigger is already exported by src\/lib\/types\.ts/],
    ["tone", "components", /internal module \(src\/lib\/tone\.ts\)/],
    ["preview", "components", /Preview clashes with a name the generated files use/],
    ["pricing-card", "widgets", /unknown category "widgets"/],
    ["sample", "hooks", /hooks are named use-<words>/],
    ["use-2x", "hooks", /hooks are named use-<words>/],
    ["use-thing", "components", /only hooks may start with "use-"/],
    ["use", "text", /only hooks may start with "use-"/],
    ["use-state", "hooks", /useState clashes/],
  ])("rejects %s (%s)", (name, category, message) => {
    const root = temp();
    expect(() => validateNew(root, name, category, nodeIo)).toThrow(message);
  });

  it("rejects a name whose test or registry file already exists", () => {
    const root = temp();
    writeFileSync(join(root, "test/components/pricing-card.test.tsx"), "");
    expect(() => validateNew(root, "pricing-card", "components", nodeIo)).toThrow(
      /test\/components\/pricing-card\.test\.tsx already exists/,
    );
    writeFileSync(join(root, "dashboard/src/registry/items/glitch-text.tsx"), "");
    expect(() => validateNew(root, "glitch-text", "text", nodeIo)).toThrow(/items\/glitch-text\.tsx already exists/);
  });
});

describe("npm run new: arguments (D8)", () => {
  it("prints help and exits 0", () => {
    const result = runNew(["--help"], temp());
    expect(result.code).toBe(0);
    expect(result.out).toContain("Usage: npm run new -- <kebab-name> --category");
  });

  it.each([
    [["pricing-card"], /missing --category/],
    [["pricing-card", "--category", "components", "--force"], /Unknown option '--force'/],
    [["a", "b", "--category", "components"], /expected exactly one name, got 2/],
    [["--category", "components"], /expected exactly one name, got 0/],
  ])("%j fails with usage", (argv, message) => {
    const root = temp();
    const before = hashTree(root);
    const result = runNew(argv, root);
    expect(result.code).toBe(1);
    expect(result.err).toMatch(message);
    expect(result.err).toContain("Usage:");
    expect(hashTree(root)).toEqual(before);
  });

  it.each([
    // npm 11: `npm run new pricing-card --category components` and `... --category=components`
    [["pricing-card", "components"], "true"],
    [["pricing-card"], "components"],
  ])("explains -- when npm swallowed --category (%j, npm_config_category=%s)", (argv, value) => {
    const root = temp();
    const before = hashTree(root);
    const result = runNew(argv, root, { env: { npm_config_category: value } });
    expect(result.code).toBe(1);
    expect(result.err).toContain("pass arguments after --, e.g. npm run new -- pricing-card --category components");
    expect(hashTree(root)).toEqual(before);
  });

  it("accepts --category=<c> and treats npm_config_dry_run=true as --dry-run", () => {
    const root = temp();
    const before = hashTree(root);
    const result = runNew(["pricing-card", "--category=components"], root, { env: { npm_config_dry_run: "true" } });
    expect(result.code).toBe(0);
    expect(result.out).toContain("Dry run: nothing was written.");
    expect(hashTree(root)).toEqual(before);
  });
});

async function importFresh<T>(file: string): Promise<T> {
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)) as T;
}

describe.each(CASES)("npm run new -- $name --category $category", ({ name, category }) => {
  const n = deriveNames(name, category);
  const paths = [n.file, n.testFile, n.itemFile, ...GUARDED];

  it("--dry-run prints all 8 paths and writes nothing", () => {
    const root = temp();
    const before = hashTree(root);
    const result = runNew([name, "--category", category, "--dry-run"], root);
    expect(result.code).toBe(0);
    for (const path of paths) expect(result.out, path).toContain(path);
    expect(result.out).toContain("Dry run: nothing was written.");
    expect(hashTree(root)).toEqual(before);
  });

  it("creates 3 files, updates 5 and leaves a consistent catalog", async () => {
    const root = temp();
    const before = hashTree(root);
    const originalPackage = readTemp(root, "package.json");
    const plan = planNew(root, { name, category }, nodeIo);
    expect(plan.changes.filter((c) => c.kind === "create").map((c) => c.path)).toEqual([n.file, n.testFile, n.itemFile]);
    expect(plan.changes.filter((c) => c.kind === "update").map((c) => c.path).sort()).toEqual([...GUARDED].sort());

    const result = runNew([name, "--category", category], root);
    expect(result.err).toBe("");
    expect(result.code).toBe(0);
    expect(result.out).toContain(`Created ${n.title}. Next steps:`);
    expect(result.out).toContain(`http://127.0.0.1:5173/#/${category}/${name}`);
    const after = hashTree(root);
    expect(Object.keys(after).filter((f) => !(f in before)).sort()).toEqual([n.file, n.itemFile, n.testFile].sort());
    expect(Object.keys(after).filter((f) => before[f] !== undefined && before[f] !== after[f]).sort()).toEqual(
      [...GUARDED].sort(),
    );

    const { ENTRIES } = await importFresh<{ ENTRIES: Entry[] }>(join(root, "scripts/entries.ts"));
    const { registryMeta } = await importFresh<{ registryMeta: RegistryMeta[] }>(
      join(root, "dashboard/src/registry/meta.ts"),
    );
    const pkg = JSON.parse(readTemp(root, "package.json")) as { exports: unknown };
    expect(
      catalogFailures({ root, entries: ENTRIES, meta: registryMeta, pkgExports: pkg.exports, indexSource: readTemp(root, "src/index.ts") }),
    ).toEqual([]);
    expect(ENTRIES.find((e) => e.name === name)).toEqual({ name, title: n.title, category, file: n.file, client: true, docs: true });
    expect(registryMeta.find((m) => m.slug === name)).toMatchObject({ title: n.title, category, exports: [n.title], isNew: true });
    expect(readTemp(root, "package.json")).toBe(renderPackageJson(originalPackage, ENTRIES));

    expect(checkFile(n.file, readTemp(root, n.file), themeVars)).toEqual([]);
    for (const file of [n.file, n.testFile, n.itemFile, "scripts/entries.ts", "src/index.ts", "test/fixtures.tsx", "dashboard/src/registry/meta.ts"]) {
      const text = readTemp(root, file);
      if ([n.file, n.testFile, n.itemFile].includes(file)) {
        expect(text, file).not.toContain("${");
        expect(text, file).not.toContain("`");
      }
      const output = ts.transpileModule(text, {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      });
      expect(output.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")) ?? [], file).toEqual([]);
    }
  });
});

describe("placement (D4)", () => {
  function linesAround(text: string, needle: string): string[] {
    const lines = text.split("\n");
    const i = lines.findIndex((l) => l.includes(needle));
    expect(i, needle).toBeGreaterThan(0);
    return [lines[i - 1] ?? "", lines[i] ?? "", lines[i + 1] ?? ""];
  }

  it("puts a background between its neighbors in every file", () => {
    const root = temp();
    expect(runNew(["plasma", "--category", "backgrounds"], root).code).toBe(0);
    expect(linesAround(readTemp(root, "scripts/entries.ts"), '"plasma"')).toEqual([
      '  item("backgrounds", "particles", "Particles"),',
      '  item("backgrounds", "plasma", "Plasma"),',
      '  item("backgrounds", "ripple", "Ripple"),',
    ]);
    expect(linesAround(readTemp(root, "src/index.ts"), "/plasma")).toEqual([
      'export * from "./backgrounds/particles";',
      'export * from "./backgrounds/plasma";',
      'export * from "./backgrounds/ripple";',
    ]);
    expect(linesAround(readTemp(root, "test/fixtures.tsx"), "  Plasma,")).toEqual(["  Particles,", "  Plasma,", "  Ripple,"]);
    const fixtures = readTemp(root, "test/fixtures.tsx");
    expect(fixtures).toContain(
      '    element: (ref) => <Particles ref={asRef<HTMLDivElement>(ref)} quantity={10} />,\n  },\n  {\n    name: "Plasma",',
    );
    const meta = readTemp(root, "dashboard/src/registry/meta.ts");
    expect(meta.indexOf('slug: "particles"')).toBeLessThan(meta.indexOf('slug: "plasma"'));
    expect(meta.indexOf('slug: "plasma"')).toBeLessThan(meta.indexOf('slug: "ripple"'));
  });

  it("puts the first chart after the last background and before the hooks", () => {
    const root = temp();
    expect(runNew(["spark-trend", "--category", "charts"], root).code).toBe(0);
    expect(linesAround(readTemp(root, "scripts/entries.ts"), '"spark-trend"')).toEqual([
      '  item("backgrounds", "ripple", "Ripple"),',
      '  item("charts", "spark-trend", "SparkTrend"),',
      "  // hooks",
    ]);
    expect(linesAround(readTemp(root, "src/index.ts"), "/spark-trend")).toEqual([
      'export * from "./backgrounds/ripple";',
      'export * from "./charts/spark-trend";',
      'export * from "./hooks/use-click-outside";',
    ]);
    expect(readTemp(root, "test/fixtures.tsx")).toContain("element: (ref) => <SparkTrend ref={asRef<HTMLElement>(ref)} data={[3, 5, 4, 8]} />,");
  });

  it("puts a hook's specifier after its predecessor and its probe before the next key", () => {
    const root = temp();
    expect(runNew(["use-dark-mode", "--category", "hooks"], root).code).toBe(0);
    const fixtures = readTemp(root, "test/fixtures.tsx");
    expect(linesAround(fixtures, "  useDarkMode,")).toEqual(["  useCopyToClipboard,", "  useDarkMode,", "  useFocusTrap,"]);
    expect(fixtures).toContain("  useCopyToClipboard: () => useCopyToClipboard(),\n  useDarkMode: () => useDarkMode(),\n  useFocusTrap: () => {");
    expect(linesAround(readTemp(root, "scripts/entries.ts"), '"use-dark-mode"')).toEqual([
      '  hook("use-copy-to-clipboard", "useCopyToClipboard"),',
      '  hook("use-dark-mode", "useDarkMode"),',
      '  hook("use-focus-trap", "useFocusTrap"),',
    ]);
  });

  it("puts the first item of a category before its successor, after the category comment", () => {
    const root = temp();
    expect(runNew(["glitch-text", "--category", "text"], root).code).toBe(0);
    expect(linesAround(readTemp(root, "scripts/entries.ts"), '"glitch-text"')).toEqual([
      "  // text",
      '  item("text", "glitch-text", "GlitchText"),',
      '  item("text", "gradient-text", "GradientText"),',
    ]);
    const fixtures = readTemp(root, "test/fixtures.tsx");
    expect(fixtures.indexOf('name: "GlitchText"')).toBeLessThan(fixtures.indexOf('name: "GradientText"'));
    expect(fixtures.indexOf('name: "Textarea"')).toBeLessThan(fixtures.indexOf('name: "GlitchText"'));
  });
});

describe("atomic apply (D6)", () => {
  it("rolls back every partial new, including created directories", () => {
    // Measure the mutating calls of a full run on a tree that also needs test/hooks created.
    const probe = temp();
    rmSync(join(probe, "test/hooks"), { recursive: true });
    const counting = faultyIo(0);
    expect(runNew(["use-dark-mode", "--category", "hooks"], probe, { io: counting }).code).toBe(0);
    const total = counting.calls();
    expect(total).toBeGreaterThanOrEqual(17); // 1 mkdir + 8 files x (write + rename)

    const root = temp();
    rmSync(join(root, "test/hooks"), { recursive: true });
    const before = hashTree(root);
    const dirs = listDirs(root);
    for (let n = 1; n <= total; n++) {
      const result = runNew(["use-dark-mode", "--category", "hooks"], root, { io: faultyIo(n) });
      expect(result.code, `failAt ${n}`).toBe(1);
      expect(result.err, `failAt ${n}`).toMatch(/injected failure .*; rolled back \d+ change\(s\); nothing was changed/);
      expect(hashTree(root), `failAt ${n}`).toEqual(before);
      expect(listDirs(root), `failAt ${n}`).toEqual(dirs);
    }
  });

  it("a plan-time failure writes nothing", () => {
    const root = temp();
    writeFileSync(join(root, "src/index.ts"), "");
    const before = hashTree(root);
    const result = runNew(["pricing-card", "--category", "components"], root);
    expect(result.code).toBe(1);
    expect(result.err).toContain("cannot find any export * lines in src/index.ts");
    expect(hashTree(root)).toEqual(before);
  });

  it("refuses to apply when a file changed after planning", async () => {
    const { applyPlan } = await import("../scripts/item-scaffold.ts");
    const root = temp();
    const plan = planNew(root, { name: "pricing-card", category: "components" }, nodeIo);
    writeFileSync(join(root, "src/index.ts"), `${readTemp(root, "src/index.ts")}\n`);
    const before = hashTree(root);
    expect(() => applyPlan(root, plan, nodeIo)).toThrow(/src\/index\.ts changed after planning; nothing was changed/);
    expect(hashTree(root)).toEqual(before);
  });
});

describe("npm run remove (D12)", () => {
  it.each(CASES)("reverses new -- $name byte for byte", ({ name, category }) => {
    const root = temp();
    const before = hashTree(root);
    expect(runNew([name, "--category", category], root).code).toBe(0);
    const removed = runRemove([name], root);
    expect(removed.err).toBe("");
    expect(removed.code).toBe(0);
    expect(removed.out).toContain(`Removed ${name}.`);
    expect(hashTree(root)).toEqual(before);
  });

  it.each([
    ["badge", /"badge" shipped in 1\.0\.0: removing it is a breaking change/],
    ["nope", /unknown item "nope"/],
  ])("refuses %s and writes nothing", (name, message) => {
    const root = temp();
    const before = hashTree(root);
    const result = runRemove([name], root);
    expect(result.code).toBe(1);
    expect(result.err).toMatch(message);
    expect(hashTree(root)).toEqual(before);
  });

  it("aborts while another file still uses the item", () => {
    const root = temp();
    expect(runNew(["pricing-card", "--category", "components"], root).code).toBe(0);
    writeFileSync(join(root, "test/extra.test.tsx"), 'import { PricingCard } from "../src/index";\nexport const used = PricingCard;\n');
    writeFileSync(join(root, "test/extra-path.test.ts"), 'export const mod = import("../src/components/pricing-card");\n');
    const before = hashTree(root);
    const result = runRemove(["pricing-card"], root);
    expect(result.code).toBe(1);
    expect(result.err).toContain("PricingCard is still used after the planned edits");
    expect(result.err).toContain("test/extra.test.tsx (PricingCard)");
    expect(result.err).toContain("test/extra-path.test.ts (../src/components/pricing-card)");
    expect(hashTree(root)).toEqual(before);
  });

  it("removes every fixture that covers only the item, and aborts on a mixed one", () => {
    const root = temp();
    const original = hashTree(root);
    expect(runNew(["pricing-card", "--category", "components"], root).code).toBe(0);
    const fixturesPath = join(root, "test/fixtures.tsx");
    const generated = readFileSync(fixturesPath, "utf8");
    const anchor = '    name: "PricingCard",';
    const second = '  {\n    name: "PricingCard small",\n    covers: ["PricingCard"],\n    element: (ref) => <PricingCard ref={asRef<HTMLDivElement>(ref)} size="sm" />,\n  },\n';
    const at = generated.lastIndexOf("  {\n", generated.indexOf(anchor));
    writeFileSync(fixturesPath, generated.slice(0, at) + second + generated.slice(at));
    expect(runRemove(["pricing-card"], root).code).toBe(0);
    expect(hashTree(root)).toEqual(original);

    expect(runNew(["pricing-card", "--category", "components"], root).code).toBe(0);
    const mixed = second.replace('covers: ["PricingCard"]', 'covers: ["PricingCard", "Badge"]');
    const text = readFileSync(fixturesPath, "utf8");
    const pos = text.lastIndexOf("  {\n", text.indexOf(anchor));
    writeFileSync(fixturesPath, text.slice(0, pos) + mixed + text.slice(pos));
    const before = hashTree(root);
    const result = runRemove(["pricing-card"], root);
    expect(result.code).toBe(1);
    expect(result.err).toContain('the "PricingCard small" fixture in test/fixtures.tsx also covers Badge');
    expect(hashTree(root)).toEqual(before);
  });

  it("--dry-run writes nothing", () => {
    const root = temp();
    expect(runNew(["plasma", "--category", "backgrounds"], root).code).toBe(0);
    const before = hashTree(root);
    const result = runRemove(["plasma", "--dry-run"], root);
    expect(result.code).toBe(0);
    expect(result.out).toContain("delete  src/backgrounds/plasma.tsx");
    expect(result.out).toContain("Dry run: nothing was written.");
    expect(hashTree(root)).toEqual(before);
  });

  // About 3.5 s on its own (13 full remove runs over temp repos), so the 5 s default is too tight
  // under coverage while other suites run in parallel.
  it("rolls back every partial remove to the scaffolded state", { timeout: 30_000 }, () => {
    const probe = temp();
    expect(runNew(["glitch-text", "--category", "text"], probe).code).toBe(0);
    const counting = faultyIo(0);
    expect(runRemove(["glitch-text"], probe, { io: counting }).code).toBe(0);
    const total = counting.calls();
    expect(total).toBe(13); // 5 updates x (write + rename) + 3 deletes

    const root = temp();
    expect(runNew(["glitch-text", "--category", "text"], root).code).toBe(0);
    const scaffolded = hashTree(root);
    for (let n = 1; n <= total; n++) {
      const result = runRemove(["glitch-text"], root, { io: faultyIo(n) });
      expect(result.code, `failAt ${n}`).toBe(1);
      expect(result.err, `failAt ${n}`).toMatch(/rolled back \d+ change\(s\); nothing was changed/);
      expect(hashTree(root), `failAt ${n}`).toEqual(scaffolded);
    }
  });
});

describe("the real repo", () => {
  afterAll(() => {
    // Also checked once more after every other suite in this file ran.
    for (const file of GUARDED) expect(sha(file), file).toBe(guard[file]);
  });

  it("is never written by these tests", () => {
    for (const file of GUARDED) expect(sha(file), file).toBe(guard[file]);
  });
});
