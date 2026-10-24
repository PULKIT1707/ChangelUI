// Queries the dashboard's PostHog project (HogQL query API) and writes analytics/insights-YYYY-MM-DD.md
// with ranked, rule-based improvement suggestions.
// Run: POSTHOG_PERSONAL_API_KEY=... POSTHOG_PROJECT_ID=... npm run analytics:report -- --days 7
// The personal API key is only ever sent in the Authorization header: it is never logged, written
// to the report or included in an error message.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTRIES, type Entry } from "./entries.ts";

export const DEFAULT_DAYS = 30;
export const MAX_DAYS = 365;
/** Private API host for EU Cloud (the ingestion host eu.i.posthog.com does not serve queries). */
export const DEFAULT_HOST = "https://eu.posthog.com";
export const REQUEST_TIMEOUT_MS = 30_000;
/** Rows per query; every query sets an explicit LIMIT (the API default is 100). */
export const QUERY_LIMIT = 500;

// Suggestion thresholds.
/** Components with fewer views are ignored by the copy-ratio rule (too little data). */
export const MIN_VIEWS = 20;
/** Copies per view below this suggests the docs, demo or snippet do not help. */
export const LOW_COPY_RATIO = 0.05;
/** A zero-result search term must be seen at least this often. */
export const MIN_ZERO_RESULT_COUNT = 2;
/** A 404 path must be hit at least this often. */
export const MIN_NOT_FOUND_COUNT = 2;
/** One prop with at least this share of a component's control changes is worth promoting. */
export const PROP_SHARE = 0.3;
/** The prop-share rule needs at least this many control changes for the component. */
export const MIN_TWEAKS = 10;
/** Components in the lowest share of views (and every never-viewed one) need discoverability work. */
export const BOTTOM_DECILE = 0.1;
/** "Good" p75 limits (web.dev): LCP, INP and TTFB in ms, CLS unitless. */
export const VITALS_P75 = { lcp: 2500, inp: 200, cls: 0.1, ttfb: 800 } as const;

/** Base score per rule; the rule adds a size term on top. Higher sorts first. */
export const WEIGHTS = {
  demoError: 100,
  perf: 60,
  notFound: 40,
  zeroResult: 30,
  lowCopy: 20,
  promoteProp: 15,
  discoverability: 10,
} as const;

export const QUERY_NAMES = [
  "top_views",
  "zero_result_searches",
  "copies",
  "install_copies",
  "tweaked_props",
  "theme_device",
  "demo_errors",
  "web_vitals",
  "ttfb",
  "not_found",
  "pick_views",
  "pick_clicks",
  "pick_filters",
  "pick_surprises",
] as const;
export type QueryName = (typeof QUERY_NAMES)[number];

/** The parts of a PostHog query response the report reads. */
export interface QueryResult {
  columns: string[];
  results: unknown[][];
}

export interface ReportEnv {
  key: string;
  projectId: string;
  host: string;
}

export const USAGE =
  "Usage: POSTHOG_PERSONAL_API_KEY=<key with Query Read scope> POSTHOG_PROJECT_ID=<digits> " +
  "[POSTHOG_HOST=https://eu.posthog.com] npm run analytics:report -- [--days N]  (N = 1..365, default 30)";

function checkDays(days: number): number {
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new Error(`--days must be an integer from 1 to ${MAX_DAYS}`);
  }
  return days;
}

/** Pure: `--days N` or `--days=N` (default 30). Throws on anything else. */
export function parseArgs(argv: readonly string[]): { days: number } {
  let days = DEFAULT_DAYS;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    let value: string | undefined;
    if (arg === "--days") value = argv[++i];
    else if (arg.startsWith("--days=")) value = arg.slice("--days=".length);
    else throw new Error(`Unknown argument: ${arg}`);
    if (value === undefined || !/^\d+$/.test(value)) throw new Error(`--days must be an integer from 1 to ${MAX_DAYS}`);
    days = checkDays(Number(value));
  }
  return { days };
}

