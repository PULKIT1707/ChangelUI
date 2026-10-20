import { afterEach, describe, expect, it } from "vitest";
import { addRecent, parseRecent, readRecent, RECENT_KEY } from "./recent";

const valid = new Set(["button", "dialog", "tabs", "marquee", "cn", "slider", "switch"]);

describe("recent items", () => {
  afterEach(() => window.localStorage.clear());

  it("accepts at most five existing slugs", () => {
    expect(parseRecent(null, valid)).toEqual([]);
    expect(parseRecent('["button","dialog"]', valid)).toEqual(["button", "dialog"]);
    expect(parseRecent('["button","nope"]', valid)).toBeNull();
    expect(parseRecent('["button","dialog","tabs","marquee","cn","slider"]', valid)).toBeNull();
    expect(parseRecent('{"a":1}', valid)).toBeNull();
    expect(parseRecent("[1]", valid)).toBeNull();
    expect(parseRecent("not json", valid)).toBeNull();
  });

  it("ignores an invalid stored value and overwrites it on the next write", () => {
    window.localStorage.setItem(RECENT_KEY, "garbage");
    expect(readRecent(valid)).toEqual([]);
    expect(addRecent("tabs", valid)).toEqual(["tabs"]);
    expect(window.localStorage.getItem(RECENT_KEY)).toBe('["tabs"]');
  });

  it("moves the slug to the front, dedupes and keeps five", () => {
    for (const slug of ["button", "dialog", "tabs", "marquee", "cn", "slider"]) addRecent(slug, valid);
    expect(readRecent(valid)).toEqual(["slider", "cn", "marquee", "tabs", "dialog"]);
    expect(addRecent("tabs", valid)).toEqual(["tabs", "slider", "cn", "marquee", "dialog"]);
    expect(addRecent("unknown", valid)).toEqual(["tabs", "slider", "cn", "marquee", "dialog"]);
  });
});
