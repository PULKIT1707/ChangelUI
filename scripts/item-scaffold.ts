// Planning and atomic apply for `npm run new` and `npm run remove` (scripts/new-item.ts,
// scripts/remove-item.ts). Everything is computed in memory first; applyPlan then writes each file
// through a temp file + rename and undoes every applied change if any step fails.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, normalize, relative } from "node:path";
import {
  exportedNames,
  FILES,
  identifierNames,
  moduleSpecifiers,
  parseBarrel,
  parseEntries,
  parseFixtures,
  parseMeta,
  parseSource,
  ScaffoldError,
  splice,
  type BarrelSource,
  type Edit,
  type EntriesSource,
  type FixturesSource,
  type LineRange,
  type MetaSource,
  type ReadIo,
} from "./catalog-source.ts";
import { CATEGORIES, type Category, type Entry } from "./entries.ts";
import {
  barrelLine,
  deriveNames,
  entryRow,
  fixtureBlock,
  hookProbeLine,
  importSpecifierLine,
  metaBlock,
  registryItemFile,
  sourceFile,
  TEMPLATE_IDENTIFIERS,
  testFile,
  type ItemNames,
} from "./item-templates.ts";
import { RELEASED_NAMES } from "./released-entries.ts";
import { renderPackageJson } from "./sync-exports.ts";

export { ScaffoldError };

/** All file-system access, injectable for temp-dir tests and fault injection. */
export interface Io extends ReadIo {
  writeFile(path: string, text: string): void;
  rename(from: string, to: string): void;
  unlink(path: string): void;
  mkdir(path: string): void;
  rmdir(path: string): void;
}

export const nodeIo: Io = {
  readFile: (path) => readFileSync(path, "utf8"),
  exists: (path) => existsSync(path),
  isDirectory: (path) => existsSync(path) && statSync(path).isDirectory(),
  readdir: (path) => readdirSync(path),
  writeFile: (path, text) => writeFileSync(path, text),
  rename: (from, to) => renameSync(from, to),
  unlink: (path) => unlinkSync(path),
  mkdir: (path) => mkdirSync(path),
  rmdir: (path) => rmdirSync(path),
};

export interface FileChange {
  /** Repo-relative, forward slashes. */
  path: string;
  kind: "create" | "update" | "delete";
  /** The text the change was planned from (update, delete). */
  before?: string;
  /** The text to write (create, update). */
  after?: string;
  /** Lines added and removed, for the printed plan (update). */
  added?: string[];
  removed?: string[];
}

export interface Plan {
  summary: string;
  changes: FileChange[];
}

// ---------------------------------------------------------------------------------------------
// Catalog snapshot

interface Catalog {
  entries: EntriesSource;
  barrel: BarrelSource;
  meta: MetaSource;
  fixtures: FixturesSource;
  packageJson: string;
}

/** Reads and parses every file a scaffold edits; throws ScaffoldError before anything is written. */
function loadCatalog(root: string, io: Io): Catalog {
  const read = (file: string): string => {
    const path = join(root, file);
    if (!io.exists(path)) throw new ScaffoldError(`cannot find ${file}`);
    return io.readFile(path);
  };
  return {
    entries: parseEntries(read(FILES.entries)),
    barrel: parseBarrel(read(FILES.barrel)),
    meta: parseMeta(read(FILES.meta)),
    fixtures: parseFixtures(read(FILES.fixtures)),
    packageJson: read(FILES.packageJson),
  };
}

const entryList = (catalog: Catalog): Entry[] => catalog.entries.elements.map((el) => el.entry);

function compareEntries(a: Entry, b: Entry): number {
  return CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name);
}

