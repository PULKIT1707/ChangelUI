import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { parseHash } from "../../router";
import { ANONYMOUS_EVENTS, redactErrorMessage, sanitizeErrorName, sanitizeNotFoundPath, truncateQuery } from "./events";
import { hashPath, sanitizeEvent, sanitizeReferrer, sanitizeUrl, viewportBucket, type SanitizeContext } from "./sanitize";

const ORIGIN = "https://pui.example";
const ctx = (overrides: Partial<SanitizeContext> = {}): SanitizeContext => ({
  tier: "anonymous",
  width: 1280,
  colorScheme: "dark",
  origin: ORIGIN,
  isNotFound: (hash) => parseHash(hash).kind === "notFound",
  ...overrides,
});
const event = (name: string, properties: CaptureResult["properties"] = {}): CaptureResult => ({
  uuid: "00000000-0000-0000-0000-000000000000",
  event: name,
  properties,
});

describe("viewportBucket", () => {
  it("buckets by the dashboard breakpoints", () => {
    expect(viewportBucket(360)).toBe("mobile");
    expect(viewportBucket(639)).toBe("mobile");
    expect(viewportBucket(640)).toBe("tablet");
    expect(viewportBucket(1023)).toBe("tablet");
    expect(viewportBucket(1024)).toBe("desktop");
  });
});

describe("URL helpers", () => {
  it("hashPath returns the router path", () => {
    expect(hashPath(`${ORIGIN}/#/components/button?tab=code`)).toBe("/components/button");
    expect(hashPath(`${ORIGIN}/`)).toBe("/");
    expect(hashPath(`${ORIGIN}/#/`)).toBe("/");
    expect(hashPath("not a url")).toBe("/");
  });

  it("sanitizeUrl drops the real query and non-allowlisted hash params", () => {
    expect(sanitizeUrl(`${ORIGIN}/docs/?utm_source=x&email=a@b.co#/components/button?tab=code&secret=1`)).toBe(
      `${ORIGIN}/docs/#/components/button?tab=code`,
    );
    expect(sanitizeUrl(`${ORIGIN}/#/?filter=text&tag=forms&group=hero&intent=trend`)).toBe(
      `${ORIGIN}/#/?filter=text&tag=forms&group=hero&intent=trend`,
    );
    expect(sanitizeUrl(`https://user:pw@pui.example/#/charts?intent=a%20b%40c.d`)).toBe(`${ORIGIN}/#/charts`);
    expect(sanitizeUrl(`${ORIGIN}/`)).toBe(`${ORIGIN}/#/`);
    expect(sanitizeUrl(`${ORIGIN}/#/anything`, true)).toBe(`${ORIGIN}/#/<not-found>`);
  });

  it("sanitizeReferrer keeps only the origin", () => {
    expect(sanitizeReferrer("https://www.google.com/search?q=private", ORIGIN)).toBe("https://www.google.com");
    expect(sanitizeReferrer(`${ORIGIN}/#/components/button`, ORIGIN)).toBe(ORIGIN);
    expect(sanitizeReferrer("/relative?x=1", ORIGIN)).toBe(ORIGIN);
    expect(sanitizeReferrer("", ORIGIN)).toBe("$direct");
    expect(sanitizeReferrer("$direct", ORIGIN)).toBe("$direct");
    expect(sanitizeReferrer(undefined, ORIGIN)).toBe("$direct");
    expect(sanitizeReferrer("android-app://com.example/", ORIGIN)).toBe("$direct");
  });
});

