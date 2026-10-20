// Temp copies of the files the item scaffolder reads and edits, so its tests never touch the repo.
// Helpers avoid the `use` prefix (react-hooks treats use* functions as hooks).
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nodeIo, type Io } from "../../scripts/item-scaffold.ts";

export const repoRoot = join(import.meta.dirname, "../..");

const COPIED = [
  "scripts",
  "src",
  "test/fixtures.tsx",
  "test/components",
  "test/text",
  "test/effects",
  "test/backgrounds",
  "test/hooks",
  "dashboard/src/registry",
  "package.json",
];

/** A fresh temp dir holding copies of everything the scaffolder reads and edits. */
export function makeTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "pui-scaffold-"));
  for (const path of COPIED) cpSync(join(repoRoot, path), join(dir, path), { recursive: true });
  return dir;
}

export function removeTempRepo(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Repo-relative path -> sha256 of every file under dir (directories are implied by their files). */
export function hashTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const files = (readdirSync(dir, { recursive: true }) as string[]).map((p) => p.split("\\").join("/")).sort();
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isFile()) out[file] = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  return out;
}

/** Every directory under dir, for checking that a rollback removed the ones it created. */
export function listDirs(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .map((p) => p.split("\\").join("/"))
    .filter((p) => statSync(join(dir, p)).isDirectory())
    .sort();
}

/**
 * nodeIo that throws on exactly the `failAt`-th mutating call (1-based) and counts them all.
 * failAt 0 never throws, which measures how many mutating calls a run makes.
 */
export function faultyIo(failAt: number): Io & { calls: () => number } {
  let calls = 0;
  const wrap =
    <A extends string[]>(method: string, real: (...args: A) => void) =>
    (...args: A): void => {
      calls++;
      if (calls === failAt) throw new Error(`injected failure in ${method} (call ${calls})`);
      real(...args);
    };
  return {
    ...nodeIo,
    writeFile: wrap("writeFile", nodeIo.writeFile),
    rename: wrap("rename", nodeIo.rename),
    unlink: wrap("unlink", nodeIo.unlink),
    mkdir: wrap("mkdir", nodeIo.mkdir),
    rmdir: wrap("rmdir", nodeIo.rmdir),
    calls: () => calls,
  };
}