/** "src/components/button.tsx" -> "./components/button" (the src/index.ts specifier). */
function barrelSpecifier(entry: Pick<Entry, "file">): string {
  return `./${entry.file.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;
}

/** Meta exports of an existing entry ([] when it has no meta row). */
function metaExports(catalog: Catalog, name: string): string[] {
  return catalog.meta.elements.find((m) => m.slug === name)?.exports ?? [];
}

// ---------------------------------------------------------------------------------------------
// Validation (D7)

export const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const HOOK_PATTERN = /^use(-[a-z][a-z0-9]*)+$/;
/** Names that would clash with package files, dist files or build chunks. */
export const RESERVED_NAMES: ReadonlySet<string> = new Set([
  "index",
  "package",
  "theme",
  "styles",
  "dist",
  "src",
  "lib",
  "test",
  "docs",
  "react",
  "chunk",
]);

const isSource = (file: string): boolean => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts");

/** Every public identifier the root barrel already exposes, mapped to the file that exports it. */
function publicNames(root: string, io: Io, catalog: Catalog): Map<string, string> {
  const owners = new Map<string, string>();
  const files = new Set<string>();
  for (const spec of catalog.barrel.starSpecs) {
    const base = `src/${spec.replace(/^\.\//, "")}`;
    const file = [`${base}.ts`, `${base}.tsx`].find((f) => io.exists(join(root, f)));
    if (file) files.add(file);
  }
  for (const entry of entryList(catalog)) files.add(entry.file);
  for (const file of files) {
    const path = join(root, file);
    if (!io.exists(path)) continue;
    for (const name of exportedNames(file, io.readFile(path))) if (!owners.has(name)) owners.set(name, file);
  }
  for (const row of catalog.meta.elements) {
    for (const name of row.exports) if (!owners.has(name)) owners.set(name, `the ${row.slug} meta row`);
  }
  return owners;
}

/** Checks the name and category against D7; returns the derived names. */
export function validateNew(root: string, name: string, category: string, io: Io = nodeIo, catalog = loadCatalog(root, io)): ItemNames {
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new ScaffoldError(`unknown category "${category}": use one of ${CATEGORIES.join(", ")}`);
  }
  const cat = category as Category;
  if (!NAME_PATTERN.test(name) || name.length < 2 || name.length > 40) {
    throw new ScaffoldError(
      `"${name}" is not a valid name: use kebab-case (lowercase letters, digits, single dashes), 2-40 characters, starting with a letter, e.g. pricing-card`,
    );
  }
  if (cat === "hooks" && !HOOK_PATTERN.test(name)) {
    throw new ScaffoldError(`hooks are named use-<words>, e.g. use-dark-mode (exported as useDarkMode); got "${name}"`);
  }
  if (cat !== "hooks" && (name === "use" || name.startsWith("use-"))) {
    throw new ScaffoldError(`only hooks may start with "use-" (React treats useX as a hook): rename it or pass --category hooks`);
  }
  if (RESERVED_NAMES.has(name) || name.startsWith("chunk-")) {
    throw new ScaffoldError(`"${name}" is reserved: it would clash with a package file, a dist file or a build chunk`);
  }
  const libDir = join(root, "src/lib");
  const lib = io.isDirectory(libDir) ? io.readdir(libDir).filter(isSource) : [];
  const libFile = lib.find((file) => file.replace(/\.tsx?$/, "") === name);
  if (libFile) throw new ScaffoldError(`"${name}" is the name of an internal module (src/lib/${libFile}): pick another name`);
  const existing = entryList(catalog).find((e) => e.name === name);
  if (existing) throw new ScaffoldError(`"${name}" already exists (${existing.file})`);

  const names = deriveNames(name, cat);
  const taken = [
    ...CATEGORIES.flatMap((c) => [`src/${c}/${name}.ts`, `src/${c}/${name}.tsx`]),
    `test/${cat}/${name}.test.tsx`,
    `test/${cat}/${name}.test.ts`,
    names.itemFile,
  ].find((file) => io.exists(join(root, file)));
  if (taken) throw new ScaffoldError(`${taken} already exists: delete it or pick another name`);

  const owners = publicNames(root, io, catalog);
  for (const id of names.identifiers) {
    const owner = owners.get(id);
    if (owner) throw new ScaffoldError(`${id} is already exported by ${owner}: pick another name`);
    if (TEMPLATE_IDENTIFIERS.has(id)) throw new ScaffoldError(`${id} clashes with a name the generated files use: pick another name`);
  }
  return names;
}

// ---------------------------------------------------------------------------------------------
// Placement (D4)

interface Neighbors {
  /** Same category, nearest first. */
  successors: Entry[];
  predecessors: Entry[];
  /** Other categories, nearest first. */
  otherBefore: Entry[];
  otherAfter: Entry[];
}

function neighbors(entries: readonly Entry[], entry: Entry): Neighbors {
  const sorted = [...entries.filter((e) => e.name !== entry.name), entry].sort(compareEntries);
  const index = sorted.indexOf(entry);
  const after = sorted.slice(index + 1);
  const before = sorted.slice(0, index).reverse();
  return {
    successors: after.filter((e) => e.category === entry.category),
    predecessors: before.filter((e) => e.category === entry.category),
    otherBefore: before.filter((e) => e.category !== entry.category),
    otherAfter: after.filter((e) => e.category !== entry.category),
  };
}

