import { describe, expect, it } from "vitest";
import { parseHash } from "../../router";
import { pageviewProps } from "./route-props";

describe("pageviewProps", () => {
  it.each([
    ["#/?filter=text", { route_kind: "home", route_key: "home", category: null, component: null }],
    ["#/docs/installation", { route_kind: "docs", route_key: "docs/installation", category: "docs", component: null }],
    ["#/components?tag=forms", { route_kind: "category", route_key: "category/components", category: "components", component: null }],
    ["#/charts", { route_kind: "category", route_key: "category/charts", category: "charts", component: null }],
    ["#/components/button?tab=code", { route_kind: "item", route_key: "components/button", category: "components", component: "button" }],
    ["#/templates", { route_kind: "templates", route_key: "templates", category: "templates", component: null }],
    ["#/picks?filter=text", { route_kind: "picks", route_key: "picks", category: "picks", component: null }],
    ["#/does/not/exist?x=1", { route_kind: "notFound", route_key: "notFound", category: null, component: null }],
  ])("maps %s", (hash, expected) => {
    expect(pageviewProps(parseHash(hash))).toEqual(expected);
  });

  it("maps a template page to its slug", () => {
    expect(pageviewProps({ kind: "template", slug: "hero-split", tab: "preview", filter: "all" })).toEqual({
      route_kind: "template",
      route_key: "templates/hero-split",
      category: "templates",
      component: "hero-split",
    });
  });
});
