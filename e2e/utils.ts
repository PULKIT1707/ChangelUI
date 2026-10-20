// Shared helpers for the dashboard e2e specs (design 12.5).
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"];

/** Stores the theme before any page script runs, so the injected init script applies it (no flash). */
export async function applyTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem("pui-theme", value), theme);
}

/** Collects console.error messages and uncaught page errors from now on. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/** Absolute path of a screenshot under dashboard/.screenshots/ (gitignored). */
export function screenshotPath(...parts: string[]): string {
  return fileURLToPath(new URL(`../dashboard/.screenshots/${parts.join("/")}`, import.meta.url));
}
