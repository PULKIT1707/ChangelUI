import { useSyncExternalStore } from "react";
import { CATEGORIES, type Category } from "../../scripts/entries";
import { isChartIntent, type ChartIntent } from "./lib/chart-catalog";
import { CATEGORY_LABELS } from "./lib/nav";
import { clampPickFilter, PICKS_TITLE } from "./lib/picks";
import { CATEGORY_TAGS, OTHER_TAG, tagSlug } from "./lib/tags";
import { registryMeta } from "./registry/meta";
import { TEMPLATE_GROUPS, templateMeta } from "./registry/templates";

// Hand-rolled hash router (design 10.1): no router dependency. Every hash input is validated here
// (design 9, dashboard external inputs), so pages never see an unknown category, slug, tab or filter.

export type Tab = "preview" | "code";
export type Filter = "all" | Category;
export type DocSlug = "installation" | "theming" | "themes" | "privacy";

export type Route =
  | { kind: "home"; tab: Tab; filter: Filter }
  | { kind: "docs"; category: "docs"; slug: DocSlug; tab: Tab; filter: Filter }
  /**
   * `#/<category>?tag=<tag-slug>`: the category gallery, optionally narrowed to one tag (null = all).
   * `#/charts?intent=<id>` narrows the chart chooser to one job; the key is only present when set.
   */
  | { kind: "category"; category: Category; tag: string | null; intent?: ChartIntent; tab: Tab; filter: Filter }
  | { kind: "item"; category: Category; slug: string; tab: Tab; filter: Filter }
  /** `#/templates?group=<group-slug>`: the copy-only templates gallery (roadmap I-10). */
  | { kind: "templates"; group: string | null; tab: Tab; filter: Filter }
  /** `#/templates/<slug>?tab=preview|code`. */
  | { kind: "template"; slug: string; tab: Tab; filter: Filter }
  /** `#/picks?filter=<category>`: the Developer's Pick showcase; filter is clamped to PICK_FILTERS. */
  | { kind: "picks"; tab: Tab; filter: Filter }
  | { kind: "notFound"; tab: Tab; filter: Filter };

export const DOC_PAGES: readonly { slug: DocSlug; title: string }[] = [
  { slug: "installation", title: "Installation" },
  { slug: "theming", title: "Theming" },
  { slug: "themes", title: "Themes" },
  { slug: "privacy", title: "Privacy" },
];

export const FILTERS: readonly Filter[] = ["all", ...CATEGORIES];

const isCategory = (value: string): value is Category => (CATEGORIES as readonly string[]).includes(value);
const isDocSlug = (value: string): value is DocSlug => DOC_PAGES.some((page) => page.slug === value);
const isFilter = (value: string | null): value is Filter =>
  value !== null && (FILTERS as readonly string[]).includes(value);

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Pure: `#/<category>/<slug>?tab=preview|code` and `#/?filter=<category>` to a validated Route. */
export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryStart = raw.indexOf("?");
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart);
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(queryStart === -1 ? "" : raw.slice(queryStart + 1));
  } catch {
    params = new URLSearchParams();
  }
  const tabParam = params.get("tab");
  const filterParam = params.get("filter");
  const tab: Tab = tabParam === "code" ? "code" : "preview";
  const filter: Filter = isFilter(filterParam) ? filterParam : "all";

  if (path !== "" && !path.startsWith("/")) return { kind: "notFound", tab, filter };
  const segments: string[] = [];
  for (const part of path.split("/")) {
    if (part === "") continue;
    const decoded = decode(part);
    if (decoded === null) return { kind: "notFound", tab, filter };
    segments.push(decoded);
  }
  if (segments.length === 0) return { kind: "home", tab, filter };
  if (segments[0] === "picks") {
    return segments.length === 1 ? { kind: "picks", tab, filter: clampPickFilter(filter) } : { kind: "notFound", tab, filter };
  }
  if (segments[0] === "templates") {
    if (segments.length === 1) {
      const groupParam = params.get("group");
      const group = TEMPLATE_GROUPS.map(tagSlug).find((value) => value === groupParam) ?? null;
      return { kind: "templates", group, tab, filter };
    }
    const slug = segments[1] ?? "";
    if (segments.length === 2 && templateMeta.some((meta) => meta.slug === slug)) return { kind: "template", slug, tab, filter };
    return { kind: "notFound", tab, filter };
  }
  if (segments.length === 1) {
    const [category = ""] = segments;
    if (!isCategory(category)) return { kind: "notFound", tab, filter };
    const tagParam = params.get("tag");
    const tag = [...CATEGORY_TAGS[category], OTHER_TAG].map(tagSlug).find((value) => value === tagParam) ?? null;
    const intentParam = params.get("intent");
    if (category === "charts" && isChartIntent(intentParam)) {
      return { kind: "category", category, tag, intent: intentParam, tab, filter };
    }
    return { kind: "category", category, tag, tab, filter };
  }
  if (segments.length !== 2) return { kind: "notFound", tab, filter };
  const [category = "", slug = ""] = segments;
  if (category === "docs" && isDocSlug(slug)) return { kind: "docs", category: "docs", slug, tab, filter };
  if (isCategory(category) && registryMeta.some((meta) => meta.category === category && meta.slug === slug)) {
    return { kind: "item", category, slug, tab, filter };
  }
  return { kind: "notFound", tab, filter };
}

