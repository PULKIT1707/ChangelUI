import { describe, expect, it } from "vitest";
import type { ControlSpec } from "../registry/types";
import { toJsx } from "./to-jsx";

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
