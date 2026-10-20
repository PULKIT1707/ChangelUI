import type { TargetAndTransition, Variants } from "motion/react";

export type RevealPreset = "fade" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "blur" | "scale";

/** Hidden/visible targets for every preset at the given travel distance (px). */
export function revealPresets(
  distance: number,
): Record<RevealPreset, { hidden: TargetAndTransition; visible: TargetAndTransition }> {
  return {
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
    "fade-up": { hidden: { opacity: 0, y: distance }, visible: { opacity: 1, y: 0 } },
    "fade-down": { hidden: { opacity: 0, y: -distance }, visible: { opacity: 1, y: 0 } },
    "fade-left": { hidden: { opacity: 0, x: distance }, visible: { opacity: 1, x: 0 } },
    "fade-right": { hidden: { opacity: 0, x: -distance }, visible: { opacity: 1, x: 0 } },
    blur: { hidden: { opacity: 0, filter: "blur(8px)" }, visible: { opacity: 1, filter: "blur(0px)" } },
    scale: { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } },
  };
}

/** Reduced motion: the final state with at most a 150ms opacity fade (C15). */
export const reducedRevealVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};
