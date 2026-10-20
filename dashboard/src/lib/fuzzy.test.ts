import { describe, expect, it } from "vitest";
import { registryMeta } from "../registry/meta";
import { fuzzySearch, MAX_RESULTS, scoreField } from "./fuzzy";

describe("scoreField", () => {
  it("ranks prefix > word prefix > substring > subsequence", () => {
    expect(scoreField("butt", "Button")).toBe(100);
    expect(scoreField("butt", "CopyButton")).toBe(75);
    expect(scoreField("butt", "copy-button")).toBe(75);
    expect(scoreField("utto", "Button")).toBe(50);
    expect(scoreField("btn", "Button")).toBe(25 - 3);
    expect(scoreField("xyz", "Button")).toBe(0);
    expect(scoreField("", "Button")).toBe(0);
  });

  it("drops subsequences with too many gaps", () => {
    expect(scoreField("az", `a${"b".repeat(30)}z`)).toBe(0);
  });
});

describe("fuzzySearch", () => {
  const items = registryMeta.map((meta) => ({
    title: meta.title,
    fields: [meta.slug, meta.category, ...meta.keywords],
  }));

  it("puts the exact prefix first", () => {
    const results = fuzzySearch(items, "butt");
    expect(results[0]?.item.title).toBe("Button");
    expect(results.map((r) => r.item.title)).toEqual(expect.arrayContaining(["CopyButton", "IconButton", "RippleButton"]));
  });

  it("breaks ties by title and caps the result count", () => {
    const results = fuzzySearch(items, "  COMP ");
    expect(results).toHaveLength(MAX_RESULTS);
    const titles = results.filter((r) => r.score === 100).map((r) => r.item.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it("returns nothing for an empty query", () => {
    expect(fuzzySearch(items, "   ")).toEqual([]);
  });
});
