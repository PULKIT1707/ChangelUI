// Scaffolds a library item. Run: npm run new -- <kebab-name> --category <category> [--dry-run]
// Writes the source file, a test, a fixture, the ENTRIES row, the root export, package.json exports
// and the dashboard page in one atomic step (scripts/item-scaffold.ts).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CATEGORIES } from "./entries.ts";
import { applyPlan, formatPlan, nextSteps, nodeIo, planNew, ScaffoldError, type Io } from "./item-scaffold.ts";
import { deriveNames } from "./item-templates.ts";

export const USAGE = `Usage: npm run new -- <kebab-name> --category <${CATEGORIES.join("|")}> [--dry-run]

Creates a library item and wires it everywhere: src/<category>/<name>.tsx (hooks: .ts), a test,
a fixture, the ENTRIES row, the root export, package.json exports and the dashboard page.

  -c, --category <c>  ${CATEGORIES.join(", ")}
      --dry-run       print the plan and write nothing
  -h, --help          show this help

Example: npm run new -- pricing-card --category components`;

export interface CliOptions {
  /** Repo root. */
  root: string;
  io?: Io;
  log?: (line: string) => void;
  error?: (line: string) => void;
  env?: Record<string, string | undefined>;
}

/** Returns the exit code. */
export function main(argv: readonly string[], options: CliOptions): number {
  const { root, io = nodeIo, log = console.log, error = console.error, env = process.env } = options;
  const fail = (message: string, usage = false): number => {
    error(`new-item: ${message}`);
    if (usage) error(`\n${USAGE}`);
    return 1;
  };
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: {
        category: { type: "string", short: "c" },
        "dry-run": { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), true);
  }
  const { values, positionals } = parsed;
  if (values.help) {
    log(USAGE);
    return 0;
  }
  const category = values.category;
  // `npm run new x --category c` (no --) makes npm read --category as its own flag: npm 11 sets
  // npm_config_category ("true", or "c" for --category=c) and passes "c" on as a second positional.
  if (category === undefined && env.npm_config_category !== undefined) {
    const guess = positionals[1] ?? (env.npm_config_category === "true" ? "<category>" : env.npm_config_category);
    return fail(
      `npm took --category as its own option: pass arguments after --, e.g. npm run new -- ${positionals[0] ?? "<name>"} --category ${guess}`,
    );
  }
  if (positionals.length !== 1) return fail(`expected exactly one name, got ${positionals.length}`, true);
  const name = positionals[0] ?? "";
  if (category === undefined) return fail("missing --category", true);
  // `npm run new x --dry-run` (no --) hands the flag to npm, which exposes it as npm_config_dry_run.
  const dryRun = values["dry-run"] === true || env.npm_config_dry_run === "true";
  try {
    const plan = planNew(root, { name, category }, io);
    log(formatPlan(plan, dryRun));
    if (dryRun) return 0;
    applyPlan(root, plan, io);
    log("");
    log(nextSteps(deriveNames(name, category as (typeof CATEGORIES)[number])));
    return 0;
  } catch (err) {
    if (err instanceof ScaffoldError) return fail(err.message);
    throw err;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), { root: resolve(dirname(fileURLToPath(import.meta.url)), "..") });
}
