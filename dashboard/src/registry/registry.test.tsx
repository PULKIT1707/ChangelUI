import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getItem, registry } from "./index";
import { registryMeta } from "./meta";

// test/setup.ts fails any test that logs console.error, so "renders" also means "renders cleanly".
describe("dashboard registry", () => {
  it("has one loader per meta row", () => {
    expect(registry).toHaveLength(registryMeta.length);
    for (const meta of registryMeta) expect(getItem(meta.category, meta.slug)?.slug).toBe(meta.slug);
    expect(getItem("components", "does-not-exist")).toBeUndefined();
  });

  describe.each(registry.map((entry) => [entry.slug, entry] as const))("%s", (_slug, entry) => {
    it("exports a complete ItemModule", async () => {
      const { default: item } = await entry.load();
      expect(typeof item.Preview).toBe("function");
      expect(typeof item.Mini).toBe("function");
      expect(item.defaults).toBeTypeOf("object");
      expect(Array.isArray(item.controls)).toBe(true);
      expect(item.propsTable.length).toBeGreaterThan(0);
      const snippet = item.snippet(item.defaults);
      expect(typeof snippet).toBe("string");
      expect(snippet.length).toBeGreaterThan(0);
      for (const control of item.controls) expect(Object.keys(item.defaults)).toContain(control.prop);
    });

    it("renders Preview and Mini without errors", async () => {
      const { default: item } = await entry.load();
      const { Preview, Mini } = item;
      const preview = render(<Preview props={item.defaults} />);
      expect(preview.container.firstChild).not.toBeNull();
      preview.unmount();
      const mini = render(<Mini />);
      expect(mini.container.firstChild).not.toBeNull();
    });
  });
});