/** Pure: reads the configuration. Error messages name variables, never their values. */
export function readEnv(env: Readonly<Record<string, string | undefined>>): ReportEnv {
  const key = env.POSTHOG_PERSONAL_API_KEY ?? "";
  const projectId = env.POSTHOG_PROJECT_ID ?? "";
  const missing = [
    ...(key === "" ? ["POSTHOG_PERSONAL_API_KEY"] : []),
    ...(projectId === "" ? ["POSTHOG_PROJECT_ID"] : []),
  ];
  if (missing.length > 0) throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
  if (!/^\d+$/.test(projectId)) throw new Error("POSTHOG_PROJECT_ID must contain digits only");

  const rawHost = env.POSTHOG_HOST === undefined || env.POSTHOG_HOST === "" ? DEFAULT_HOST : env.POSTHOG_HOST;
  let url: URL;
  try {
    url = new URL(rawHost);
  } catch {
    throw new Error("POSTHOG_HOST is not a valid URL");
  }
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("POSTHOG_HOST must be an https URL (http is allowed only for 127.0.0.1 or localhost)");
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new Error("POSTHOG_HOST must not contain credentials, a query or a hash");
  }
  return { key, projectId, host: `${url.origin}${url.pathname.replace(/\/+$/, "")}` };
}

/** Pure: one HogQL query per report section. `days` is checked as an integer before interpolation. */
export function buildQueries(days: number): Record<QueryName, string> {
  const window = `timestamp > now() - INTERVAL ${checkDays(days)} DAY`;
  const limit = `LIMIT ${QUERY_LIMIT}`;
  const p75 = (prop: string) => `quantile(0.75)(toFloat(properties.${prop}))`;
  return {
    top_views:
      `SELECT properties.component AS component, count() AS views FROM events ` +
      `WHERE event = '$pageview' AND properties.route_kind = 'item' AND ${window} ` +
      `GROUP BY component ORDER BY views DESC ${limit}`,
    zero_result_searches:
      `SELECT properties.query AS query, count() AS searches FROM events ` +
      `WHERE event = 'palette_search' AND toFloat(properties.result_count) = 0 AND ${window} ` +
      `GROUP BY query ORDER BY searches DESC ${limit}`,
    copies:
      `SELECT properties.component AS component, properties.snippet_kind AS snippet_kind, count() AS copies FROM events ` +
      `WHERE event = 'code_copied' AND ${window} ` +
      `GROUP BY component, snippet_kind ORDER BY copies DESC ${limit}`,
    install_copies:
      `SELECT properties.surface AS surface, count() AS copies FROM events ` +
      `WHERE event = 'install_command_copied' AND ${window} ` +
      `GROUP BY surface ORDER BY copies DESC ${limit}`,
    tweaked_props:
      `SELECT properties.component AS component, properties.prop AS prop, count() AS changes FROM events ` +
      `WHERE event = 'control_changed' AND ${window} ` +
      `GROUP BY component, prop ORDER BY changes DESC ${limit}`,
    theme_device:
      `SELECT properties.color_scheme AS color_scheme, properties.viewport_bucket AS viewport_bucket, count() AS views FROM events ` +
      `WHERE event = '$pageview' AND ${window} ` +
      `GROUP BY color_scheme, viewport_bucket ORDER BY views DESC ${limit}`,
    demo_errors:
      `SELECT properties.component AS component, properties.error_name AS error_name, ` +
      `properties.error_message AS error_message, count() AS errors FROM events ` +
      `WHERE event = 'demo_error' AND ${window} ` +
      `GROUP BY component, error_name, error_message ORDER BY errors DESC ${limit}`,
    web_vitals:
      `SELECT properties.$pathname AS path, ${p75("$web_vitals_LCP_value")} AS lcp, ` +
      `${p75("$web_vitals_INP_value")} AS inp, ${p75("$web_vitals_CLS_value")} AS cls, ` +
      `${p75("$web_vitals_FCP_value")} AS fcp, count() AS samples FROM events ` +
      `WHERE event = '$web_vitals' AND ${window} ` +
      `GROUP BY path ORDER BY lcp DESC ${limit}`,
    ttfb:
      `SELECT properties.route_kind AS route_kind, ${p75("value_ms")} AS ttfb, count() AS samples FROM events ` +
      `WHERE event = 'web_vital_ttfb' AND ${window} ` +
      `GROUP BY route_kind ORDER BY ttfb DESC ${limit}`,
    not_found:
      `SELECT properties.path AS path, count() AS hits FROM events ` +
      `WHERE event = 'route_not_found' AND ${window} ` +
      `GROUP BY path ORDER BY hits DESC ${limit}`,
    pick_views:
      `SELECT count() AS views FROM events ` +
      `WHERE event = '$pageview' AND properties.route_kind = 'picks' AND ${window} ${limit}`,
    pick_clicks:
      `SELECT properties.component AS component, properties.featured AS featured, properties.surface AS surface, ` +
      `count() AS clicks FROM events ` +
      `WHERE event = 'devs_pick_card_clicked' AND ${window} ` +
      `GROUP BY component, featured, surface ORDER BY clicks DESC ${limit}`,
    pick_filters:
      `SELECT properties.category AS category, count() AS changes FROM events ` +
      `WHERE event = 'devs_pick_filter_changed' AND ${window} ` +
      `GROUP BY category ORDER BY changes DESC ${limit}`,
    pick_surprises:
      `SELECT properties.component AS component, count() AS surprises FROM events ` +
      `WHERE event = 'devs_pick_surprise_clicked' AND ${window} ` +
      `GROUP BY component ORDER BY surprises DESC ${limit}`,
  };
}

