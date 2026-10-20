import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { ENTRIES } from "./scripts/entries";

const src = fileURLToPath(new URL("./src", import.meta.url));
const repoRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Same aliases as dashboard/vite.config.ts (design 10.1).
    alias: [
      { find: /^changelui$/, replacement: `${src}/index.ts` },
      { find: /^changelui\/theme\.css$/, replacement: `${src}/styles/theme.css` },
      { find: /^changelui\/themes\.css$/, replacement: `${src}/styles/themes.css` },
      { find: /^@pui-src\/(.*)$/, replacement: `${src}/$1` },
      ...ENTRIES.map((entry) => ({ find: new RegExp(`^changelui/${entry.name}$`), replacement: `${repoRoot}${entry.file}` })),
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}", "dashboard/src/**/*.test.{ts,tsx}"],
    exclude: ["test/consumers/**", "node_modules/**"],
    // The fs module cache keeps stale import.meta.glob results (registry items added later are
    // missed by dashboard/src/registry/index.ts), so transforms are never reused across runs.
    fsModuleCache: false,
    coverage: {
      provider: "v8",
      // Source files only: a stray non-JS file (e.g. macOS .DS_Store) would fail the AST remap.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/styles/**"],
      thresholds: { lines: 75, statements: 75, functions: 75, branches: 65 },
    },
  },
});
