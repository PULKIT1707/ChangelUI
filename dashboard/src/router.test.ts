import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { docHref, homeHref, itemHref, parseHash, routeKey, routeTitle, useRoute } from "./router";

describe("parseHash", () => {
  it("parses home with and without a slash", () => {
    expect(parseHash("")).toEqual({ kind: "home", tab: "preview", filter: "all" });
    expect(parseHash("#")).toMatchObject({ kind: "home" });
    expect(parseHash("#/")).toMatchObject({ kind: "home" });
  });

  it("parses the home filter and falls back to all", () => {
    expect(parseHash("#/?filter=text")).toMatchObject({ kind: "home", filter: "text" });
    expect(parseHash("#/?filter=hooks")).toMatchObject({ filter: "hooks" });
    expect(parseHash("#/?filter=nope")).toMatchObject({ kind: "home", filter: "all" });
    expect(parseHash("#/?filter=")).toMatchObject({ filter: "all" });
  });

  it("parses docs pages", () => {
    expect(parseHash("#/docs/installation")).toMatchObject({ kind: "docs", category: "docs", slug: "installation" });
    expect(parseHash("#/docs/theming")).toMatchObject({ kind: "docs", slug: "theming" });
    expect(parseHash("#/docs/unknown")).toMatchObject({ kind: "notFound" });
  });

  it("parses item pages and validates category and slug against the registry", () => {
    expect(parseHash("#/components/button")).toEqual({
      kind: "item",
      category: "components",
      slug: "button",
      tab: "preview",
      filter: "all",
    });
    expect(parseHash("#/hooks/use-media-query")).toMatchObject({ kind: "item", slug: "use-media-query" });
    expect(parseHash("#/widgets/button")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/text/button")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/components/does-not-exist")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/hooks/theme-script")).toMatchObject({ kind: "notFound" });
  });

  it("reads ?tab and falls back to preview", () => {
    expect(parseHash("#/components/button?tab=code")).toMatchObject({ kind: "item", tab: "code" });
    expect(parseHash("#/components/button?tab=preview")).toMatchObject({ tab: "preview" });
    expect(parseHash("#/components/button?tab=bogus")).toMatchObject({ kind: "item", tab: "preview" });
  });

  it("handles percent-encoding, including malformed sequences", () => {
    expect(parseHash("#/components/%62utton")).toMatchObject({ kind: "item", slug: "button" });
    expect(parseHash("#/components/%E0%A4%A")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/%")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/components/button?tab=%E0%A4%A")).toMatchObject({ kind: "item", tab: "preview" });
  });

  it("rejects other shapes", () => {
    expect(parseHash("#content")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/components")).toMatchObject({ kind: "notFound" });
    expect(parseHash("#/components/button/extra")).toMatchObject({ kind: "notFound" });
  });
});

describe("href builders and titles", () => {
  it("round-trips through parseHash", () => {
    expect(homeHref()).toBe("#/");
    expect(homeHref("effects")).toBe("#/?filter=effects");
    expect(docHref("theming")).toBe("#/docs/theming");
    expect(itemHref("components", "button")).toBe("#/components/button");
    expect(itemHref("components", "button", "code")).toBe("#/components/button?tab=code");
    expect(parseHash(itemHref("text", "word-rotate", "code"))).toMatchObject({ kind: "item", slug: "word-rotate", tab: "code" });
    expect(parseHash(homeHref("backgrounds"))).toMatchObject({ kind: "home", filter: "backgrounds" });
  });

  it("derives page keys and titles", () => {
    expect(routeKey(parseHash("#/components/button?tab=code"))).toBe("components/button");
    expect(routeKey(parseHash("#/?filter=text"))).toBe("home");
    expect(routeTitle(parseHash("#/components/copy-button"))).toBe("CopyButton");
    expect(routeTitle(parseHash("#/docs/installation"))).toBe("Installation");
    expect(routeTitle(parseHash("#/nope"))).toBe("Page not found");
    expect(routeTitle(parseHash("#/"))).toBe("Home");
  });
});

describe("useRoute", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("follows hashchange", () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.kind).toBe("home");
    act(() => {
      window.location.hash = "#/components/button";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toMatchObject({ kind: "item", slug: "button" });
  });
});