export interface ComponentViews {
  component: string;
  views: number;
}
export interface ComponentCopies {
  component: string;
  views: number;
  copies: number;
  /** copies / views, or null without views */
  ratio: number | null;
}
export interface PropTweaks {
  component: string;
  prop: string;
  changes: number;
  /** share of all control changes for the component */
  share: number;
}
export interface PathVitals {
  path: string;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  samples: number;
}

export interface PickClicks {
  component: string;
  /** all card clicks, on the picks page and the home teaser */
  clicks: number;
  /** clicks while the card was featured */
  featuredClicks: number;
  /** clicks on the home teaser */
  homeClicks: number;
}
export interface PickInsights {
  /** Developer's Pick page views */
  views: number;
  /** every card click (both surfaces) */
  clicks: number;
  /** card clicks on the picks page itself */
  pageClicks: number;
  /** pageClicks / views, or null without views */
  clickThroughRate: number | null;
  /** most clicked first */
  byItem: PickClicks[];
  filters: { category: string; count: number }[];
  surprises: { component: string; count: number }[];
}

export interface Insights {
  /** every docs entry plus any other viewed slug, most viewed first */
  views: ComponentViews[];
  /** fewest views first (never-viewed entries included) */
  leastViewed: ComponentViews[];
  /** bottom-decile view count; components at or below it (and every zero) are "least viewed" */
  bottomDecileViews: number;
  zeroResultSearches: { query: string; count: number }[];
  /** per component code copies (all snippet kinds), most copied first */
  copies: ComponentCopies[];
  copiesByKind: { component: string | null; snippetKind: string; count: number }[];
  installCopies: { surface: string; count: number }[];
  tweakedProps: PropTweaks[];
  themeDevice: { colorScheme: string; viewport: string; count: number }[];
  demoErrors: { component: string; errorName: string; errorMessage: string; count: number }[];
  webVitals: PathVitals[];
  ttfb: { routeKind: string; p75: number | null; samples: number }[];
  notFound: { path: string; count: number }[];
  picks: PickInsights;
}

export interface Suggestion {
  score: number;
  title: string;
  detail: string;
}

