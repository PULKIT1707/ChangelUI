// Shared helpers for the dashboard e2e specs (design 12.5).
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { Page, Request } from "@playwright/test";

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

/** One event from an intercepted PostHog ingestion request. */
export interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

/** PostHog event ingestion (`/e/`, `/i/v0/e/`, `/batch/`); not flags, config or replay (`/s/`). */
export function isPostHogIngestion(url: string): boolean {
  return /^\/(e|i\/v0\/e|batch)\/?$/.test(new URL(url).pathname);
}

/**
 * Decodes an intercepted PostHog request body into its events: `?compression=gzip-js` (raw gzip),
 * `compression=base64` (form `data=<base64>`) or plain JSON; a batch, a `{ batch }` object or one event.
 */
export function decodePostHogEvents(request: Request): CapturedEvent[] {
  const body = request.postDataBuffer();
  if (!body || body.length === 0) return [];
  const compression = new URL(request.url()).searchParams.get("compression");
  let text: string;
  if (compression === "gzip-js") {
    text = gunzipSync(body).toString("utf8");
  } else {
    text = body.toString("utf8");
    if (text.startsWith("data=")) text = Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8");
  }
  const payload: unknown = JSON.parse(text);
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && Array.isArray((payload as { batch?: unknown }).batch)
      ? (payload as { batch: unknown[] }).batch
      : [payload];
  return list.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { event, properties } = item as { event?: unknown; properties?: unknown };
    if (typeof event !== "string") return [];
    return [{ event, properties: typeof properties === "object" && properties !== null ? (properties as Record<string, unknown>) : {} }];
  });
}

/** Absolute path of a screenshot under dashboard/.screenshots/ (gitignored). */
export function screenshotPath(...parts: string[]): string {
  return fileURLToPath(new URL(`../dashboard/.screenshots/${parts.join("/")}`, import.meta.url));
}
