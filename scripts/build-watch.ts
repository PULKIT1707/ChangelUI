// Rebuilds dist/ whenever src/ or scripts/entries.ts changes, for apps that use the library through
// a symlink (npm link, or npm install <folder>). Run: npm run build:watch
// It reruns the same steps as `npm run build` (read from package.json at start), debounced and one
// build at a time. Only the first build deletes dist/, so a linked app never sees it missing.
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, rmSync, watch, type FSWatcher } from "node:fs";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[build:watch]";
const UNSUPPORTED = /["'`$<>|;]/;

/**
 * Pure: the argv of each step of the "build" script, with `rm -rf dist` dropped and `npm run <x>`
 * expanded. Throws on shell syntax it does not model (quotes, ||, ;, pipes, redirects, $).
 */
export function watchSteps(scripts: Readonly<Record<string, string>>, script = "build", seen: readonly string[] = []): string[][] {
  const body = scripts[script];
  if (body === undefined) throw new Error(`build:watch: package.json has no "${script}" script`);
  if (seen.includes(script)) throw new Error(`build:watch: "${script}" runs itself through npm run`);
  return body.split("&&").flatMap((part) => {
    const command = part.trim();
    if (command === "" || UNSUPPORTED.test(command)) {
      throw new Error(`build:watch: cannot run "${command}" from the "${script}" script without a shell`);
    }
    const argv = command.split(/\s+/);
    if (argv.join(" ") === "rm -rf dist") return [];
    if (argv[0] === "npm" && argv[1] === "run" && argv[2] && argv.length === 3) {
      return watchSteps(scripts, argv[2], [...seen, script]);
    }
    return [argv];
  });
}

/** Editor and OS noise that should not trigger a rebuild. */
export function isIgnoredChange(name: string): boolean {
  const base = basename(name);
  return base.startsWith(".") || base.endsWith("~") || base.endsWith(".swp");
}

export interface RebuildScheduler {
  /** Schedules a build after the debounce; changes during a build queue exactly one more. */
  trigger(): void;
  readonly running: boolean;
}

export function createRebuildScheduler({
  run,
  debounceMs,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (timer) => clearTimeout(timer as Parameters<typeof clearTimeout>[0]),
}: {
  run: () => Promise<unknown>;
  debounceMs: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}): RebuildScheduler {
  let timer: unknown;
  let running = false;
  let queued = false;
  const start = (): void => {
    running = true;
    run()
      .catch(() => undefined) // a failed build never stops later ones
      .finally(() => {
        running = false;
        if (queued) {
          queued = false;
          start();
        }
      });
  };
  return {
    trigger() {
      if (timer !== undefined) clearTimer(timer);
      timer = setTimer(() => {
        timer = undefined;
        if (running) queued = true;
        else start();
      }, debounceMs);
    },
    get running() {
      return running;
    },
  };
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
  const steps = watchSteps(pkg.scripts);
  const env = { ...process.env, PATH: `${join(root, "node_modules/.bin")}${delimiter}${process.env.PATH ?? ""}` };
  let child: ChildProcess | undefined;
  let stopping = false;

  const runStep = (argv: string[]): Promise<number> =>
    new Promise((done) => {
      const [cmd = "", ...args] = argv;
      // No shell; node runs as this very binary so the pinned version is used.
      child = spawn(cmd === "node" ? process.execPath : cmd, args, { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
      child.once("error", (error) => {
        console.error(`${TAG} ${cmd}: ${error.message}`);
        done(1);
      });
      child.once("exit", (code, signal) => done(code ?? (signal ? 1 : 0)));
    });

  const build = async (): Promise<void> => {
    const started = Date.now();
    for (const argv of steps) {
      const code = await runStep(argv);
      child = undefined;
      if (stopping) return;
      if (code !== 0) {
        console.log(`${TAG} build failed (${argv[0] ?? "?"} exited ${code}); waiting for changes`);
        return;
      }
    }
    console.log(`${TAG} built in ${((Date.now() - started) / 1000).toFixed(1)}s at ${clock()}`);
  };

  const scheduler = createRebuildScheduler({ run: build, debounceMs: 150 });
  const watchers: FSWatcher[] = [];
  const onChange =
    (prefix: string, only?: string) =>
    (_event: string, filename: string | Buffer | null): void => {
      const name = filename ? String(filename).split("\\").join("/") : "";
      if (only !== undefined && name !== only) return;
      if (name && isIgnoredChange(name)) return;
      console.log(`${TAG} change: ${prefix}${name}`);
      scheduler.trigger();
    };

  const stop = (): void => {
    stopping = true;
    for (const watcher of watchers) watcher.close();
    child?.kill("SIGTERM");
    console.log(`${TAG} stopped`);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log(`${TAG} first build (cleans dist/), then watching src/ and scripts/entries.ts; Ctrl+C stops`);
  rmSync(join(root, "dist"), { recursive: true, force: true });
  void build().then(() => {
    if (stopping) return;
    watchers.push(watch(join(root, "src"), { recursive: true }, onChange("src/")));
    // The folder, not the file: editors that save by rename would end a file watch.
    watchers.push(watch(join(root, "scripts"), onChange("scripts/", "entries.ts")));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