/** Rows keyed by column name, so a reordered SELECT cannot shift values. */
function rowsOf(result: QueryResult | undefined): Record<string, unknown>[] {
  if (!result) return [];
  return result.results.map((row) => Object.fromEntries(result.columns.map((column, i) => [column, row[i]])));
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function count(value: unknown): number {
  return num(value) ?? 0;
}

function str(value: unknown, fallback = "(none)"): string {
  return typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : fallback;
}

const isTrue = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

function toPickInsights(results: Partial<Record<QueryName, QueryResult>>): PickInsights {
  const views = count(rowsOf(results.pick_views)[0]?.views);
  const items = new Map<string, PickClicks>();
  let clicks = 0;
  let pageClicks = 0;
  for (const row of rowsOf(results.pick_clicks)) {
    const n = count(row.clicks);
    const component = str(row.component);
    const item = items.get(component) ?? { component, clicks: 0, featuredClicks: 0, homeClicks: 0 };
    item.clicks += n;
    if (isTrue(row.featured)) item.featuredClicks += n;
    if (row.surface === "home") item.homeClicks += n;
    else if (row.surface === "picks") pageClicks += n;
    items.set(component, item);
    clicks += n;
  }
  const byItem = [...items.values()].sort((a, b) => b.clicks - a.clicks || a.component.localeCompare(b.component));
  return {
    views,
    clicks,
    pageClicks,
    clickThroughRate: views > 0 ? pageClicks / views : null,
    byItem,
    filters: rowsOf(results.pick_filters).map((row) => ({ category: str(row.category), count: count(row.changes) })),
    surprises: rowsOf(results.pick_surprises).map((row) => ({ component: str(row.component), count: count(row.surprises) })),
  };
}

/** Pure: shapes raw query results into report sections. `entries` lists the components that should be seen. */
export function toInsights(
  results: Partial<Record<QueryName, QueryResult>>,
  entries: readonly Entry[] = ENTRIES,
): Insights {
  const viewMap = new Map<string, number>();
  for (const entry of entries) if (entry.docs) viewMap.set(entry.name, 0);
  for (const row of rowsOf(results.top_views)) {
    if (typeof row.component !== "string" || row.component === "") continue;
    viewMap.set(row.component, (viewMap.get(row.component) ?? 0) + count(row.views));
  }
  const views = [...viewMap].map(([component, v]) => ({ component, views: v }));
  views.sort((a, b) => b.views - a.views || a.component.localeCompare(b.component));
  const ascending = [...views].reverse();
  const bottomDecileViews =
    ascending.length === 0 ? 0 : (ascending[Math.floor(ascending.length * BOTTOM_DECILE)]?.views ?? 0);
  const leastViewed = ascending.filter((v) => v.views === 0 || v.views <= bottomDecileViews);

  const copiesByKind = rowsOf(results.copies).map((row) => ({
    component: typeof row.component === "string" && row.component !== "" ? row.component : null,
    snippetKind: str(row.snippet_kind),
    count: count(row.copies),
  }));
  const copyMap = new Map<string, number>();
  for (const row of copiesByKind) {
    if (row.component !== null) copyMap.set(row.component, (copyMap.get(row.component) ?? 0) + row.count);
  }
  const copies = views
    .filter((v) => v.views > 0 || copyMap.has(v.component))
    .map((v) => {
      const c = copyMap.get(v.component) ?? 0;
      return { component: v.component, views: v.views, copies: c, ratio: v.views > 0 ? c / v.views : null };
    })
    .sort((a, b) => b.copies - a.copies || b.views - a.views || a.component.localeCompare(b.component));

  const tweakRows = rowsOf(results.tweaked_props).map((row) => ({
    component: str(row.component),
    prop: str(row.prop),
    changes: count(row.changes),
  }));
  const tweakTotals = new Map<string, number>();
  for (const row of tweakRows) tweakTotals.set(row.component, (tweakTotals.get(row.component) ?? 0) + row.changes);
  const tweakedProps = tweakRows
    .map((row) => {
      const total = tweakTotals.get(row.component) ?? 0;
      return { ...row, share: total > 0 ? row.changes / total : 0 };
    })
    .sort((a, b) => b.changes - a.changes);

  return {
    views,
    leastViewed,
    bottomDecileViews,
    zeroResultSearches: rowsOf(results.zero_result_searches)
      .map((row) => ({ query: str(row.query, ""), count: count(row.searches) }))
      .filter((row) => row.query !== ""),
    copies,
    copiesByKind,
    installCopies: rowsOf(results.install_copies).map((row) => ({ surface: str(row.surface), count: count(row.copies) })),
    tweakedProps,
    themeDevice: rowsOf(results.theme_device).map((row) => ({
      colorScheme: str(row.color_scheme, "unknown"),
      viewport: str(row.viewport_bucket, "unknown"),
      count: count(row.views),
    })),
    demoErrors: rowsOf(results.demo_errors).map((row) => ({
      component: str(row.component),
      errorName: str(row.error_name),
      errorMessage: str(row.error_message, ""),
      count: count(row.errors),
    })),
    webVitals: rowsOf(results.web_vitals).map((row) => ({
      path: str(row.path),
      lcp: num(row.lcp),
      inp: num(row.inp),
      cls: num(row.cls),
      fcp: num(row.fcp),
      samples: count(row.samples),
    })),
    ttfb: rowsOf(results.ttfb).map((row) => ({
      routeKind: str(row.route_kind),
      p75: num(row.ttfb),
      samples: count(row.samples),
    })),
    notFound: rowsOf(results.not_found).map((row) => ({ path: str(row.path), count: count(row.hits) })),
    picks: toPickInsights(results),
  };
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

function formatCls(value: number): string {
  return value.toFixed(3);
}

/** Pure: rule-based suggestions, highest score first. */
export function suggest(insights: Insights): Suggestion[] {
  const out: Suggestion[] = [];

  for (const error of insights.demoErrors) {
    if (error.count < 1) continue;
    out.push({
      score: WEIGHTS.demoError + error.count,
      title: `Fix the ${error.component} demo (${error.errorName})`,
      detail: `${error.count} demo error(s)${error.errorMessage ? `: ${error.errorMessage}` : ""}.`,
    });
  }

  const perf = (path: string, metric: string, value: number | null, limit: number, format: (n: number) => string) => {
    if (value === null || value <= limit) return;
    out.push({
      score: WEIGHTS.perf + Math.min(Math.round((value / limit - 1) * 10), 30),
      title: `Improve ${metric} on ${path}`,
      detail: `p75 ${metric} is ${format(value)} (target <= ${format(limit)}).`,
    });
  };
  for (const page of insights.webVitals) {
    perf(page.path, "LCP", page.lcp, VITALS_P75.lcp, formatMs);
    perf(page.path, "INP", page.inp, VITALS_P75.inp, formatMs);
    perf(page.path, "CLS", page.cls, VITALS_P75.cls, formatCls);
  }
  for (const row of insights.ttfb) perf(`${row.routeKind} routes`, "TTFB", row.p75, VITALS_P75.ttfb, formatMs);

  for (const row of insights.notFound) {
    if (row.count < MIN_NOT_FOUND_COUNT) continue;
    out.push({
      score: WEIGHTS.notFound + row.count,
      title: `Fix links to ${row.path} or add a redirect`,
      detail: `${row.count} visits ended on the not-found page at this path.`,
    });
  }

  for (const row of insights.zeroResultSearches) {
    if (row.count < MIN_ZERO_RESULT_COUNT) continue;
    out.push({
      score: WEIGHTS.zeroResult + row.count,
      title: `Searches for "${row.query}" find nothing`,
      detail: `${row.count} palette searches returned 0 results: consider a new component or a keyword alias.`,
    });
  }

  for (const row of insights.copies) {
    if (row.views < MIN_VIEWS || row.ratio === null || row.ratio >= LOW_COPY_RATIO) continue;
    out.push({
      score: WEIGHTS.lowCopy + Math.min(Math.floor(row.views / 10), 50),
      title: `Improve the ${row.component} docs, demo or snippet`,
      detail: `${row.views} views but ${row.copies} code copies (${(row.ratio * 100).toFixed(1)}% < ${LOW_COPY_RATIO * 100}%).`,
    });
  }

  const tweakTotals = new Map<string, number>();
  for (const row of insights.tweakedProps) tweakTotals.set(row.component, (tweakTotals.get(row.component) ?? 0) + row.changes);
  const promoted = new Set<string>();
  for (const row of insights.tweakedProps) {
    // tweakedProps is sorted by changes, so the first row per component is its top prop.
    if (promoted.has(row.component)) continue;
    promoted.add(row.component);
    if ((tweakTotals.get(row.component) ?? 0) < MIN_TWEAKS || row.share < PROP_SHARE) continue;
    out.push({
      score: WEIGHTS.promoteProp + Math.round(row.share * 10),
      title: `Promote the ${row.component} "${row.prop}" prop to an example or default`,
      detail: `${Math.round(row.share * 100)}% of ${row.component} control changes (${row.changes}) touch "${row.prop}".`,
    });
  }

  if (insights.leastViewed.length > 0) {
    const names = insights.leastViewed.slice(0, 10).map((v) => v.component);
    const more = insights.leastViewed.length - names.length;
    const never = insights.leastViewed.filter((v) => v.views === 0).length;
    out.push({
      score: WEIGHTS.discoverability,
      title: `Improve discoverability of ${insights.leastViewed.length} least-viewed component(s)`,
      detail:
        `${never} never viewed; bottom decile is <= ${insights.bottomDecileViews} views. ` +
        `Start with: ${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}. ` +
        "Link them from related pages, the gallery or palette keywords.",
    });
  }

  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

/** Escapes a value for a Markdown table cell (data comes from visitors' searches and URLs). */
function cell(value: string | number | null): string {
  if (value === null) return "-";
  return String(value)
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/[`*]/g, "\\$&");
}

function table(headers: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  if (rows.length === 0) return "_No data in this window._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

const TOP_ROWS = 20;

function round(value: number | null, digits = 0): number | null {
  return value === null ? null : Number(value.toFixed(digits));
}

/** Pure: the report text (what main() writes). */
export function renderMarkdown(
  insights: Insights,
  suggestions: readonly Suggestion[],
  { days, date }: { days: number; date: string },
): string {
  const viewed = insights.views.filter((v) => v.views > 0);
  const sections: [string, string][] = [
    ["Top components by views", table(["Component", "Views"], viewed.slice(0, TOP_ROWS).map((v) => [v.component, v.views]))],
    [
      "Least-viewed components",
      table(["Component", "Views"], insights.leastViewed.slice(0, TOP_ROWS * 2).map((v) => [v.component, v.views])) +
        (insights.leastViewed.length > TOP_ROWS * 2 ? `\n\n${insights.leastViewed.length - TOP_ROWS * 2} more not shown.` : ""),
    ],
    [
      "Zero-result searches",
      table(["Query", "Searches"], insights.zeroResultSearches.slice(0, TOP_ROWS).map((r) => [r.query, r.count])),
    ],
    [
      "Most-copied components",
      table(
        ["Component", "Code copies", "Views", "Copies per view"],
        insights.copies
          .filter((r) => r.copies > 0)
          .slice(0, TOP_ROWS)
          .map((r) => [r.component, r.copies, r.views, r.ratio === null ? null : r.ratio.toFixed(2)]),
      ) +
        "\n\nBy snippet kind:\n\n" +
        table(
          ["Component", "Snippet kind", "Copies"],
          insights.copiesByKind.slice(0, TOP_ROWS).map((r) => [r.component ?? "(page)", r.snippetKind, r.count]),
        ) +
        "\n\nInstall command copies:\n\n" +
        table(["Surface", "Copies"], insights.installCopies.map((r) => [r.surface, r.count])),
    ],
    [
      "Most-tweaked props",
      table(
        ["Component", "Prop", "Changes", "Share of component"],
        insights.tweakedProps.slice(0, TOP_ROWS).map((r) => [r.component, r.prop, r.changes, `${Math.round(r.share * 100)}%`]),
      ),
    ],
    [
      "Theme and device split",
      table(["Color scheme", "Viewport", "Page views"], insights.themeDevice.map((r) => [r.colorScheme, r.viewport, r.count])),
    ],
    [
      "Demo errors",
      table(
        ["Component", "Error", "Message", "Count"],
        insights.demoErrors.map((r) => [r.component, r.errorName, r.errorMessage, r.count]),
      ),
    ],
    [
      "Slowest pages (Web Vitals p75)",
      table(
        ["Path", "LCP ms", "INP ms", "CLS", "FCP ms", "Samples"],
        insights.webVitals
          .slice(0, TOP_ROWS)
          .map((r) => [r.path, round(r.lcp), round(r.inp), round(r.cls, 3), round(r.fcp), r.samples]),
      ) +
        "\n\nTime to first byte:\n\n" +
        table(["Route kind", "TTFB p75 ms", "Samples"], insights.ttfb.map((r) => [r.routeKind, round(r.p75), r.samples])),
    ],
    ["404s", table(["Path", "Hits"], insights.notFound.slice(0, TOP_ROWS).map((r) => [r.path, r.count]))],
    [
      "Developer's Pick",
      `${insights.picks.views} page views, ${insights.picks.clicks} card clicks (${insights.picks.pageClicks} on the picks page), ` +
        `click-through ${
          insights.picks.clickThroughRate === null ? "n/a" : `${(insights.picks.clickThroughRate * 100).toFixed(1)}%`
        }.` +
        "\n\nMost-clicked picks:\n\n" +
        table(
          ["Component", "Clicks", "Featured clicks", "Home teaser clicks"],
          insights.picks.byItem.slice(0, TOP_ROWS).map((r) => [r.component, r.clicks, r.featuredClicks, r.homeClicks]),
        ) +
        "\n\nFilters:\n\n" +
        table(["Category", "Changes"], insights.picks.filters.map((r) => [r.category, r.count])) +
        "\n\nSurprise me picks:\n\n" +
        table(["Component", "Surprises"], insights.picks.surprises.slice(0, TOP_ROWS).map((r) => [r.component, r.count])),
    ],
    [
      "Suggested improvements",
      suggestions.length === 0
        ? "_No rule fired in this window._"
        : suggestions.map((s, i) => `${i + 1}. **${cell(s.title)}** (score ${s.score}): ${cell(s.detail)}`).join("\n"),
    ],
  ];
  return [
    `# Dashboard insights ${date}`,
    "",
    `Window: the last ${days} day(s) up to ${date}. All numbers are aggregate event counts. Cookieless ` +
      "(anonymous-tier) visitors are hashed per day, so one person on several days counts as several visitors.",
    "",
    ...sections.flatMap(([title, body]) => [`## ${title}`, "", body, ""]),
  ].join("\n");
}

/** Removes every occurrence of `secret` from text that is about to be printed. */
function redact(text: string, secret: string): string {
  return secret === "" ? text : text.split(secret).join("[redacted]");
}

async function runQuery(env: ReportEnv, name: QueryName, query: string): Promise<QueryResult> {
  const url = `${env.host}/api/projects/${env.projectId}/query/`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.key}` },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query }, name: `analytics-report ${name}` }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`query ${name} failed: ${redact(message, env.key)}`);
  }
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`query ${name} failed with HTTP ${response.status}: ${redact(body.slice(0, 300), env.key)}`);
  }
  let json: Partial<QueryResult>;
  try {
    json = JSON.parse(body) as Partial<QueryResult>;
  } catch {
    throw new Error(`query ${name} returned a response that is not JSON`);
  }
  return { columns: Array.isArray(json.columns) ? json.columns : [], results: Array.isArray(json.results) ? json.results : [] };
}

function fail(message: string, usage: boolean): never {
  console.error(`analytics-report: ${message}`);
  if (usage) console.error(USAGE);
  process.exit(1);
}

async function main(): Promise<void> {
  let days: number;
  let env: ReportEnv;
  try {
    days = parseArgs(process.argv.slice(2)).days;
    env = readEnv(process.env);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), true);
  }
  const queries = buildQueries(days);
  const results: Partial<Record<QueryName, QueryResult>> = {};
  try {
    for (const name of QUERY_NAMES) results[name] = await runQuery(env, name, queries[name]);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), false);
  }
  const insights = toInsights(results);
  const date = new Date().toISOString().slice(0, 10);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = resolve(root, "analytics", `insights-${date}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderMarkdown(insights, suggest(insights), { days, date }));
  console.log(out);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
