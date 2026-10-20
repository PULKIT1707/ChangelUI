// Writes package.json "exports" from ENTRIES (design 5.3 / 5.4). Run: npm run sync:exports
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRIES, type Entry } from "./entries.ts";

interface ConditionalExport {
  import: { types: string; default: string };
  require: { types: string; default: string };
}

export type ExportsMap = Record<string, ConditionalExport | string>;

function entryExport(name: string): ConditionalExport {
  return {
    import: { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` },
    require: { types: `./dist/${name}.d.cts`, default: `./dist/${name}.cjs` },
  };
}

/** Pure: the exports map in design-5.3 order. */
export function buildExports(entries: readonly Entry[] = ENTRIES): ExportsMap {
  const map: ExportsMap = { ".": entryExport("index") };
  for (const entry of entries) map[`./${entry.name}`] = entryExport(entry.name);
  map["./theme.css"] = "./dist/theme.css";
  map["./themes.css"] = "./dist/themes.css";
  map["./styles.css"] = "./dist/styles.css";
  map["./package.json"] = "./package.json";
  return map;
}

/** Pure: package.json text with "exports" regenerated from `entries` (what main() writes). */
export function renderPackageJson(text: string, entries: readonly Entry[] = ENTRIES): string {
  const pkg = JSON.parse(text) as Record<string, unknown>;
  pkg.exports = buildExports(entries);
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const file = resolve(root, "package.json");
  writeFileSync(file, renderPackageJson(readFileSync(file, "utf8")));
  console.log(`sync-exports: wrote ${Object.keys(buildExports()).length} export keys`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
