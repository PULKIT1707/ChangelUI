// npm pack consumer test (design 12.4, plan 6.1). Needs network for the fixture installs.
// Packs the library into a temp dir, installs it into copies of test/consumers/*, then typechecks,
// builds, runs the SSR smoke scripts and the Playwright browser checks against `vite preview`.
// Everything temporary (dirs, tarball, preview servers) is removed in `finally`.
import { spawn, spawnSync, type ChildProcess, type SpawnSyncOptions } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = join(root, "test/consumers");
const PKG = "changelui";

function log(message: string): void {
  console.log(`\n[consumer-test] ${message}`);
}

/** Runs a command, streaming its output; throws on a non-zero exit. */
function run(cmd: string, args: string[], cwd: string, options: SpawnSyncOptions = {}): void {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed in ${cwd} (exit ${String(result.status ?? result.signal)})`);
  }
}

/** npm through the same CLI that started this script when possible (see check-dist.ts). */
function npm(args: string[], cwd: string, options: SpawnSyncOptions = {}): void {
  const npmCli = process.env.npm_execpath;
  if (npmCli?.endsWith(".js")) run(process.execPath, [npmCli, ...args], cwd, options);
  else run("npm", args, cwd, options);
}

function npmOutput(args: string[], cwd: string): string {
  const npmCli = process.env.npm_execpath;
  const [cmd, full] = npmCli?.endsWith(".js") ? [process.execPath, [npmCli, ...args]] : ["npm", args];
  const result = spawnSync(cmd, full, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed (exit ${String(result.status)})`);
  return result.stdout;
}

function bin(dir: string, name: string): string {
  return join(dir, "node_modules/.bin", name);
}

function installedVersion(dir: string, pkg: string): string {
  const manifest = JSON.parse(readFileSync(join(dir, "node_modules", pkg, "package.json"), "utf8")) as { version: string };
  return manifest.version;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForUrl(url: string, child: ChildProcess, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`preview for ${url} exited early (${String(child.exitCode)})`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timed out waiting for ${url}`);
}

/** Consumer A: Tailwind built the library classes and tree-shaking dropped Particles. */
function checkTailwindOutput(dir: string): void {
  const files = walk(join(dir, "dist"));
  const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(f, "utf8"));
  if (!css.some((text) => text.includes(".bg-pui-primary"))) throw new Error("consumer A: built CSS has no .bg-pui-primary");
  const leaking = files.filter((f) => f.endsWith(".js") && readFileSync(f, "utf8").includes("data-pui-particles"));
  if (leaking.length > 0) throw new Error(`consumer A: data-pui-particles found in ${leaking.join(", ")}`);
  log("consumer A: CSS has .bg-pui-primary; no JS file contains data-pui-particles");
}

async function main(): Promise<void> {
  const started = Date.now();
  const tmp = mkdtempSync(join(tmpdir(), "changelui-consumer-"));
  const servers: ChildProcess[] = [];
  try {
    log("building the library");
    npm(["run", "build"], root);

    log(`packing into ${tmp}`);
    const packed = JSON.parse(npmOutput(["pack", "--pack-destination", tmp, "--json", "--ignore-scripts"], root)) as Array<{
      filename: string;
    }>;
    const tarball = join(tmp, packed[0]?.filename ?? "");
    if (!existsSync(tarball)) throw new Error(`npm pack produced no tarball (${tarball})`);

    const fixtures = readdirSync(fixturesDir).filter((name) => existsSync(join(fixturesDir, name, "package.json")));
    const dirs = new Map<string, string>();
    for (const name of fixtures) {
      const dir = join(tmp, name);
      cpSync(join(fixturesDir, name), dir, {
        recursive: true,
        filter: (src) => !/[/\\](node_modules|dist)([/\\]|$)/.test(src.slice(fixturesDir.length)),
      });
      const manifestPath = join(dir, "package.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        dependencies: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      manifest.dependencies[PKG] = `file:${tarball}`;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      log(`${name}: npm install`);
      npm(["install", "--no-audit", "--no-fund"], dir);
      for (const pkg of ["react", "react-dom", "motion"]) {
        const want = manifest.dependencies[pkg];
        const got = installedVersion(dir, pkg);
        if (want !== got) throw new Error(`${name}: ${pkg} is ${got}, expected ${String(want)}`);
      }
      dirs.set(name, dir);
    }

    const a = dirs.get("react19-tailwind");
    const b = dirs.get("react18-css");
    if (!a || !b) throw new Error("expected fixtures react19-tailwind and react18-css");

    const framer = installedVersion(b, "framer-motion");
    if (framer !== "11.11.17") throw new Error(`consumer B: framer-motion is ${framer}, expected 11.11.17`);
    log("consumer B: framer-motion 11.11.17 (floor runtime)");

    for (const [name, dir] of dirs) {
      log(`${name}: tsc --noEmit`);
      run(bin(dir, "tsc"), ["--noEmit", "-p", "."], dir);
      log(`${name}: vite build`);
      run(bin(dir, "vite"), ["build"], dir);
    }
    checkTailwindOutput(a);

    log("consumer B: SSR smoke (ESM, CJS)");
    run(process.execPath, ["ssr-esm.mjs"], b);
    run(process.execPath, ["ssr-cjs.cjs"], b);

    const urls: Record<string, string> = {};
    for (const [key, dir] of [
      ["PUI_CONSUMER_A_URL", a],
      ["PUI_CONSUMER_B_URL", b],
    ] as const) {
      const port = await freePort();
      // stdin is ignored: a background child reading a tty would be stopped by SIGTTIN.
      const child = spawn(bin(dir, "vite"), ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
        cwd: dir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      servers.push(child);
      const url = `http://127.0.0.1:${port}/`;
      await waitForUrl(url, child);
      urls[key] = url;
      log(`${key}=${url}`);
    }

    log("browser checks (playwright.consumer.config.ts)");
    run(bin(root, "playwright"), ["test", "-c", "playwright.consumer.config.ts"], root, {
      env: { ...process.env, ...urls },
    });
    log(`all consumer checks passed in ${Math.round((Date.now() - started) / 1000)}s`);
  } finally {
    for (const child of servers) child.kill("SIGTERM");
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
