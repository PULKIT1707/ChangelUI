import { defineConfig, type Options } from "tsup";
import { ENTRIES } from "./scripts/entries.ts";

// Design 5.1: two configs sharing dist/ (the build script deletes dist first, so clean is false).
const pick = (client: boolean): Record<string, string> =>
  Object.fromEntries(ENTRIES.filter((e) => e.client === client).map((e) => [e.name, e.file]));

const base: Options = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  splitting: true,
  clean: false,
  target: "es2022",
  outDir: "dist",
  tsconfig: "tsconfig.build.json",
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^motion($|\/)/, "clsx", "tailwind-merge"],
  // Never treeshake: it re-runs Rollup on the output, which can drop directives. Consumers minify.
  treeshake: false,
  minify: false,
};

export default defineConfig([
  // Client entries: every output file (chunks included) starts with the directive.
  { ...base, entry: { index: "src/index.ts", ...pick(true) }, banner: { js: '"use client";' } },
  // Server-safe entries (cn, theme-script): no directive.
  { ...base, entry: pick(false) },
]);
