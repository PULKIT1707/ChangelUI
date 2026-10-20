import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/cn";
import { controlReset } from "../src/lib/styles";
import { toneClasses, variantClasses } from "../src/lib/tone";

describe("cn", () => {
  it("joins clsx inputs", () => {
    expect(cn("a", false, null, undefined, ["b", { c: true, d: false }])).toBe("a b c");
  });

  it("resolves pui-* radius, shadow, ease and animate keys", () => {
    expect(cn("rounded-pui-md", "rounded-pui-lg")).toBe("rounded-pui-lg");
    expect(cn("rounded-md", "rounded-pui-full")).toBe("rounded-pui-full");
    expect(cn("shadow-pui-sm", "shadow-lg")).toBe("shadow-lg");
    expect(cn("shadow-sm", "shadow-pui-glow")).toBe("shadow-pui-glow");
    expect(cn("ease-pui-out", "ease-pui-spring")).toBe("ease-pui-spring");
    expect(cn("animate-pui-marquee-x", "animate-pui-marquee-y")).toBe("animate-pui-marquee-y");
    expect(cn("animate-spin", "animate-pui-blink")).toBe("animate-pui-blink");
  });

  it("resolves pui color utilities", () => {
    expect(cn("bg-pui-muted", "bg-pui-primary")).toBe("bg-pui-primary");
    expect(cn("text-pui-foreground", "text-pui-danger-text")).toBe("text-pui-danger-text");
  });

  it("lets later classes beat the control reset", () => {
    const merged = cn(controlReset, "border px-3 bg-(--pui-tone)");
    expect(merged).toContain("border");
    expect(merged).not.toContain("border-0");
    expect(merged).not.toContain("bg-transparent");
    // p-0 stays for the y axis; px-3 refines the x axis after it.
    expect(merged.split(" ")).toEqual(expect.arrayContaining(["p-0", "px-3"]));
    expect(merged.indexOf("px-3")).toBeGreaterThan(merged.indexOf("p-0"));
  });

  it("lets a consumer arbitrary tone property override the tone class", () => {
    const merged = cn(variantClasses.solid, toneClasses.primary, "[--pui-tone:var(--my-brand)]");
    expect(merged).toContain("[--pui-tone:var(--my-brand)]");
    expect(merged).not.toContain("[--pui-tone:var(--pui-primary)]");
    expect(merged).toContain("[--pui-tone-fg:var(--pui-primary-foreground)]");
  });
});
