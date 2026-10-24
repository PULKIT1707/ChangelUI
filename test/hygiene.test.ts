import { type Dirent, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkChartImports,
  checkClassTemplates,
  checkClassVocabulary,
  checkColorLiterals,
  checkDisplayName,
  checkEslintDisable,
  checkFile,
  checkNoD3,
  checkNoDefaultExport,
  checkPseudoBoxBorder,
  checkResets,
  checkStyleVarNames,
  checkUseClient,
  declaredCssVars,
} from "./utils/hygiene";

const root = join(import.meta.dirname, "..");
const themeVars = declaredCssVars(readFileSync(join(root, "src/styles/theme.css"), "utf8"));

const sourceFiles = (readdirSync(join(root, "src"), { recursive: true }) as string[])
  .map((f) => f.split("\\").join("/"))
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => `src/${f}`)
  .sort();

describe("hygiene over src/", () => {
  it("finds the source tree", () => {
    expect(sourceFiles).toContain("src/lib/cn.ts");
    expect(sourceFiles).toContain("src/index.ts");
  });

  it.each(sourceFiles)("%s", (file) => {
    expect(checkFile(file, readFileSync(join(root, file), "utf8"), themeVars)).toEqual([]);
  });
});

// The dashboard's analytics must never reach the published library (analytics plan, FEAT-001).
describe("no telemetry in the library", () => {
  it("no src/ file mentions posthog", () => {
    const allFiles = (readdirSync(join(root, "src"), { recursive: true, withFileTypes: true }) as Dirent[])
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name));
    expect(allFiles.length).toBeGreaterThanOrEqual(sourceFiles.length);
    const offenders = allFiles.filter((file) => /posthog/i.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("posthog-js is not a dependency or peer dependency", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<
      string,
      Record<string, string> | undefined
    >;
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("posthog-js");
    expect(Object.keys(pkg.peerDependencies ?? {})).not.toContain("posthog-js");
  });
});

