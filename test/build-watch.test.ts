// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRebuildScheduler, isIgnoredChange, watchSteps } from "../scripts/build-watch.ts";

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("watchSteps", () => {
  it("reruns exactly the steps of npm run build, without deleting dist/", () => {
    expect(watchSteps(pkg.scripts)).toEqual([
      ["tsup"],
      ["node", "scripts/fix-cjs-directive.ts"],
      ["node", "scripts/fix-cjs-sourcemaps.ts"],
      ["tailwindcss", "-i", "src/styles/styles.css", "-o", "dist/styles.css", "--minify"],
      ["node", "scripts/copy-theme.ts"],
    ]);
  });

  it("expands nested npm run scripts", () => {
    expect(watchSteps({ build: "rm -rf dist && a && npm run b", b: "c --x  y && npm run d", d: "e" })).toEqual([
      ["a"],
      ["c", "--x", "y"],
      ["e"],
    ]);
  });

  it.each(["a || b", "a; b", "a | b", "a > out", 'a "b c"', "a $HOME", "a && && b"])(
    "rejects shell syntax it does not model: %s",
    (build) => {
      expect(() => watchSteps({ build })).toThrow(/without a shell/);
    },
  );

  it("rejects missing and self-referencing scripts", () => {
    expect(() => watchSteps({})).toThrow(/no "build" script/);
    expect(() => watchSteps({ build: "npm run nope" })).toThrow(/no "nope" script/);
    expect(() => watchSteps({ build: "npm run b", b: "npm run build" })).toThrow(/runs itself/);
  });
});

describe("isIgnoredChange", () => {
  it.each([
    ["components/button.tsx", false],
    ["styles/theme.css", false],
    ["entries.ts", false],
    [".DS_Store", true],
    ["components/.button.tsx.swp", true],
    ["components/button.tsx.swp", true],
    ["components/button.tsx~", true],
    [".button.tsx.123.scaffold-tmp", true],
  ])("%s -> %s", (name, ignored) => {
    expect(isIgnoredChange(name)).toBe(ignored);
  });
});

describe("createRebuildScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A run() whose builds finish only when the test resolves them. */
  function controlledRun() {
    const pending: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
    const run = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          pending.push({ resolve, reject });
        }),
    );
    return { run, pending };
  }

  it("coalesces quick changes into one build", async () => {
    vi.useFakeTimers();
    const { run, pending } = controlledRun();
    const scheduler = createRebuildScheduler({ run, debounceMs: 150 });
    scheduler.trigger();
    await vi.advanceTimersByTimeAsync(100);
    scheduler.trigger();
    scheduler.trigger();
    await vi.advanceTimersByTimeAsync(149);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduler.running).toBe(true);
    pending[0]?.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduler.running).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("queues exactly one follow-up build for changes during a build", async () => {
    vi.useFakeTimers();
    const { run, pending } = controlledRun();
    const scheduler = createRebuildScheduler({ run, debounceMs: 150 });
    scheduler.trigger();
    await vi.advanceTimersByTimeAsync(150);
    expect(run).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 3; i++) {
      scheduler.trigger();
      await vi.advanceTimersByTimeAsync(200);
    }
    expect(run).toHaveBeenCalledTimes(1);
    pending[0]?.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
    pending[1]?.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(2);
    expect(scheduler.running).toBe(false);
  });

  it("keeps building after a failed build", async () => {
    vi.useFakeTimers();
    const { run, pending } = controlledRun();
    const scheduler = createRebuildScheduler({ run, debounceMs: 150 });
    scheduler.trigger();
    await vi.advanceTimersByTimeAsync(150);
    pending[0]?.reject(new Error("tsup exited 1"));
    await vi.advanceTimersByTimeAsync(0);
    expect(scheduler.running).toBe(false);
    scheduler.trigger();
    await vi.advanceTimersByTimeAsync(150);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
