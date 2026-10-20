// Public motion vocabulary (roadmap C.3): springs, easings, durations, variants and stagger helpers.
// Pure data and functions with type-only Motion imports, so it is server-safe (no "use client") and
// usable from React Server Components. src/lib/motion.ts re-exports the token mirrors from here and
// test/tokens.test.ts keeps durations and easings in parity with the CSS variables in theme.css.
import type { Transition, Variant, Variants } from "motion/react";

/** Spring transitions. Spread them into `transition`, e.g. `transition={springs.snappy}`. */
export const springs = {
  /** Quick and crisp: tabs, toggles, small indicators. */
  snappy: { type: "spring", stiffness: 500, damping: 35, mass: 0.6 },
  /** General purpose UI movement without overshoot. */
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  /** Visible overshoot for playful confirmations. */
  bouncy: { type: "spring", stiffness: 400, damping: 18 },
  /** Quick, light spring for press feedback. */
  press: { type: "spring", stiffness: 700, damping: 30, mass: 0.5 },
  /** Layout and dialog entrances: settles fast without visible overshoot. */
  layout: { type: "spring", stiffness: 380, damping: 34 },
  /** Slow and soft, for ambient motion and large surfaces. */
  gentle: { type: "spring", stiffness: 120, damping: 20 },
  /** Loose and springy, for stickers, reactions and other playful details. */
  wobbly: { type: "spring", stiffness: 180, damping: 12 },
  /** Large panels (drawers, sheets) that should feel weighty. */
  heavy: { type: "spring", stiffness: 200, damping: 40, mass: 1.4 },
} as const;

/** Seconds (Motion's unit); theme.css holds the same values in ms as --pui-duration-*. */
export const durations = {
  instant: 0.08,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  page: 0.45,
} as const;

/** Cubic-bezier control points, matching --pui-ease-*. */
export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
  outExpo: [0.16, 1, 0.3, 1],
  inQuint: [0.64, 0, 0.78, 0],
  emphasized: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type SpringName = keyof typeof springs;
export type EasingName = keyof typeof easings;
export type DurationName = keyof typeof durations;
export type SlideDirection = "up" | "down" | "left" | "right";

/** Exit transition: shorter than the entrance and accelerating out (guideline: exits ~40% faster). */
const exitTween: Transition = { duration: durations.fast, ease: easings.inQuint };

/**
 * Returns a copy of `transition` that runs `factor` times as long. Tweens scale `duration`;
 * springs scale `duration` when set, otherwise they get stiffer (k / factor²) so they settle sooner.
 */
export function exitFaster(transition: Transition, factor = 0.6): Transition {
  const t = transition as Record<string, unknown>;
  if (typeof t.duration === "number") return { ...transition, duration: t.duration * factor } as Transition;
  if (t.type === "spring" && typeof t.stiffness === "number") {
    return { ...transition, stiffness: t.stiffness / (factor * factor) } as Transition;
  }
  return { ...transition, duration: durations.base * factor } as Transition;
}

function slideOffset(direction: SlideDirection, distance: number): { x?: number; y?: number } {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
  }
}

/**
 * Slides in from the opposite side of `direction` ("up" travels upward into place) and fades.
 * `distance` is in px. The exit leaves the way it came, shorter and faster.
 */
function slideIn(direction: SlideDirection = "up", distance = 16): Variants {
  const from = slideOffset(direction, distance);
  const half = slideOffset(direction, distance / 2);
  return {
    hidden: { opacity: 0, ...from },
    visible: { opacity: 1, x: 0, y: 0, transition: springs.smooth },
    exit: { opacity: 0, ...half, transition: exitTween },
  };
}

/**
 * Ready-made hidden / visible / exit variants. Use them with
 * `initial="hidden" animate="visible" exit="exit"`.
 */
export const variants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: durations.slow, ease: easings.out } },
    exit: { opacity: 0, transition: exitTween },
  },
  fadeUp: slideIn("up", 12),
  fadeDown: slideIn("down", 12),
  scaleIn: {
    hidden: { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1, transition: springs.layout },
    exit: { opacity: 0, scale: 0.97, transition: exitTween },
  },
  blurIn: {
    hidden: { opacity: 0, y: 8, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: easings.out } },
    exit: { opacity: 0, filter: "blur(6px)", transition: exitTween },
  },
  popIn: {
    hidden: { opacity: 0, scale: 0.6 },
    visible: { opacity: 1, scale: 1, transition: springs.bouncy },
    exit: { opacity: 0, scale: 0.8, transition: exitTween },
  },
  /** Text lines rising from a clip. Wrap each unit in an `overflow: hidden` element. */
  maskUp: {
    hidden: { y: "110%" },
    visible: { y: "0%", transition: { duration: 0.7, ease: easings.outExpo } },
    exit: { y: "-110%", transition: { duration: 0.3, ease: easings.inQuint } },
  },
  slideIn,
} as const;

export type VariantPresetName = Exclude<keyof typeof variants, "slideIn">;

export interface StaggerOptions {
  /** Seconds between children. Default 0.05. */
  each?: number;
  /** Seconds before the first child. Default 0. */
  delay?: number;
  /** Which end starts. Default "first". For "center" use staggerDelay with a custom index. */
  from?: "first" | "last";
}

/** Parent transition that staggers its variant children, e.g. `visible: { transition: stagger() }`. */
export function stagger({ each = 0.05, delay = 0, from = "first" }: StaggerOptions = {}): Transition {
  return { staggerChildren: each, delayChildren: delay, staggerDirection: from === "last" ? -1 : 1 };
}

export interface StaggerDelayOptions {
  each?: number;
  delay?: number;
  /** Start point: an end, the middle, both ends, or an index. Default "first". */
  from?: "first" | "last" | "center" | "edges" | number;
}

/**
 * Delay in seconds for child `index` of `total`, for orders `stagger()` can't express
 * (center-out, edges-in, from a clicked index). Pass it as `transition.delay` or via `custom`.
 */
export function staggerDelay(
  index: number,
  total: number,
  { each = 0.05, delay = 0, from = "first" }: StaggerDelayOptions = {},
): number {
  const last = Math.max(total - 1, 0);
  let steps: number;
  if (from === "first") steps = index;
  else if (from === "last") steps = last - index;
  else if (from === "center") steps = Math.abs(index - last / 2);
  else if (from === "edges") steps = last / 2 - Math.abs(index - last / 2);
  else steps = Math.abs(index - from);
  return delay + steps * each;
}

function reducedTarget(variant: Variant, fallbackOpacity: number): Variant {
  if (typeof variant === "function") return { opacity: fallbackOpacity, transition: { duration: 0.15 } };
  const opacity = typeof variant.opacity === "number" ? variant.opacity : fallbackOpacity;
  return { opacity, transition: { duration: 0.15 } };
}

/**
 * Reduced-motion version of a variant set: no movement, scale or blur, only an opacity fade of
 * at most 150ms to each state's own opacity (C15). Keys named hidden/exit default to 0, others to 1.
 */
export function reducedVariant(source: Variants): Variants {
  const out: Variants = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = reducedTarget(value, key === "hidden" || key === "exit" ? 0 : 1);
  }
  return out;
}

/** CSS `cubic-bezier()` string for an easing, for inline styles and WAAPI. */
export function cssEasing(name: EasingName): string {
  return `cubic-bezier(${easings[name].join(", ")})`;
}
