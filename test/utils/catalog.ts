// Catalog drift checks (design 5.3, 10.2). Pure functions over one repo tree: each returns failure
// messages, so test/entries.test.ts runs them on the real tree and the scaffolder tests run them on
// temp copies after `npm run new` and `npm run remove`.
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { RegistryMeta } from "../../dashboard/src/registry/types";
import { CATEGORIES, type Entry } from "../../scripts/entries.ts";
import { buildExports } from "../../scripts/sync-exports.ts";

export interface CatalogInput {
  /** Repo root the entry files and registry items are resolved against. */
  root: string;
  entries: readonly Entry[];
  meta: readonly Pick<RegistryMeta, "slug" | "title" | "category" | "exports">[];
  /** package.json "exports". */
  pkgExports: unknown;
  /** Text of src/index.ts. */
  indexSource: string;
}

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The barrel specifier of an entry: "src/components/button.tsx" -> "./components/button". */
export function barrelSpecifier(entry: Pick<Entry, "file">): string {
  return `./${entry.file.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;
}

/** Every entry file exists, its basename is the entry name, and the name is kebab-case. */
export function entryFileFailures({ root, entries }: CatalogInput): string[] {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!existsSync(join(root, entry.file))) failures.push(`${entry.name}: missing ${entry.file}`);
    if (basename(entry.file, extname(entry.file)) !== entry.name) {
      failures.push(`${entry.name}: file basename of ${entry.file} is not the name`);
    }
    if (!NAME.test(entry.name)) failures.push(`${entry.name}: name is not kebab-case`);
  }
  return failures;
}

export function uniqueNameFailures({ entries }: CatalogInput): string[] {
  const seen = new Set<string>();
  const failures: string[] = [];
  for (const { name } of entries) {
    if (seen.has(name)) failures.push(`${name}: duplicate entry name`);
    seen.add(name);
  }
  return failures;
}

/** Ordered by category (CATEGORIES order), then alphabetically by name. */
export function orderFailures({ entries }: CatalogInput): string[] {
  const sorted = [...entries].sort(
    (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name),
  );
  const actual = entries.map((e) => e.name).join(",");
  const expected = sorted.map((e) => e.name).join(",");
  return actual === expected ? [] : [`ENTRIES order is not category-then-name: expected ${expected}`];
}

/** package.json exports equals buildExports(entries), key order included (run npm run sync:exports). */
export function exportsFailures({ entries, pkgExports }: CatalogInput): string[] {
  const failures: string[] = [];
  if (JSON.stringify(pkgExports) !== JSON.stringify(buildExports(entries))) {
    failures.push("package.json exports differs from buildExports(ENTRIES) (run npm run sync:exports)");
  }
  const keys = Object.keys(buildExports(entries)).join(",");
  const expected = [".", ...entries.map((e) => `./${e.name}`), "./theme.css", "./themes.css", "./styles.css", "./package.json"].join(",");
  if (keys !== expected) failures.push(`buildExports key order is ${keys}`);
  return failures;
}

/** src/index.ts has exactly one `export * from "<spec>";` line per entry. */
export function barrelFailures({ entries, indexSource }: CatalogInput): string[] {
  const lines = indexSource.split("\n").map((line) => line.trim());
  const failures: string[] = [];
  for (const entry of entries) {
    const line = `export * from "${barrelSpecifier(entry)}";`;
    const count = lines.filter((l) => l === line).length;
    if (count !== 1) failures.push(`${entry.name}: src/index.ts has ${count} copies of ${line}`);
  }
  return failures;
}

/** Every docs entry has a meta row, in ENTRIES order. */
export function metaOrderFailures({ entries, meta }: CatalogInput): string[] {
  const actual = meta.map((m) => m.slug).join(",");
  const expected = entries
    .filter((e) => e.docs)
    .map((e) => e.name)
    .join(",");
  return actual === expected ? [] : [`registryMeta slugs ${actual} do not equal the docs entries ${expected}`];
}

/** Every meta row matches its entry's title and category, and lists at least one export. */
export function metaMatchFailures({ entries, meta }: CatalogInput): string[] {
  const failures: string[] = [];
  for (const row of meta) {
    const entry = entries.find((e) => e.docs && e.name === row.slug);
    if (!entry) {
      failures.push(`${row.slug}: meta row has no docs entry`);
      continue;
    }
    if (row.title !== entry.title) failures.push(`${row.slug}: meta title ${row.title} is not ${entry.title}`);
    if (row.category !== entry.category) failures.push(`${row.slug}: meta category ${row.category} is not ${entry.category}`);
    if (row.exports.length === 0) failures.push(`${row.slug}: meta exports is empty`);
  }
  return failures;
}

/** Every meta row has a dashboard/src/registry/items/<slug>.tsx module. */
export function itemFileFailures({ root, meta }: CatalogInput): string[] {
  return meta
    .filter((row) => !existsSync(join(root, "dashboard/src/registry/items", `${row.slug}.tsx`)))
    .map((row) => `${row.slug}: missing dashboard/src/registry/items/${row.slug}.tsx`);
}

/** Every check above. */
export function catalogFailures(input: CatalogInput): string[] {
  return [
    ...entryFileFailures(input),
    ...uniqueNameFailures(input),
    ...orderFailures(input),
    ...exportsFailures(input),
    ...barrelFailures(input),
    ...metaOrderFailures(input),
    ...metaMatchFailures(input),
    ...itemFileFailures(input),
  ];
}
