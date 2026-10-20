import { collectSources, resolveSourceDeps, type SourceDeps } from "./source-deps";

// Raw library source for the Code tab (design 10.1). Lazy: each file is its own small chunk.
// The glob path is relative to this file: dashboard/src/lib -> repo root -> src.
const loaders = import.meta.glob<string>("../../../src/**/*.{ts,tsx}", { query: "?raw", import: "default" });

const PREFIX = "../../../";
const byRepoPath = new Map<string, () => Promise<string>>(
  Object.entries(loaders).map(([key, load]) => [key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key, load]),
);

/** Every loadable repo path, e.g. "src/components/button.tsx". */
export const sourcePaths: ReadonlySet<string> = new Set(byRepoPath.keys());

export function loadSource(path: string): Promise<string> {
  const load = byRepoPath.get(path);
  if (!load) return Promise.reject(new Error(`No source for ${path}`));
  return load();
}

export interface ItemSources extends SourceDeps {
  /** The item file first, then its "Also copy" files. */
  ordered: { path: string; source: string }[];
}

/** Loads an entry file and its transitive relative imports. Rejects when a chunk fails to load. */
export async function loadItemSources(entry: string): Promise<ItemSources> {
  const sources = await collectSources(entry, sourcePaths, loadSource);
  const deps = resolveSourceDeps(entry, sources);
  const ordered = [entry, ...deps.files].map((path) => ({ path, source: sources.get(path) ?? "" }));
  return { ...deps, ordered };
}
