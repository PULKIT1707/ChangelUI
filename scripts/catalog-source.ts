// Readers for the catalog files the item scaffolder edits (scripts/new-item.ts, scripts/remove-item.ts).
// Every reader parses with the TypeScript AST and returns elements with whole-line ranges, so edits
// are line inserts and line deletes that keep the hand-written formatting byte for byte.
import { join } from "node:path";
import ts from "typescript";
import type { Category, Entry } from "./entries.ts";

/** A user-facing failure: printed without a stack, and nothing is written. */
export class ScaffoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldError";
  }
}

/** The read side of the file system, injectable so tests can run against temp copies. */
export interface ReadIo {
  readFile(path: string): string;
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readdir(path: string): string[];
}

/** Whole lines holding one element: [start, end) from its line start through its trailing newline. */
export interface LineRange {
  start: number;
  end: number;
  /** Leading whitespace of the first line. */
  indent: string;
  /** The punctuation right after the element, if any. */
  trailing: "," | ";" | "";
}

export interface Edit {
  start: number;
  end: number;
  insert: string;
}

export const FILES = {
  entries: "scripts/entries.ts",
  barrel: "src/index.ts",
  meta: "dashboard/src/registry/meta.ts",
  fixtures: "test/fixtures.tsx",
  packageJson: "package.json",
} as const;

export function parseSource(fileName: string, text: string): ts.SourceFile {
  const kind = fileName.endsWith(".tsx") || fileName.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
}

function lineOf(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

/** The whole lines of `node`, including a trailing comma or semicolon. Throws if it shares a line. */
export function lineRange(sf: ts.SourceFile, node: ts.Node): LineRange {
  const text = sf.text;
  const nodeStart = node.getStart(sf);
  const start = text.lastIndexOf("\n", nodeStart - 1) + 1;
  const indent = text.slice(start, nodeStart);
  if (!/^[ \t]*$/.test(indent)) {
    throw new ScaffoldError(`cannot edit ${sf.fileName}:${lineOf(sf, nodeStart)}: the element does not start its own line`);
  }
  let i = node.getEnd();
  while (text[i] === " " || text[i] === "\t") i++;
  let trailing: LineRange["trailing"] = "";
  if (text[i] === "," || text[i] === ";") {
    trailing = text[i] as "," | ";";
    i++;
  }
  const lineEnd = text.indexOf("\n", i);
  const rest = text.slice(i, lineEnd === -1 ? text.length : lineEnd).trim();
  if (rest !== "" && !rest.startsWith("//")) {
    throw new ScaffoldError(`cannot edit ${sf.fileName}:${lineOf(sf, nodeStart)}: the element shares a line with other code`);
  }
  return { start, end: lineEnd === -1 ? text.length : lineEnd + 1, indent, trailing };
}

/** Applies non-overlapping edits; inserts at the same offset keep their given order. */
export function splice(text: string, edits: readonly Edit[]): string {
  const sorted = edits.map((edit, index) => ({ edit, index })).sort((a, b) => a.edit.start - b.edit.start || a.index - b.index);
  for (let k = 1; k < sorted.length; k++) {
    const prev = sorted[k - 1]?.edit;
    const next = sorted[k]?.edit;
    if (prev && next && next.start < prev.end) throw new Error(`splice: overlapping edits at ${next.start}`);
  }
  let out = text;
  for (const { edit } of [...sorted].reverse()) out = out.slice(0, edit.start) + edit.insert + out.slice(edit.end);
  return out;
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** The initializer of a top-level `const <name> = ...`. */
function findConst(sf: ts.SourceFile, name: string): ts.Expression | undefined {
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === name && decl.initializer) return unwrapExpression(decl.initializer);
    }
  }
  return undefined;
}

function findArray(sf: ts.SourceFile, name: string, file: string): ts.ArrayLiteralExpression {
  const init = findConst(sf, name);
  if (!init || !ts.isArrayLiteralExpression(init)) throw new ScaffoldError(`cannot find the ${name} array in ${file}`);
  return init;
}

function stringArray(node: ts.Expression | undefined): string[] | undefined {
  if (!node || !ts.isArrayLiteralExpression(node)) return undefined;
  const out: string[] = [];
  for (const element of node.elements) {
    if (!ts.isStringLiteralLike(element)) return undefined;
    out.push(element.text);
  }
  return out;
}

type Literal = string | boolean | string[];

