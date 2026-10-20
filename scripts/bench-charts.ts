// npm run bench:charts: runs the chart core perf budgets (test/charts/core/perf.test.ts) in report
// mode, which also prints the median, best and budget of every scenario.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const result = spawnSync(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run", "test/charts/core/perf.test.ts", "--silent=false"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CHART_BENCH: "1" },
});
process.exit(result.status ?? 1);
