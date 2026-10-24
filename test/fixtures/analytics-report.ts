// Fixture PostHog query responses for test/analytics-report.test.ts (shaped like the HogQL query API:
// `columns` plus rows as arrays). Every suggestion rule fires on this data exactly where noted.
import type { QueryName, QueryResult } from "../../scripts/analytics-report.ts";
import type { Entry } from "../../scripts/entries.ts";

function entry(name: string, docs = true): Entry {
  return { name, title: name, category: "components", file: `src/components/${name}.tsx`, client: true, docs };
}

/** "rating" is never viewed; "theme-script" has no docs page and must not be listed. */
export const FIXTURE_ENTRIES: readonly Entry[] = [
  entry("button"),
  entry("card"),
  entry("dialog"),
  entry("tabs"),
  entry("kbd"),
  entry("rating"),
  entry("theme-script", false),
];

export const FIXTURE_RESULTS: Record<QueryName, QueryResult> = {
  top_views: {
    columns: ["component", "views"],
    results: [
      ["button", 200],
      ["card", 50],
      ["dialog", 25],
      ["tabs", 10], // below MIN_VIEWS: ignored by the copy-ratio rule even with 0 copies
      ["kbd", 1],
    ],
  },
  zero_result_searches: {
    columns: ["query", "searches"],
    results: [
      ["date range", 3], // fires
      ["xyz", 1], // below MIN_ZERO_RESULT_COUNT
    ],
  },
  copies: {
    columns: ["component", "snippet_kind", "copies"],
    results: [
      ["button", "usage", 30],
      ["button", "install", 5],
      [null, "config", 4],
      ["dialog", "usage", 2], // 2 / 25 = 8%: above LOW_COPY_RATIO
      ["card", "usage", 1], // 1 / 50 = 2%: fires
    ],
  },
  install_copies: {
    columns: ["surface", "copies"],
    results: [
      ["home", 7],
      ["palette", 2],
    ],
  },
  tweaked_props: {
    columns: ["component", "prop", "changes"],
    results: [
      ["button", "variant", 8], // 8 / 12 = 67%: fires
      ["button", "size", 3],
      ["button", "disabled", 1],
      ["card", "padding", 2], // fewer than MIN_TWEAKS changes for card
    ],
  },
  theme_device: {
    columns: ["color_scheme", "viewport_bucket", "views"],
    results: [
      ["dark", "desktop", 120],
      ["light", "mobile", 40],
    ],
  },
  demo_errors: {
    columns: ["component", "error_name", "error_message", "errors"],
    results: [["dialog", "TypeError", "x is undefined | bad", 3]],
  },
  web_vitals: {
    columns: ["path", "lcp", "inp", "cls", "fcp", "samples"],
    results: [
      ["/components/card", 3200, 150, 0.02, 1500, 30], // LCP fires
      ["/components/button", "1800", 260, 0.15, null, 12], // INP and CLS fire; a string value parses
    ],
  },
  ttfb: {
    columns: ["route_kind", "ttfb", "samples"],
    results: [
      ["item", 950, 40], // fires
      ["home", 300, 20],
    ],
  },
  not_found: {
    columns: ["path", "hits"],
    results: [
      ["/components/buton", 4], // fires
      ["/x", 1],
    ],
  },
  pick_views: { columns: ["views"], results: [[40]] },
  pick_clicks: {
    columns: ["component", "featured", "surface", "clicks"],
    results: [
      ["dot-globe", true, "picks", 6],
      ["dot-globe", "true", "home", 3], // a string boolean still counts as featured
      ["glitch-text", false, "picks", 4],
      ["aurora-background", 1, "home", 2],
    ],
  },
  pick_filters: {
    columns: ["category", "changes"],
    results: [
      ["text", 5],
      ["all", 2],
    ],
  },
  pick_surprises: {
    columns: ["component", "surprises"],
    results: [["confetti", 3]],
  },
};