/** Property name -> literal value for an object literal of string, boolean and string-array values. */
function literalObject(node: ts.ObjectLiteralExpression): Record<string, Literal> | undefined {
  const out: Record<string, Literal> = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) return undefined;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined;
    if (key === undefined) return undefined;
    const value = prop.initializer;
    if (ts.isStringLiteralLike(value)) out[key] = value.text;
    else if (value.kind === ts.SyntaxKind.TrueKeyword) out[key] = true;
    else if (value.kind === ts.SyntaxKind.FalseKeyword) out[key] = false;
    else {
      const list = stringArray(value);
      if (!list) continue; // values the scaffolder never reads (e.g. computed ones) are skipped
      out[key] = list;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// scripts/entries.ts

export interface EntryElement {
  entry: Entry;
  range: LineRange;
}

export interface EntriesSource {
  text: string;
  elements: EntryElement[];
}

const ITEM_CATEGORIES = new Set<Category>(["text", "effects", "backgrounds", "charts"]);

/** Mirrors the component()/item()/hook() helpers at the bottom of scripts/entries.ts. */
function entryFromCall(name: string, args: string[]): Entry | undefined {
  if (name === "component" && args.length === 2) {
    const [entryName = "", title = ""] = args;
    return { name: entryName, title, category: "components", file: `src/components/${entryName}.tsx`, client: true, docs: true };
  }
  if (name === "item" && args.length === 3) {
    const [category = "", entryName = "", title = ""] = args;
    if (!ITEM_CATEGORIES.has(category as Category)) return undefined;
    return { name: entryName, title, category: category as Category, file: `src/${category}/${entryName}.tsx`, client: true, docs: true };
  }
  if (name === "hook" && args.length === 2) {
    const [entryName = "", title = ""] = args;
    return { name: entryName, title, category: "hooks", file: `src/hooks/${entryName}.ts`, client: true, docs: true };
  }
  return undefined;
}

function entryFromNode(node: ts.Expression): Entry | undefined {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const args = node.arguments.map((arg) => (ts.isStringLiteralLike(arg) ? arg.text : null));
    if (args.some((arg) => arg === null)) return undefined;
    return entryFromCall(node.expression.text, args as string[]);
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj = literalObject(node);
    if (
      obj &&
      typeof obj.name === "string" &&
      typeof obj.title === "string" &&
      typeof obj.category === "string" &&
      typeof obj.file === "string" &&
      typeof obj.client === "boolean" &&
      typeof obj.docs === "boolean"
    ) {
      return {
        name: obj.name,
        title: obj.title,
        category: obj.category as Category,
        file: obj.file,
        client: obj.client,
        docs: obj.docs,
      };
    }
  }
  return undefined;
}

export function parseEntries(text: string): EntriesSource {
  const sf = parseSource(FILES.entries, text);
  const array = findArray(sf, "ENTRIES", FILES.entries);
  const elements = array.elements.map((node) => {
    const entry = entryFromNode(node);
    if (!entry) throw new ScaffoldError(`cannot read the ENTRIES row at ${FILES.entries}:${lineOf(sf, node.getStart(sf))}`);
    return { entry, range: lineRange(sf, node) };
  });
  return { text, elements };
}

export function readEntries(root: string, io: ReadIo): EntriesSource {
  return parseEntries(io.readFile(join(root, FILES.entries)));
}

// ---------------------------------------------------------------------------------------------
// src/index.ts

export interface BarrelLine {
  spec: string;
  range: LineRange;
}

export interface BarrelSource {
  text: string;
  /** Value `export * from "<spec>";` lines. */
  lines: BarrelLine[];
  /** Every `export *` / `export type *` specifier (for name collisions). */
  starSpecs: string[];
}

export function parseBarrel(text: string): BarrelSource {
  const sf = parseSource(FILES.barrel, text);
  const lines: BarrelLine[] = [];
  const starSpecs: string[] = [];
  for (const statement of sf.statements) {
    if (!ts.isExportDeclaration(statement) || statement.exportClause) continue;
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const spec = statement.moduleSpecifier.text;
    starSpecs.push(spec);
    if (!statement.isTypeOnly) lines.push({ spec, range: lineRange(sf, statement) });
  }
  if (lines.length === 0) throw new ScaffoldError(`cannot find any export * lines in ${FILES.barrel}`);
  return { text, lines, starSpecs };
}

export function readBarrel(root: string, io: ReadIo): BarrelSource {
  return parseBarrel(io.readFile(join(root, FILES.barrel)));
}

// ---------------------------------------------------------------------------------------------
// dashboard/src/registry/meta.ts

export interface MetaElement {
  slug: string;
  title: string;
  category: string;
  exports: string[];
  range: LineRange;
}

export interface MetaSource {
  text: string;
  elements: MetaElement[];
}

export function parseMeta(text: string): MetaSource {
  const sf = parseSource(FILES.meta, text);
  const array = findArray(sf, "registryMeta", FILES.meta);
  const elements = array.elements.map((node) => {
    const obj = ts.isObjectLiteralExpression(node) ? literalObject(node) : undefined;
    if (
      !obj ||
      typeof obj.slug !== "string" ||
      typeof obj.title !== "string" ||
      typeof obj.category !== "string" ||
      !Array.isArray(obj.exports)
    ) {
      throw new ScaffoldError(`cannot read the registryMeta row at ${FILES.meta}:${lineOf(sf, node.getStart(sf))}`);
    }
    return { slug: obj.slug, title: obj.title, category: obj.category, exports: obj.exports, range: lineRange(sf, node) };
  });
  return { text, elements };
}

export function readMeta(root: string, io: ReadIo): MetaSource {
  return parseMeta(io.readFile(join(root, FILES.meta)));
}

// ---------------------------------------------------------------------------------------------
// test/fixtures.tsx

export interface NamedRange {
  name: string;
  range: LineRange;
}