interface Point {
  offset: number;
  indent: string;
}

function after(range: LineRange, file: string, needsComma: boolean): Point {
  if (needsComma && range.trailing !== ",") {
    throw new ScaffoldError(`cannot insert into ${file}: the element before the insert point has no trailing comma`);
  }
  return { offset: range.end, indent: range.indent };
}

/** Before the nearest same-category successor, else after the nearest predecessor (D4). */
function rowPoint(nb: Neighbors, rangeOf: (e: Entry) => LineRange | undefined, file: string, needsComma: boolean): Point {
  for (const e of nb.successors) {
    const r = rangeOf(e);
    if (r) return { offset: r.start, indent: r.indent };
  }
  for (const e of [...nb.predecessors, ...nb.otherBefore]) {
    const r = rangeOf(e);
    if (r) return after(r, file, needsComma);
  }
  for (const e of nb.otherAfter) {
    const r = rangeOf(e);
    if (r) return { offset: r.start, indent: r.indent };
  }
  throw new ScaffoldError(`cannot find where to insert into ${file}`);
}

function addedLines(insert: string): string[] {
  return insert.replace(/\n$/, "").split("\n");
}

/** Line diff for a single contiguous change (package.json exports). */
function contiguousDiff(before: string, afterText: string): { added: string[]; removed: string[] } {
  const a = before.split("\n");
  const b = afterText.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { added: b.slice(start, endB), removed: a.slice(start, endA) };
}

function update(path: string, before: string, edits: Edit[]): FileChange {
  const afterText = splice(before, edits);
  const added = edits.flatMap((e) => (e.insert ? addedLines(e.insert) : []));
  const removed = edits.flatMap((e) => (e.end > e.start ? addedLines(before.slice(e.start, e.end)) : []));
  return { path, kind: "update", before, after: afterText, added, removed };
}

function packageUpdate(before: string, entries: readonly Entry[]): FileChange {
  const afterText = renderPackageJson(before, entries);
  return { path: FILES.packageJson, kind: "update", before, after: afterText, ...contiguousDiff(before, afterText) };
}

// ---------------------------------------------------------------------------------------------
// npm run new

