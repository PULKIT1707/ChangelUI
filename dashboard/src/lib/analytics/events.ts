// Typed event catalog for the dashboard analytics (analytics plan, "Event catalog").
// `analytics.track(name, props)` is typed by AnalyticsEvents, so an unknown event name or a wrong
// property fails typecheck. Property values are product facts (slugs, kinds, counts), never user data.
import type { Category } from "../../../../scripts/entries";
import type { Route } from "../../router";

export type RouteKind = Route["kind"];
/** Where a copied snippet came from in the page. */
export type SnippetKind = "usage" | "install" | "import" | "source" | "config";
/** The page surface a code snippet was copied on. */
export type CopySurface = "item_page" | "installation" | "templates" | "home";
/** The surface the install command was copied from. */
export type InstallSurface = "home" | "installation" | "templates" | "palette";
/** The control kind in the Preview tab's controls panel. */
export type ValueType = "select" | "boolean" | "number" | "text";
export type ThemeMode = "light" | "dark" | "system";
export type PaletteResultKind = "item" | "page" | "template" | "action" | "recent";
export type DemoErrorPhase = "render" | "load";
export type ReferrerKind = "internal" | "external" | "direct";
/** consent_changed.choice: "withdrawn" is a decline made after an earlier accept (privacy settings). */
export type ConsentEventChoice = "accepted" | "declined" | "withdrawn";
export type ConsentSource = "banner" | "settings";
/** Where a Developer's Pick card was clicked: the picks page or the home teaser. */
export type PickSurface = "picks" | "home";

/** `$pageview` properties (sent through `analytics.pageview`). */
export interface PageviewProps {
  route_kind: RouteKind;
  route_key: string;
  category: Category | "docs" | "templates" | "picks" | null;
  /** The item or template slug, null on other pages. */
  component: string | null;
}

export interface AnalyticsEvents {
  palette_opened: Record<string, never>;
  /** `query` only when result_count is 0 (decision D1), see truncateQuery. */
  palette_search: { query_length: number; result_count: number; query?: string };
  /** target: an item/template slug or a command key. position is 0-based. */
  palette_result_selected: { kind: PaletteResultKind; target: string; position: number; query_length: number };
  code_copied: { component: string | null; snippet_kind: SnippetKind; surface: CopySurface };
  install_command_copied: { surface: InstallSurface };
  control_changed: { component: string; prop: string; value_type: ValueType };
  controls_reset: { component: string };
  theme_switched: { from: ThemeMode; to: ThemeMode };
  theme_preset_switched: { from: string; to: string };
  /** error_name must go through sanitizeErrorName, error_message through redactErrorMessage. */
  demo_error: { component: string; phase: DemoErrorPhase; error_name: string; error_message: string };
  /** path must go through sanitizeNotFoundPath (decision D4). */
  route_not_found: { path: string; referrer_kind: ReferrerKind };
  web_vital_ttfb: { value_ms: number; route_kind: RouteKind };
  consent_changed: { choice: ConsentEventChoice; source: ConsentSource };
  /** component is the item slug; position is 0-based in the visible list. */
  devs_pick_card_clicked: { component: string; category: Category; position: number; featured: boolean; surface: PickSurface };
  devs_pick_filter_changed: { category: "all" | Category };
  /** filter is the category filter active when Surprise me was pressed. */
  devs_pick_surprise_clicked: { component: string; category: Category; filter: "all" | Category };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
/** Every event name the client may send: the catalog plus PostHog's pageview and web vitals. */
export type AllowedEventName = AnalyticsEventName | "$pageview" | "$web_vitals";

// A Record keyed by the catalog, so adding an event to AnalyticsEvents without listing it here fails typecheck.
const CATALOG: Record<AnalyticsEventName, true> = {
  palette_opened: true,
  palette_search: true,
  palette_result_selected: true,
  code_copied: true,
  install_command_copied: true,
  control_changed: true,
  controls_reset: true,
  theme_switched: true,
  theme_preset_switched: true,
  demo_error: true,
  route_not_found: true,
  web_vital_ttfb: true,
  consent_changed: true,
  devs_pick_card_clicked: true,
  devs_pick_filter_changed: true,
  devs_pick_surprise_clicked: true,
};

/** Events allowed in the anonymous (cookieless) tier. Everything else is dropped by sanitizeEvent. */
export const ANONYMOUS_EVENTS: readonly AllowedEventName[] = [
  ...(Object.keys(CATALOG) as AnalyticsEventName[]),
  "$pageview",
  "$web_vitals",
];

// Open decisions D1 and D4 in the analytics plan (defaults implemented, to be confirmed by the owner):
// D1 sends the zero-result search text, D4 sends the sanitized 404 path. Shrink or drop them here.
export const ZERO_RESULT_QUERY_MAX = 40;
export const ERROR_MESSAGE_MAX = 120;
export const NOT_FOUND_PATH_MAX = 64;
export const ERROR_NAME_MAX = 40;

const REDACTED = "[redacted]";

/** Zero-result palette query (D1): trimmed, lowercased, at most ZERO_RESULT_QUERY_MAX characters. */
export function truncateQuery(query: string): string {
  return query.trim().toLowerCase().slice(0, ZERO_RESULT_QUERY_MAX);
}

/** Error text without emails, URLs or long digit runs (ids, phone numbers), at most ERROR_MESSAGE_MAX characters. */
export function redactErrorMessage(message: string): string {
  return message
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, REDACTED)
    .replace(/\bwww\.\S+/gi, REDACTED)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, REDACTED)
    .replace(/\d{6,}/g, REDACTED)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ERROR_MESSAGE_MAX);
}

/** Error class name for demo_error: only [A-Za-z0-9_], at most ERROR_NAME_MAX characters, "Error" when nothing is left. */
export function sanitizeErrorName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "").slice(0, ERROR_NAME_MAX) || "Error";
}

/** Unknown hash path for route_not_found (D4): no query, lowercased, only [a-z0-9/._-], at most NOT_FOUND_PATH_MAX characters. */
export function sanitizeNotFoundPath(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryStart = raw.indexOf("?");
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart);
  return path
    .toLowerCase()
    .replace(/[^a-z0-9/._-]/g, "")
    .slice(0, NOT_FOUND_PATH_MAX);
}