// Self-tests: each check accepts a passing snippet and rejects a failing one.
describe("hygiene self-tests", () => {
  it('"use client" rule', () => {
    const hook = 'import { useState } from "react";\nexport const x = useState;';
    expect(checkUseClient("src/lib/a.ts", `"use client";\n${hook}`)).toEqual([]);
    expect(checkUseClient("src/lib/a.ts", hook)).toHaveLength(1);
    expect(checkUseClient("src/lib/a.ts", 'import { motion } from "motion/react";')).toHaveLength(1);
    expect(checkUseClient("src/lib/a.ts", 'import "react";')).toHaveLength(1);
    // type-only imports do not count
    expect(checkUseClient("src/lib/a.ts", 'import type * as React from "react";')).toEqual([]);
    expect(checkUseClient("src/lib/a.ts", 'import { type ReactNode } from "react";')).toEqual([]);
    // a value import mixed with a type specifier counts
    expect(checkUseClient("src/lib/a.ts", 'import { type ReactNode, useId } from "react";')).toHaveLength(1);
    // directory rule, and the directive must be first
    expect(checkUseClient("src/hooks/use-x.ts", "export const x = 1;")).toHaveLength(1);
    expect(checkUseClient("src/hooks/use-x.ts", 'export const x = 1;\n"use client";')).toHaveLength(1);
    expect(checkUseClient("src/hooks/use-x.ts", '"use client";\nexport const x = 1;')).toEqual([]);
    // unrelated packages whose names merely start with "react"
    expect(checkUseClient("src/lib/a.ts", 'import x from "reactive";')).toEqual([]);
    // banned in cn / theme-script
    expect(checkUseClient("src/lib/cn.ts", '"use client";\nexport {};')).toHaveLength(1);
    expect(checkUseClient("src/lib/theme-script.ts", "export {};")).toEqual([]);
  });

  it('"use client" rule for charts (charts-roadmap 2.3)', () => {
    // top-level chart entries are client files; chart-scales is server-safe
    expect(checkUseClient("src/charts/line-chart.tsx", "export const x = 1;")).toHaveLength(1);
    expect(checkUseClient("src/charts/line-chart.tsx", '"use client";\nexport const x = 1;')).toEqual([]);
    expect(checkUseClient("src/charts/chart-scales.ts", '"use client";\nexport {};')).toHaveLength(1);
    expect(checkUseClient("src/charts/chart-scales.ts", "export {};")).toEqual([]);
    // core: required iff the file value-imports react or motion
    expect(checkUseClient("src/charts/core/scale.ts", "export const x = 1;")).toEqual([]);
    expect(checkUseClient("src/charts/core/scale.ts", '"use client";\nexport const x = 1;')).toHaveLength(1);
    expect(checkUseClient("src/charts/core/store.ts", 'import { useState } from "react";\nexport const x = useState;')).toHaveLength(1);
    expect(checkUseClient("src/charts/core/store.ts", '"use client";\nimport { useState } from "react";')).toEqual([]);
    expect(checkUseClient("src/charts/core/types.ts", 'import type { ReactNode } from "react";')).toEqual([]);
  });

  it("no d3 imports under src/", () => {
    expect(checkNoD3("src/charts/core/a.ts", 'import { ticks } from "./ticks";')).toEqual([]);
    expect(checkNoD3("src/charts/core/a.ts", 'import { scaleLinear } from "d3-scale";')).toHaveLength(1);
    expect(checkNoD3("src/charts/core/a.ts", 'import * as d3 from "d3";')).toHaveLength(1);
    expect(checkNoD3("src/charts/core/a.ts", 'export { line } from "d3-shape";')).toHaveLength(1);
    expect(checkNoD3("src/charts/core/a.ts", 'const m = await import("d3-array");')).toHaveLength(1);
    expect(checkNoD3("src/charts/core/a.ts", 'type S = import("d3-hierarchy").HierarchyNode<number>;')).toHaveLength(1);
    expect(checkNoD3("src/charts/core/a.ts", 'import x from "d3fault";')).toEqual([]);
  });

  it("chart code stays dependency-free", () => {
    expect(checkChartImports("src/charts/core/a.ts", 'import { mulberry32 } from "../../lib/random";\nimport { animate } from "motion/react";\nimport { useState } from "react";')).toEqual([]);
    expect(checkChartImports("src/charts/core/a.ts", 'import { clsx } from "clsx";')).toHaveLength(1);
    expect(checkChartImports("src/charts/line-chart.tsx", 'import { x } from "some-chart-lib";')).toHaveLength(1);
    // only applies under src/charts/
    expect(checkChartImports("src/lib/cn.ts", 'import { clsx } from "clsx";')).toEqual([]);
  });

  it("no export default", () => {
    expect(checkNoDefaultExport("a.tsx", "export function A() {}")).toEqual([]);
    expect(checkNoDefaultExport("a.tsx", "export default function A() {}")).toHaveLength(1);
    expect(checkNoDefaultExport("a.tsx", "const A = 1;\nexport default A;")).toHaveLength(1);
    expect(checkNoDefaultExport("a.tsx", "const A = 1;\nexport { A as default };")).toHaveLength(1);
  });

  it("no color literals unless pui-allow-color", () => {
    expect(checkColorLiterals("a.ts", 'const c = "bg-pui-primary";')).toEqual([]);
    expect(checkColorLiterals("a.ts", 'const c = "#ff0000";')).toHaveLength(1);
    expect(checkColorLiterals("a.ts", 'const c = "rgb(0 0 0)";')).toHaveLength(1);
    expect(checkColorLiterals("a.ts", 'const c = "oklch(0.5 0.1 200)";')).toHaveLength(1);
    expect(checkColorLiterals("a.ts", 'const m = "linear-gradient(#000 0 0)"; // pui-allow-color')).toEqual([]);
  });

  it("no palette classes and no dark: variants", () => {
    expect(checkClassVocabulary("a.tsx", 'const c = "bg-pui-primary text-pui-foreground in-[.dark]:block";')).toEqual(
      [],
    );
    expect(checkClassVocabulary("a.tsx", 'const c = "bg-red-500";')).toHaveLength(1);
    expect(checkClassVocabulary("a.tsx", 'const c = "text-white";')).toHaveLength(1);
    expect(checkClassVocabulary("a.tsx", 'const c = "p-2 dark:bg-pui-muted";')).toHaveLength(1);
    expect(checkClassVocabulary("a.tsx", "const c = `hover:dark:opacity-50`;")).toHaveLength(1);
  });

  it("no template literals building class names", () => {
    expect(checkClassTemplates("a.tsx", 'const x = <div className={cn(blockReset, "p-2", a && "p-4")} />;')).toEqual(
      [],
    );
    expect(checkClassTemplates("a.tsx", "const x = <div className={cn(blockReset, `bg-pui-${tone}`)} />;")).toHaveLength(
      1,
    );
    expect(checkClassTemplates("a.tsx", "const x = <div className={`p-${n}`} />;")).toHaveLength(1);
    expect(checkClassTemplates("a.ts", "const c = cn(`text-${size}`);")).toHaveLength(1);
  });

  it("no module-level displayName", () => {
    expect(checkDisplayName("a.tsx", "export const A = forwardRef(function A() { return null; });")).toEqual([]);
    expect(checkDisplayName("a.tsx", 'A.displayName = "A";')).toHaveLength(1);
  });

  it("no inline eslint-disable", () => {
    expect(checkEslintDisable("a.ts", "const a = 1;")).toEqual([]);
    expect(checkEslintDisable("a.ts", "// eslint-disable-next-line no-console\nconsole.log(1);")).toHaveLength(1);
  });

  it("reset rule: fixed tags", () => {
    const ok = [
      "<div className={blockReset} />",
      '<div className={cn(blockReset, "p-2", className)} />',
      '<button className={cn(controlReset, "px-3")} />',
      "<ul className={listReset}><li className={blockReset} /></ul>",
      '<motion.li className={cn(blockReset, "p-1")} />',
      '<motion.button className={cn(controlReset, "p-1")} />',
      // svg root needs blockReset; internal tags are exempt
      '<svg className={cn(blockReset, "block shrink-0")}><path d="M0 0" /><g><circle r={1} /></g></svg>',
      // components are skipped
      "<Spinner /><Slot><span className={blockReset} /></Slot><Ctx.Provider value={1} />",
    ];
    for (const snippet of ok) expect(checkResets("a.tsx", `const x = <>${snippet}</>;`)).toEqual([]);

    const bad = [
      '<div className="p-2" />',
      "<div />",
      '<div className={cn("p-2", blockReset)} />',
      "<button className={blockReset} />",
      "<ul className={blockReset} />",
      '<motion.li className={cn("p-1")} />',
      '<div className={cn(blockReset, open ? controlReset : "")} />',
      '<svg className="size-4" />',
      "<span className={classes} />",
    ];
    for (const snippet of bad) expect(checkResets("a.tsx", `const x = <>${snippet}</>;`)).toHaveLength(1);
  });

  it("reset rule: dynamic tags", () => {
    const ok = [
      "<Comp className={cn(controlReset, base)} />",
      "<Tag className={blockReset} />",
      "<MotionTag className={cn(blockReset)} />",
      '<Comp className={cn((as === "ul" || as === "ol") ? listReset : blockReset, className)} />',
    ];
    for (const snippet of ok) expect(checkResets("a.tsx", `const x = <>${snippet}</>;`)).toEqual([]);

    const bad = [
      "<Comp className={cn(base)} />",
      "<Tag className={listReset} />",
      // conditional with a non-constant branch
      '<Comp className={cn(isList ? listReset : "box-border", className)} />',
      "<Comp className={cn(isList ? listReset : other, className)} />",
    ];
    for (const snippet of bad) expect(checkResets("a.tsx", `const x = <>${snippet}</>;`)).toHaveLength(1);
  });

  it("pseudo-element box-border rule", () => {
    expect(checkPseudoBoxBorder("a.tsx", 'const c = "before:absolute before:box-border before:w-12 before:border";')).toEqual(
      [],
    );
    expect(checkPseudoBoxBorder("a.tsx", 'const c = "before:absolute before:inset-0 before:content-[\'\']";')).toEqual([]);
    expect(checkPseudoBoxBorder("a.tsx", 'const c = "before:w-12";')).toHaveLength(1);
    expect(checkPseudoBoxBorder("a.tsx", "const c = `before:w-12 before:border`;")).toHaveLength(1);
    expect(checkPseudoBoxBorder("a.tsx", 'const c = <div className="after:h-px after:px-2" />;')).toHaveLength(1);
    expect(checkPseudoBoxBorder("a.tsx", "const c = `hover:before:size-4 ${x} rest`;")).toHaveLength(1);
    expect(checkPseudoBoxBorder("a.tsx", "const c = `a ${x} after:border-2`;")).toHaveLength(1);
  });

  it("per-instance CSS variables never reuse a global token name", () => {
    expect(themeVars.has("--pui-primary")).toBe(true);
    expect(
      checkStyleVarNames("a.tsx", 'const s = { "--pui-shimmer-size": "1px", ["--pui-orbit-radius"]: r };', themeVars),
    ).toEqual([]);
    expect(checkStyleVarNames("a.tsx", 'const s = { "--pui-primary": "red" };', themeVars)).toHaveLength(1);
    expect(checkStyleVarNames("a.tsx", 'el.style.setProperty("--pui-radius", "1rem");', themeVars)).toHaveLength(1);
  });
});
