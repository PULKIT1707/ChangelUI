// Keyboard model for the focusable plot overlay (charts-roadmap 4.1). Pure: maps a key plus the
// current focus to an action, so every chart shares one tested key map.

export type ChartKeyMode = "axis" | "item";

export interface ChartKeyContext {
  /** Focused point index, or -1 before the first arrow press. */
  index: number;
  count: number;
  /** Focused series position among visible series. */
  seriesIndex: number;
  seriesCount: number;
  /** axis: all series at one x; item: one mark at a time (↑/↓ switch series). */
  mode: ChartKeyMode;
  hasSelection?: boolean;
  /** Inside a drilled-down hierarchy level. */
  drilled?: boolean;
  /** Zoom is enabled (chart-zoom). */
  zoomable?: boolean;
  zoomed?: boolean;
}

export interface KeyModifiers {
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export type ChartKeyAction =
  | { type: "focus"; index: number; seriesIndex: number }
  | { type: "select"; additive: boolean }
  | { type: "clear-selection" }
  | { type: "drill-up" }
  | { type: "zoom"; direction: "in" | "out" }
  | { type: "reset-zoom" }
  | { type: "pan"; direction: -1 | 1 }
  | { type: "toggle-table" };

/**
 * The action for a keydown, or null when the chart should let the key through (no preventDefault).
 * Escape clears selection first, then leaves a drill level, then resets zoom.
 */
export function chartKeyAction(key: string, mods: KeyModifiers, ctx: ChartKeyContext): ChartKeyAction | null {
  const { count, seriesCount } = ctx;
  const last = count - 1;
  const focus = (index: number, seriesIndex = Math.max(0, ctx.seriesIndex)): ChartKeyAction | null =>
    count > 0 ? { type: "focus", index: Math.max(0, Math.min(last, index)), seriesIndex } : null;
  const page = Math.max(1, Math.round(count * 0.1));
  const unfocused = ctx.index < 0;

  if (mods.ctrlKey || mods.metaKey) return null; // leave browser and OS shortcuts alone

  switch (key) {
    case "ArrowRight":
      if (mods.shiftKey && ctx.zoomable && ctx.zoomed) return { type: "pan", direction: 1 };
      return focus(unfocused ? 0 : ctx.index + 1);
    case "ArrowLeft":
      if (mods.shiftKey && ctx.zoomable && ctx.zoomed) return { type: "pan", direction: -1 };
      return focus(unfocused ? last : ctx.index - 1);
    case "ArrowDown":
    case "ArrowUp": {
      if (ctx.mode !== "item" || seriesCount < 1) return null;
      const delta = key === "ArrowDown" ? 1 : -1;
      const seriesIndex = ctx.seriesIndex < 0 ? 0 : Math.max(0, Math.min(seriesCount - 1, ctx.seriesIndex + delta));
      return focus(unfocused ? 0 : ctx.index, seriesIndex);
    }
    case "Home":
      return focus(0);
    case "End":
      return focus(last);
    case "PageDown":
      return focus(unfocused ? page - 1 : ctx.index + page);
    case "PageUp":
      return focus(unfocused ? 0 : ctx.index - page);
    case "Enter":
    case " ":
      return unfocused || count === 0 ? null : { type: "select", additive: !!mods.shiftKey };
    case "Escape":
      if (ctx.hasSelection) return { type: "clear-selection" };
      if (ctx.drilled) return { type: "drill-up" };
      if (ctx.zoomable && ctx.zoomed) return { type: "reset-zoom" };
      return null;
    case "+":
    case "=":
      return ctx.zoomable ? { type: "zoom", direction: "in" } : null;
    case "-":
    case "_":
      return ctx.zoomable ? { type: "zoom", direction: "out" } : null;
    case "0":
      return ctx.zoomable && ctx.zoomed ? { type: "reset-zoom" } : null;
    case "t":
    case "T":
      return mods.altKey ? null : { type: "toggle-table" };
    default:
      return null;
  }
}

/** Screen-reader help text for the plot overlay's aria-describedby. */
export function keyboardHelp(mode: ChartKeyMode, zoomable = false): string {
  const parts = ["Left and right arrows move between points", "Home and End jump to the ends"];
  if (mode === "item") parts.push("up and down arrows switch series");
  parts.push("Enter selects", "Escape clears", "T shows the data table");
  if (zoomable) parts.push("plus and minus zoom, 0 resets");
  return `${parts.join(", ")}.`;
}
