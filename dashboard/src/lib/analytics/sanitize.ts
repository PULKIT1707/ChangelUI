// Event sanitizer, run by posthog-js `before_send` on every event (analytics plan, decision 6).
// Pure: the client passes the live tier and page facts in. In the anonymous tier only the catalog
// events, $pageview and $web_vitals pass; in every tier URLs (including the copies nested in each
// $web_vitals metric) keep only the route and allowlisted hash params, and referrers keep only their origin.
import type { CaptureResult, Properties } from "posthog-js";
import type { Tier } from "./consent";
import { ANONYMOUS_EVENTS } from "./events";

/** Hash query params that carry router state (validated slugs), the only ones kept in URLs. */
export const HASH_PARAM_ALLOWLIST: readonly string[] = ["tab", "filter", "tag", "group", "intent"];
/** The hash path every unknown route is reported as, so typed-in paths never reach URLs. */
export const NOT_FOUND_HASH_PATH = "/<not-found>";
export const DIRECT = "$direct";

export type ViewportBucket = "mobile" | "tablet" | "desktop";
export type ColorScheme = "light" | "dark";

export interface SanitizeContext {
  tier: Tier;
  /** window.innerWidth. */
  width: number;
  colorScheme: ColorScheme;
  /** The site origin, used to resolve relative referrers. */
  origin: string;
  /** True when the URL hash is not a known route (the client passes the router's parser). */
  isNotFound?: (hash: string) => boolean;
}

const ANONYMOUS = new Set<string>(ANONYMOUS_EVENTS);
const PARAM_VALUE = /^[a-z0-9-]{1,40}$/i;

export function viewportBucket(width: number): ViewportBucket {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function parse(url: string, base?: string): URL | null {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
}

function pathOfHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryStart = raw.indexOf("?");
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart);
  if (path === "") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** The hash-router path of a URL: `https://x/#/components/button?tab=code` -> `/components/button`. */
export function hashPath(url: string): string {
  const parsed = parse(url);
  return pathOfHash(parsed ? parsed.hash : "");
}

function allowlistedParams(hash: string): string {
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return "";
  const kept = new URLSearchParams();
  for (const [name, value] of new URLSearchParams(hash.slice(queryStart + 1))) {
    if (HASH_PARAM_ALLOWLIST.includes(name) && PARAM_VALUE.test(value) && !kept.has(name)) kept.set(name, value);
  }
  const query = kept.toString();
  return query === "" ? "" : `?${query}`;
}

/**
 * origin + pathname + `#` + hash path + allowlisted hash params. The real `?query`, credentials and
 * every other hash param are dropped; an unknown route becomes `#/<not-found>`.
 */
export function sanitizeUrl(url: string, notFound = false): string {
  const parsed = parse(url);
  if (!parsed) return url.split(/[?#]/)[0] ?? "";
  const base = `${parsed.origin}${parsed.pathname}`;
  if (notFound) return `${base}#${NOT_FOUND_HASH_PATH}`;
  return `${base}#${pathOfHash(parsed.hash)}${allowlistedParams(parsed.hash)}`;
}

/** A referrer reduced to its origin, or `$direct` when empty, unparsable or not http(s). */
export function sanitizeReferrer(ref: unknown, ownOrigin: string): string {
  if (typeof ref !== "string" || ref === "" || ref === DIRECT) return DIRECT;
  const parsed = parse(ref, ownOrigin);
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) return DIRECT;
  return parsed.origin;
}

// PostHog sends the page facts under three prefixes: the event itself, `$initial_*` (first visit) and
// `$session_entry_*` (session start). Each group is rewritten the same way.
const URL_GROUPS = [
  { url: "$current_url", pathname: "$pathname", referrer: "$referrer", domain: "$referring_domain" },
  {
    url: "$initial_current_url",
    pathname: "$initial_pathname",
    referrer: "$initial_referrer",
    domain: "$initial_referring_domain",
  },
  {
    url: "$session_entry_url",
    pathname: "$session_entry_pathname",
    referrer: "$session_entry_referrer",
    domain: "$session_entry_referring_domain",
  },
] as const;

const isNotFoundUrl = (url: string, ctx: SanitizeContext) => ctx.isNotFound?.(parse(url)?.hash ?? "") ?? false;

/** A resource URL (LCP attribution) reduced to origin + path, or dropped when unparsable. */
function resourceUrl(url: string): string | undefined {
  const parsed = parse(url);
  return parsed ? `${parsed.origin}${parsed.pathname}` : undefined;
}

// posthog-js nests each metric under `$web_vitals_<METRIC>_event`, with its own copies of the page URL
// (`$current_url`, `navigationURL`) and, for LCP, the resource URL in `attribution.url`.
const WEB_VITAL_EVENT = /^\$web_vitals_[A-Z]+_event$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function rewriteWebVital(metric: Record<string, unknown>, ctx: SanitizeContext): Record<string, unknown> {
  const out: Record<string, unknown> = { ...metric };
  for (const key of ["$current_url", "navigationURL"]) {
    const url = out[key];
    if (typeof url === "string") out[key] = sanitizeUrl(url, isNotFoundUrl(url, ctx));
  }
  if (isRecord(out.attribution)) {
    const attribution: Record<string, unknown> = { ...out.attribution };
    if (typeof attribution.url === "string") {
      const url = resourceUrl(attribution.url);
      if (url === undefined) delete attribution.url;
      else attribution.url = url;
    }
    out.attribution = attribution;
  }
  return out;
}

function rewriteProperties(source: Properties, ctx: SanitizeContext): Properties {
  const props: Properties = { ...source };
  for (const [key, value] of Object.entries(props)) {
    if (WEB_VITAL_EVENT.test(key) && isRecord(value)) props[key] = rewriteWebVital(value, ctx);
  }
  for (const group of URL_GROUPS) {
    const url: unknown = props[group.url];
    if (typeof url === "string") {
      const notFound = isNotFoundUrl(url, ctx);
      props[group.url] = sanitizeUrl(url, notFound);
      if (group.pathname in props) props[group.pathname] = notFound ? NOT_FOUND_HASH_PATH : hashPath(url);
    }
    if (group.referrer in props) {
      const referrer = sanitizeReferrer(props[group.referrer], ctx.origin);
      props[group.referrer] = referrer;
      if (group.domain in props) props[group.domain] = referrer === DIRECT ? DIRECT : (parse(referrer)?.host ?? DIRECT);
    } else if (group.domain in props && typeof props[group.domain] === "string" && props[group.domain] !== DIRECT) {
      props[group.domain] = parse(`https://${String(props[group.domain])}`)?.host ?? DIRECT;
    }
  }
  return props;
}

/** before_send: the event to send, or null to drop it. */
export function sanitizeEvent(event: CaptureResult, ctx: SanitizeContext): CaptureResult | null {
  if (ctx.tier === "off") return null;
  if (ctx.tier === "anonymous" && !ANONYMOUS.has(event.event)) return null;
  const properties = rewriteProperties(event.properties, ctx);
  if (ctx.tier === "anonymous") delete properties.$heatmap_data;
  properties.viewport_bucket = viewportBucket(ctx.width);
  properties.color_scheme = ctx.colorScheme;
  const result: CaptureResult = { ...event, properties };
  if (event.$set) result.$set = rewriteProperties(event.$set, ctx);
  if (event.$set_once) result.$set_once = rewriteProperties(event.$set_once, ctx);
  return result;
}
