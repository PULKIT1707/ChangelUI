// The pure parts of scripts/analytics-report.ts. main() is never called, so nothing touches the network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HOST,
  MIN_VIEWS,
  QUERY_NAMES,
  WEIGHTS,
  buildQueries,
  parseArgs,
  readEnv,
  renderMarkdown,
  suggest,
  toInsights,
} from "../scripts/analytics-report.ts";
import { ENTRIES } from "../scripts/entries.ts";
import { FIXTURE_ENTRIES, FIXTURE_RESULTS } from "./fixtures/analytics-report.ts";

const fetchSpy = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("parseArgs", () => {
  it("defaults to 30 days and reads --days", () => {
    expect(parseArgs([])).toEqual({ days: 30 });
    expect(parseArgs(["--days", "7"])).toEqual({ days: 7 });
    expect(parseArgs(["--days=365"])).toEqual({ days: 365 });
  });

  it.each([["0"], ["abc"], ["400"], ["1.5"], ["-3"]])("rejects --days %s", (value) => {
    expect(() => parseArgs(["--days", value])).toThrow(/--days must be an integer from 1 to 365/);
  });

  it("rejects a missing value and unknown arguments", () => {
    expect(() => parseArgs(["--days"])).toThrow(/--days/);
    expect(() => parseArgs(["--verbose"])).toThrow(/Unknown argument/);
  });
});

describe("readEnv", () => {
  const key = "phx_secret_value_123";

  it("names every missing variable without printing values", () => {
    expect(() => readEnv({})).toThrow("Missing environment variable(s): POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID");
    let message = "";
    try {
      readEnv({ POSTHOG_PERSONAL_API_KEY: key });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("POSTHOG_PROJECT_ID");
    expect(message).not.toContain("POSTHOG_PERSONAL_API_KEY");
    expect(message).not.toContain(key);
  });

  it("defaults the host to the EU private API host", () => {
    expect(readEnv({ POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "42" })).toEqual({
      key,
      projectId: "42",
      host: DEFAULT_HOST,
    });
    expect(DEFAULT_HOST).toBe("https://eu.posthog.com");
    expect(readEnv({ POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "42", POSTHOG_HOST: "https://us.posthog.com/" }).host).toBe(
      "https://us.posthog.com",
    );
  });

  it("rejects a non-numeric project id and an http host without echoing values", () => {
    const errors: string[] = [];
    for (const env of [
      { POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "12a" },
      { POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "1", POSTHOG_HOST: "http://eu.posthog.com" },
      { POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "1", POSTHOG_HOST: "not a url" },
    ]) {
      expect(() => readEnv(env)).toThrow();
      try {
        readEnv(env);
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    expect(errors[0]).toMatch(/POSTHOG_PROJECT_ID must contain digits only/);
    expect(errors[1]).toMatch(/POSTHOG_HOST must be an https URL/);
    for (const message of errors) {
      expect(message).not.toContain(key);
      expect(message).not.toContain("12a");
      expect(message).not.toContain("http://eu.posthog.com");
    }
  });

  it("allows http only for a local host", () => {
    const env = { POSTHOG_PERSONAL_API_KEY: key, POSTHOG_PROJECT_ID: "1" };
    expect(readEnv({ ...env, POSTHOG_HOST: "http://127.0.0.1:8000" }).host).toBe("http://127.0.0.1:8000");
    expect(readEnv({ ...env, POSTHOG_HOST: "http://localhost:8000" }).host).toBe("http://localhost:8000");
  });
});

describe("buildQueries", () => {
  it("builds one HogQL query per section with the window and an explicit LIMIT", () => {
    const queries = buildQueries(7);
    expect(Object.keys(queries).sort()).toEqual([...QUERY_NAMES].sort());
    for (const query of Object.values(queries)) {
      expect(query).toContain("timestamp > now() - INTERVAL 7 DAY");
      expect(query).toMatch(/\bLIMIT \d+$/);
    }
    expect(queries.top_views).toContain("properties.route_kind = 'item'");
    expect(queries.web_vitals).toContain("quantile(0.75)(toFloat(properties.$web_vitals_LCP_value))");
    expect(queries.ttfb).toContain("quantile(0.75)(toFloat(properties.value_ms))");
  });

  it("queries the Developer's Pick page views and events", () => {
    const queries = buildQueries(7);
    expect(queries.pick_views).toContain("event = '$pageview' AND properties.route_kind = 'picks'");
    expect(queries.pick_clicks).toContain("event = 'devs_pick_card_clicked'");
    expect(queries.pick_clicks).toContain("GROUP BY component, featured, surface");
    expect(queries.pick_filters).toContain("event = 'devs_pick_filter_changed'");
    expect(queries.pick_surprises).toContain("event = 'devs_pick_surprise_clicked'");
  });

  it("refuses a non-integer window before interpolating", () => {
    expect(() => buildQueries(Number.NaN)).toThrow();
    expect(() => buildQueries(0)).toThrow();
    expect(() => buildQueries(1.5)).toThrow();
  });
});

describe("toInsights and suggest", () => {
  const insights = toInsights(FIXTURE_RESULTS, FIXTURE_ENTRIES);
  const suggestions = suggest(insights);
  const titles = suggestions.map((s) => s.title);

  it("includes never-viewed docs entries and skips entries without docs", () => {
    expect(insights.views.map((v) => v.component)).toEqual(["button", "card", "dialog", "tabs", "kbd", "rating"]);
    expect(insights.leastViewed[0]).toEqual({ component: "rating", views: 0 });
    expect(insights.views.some((v) => v.component === "theme-script")).toBe(false);
  });

  it("lists every never-viewed real entry", () => {
    const real = toInsights({}, ENTRIES);
    expect(real.leastViewed.length).toBe(ENTRIES.filter((e) => e.docs).length);
    expect(real.leastViewed.map((v) => v.component)).toContain("button");
  });

  it("fires every rule on the fixture data", () => {
    expect(titles).toEqual(
      expect.arrayContaining([
        "Fix the dialog demo (TypeError)",
        "Improve LCP on /components/card",
        "Improve INP on /components/button",
        "Improve CLS on /components/button",
        "Improve TTFB on item routes",
        "Fix links to /components/buton or add a redirect",
        'Searches for "date range" find nothing',
        "Improve the card docs, demo or snippet",
        'Promote the button "variant" prop to an example or default',
        "Improve discoverability of 1 least-viewed component(s)",
      ]),
    );
    expect(suggestions).toHaveLength(10);
  });

  it("orders by score, demo errors first", () => {
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1]!.score).toBeGreaterThanOrEqual(suggestions[i]!.score);
    }
    expect(suggestions[0]!.title).toBe("Fix the dialog demo (TypeError)");
    expect(suggestions[0]!.score).toBe(WEIGHTS.demoError + 3);
    expect(suggestions.at(-1)!.title).toMatch(/^Improve discoverability/);
  });

  it("applies thresholds", () => {
    // tabs has 0 copies but fewer than MIN_VIEWS views; dialog copies 8% of views.
    expect(insights.copies.find((c) => c.component === "tabs")!.views).toBeLessThan(MIN_VIEWS);
    expect(titles.some((t) => t.includes("tabs docs") || t.includes("dialog docs"))).toBe(false);
    expect(titles.some((t) => t.includes('"xyz"') || t.includes("/x ") || t.includes("card \"padding\""))).toBe(false);
    expect(titles.some((t) => t.includes("on /components/card") && !t.includes("LCP"))).toBe(false);
    expect(titles).not.toContain("Improve TTFB on home routes");
  });
});

