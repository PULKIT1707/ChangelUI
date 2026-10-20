// @vitest-environment node
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert } from "../src/components/alert";
import { Checkbox } from "../src/components/checkbox";
import { Chip } from "../src/components/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../src/components/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "../src/components/radio-group";
import { RangeSlider, Slider } from "../src/components/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/components/tabs";
import { getThemeInitScript } from "../src/lib/theme-script";
import { ScrambleText } from "../src/text/scramble-text";
import { fixtures, hookProbes, singleTabStopFixtures } from "./fixtures";

/** First serialized opening tag matching `pattern`. */
function tagOf(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[0];
}

/** Inline style declarations of one serialized tag, whitespace-insensitive. */
function styleOf(tag: string | undefined): Record<string, string> {
  const style = tag?.match(/\sstyle="([^"]*)"/)?.[1] ?? "";
  const declarations = style.split(";").filter((d) => d.includes(":"));
  return Object.fromEntries(
    declarations.map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]),
  );
}

/** Numbers of a CSS list value: "1 1", "1px, 1px" and "1px 1px" all give [1, 1]. */
function numbersOf(value: string | undefined): number[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => Number.parseFloat(part));
}

/** A transform that leaves the element at full size and in place: none, or only identity functions. */
function isIdentityTransform(value: string | undefined): boolean {
  if (value === "none") return true;
  const functions = [...(value ?? "").matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)];
  return (
    functions.length > 0 &&
    functions.every(([, name = "", args]) => numbersOf(args).every((n) => n === (name.startsWith("scale") ? 1 : 0)))
  );
}

