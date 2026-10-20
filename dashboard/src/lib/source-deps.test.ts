import { describe, expect, it } from "vitest";
import { collectSources, extractImports, resolveRelative, resolveSourceDeps } from "./source-deps";
import { loadItemSources, sourcePaths } from "./sources";

const files = new Map<string, string>([
  [
    "src/components/button.tsx",
    `"use client";
import { motion } from "motion/react";
import * as React from "react";
import {
  buttonBase,
  buttonSizes,
} from "../lib/button-styles";
import { cn } from "../lib/cn";
import type { Tone } from "../lib/types";
export * from "./spinner";`,
  ],
  ["src/components/spinner.tsx", `import { cn } from "../lib/cn";\nimport { blockReset } from "../lib/styles";`],
  ["src/lib/button-styles.ts", `import { focusRing } from "./styles";`],
  ["src/lib/cn.ts", `import { clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";`],
  ["src/lib/styles.ts", `import type { Size } from "./types";`],
  ["src/lib/types.ts", `export type Size = "sm";`],
]);

describe("source-deps", () => {
  it("extracts import, export-from and type-only specifiers", () => {
    expect(extractImports(files.get("src/components/button.tsx") ?? "")).toEqual([
      "motion/react",
      "react",
      "../lib/button-styles",
      "../lib/cn",
      "../lib/types",
      "./spinner",
    ]);
    expect(extractImports(`import "./side-effect";`)).toEqual(["./side-effect"]);
  });

  it("resolves extensionless relative paths", () => {
    expect(resolveRelative("src/components/button.tsx", "../lib/cn", files)).toBe("src/lib/cn.ts");
    expect(resolveRelative("src/components/button.tsx", "./spinner", files)).toBe("src/components/spinner.tsx");
    expect(resolveRelative("src/components/button.tsx", "react", files)).toBeNull();
    expect(resolveRelative("src/components/button.tsx", "./missing", files)).toBeNull();
  });

  it("collects transitive files breadth-first and maps npm packages", () => {
    expect(resolveSourceDeps("src/components/button.tsx", files)).toEqual({
      files: [
        "src/lib/button-styles.ts",
        "src/lib/cn.ts",
        "src/lib/types.ts",
        "src/components/spinner.tsx",
        "src/lib/styles.ts",
      ],
      npm: ["motion", "clsx", "tailwind-merge"],
    });
    expect(resolveSourceDeps("src/lib/types.ts", files)).toEqual({ files: [], npm: [] });
  });

  it("loads a closure through a loader", async () => {
    const loaded = await collectSources("src/components/spinner.tsx", new Set(files.keys()), (path) =>
      Promise.resolve(files.get(path) ?? ""),
    );
    expect([...loaded.keys()].sort()).toEqual(["src/components/spinner.tsx", "src/lib/cn.ts", "src/lib/styles.ts", "src/lib/types.ts"]);
  });

  it("reads the real library through the raw glob", async () => {
    expect(sourcePaths.has("src/components/button.tsx")).toBe(true);
    const result = await loadItemSources("src/lib/cn.ts");
    expect(result.ordered[0]?.path).toBe("src/lib/cn.ts");
    expect(result.ordered[0]?.source).toContain("twMerge");
    expect(result.npm).toEqual(["clsx", "tailwind-merge"]);
    const button = await loadItemSources("src/components/button.tsx");
    expect(button.files).toContain("src/lib/cn.ts");
    expect(button.npm).toContain("motion");
  });
});
