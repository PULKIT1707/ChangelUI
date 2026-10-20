// @vitest-environment node
// Perf budgets for the chart core (charts-roadmap 5.5). Each scenario runs after a warm-up and is
// judged on its median, so one slow run on a busy machine doesn't fail the suite. Budgets are the
// roadmap's targets. `npm run bench:charts` runs this file in report mode (CHART_BENCH=1): budgets
// held exactly, 4x the runs, and a table of median / best / budget per scenario.
import { afterAll, describe, expect, it } from "vitest";
import { lttb, minMaxPerPixel } from "../../../src/charts/core/decimate";
import { dodge } from "../../../src/charts/core/dodge";
import { createForceSimulation } from "../../../src/charts/core/force";
import { treemap } from "../../../src/charts/core/hierarchy";
import { linePath } from "../../../src/charts/core/path";
import { sankeyLayout } from "../../../src/charts/core/sankey";
import { scaleLinear } from "../../../src/charts/core/scale";
import { nearestIndex } from "../../../src/charts/core/spatial";
import { stack } from "../../../src/charts/core/stack";
import { timeTicks } from "../../../src/charts/core/ticks";
import {
  BEESWARM_2K,
  freshTree,
  LINE_10K,
  NETWORK_LINKS,
  NETWORK_NODES,
  SANKEY_LINKS,
  SANKEY_NODES,
  STACK_5x10K,
  XS_100K,
  XS_10K,
  YS_100K,
  YS_10K,
} from "./perf-fixtures";

const REPORT = process.env.CHART_BENCH === "1";
/**
 * The regular suite runs in parallel and often under coverage instrumentation (about 2x slower),
 * so it allows 3x the budget, the roadmap's CI threshold. bench:charts holds the budgets exactly.
 */
const SLACK = REPORT ? 1 : 3;
const rows: Array<{ scenario: string; median: number; best: number; budget: number }> = [];

/** Times `fn` (after warm-up runs) and asserts the median against `budget` ms. `per` divides the time per call. */
function measure(scenario: string, budget: number, fn: () => unknown, options: { runs?: number; per?: number } = {}): void {
  const runs = (options.runs ?? 15) * (REPORT ? 4 : 1);
  const per = options.per ?? 1;
  for (let i = 0; i < 3; i++) fn();
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    times.push((performance.now() - t) / per);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)] as number;
  rows.push({ scenario, median, best: times[0] as number, budget });
  expect(median, scenario).toBeLessThan(budget * SLACK);
}

afterAll(() => {
  if (!REPORT) return;
  const fmt = (ms: number) => (ms < 0.01 ? `${(ms * 1000).toFixed(3)} us` : `${ms.toFixed(3)} ms`);
  const lines = rows.map((r) => `${r.scenario.padEnd(42)} median ${fmt(r.median).padStart(11)}   best ${fmt(r.best).padStart(11)}   budget ${fmt(r.budget)}`);
  console.info(`\nChart core perf (Node ${process.version})\n${lines.join("\n")}\n`);
});

describe("chart core perf budgets (median)", () => {
  it("paths", () => {
    measure("monotone path, 10k points", 25, () => linePath(LINE_10K, { curve: "monotone" }));
    measure("natural path, 10k points", 25, () => linePath(LINE_10K, { curve: "natural" }));
    const x = scaleLinear([0, 1000], [0, 1200]);
    const y = scaleLinear([-100, 200], [400, 0], { nice: true });
    measure("scale map + linear path, 10k points", 25, () => linePath(LINE_10K.map(([a, b]) => [x(a), y(b)] as const)));
  });

  it("decimation and pointer lookup", () => {
    measure("LTTB 10k -> 800", 5, () => lttb(XS_10K, YS_10K, 800));
    measure("LTTB 100k -> 2,400", 25, () => lttb(XS_100K, YS_100K, 2400), { runs: 7 });
    measure("min-max per pixel 100k -> 1,200 px", 25, () => minMaxPerPixel(XS_100K, YS_100K, 1200), { runs: 7 });
    let k = 0;
    measure(
      "nearestIndex, one pointer move (10k xs)",
      0.01,
      () => {
        for (let i = 0; i < 10_000; i++) nearestIndex(XS_10K, (k++ % 10_000) * 0.1 + 0.03);
      },
      { per: 10_000 },
    );
  });

  it("layouts", () => {
    measure("treemap, 2k leaves (squarify, padded)", 8, () => treemap(freshTree(), { width: 1200, height: 800, paddingInner: 2, paddingTop: 16 }));
    measure("sankey, 60 nodes / 150 links", 5, () => sankeyLayout(SANKEY_NODES, SANKEY_LINKS, { width: 1000, height: 600 }));
    const sim = createForceSimulation(NETWORK_NODES, NETWORK_LINKS, { radius: 4 });
    sim.tick(5);
    measure("force, 300 nodes, one tick", 2, () => sim.tick(), { runs: 30 });
    measure("stack 5 x 10k, wiggle + insideOut", 25, () => stack(STACK_5x10K, { offset: "wiggle", order: "insideOut" }), { runs: 9 });
    measure("beeswarm dodge, 2k circles", 30, () => dodge(BEESWARM_2K, { radius: 3 }), { runs: 7 });
  });

  it("time ticks", () => {
    measure("UTC time ticks, one domain", 0.1, () => {
      for (let i = 1; i <= 100; i++) timeTicks(1.7e12, 1.7e12 + i * 3.7e8, 8);
    }, { per: 100 });
  });
});
