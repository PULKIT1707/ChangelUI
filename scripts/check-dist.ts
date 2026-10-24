// Dist inspection (design 12.3, plans 1.8 and 4.5).
// Each check returns a list of failure messages; main() prints them and exits 1 on any failure.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { ENTRIES } from "./entries.ts";
import { RELEASED_NAMES } from "./released-entries.ts";

/** Server-safe entries (client: false in ENTRIES): no "use client" in their dist files. */
export const SERVER_SAFE = new Set(ENTRIES.filter((e) => !e.client).map((e) => e.name));
export const SIZE_LIMIT_BYTES = 20_000;
const USE_CLIENT = '"use client";';

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

function read(file: string): string {
  return readFileSync(join(distDir, file), "utf8");
}

function jsFiles(): string[] {
  return readdirSync(distDir).filter((f) => f.endsWith(".js") || f.endsWith(".cjs"));
}

function baseName(file: string): string {
  return file.replace(/\.(c?js)$/, "");
}

/** 1. Every entry (and index) has .js, .cjs, .d.ts and .d.cts. */
export function checkEntryFiles(names: readonly string[]): string[] {
  const failures: string[] = [];
  for (const name of names) {
    for (const ext of [".js", ".cjs", ".d.ts", ".d.cts"]) {
      if (!existsSync(join(distDir, name + ext))) failures.push(`missing dist/${name}${ext}`);
    }
  }
  return failures;
}

/** Directive rule for one file's text (exported for the negative control in tests). */
export function directiveFailure(file: string, source: string): string | null {
  const serverSafe = SERVER_SAFE.has(baseName(file));
  if (serverSafe) return source.includes("use client") ? `dist/${file}: server-safe file contains "use client"` : null;
  if (file.endsWith(".cjs")) {
    return source.startsWith(`${USE_CLIENT}"use strict";`)
      ? null
      : `dist/${file}: client CJS must start with "use client";"use strict";`;
  }
  return source.startsWith(USE_CLIENT) ? null : `dist/${file}: client ESM must start with "use client";`;
}

/** 2. Directive rule over every dist .js/.cjs (entries and chunks). */
export function checkDirectives(): string[] {
  return jsFiles()
    .map((file) => directiveFailure(file, read(file)))
    .filter((failure): failure is string => failure !== null);
}

const PEER_SPECIFIER = /["'](?:react|react-dom|motion)(?:\/[^"']*)?["']/g;
const ALLOWED_PREFIX = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)$/;
const BUNDLE_MARKERS = [
  "__CLIENT_INTERNALS_DO_NOT_USE",
  "__SECRET_INTERNALS_DO_NOT_USE",
  "react.transitional.element",
  'Symbol.for("react.element")',
  "Symbol.for('react.element')",
];
const SOURCE_PATH = /node_modules\/(?:react|react-dom|motion|framer-motion|motion-dom|motion-utils)\//;

/** Pure: bundled-peer failures for one file's text. */
export function peerFailures(file: string, source: string): string[] {
  const failures: string[] = [];
  for (const match of source.matchAll(PEER_SPECIFIER)) {
    const before = source.slice(Math.max(0, match.index - 40), match.index);
    if (!ALLOWED_PREFIX.test(before)) failures.push(`dist/${file}: peer reference ${match[0]} outside import/require`);
  }
  for (const marker of BUNDLE_MARKERS) {
    if (source.includes(marker)) failures.push(`dist/${file}: bundled peer marker ${marker}`);
  }
  if (SOURCE_PATH.test(source)) failures.push(`dist/${file}: bundled peer source path comment`);
  return failures;
}

/** 3. No dist JS contains bundled react, react-dom or motion code. */
export function checkNoBundledPeers(): string[] {
  return jsFiles().flatMap((file) => peerFailures(file, read(file)));
}

const LOCAL_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']\.\/([^"']+\.js)["']/g;

/** The ESM closure of an entry: the entry file plus every local chunk it imports transitively. */
export function esmClosure(entry: string, readFile: (file: string) => string = read): string[] {
  const seen = new Set<string>();
  const queue = [`${entry}.js`];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFile(file).matchAll(LOCAL_IMPORT)) {
      if (match[1]) queue.push(match[1]);
    }
  }
  return [...seen].sort();
}

export function closureGzipBytes(entry: string): number {
  const text = esmClosure(entry)
    .map((file) => read(file))
    .join("\n");
  return gzipSync(text).length;
}

