import { describe, expect, it } from "vitest";
import type { ControlSpec } from "../registry/types";
import { toJsx, wrapJsx } from "./to-jsx";

type P = { variant: string; disabled: boolean; loading: boolean; count: number; items: string[]; label: string };
const defaults: P = { variant: "solid", disabled: false, loading: true, count: 1, items: ["a"], label: "x" };

describe("toJsx", () => {
  it("emits only non-default props and self-closes without children", () => {
    expect(toJsx("Button", defaults, defaults)).toBe("<Button />");
  });

  it("formats every prop form", () => {
    const props: P = { variant: "soft", disabled: true, loading: false, count: 3, items: ["a", "b"], label: 'say "hi"' };
    expect(toJsx("Button", props, defaults)).toBe(
      '<Button variant="soft" disabled loading={false} count={3} items={["a","b"]} label={"say \\"hi\\""} />',
    );
  });

  it("orders props by ControlSpec order, then insertion order", () => {
    const controls: ControlSpec<P>[] = [
      { type: "number", prop: "count", label: "Count", min: 0, max: 9, step: 1 },
      { type: "boolean", prop: "disabled", label: "Disabled" },
    ];
    const props: P = { ...defaults, variant: "ghost", disabled: true, count: 2 };
    expect(toJsx("Button", props, defaults, undefined, controls)).toBe('<Button count={2} disabled variant="ghost" />');
  });

  it("skips undefined values", () => {
    const props = { ...defaults, label: undefined } as unknown as P;
    expect(toJsx("Button", props, defaults)).toBe("<Button />");
  });

  it("indents children by two spaces", () => {
    expect(toJsx("Card", defaults, defaults, "<CardTitle>Hi</CardTitle>\n\n<p>Body</p>")).toBe(
      "<Card>\n  <CardTitle>Hi</CardTitle>\n\n  <p>Body</p>\n</Card>",
    );
    expect(toJsx("Button", { ...defaults, disabled: true }, defaults, "Save")).toBe("<Button disabled>\n  Save\n</Button>");
  });
});

describe("wrapJsx", () => {
  it("leaves short lines alone and puts one prop per line on long tags", () => {
    expect(wrapJsx('<Button size="sm" />')).toBe('<Button size="sm" />');
    const long = '<HistogramRange label="Price per night" data={prices} value={range} formatValue={(v) => `$${v}`} />';
    expect(wrapJsx(long)).toBe(
      ['<HistogramRange', '  label="Price per night"', "  data={prices}", "  value={range}", "  formatValue={(v) => `$${v}`}", "/>"].join("\n"),
    );
  });
  it("keeps indentation and nested braces, and wraps opening tags with children", () => {
    const code = '<Card>\n  <Chart data={[{ a: 1, b: "x y" }]} title="A long enough title here" description="and a description" open>\n  </Chart>\n</Card>';
    expect(wrapJsx(code).split("\n").slice(1, 7)).toEqual([
      "  <Chart",
      '    data={[{ a: 1, b: "x y" }]}',
      '    title="A long enough title here"',
      '    description="and a description"',
      "    open",
      "  >",
    ]);
  });
});
