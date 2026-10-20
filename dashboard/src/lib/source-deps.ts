// Pure "Also copy" resolver (design 10.1): follows relative imports transitively over a
// repo-path -> source map and collects the npm packages a copy-paster has to install.

/** Specifier -> npm package to install. react / react-dom are peers every consumer already has. */
const NPM_PACKAGES: readonly (readonly [test: (spec: string) => boolean, pkg: string])[] = [
  [(spec) => spec === "motion" || spec.startsWith("motion/"), "motion"],
  [(spec) => spec === "clsx", "clsx"],
  [(spec) => spec === "tailwind-merge", "tailwind-merge"],
];

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g;

/** Every module specifier in `import ... from "x"`, `export ... from "x"` and `import "x"`. */
export function extractImports(source: string): string[] {
  const specs: string[] = [];
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (spec !== undefined && !specs.includes(spec)) specs.push(spec);
  }
  return specs;
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function joinPath(dir: string, spec: string): string {
  const parts = dir === "" ? [] : dir.split("/");
  for (const part of spec.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

/** Resolves an extensionless relative specifier against the known paths ("../lib/cn" -> "src/lib/cn.ts"). */
export function resolveRelative(from: string, spec: string, known: ReadonlySet<string> | ReadonlyMap<string, unknown>): string | null {
  if (!spec.startsWith(".")) return null;
  const base = joinPath(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

export interface SourceDeps {
  /** Transitive relative dependencies in discovery (breadth-first) order, excluding the entry. */
  files: string[];
  /** npm packages to install, in a fixed order. */
  npm: string[];
}

export function resolveSourceDeps(entry: string, sources: ReadonlyMap<string, string>): SourceDeps {
  const seen = new Set<string>([entry]);
  const files: string[] = [];
  const npm = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.shift() as string;
    const source = sources.get(path);
    if (source === undefined) continue;
    for (const spec of extractImports(source)) {
      const pkg = NPM_PACKAGES.find(([test]) => test(spec))?.[1];
      if (pkg) {
        npm.add(pkg);
        continue;
      }
      const resolved = resolveRelative(path, spec, sources);
      if (resolved === null || seen.has(resolved)) continue;
      seen.add(resolved);
      files.push(resolved);
      queue.push(resolved);
    }
  }
  return { files, npm: NPM_PACKAGES.map(([, pkg]) => pkg).filter((pkg) => npm.has(pkg)) };
}

/**
 * Loads `entry` and everything it imports relatively, one file at a time, through `load`.
 * `known` lists every loadable path (the raw glob's keys).
 */
export async function collectSources(
  entry: string,
  known: ReadonlySet<string>,
  load: (path: string) => Promise<string>,
): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  let frontier = [entry];
  while (frontier.length > 0) {
    const loaded = await Promise.all(frontier.map(async (path) => [path, await load(path)] as const));
    const next: string[] = [];
    for (const [path, source] of loaded) {
      sources.set(path, source);
      for (const spec of extractImports(source)) {
        const resolved = resolveRelative(path, spec, known);
        if (resolved !== null && !sources.has(resolved) && !next.includes(resolved) && !frontier.includes(resolved)) {
          next.push(resolved);
        }
      }
    }
    frontier = next.filter((path) => !sources.has(path));
  }
  return sources;
}