/** 4. Per-entry ESM closure <= 20 kB gzip; index printed for information only. */
export function checkSizes(names: readonly string[]): { failures: string[]; rows: Array<[string, number]> } {
  const rows: Array<[string, number]> = [];
  const failures: string[] = [];
  for (const name of ["index", ...names]) {
    const bytes = closureGzipBytes(name);
    rows.push([name, bytes]);
    if (name !== "index" && bytes > SIZE_LIMIT_BYTES) {
      failures.push(`${name}: ESM closure ${(bytes / 1000).toFixed(2)} kB gzip exceeds 20 kB`);
    }
  }
  return { failures, rows };
}

export const PARTICLES_MARKER = "data-pui-particles";

/** 4b. Nothing released in 1.0.0 went missing (new entries are fine). */
export function checkReleasedEntries(names: readonly string[]): string[] {
  const present = new Set(names);
  return RELEASED_NAMES.filter((name) => !present.has(name)).map(
    (name) => `ENTRIES is missing ${name}, which shipped in 1.0.0 (removing it is a breaking change)`,
  );
}

/** Pure: tree-shaking marker failures given each closure's text. */
export function markerFailures(closureText: (entry: string) => string): string[] {
  const failures: string[] = [];
  for (const entry of ["particles", "index"]) {
    if (!closureText(entry).includes(PARTICLES_MARKER)) failures.push(`${entry}: ESM closure lacks ${PARTICLES_MARKER}`);
  }
  for (const entry of ["button", "dialog", "switch"]) {
    if (closureText(entry).includes(PARTICLES_MARKER)) failures.push(`${entry}: ESM closure contains ${PARTICLES_MARKER}`);
  }
  return failures;
}

/** 4c. Particles marker: present in the particles and index closures, absent elsewhere (AC-6). */
export function checkTreeShakingMarker(): string[] {
  return markerFailures((entry) =>
    esmClosure(entry)
      .map((file) => read(file))
      .join("\n"),
  );
}

/** One required literal per category folder, plus the generic ones (design 12.3). */
export const REQUIRED_CSS = [
  "--pui-primary",
  ".bg-pui-primary", // components (Dock's active dot, plan P8)
  "@keyframes pui-text-shimmer", // text
  "@keyframes pui-marquee-x", // effects
  "@keyframes pui-ripple", // backgrounds
];

