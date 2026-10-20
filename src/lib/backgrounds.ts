import type { PatternMask } from "./types";

// Shared background rules (design 7.4): every background root is decorative and fills its parent.

/** Root classes after blockReset. The parent is `relative isolate overflow-hidden`. */
export const backgroundBase = "pointer-events-none absolute inset-0";

/** PatternMask -> literal mask-image classes (never built dynamically). */
export const patternMasks: Record<PatternMask, string> = {
  none: "",
  radial: "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
  "fade-x": "[mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]",
  "fade-y": "[mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]",
  "fade-bottom": "[mask-image:linear-gradient(to_bottom,black_40%,transparent)]",
};
