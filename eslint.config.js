// Flat ESLint config (design 12.1). Rule disables live only here, scoped narrowly, with a reason.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "dashboard/dist/**",
      "dashboard/dist-e2e/**",
      "coverage/**",
      "dashboard/.screenshots/**",
      "test-results/**",
      "playwright-report/**",
      ".agents/**",
      ".claude/**",
      // Git worktrees checked out inside the repo are separate trees with their own lint run.
      ".worktrees/**",
      "test/consumers/**/dist/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    // Checkbox, Switch and RadioGroupItem render labelable <button> controls, so a wrapping <label> is associated.
    rules: {
      "jsx-a11y/label-has-associated-control": [
        "error",
        { controlComponents: ["Checkbox", "Switch", "RadioGroupItem", "Input", "Textarea"] },
      ],
    },
  },
  {
    // Dashboard code blocks (<pre>) and scrollable table regions must be keyboard-focusable so they can be scrolled (WCAG 2.1.1).
    files: ["dashboard/src/**"],
    rules: {
      "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: ["pre"], roles: ["tabpanel", "region"] }],
    },
  },
  {
    // Consumer B's CJS SSR smoke must load the package through require() (design 12.4).
    files: ["test/consumers/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/**", "dashboard/src/**", "templates/**", "test/**"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["scripts/**", "e2e/**", "test/**", "*.config.*", "dashboard/vite.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
]);
