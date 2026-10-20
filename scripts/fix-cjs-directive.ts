// Moves "use client"; to the very front of client .cjs files (design 5.1).
// tsup/sucrase put "use strict"; and interop helpers before the banner, outside the directive prologue.
// Idempotent; any failed assertion is fatal (prints file + rule, exits 1).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USE_CLIENT = '"use client";';
const USE_STRICT = '"use strict";';
const FIXED = USE_CLIENT + USE_STRICT;
const SERVER_SAFE = new Set(["cn.cjs", "motion-presets.cjs", "theme-builder.cjs", "theme-script.cjs"]);

export type FixResult = { status: "unchanged" | "fixed"; source: string } | { status: "error"; rule: string };

/** Pure transform of one client .cjs file's text. */
export function fixDirective(source: string): FixResult {
  if (source.startsWith(FIXED)) return { status: "unchanged", source };
  if (!source.startsWith(USE_STRICT)) return { status: "error", rule: 'file must start with "use strict";' };
  const index = source.indexOf(USE_CLIENT, 1);
  if (index === -1) return { status: "error", rule: 'no "use client"; banner found' };
  const lineEnd = source.indexOf("\n");
  if (lineEnd !== -1 && index > lineEnd) return { status: "error", rule: '"use client"; banner is not on line 1' };
  const without = source.slice(0, index) + source.slice(index + USE_CLIENT.length);
  return { status: "fixed", source: USE_CLIENT + without };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dist = join(root, "dist");
  let fixed = 0;
  let failed = false;
  for (const file of readdirSync(dist)) {
    if (!file.endsWith(".cjs") || SERVER_SAFE.has(file)) continue;
    const path = join(dist, file);
    const result = fixDirective(readFileSync(path, "utf8"));
    if (result.status === "error") {
      console.error(`fix-cjs-directive: dist/${file}: ${result.rule}`);
      failed = true;
    } else if (result.status === "fixed") {
      writeFileSync(path, result.source);
      fixed++;
    }
  }
  if (failed) process.exit(1);
  console.log(`fix-cjs-directive: ${fixed} file(s) fixed`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