export interface FixtureElement extends NamedRange {
  covers: string[];
}

export interface FixturesSource {
  text: string;
  /** Specifiers of the `import { ... } from "../src/index";` declaration. */
  imports: NamedRange[];
  /** Line start of the `} from "../src/index";` line, and the specifier indent. */
  importClose: { offset: number; indent: string };
  fixtures: FixtureElement[];
  /** Line start of the fixtures array's closing `];` line. */
  fixturesClose: { offset: number; indent: string };
  hookProbes: NamedRange[];
  /** Line start of the hookProbes object's closing `};` line. */
  hookProbesClose: { offset: number; indent: string };
}

/** Line start of the closing bracket at `closePos`, which must start its own line. */
function closingLine(sf: ts.SourceFile, closePos: number, what: string): { offset: number; indent: string } {
  const offset = sf.text.lastIndexOf("\n", closePos - 1) + 1;
  const before = sf.text.slice(offset, closePos);
  if (!/^[ \t]*$/.test(before)) throw new ScaffoldError(`cannot edit ${sf.fileName}: the closing bracket of ${what} shares a line`);
  return { offset, indent: `${before}  ` };
}

function propertyKey(prop: ts.ObjectLiteralElementLike): string | undefined {
  const name = prop.name;
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

export function parseFixtures(text: string): FixturesSource {
  const sf = parseSource(FILES.fixtures, text);
  const importDecl = sf.statements.find(
    (s): s is ts.ImportDeclaration =>
      ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === "../src/index",
  );
  const bindings = importDecl?.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) {
    throw new ScaffoldError(`cannot find the import { ... } from "../src/index" in ${FILES.fixtures}`);
  }
  const imports = bindings.elements.map((el) => ({ name: el.name.text, range: lineRange(sf, el) }));
  const importClose = closingLine(sf, bindings.getEnd() - 1, "the ../src/index import");
  if (imports[0]) importClose.indent = imports[0].range.indent;

  const array = findArray(sf, "fixtures", FILES.fixtures);
  const fixtures = array.elements.map((node) => {
    const obj = ts.isObjectLiteralExpression(node) ? literalObject(node) : undefined;
    if (!obj || typeof obj.name !== "string" || !Array.isArray(obj.covers)) {
      throw new ScaffoldError(`cannot read the fixture at ${FILES.fixtures}:${lineOf(sf, node.getStart(sf))}`);
    }
    return { name: obj.name, covers: obj.covers, range: lineRange(sf, node) };
  });
  const fixturesClose = closingLine(sf, array.getEnd() - 1, "the fixtures array");
  if (fixtures[0]) fixturesClose.indent = fixtures[0].range.indent;

  const probes = findConst(sf, "hookProbes");
  if (!probes || !ts.isObjectLiteralExpression(probes)) {
    throw new ScaffoldError(`cannot find the hookProbes object in ${FILES.fixtures}`);
  }
  const hookProbes = probes.properties.map((prop) => {
    const key = propertyKey(prop);
    if (key === undefined) throw new ScaffoldError(`cannot read the hook probe at ${FILES.fixtures}:${lineOf(sf, prop.getStart(sf))}`);
    return { name: key, range: lineRange(sf, prop) };
  });
  const hookProbesClose = closingLine(sf, probes.getEnd() - 1, "the hookProbes object");
  if (hookProbes[0]) hookProbesClose.indent = hookProbes[0].range.indent;

  return { text, imports, importClose, fixtures, fixturesClose, hookProbes, hookProbesClose };
}

export function readFixtures(root: string, io: ReadIo): FixturesSource {
  return parseFixtures(io.readFile(join(root, FILES.fixtures)));
}

// ---------------------------------------------------------------------------------------------
// Exports and references

function bindingNames(name: ts.BindingName, out: Set<string>): void {
  if (ts.isIdentifier(name)) out.add(name.text);
  else for (const element of name.elements) if (!ts.isOmittedExpression(element)) bindingNames(element.name, out);
}

/** Every name a module exports itself: declarations and `export { a, b as c }` lists, values and types. */
export function exportedNames(fileName: string, text: string): Set<string> {
  const sf = parseSource(fileName, text);
  const names = new Set<string>();
  for (const statement of sf.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : [];
    if (modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) bindingNames(decl.name, names);
      } else if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name
      ) {
        names.add(statement.name.text);
      }
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) for (const el of statement.exportClause.elements) names.add(el.name.text);
      else names.add(statement.exportClause.name.text);
    }
  }
  return names;
}

/** Module specifiers a file imports or re-exports, plus string arguments of import() and require(). */
export function moduleSpecifiers(sf: ts.SourceFile): string[] {
  const specs: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) specs.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === "require";
      const arg = node.arguments[0];
      if ((isImport || isRequire) && arg && ts.isStringLiteralLike(arg)) specs.push(arg.text);
    }
    node.forEachChild(visit);
  };
  visit(sf);
  return specs;
}

/** Identifier tokens used as code (strings and comments are not identifiers). */
export function identifierNames(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) names.add(node.text);
    node.forEachChild(visit);
  };
  visit(sf);
  return names;
}
