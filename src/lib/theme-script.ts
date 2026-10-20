export type ThemeValue = "light" | "dark" | "system";

export interface ThemeInitScriptOptions {
  /** localStorage key holding "light" | "dark" | "system". Default "pui-theme". */
  storageKey?: string;
  /** What to set on <html>: the .light/.dark class, data-theme, or both. Default "both". */
  attribute?: "class" | "data-theme" | "both";
  /** Used when nothing valid is stored. Default "system". */
  defaultTheme?: ThemeValue;
  /**
   * localStorage key holding a theme preset name (ThemeSwitcher's storageKey, e.g. "pui-theme-preset").
   * When set, the stored preset is applied as data-pui-theme on <html> before paint. Default: off.
   */
  presetStorageKey?: string;
  /** Preset used when nothing valid is stored under presetStorageKey. "default" sets no attribute. */
  defaultPreset?: string;
}

/** JSON-encode for inlining into a <script>: "<" is escaped so a value can never close the tag. */
function inline(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Returns a self-contained IIFE string to inline in <head> before paint, so the stored theme is applied
 * without a flash. Server-safe (no client directive): import it from "changelui/theme-script".
 */
export function getThemeInitScript({
  storageKey = "pui-theme",
  attribute = "both",
  defaultTheme = "system",
  presetStorageKey,
  defaultPreset = "default",
}: ThemeInitScriptOptions = {}): string {
  // Preset names are validated in the browser too, so a tampered storage value never reaches the DOM.
  const preset =
    presetStorageKey === undefined
      ? ""
      : `var pk=${inline(presetStorageKey)},pd=${inline(defaultPreset)},p=null;` +
        "try{p=window.localStorage.getItem(pk)}catch(e){}" +
        "if(!p||!/^[a-z0-9-]{1,32}$/.test(p))p=pd;" +
        'if(p&&p!=="default"&&/^[a-z0-9-]{1,32}$/.test(p))r.setAttribute("data-pui-theme",p);';
  return (
    "(function(){try{" +
    `var k=${inline(storageKey)},a=${inline(attribute)},d=${inline(defaultTheme)},t=null;` +
    "try{t=window.localStorage.getItem(k)}catch(e){}" +
    'if(t!=="light"&&t!=="dark"&&t!=="system")t=d;' +
    'if(t!=="light"&&t!=="dark")t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";' +
    "var r=document.documentElement;" +
    'if(a!=="data-theme"){r.classList.remove("light","dark");r.classList.add(t)}' +
    'if(a!=="class")r.setAttribute("data-theme",t)' +
    (preset ? `;${preset}` : "") +
    "}catch(e){}})();"
  );
}
