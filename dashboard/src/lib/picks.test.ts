import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../../scripts/entries";
import { registryMeta } from "../registry/meta";
import type { RegistryMeta } from "../registry/types";
import {
  clampPickFilter,
  CREATIVE_SHOWPIECES,
  creativeItems,
  FEATURED_PICKS,
  filterPicks,
  hookFor,
  isCreative,
  isFeatured,
  orderPicks,
  PICK_FILTERS,
  PICK_HOOKS,
  pickRandom,
} from "./picks";

const fake = (slug: string, category: RegistryMeta["category"]): RegistryMeta => ({
  slug,
  title: slug,
  category,
  description: `${slug} description`,
  keywords: [],
  exports: [],
  replayable: false,
});

const picks = creativeItems(registryMeta);
const slugs = (items: readonly RegistryMeta[]) => items.map((item) => item.slug);

describe("creative selection", () => {
  it("takes every text, effects and backgrounds item plus exactly the chart showpieces", () => {
    const visual = registryMeta.filter((meta) => ["text", "effects", "backgrounds"].includes(meta.category));
    expect(visual.length).toBeGreaterThan(0);
    for (const meta of visual) expect(picks).toContain(meta);
    expect(picks.filter((meta) => meta.category === "charts").map((meta) => meta.slug).sort()).toEqual([...CREATIVE_SHOWPIECES].sort());
    expect(picks.some((meta) => meta.category === "components" || meta.category === "hooks")).toBe(false);
    for (const meta of registryMeta.filter((m) => m.category === "charts" && !CREATIVE_SHOWPIECES.has(m.slug))) {
      expect(picks).not.toContain(meta);
    }
    expect(picks).toHaveLength(visual.length + CREATIVE_SHOWPIECES.size);
  });

  it("picks up a new creative item automatically and ignores a new hook", () => {
    const withNew = [...registryMeta, fake("new-effect", "effects"), fake("use-new", "hooks")];
    const selected = slugs(creativeItems(withNew));
    expect(selected).toContain("new-effect");
    expect(selected).not.toContain("use-new");
  });

  it("only lists showpieces and featured picks that exist and are creative", () => {
    for (const slug of [...CREATIVE_SHOWPIECES, ...FEATURED_PICKS]) {
      const meta = registryMeta.find((m) => m.slug === slug);
      expect(meta, slug).toBeDefined();
      expect(isCreative(meta as RegistryMeta), slug).toBe(true);
    }
    expect(FEATURED_PICKS.every(isFeatured)).toBe(true);
    expect(isFeatured("button")).toBe(false);
  });
});

describe("hooks", () => {
  it("has a short hook for creative slugs only and falls back to the description", () => {
    for (const [slug, hook] of Object.entries(PICK_HOOKS)) {
      const meta = registryMeta.find((m) => m.slug === slug);
      expect(meta && isCreative(meta), slug).toBe(true);
      expect(hook.length, slug).toBeLessThanOrEqual(64);
      expect(hook.trim(), slug).not.toBe("");
    }
    for (const meta of picks) expect(PICK_HOOKS[meta.slug], meta.slug).toBeDefined();
    expect(hookFor(fake("not-hooked", "effects"))).toBe("not-hooked description");
    expect(hookFor({ slug: "dot-globe", description: "x" })).toBe(PICK_HOOKS["dot-globe"]);
  });
});

describe("orderPicks", () => {
  const ordered = orderPicks(picks);

  it("keeps every pick once and puts the featured picks first", () => {
    expect(slugs(ordered).sort()).toEqual(slugs(picks).sort());
    expect(slugs(ordered.slice(0, FEATURED_PICKS.length))).toEqual([...FEATURED_PICKS]);
  });

  it("never puts two items of one category side by side while several categories remain", () => {
    const rest = ordered.slice(FEATURED_PICKS.length);
    rest.forEach((item, index) => {
      const next = rest[index + 1];
      if (!next) return;
      const remaining = new Set(rest.slice(index).map((m) => m.category));
      if (remaining.size > 1) expect(next.category, `${item.slug} -> ${next.slug}`).not.toBe(item.category);
    });
  });

  it("keeps registry order inside a category", () => {
    for (const category of CATEGORIES) {
      const inRegistry = slugs(picks.filter((m) => m.category === category && !isFeatured(m.slug)));
      const inOrder = slugs(ordered.filter((m) => m.category === category && !isFeatured(m.slug)));
      expect(inOrder).toEqual(inRegistry);
    }
  });
});

describe("filterPicks", () => {
  const ordered = orderPicks(picks);

  it("returns everything for all", () => {
    expect(filterPicks(ordered, "all")).toEqual(ordered);
  });

  it.each(["text", "effects", "backgrounds", "charts"] as const)("keeps only %s, in order", (category) => {
    const filtered = filterPicks(ordered, category);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((m) => m.category === category)).toBe(true);
    expect(filtered).toEqual(ordered.filter((m) => m.category === category));
  });
});

describe("pickRandom", () => {
  it("maps the random value onto the list", () => {
    const list = orderPicks(picks);
    expect(pickRandom(list, () => 0)).toBe(list[0]);
    expect(pickRandom(list, () => 0.9999)).toBe(list[list.length - 1]);
    expect(pickRandom([], () => 0.5)).toBeUndefined();
  });

  it("only returns creative items of the filtered category", () => {
    const text = filterPicks(orderPicks(picks), "text");
    for (const value of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const pick = pickRandom(text, () => value);
      expect(pick?.category).toBe("text");
      expect(pick && isCreative(pick)).toBe(true);
    }
  });
});

describe("filters", () => {
  it("lists all plus the categories with picks and clamps the rest", () => {
    expect(PICK_FILTERS).toEqual(["all", "text", "effects", "backgrounds", "charts"]);
    expect(clampPickFilter("components")).toBe("all");
    expect(clampPickFilter("hooks")).toBe("all");
    expect(clampPickFilter("charts")).toBe("charts");
  });
});