export function planNew(root: string, request: { name: string; category: string }, io: Io = nodeIo): Plan {
  const catalog = loadCatalog(root, io);
  const n = validateNew(root, request.name, request.category, io, catalog);
  const entry: Entry = { name: n.name, title: n.title, category: n.category, file: n.file, client: true, docs: true };
  const entries = entryList(catalog);
  const nb = neighbors(entries, entry);

  // scripts/entries.ts
  const entryAt = rowPoint(nb, (e) => catalog.entries.elements.find((el) => el.entry.name === e.name)?.range, FILES.entries, true);
  const entriesChange = update(FILES.entries, catalog.entries.text, [
    { start: entryAt.offset, end: entryAt.offset, insert: entryRow(n, entryAt.indent) },
  ]);
  const nextEntries = parseEntries(entriesChange.after ?? "").elements.map((el) => el.entry);

  // src/index.ts
  const barrelAt = rowPoint(
    nb,
    (e) => catalog.barrel.lines.find((line) => line.spec === barrelSpecifier(e))?.range,
    FILES.barrel,
    false,
  );
  const barrelChange = update(FILES.barrel, catalog.barrel.text, [
    { start: barrelAt.offset, end: barrelAt.offset, insert: barrelLine(n, barrelAt.indent) },
  ]);

  // dashboard/src/registry/meta.ts
  const metaAt = rowPoint(nb, (e) => catalog.meta.elements.find((m) => m.slug === e.name)?.range, FILES.meta, true);
  const metaChange = update(FILES.meta, catalog.meta.text, [
    { start: metaAt.offset, end: metaAt.offset, insert: metaBlock(n, metaAt.indent) },
  ]);

  // test/fixtures.tsx: the import specifier, then a fixture (or a hook probe)
  const fx = catalog.fixtures;
  const specifierOf = (e: Entry, last: boolean) => {
    const exports = metaExports(catalog, e.name);
    const hits = fx.imports.filter((spec) => exports.includes(spec.name));
    return last ? hits.at(-1)?.range : hits[0]?.range;
  };
  let importAt: Point | undefined;
  for (const e of nb.successors) {
    const r = specifierOf(e, false);
    if (r) {
      importAt = { offset: r.start, indent: r.indent };
      break;
    }
  }
  if (!importAt) {
    for (const e of nb.predecessors) {
      const r = specifierOf(e, true);
      if (r) {
        importAt = after(r, FILES.fixtures, true);
        break;
      }
    }
  }
  importAt ??= { offset: fx.importClose.offset, indent: fx.importClose.indent };
  const edits: Edit[] = [{ start: importAt.offset, end: importAt.offset, insert: importSpecifierLine(n, importAt.indent) }];

  if (n.category === "hooks") {
    const next = fx.hookProbes.find((probe) => probe.name.localeCompare(n.title) > 0);
    const last = fx.hookProbes.at(-1);
    const at: Point = next
      ? { offset: next.range.start, indent: next.range.indent }
      : last
        ? after(last.range, FILES.fixtures, true)
        : { offset: fx.hookProbesClose.offset, indent: fx.hookProbesClose.indent };
    edits.push({ start: at.offset, end: at.offset, insert: hookProbeLine(n, at.indent) });
  } else {
    const meets = (covers: string[], exports: string[]) => covers.some((c) => exports.includes(c));
    // After the predecessor's last fixture, else before the successor's first (same category first).
    const afterLast = (list: readonly Entry[]): Point | undefined => {
      for (const e of list) {
        const exports = metaExports(catalog, e.name);
        const hit = fx.fixtures.filter((f) => meets(f.covers, exports)).at(-1);
        if (hit) return after(hit.range, FILES.fixtures, true);
      }
      return undefined;
    };
    const beforeFirst = (list: readonly Entry[]): Point | undefined => {
      for (const e of list) {
        const exports = metaExports(catalog, e.name);
        const hit = fx.fixtures.find((f) => meets(f.covers, exports));
        if (hit) return { offset: hit.range.start, indent: hit.range.indent };
      }
      return undefined;
    };
    let at = afterLast(nb.predecessors) ?? beforeFirst(nb.successors) ?? afterLast(nb.otherBefore) ?? beforeFirst(nb.otherAfter);
    if (!at) {
      const last = fx.fixtures.at(-1);
      at = last ? after(last.range, FILES.fixtures, true) : { offset: fx.fixturesClose.offset, indent: fx.fixturesClose.indent };
    }
    edits.push({ start: at.offset, end: at.offset, insert: fixtureBlock(n, at.indent) });
  }
  const fixturesChange = update(FILES.fixtures, fx.text, edits);

  return {
    summary: `${n.title} (${n.category}): 3 new files, 5 updated`,
    changes: [
      { path: n.file, kind: "create", after: sourceFile(n) },
      { path: n.testFile, kind: "create", after: testFile(n) },
      { path: n.itemFile, kind: "create", after: registryItemFile(n) },
      entriesChange,
      barrelChange,
      fixturesChange,
      packageUpdate(catalog.packageJson, nextEntries),
      // Last: the dashboard only lists the item once its module and export exist.
      metaChange,
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// npm run remove (D12)

const SCAN_DIRS = ["src", "test", "dashboard/src", "e2e", "scripts"];
const SCAN_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

function walk(root: string, dir: string, io: Io): string[] {
  const abs = join(root, dir);
  if (!io.isDirectory(abs)) return [];
  return io
    .readdir(abs)
    .sort()
    .flatMap((name) => {
      if (name.startsWith(".") || name === "node_modules" || name === "dist") return [];
      const rel = `${dir}/${name}`;
      if (io.isDirectory(join(root, rel))) return walk(root, rel, io);
      return SCAN_FILE.test(name) ? [rel] : [];
    });
}

/** Files that would still use the item after the planned edits (identifiers or module paths). */
function remainingReferences(
  root: string,
  io: Io,
  entry: Entry,
  exports: ReadonlySet<string>,
  changes: readonly FileChange[],
): string[] {
  const deleted = new Set(changes.filter((c) => c.kind === "delete").map((c) => c.path));
  const updated = new Map(changes.filter((c) => c.kind === "update").map((c) => [c.path, c.after ?? ""]));
  const modulePath = entry.file.replace(/\.tsx?$/, "");
  const hits: string[] = [];
  for (const file of SCAN_DIRS.flatMap((dir) => walk(root, dir, io))) {
    if (deleted.has(file)) continue;
    const sf = parseSource(file, updated.get(file) ?? io.readFile(join(root, file)));
    const used = [...identifierNames(sf)].filter((id) => exports.has(id));
    const paths = moduleSpecifiers(sf).filter((spec) => {
      if (spec === `changelui/${entry.name}`) return true;
      if (spec.replace(/\.(ts|tsx|js)$/, "") === `@pui-src/${modulePath.replace(/^src\//, "")}`) return true;
      if (!spec.startsWith(".")) return false;
      const resolved = normalize(join(dirname(file), spec)).split("\\").join("/");
      return resolved.replace(/\.(ts|tsx|js)$/, "") === modulePath;
    });
    if (used.length > 0 || paths.length > 0) hits.push(`${file} (${[...new Set([...used, ...paths])].join(", ")})`);
  }
  return hits;
}

export function planRemove(root: string, name: string, io: Io = nodeIo): Plan {
  const catalog = loadCatalog(root, io);
  const element = catalog.entries.elements.find((el) => el.entry.name === name);
  if (RELEASED_NAMES.includes(name)) {
    throw new ScaffoldError(
      `"${name}" shipped in 1.0.0: removing it is a breaking change, so remove it by hand (and note it in CHANGELOG.md)`,
    );
  }
  if (!element) throw new ScaffoldError(`unknown item "${name}": it is not in ${FILES.entries}`);
  const entry = element.entry;
  const sourcePath = join(root, entry.file);
  const exports = new Set([
    ...metaExports(catalog, name),
    ...(io.exists(sourcePath) ? exportedNames(entry.file, io.readFile(sourcePath)) : []),
  ]);

  const drop = (range: LineRange): Edit => ({ start: range.start, end: range.end, insert: "" });
  const entriesChange = update(FILES.entries, catalog.entries.text, [drop(element.range)]);
  const nextEntries = parseEntries(entriesChange.after ?? "").elements.map((el) => el.entry);

  const changes: FileChange[] = [];
  const metaRow = catalog.meta.elements.find((m) => m.slug === name);
  if (metaRow) changes.push(update(FILES.meta, catalog.meta.text, [drop(metaRow.range)]));
  changes.push(entriesChange);
  const line = catalog.barrel.lines.find((l) => l.spec === barrelSpecifier(entry));
  if (line) changes.push(update(FILES.barrel, catalog.barrel.text, [drop(line.range)]));

  const fx = catalog.fixtures;
  const fixtureEdits: Edit[] = [];
  for (const fixture of fx.fixtures) {
    const mine = fixture.covers.filter((c) => exports.has(c));
    if (mine.length === 0) continue;
    if (mine.length !== fixture.covers.length) {
      const others = fixture.covers.filter((c) => !exports.has(c));
      throw new ScaffoldError(
        `the "${fixture.name}" fixture in ${FILES.fixtures} also covers ${others.join(", ")}: edit it by hand, then run remove again`,
      );
    }
    fixtureEdits.push(drop(fixture.range));
  }
  for (const spec of fx.imports) if (exports.has(spec.name)) fixtureEdits.push(drop(spec.range));
  for (const probe of fx.hookProbes) if (exports.has(probe.name)) fixtureEdits.push(drop(probe.range));
  if (fixtureEdits.length > 0) changes.push(update(FILES.fixtures, fx.text, fixtureEdits));
  changes.push(packageUpdate(catalog.packageJson, nextEntries));

  const n = deriveNames(name, entry.category);
  for (const file of [n.itemFile, `test/${entry.category}/${name}.test.tsx`, `test/${entry.category}/${name}.test.ts`, entry.file]) {
    const path = join(root, file);
    if (io.exists(path)) changes.push({ path: file, kind: "delete", before: io.readFile(path) });
  }

  const refs = remainingReferences(root, io, entry, exports, changes);
  if (refs.length > 0) {
    throw new ScaffoldError(
      `${entry.title} is still used after the planned edits; remove these uses first:\n${refs.map((r) => `    ${r}`).join("\n")}`,
    );
  }
  const updates = changes.filter((c) => c.kind === "update").length;
  const deletes = changes.length - updates;
  return { summary: `${entry.title} (${entry.category}): ${updates} updated, ${deletes} deleted`, changes };
}

// ---------------------------------------------------------------------------------------------
// Atomic apply (D6)

type Undo =
  | { kind: "created"; abs: string }
  | { kind: "restore"; abs: string; text: string }
  | { kind: "dir"; abs: string };

function writeAtomic(io: Io, abs: string, text: string): void {
  const tmp = join(dirname(abs), `.${basename(abs)}.${process.pid}.scaffold-tmp`);
  try {
    io.writeFile(tmp, text);
    io.rename(tmp, abs);
  } catch (error) {
    try {
      if (io.exists(tmp)) io.unlink(tmp);
    } catch {
      // reported through the original error
    }
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Writes the plan, or undoes every applied change and throws ScaffoldError. */
export function applyPlan(root: string, plan: Plan, io: Io = nodeIo): void {
  for (const change of plan.changes) {
    const abs = join(root, change.path);
    if (change.kind === "create" && io.exists(abs)) {
      throw new ScaffoldError(`${change.path} appeared after planning; nothing was changed`);
    }
    if (change.kind !== "create" && (!io.exists(abs) || io.readFile(abs) !== change.before)) {
      throw new ScaffoldError(`${change.path} changed after planning; nothing was changed`);
    }
  }
  const done: Undo[] = [];
  try {
    for (const change of plan.changes) {
      const abs = join(root, change.path);
      if (change.kind === "create") {
        const missing: string[] = [];
        for (let dir = dirname(abs); !io.exists(dir); dir = dirname(dir)) missing.unshift(dir);
        for (const dir of missing) {
          io.mkdir(dir);
          done.push({ kind: "dir", abs: dir });
        }
        writeAtomic(io, abs, change.after ?? "");
        done.push({ kind: "created", abs });
      } else if (change.kind === "update") {
        writeAtomic(io, abs, change.after ?? "");
        done.push({ kind: "restore", abs, text: change.before ?? "" });
      } else {
        io.unlink(abs);
        done.push({ kind: "restore", abs, text: change.before ?? "" });
      }
    }
  } catch (error) {
    const failed: string[] = [];
    for (const undo of [...done].reverse()) {
      try {
        if (undo.kind === "created") io.unlink(undo.abs);
        else if (undo.kind === "restore") writeAtomic(io, undo.abs, undo.text);
        else if (io.readdir(undo.abs).length === 0) io.rmdir(undo.abs);
      } catch {
        failed.push(relative(root, undo.abs));
      }
    }
    if (failed.length > 0) {
      throw new ScaffoldError(
        `${errorMessage(error)}; rollback failed for ${failed.join(", ")}: check git status and restore those files`,
      );
    }
    throw new ScaffoldError(`${errorMessage(error)}; rolled back ${done.length} change(s); nothing was changed`);
  }
}

// ---------------------------------------------------------------------------------------------
// Output

const lineCount = (text: string): number => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/** Strips the indent the lines share, keeping their relative indentation. */
function dedent(lines: readonly string[]): string[] {
  const indents = lines.filter((l) => l.trim() !== "").map((l) => /^[ \t]*/.exec(l)?.[0].length ?? 0);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(common).trimEnd());
}

export function formatPlan(plan: Plan, dryRun: boolean): string {
  const out = [plan.summary];
  for (const change of plan.changes) {
    const note = change.kind === "create" ? ` (${lineCount(change.after ?? "")} lines)` : "";
    out.push(`  ${change.kind.padEnd(6)}  ${change.path}${note}`);
    for (const line of dedent(change.removed ?? [])) out.push(`            - ${line}`);
    for (const line of dedent(change.added ?? [])) out.push(`            + ${line}`);
  }
  if (dryRun) out.push("Dry run: nothing was written.");
  return out.join("\n");
}

export function nextSteps(n: ItemNames): string {
  const steps = [
    `Edit ${n.file}: it is a working starter, make it yours.`,
    `Adjust its ${n.category === "hooks" ? "hook probe" : "fixture"} in ${FILES.fixtures} and the tests in ${n.testFile}.`,
    `Fill in the demo, controls and props table in ${n.itemFile}, and the description and keywords in ${FILES.meta}.`,
    `Preview it: npm run dev, then open http://127.0.0.1:5173/#/${n.category}/${n.name}`,
    "Check it: npm run typecheck && npm run lint && npm test && npm run build && npm run check:dist",
    "When you release it: add it to the README subpath table and CHANGELOG.md.",
  ];
  return [
    `Created ${n.title}. Next steps:`,
    ...steps.map((step, i) => `  ${i + 1}. ${step}`),
    `Undo with: npm run remove -- ${n.name}`,
  ].join("\n");
}
