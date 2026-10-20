import { describe, expect, it } from "vitest";
import { isMac, paletteShortcut } from "./platform";

describe("platform", () => {
  it("detects Apple platforms from platform, then userAgent", () => {
    expect(isMac({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(isMac({ platform: "", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe(true);
    expect(isMac({ platform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0)" })).toBe(false);
    expect(isMac({ platform: "Linux x86_64", userAgent: "" })).toBe(false);
  });

  it("is false without a navigator and reads the real one by default", () => {
    expect(isMac(undefined)).toBe(false);
    expect(typeof isMac()).toBe("boolean");
  });

  it("formats the shortcut", () => {
    expect(paletteShortcut(true)).toBe("⌘K");
    expect(paletteShortcut(false)).toBe("Ctrl K");
  });
});
