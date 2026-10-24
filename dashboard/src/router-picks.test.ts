import { describe, expect, it } from "vitest";
import { ANONYMOUS_EVENTS } from "./lib/analytics/events";
import { pageviewProps } from "./lib/analytics/route-props";
import { PICK_FILTERS } from "./lib/picks";
import { parseHash, picksHref, routeKey, routeTitle } from "./router";

describe("#/picks route", () => {
  it.each([
    ["#/picks", "all"],
    ["#/picks?filter=text", "text"],
    ["#/picks?filter=charts&tab=code", "charts"],
    ["#/picks?filter=components", "all"],
    ["#/picks?filter=hooks", "all"],
    ["#/picks?filter=nope", "all"],
  ])("parses %s with filter %s", (hash, filter) => {
    expect(parseHash(hash)).toMatchObject({ kind: "picks", filter });
  });

  it("rejects extra segments", () => {
    expect(parseHash("#/picks/extra").kind).toBe("notFound");
    expect(parseHash("#/picks/glitch-text").kind).toBe("notFound");
  });

  it("builds hrefs that round-trip", () => {
    expect(picksHref()).toBe("#/picks");
    expect(picksHref("effects")).toBe("#/picks?filter=effects");
    for (const filter of PICK_FILTERS) expect(parseHash(picksHref(filter))).toMatchObject({ kind: "picks", filter });
  });

  it("has a stable key, a title and pageview props", () => {
    const route = parseHash("#/picks?filter=text");
    expect(routeKey(route)).toBe("picks");
    expect(routeTitle(route)).toBe("Developer's Pick");
    expect(pageviewProps(route)).toEqual({ route_kind: "picks", route_key: "picks", category: "picks", component: null });
  });

  it("allows the Developer's Pick events in the anonymous tier", () => {
    expect(ANONYMOUS_EVENTS).toEqual(
      expect.arrayContaining(["devs_pick_card_clicked", "devs_pick_filter_changed", "devs_pick_surprise_clicked"]),
    );
  });
});
