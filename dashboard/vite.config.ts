import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { ENTRIES } from "../scripts/entries";
import { getThemeInitScript } from "../src/lib/theme-script";

const dashboardDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const src = fileURLToPath(new URL("../src", import.meta.url));

/** Injects the theme init script into <head> so the stored theme applies before first paint. */
function themeInitScript(): Plugin {
  return {
    name: "pui-theme-init-script",
    transformIndexHtml() {
      return [
        {
          tag: "script",
          children: getThemeInitScript({ storageKey: "pui-theme", attribute: "both", presetStorageKey: "pui-theme-preset" }),
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  root: dashboardDir,
  base: "./",
  plugins: [react(), tailwindcss(), themeInitScript()],
  resolve: {
    // Exact-match aliases, identical to vitest.config.ts: the dashboard always consumes real source.
    alias: [
      { find: /^changelui$/, replacement: `${src}/index.ts` },
      { find: /^changelui\/theme\.css$/, replacement: `${src}/styles/theme.css` },
      { find: /^changelui\/themes\.css$/, replacement: `${src}/styles/themes.css` },
      { find: /^@pui-src\/(.*)$/, replacement: `${src}/$1` },
      // Public subpaths (`changelui/button`), used by the copy-only templates/ blocks.
      ...ENTRIES.map((entry) => ({ find: new RegExp(`^changelui/${entry.name}$`), replacement: `${repoRoot}${entry.file}` })),
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Stable vendor chunks (roadmap I-2): React, Motion and the highlighter cache across releases
    // and never ride along in the shell or page chunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
            { name: "motion", test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/, priority: 2 },
            { name: "sugar-high", test: /node_modules[\\/]sugar-high[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  // Local only: bind to loopback, never to all interfaces.
  server: { host: "127.0.0.1", port: 5173, strictPort: true, fs: { allow: [repoRoot] } },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