export function homeHref(filter: Filter = "all"): string {
  return filter === "all" ? "#/" : `#/?filter=${filter}`;
}

export function docHref(slug: DocSlug): string {
  return `#/docs/${slug}`;
}

export function categoryHref(category: Category, tag: string | null = null): string {
  return tag === null ? `#/${category}` : `#/${category}?tag=${encodeURIComponent(tag)}`;
}

/** `#/charts`, optionally opened on one chooser intent. */
export function chartsHref(intent: ChartIntent | null = null): string {
  return intent === null ? "#/charts" : `#/charts?intent=${intent}`;
}

/** `#/picks`, optionally narrowed to one category. */
export function picksHref(filter: Filter = "all"): string {
  return filter === "all" ? "#/picks" : `#/picks?filter=${filter}`;
}

/** `#/templates`, optionally narrowed to one group (by tag slug). */
export function templatesHref(group: string | null = null): string {
  return group === null ? "#/templates" : `#/templates?group=${encodeURIComponent(group)}`;
}
export function templateHref(slug: string, tab: Tab = "preview"): string {
  const base = `#/templates/${encodeURIComponent(slug)}`;
  return tab === "code" ? `${base}?tab=code` : base;
}
export function itemHref(category: Category, slug: string, tab: Tab = "preview"): string {
  const base = `#/${category}/${encodeURIComponent(slug)}`;
  return tab === "code" ? `${base}?tab=code` : base;
}

/** Stable identity of the page (ignores ?tab, ?filter and ?tag), used for scroll/title/focus on navigation. */
export function routeKey(route: Route): string {
  if (route.kind === "category") return `category/${route.category}`;
  if (route.kind === "templates") return "templates";
  if (route.kind === "picks") return "picks";
  if (route.kind === "template") return `templates/${route.slug}`;
  if (route.kind === "item" || route.kind === "docs") return `${route.category}/${route.slug}`;
  return route.kind;
}

export function routeTitle(route: Route): string {
  switch (route.kind) {
    case "home":
      return "Home";
    case "docs":
      return DOC_PAGES.find((page) => page.slug === route.slug)?.title ?? "Docs";
    case "category":
      return CATEGORY_LABELS[route.category];
    case "item":
      return registryMeta.find((meta) => meta.slug === route.slug)?.title ?? route.slug;
    case "templates":
      return "Templates";
    case "picks":
      return PICKS_TITLE;
    case "template":
      return templateMeta.find((meta) => meta.slug === route.slug)?.title ?? route.slug;
    case "notFound":
      return "Page not found";
  }
}

export function navigate(href: string): void {
  window.location.hash = href.startsWith("#") ? href.slice(1) : href;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

/** The current hash, kept in sync through useSyncExternalStore. */
export function useHash(): string {
  return useSyncExternalStore(subscribe, getHash, getServerHash);
}

export function useRoute(): Route {
  return parseHash(useHash());
}