describe("Developer's Pick insights", () => {
  it("splits clicks by item, featured and surface and computes the click-through", () => {
    const { picks } = toInsights(FIXTURE_RESULTS, FIXTURE_ENTRIES);
    expect(picks.views).toBe(40);
    expect(picks.clicks).toBe(15);
    expect(picks.pageClicks).toBe(10);
    expect(picks.clickThroughRate).toBeCloseTo(0.25);
    expect(picks.byItem).toEqual([
      { component: "dot-globe", clicks: 9, featuredClicks: 9, homeClicks: 3 },
      { component: "glitch-text", clicks: 4, featuredClicks: 0, homeClicks: 0 },
      { component: "aurora-background", clicks: 2, featuredClicks: 2, homeClicks: 2 },
    ]);
    expect(picks.filters).toEqual([
      { category: "text", count: 5 },
      { category: "all", count: 2 },
    ]);
    expect(picks.surprises).toEqual([{ component: "confetti", count: 3 }]);
  });

  it("has no click-through without views", () => {
    const { picks } = toInsights({ pick_clicks: FIXTURE_RESULTS.pick_clicks }, FIXTURE_ENTRIES);
    expect(picks.views).toBe(0);
    expect(picks.clickThroughRate).toBeNull();
    expect(toInsights({}, []).picks).toEqual({
      views: 0,
      clicks: 0,
      pageClicks: 0,
      clickThroughRate: null,
      byItem: [],
      filters: [],
      surprises: [],
    });
  });
});

describe("renderMarkdown", () => {
  const insights = toInsights(FIXTURE_RESULTS, FIXTURE_ENTRIES);
  const suggestions = suggest(insights);
  const text = renderMarkdown(insights, suggestions, { days: 7, date: "2026-01-01" });

  it("has the header and all ten sections", () => {
    expect(text).toMatch(/^# Dashboard insights 2026-01-01\n/);
    expect(text).toContain("the last 7 day(s) up to 2026-01-01");
    expect(text).toContain("hashed per day");
    for (const heading of [
      "Top components by views",
      "Least-viewed components",
      "Zero-result searches",
      "Most-copied components",
      "Most-tweaked props",
      "Theme and device split",
      "Demo errors",
      "Slowest pages (Web Vitals p75)",
      "404s",
      "Suggested improvements",
    ]) {
      expect(text).toContain(`\n## ${heading}\n`);
    }
  });

  it("numbers the suggestions highest score first and escapes table cells", () => {
    const list = text.slice(text.indexOf("## Suggested improvements"));
    expect(list).toContain("1. **Fix the dialog demo (TypeError)** (score 103)");
    expect(list).toContain(`${suggestions.length}. **Improve discoverability`);
    expect(text).toContain("| dialog | TypeError | x is undefined \\| bad | 3 |");
  });

  it("has a Developer's Pick section before the suggestions", () => {
    expect(text).toContain("\n## Developer's Pick\n");
    expect(text.indexOf("## Developer's Pick")).toBeLessThan(text.indexOf("## Suggested improvements"));
    expect(text).toContain("40 page views, 15 card clicks (10 on the picks page), click-through 25.0%.");
    expect(text).toContain("Most-clicked picks:");
    expect(text).toContain("| dot-globe | 9 | 9 | 3 |");
    expect(text).toContain("| text | 5 |");
    expect(text).toContain("Surprise me picks:");
    expect(text).toContain("| confetti | 3 |");
  });

  it("says when a section has no data", () => {
    const empty = renderMarkdown(toInsights({}, []), [], { days: 30, date: "2026-01-01" });
    expect(empty).toContain("_No data in this window._");
    expect(empty).toContain("_No rule fired in this window._");
    expect(empty).toContain("\n## Developer's Pick\n");
    expect(empty).toContain("click-through n/a.");
  });
});