describe("sanitizeEvent", () => {
  it("allows only the catalog, $pageview and $web_vitals in the anonymous tier", () => {
    for (const name of ANONYMOUS_EVENTS) expect(sanitizeEvent(event(name), ctx())).not.toBeNull();
    for (const name of ["$autocapture", "$rageclick", "$dead_click", "$snapshot", "$$heatmap", "$heatmaps_data", "$exception", "$pageleave", "$opt_in", "$identify", "custom"]) {
      expect(sanitizeEvent(event(name), ctx())).toBeNull();
    }
  });

  it("passes everything in the full tier and nothing when off", () => {
    expect(sanitizeEvent(event("$autocapture"), ctx({ tier: "full" }))).not.toBeNull();
    expect(sanitizeEvent(event("$pageview"), ctx({ tier: "off" }))).toBeNull();
  });

  it("strips heatmap data in the anonymous tier only", () => {
    expect(sanitizeEvent(event("$pageview", { $heatmap_data: { x: 1 } }), ctx())?.properties).not.toHaveProperty("$heatmap_data");
    expect(sanitizeEvent(event("$pageview", { $heatmap_data: { x: 1 } }), ctx({ tier: "full" }))?.properties).toHaveProperty("$heatmap_data");
  });

  it("rewrites URLs and referrers and adds viewport and color scheme", () => {
    const result = sanitizeEvent(
      event("$pageview", {
        $current_url: `${ORIGIN}/?q=1#/components/button?tab=code&x=y`,
        $pathname: "/",
        $referrer: "https://news.example/item?id=123456",
        $referring_domain: "news.example",
        route_kind: "item",
      }),
      ctx({ width: 500, colorScheme: "light" }),
    );
    expect(result?.properties).toEqual({
      $current_url: `${ORIGIN}/#/components/button?tab=code`,
      $pathname: "/components/button",
      $referrer: "https://news.example",
      $referring_domain: "news.example",
      route_kind: "item",
      viewport_bucket: "mobile",
      color_scheme: "light",
    });
  });

  it("reports unknown routes as #/<not-found>", () => {
    const result = sanitizeEvent(
      event("route_not_found", { $current_url: `${ORIGIN}/#/my-name@example.com`, $pathname: "/" }),
      ctx(),
    );
    expect(result?.properties).toMatchObject({ $current_url: `${ORIGIN}/#/<not-found>`, $pathname: "/<not-found>" });
  });

  it("rewrites $initial_* and $session_entry_* in $set_once too", () => {
    const result = sanitizeEvent(
      {
        ...event("$pageview", {
          $session_entry_url: `${ORIGIN}/?a=1#/docs/theming?tab=code&z=1`,
          $session_entry_pathname: "/",
          $session_entry_referrer: "",
          $session_entry_referring_domain: "$direct",
        }),
        $set_once: {
          $initial_current_url: `${ORIGIN}/?a=1#/charts?intent=trend`,
          $initial_pathname: "/",
          $initial_referrer: "https://x.example/path?token=abc",
          $initial_referring_domain: "x.example",
        },
      },
      ctx({ tier: "full" }),
    );
    expect(result?.properties).toMatchObject({
      $session_entry_url: `${ORIGIN}/#/docs/theming?tab=code`,
      $session_entry_pathname: "/docs/theming",
      $session_entry_referrer: "$direct",
      $session_entry_referring_domain: "$direct",
    });
    expect(result?.$set_once).toEqual({
      $initial_current_url: `${ORIGIN}/#/charts?intent=trend`,
      $initial_pathname: "/charts",
      $initial_referrer: "https://x.example",
      $initial_referring_domain: "x.example",
    });
  });

  it("rewrites the URLs nested in each $web_vitals metric", () => {
    const raw = `${ORIGIN}/?leak=query#/components/button?tab=code&leak=hash`;
    const lcp = {
      name: "LCP",
      value: 1200,
      $current_url: raw,
      navigationURL: raw,
      attribution: { target: "p.lead", url: "https://cdn.example/hero.png?sig=secret#frag", timeToFirstByte: 80 },
    };
    const result = sanitizeEvent(
      event("$web_vitals", {
        $current_url: raw,
        $web_vitals_LCP_event: lcp,
        $web_vitals_LCP_value: 1200,
        $web_vitals_FCP_event: { name: "FCP", value: 900, $current_url: `${ORIGIN}/#/my-name@example.com` },
      }),
      ctx(),
    );
    const props = result?.properties ?? {};
    expect(props.$current_url).toBe(`${ORIGIN}/#/components/button?tab=code`);
    expect(props.$web_vitals_LCP_event).toEqual({
      name: "LCP",
      value: 1200,
      $current_url: `${ORIGIN}/#/components/button?tab=code`,
      navigationURL: `${ORIGIN}/#/components/button?tab=code`,
      attribution: { target: "p.lead", url: "https://cdn.example/hero.png", timeToFirstByte: 80 },
    });
    expect(props.$web_vitals_FCP_event).toMatchObject({ $current_url: `${ORIGIN}/#/<not-found>` });
    expect(JSON.stringify(props)).not.toContain("leak");
    expect(JSON.stringify(props)).not.toContain("secret");
    // The input metric object is left untouched.
    expect(lcp.navigationURL).toBe(raw);
  });

  it("does not mutate the input event", () => {
    const input = event("$pageview", { $current_url: `${ORIGIN}/?q=1#/` });
    sanitizeEvent(input, ctx());
    expect(input.properties).toEqual({ $current_url: `${ORIGIN}/?q=1#/` });
  });
});

describe("event helpers", () => {
  it("truncateQuery trims, lowercases and caps at 40", () => {
    expect(truncateQuery("  Date PICKER ")).toBe("date picker");
    expect(truncateQuery("x".repeat(60))).toHaveLength(40);
  });

  it("redactErrorMessage removes emails, URLs and long digit runs", () => {
    expect(redactErrorMessage("Failed for jane.doe@example.com at https://api.example/u/1?x=2 id 1234567 code 42")).toBe(
      "Failed for [redacted] at [redacted] id [redacted] code 42",
    );
    expect(redactErrorMessage("a\n\n  b")).toBe("a b");
    expect(redactErrorMessage("e".repeat(300))).toHaveLength(120);
  });

  it("sanitizeErrorName keeps a short identifier", () => {
    expect(sanitizeErrorName("TypeError")).toBe("TypeError");
    expect(sanitizeErrorName("Failed for jane@example.com")).toBe("Failedforjaneexamplecom");
    expect(sanitizeErrorName("E".repeat(100))).toHaveLength(40);
    expect(sanitizeErrorName("@@@")).toBe("Error");
  });

  it("sanitizeNotFoundPath keeps a short, safe path", () => {
    expect(sanitizeNotFoundPath("#/Components/My Thing?secret=1")).toBe("/components/mything");
    expect(sanitizeNotFoundPath("#/a@b.c/<script>")).toBe("/ab.c/script");
    expect(sanitizeNotFoundPath(`#/${"a".repeat(100)}`)).toHaveLength(64);
  });
});
