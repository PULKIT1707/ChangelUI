// Reverses `npm run new`. Run: npm run remove -- <kebab-name> [--dry-run]
// Removes the ENTRIES row, root export, package.json exports, meta row, fixtures and probes, and
// deletes the source, test and dashboard files in one atomic step. Items released in 1.0.0 and
// items other code still uses are refused (scripts/item-scaffold.ts).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { applyPlan, formatPlan, nodeIo, planRemove, ScaffoldError } from "./item-scaffold.ts";
import type { CliOptions } from "./new-item.ts";

export const USAGE = `Usage: npm run remove -- <kebab-name> [--dry-run]

Removes an item added with npm run new: its source, test, fixture, ENTRIES row, root export,
package.json exports and dashboard page. Items released in 1.0.0 are refused.

      --dry-run   print the plan and write nothing
  -h, --help      show this help`;

/** Returns the exit code. */
export function main(argv: readonly string[], options: CliOptions): number {
  const { root, io = nodeIo, log = console.log, error = console.error, env = process.env } = options;
  const fail = (message: string, usage = false): number => {
    error(`remove-item: ${message}`);
    if (usage) error(`\n${USAGE}`);
    return 1;
  };
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: { "dry-run": { type: "boolean" }, help: { type: "boolean", short: "h" } },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), true);
  }
  const { values, positionals } = parsed;
  if (values.help) {
    log(USAGE);
    return 0;
  }
  if (positionals.length !== 1) return fail(`expected exactly one name, got ${positionals.length}`, true);
  const name = positionals[0] ?? "";
  const dryRun = values["dry-run"] === true || env.npm_config_dry_run === "true";
  try {
    const plan = planRemove(root, name, io);
    log(formatPlan(plan, dryRun));
    if (dryRun) return 0;
    applyPlan(root, plan, io);
    log(`\nRemoved ${name}.`);
    return 0;
  } catch (err) {
    if (err instanceof ScaffoldError) return fail(err.message);
    throw err;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), { root: resolve(dirname(fileURLToPath(import.meta.url)), "..") });
}