describe("ssr (NFR-5)", () => {
  it("runs without a DOM", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(getThemeInitScript()).toContain("localStorage");
  });

  for (const fixture of fixtures) {
    it(`${fixture.name} renders to string`, () => {
      expect(() => renderToString(fixture.element(createRef<Element>()))).not.toThrow();
    });
  }

  // Roving widgets (design 6): exactly one tab stop in server HTML, with no value (on the container)
  // and with a defaultValue matching an enabled item (on that item).
  for (const name of singleTabStopFixtures) {
    it(`${name} server HTML has exactly one tabindex="0"`, () => {
      const fixture = fixtures.find((f) => f.name === name);
      expect(fixture, name).toBeDefined();
      const full = renderToString(fixture?.element(createRef<Element>()) ?? <span />);
      // Tab panels are focusable by design (tabindex 0) and are not part of the roving widget.
      const html = full.replace(/<div[^>]*role="tabpanel"[^>]*>/g, "<div>");
      expect(html.match(/tabindex="0"/g)).toHaveLength(1);
      if (name.endsWith("with defaultValue")) {
        expect(html).toMatch(
          /role="(radio|tab)"[^>]*aria-(checked|selected)="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-(checked|selected)="true"/,
        );
      } else {
        expect(html).toMatch(/role="(radiogroup|tablist|toolbar)"[^>]*tabindex="0"/);
      }
    });
  }

  it("ScrambleText server output equals text (no randomness before hydration)", () => {
    for (const trigger of ["inView", "mount", "hover"] as const) {
      const html = renderToString(<ScrambleText text="Hello, world 42" trigger={trigger} />);
      const visible = html.match(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/);
      expect(visible?.[1]).toBe("Hello, world 42");
      expect(html).toContain('class="box-border m-0 sr-only">Hello, world 42</span>');
    }
  });

  it("Alert and Chip server HTML is visible (no enter-state opacity:0)", () => {
    for (const element of [<Alert key="a" title="Saved" />, <Chip key="c">Tag</Chip>, <Chip key="s" defaultSelected={false}>Tag</Chip>]) {
      const html = renderToString(element);
      expect(html).not.toMatch(/opacity:\s*0[;"]/);
    }
  });

  // Persistent state renders in its final form on the server; only later changes animate.
  it("Tabs server HTML shows the active panel (no opacity:0)", () => {
    const html = renderToString(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );
    const panel = tagOf(html, /<div[^>]*role="tabpanel"[^>]*>/);
    expect(panel).toContain('data-state="active"');
    const style = styleOf(panel);
    expect(Number.parseFloat(style.opacity ?? "")).toBe(1);
    expect(isIdentityTransform(style.transform), style.transform).toBe(true);
  });

  it("checked Checkbox server HTML shows the check mark", () => {
    const html = renderToString(<Checkbox aria-label="Accept" defaultChecked />);
    const path = tagOf(html, /<svg[^>]*data-pui-check[^>]*>\s*<path[^>]*>/);
    expect(path).toBeDefined();
    // Fully drawn: the dash covers the whole normalized path length (pathLength 1).
    expect(numbersOf(path?.match(/\sstroke-dasharray="([^"]*)"/)?.[1])).toEqual([1, 1]);
  });

  it("indeterminate Checkbox server HTML shows the dash", () => {
    const html = renderToString(<Checkbox aria-label="All" checked="indeterminate" />);
    const dash = tagOf(html, /<span[^>]*data-pui-indeterminate[^>]*>/);
    expect(dash).toBeDefined();
    const transform = styleOf(dash).transform;
    expect(isIdentityTransform(transform), transform).toBe(true);
  });

  it("RadioGroup server HTML shows the selected dot", () => {
    const html = renderToString(
      <RadioGroup aria-label="Fruit" defaultValue="x">
        <RadioGroupItem value="x" aria-label="x" />
        <RadioGroupItem value="y" aria-label="y" />
      </RadioGroup>,
    );
    const dot = tagOf(html, /<span[^>]*data-pui-radio-dot[^>]*>/);
    expect(dot).toBeDefined();
    const transform = styleOf(dot).transform;
    expect(isIdentityTransform(transform), transform).toBe(true);
  });

  it("a closed DropdownMenu with a submenu and radio group renders only its trigger", () => {
    const html = renderToString(
      <DropdownMenu>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuRadioGroup defaultValue="a">
            <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(tagOf(html, /<button[^>]*aria-expanded="false"[^>]*>/)).toBeDefined();
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain("Copy link");
  });

  it('Slider showValue="always" server HTML shows the value bubble', () => {
    const html = renderToString(<Slider aria-label="Volume" defaultValue={40} showValue="always" />);
    const bubble = tagOf(html, /<span[^>]*data-pui-slider-value[^>]*>/);
    expect(bubble).toBeDefined();
    const style = styleOf(bubble);
    expect(Number.parseFloat(style.opacity ?? "")).toBe(1);
    expect(isIdentityTransform(style.transform), style.transform).toBe(true);
  });

  it("RangeSlider server HTML has both thumbs, the fill between them and labelled marks", () => {
    const html = renderToString(
      <RangeSlider aria-label="Price" defaultValue={[20, 60]} marks={[{ value: 50, label: "Mid" }]} showValue="always" />,
    );
    expect(html).toContain('role="group"');
    expect(html.match(/role="slider"/g)).toHaveLength(2);
    const fill = styleOf(tagOf(html, /<span[^>]*data-pui-slider-range[^>]*>/));
    expect(fill.left).toBe("20%");
    expect(fill.width).toBe("40%");
    expect(html).toContain("Mid");
    expect(html.match(/data-pui-slider-value/g)).toHaveLength(2);
  });

  it("isIdentityTransform accepts only full-size, in-place transforms", () => {
    for (const value of ["none", "scale(1)", "scaleX(1)", "scale(1, 1)", "translateY(0px)", "translateY(0px) scale(1)"]) {
      expect(isIdentityTransform(value), value).toBe(true);
    }
    for (const value of [undefined, "", "scale(0)", "scaleX(0)", "scale(0, 0)", "scale(1, 0)", "translateY(4px)"]) {
      expect(isIdentityTransform(value), String(value)).toBe(false);
    }
    expect(numbersOf("0px 1px")).toEqual([0, 1]);
    expect(numbersOf("1px, 1px")).toEqual([1, 1]);
  });

  for (const [name, probe] of Object.entries(hookProbes)) {
    it(`${name} runs during server render`, () => {
      function Probe() {
        probe();
        return null;
      }
      expect(() => renderToString(<Probe />)).not.toThrow();
    });
  }
});