/** 5. styles.css content and theme.css byte equality. */
export function checkStyles(): string[] {
  const failures: string[] = [];
  const css = read("styles.css");
  for (const literal of REQUIRED_CSS) {
    if (!css.includes(literal)) failures.push(`dist/styles.css: missing ${literal}`);
  }
  if (css.includes("@theme")) failures.push("dist/styles.css: contains @theme");
  if (css.includes("@source")) failures.push("dist/styles.css: contains @source");
  if (/@import\s*["']tailwindcss["']/.test(css)) failures.push('dist/styles.css: contains @import "tailwindcss"');
  if (css.includes("--pui-dashboard-sentinel")) {
    failures.push("dist/styles.css: contains --pui-dashboard-sentinel (dashboard classes leaked)");
  }
  for (const file of ["theme.css", "themes.css"]) {
    const source = readFileSync(join(root, "src/styles", file));
    if (!readFileSync(join(distDir, file)).equals(source)) {
      failures.push(`dist/${file}: not byte-equal to src/styles/${file}`);
    }
  }
  return failures;
}

export type Needle = { label: string; value: string };
function osUsername(): string {
  try {
    return userInfo().username;
  } catch {
    // userInfo() throws when the uid has no passwd entry (some containers).
    return process.env.USER ?? process.env.USERNAME ?? "";
  }
}
/**
 * Strings that would leak the build machine: home-directory roots, this home directory and this
 * username. The username is matched as a path segment only, so a short account name such as
 * "root" or "node" cannot match ordinary identifiers.
 */
export function machineNeedles(home: string = homedir(), user: string = osUsername()): Needle[] {
  // Assembled at runtime so the repo's own tracked-file path scan does not match this source line.
  const macRoot = `/${"Users"}/`;
  const needles: Needle[] = [
    { label: `"${macRoot}"`, value: macRoot },
    { label: '"\\Users\\"', value: "\\Users\\" },
    { label: '"/home/"', value: "/home/" },
  ];
  if (home.length > 1) needles.push({ label: "the home directory", value: home });
  if (user) {
    needles.push({ label: "the OS username", value: `/${user}/` }, { label: "the OS username", value: `\\${user}\\` });
  }
  return needles;
}
/** Pure: build-machine path failures for one file's text. Messages name the kind, never the value. */
export function machinePathFailures(file: string, text: string, needles: readonly Needle[]): string[] {
  const labels = new Set(needles.filter((n) => text.includes(n.value)).map((n) => n.label));
  return [...labels].map((label) => `${file}: contains ${label} (absolute build path)`);
}
function filesUnder(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .map((p) => join(dir, p))
    .filter((p) => statSync(p).isFile())
    .sort();
}
/** Every file under dir (maps, JS, types, CSS) is free of build-machine paths. */
export function checkNoMachinePaths(dir: string, needles: readonly Needle[] = machineNeedles()): string[] {
  return filesUnder(dir).flatMap((p) =>
    machinePathFailures(relative(root, p).split("\\").join("/"), readFileSync(p, "utf8"), needles),
  );
}
const TELEMETRY_MARKER = /posthog/i;

/** 8. The published library ships no telemetry: no file under dir mentions posthog (the dashboard's analytics stays out). */
export function checkNoTelemetry(dir: string = distDir): string[] {
  return filesUnder(dir)
    .filter((p) => TELEMETRY_MARKER.test(readFileSync(p, "utf8")))
    .map((p) => `dist/${relative(dir, p).split("\\").join("/")}: contains telemetry marker "posthog"`);
}
const PACK_DOCS = ["README.md", "LICENSE"];

/** Pure: packed file paths outside the allowlist, and README.md or LICENSE missing from the pack. */
export function packFailures(paths: readonly string[]): string[] {
  const failures = paths
    .filter((p) => p !== "package.json" && !PACK_DOCS.includes(p) && !p.startsWith("dist/"))
    .map((p) => `npm pack: unexpected file ${p}`);
  for (const doc of PACK_DOCS) {
    if (!paths.includes(doc)) failures.push(`npm pack: ${doc} is not in the file list`);
  }
  return failures;
}

/** The file list of npm pack --dry-run --json. */
export function packPaths(): string[] {
  const npmCli = process.env.npm_execpath;
  const args = ["pack", "--dry-run", "--json", "--ignore-scripts"];
  const out = npmCli?.endsWith(".js")
    ? execFileSync(process.execPath, [npmCli, ...args], { cwd: root, encoding: "utf8" })
    : execFileSync("npm", args, { cwd: root, encoding: "utf8" });
  const parsed = JSON.parse(out) as Array<{ files: Array<{ path: string }> }>;
  return parsed.flatMap((p) => p.files.map((f) => f.path));
}
/** 6. npm pack --dry-run lists only package.json, README.md, LICENSE and dist/**. */
export function checkPack(paths: readonly string[]): string[] {
  return packFailures(paths);
}
/** 7. No packed file contains a build-machine path. */
export function checkPackMachinePaths(paths: readonly string[], needles: readonly Needle[] = machineNeedles()): string[] {
  return paths.flatMap((p) =>
    machinePathFailures(`npm pack: ${p}`, readFileSync(join(root, p), "utf8"), needles),
  );
}

function main(): void {
  const names = ENTRIES.map((e) => e.name);
  const sizes = checkSizes(names);
  const packed = packPaths();
  const failures = [
    ...checkReleasedEntries(names),
    ...checkEntryFiles(["index", ...names]),
    ...checkDirectives(),
    ...checkNoBundledPeers(),
    ...sizes.failures,
    ...checkTreeShakingMarker(),
    ...checkStyles(),
    ...checkNoMachinePaths(distDir),
    ...checkNoTelemetry(distDir),
    ...checkPack(packed),
    ...checkPackMachinePaths(packed),
  ];

  console.log("ESM closure sizes (gzip):");
  const width = Math.max(...sizes.rows.map(([n]) => n.length));
  for (const [name, bytes] of [...sizes.rows].sort((a, b) => b[1] - a[1])) {
    const note = name === "index" ? "  (info only)" : "";
    console.log(`  ${name.padEnd(width)}  ${(bytes / 1000).toFixed(2).padStart(7)} kB${note}`);
  }
  const largest = sizes.rows.filter(([n]) => n !== "index").sort((a, b) => b[1] - a[1])[0];
  if (largest) console.log(`largest entry closure: ${largest[0]} ${(largest[1] / 1000).toFixed(2)} kB gzip`);

  if (failures.length > 0) {
    console.error(`check-dist: ${failures.length} failure(s)`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`check-dist: OK (${names.length + 1} entries)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
